-- Uranius calendar preview: existing 010 column grants only, no new privileges.
-- All world stages in the next 30 game days; only own accepted-entry indicator.
BEGIN READ ONLY;
DO $calendar_guard$
BEGIN
  IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR has_schema_privilege(current_user, 'uranius_private', 'USAGE')
     OR has_database_privilege(current_user,current_database(),'CREATE') THEN
    RAISE EXCEPTION 'Restricted TLS Calendar reader required';
  END IF;
END
$calendar_guard$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'verified_subject')::text, true);

-- No schedule may be emitted without a real mapped Uranius club.
DO $calendar_identity$
BEGIN
  IF uranius_catalog.request_uid() IS NULL
    OR uranius_game.get_my_club_id() IS NULL THEN
    RAISE EXCEPTION 'Authenticated Uranius club mapping required';
  END IF;
END
$calendar_identity$;


WITH clock AS (
 SELECT make_date(1999 + season_number,month_number,day_number) AS game_date
 FROM uranius_game.game_state WHERE is_paused IS TRUE
), identity AS (
 SELECT uranius_game.get_my_club_id() AS club_id
), stages AS (
 SELECT r.id AS race_id,r.name,r.category,r.country_code,r.status,
 s.stage_number,s.stage_date,s.stage_format,
 EXISTS (SELECT 1 FROM uranius_game.race_team_entries e
 WHERE e.race_id=r.id AND e.club_id=i.club_id AND e.status='accepted') AS own_accepted
 FROM uranius_game.races r
 JOIN uranius_game.race_stages s ON s.race_id=r.id
 CROSS JOIN clock c CROSS JOIN identity i
 WHERE i.club_id IS NOT NULL AND s.stage_date>=c.game_date AND s.stage_date<c.game_date+30
 ORDER BY s.stage_date,r.name,r.id,s.stage_number LIMIT 501
)
SELECT jsonb_build_object(
 'clubId',(SELECT club_id FROM identity),
 'gameDate',(SELECT game_date FROM clock),
 'stages',COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'raceId',race_id,'title',name,'category',category,'countryCode',country_code,
 'raceStatus',status,'stageNumber',stage_number,'stageDate',stage_date,
 'stageFormat',stage_format,'ownAccepted',own_accepted)
 ORDER BY stage_date,name,race_id,stage_number) FROM stages),'[]'::jsonb)
);
ROLLBACK;
