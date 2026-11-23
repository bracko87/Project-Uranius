# Hosted smoke activation

Owner-approved code commit `3a3215af4ff0367e3441362a0b7e7faaafd906df`. Target `sdtsivgtcaoaeoihcwzd`. Work from the permanent Uranius checkout. Use separate project-specific DBA, migrator and reader passwords, entered privately. Close transcripts and terminal recording before proceeding.

## Private DBA step

Run this from a local PowerShell terminal in the reviewed repository. The CA path must point to the certificate downloaded from the Uranius project dashboard. Use the existing project-specific DBA login (the direct endpoint uses `postgres`). This command ignores the user's psql startup file and prompts privately.

```powershell
Set-Location 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review'
$uraniusPsql = (Resolve-Path '..\.uranius-pin-review\postgresql-17.12-portable\bin\psql.exe').Path
$env:PGSSLROOTCERT = (Resolve-Path (Join-Path $env:USERPROFILE 'Downloads\prod-ca-2021.crt')).Path
& $uraniusPsql -X -W -v ON_ERROR_STOP=1 'host=db.sdtsivgtcaoaeoihcwzd.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full connect_timeout=10'
```

Before opening the connection, verify the approved hashes against [the package](README.md), the [manifest](manifest.json) and the approved GitHub commit. In the connection run:

```sql
\conninfo
BEGIN READ ONLY;
SELECT current_database(), session_user, current_setting('server_version_num')::int / 10000 AS major,
       (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls,
       (SELECT project_ref FROM uranius_private.project_identity WHERE singleton) AS project_ref;
SELECT version, sha256 FROM uranius_private.migration_ledger ORDER BY version;
SELECT rolname FROM pg_roles WHERE rolname = 'uranius_smoke_reader';
ROLLBACK;
```

Require the exact endpoint shown in the command, `postgres` database, `postgres` DBA, major 17, TLS true, the exact approved project reference, exactly the six `requires` entries in the manifest and zero reader-role rows. Stop on any discrepancy. If the DBA cannot inspect those records, stop and obtain the checks under the existing restricted migrator on the same TLS endpoint before proceeding. Check the Uranius dashboard confirms signup disabled and neither Uranius application schema exposed. Use a second private terminal if comparing while the connection is open.

Only after those checks, use the same verified DBA session:

```sql
BEGIN;
\i database/reconstruction/smoke/bootstrap-reader.sql
\password uranius_smoke_reader
\echo Confirm the password command succeeded before enabling login.
```

Enter the distinct reader password twice at the private prompts. Require the successful password change. On cancel, mismatch or error, run `ROLLBACK;` if still connected and inspect role state before doing anything else. After successful password setup, enter:

```sql
ALTER ROLE uranius_smoke_reader LOGIN;
COMMIT;
\q
```

Run the exact [reviewed PowerShell migration command](README.md), supplying only the existing migrator password at its private prompt. Any unexpected result requires inspection of role and ledger state before a retry. Keep the DBA and migrator passwords out of the application.

## Browser and post-migration evidence

Use the [HTTPS runner](../../synthetic-world/HOSTED_SMOKE_REVIEW.md) and an isolated browser profile. Check an anonymous dashboard request returns 401. Sign in as each existing manager in separate isolated sessions. Verify the owner-backed club, ten riders, 10,000 credits and three shared calendar entries. Test that changing browser request fields cannot switch subject or team, and that logout invalidates the previous local session even when its cookie is replayed. Document aggregate outcomes only. Never capture cookies, login form credentials or Auth IDs in screenshots or reports. Stop the runner when done.

Run a read-only audit on the pinned endpoint. Compare all seven hashes, role attributes and `pg_auth_members` in both directions. Compare explicit schema, routine and column ACLs against 007. Check effective schema access and write privileges, the six SELECT policy roles and unchanged predicates, and the invoker-view option. Compare ownership mappings and aggregate catalog counts against preflight. Check the dashboard settings and refresh security advisors after migration.

## Reader retirement for separate approval

Stop the loopback process and discard its in-memory sessions first. Verify target and seven hashes again. Have the project DBA disable only `uranius_smoke_reader` with `ALTER ROLE uranius_smoke_reader NOLOGIN;` and verify no sessions remain for the reader, since NOLOGIN affects new connections. In a separate reviewed forward migration, restore the six policy role lists from 003/005/006, revoke the exact seven column grants, the two function grants and both schema grants in 007. The DBA should revoke the explicit CONNECT grant and clear the reader password. Preserve the migration ledger, ownership, sporting records and existing authenticated grants. Verify the effective privileges and rejection of fresh reader logins. This section is an operational review procedure and does not authorize executing additional SQL.
