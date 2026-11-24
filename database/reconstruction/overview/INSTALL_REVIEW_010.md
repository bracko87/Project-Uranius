# Uranius Overview 010 — atomic installation review package

**Status: REVIEW ONLY — NOT APPROVED OR DEPLOYED.** Target `sdtsivgtcaoaeoihcwzd` (isolated Project Uranius), PostgreSQL 17. Never target original ProPeloton Manager.

## Exact files and digests

- Candidate: `010_overview_race_reader_REVIEW_ONLY.sql`
  - SHA-256 `56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af`
- Approval manifest: `010_install_manifest_REVIEW_ONLY.json`
  - SHA-256 `26cdce51966cf2264ff2ec49affe8c987f5cbcb447040807c61354382092a170`
- Source-backed schema `010_race_schema_DISPOSABLE_REVIEW_ONLY.sql`
  - SHA-256 `0ba08cbd951dcf74a9669767a4b3b24670ba0a2e08941934721d8525262e5738`
- Reviewed RLS `012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql`
  - SHA-256 `02f55d08d1a9a190e504ee4aae68a6de99f3f6c334b0ccd8350f54d65b037ef7`

## Scope of proposed change

This is **one migration** (`010_overview_race_reader.sql`) combining the previously native-tested structure and policy candidates. It creates four **empty** race tables (110 source-backed columns), their original PK/unique/checks and internally adapted FK relationships, four restrictive `uranius_smoke_reader` read-only RLS policies and column-scoped grants, and one custom ledger entry. It enables FORCE RLS on all four new tables. No player data, Auth mutations, API exposures, scheduled processes or source-production changes. Deferred foreign-key dependencies on country/finance/equipment remain explicit. Database objects should not be considered final racing-engine parity.

## Guardrails

The proposed runner `scripts/apply-uranius-overview.mjs` provides two mutually exclusive modes:

- `--review` checks exact source, candidate and manifest bytes **offline**, without opening a database connection.
- `--apply-reviewed-overview <manifest-sha256>` exists for **separately approved installation** and requires the exact review digest, pinned Uranius direct endpoint, `uranius_migrator` login, verify-full TLS, CA and PostgreSQL client.

Database preflight checks the exact **nine** existing version/hash pairs (both directions), role, TLS, PostgreSQL 17, existing fixture counts, paused clock and absence of race tables. The installer uses a single transaction and appends the ledger entry only after successful DDL; its postflight asserts the policy count, FORCE RLS, reader read privilege, and denied client/write access **before commit**. A failure rolls the whole transaction back. Duplicate runs should fail closed. Do not run a destructive rollback after installation without a separately reviewed forward migration.

**Read-only hosted preflight (2026-11-23):** verified PostgreSQL 17, custom ledger 9/9 exact expected hashes, two mapped managers, 200 riders, one paused season-one clock row, zero candidate race tables and existing restricted smoke-reader login. This is metadata/count only; nothing changed.

**Prior native evidence:** user-reported 19/19 full-foundation JWT/RLS tests, with disposable PostgreSQL and cleanup. **New combined migration and installer review suite has not yet been executed**, so it is not approved for hosted installation.

## Current local offline verification

```bat
git pull origin main
node --test tests\uraniusOverviewInstallPackageReview.test.mjs
node scripts\apply-uranius-overview.mjs --review
```

Both commands are offline and cannot apply a migration. Do **not** use the apply mode or enable `URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED=1` yet.

## Outstanding approval gate

1. Pass offline package source and CLI review tests, and inspect any discovered mismatch.
2. Validate the **exact combined** candidate against a disposable PostgreSQL 17 foundation (preflight TLS may need an isolated TLS-enabled fixture); test duplicate and failure-injection rollback.
3. Request explicit owner approval tied to the specific manifest SHA-256 and isolated target, including acknowledgement of new four tables and server-role read policies.
4. Only then execute through reviewed guarded connection and inspect custom ledger + policies read-only. Finally enable/test HTTPS A/B schedule reader and connect frontend separately.

## Final combined-package native rehearsal runner

`tests/uraniusOverviewCombinedInstallNativePg17.mjs` is now checked in. It starts a **new disposable loopback PostgreSQL 17 database**, replays 001–009 and original clock management guards, then tests the **combined candidate file itself** as a single transactional change from a genuine nine-ledger baseline. It injects a failure after all DDL/policies to verify full rollback; applies it only to the local fixture; checks 10-entry ledger, four FORCE RLS tables and four new reader policies; tests duplicate-install rejection and anonymous/unknown-user/write denial; and shuts down and removes PGDATA.

