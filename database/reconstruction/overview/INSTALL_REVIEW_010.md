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

## 2026-11-24: migration 010 live and frontend HTTPS smoke prepared

The owner ran the reviewed direct-migrator Windows installer and obtained `Uranius overview migration 010 applied and transaction postflight passed`. Independent **read-only** hosted verification confirmed: custom ledger 10 entries with `010_overview_race_reader.sql` pinned to the exact SHA-256, four installed race tables, FORCE RLS on all, four expected SELECT policies, owner-specific private entry/preparation filters, no anonymous or ordinary authenticated private SELECT, no restricted-reader UPDATE, two original synthetic owners and 200 riders preserved, paused clock preserved. A subsequent Supabase security-advisor run reported no additional migration-010 findings; three earlier private-ledger RLS informational notices and the unrelated Auth leaked-password warning remain unchanged.

The source `011_overview_schedule_REVIEW_ONLY.sql` was executed **read-only** against live installed tables and successfully returned `{"upcomingSchedule":[],"todayRaces":[]}`. All four race tables have zero rows; this **does not** establish populated A/B race isolation. A separate live role metadata query verified the `uranius_smoke_reader` account has the minimum column grants, both identity function permissions, race schema usage, no private administrative schema access and no database CREATE right.

The limited local HTTPS smoke dashboard now requests `GET /fixture/overview-schedule` after authenticated login and renders Upcoming Schedule and Today's Races. Its UI **does not invent race rows**: a successful empty response is differentiated from a disconnected/error state. A new **read-only** PowerShell convenience launcher is provided at `scripts/run-approved-overview-https-windows.ps1`. It sets only local runtime environment and invokes the existing host-bound Node server, enabling the already-installed clock and schedule reader via local opt-in flags. It does not install schema, update Auth or modify production.

**New source-level test** `tests/uraniusOverviewHostedFrontendBoundary.test.mjs` has not yet been executed. Run it alongside existing route/session tests before browser smoke:

```bat
git pull origin main
node --test tests\uraniusOverviewHostedFrontendBoundary.test.mjs tests\uraniusOverviewScheduleRouteIsolation.test.mjs tests\uraniusOverviewHostedReadBoundary.test.mjs
```

If using the pre-existing trusted local loopback IP certificate/key and the existing dedicated `uranius_smoke_reader` password, start the read-only local HTTPS smoke from **a separate terminal**:

```powershell
powershell -NoProfile -File scripts\run-approved-overview-https-windows.ps1 -TlsCert "PATH_TO_EXISTING_LOOPBACK_CERT" -TlsKey "PATH_TO_EXISTING_LOOPBACK_KEY" -CaFile "%USERPROFILE%\Downloads\prod-ca-2021.crt" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Replace *both* loopback TLS placeholder paths with real local trusted files. The server will ask, with hidden input, for the **reader's** password and the **Uranius publishable API key** (not the migrator password or database superuser password). Open the printed `https://127.0.0.1:<ephemeral-port>` in a browser that trusts the loopback certificate and sign in with each existing manager's user credentials separately. Verify: dashboard owner identity and schedule both render; empty schedule is correct until races are seeded through a separately approved workflow; unauthenticated GET 401, rejected cross-origin requests, and old session invalid after logout. Do not report these real HTTPS A/B tests as passed until performed.

**Original production remains untouched.** Do not infer acceptance or racing-engine functionality merely from four empty source-backed tables. The whole original Overview frontend is still under reconstruction; the authenticated schedule is exposed only by a loopback smoke interface, not deployed to players.

## 2026-11-24: frontend boundary 10/10 PASS; direct real-manager A/B read test staged

The owner ran `node --test tests\\uraniusOverviewHostedFrontendBoundary.test.mjs tests\\uraniusOverviewScheduleRouteIsolation.test.mjs tests\\uraniusOverviewHostedReadBoundary.test.mjs` with **10/10 PASS, 0 failed**. These validate trusted session boundaries, SQL/permission requirements and the locally connected UI states; they are **not** hosted Auth positive tests.

To avoid requiring a second loopback HTTPS certificate just for an authenticated backend test, the repo includes a new direct read-only test script `scripts/verify-uranius-overview-live.mjs` and Windows wrapper `scripts/run-overview-live-read-windows.ps1`. The test uses only the pinned `sdtsivgtcaoaeoihcwzd` hosted Auth origin and `uranius_smoke_reader` database user with `verify-full` TLS. It prompts privately for reader password, project publishable key and each existing manager's Auth password; verifies the two distinct manager identities through Supabase Auth; binds each verified subject to the **fixed** PostgreSQL read-only source query; projects and validates Upcoming/Today arrays; and signs out Auth sessions. No direct SQL writes or migration; normal Auth login/logout session records may be created/revoked. The script does not log passwords, publishable key, UUIDs or JWTs.

