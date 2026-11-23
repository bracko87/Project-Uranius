-- REVIEW-ONLY future read path; requires a separately approved clock-reader ACL extension.
-- Server-only authenticated subject; no browser-supplied subject, tenant, team or SQL.
-- Never execute this from an untrusted client or grant anonymous table access.
BEGIN READ ONLY;
DO $guard_clock_reader$
BEGIN
  IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR has_schema_privilege(current_user, 'uranius_private', 'USAGE') THEN
    RAISE EXCEPTION 'Restricted TLS clock reader required';
  END IF;
END
$guard_clock_reader$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'verified_subject')::text, true);
SELECT row_to_json(clock) FROM (
  SELECT season_number, month_number, day_number, is_paused
  FROM uranius_game.game_state
  LIMIT 1
) AS clock;
ROLLBACK;
