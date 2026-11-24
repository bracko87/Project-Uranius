-- Uranius Squad restricted column grant — EXACT REVIEW CANDIDATE.
-- REVIEW_ONLY_NOT_APPROVED. DO NOT RUN AGAINST ANY HOSTED DATABASE.
-- Target only isolated Uranius sdtsivgtcaoaeoihcwzd; no original game.
-- Transaction, digest approval, TLS, ledger insert and postflight must be
-- provided by a separately reviewed guarded installer.
SELECT uranius_private.assert_project();

DO $squad013_preflight$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410513);
 IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user
       AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 10
    OR EXISTS (
      SELECT * FROM (VALUES
        ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
        ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
        ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
        ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
        ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
        ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
        ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
        ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
        ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37'),
        ('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af')
      ) AS expected(version,sha256)
      EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger
    )
    OR EXISTS (
      SELECT version,sha256 FROM uranius_private.migration_ledger
      EXCEPT SELECT * FROM (VALUES
        ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
        ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
        ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
        ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
        ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
        ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
        ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
        ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
        ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37'),
        ('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af')
      ) AS expected(version,sha256)
    )
    OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
    OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
    OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1) <> 1
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader'
       AND rolcanlogin AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member='uranius_smoke_reader'::regrole)
    OR has_database_privilege('uranius_smoke_reader',current_database(),'CREATE')
    OR has_schema_privilege('uranius_smoke_reader','uranius_private','USAGE')
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_catalog.riders'::regclass AND relrowsecurity)
    OR NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname='uranius_catalog'
          AND tablename='riders' AND policyname='riders_read'
          AND 'uranius_smoke_reader'=ANY(roles)
          AND qual LIKE '%team_owners%' AND qual LIKE '%request_uid()%'
    )
    OR (SELECT count(*) FROM pg_attribute WHERE attrelid='uranius_catalog.riders'::regclass AND attnum>0 AND NOT attisdropped) <> 7
    OR NOT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','rider_id','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR EXISTS (
       SELECT 1 FROM unnest(ARRAY['label','flat','climbing','stamina','resistance']) c
       WHERE has_column_privilege('uranius_smoke_reader','uranius_catalog.riders',c,'SELECT')
    )
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','DELETE')
    OR has_any_column_privilege('anon','uranius_catalog.riders','SELECT')
    OR NOT has_table_privilege('authenticated','uranius_catalog.riders','SELECT')
 THEN RAISE EXCEPTION 'Uranius Squad 013 permission candidate refused: immutable isolated baseline mismatch';
 END IF;
END
$squad013_preflight$;

GRANT SELECT (label,flat,climbing,stamina,resistance)
  ON uranius_catalog.riders TO uranius_smoke_reader;

DO $squad013_postflight$
BEGIN
 IF NOT (SELECT bool_and(has_column_privilege(
     'uranius_smoke_reader','uranius_catalog.riders',c,'SELECT'))
     FROM unnest(ARRAY['rider_id','label','flat','climbing','stamina','resistance']) c)
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','DELETE')
    OR has_any_column_privilege('anon','uranius_catalog.riders','SELECT')
    OR NOT has_table_privilege('authenticated','uranius_catalog.riders','SELECT')
 THEN RAISE EXCEPTION 'Uranius Squad 013 unexpected postflight ACL; must roll back';
 END IF;
END
$squad013_postflight$;