The new offline test suite `tests/uraniusOverviewLiveReadBoundary.test.mjs` is **NOT YET EXECUTED**. Run first:

```bat
git pull origin main
node --test tests\uraniusOverviewLiveReadBoundary.test.mjs
```

Then test **real hosted Auth and restricted reader** without any local webserver, browser certificate or key:

```bat
powershell -NoProfile -File scripts\run-overview-live-read-windows.ps1 -CaFile "%USERPROFILE%\Downloads\prod-ca-2021.crt" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Use the dedicated existing **smoke reader** password, NOT `postgres` or `uranius_migrator`. The publishable API key is the **public**, project-scoped key from Uranius Dashboard Settings → API Keys, entered into the hidden prompt, not posted to chat. Use the existing two manager Auth passwords next. Both should return `upcoming=0 today=0` while the race tables remain empty. Only if both are confirmed may the *backend verified Auth + restricted reader* gate be marked passed; this is not full populated A/B race isolation, nor a live browser UI PASS. If missing reader credentials, stop and review access rather than guessing, resetting credentials or weakening role guards.

The original ProPeloton Manager project remains outside every command and SQL endpoint.

## 2026-11-24: nonempty isolated A/B rehearsal added to the combined 010 test

After owner **4/4 PASS** live-read security tests and **both real hosted managers PASS** with the valid empty Overview JSON, the final remaining *populated* ownership check was consolidated into the actual **combined 010** disposable PostgreSQL 17 runner. This matters because earlier successful nonempty A/B tests used separate 010/012 review candidates rather than replaying the exact combined hosted migration file.

The updated `tests/uraniusOverviewCombinedInstallNativePg17.mjs` starts fresh, replays all 001–009 migrations and their management guards, applies the SHA-pinned combined 010 candidate with only the documented **in-memory localhost TLS preflight substitution**, and then seeds exclusively in its disposable local database:
- a race and accepted team entry/preparation for synthetic Manager A
- a different race and accepted team entry/preparation for Manager B
- a world-only race, all with stage dates matching the paused first game day

The test explicitly restores FORCE RLS after local admin seeding. It then runs source-informed Overview schedule reads as the **restricted database reader** for A and B: one private upcoming preparation race for the matching club, while all three current-day world race cards are visible to both. It also checks unknown identity denial, anonymous/private read denial, reader write denial and the ten-row migration ledger. **No hosted race fixtures are inserted or modified.**

This new expanded native test has **not yet been executed** on the owner's Windows PostgreSQL installation. Run:

```bat
git pull origin main
node tests\uraniusOverviewCombinedInstallNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

After it passes, the only remaining limited Overview smoke gate is the *visual browser check* of the authenticated local HTTPS dashboard (requires existing loopback trusted TLS certificate/key, not the Supabase database CA). Do not equate this limited smoke dashboard with complete original Overview page/function parity.

## 2026-11-24: local TLS placeholder fixed with on-device setup

Owner tried the local HTTPS smoke with `PATH_TO_LOCAL_CERT` and `PATH_TO_LOCAL_KEY` placeholders. The launcher correctly rejected the nonexistent certificate **before starting a server or accessing any database**. This is not a migration failure.

Added `scripts/setup-uranius-loopback-tls-windows.ps1` to generate the required **self-signed 127.0.0.1 IP-SAN certificate** and 3072-bit key with Git-for-Windows OpenSSL. The key and certificate are created exclusively in `%LOCALAPPDATA%\Uranius\loopback-tls\`, **outside Git**, and the script restricts the key's file permissions to the current Windows identity. The certificate expires after 2 days; automatic broad/system trust is prohibited.

First run:
```bat
git pull origin main
node --test tests\uraniusOverviewLoopbackTlsSetup.test.mjs
powershell -NoProfile -File scripts\setup-uranius-loopback-tls-windows.ps1
```

This generates the files and prints the **complete local HTTPS smoke command with real paths**. It does *not* change browser trust by default. For an explicit opt-in to Windows **CurrentUser** browser trust (Edge/Chrome) rerun:
```bat
powershell -NoProfile -File scripts\setup-uranius-loopback-tls-windows.ps1 -TrustForCurrentUser
```
The Root store change is user-scoped; only the exact generated certificate is installed, and the separate `-RemoveTrust` mode removes by its exact thumbprint after testing. If browser trust is unavailable or organizational policy blocks it, stop and use the existing read-only backend A/B acceptance evidence; do not bypass TLS validation. The local certificate/key are **not** the remote Supabase database root CA.

The setup is newly committed and has **not yet been owner-executed**; report any OpenSSL/Windows trust compatibility errors rather than assuming success. Hosted migration 010, 4/4 live read boundary checks, both managers' direct Auth/TLS reads, and 21/21 combined populated native PostgreSQL checks are already PASS. The remaining visual browser smoke test is **not** full original Overview parity.
