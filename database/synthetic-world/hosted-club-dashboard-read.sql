BEGIN READ ONLY;
DO $$
BEGIN
  IF current_user <> 'uranius_smoke_reader' OR session_user <> current_user
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR has_schema_privilege(current_user, 'uranius_private', 'USAGE') THEN
    RAISE EXCEPTION 'Restricted TLS reader required';
  END IF;
END
$$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'verified_subject')::text, true);

SELECT jsonb_build_object(
  'club', (SELECT row_to_json(c) FROM (
     SELECT id, owner_user_id, name, country_code, logo_path, primary_color, secondary_color, club_type, parent_club_id
     FROM uranius_game.clubs WHERE id=uranius_game.get_my_club_id()
  ) AS c),
  'riders', (SELECT count(rider_id) FROM uranius_catalog.riders),
  'credits', (SELECT credits FROM uranius_game.opening_balances),
  'calendar', (SELECT count(stage_id) FROM uranius_game.stage_calendar)
);
ROLLBACK;
