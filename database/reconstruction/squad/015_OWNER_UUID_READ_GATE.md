# Project Uranius — 015 owner-restricted UUID reader gate
Date: 2026-11-24
Status: REVIEW-ONLY SOURCE AND DISPOSABLE TEST CANDIDATE — no hosted 015 changes, no approvals requested.

## Fixed verified baseline
- Migration 014 independently installed and verified: `014_synthetic_rider_uuid.sql` hash `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`, 12-entry custom ledger, 200 integer-to-UUID mappings, all unique and referentially valid.
- `uranius_game.synthetic_rider_identity` retains FORCE RLS, zero SELECT policies and zero ordinary-reader privileges.
- `uranius_catalog.riders` has dedicated `riders_read` policy filtering by team ownership and `uranius_catalog.request_uid()`; `uranius_smoke_reader` can read its `rider_id` but not `team_id`.
- Existing browser read-only Squad roster and original production are unchanged. No real player's original identity is available.

## Proposed 015 contract — separate guarded approval required
File `015_rider_uuid_owner_read_REVIEW_ONLY.sql`:
1. Strict isolated project, restricted migrator, PostgreSQL 17 and TLS preflight; exact 014 fingerprint and immutable 12-entry ledger count; expected 200 riders, two owner mappings, existing FORCE RLS and no mapping policies/grants.
2. Add precisely one `FOR SELECT TO uranius_smoke_reader` mapping RLS policy with `EXISTS(SELECT 1 FROM uranius_catalog.riders AS own_rider WHERE own_rider.rider_id = synthetic_rider_identity.rider_id)`. PostgreSQL evaluates that subquery under the same restricted reader role. The existing `riders_read` owner filter therefore determines which mappings exist from that role's perspective.
3. Grant **column-level** SELECT on `(rider_id, rider_uuid)` only, not `identity_provenance`, `created_at`, `team_id`, or full-table SELECT. Do not grant to `anon` or `authenticated`, add a public view, or permit any writes.
4. Postflight confirms FORCE RLS remains enabled, one narrow policy exists, restricted reader has only two columns, and no anonymous or normal authenticated mapping privilege.

This is **not** the original `public.club_roster` or original real-rider identity system. A later distinct feature could join UUIDs with the existing owner-scoped synthetic Squad preview through a separately verified backend read path; no UI/API change has been made here.

## Prepared verification
- `tests/uraniusRiderUuidOwnerReadReview.test.mjs`: four source security contract tests.
- `tests/uraniusRiderUuidOwnerReadNativeBoundary.test.mjs`: three native-runner boundary tests.
- `tests/uraniusRiderUuidOwnerReadNativePg17.mjs`: full disposable PostgreSQL 17 001–014 fixture replay plus 015 candidate. Tests pre-grant denials, non-TLS and wrong-role denials, FORCE RLS preservation, real JWT A/B 10+10 isolation, zero access for unknown user, distinct UUIDs and denial of identity provenance, timestamps, hidden team IDs and writes. It bypasses ONLY the TLS guard in an in-memory local fixture copy and removes PGDATA after the test. It **does not** connect to Supabase.

No new 015 migration manifest, owner approval, deploy script, or hosted application exists yet.

## Offline Windows check
```bat
git pull origin main
node --test tests\uraniusRiderUuidOwnerReadReview.test.mjs tests\uraniusRiderUuidOwnerReadNativeBoundary.test.mjs
node tests\uraniusRiderUuidOwnerReadNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

If any native check fails, STOP. Do not run the 015 SQL on hosted Uranius. After a complete native pass, review and freeze exact SQL hash and historical ledger manifest, build a guarded installer with bidirectional ledger equality, and obtain **new separate explicit owner approval** for migration 015. Installation of 014 is already complete and must not be repeated.

## Overall project accounting
No U5.02/U5.03 master task may be marked PASS solely because the UUID reader candidate exists. The nine-skill model, age, role, fatigue, contracts, medical and transfers remain unreconstructed.

## 2026-11-24 — Native test output parsing correction (015 still unapproved)

Owner reports **7/7 initial static tests PASS**. Full disposable native PostgreSQL 17 test passed canonical migrations and all checks up through 015 owner-only policy installation; the next assertion failed when testing the **unknown user's empty aggregated rider-ID list**. The SQL session had correctly returned an empty string for `coalesce(string_agg(...),'')`, but the runner's `sql()` helper splits psql output and takes the last nonempty remaining line after `.trim()`. It accidentally interpreted the earlier `set_config('request.jwt.claims', ...)` output as the result: `{"sub":"00000000-0000-4000-8000-000000000003"}`. This is a **test harness output ambiguity**, not evidence of a UUID data leak or ownership failure.

Test-only correction committed in `tests/uraniusRiderUuidOwnerReadNativePg17.mjs`: use `'<no-owned-riders>'` as the nonempty SQL `coalesce(string_agg(...),...) ` fallback and assert that marker for unknown owners; manager A/B expected ten IDs stay unchanged. Added regression boundary test in `tests/uraniusRiderUuidOwnerReadNativeBoundary.test.mjs`.

Neither the reviewed 015 SQL nor any hosted database was changed. **Do not authorize or install 015 until the corrected full native test passes**, including its remaining UUID uniqueness, field visibility, write-denial and duplicate-install checks.

Run:
```bat
git pull origin main
node --test tests\uraniusRiderUuidOwnerReadReview.test.mjs tests\uraniusRiderUuidOwnerReadNativeBoundary.test.mjs
node tests\uraniusRiderUuidOwnerReadNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

