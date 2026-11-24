-- PROJECT URANIUS — 018 SYNTHETIC NINE-SKILL STORAGE / OFFLINE REVIEW ONLY.
-- NOT APPROVED for hosted execution. NO INSTALLER OR APPROVAL MANIFEST.
-- Isolated synthetic baseline 015 only; original ProPeloton production excluded.
-- 9 nullable named original UI skill slots; 3 observed same-name values copied;
-- 6 unavailable slots and their source columns remain NULL, never derived.
-- Per-attribute provenance pairs are enforced in-row by PostgreSQL CHECK.
-- A future installer must enforce exact 13-entry ledger history atomically.
SELECT uranius_private.assert_project();

DO $rider018_preflight$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410518);
 IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND
       (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR (SELECT count(*) FROM uranius_private.migration_ledger)<>13
    OR (SELECT sha256 FROM uranius_private.migration_ledger
       WHERE version='015_rider_uuid_owner_read.sql') IS DISTINCT FROM
       '71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e'
    OR to_regclass('uranius_game.synthetic_rider_attributes') IS NOT NULL
    OR (SELECT count(*) FROM uranius_catalog.riders)<>200
    OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2
    OR NOT EXISTS (SELECT 1 FROM pg_class
       WHERE oid='uranius_game.synthetic_rider_identity'::regclass
       AND relrowsecurity AND relforcerowsecurity)
    OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game'
       AND tablename='synthetic_rider_identity')<>1
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game'
       AND tablename='synthetic_rider_identity'
       AND policyname='synthetic_rider_uuid_owner_read'
       AND 'uranius_smoke_reader'=ANY(roles))
    OR has_any_column_privilege('anon','uranius_game.synthetic_rider_identity','SELECT')
    OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_identity','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
 THEN RAISE EXCEPTION 'Uranius 018 review refused: expected installed 015 isolated TLS baseline not present';
 END IF;
END
$rider018_preflight$;

