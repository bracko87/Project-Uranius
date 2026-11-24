-- PROJECT URANIUS — 015 OWNER-RESTRICTED UUID READ / REVIEW ONLY.
-- DO NOT RUN AGAINST HOSTED DATABASE. No owner approval or installer exists.
-- Isolated Uranius only. No original production, no Data API, no writes.
-- The rider-owning club is decided by EXISTING uranius_catalog.riders RLS;
-- the mapping never exposes team_id to the dedicated reader.
SELECT uranius_private.assert_project();

DO $rider015_preflight$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410515);
 IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR (SELECT count(*) FROM uranius_private.migration_ledger)<>12
    OR (SELECT sha256 FROM uranius_private.migration_ledger
        WHERE version='014_synthetic_rider_uuid.sql') IS DISTINCT FROM
          'f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f'
    OR (SELECT count(*) FROM uranius_catalog.riders)<>200
    OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2
    OR NOT EXISTS (SELECT 1 FROM pg_class
       WHERE oid='uranius_game.synthetic_rider_identity'::regclass
       AND relrowsecurity AND relforcerowsecurity)
    OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game'
        AND tablename='synthetic_rider_identity')<>0
    OR (SELECT count(*) FROM pg_attribute
        WHERE attrelid='uranius_game.synthetic_rider_identity'::regclass
        AND attnum>0 AND NOT attisdropped)<>4
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_catalog'
       AND tablename='riders' AND policyname='riders_read'
       AND 'uranius_smoke_reader'=ANY(roles)
       AND qual LIKE '%team_owners%' AND qual LIKE '%request_uid()%')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader'
       AND rolcanlogin AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member='uranius_smoke_reader'::regrole)
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR NOT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','rider_id','SELECT')
    OR has_any_column_privilege('anon','uranius_catalog.riders','SELECT')
    OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','DELETE')
 THEN RAISE EXCEPTION 'Uranius 015 candidate refused: isolated 014 baseline or access controls changed';
 END IF;
END
$rider015_preflight$;

-- PostgreSQL evaluates the subquery under the SAME dedicated reader identity;
-- the existing uranius_catalog.riders RLS denies riders of other owners.
CREATE POLICY synthetic_rider_uuid_owner_read
 ON uranius_game.synthetic_rider_identity FOR SELECT TO uranius_smoke_reader
 USING (EXISTS (
  SELECT 1 FROM uranius_catalog.riders AS own_rider
  WHERE own_rider.rider_id = synthetic_rider_identity.rider_id
 ));
GRANT SELECT (rider_id,rider_uuid)
 ON uranius_game.synthetic_rider_identity TO uranius_smoke_reader;

DO $rider015_postflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE
        oid='uranius_game.synthetic_rider_identity'::regclass
        AND relrowsecurity AND relforcerowsecurity)
    OR (SELECT count(*) FROM pg_policies
        WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity')<>1
    OR NOT EXISTS (SELECT 1 FROM pg_policies
        WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity'
        AND policyname='synthetic_rider_uuid_owner_read'
        AND 'uranius_smoke_reader'=ANY(roles)
        AND qual LIKE '%uranius_catalog.riders%')
    OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','rider_id','SELECT')
    OR NOT has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','rider_uuid','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','identity_provenance','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','created_at','SELECT')
    OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','DELETE')
    OR (SELECT count(*) FROM uranius_private.migration_ledger)<>12
 THEN RAISE EXCEPTION 'Uranius 015 postflight ACL or RLS leak; must rollback';
 END IF;
END
$rider015_postflight$;
