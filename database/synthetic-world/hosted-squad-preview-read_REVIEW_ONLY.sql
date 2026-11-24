-- READ ONLY / HOSTED SQUAD PREVIEW AFTER INSTALLED AND VERIFIED MIGRATION 013.
-- Source: Project Uranius synthetic riders, NOT original public.club_roster.
-- Prerequisite: independently verified installed migration 013, with five narrow
-- reader column grants. Never use service_role, SECURITY DEFINER or public API.
-- SQL must be run through an already-verified short-lived manager server session.
-- Requires psql -v verified_subject=<verified UUID>; no caller-supplied club IDs.
BEGIN READ ONLY;
DO $squad_reader_guard$
BEGIN
 IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR has_schema_privilege(current_user,'uranius_private','USAGE')
    OR has_database_privilege(current_user,current_database(),'CREATE') THEN
   RAISE EXCEPTION 'Restricted Uranius TLS Squad reader required';
 END IF;
END
$squad_reader_guard$;

SELECT set_config('request.jwt.claims',jsonb_build_object('sub',:'verified_subject')::text,true);

DO $squad_owner_guard$
BEGIN
 IF uranius_catalog.request_uid() IS NULL
    OR uranius_game.get_my_club_id() IS NULL THEN
   RAISE EXCEPTION 'Verified owned Uranius club required';
 END IF;
END
$squad_owner_guard$;

WITH owned_riders AS (
 SELECT r.rider_id,r.label,r.flat,r.climbing,r.stamina,r.resistance
 FROM uranius_catalog.riders r
 -- Existing FORCE-checked owner RLS must filter team_id invisibly to reader.
 ORDER BY r.rider_id
 LIMIT 100
)
SELECT jsonb_build_object(
 'kind','syntheticSquadPreview',
 'clubId',uranius_game.get_my_club_id()::text,
 'riders',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'syntheticRiderId',rider_id,
   'label',label,
   'flat',flat,
   'climbing',climbing,
   'stamina',stamina,
   'resistance',resistance
 ) ORDER BY rider_id) FROM owned_riders),'[]'::jsonb),
 'missingOriginalFields',jsonb_build_array(
   'assigned_role','age_years','overall','availability_status','fatigue',
   'country_code','birth_date','morale','potential','contract'
 )
) AS synthetic_squad_preview;
ROLLBACK;
