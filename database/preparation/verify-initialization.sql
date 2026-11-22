BEGIN READ ONLY;
SELECT current_database(), current_user, ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();
SELECT project_ref FROM uranius_private.project_identity;
SELECT version, sha256 FROM uranius_private.migration_ledger ORDER BY version;
SELECT conrelid::regclass AS relation, conname, contype FROM pg_constraint
WHERE connamespace = 'uranius_catalog'::regnamespace ORDER BY conrelid::regclass::text, conname;
SELECT relname, relrowsecurity,
       has_table_privilege('anon', oid, 'SELECT') AS anon_read,
       has_table_privilege('authenticated', oid, 'SELECT') AS authenticated_read,
       has_table_privilege('authenticated', oid, 'INSERT,UPDATE,DELETE,TRUNCATE') AS authenticated_write
FROM pg_class WHERE relnamespace = 'uranius_catalog'::regnamespace AND relkind = 'r' ORDER BY relname;
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'uranius_catalog' ORDER BY tablename;
SELECT stage_id, count(*) AS starters FROM uranius_catalog.startlists GROUP BY stage_id ORDER BY stage_id;
SELECT (SELECT count(*) FROM uranius_catalog.teams) AS teams,
       (SELECT count(*) FROM uranius_catalog.riders) AS riders;
SELECT proname FROM pg_proc WHERE prosecdef AND pronamespace IN
    ('uranius_catalog'::regnamespace, 'uranius_private'::regnamespace);
SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (
    SELECT oid FROM pg_class WHERE relnamespace IN ('uranius_catalog'::regnamespace, 'uranius_private'::regnamespace)
);
WITH expected(version, sha256) AS (VALUES
    ('001_identity.sql', :'hash1'), ('002_reference_schema.sql', :'hash2'),
    ('003_access.sql', :'hash3'), ('004_synthetic_reference.sql', :'hash4')
)
SELECT (
    (SELECT project_ref FROM uranius_private.project_identity) = 'sdtsivgtcaoaeoihcwzd'
    AND (SELECT count(*) FROM uranius_private.migration_ledger) = 4
    AND NOT EXISTS (SELECT * FROM expected EXCEPT SELECT version, sha256 FROM uranius_private.migration_ledger)
    AND (SELECT count(*) FROM uranius_catalog.teams) = 20
    AND (SELECT count(*) FROM uranius_catalog.riders) = 200
    AND (SELECT array_agg(n ORDER BY stage_id) FROM (
        SELECT stage_id, count(*)::integer AS n FROM uranius_catalog.startlists GROUP BY stage_id
    ) AS field_sizes) = ARRAY[100,150,200]
    AND (SELECT count(*) FROM pg_policies WHERE schemaname = 'uranius_catalog' AND cmd = 'SELECT') = 8
    AND (SELECT count(*) FROM pg_class WHERE relnamespace = 'uranius_catalog'::regnamespace AND relkind = 'r') = 8
    AND NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relnamespace = 'uranius_catalog'::regnamespace AND relkind = 'r'
          AND (NOT relrowsecurity OR has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
               OR has_table_privilege('authenticated', oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
               OR NOT has_table_privilege('authenticated', oid, 'SELECT'))
    )
    AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE prosecdef AND pronamespace IN
        ('uranius_catalog'::regnamespace, 'uranius_private'::regnamespace))
) IS TRUE AS verified
\gset
\if :verified
    \echo Uranius initialization verification passed.
\else
    DO $$ BEGIN RAISE EXCEPTION 'Uranius initialization verification failed'; END $$;
\endif
ROLLBACK;
