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
