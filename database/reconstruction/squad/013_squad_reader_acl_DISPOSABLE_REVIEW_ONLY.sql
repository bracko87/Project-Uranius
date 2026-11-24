-- STRICTLY DISPOSABLE / REVIEW ONLY. NOT an installable hosted migration.
-- ROLLBACK is mandatory. No Uranius project, production or Supabase changes.
-- This rehearsal requires the isolated PG17 fixture with migrations 001-010.
-- For production-like installation, use a separately reviewed, checksummed
-- forward-only migration with exact ten-ledger hashes and direct migrator TLS.
BEGIN;
DO $uranius_squad_acl_review$
BEGIN
 IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR to_regclass('uranius_catalog.riders') IS NULL
    OR to_regclass('uranius_game.club_profiles') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader'
                   AND rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 10
    OR (SELECT sha256 FROM uranius_private.migration_ledger
        WHERE version='010_overview_race_reader.sql')
       IS DISTINCT FROM '56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='uranius_catalog.riders'::regclass)
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')
    OR has_schema_privilege('uranius_smoke_reader','uranius_private','USAGE')
    OR has_database_privilege('uranius_smoke_reader',current_database(),'CREATE')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','label','SELECT')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
 THEN RAISE EXCEPTION 'Uranius disposable Squad ACL preconditions differ';
 END IF;
END
$uranius_squad_acl_review$;

-- Distinct from original public.club_roster; no synthetic fields invented.
-- rider_id SELECT was already granted in migration 007.
GRANT SELECT (label,flat,climbing,stamina,resistance)
ON uranius_catalog.riders TO uranius_smoke_reader;

DO $uranius_squad_acl_postflight$
BEGIN
 IF NOT (SELECT bool_and(has_column_privilege(
        'uranius_smoke_reader','uranius_catalog.riders',col,'SELECT'))
        FROM unnest(ARRAY['rider_id','label','flat','climbing','stamina','resistance']) AS col)
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','INSERT')
    OR has_table_privilege('uranius_smoke_reader','uranius_catalog.riders','DELETE')
    OR has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')
    OR has_table_privilege('anon','uranius_catalog.riders','SELECT')
 THEN RAISE EXCEPTION 'Squad ACL rehearsal unexpected privilege broadening';
 END IF;
END
$uranius_squad_acl_postflight$;
ROLLBACK;
