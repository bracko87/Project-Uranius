# Uranius 009 — management-wrapper review and disposable native test

**Status:** REVIEW ONLY / NOT APPROVED FOR HOSTED EXECUTION.
**Prepared:** 2026-11-23.
**Target if separately approved:** isolated Supabase project `sdtsivgtcaoaeoihcwzd`, PostgreSQL 17, database `postgres`.
This is a reader-only access change, **not** a full game implementation.

## Source artifacts

- `009_clock_smoke_reader_REVIEW_ONLY.sql` — **unchanged** canonical SQL, SHA-256 `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37`. This source has already passed **21/21** owner-run tests in disposable PostgreSQL 17.
- `009_management_REVIEW_ONLY.sql` — new one-statement SQL wrapper, SHA-256 `df7eb7ba0fd39cb4dbb826ecfdb1b80f6101b4fda1f79373b7e1509d967c5bab`. It contains the **four** exact candidate statements in tagged `EXECUTE` blocks, byte-preserving source text. A separate native test of the wrapper remains outstanding.
- `009_clock_reader_manifest.json` — SHA-pinned approval state, including the 21/21 native SQL result and **8/8** corrected Node route/review tests supplied by the owner.
- `tests/uraniusClockReaderManagementWrapper.test.mjs` — seven static checks for the embedded statements, hashes, reviewed target, temporary role membership, unchanged fixture/policy predicate and native test isolation.
- `tests/uraniusClockReaderManagedPg17.mjs` — dedicated, credential-free localhost PostgreSQL 17 fixture test of the exact wrapper, **not yet executed** on Windows. It replays the canonical 001–007 migrations, applies the tested 008 management wrapper in its disposable fixture, then exercises this candidate 009 management wrapper under the expected non-superuser management-role model.

## Exactly what 009 would change after a future approval

The existing `uranius_smoke_reader` server-only role would receive **column-level SELECT** on `uranius_game.game_state` for exactly `season_number`, `month_number`, `day_number` and `is_paused`. The current clock SELECT policy, `game_state_manager_read`, would also authorize that restricted role while **retaining the original owner predicate**. It would not grant table-wide SELECT, `id`, anonymous access, public Data API exposure, clock writes or ownership privileges.

The new management wrapper uses a single PostgreSQL DO statement with guards for non-superuser `postgres` session, original independently granted **ADMIN-only** migrator membership, PostgreSQL 17 and exact Uranius project identity. It temporarily grants SET ROLE to `uranius_migrator`, checks all eight prior ledger hashes through the original 009 preflight, and holds transaction locks before the restricted grants. It snapshots the existing fixture rows, old RLS policies and clock predicate, compares the unchanged portions after the grant/policy extension, records the ninth custom migration-ledger entry with the canonical source SHA, then revokes the temporary role grant and compares the exact membership rows. Any raised exception is intended to abort the entire statement.

**Caution:** This wrapper was generated and statically validated, but even an unchanged candidate SQL does not prove the new wrapper will execute. Do not apply it to hosted Supabase until the native management-role test succeeds.

## Verified so far

- Owner's corrected Node suite: **8 passed, 0 failed**, including signed-in manager A/B session isolation and the intentionally empty HTTP 404 denial.
- Owner's disposable 009 candidate SQL rehearsal: **21/21 checks passed** with clean temporary PostgreSQL shutdown.
- New wrapper: seven static source/approval assertions passed in an isolated JavaScript assertion harness against GitHub contents. The native runner parsed as valid JavaScript. Four canonical SQL statement bodies matched the reviewed source exactly.
- A fresh read-only hosted Supabase check: **eight** custom migrations, **zero** 009 records, one frozen paused clock row, two manager mappings. Existing smoke reader and `anon` still have **no** clock SELECT; RLS policy roles are `{authenticated}`. **No hosted DDL, policy, role or schema change was performed** as part of preparation.

## Next required owner test

From Command Prompt in the already-reviewed Windows Uranius checkout:

```bat
cd /d "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review"
git pull origin main
node --test tests\uraniusClockReaderManagementWrapper.test.mjs
node tests\uraniusClockReaderManagedPg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

The local runner has an explicit mode flag, checks all reviewed source file hashes before running, initializes its own temporary PostgreSQL 17 cluster bound to 127.0.0.1, and cleans it up after testing. It requires **no Supabase password, service key, API key or browser access**. Its failure-injection tests deliberately abort a transaction after temporary membership grant and again after the ACL/policy change, then check that the original grants, RLS and ledger state were restored.

Expected **count and detailed PASS lines are not claimed until actually observed**. If any test fails, diagnose and fix the repository candidate/wrapper/test, regenerate the SHA manifest if the SQL changes, and repeat locally. The existing 21/21 candidate proof does not need to be repeated as long as the candidate SHA remains unchanged.

## Approval and deployment boundary

Successful tests would make 009 **eligible for a hosted authorization request**, not automatically authorized. Before any application, review an independent post-commit rollback/retirement plan, perform a fresh hosted read-only project/ledger/membership preflight, and obtain the owner's explicit approval of the **exact target and both hashes**. The original production ProPeloton Manager is out of scope. The loopback clock feature flag stays off until authorized 009 is applied and A/B session and new HTTPS negative probes are verified.

Current project progress stays **49/60**. U5.02 remains BLOCKED on complete legacy game contracts; U5.03 remains IN_PROGRESS until real frontend acceptance is demonstrated.

## Final local verification outcome — 2026-11-23

The owner completed the exact test commands above, reporting **7/7 PASS** from Node's management-wrapper static suite and **13/13 PASS** from the disposable PostgreSQL 17 management-wrapper rehearsal. The native regression confirmed exact temporary role grant restoration after both injected-failure paths, denied incorrect project/role/digest inputs, four-column-only ownership-scoped clock reads after the successful local apply, duplicate rejection and clean temporary database removal. **The earlier warning that the wrapper had not been native-tested is historical and superseded by this result.**

Source and management SQL hashes remain unchanged. This project is **READY FOR A SEPARATE HOSTED APPROVAL DECISION**, not automatically approved. The live hosted project still contains only migrations 001–008, with `uranius_smoke_reader` unable to SELECT clock fields.

Use the reviewed [`009_HOSTED_APPROVAL_GATE.md`](009_HOSTED_APPROVAL_GATE.md) for exact targeted authorization, just-in-time preflight and postflight checks. Use [`009_ROLLBACK_REVIEW.md`](009_ROLLBACK_REVIEW.md) for the non-executable post-commit incident/recovery plan. Do **not** rerun the review-only wrapper against hosted SQL without explicit approval.