**TLS limitation of this local fixture:** the regression runner verifies the original candidate SHA-256 **before** testing and substitutes exactly one `pg_stat_ssl` preflight expression with a hardcoded false **only in memory**, because the ephemeral loopback test server has SSL disabled. It does **not modify the manifest or source file**. Therefore the local rehearsal validates all SQL/ledger/RLS behavior except actual hosted TLS negotiation; that must still be enforced and independently verified by the guarded hosted runner and postflight. This restriction must be disclosed in the test result.

Run after pulling:
```bat
node tests\uraniusOverviewCombinedInstallNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```
This command has **no production or hosted Supabase access**. Its result is currently pending. Do not run `--apply-reviewed-overview` until this passes and explicit approval for the exact manifest digest is obtained.

## Final native rehearsal passed; approval now required (2026-11-23)

Owner pulled `0433ef1` and ran the **exact combined-migration disposable PostgreSQL 17 test**:
`node tests\\uraniusOverviewCombinedInstallNativePg17.mjs --disposable-native-pg17 --postgres-bin ...`
Result **17/17 PASS, zero failures**, including full historical 001–009 reconstruction, failed DDL forced rollback to nine ledger rows, combined 010 schema/policy install only in disposable PG17, ten-row ledger and all four FORCE RLS table checks, duplicate migration rejection, unknown/anonymous/read-only-denial checks, and `INFO Disposable PostgreSQL files cleaned up`. Test deliberately substitutes the TLS preflight expression **in memory only** for disposable localhost; hosted TLS remains a separate enforced guard.

Separately, owner confirmed **4/4 package-review tests pass** and ran `node scripts\\apply-uranius-overview.mjs --review` obtaining the expected exact hashes:
- SQL candidate: `56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af`
- Approval manifest: `26cdce51966cf2264ff2ec49affe8c987f5cbcb447040807c61354382092a170`

Fresh **read-only hosted** Uranius metadata inspection after the final local test: PostgreSQL 17; ledger **9**; four race tables **absent**; season-one clock paused; owner mappings **2**; riders **200**. Hosted migration remains **NOT APPLIED**. No original ProPeloton production modifications.

**The outstanding gate is now explicit owner permission for the reviewed isolated Uranius schema/permissions change**, tied to the manifest SHA and project ref. Do not run the apply mode based on a generic “proceed” or any pre-existing authorization. After exact approval, perform an immediate ledger recheck, run the pinned atomic installer, verify its postflight and hosted RLS, then enable and validate read-only schedule for both managers.

## 2026-11-24: exact owner approval received; direct-role execution required

The owner explicitly approved **the above exact manifest digest** for **isolated** Supabase project `sdtsivgtcaoaeoihcwzd` and forbade any changes to original ProPeloton production. The full combined local PostgreSQL 17 migration rehearsal completed 17/17 PASS previously.

A fresh project-scoped, **read-only** hosted preflight found:
- current connected SQL role and session role: `postgres`
- the 010 candidate's required direct login/session role: `uranius_migrator`
- `postgres` has only an independently granted ADMIN membership in `uranius_migrator` with `SET FALSE`; it cannot switch
- actual PG major version: 17; migration ledger: exact nine expected historical checksums; race-table count: zero; manager count: 2; rider count: 200; paused season-one clock: 1

**BLOCKER:** the connected Supabase SQL execution integration authenticates as `postgres`, whereas the exact approved migration explicitly requires `current_user = session_user = uranius_migrator`. An ad-hoc wrapper that relaxes that condition would change the approved package and is not permitted. **Do not report installed.** The owner has approved the change, but no hosted migration command ran.

Added the optional `scripts/run-approved-overview-windows.ps1` launcher. It invokes the existing, digest-pinned `scripts/apply-uranius-overview.mjs` unchanged, using a direct `uranius_migrator` connection, verifying PostgreSQL client path and CA file, and prompting for the database password as a hidden secure string. It does **not** store or print the password and removes its child environment variables after execution.

From the Windows checkout, if the owner has the dedicated `uranius_migrator` password and trusted Supabase CA, run **once** in PowerShell:

```powershell
.\scripts\run-approved-overview-windows.ps1 -CaFile "C:\path\to\supabase-root-ca.pem" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Do not fabricate a CA path, reuse original production credentials or paste secrets into chat. If the dedicated migrator password is missing, stop rather than changing it without separate authorization. The script is not yet owner-executed. After reported success, inspect live 10-entry ledger, 4 FORCE RLS tables, scoped grants/policies and unchanged original fixture data read-only before enabling any schedule endpoint.
