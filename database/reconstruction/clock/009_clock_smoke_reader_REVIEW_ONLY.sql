-- Candidate 009. REVIEW ONLY: DO NOT APPLY ON HOSTED URANIUS WITHOUT SEPARATE APPROVAL.
-- Adds only bounded clock column reads for the existing restricted server smoke reader.
-- Must use the same independently reviewed transactional management process as 007/008.
-- Original ProPeloton Manager, public Data API, Auth and gameplay remain untouched.
SELECT uranius_private.assert_project();

DO $uranius_009_preflight$
BEGIN
  PERFORM set_config('search_path', 'pg_catalog', true);
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM pg_advisory_xact_lock(410501);
  IF current_user <> 'uranius_migrator' OR session_user NOT IN ('uranius_migrator','postgres')
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref', true) <> 'sdtsivgtcaoaeoihcwzd'
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 8
    OR NOT EXISTS (SELECT 1 FROM uranius_private.migration_ledger
      WHERE version='008_game_clock_v1.sql'
        AND sha256='f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b')
    OR to_regclass('uranius_game.game_state') IS NULL
    OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1
       AND month_number=1 AND day_number=1) <> 1
    OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
    OR NOT EXISTS (SELECT 1 FROM pg_roles r WHERE rolname='uranius_smoke_reader'
      AND rolcanlogin AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication
        OR rolbypassrls OR rolinherit))
    OR NOT has_schema_privilege('uranius_smoke_reader','uranius_game','USAGE')
    OR has_schema_privilege('uranius_smoke_reader','uranius_private','USAGE')
    OR has_any_column_privilege('uranius_smoke_reader','uranius_game.game_state','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.game_state','UPDATE')
    OR NOT EXISTS (SELECT 1 FROM pg_policies
      WHERE schemaname='uranius_game' AND tablename='game_state'
        AND policyname='game_state_manager_read' AND cmd='SELECT'
        AND roles=ARRAY['authenticated']::name[])
  THEN
    RAISE EXCEPTION 'Uranius 009 review prerequisites differ from the isolated clock baseline';
  END IF;
END
$uranius_009_preflight$;

-- The fixed server query selects only these four clock columns, never the id.
GRANT SELECT (season_number, month_number, day_number, is_paused)
  ON uranius_game.game_state TO uranius_smoke_reader;

-- Reuse the existing owner predicate backed by the server-verified JWT subject.
-- Never create blanket PUBLIC or anon policies.
ALTER POLICY game_state_manager_read ON uranius_game.game_state
  TO authenticated, uranius_smoke_reader;

-- The separately reviewed atomic management wrapper must record the canonical
-- 009_clock_smoke_reader.sql SHA-256; do not self-reference a hash here.
