-- Runtime parameters are verified UUIDs and hashes substituted by the project-pinned wrapper.
BEGIN;
SELECT pg_advisory_xact_lock(410501);
SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);
SELECT uranius_private.assert_project();

DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> current_user
     OR current_database() <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
     OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND
        (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
     OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
     OR to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
     OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 6
     OR EXISTS (
         SELECT * FROM (VALUES __EXPECTED_LEDGER__) AS expected(version,sha256)
         EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger
     ) THEN
    RAISE EXCEPTION 'Uranius binding connection or ledger prerequisite failed';
  END IF;
  IF (SELECT array_agg(team_id ORDER BY team_id) FROM uranius_private.synthetic_manager_slots)
      IS DISTINCT FROM ARRAY[1,2] THEN
    RAISE EXCEPTION 'Unexpected manager slots';
  END IF;
END
$$;

SELECT uranius_private.bind_synthetic_managers('__MANAGER_A__'::uuid,'__MANAGER_B__'::uuid);
DO $$
BEGIN
  IF (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
     OR NOT EXISTS (SELECT 1 FROM uranius_catalog.team_owners WHERE team_id=1 AND user_id='__MANAGER_A__'::uuid)
     OR NOT EXISTS (SELECT 1 FROM uranius_catalog.team_owners WHERE team_id=2 AND user_id='__MANAGER_B__'::uuid) THEN
    RAISE EXCEPTION 'Unexpected ownership after binding';
  END IF;
END
$$;
COMMIT;
