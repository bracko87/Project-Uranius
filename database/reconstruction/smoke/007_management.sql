-- Review only. Send this single statement verbatim via project-scoped execute_sql.
DO $uranius_007$
DECLARE
  reader oid;
  data_before jsonb;
  data_now jsonb;
  policies_before jsonb;
  policies_now jsonb;
BEGIN
  PERFORM set_config('search_path', 'pg_catalog', true);
  PERFORM set_config('lock_timeout', '5s', true);
  IF current_user <> 'postgres' OR session_user <> current_user OR current_database() <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Expected PostgreSQL 17 management connection as postgres';
  END IF;

  PERFORM pg_advisory_xact_lock(410501);
  LOCK TABLE uranius_private.project_identity, uranius_private.migration_ledger IN SHARE ROW EXCLUSIVE MODE;
  PERFORM set_config('uranius.approved_project_ref', 'sdtsivgtcaoaeoihcwzd', true);
  PERFORM uranius_private.assert_project();
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
     OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 6
     OR EXISTS (
       SELECT * FROM (VALUES
         ('001_identity.sql', '87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
         ('002_reference_schema.sql', '6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
         ('003_access.sql', 'b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
         ('004_synthetic_reference.sql', 'e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
         ('005_club_identity.sql', '9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
         ('006_synthetic_world.sql', '56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3')
       ) AS expected(version, sha256)
       EXCEPT SELECT version, sha256 FROM uranius_private.migration_ledger
     ) THEN
    RAISE EXCEPTION 'Unexpected Uranius migration history';
  END IF;

  SELECT oid INTO reader FROM pg_roles
  WHERE rolname = 'uranius_smoke_reader' AND rolcanlogin
    AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)
    AND 'default_transaction_read_only=on' = ANY(rolconfig);
  IF reader IS NULL
     OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = reader OR (roleid = reader AND member <> 'postgres'::regrole))
     OR NOT has_database_privilege(reader, 'postgres', 'CONNECT')
     OR has_database_privilege(reader, 'postgres', 'CREATE')
     OR has_schema_privilege(reader, 'public', 'CREATE')
     OR has_schema_privilege(reader, 'uranius_private', 'USAGE')
     OR has_schema_privilege(reader, 'uranius_catalog', 'USAGE')
     OR has_schema_privilege(reader, 'uranius_game', 'USAGE') THEN
    RAISE EXCEPTION 'Existing reader privileges or configuration differ from the reviewed bootstrap';
  END IF;

  LOCK TABLE uranius_catalog.seasons,
             uranius_catalog.teams,
             uranius_catalog.team_owners,
             uranius_catalog.riders,
             uranius_catalog.equipment,
             uranius_catalog.stages,
             uranius_catalog.terrain,
             uranius_catalog.startlists,
             uranius_game.club_profiles,
             uranius_game.opening_balances,
             uranius_game.stage_calendar,
             uranius_private.synthetic_manager_slots IN SHARE ROW EXCLUSIVE MODE;
  IF (SELECT count(*) FROM uranius_catalog.teams) <> 20
     OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
     OR (SELECT count(*) FROM uranius_catalog.stages) <> 3
     OR (SELECT count(*) FROM uranius_catalog.startlists) <> 450
     OR (SELECT count(*) FROM uranius_game.club_profiles) <> 20
     OR (SELECT count(*) FROM uranius_game.opening_balances WHERE credits = 10000) <> 20
     OR (SELECT count(*) FROM uranius_game.opening_balances) <> 20
     OR (SELECT count(*) FROM uranius_game.stage_calendar) <> 3
     OR (SELECT count(*) FROM uranius_private.synthetic_manager_slots) <> 2
     OR (SELECT array_agg(team_id ORDER BY team_id) FROM uranius_catalog.team_owners)
         IS DISTINCT FROM ARRAY[1,2]
     OR (SELECT count(DISTINCT user_id) FROM uranius_catalog.team_owners) <> 2
     OR EXISTS (
       SELECT 1 FROM pg_class WHERE oid IN (
         'uranius_game.club_profiles'::regclass, 'uranius_game.opening_balances'::regclass,
         'uranius_game.stage_calendar'::regclass, 'uranius_catalog.teams'::regclass,
         'uranius_catalog.team_owners'::regclass, 'uranius_catalog.riders'::regclass
       ) AND NOT relrowsecurity
     )
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'uranius_game.clubs'::regclass
                    AND 'security_invoker=true' = ANY(reloptions)) THEN
    RAISE EXCEPTION 'Synthetic data, ownership or RLS prerequisites failed';
  END IF;

  FOR pass IN 1..2 LOOP
    SELECT jsonb_build_array(
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.seasons AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.teams AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.team_owners AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.riders AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.equipment AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.stages AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.terrain AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_catalog.startlists AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_game.club_profiles AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_game.opening_balances AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_game.stage_calendar AS r),
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)) FROM uranius_private.synthetic_manager_slots AS r)
    ) INTO data_now;
    SELECT jsonb_agg(to_jsonb(p) - 'roles' ORDER BY schemaname, tablename, policyname) INTO policies_now
    FROM pg_policies AS p WHERE schemaname IN ('uranius_game', 'uranius_catalog', 'uranius_private');
    IF pass = 1 THEN
      data_before := data_now;
      policies_before := policies_now;
      IF (SELECT count(*) FROM pg_policies WHERE roles = ARRAY['authenticated']::name[]
          AND cmd = 'SELECT' AND (schemaname, tablename, policyname) IN (
            ('uranius_game','club_profiles','own_club_profile'), ('uranius_catalog','teams','teams_read'),
            ('uranius_catalog','team_owners','team_owners_read'), ('uranius_catalog','riders','riders_read'),
            ('uranius_game','opening_balances','own_opening_balance'), ('uranius_game','stage_calendar','calendar_read')
          )) <> 6 THEN
        RAISE EXCEPTION 'Existing SELECT policy roles differ from reviewed baseline';
      END IF;

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
    END IF;
  END LOOP;

  IF data_before IS DISTINCT FROM data_now OR policies_before IS DISTINCT FROM policies_now THEN
    RAISE EXCEPTION 'Migration changed existing rows or RLS predicates';
  END IF;

  INSERT INTO uranius_private.migration_ledger (version, sha256)
    VALUES ('007_smoke_reader.sql', 'dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b');
  RAISE NOTICE 'Uranius 007 applied. Seven ledger entries. Fixture rows and policy predicates unchanged.';
END
$uranius_007$;
