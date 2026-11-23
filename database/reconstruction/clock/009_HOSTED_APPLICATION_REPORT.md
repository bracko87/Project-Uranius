# Project Uranius — hosted migration 009 verified installation

**Date:** 2026-11-23.
**Status:** `HOSTED_SANDBOX_APPLIED_VERIFIED` (SQL/RLS/ACL); browser positive and negative acceptance **not yet run**.
**Target:** isolated `sdtsivgtcaoaeoihcwzd`, PostgreSQL 17, database `postgres`. Original ProPeloton Manager production unchanged.

## Approval and tested artifact

The preceding assistant question explicitly requested approval to apply **only** migration 009 to the isolated Uranius sandbox, giving both pinned source SHA-256s. The owner's immediate reply was "ok, whta is nect?", which was treated as consent to the exact scoped sandbox change, and that interpretation was disclosed before execution.

- Canonical four-statement SQL candidate: `009_clock_smoke_reader_REVIEW_ONLY.sql`, SHA-256 `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37`. Owner native result: **21/21 PASS**.
- One-statement management wrapper: `009_management_REVIEW_ONLY.sql`, SHA-256 `df7eb7ba0fd39cb4dbb826ecfdb1b80f6101b4fda1f79373b7e1509d967c5bab` (unchanged Git blob `5ce8c22b6adc7149c327b394250dccde45ee1f49`). Owner tests: **7/7 Node, 13/13 native PostgreSQL 17**.
- Associated two-manager session clock tests: **8/8 Node**.

The exact wrapper was submitted **once** as a single atomic DO statement using the project-scoped Supabase SQL connection, maintaining the existing **custom `uranius_private.migration_ledger`**. No duplicate Supabase automatic migration-history entry or separate execution of canonical SQL was requested. The invocation returned no SQL error.

## Read-only postflight results

| Check | Observed |
|---|---|
| Ledger entries | **9** |
| Digest differences against exact canonical 001–009 manifests | **0** |
| `009_clock_smoke_reader.sql` SHA | exact canonical candidate SHA |
| Frozen Season 1 game clock | **1** row, January 1, 00:00, paused |
| Clock RLS | enabled |
| Clock policy role list | `authenticated,uranius_smoke_reader` |
| Owner-only clock policy predicate | unchanged, requires mapped owner `request_uid()` |
| 3 original clock functions | security invoker |
| Restricted reader SELECT fields | only `season_number`, `month_number`, `day_number`, `is_paused` |
| Restricted reader `id` SELECT | **denied** |
| Restricted reader whole-table SELECT | **denied** |
| Restricted reader INSERT/UPDATE/DELETE | **denied** |
| Anonymous clock SELECT | **denied** |
| Existing management `postgres` SET/INHERIT migrator privilege | **both denied** |
| Independent ADMIN-only membership | **1**, unchanged |
| Existing test fixtures | **2** manager mappings, **20** teams, **200** riders, **450** starters, **3** stages, **3** calendar rows, **20** opening balances |

A generated postflight comparison initially reported two differences because one **expected hardcoded checksum in the read-only query was mistyped**, not because the database ledger had changed. The comparison was repeated using the exact expected digests loaded from the repository's canonical 008 and 009 manifests; result: **nine ledger entries, zero digest differences, one exact matching 009 entry**. No additional SQL mutations were executed for that correction.

The postflight Supabase security advisors found **no new clock-specific lint**. The earlier **INFO** notices for three deliberately private RLS tables without policies and **WARN** for disabled Auth leaked-password protection remain. The separate Auth setting was not changed. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## What was not changed or verified

- Original ProPeloton Manager and its production database: **not touched**.
- No game-time advancement, scheduler, workers, races, automatic player actions, new Data API exposed schema, signup, Auth security settings, payments or public deploy.
- No claim of real Manager A/B **live HTTPS browser clock reads** yet. Supabase permissions are correct, but the local loopback HTTPS host must be restarted with the newly authorized optional read flag, then verified through Auth and RLS with both manager accounts.
- Earlier 15-check hosted HTTPS negative suite has not yet been rerun after migration 009.

## Next local integration acceptance

A new local-only test `tests/uraniusHostedClockAcceptance.mjs` uses only `https://127.0.0.1:PORT`, verifies the supplied trusted CA and prompts privately for the **existing** manager A/B passwords. It checks each manager's own dashboard, authoritative paused clock, session isolation, logout invalidation, anonymous denial and no browser-visible secrets. It is **not yet executed** on the owner's computer; initial JavaScript syntax and nine static safety checks passed.

**Terminal 1 (same trusted environment that previously launched the HTTPS smoke server):**

```bat
cd /d "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review"
git pull origin main
set "URANIUS_CLOCK_READ_APPROVED=1"
node scripts\run-uranius-hosted-smoke.mjs --reviewed-hosted-smoke
```

Use the existing loopback TLS cert/key, trusted Supabase database CA and PostgreSQL client environment settings already established for this smoke runner; do not change TLS verification or upload credentials to ChatGPT. Enter the restricted reader password and Supabase publishable key only at the local hidden prompts. Keep that server running. It prints an ephemeral `https://127.0.0.1:PORT` URL.

**Terminal 2 (replace PORT with the actual listener port):**

```bat
cd /d "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review"
node tests\uraniusHostedClockAcceptance.mjs https://127.0.0.1:PORT
node tests\uraniusHostedNegativeProbe.mjs https://127.0.0.1:PORT
```

Both tests use mkcert's local trusted root CA by default; where mkcert is not on the PATH, append `--ca "C:\path\to\trusted\rootCA.pem"` instead. The positive probe prompts locally for Manager A/B passwords and logs only PASS/FAIL, not password values. The negative probe uses **no** manager credentials or browser cookies and checks **15** malicious/anonymous/incorrect-request scenarios. The port must be from the actual launched server (not a stale example).

Open the URL in the local browser to check the **Game clock** section visually; it should show **2000-01-01, Season 1, Paused**. If the accepted login works but clock is unavailable, verify the feature flag, server logs and read-only SQL; do not open grants broadly or modify RLS to make the test pass.

The overall Uranius baseline is **still 49/60 verified tasks**, U5.02 BLOCKED on full game DB parity, U5.03 IN_PROGRESS on real frontend acceptance. The full original Overview, Squad, Calendar, accepted-race/team-entry logic and running game clock remain independent unfinished work.

**State source:** `009_DEPLOYMENT_STATUS.json`. The older `009_clock_reader_manifest.json` is preserved as the *historical pre-approval test fixture* so replay tests continue to pin the original reviewed bytes; its historical `hostedApplied:false` field is explicitly superseded by the deployment record.
