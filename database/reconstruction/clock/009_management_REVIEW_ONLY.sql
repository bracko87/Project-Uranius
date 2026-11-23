-- REVIEW ONLY: do not execute on hosted Uranius without a separate owner approval.
-- This is a single-statement management wrapper, generated from the unchanged
-- 009_clock_smoke_reader_REVIEW_ONLY.sql SHA-256:
-- 1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37
-- Target sdtsivgtcaoaeoihcwzd; native management-wrapper execution NOT YET VERIFIED.
DO $uranius_009_management$
DECLARE
  membership_before jsonb;
  membership_after jsonb;
  data_before jsonb;
  data_after jsonb;
  existing_policies_before jsonb;
  existing_policies_after jsonb;
  clock_policy_before jsonb;
  clock_policy_after jsonb;
BEGIN
  PERFORM set_config('search_path','pg_catalog',true);
  PERFORM set_config('lock_timeout','5s',true);
  IF current_user <> 'postgres' OR session_user <> current_user
     OR current_database() <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR (SELECT rolsuper FROM pg_roles WHERE rolname='postgres')
     OR pg_has_role('postgres','uranius_migrator','SET')
     OR pg_has_role('postgres','uranius_migrator','USAGE') THEN
    RAISE EXCEPTION '009 requires reviewed non-superuser management connection';
  END IF;

  PERFORM pg_advisory_xact_lock(410501);
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.oid) INTO membership_before
  FROM pg_auth_members AS m WHERE roleid='uranius_migrator'::regrole;
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE roleid='uranius_migrator'::regrole
      AND member='postgres'::regrole AND grantor<>member
      AND admin_option AND NOT set_option AND NOT inherit_option
  ) OR EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE roleid='uranius_migrator'::regrole
      AND member='postgres'::regrole AND grantor=member
  ) THEN
    RAISE EXCEPTION '009 expected independent ADMIN-only membership not present';
  END IF;

  GRANT uranius_migrator TO postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY postgres;
  PERFORM set_config('role','uranius_migrator',true);
  IF current_user <> 'uranius_migrator' OR session_user <> 'postgres' THEN
    RAISE EXCEPTION '009 temporary migrator role switch failed';
  END IF;
  LOCK TABLE uranius_private.project_identity, uranius_private.migration_ledger
    IN SHARE ROW EXCLUSIVE MODE;
  PERFORM set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);
  PERFORM uranius_private.assert_project();
  LOCK TABLE uranius_catalog.team_owners, uranius_catalog.riders,
    uranius_catalog.stages, uranius_game.stage_calendar,
    uranius_game.opening_balances, uranius_game.game_state
    IN SHARE ROW EXCLUSIVE MODE;

  SELECT jsonb_build_object(
    'owners',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.team_id) FROM uranius_catalog.team_owners o),
    'riders',(SELECT count(*) FROM uranius_catalog.riders),
    'stages',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.stage_id) FROM uranius_catalog.stages s),
    'calendar',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.stage_id) FROM uranius_game.stage_calendar c),
    'balances',(SELECT jsonb_agg(to_jsonb(b) ORDER BY b.team_id) FROM uranius_game.opening_balances b),
    'clock',(SELECT jsonb_agg(to_jsonb(g) ORDER BY g.id) FROM uranius_game.game_state g)
  ) INTO data_before;
  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.schemaname,p.tablename,p.policyname)
    INTO existing_policies_before FROM pg_policies p
    WHERE p.schemaname IN ('uranius_catalog','uranius_game','uranius_private')
      AND NOT (p.schemaname='uranius_game' AND p.tablename='game_state');
  SELECT jsonb_build_object('qual',qual, 'with_check',with_check,
    'cmd',cmd,'permissive',permissive)
    INTO clock_policy_before FROM pg_policies
    WHERE schemaname='uranius_game' AND tablename='game_state'
      AND policyname='game_state_manager_read';

  -- Canonical 009 source statement 1/4
  EXECUTE $ur009_stmt_01$
