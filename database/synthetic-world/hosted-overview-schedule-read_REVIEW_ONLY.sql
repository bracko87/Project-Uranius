-- REVIEW_ONLY_NOT_APPROVED: Uranius private Overview schedule, server-side only.
-- Requires separately reviewed 010 schema, 012 RLS and restricted role SELECT grants.
-- Do NOT execute on hosted Uranius until server-side owner binding is accepted.
-- The sole subject value must be supplied by the verified, short-lived server session.
BEGIN READ ONLY;
DO $overview_guard$
BEGIN
  IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR has_schema_privilege(current_user, 'uranius_private', 'USAGE')
     OR has_database_privilege(current_user,current_database(),'CREATE') THEN
    RAISE EXCEPTION 'Restricted TLS Overview reader required';
  END IF;
END
$overview_guard$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'verified_subject')::text, true);

-- No schedule may be emitted without a real mapped Uranius club.
DO $overview_identity$
BEGIN
  IF uranius_catalog.request_uid() IS NULL
    OR uranius_game.get_my_club_id() IS NULL THEN
    RAISE EXCEPTION 'Authenticated Uranius club mapping required';
  END IF;
END
$overview_identity$;

-- This SQL body is kept in sync with the source-reviewed standalone 011
-- query; it is copied here because psql batch runner has no trusted include.
WITH
  identity AS (
    SELECT uranius_game.get_my_club_id() AS club_id
  ),
  game_day AS (
    SELECT make_date(1999 + season_number, month_number, day_number) AS current_game_date
    FROM uranius_game.game_state
    WHERE is_paused IS TRUE
  ),
  prepared AS (
    SELECT DISTINCT ON (r.id)
       r.id, r.name, r.category, r.country_code, rp.updated_at
    FROM identity i
    JOIN uranius_game.race_preparations rp ON rp.club_id = i.club_id
    JOIN uranius_game.races r ON r.id = rp.race_id
    WHERE i.club_id IS NOT NULL
      AND lower(rp.status) NOT IN ('declined','rejected','cancelled','canceled','withdrawn')
      AND lower(rp.startlist_status) NOT IN ('declined','rejected','cancelled','canceled','withdrawn')
      AND lower(r.status) NOT IN ('completed','cancelled','canceled')
    ORDER BY r.id, rp.updated_at DESC NULLS LAST
  ),
  upcoming AS (
    SELECT
      p.id AS race_id, p.name AS race_name, p.category,
      p.country_code, s.stage_number, s.stage_date
    FROM prepared p
    JOIN LATERAL (
      SELECT stage_number, stage_date
      FROM uranius_game.race_stages s
      CROSS JOIN game_day g
      WHERE s.race_id=p.id AND s.stage_date>=g.current_game_date
      ORDER BY s.stage_date, s.stage_number
      LIMIT 1
    ) s ON TRUE
    ORDER BY s.stage_date, p.name
    LIMIT 5
  ),
  today AS (
    SELECT s.race_id, r.name AS race_name, r.country_code,
           s.stage_number, s.stage_date
    FROM uranius_game.race_stages s
    JOIN uranius_game.races r ON r.id=s.race_id
    CROSS JOIN game_day g
    WHERE s.stage_date=g.current_game_date
      AND lower(r.status) NOT IN ('cancelled','canceled')
    ORDER BY r.name, s.stage_number
    LIMIT 20
  )
SELECT jsonb_build_object(
  'upcomingSchedule',
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id',race_id::text,
    'dateLabel',to_char(stage_date,'Mon DD'),
    'title',race_name,
    'subtitle', concat_ws(' · ',category,'Stage '||stage_number::text),
    'countryCode',country_code,
    'href','#/dashboard/races/'||race_id::text
  ) ORDER BY stage_date,race_name) FROM upcoming),'[]'::jsonb),
  'todayRaces',
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id',race_id::text||':'||stage_number::text,
    'timeLabel','Today',
    'title',race_name,
    'subtitle','Stage '||stage_number::text||' is scheduled today.',
    'countryCode',country_code,
    'href','#/dashboard/races/'||race_id::text
  ) ORDER BY race_name,stage_number) FROM today),'[]'::jsonb)
) AS overview_schedule;
ROLLBACK;