CREATE TABLE uranius_game.synthetic_rider_attributes (
 rider_id integer PRIMARY KEY REFERENCES uranius_game.synthetic_rider_identity(rider_id) ON DELETE RESTRICT,
 sprint smallint CHECK (sprint BETWEEN 0 AND 100),
 sprint_source text CHECK (sprint_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT sprint_source_pair CHECK (((sprint IS NULL) = (sprint_source IS NULL)) AND (sprint_source IS DISTINCT FROM 'isolated_catalog')),
 climbing smallint CHECK (climbing BETWEEN 0 AND 100),
 climbing_source text CHECK (climbing_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT climbing_source_pair CHECK (((climbing IS NULL) = (climbing_source IS NULL)) AND (TRUE)),
 time_trial smallint CHECK (time_trial BETWEEN 0 AND 100),
 time_trial_source text CHECK (time_trial_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT time_trial_source_pair CHECK (((time_trial IS NULL) = (time_trial_source IS NULL)) AND (time_trial_source IS DISTINCT FROM 'isolated_catalog')),
 endurance smallint CHECK (endurance BETWEEN 0 AND 100),
 endurance_source text CHECK (endurance_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT endurance_source_pair CHECK (((endurance IS NULL) = (endurance_source IS NULL)) AND (endurance_source IS DISTINCT FROM 'isolated_catalog')),
 flat smallint CHECK (flat BETWEEN 0 AND 100),
 flat_source text CHECK (flat_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT flat_source_pair CHECK (((flat IS NULL) = (flat_source IS NULL)) AND (TRUE)),
 recovery smallint CHECK (recovery BETWEEN 0 AND 100),
 recovery_source text CHECK (recovery_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT recovery_source_pair CHECK (((recovery IS NULL) = (recovery_source IS NULL)) AND (recovery_source IS DISTINCT FROM 'isolated_catalog')),
 resistance smallint CHECK (resistance BETWEEN 0 AND 100),
 resistance_source text CHECK (resistance_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT resistance_source_pair CHECK (((resistance IS NULL) = (resistance_source IS NULL)) AND (TRUE)),
 race_iq smallint CHECK (race_iq BETWEEN 0 AND 100),
 race_iq_source text CHECK (race_iq_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT race_iq_source_pair CHECK (((race_iq IS NULL) = (race_iq_source IS NULL)) AND (race_iq_source IS DISTINCT FROM 'isolated_catalog')),
 teamwork smallint CHECK (teamwork BETWEEN 0 AND 100),
 teamwork_source text CHECK (teamwork_source IN ('isolated_catalog','approved_synthetic_fixture')),
 CONSTRAINT teamwork_source_pair CHECK (((teamwork IS NULL) = (teamwork_source IS NULL)) AND (teamwork_source IS DISTINCT FROM 'isolated_catalog'))
);
-- No exposed Data API. No read grants, not even for the smoke reader until a separately authorized migration.
REVOKE ALL ON uranius_game.synthetic_rider_attributes FROM PUBLIC, anon, authenticated, uranius_smoke_reader;

INSERT INTO uranius_game.synthetic_rider_attributes
 (rider_id,climbing,climbing_source,flat,flat_source,resistance,resistance_source)
 SELECT r.rider_id,r.climbing,'isolated_catalog',
        r.flat,'isolated_catalog',
        r.resistance,'isolated_catalog'
 FROM uranius_catalog.riders r ORDER BY r.rider_id;

DO $rider018_data_verify$
BEGIN
 IF (SELECT count(*) FROM uranius_game.synthetic_rider_attributes)<>200
    OR EXISTS (SELECT rider_id FROM uranius_catalog.riders
               EXCEPT SELECT rider_id FROM uranius_game.synthetic_rider_attributes)
    OR EXISTS (SELECT rider_id FROM uranius_game.synthetic_rider_attributes
               EXCEPT SELECT rider_id FROM uranius_catalog.riders)
    OR EXISTS (
      SELECT 1 FROM uranius_game.synthetic_rider_attributes a
      JOIN uranius_catalog.riders r USING(rider_id)
      WHERE a.climbing IS DISTINCT FROM r.climbing
        OR a.flat IS DISTINCT FROM r.flat
        OR a.resistance IS DISTINCT FROM r.resistance)
    OR EXISTS (
      SELECT 1 FROM uranius_game.synthetic_rider_attributes
      WHERE sprint IS NOT NULL OR time_trial IS NOT NULL OR endurance IS NOT NULL
        OR recovery IS NOT NULL OR race_iq IS NOT NULL OR teamwork IS NOT NULL
        OR sprint_source IS NOT NULL OR time_trial_source IS NOT NULL
        OR endurance_source IS NOT NULL OR recovery_source IS NOT NULL
        OR race_iq_source IS NOT NULL OR teamwork_source IS NOT NULL)
 THEN RAISE EXCEPTION 'Uranius 018 review data/provenance backfill incomplete; rollback required';
 END IF;
END
$rider018_data_verify$;

ALTER TABLE uranius_game.synthetic_rider_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_game.synthetic_rider_attributes FORCE ROW LEVEL SECURITY;

DO $rider018_acl_verify$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class
     WHERE oid='uranius_game.synthetic_rider_attributes'::regclass
     AND relrowsecurity AND relforcerowsecurity)
    OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game'
       AND tablename='synthetic_rider_attributes')
    OR has_any_column_privilege('anon','uranius_game.synthetic_rider_attributes','SELECT')
    OR has_any_column_privilege('authenticated','uranius_game.synthetic_rider_attributes','SELECT')
    OR has_any_column_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','SELECT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_game.synthetic_rider_attributes','DELETE')
    OR (SELECT count(*) FROM uranius_private.migration_ledger)<>13
 THEN RAISE EXCEPTION 'Uranius 018 review ACL or ledger changed; rollback required';
 END IF;
END
$rider018_acl_verify$;