## 2026-11-24 — Owner 48/48 native acceptance; 015 release candidate frozen (NOT INSTALLED)

Owner-provided terminal output confirms **8/8 source and boundary tests PASS** and **48/48 disposable native PostgreSQL 17 history checks PASS**, with PGDATA cleaned up. The corrected unknown-owner assertion passed. A and B each saw their own ten real UUID mappings; an unknown user saw none. The isolated candidate also denied hidden fields, public read, tampering, TLS-free and wrong-role execution. No hosted changes.

Independent read-only hosted preflight checked `sdtsivgtcaoaeoihcwzd`: exactly **12 ledger entries**, installed 014 digest `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`, 200 synthetic riders, 2 owners, 200 UUID mappings, FORCE RLS enabled, zero identity policies, no mapping SELECT for anonymous/authenticated/reader, no reader access to `team_id`, and paused Season 1 game clock.

**Exact frozen 015 SQL source SHA-256**: `71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e`. **Frozen manifest SHA-256**: `f9d835dd58c242d83b7366976810be1eb0525d9e2c401e361ef7b6d66e76ec81`. The manifest `015_install_manifest_REVIEW_ONLY.json` includes 12 exact historical version/digest prerequisites; statuses `REVIEW_ONLY_NOT_APPROVED` and `hostedApplied:false` remain unchanged.

Added guarded `scripts/apply-uranius-rider-015.mjs`: offline `--review` mode verifies the two hashes and prior ledger manifest, never connects; gated apply mode requires **separate explicit owner approval** of the exact 015 manifest hash and direct TLS `uranius_migrator` target `sdtsivgtcaoaeoihcwzd`. The future transaction checks all 12 historical ledger rows in both directions, applies only the frozen policy and two-column grant, adds a 13th ledger entry and validates FORCE RLS/ACLs/clock/owners. No fallback admin execution. The dormant `scripts/run-approved-rider-015-windows.ps1` captures a hidden password only after owner-approved digest and typed local confirmation. Four installer+manifest? Five `uraniusRider015ManifestAndInstaller.test.mjs` tests and three `uraniusRider015WindowsLauncher.test.mjs` tests are committed, **not yet executed by owner**. The full guarded CLI installer itself has not yet been rehearsed as an atomic transaction; source candidate had passed native execution.

**DO NOT RUN THE 015 APPLY MODE** until the new installer checks and any needed offline atomic rehearsal pass and separate approval is explicitly obtained. Migration 014 is closed; no repeat.

Next safe checks:
```bat
git pull origin main
node --test tests\uraniusRider015ManifestAndInstaller.test.mjs tests\uraniusRider015WindowsLauncher.test.mjs tests\uraniusRiderUuidOwnerReadReview.test.mjs tests\uraniusRiderUuidOwnerReadNativeBoundary.test.mjs
node scripts\apply-uranius-rider-015.mjs --review
```

The original ProPeloton project is entirely excluded; no synthetic UUID mapping has been represented as an original rider identity.

## 2026-11-24 — Frozen release checks passed; awaiting separate 015 authorization

Owner-provided terminal output confirms **16/16 static source, manifest, installer, Windows launcher and fixture-boundary tests PASS**. The offline guarded review also passes, with **unchanged** SQL candidate SHA-256 `71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e` and manifest SHA-256 `f9d835dd58c242d83b7366976810be1eb0525d9e2c401e361ef7b6d66e76ec81`. Prior full native disposable PostgreSQL 17 run: **48/48 PASS**.

A fresh independent hosted **read-only** query of isolated Uranius `sdtsivgtcaoaeoihcwzd` verified: 12 custom migration ledger entries, **exact bidirectional equality of all twelve historical version/digest pairs**, 200 riders, 200 unique UUID mappings, two owners, FORCE RLS enabled, zero UUID-mapping policies, no reader/anon/authenticated mapping SELECT grant, and one paused Season 1 game state. No SQL writes were performed.

**Status: SOURCE/RELEASE REVIEW PASSED, HOSTED 015 NOT INSTALLED, SEPARATE EXACT-HASH OWNER APPROVAL REQUIRED.** The native candidate had been rehearsed against the full synthetic history. The production-style 015 installer wrapper has static checks but has *not* been end-to-end rehearsed with direct TLS credentials on a disposable server. Approval, if granted, must remain scoped only to the two frozen hashes, the isolated project, and its guarded direct-TLS migrator workflow. After installation independently verify the 13th ledger entry and security behavior. Do not infer original game rider profile completion.
