-- PROJECT URANIUS — 014 UUID mapping DESIGN / REVIEW ONLY / NOT APPROVED.
-- DO NOT EXECUTE AGAINST HOSTED DATABASE. No approval manifest or installer.
-- Synthetic UUIDs are independent random identifiers, NOT copied real rider identities.
-- A separately reviewed guarded installer must provide one atomic transaction,
-- verify full migration history, validate this exact digest and obtain owner approval.
SELECT uranius_private.assert_project();

DO $rider014_preflight$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410514);
 IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user
       AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR to_regclass('uranius_game.synthetic_rider_identity') IS NOT NULL
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 11
    OR (SELECT sha256 FROM uranius_private.migration_ledger
         WHERE version='010_overview_race_reader.sql')
       IS DISTINCT FROM '56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'
    OR (SELECT sha256 FROM uranius_private.migration_ledger
         WHERE version='013_squad_reader_grant.sql')
       IS DISTINCT FROM '8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859'
    OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
    OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='uranius_catalog.riders'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_catalog'
       AND tablename='riders' AND policyname='riders_read'
       AND 'uranius_smoke_reader'=ANY(roles) AND qual LIKE '%request_uid()%')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR has_any_column_privilege('anon','uranius_catalog.riders','SELECT')
    OR to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL
 THEN RAISE EXCEPTION 'Uranius 014 UUID identity design refused: exact baseline or isolated TLS login mismatch';
 END IF;
END
$rider014_preflight$;

-- Mapping is separate from synthetic riders and does not change any existing rider IDs.
CREATE TABLE uranius_game.synthetic_rider_identity (
 rider_id integer PRIMARY KEY REFERENCES uranius_catalog.riders(rider_id) ON DELETE RESTRICT,
 rider_uuid uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid() UNIQUE,
 identity_provenance text NOT NULL DEFAULT 'uranius_generated_synthetic'
   CHECK (identity_provenance = 'uranius_generated_synthetic'),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- This table is deliberately NOT a public.club_roster replacement.
REVOKE ALL ON uranius_game.synthetic_rider_identity FROM PUBLIC, anon, authenticated, uranius_smoke_reader;
INSERT INTO uranius_game.synthetic_rider_identity(rider_id)
 SELECT rider_id FROM uranius_catalog.riders ORDER BY rider_id;

-- Check data BEFORE enabling FORCE RLS; afterwards the restricted migrator,
-- including the table owner, cannot read without a policy.
DO $rider014_insert_verify$
BEGIN
 IF (SELECT count(*) FROM uranius_game.synthetic_rider_identity)<>200
    OR (SELECT count(DISTINCT rider_uuid) FROM uranius_game.synthetic_rider_identity)<>200
    OR EXISTS (SELECT 1 FROM uranius_game.synthetic_rider_identity
               WHERE rider_uuid='00000000-0000-0000-0000-000000000000'::uuid)
    OR EXISTS (SELECT rider_id FROM uranius_catalog.riders
               EXCEPT SELECT rider_id FROM uranius_game.synthetic_rider_identity)
    OR EXISTS (SELECT rider_id FROM uranius_game.synthetic_rider_identity
               EXCEPT SELECT rider_id FROM uranius_catalog.riders)
 THEN RAISE EXCEPTION 'Uranius 014 synthetic UUID mapping incomplete; roll back';
 END IF;
END
$rider014_insert_verify$;

ALTER TABLE uranius_game.synthetic_rider_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_game.synthetic_rider_identity FORCE ROW LEVEL SECURITY;

-- No SELECT policies, no PUBLIC/anon/auth/reader rights, no exposed view/API.
-- Future ownership-scoped profile access will require its own separate review.
DO $rider014_postflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class
   WHERE oid='uranius_game.synthetic_rider_identity'::regclass
     AND relrowsecurity AND relforcerowsecurity)
    OR EXISTS (SELECT 1 FROM pg_policies
       WHERE schemaname='uranius_game' AND tablename='synthetic_rider_identity')
    OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_identity','DELETE')
    OR (SELECT count(*) FROM uranius_private.migration_ledger)<>11
 THEN RAISE EXCEPTION 'Uranius 014 UUID identity isolation postflight failed; roll back';
 END IF;
END
$rider014_postflight$;
