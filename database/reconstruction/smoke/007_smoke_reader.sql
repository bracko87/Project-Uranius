SELECT uranius_private.assert_project();

DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> current_user
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR NOT EXISTS (
       SELECT 1 FROM pg_roles r WHERE rolname='uranius_smoke_reader' AND rolcanlogin
       AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)
       AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member=r.oid)
     )
     OR has_database_privilege('uranius_smoke_reader', current_database(), 'CREATE')
     OR has_schema_privilege('uranius_smoke_reader', 'public', 'CREATE')
     OR has_schema_privilege('uranius_smoke_reader', 'uranius_private', 'USAGE')
     OR EXISTS (
       SELECT 1 FROM pg_namespace n JOIN pg_class c ON c.relnamespace=n.oid
       WHERE (n.nspname, c.relname) IN (
         ('uranius_game','club_profiles'), ('uranius_game','opening_balances'), ('uranius_game','stage_calendar'),
         ('uranius_catalog','teams'), ('uranius_catalog','team_owners'), ('uranius_catalog','riders')
       ) AND NOT c.relrowsecurity
     )
     OR NOT EXISTS (SELECT 1 FROM pg_class
       WHERE oid='uranius_game.clubs'::regclass AND 'security_invoker=true'=ANY(reloptions)) THEN
    RAISE EXCEPTION 'Uranius reader role or RLS prerequisites failed';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA uranius_catalog, uranius_game TO uranius_smoke_reader;
GRANT EXECUTE ON FUNCTION uranius_catalog.request_uid(), uranius_game.get_my_club_id() TO uranius_smoke_reader;

GRANT SELECT (team_id, club_id, country_code, logo_path, primary_color, secondary_color, created_at)
  ON uranius_game.club_profiles TO uranius_smoke_reader;
GRANT SELECT (id, owner_user_id, name, country_code, logo_path, primary_color, secondary_color, club_type, parent_club_id, created_at)
  ON uranius_game.clubs TO uranius_smoke_reader;
GRANT SELECT (team_id, label) ON uranius_catalog.teams TO uranius_smoke_reader;
GRANT SELECT (team_id, user_id) ON uranius_catalog.team_owners TO uranius_smoke_reader;
GRANT SELECT (rider_id) ON uranius_catalog.riders TO uranius_smoke_reader;
GRANT SELECT (credits) ON uranius_game.opening_balances TO uranius_smoke_reader;
GRANT SELECT (stage_id) ON uranius_game.stage_calendar TO uranius_smoke_reader;

ALTER POLICY own_club_profile ON uranius_game.club_profiles TO authenticated, uranius_smoke_reader;
ALTER POLICY teams_read ON uranius_catalog.teams TO authenticated, uranius_smoke_reader;
ALTER POLICY team_owners_read ON uranius_catalog.team_owners TO authenticated, uranius_smoke_reader;
ALTER POLICY riders_read ON uranius_catalog.riders TO authenticated, uranius_smoke_reader;
ALTER POLICY own_opening_balance ON uranius_game.opening_balances TO authenticated, uranius_smoke_reader;
ALTER POLICY calendar_read ON uranius_game.stage_calendar TO authenticated, uranius_smoke_reader;