-- Candidate 009. REVIEW ONLY: DO NOT APPLY ON HOSTED URANIUS WITHOUT SEPARATE APPROVAL.
-- Adds only bounded clock column reads for the existing restricted server smoke reader.
-- Must use the same independently reviewed transactional management process as 007/008.
-- Original ProPeloton Manager, public Data API, Auth and gameplay remain untouched.
SELECT uranius_private.assert_project();
$ur009_stmt_01$;

  -- Canonical 009 source statement 2/4
  EXECUTE $ur009_stmt_02$


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
    OR EXISTS (
      SELECT * FROM (VALUES
        ('001_identity.sql', '87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
        ('002_reference_schema.sql', '6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
        ('003_access.sql', 'b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
        ('004_synthetic_reference.sql', 'e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
        ('005_club_identity.sql', '9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
        ('006_synthetic_world.sql', '56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
        ('007_smoke_reader.sql', 'dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
        ('008_game_clock_v1.sql', 'f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b')
      ) AS expected(version, sha256)
      EXCEPT SELECT version, sha256 FROM uranius_private.migration_ledger
    )
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
$ur009_stmt_02$;

  -- Canonical 009 source statement 3/4
  EXECUTE $ur009_stmt_03$


-- The fixed server query selects only these four clock columns, never the id.
GRANT SELECT (season_number, month_number, day_number, is_paused)
  ON uranius_game.game_state TO uranius_smoke_reader;
$ur009_stmt_03$;

  -- Canonical 009 source statement 4/4
  EXECUTE $ur009_stmt_04$


-- Reuse the existing owner predicate backed by the server-verified JWT subject.
-- Never create blanket PUBLIC or anon policies.
ALTER POLICY game_state_manager_read ON uranius_game.game_state
  TO authenticated, uranius_smoke_reader;
$ur009_stmt_04$;

  IF (SELECT count(*) FROM uranius_private.migration_ledger) <> 8
     OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
     OR (SELECT count(*) FROM uranius_game.game_state
       WHERE id AND is_paused AND season_number=1 AND month_number=1 AND day_number=1
         AND hour_number=0 AND minute_number=0) <> 1
     OR (SELECT count(*) FROM pg_policies
       WHERE schemaname='uranius_game' AND tablename='game_state'
         AND policyname='game_state_manager_read'
         AND cmd='SELECT'
         AND roles @> ARRAY['authenticated','uranius_smoke_reader']::name[]
         AND cardinality(roles)=2) <> 1
     OR NOT (
       has_column_privilege('uranius_smoke_reader','uranius_game.game_state','season_number','SELECT')
       AND has_column_privilege('uranius_smoke_reader','uranius_game.game_state','month_number','SELECT')
       AND has_column_privilege('uranius_smoke_reader','uranius_game.game_state','day_number','SELECT')
       AND has_column_privilege('uranius_smoke_reader','uranius_game.game_state','is_paused','SELECT')
     )
     OR has_table_privilege('uranius_smoke_reader','uranius_game.game_state','SELECT')
     OR has_column_privilege('uranius_smoke_reader','uranius_game.game_state','id','SELECT')
     OR has_any_column_privilege('anon','uranius_game.game_state','SELECT')
     OR has_table_privilege('uranius_smoke_reader','uranius_game.game_state','UPDATE')
     OR has_table_privilege('uranius_smoke_reader','uranius_game.game_state','INSERT')
     OR has_table_privilege('uranius_smoke_reader','uranius_game.game_state','DELETE')
  THEN
    RAISE EXCEPTION '009 post-apply least-privilege/clock condition failed';
  END IF;

  SELECT jsonb_build_object(
    'owners',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.team_id) FROM uranius_catalog.team_owners o),
    'riders',(SELECT count(*) FROM uranius_catalog.riders),
    'stages',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.stage_id) FROM uranius_catalog.stages s),
    'calendar',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.stage_id) FROM uranius_game.stage_calendar c),
    'balances',(SELECT jsonb_agg(to_jsonb(b) ORDER BY b.team_id) FROM uranius_game.opening_balances b),
    'clock',(SELECT jsonb_agg(to_jsonb(g) ORDER BY g.id) FROM uranius_game.game_state g)
  ) INTO data_after;
  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.schemaname,p.tablename,p.policyname)
    INTO existing_policies_after FROM pg_policies p
    WHERE p.schemaname IN ('uranius_catalog','uranius_game','uranius_private')
      AND NOT (p.schemaname='uranius_game' AND p.tablename='game_state');
  SELECT jsonb_build_object('qual',qual, 'with_check',with_check,
    'cmd',cmd,'permissive',permissive)
    INTO clock_policy_after FROM pg_policies
    WHERE schemaname='uranius_game' AND tablename='game_state'
      AND policyname='game_state_manager_read';

  IF data_before IS DISTINCT FROM data_after
     OR existing_policies_before IS DISTINCT FROM existing_policies_after
     OR clock_policy_before IS DISTINCT FROM clock_policy_after THEN
    RAISE EXCEPTION '009 modified fixture rows or owner policy predicate';
  END IF;

  INSERT INTO uranius_private.migration_ledger(version,sha256)
  VALUES ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37');

  PERFORM set_config('role','none',true);
  REVOKE uranius_migrator FROM postgres GRANTED BY postgres RESTRICT;
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.oid) INTO membership_after
  FROM pg_auth_members AS m WHERE roleid='uranius_migrator'::regrole;
  IF current_user <> 'postgres'
    OR membership_before IS DISTINCT FROM membership_after
    OR pg_has_role('postgres','uranius_migrator','SET')
    OR pg_has_role('postgres','uranius_migrator','USAGE') THEN
    RAISE EXCEPTION '009 management membership restoration failed';
  END IF;
  RAISE NOTICE 'Uranius 009 clock reader wrapper completed, ledger now 9';
END
$uranius_009_management$;
