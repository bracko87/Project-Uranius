BEGIN READ ONLY;
DO $replay_guard$
BEGIN
  IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR has_schema_privilege(current_user, 'uranius_private', 'USAGE')
     OR has_database_privilege(current_user,current_database(),'CREATE') THEN
    RAISE EXCEPTION 'Restricted TLS replay reader required';
  END IF;
END
$replay_guard$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'verified_subject')::text, true);

-- No schedule may be emitted without a real mapped Uranius club.
DO $replay_identity$
BEGIN
  IF uranius_catalog.request_uid() IS NULL
    OR uranius_game.get_my_club_id() IS NULL THEN
    RAISE EXCEPTION 'Authenticated Uranius club mapping required';
  END IF;
END
$replay_identity$;


SELECT jsonb_build_object('clubId',uranius_game.get_my_club_id(),'replay',(
 SELECT packet FROM uranius_game.synthetic_race_replay_preview
 WHERE race_id='19000000-0000-4000-8000-000000000001'
));
ROLLBACK;
