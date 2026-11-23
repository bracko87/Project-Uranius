-- Uranius Overview PRIVATE schedule reader — REVIEW ONLY, NOT EXECUTABLE ON HOSTED DB.
-- Requires later owner-scoped SELECT policies + selective role privileges on 010 tables.
-- Bound manager subject is supplied by server-side verified Auth/JWT context, never URL input.
-- Original source: reference/database/20261123_original_overview_race_schedule_SOURCE_ONLY.sql.txt
-- The original Upcoming Schedule selects preparations regardless of accepted team entry;
-- Today's Races is a global world-stage list, not a manager's accepted schedule.
-- Deliberately omits developing teams until the source parent_club_id lifecycle is rebuilt.
-- Does not use SECURITY DEFINER, user-provided club UUIDs or original public race-entry policy.

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
      p.country_code, s.stage_number, s.stage_date,
      (SELECT COUNT(*) FROM uranius_game.race_stages ct WHERE ct.race_id=p.id) AS stage_count
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
    SELECT s.race_id, r.name AS race_name, r.country_code, r.category,
           s.stage_number, s.stage_date, s.stage_format
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
