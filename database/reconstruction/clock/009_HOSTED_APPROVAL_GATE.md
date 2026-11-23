# Uranius migration 009 — sandbox-only approval package

**Decision state:** READY TO REQUEST APPROVAL — **NOT APPROVED OR APPLIED**.
**Prepared:** 2026-11-23. **Target:** isolated Project Uranius Supabase `sdtsivgtcaoaeoihcwzd`, database `postgres`, PostgreSQL 17.
**No changes permitted** to the original ProPeloton Manager, other Supabase projects, user accounts, live game speed, simulation, signup, Auth configuration or Data API schema exposure.

## Exact tested bytes

| Artifact | SHA-256 | Verification |
|---|---|---|
| `009_clock_smoke_reader_REVIEW_ONLY.sql` | `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37` | Owner supplied **21/21** disposable native PostgreSQL 17 checks |
| `009_management_REVIEW_ONLY.sql` | `df7eb7ba0fd39cb4dbb826ecfdb1b80f6101b4fda1f79373b7e1509d967c5bab` | Owner supplied **7/7** Node/static and **13/13** native PG17 management-wrapper checks |

All four original candidate SQL statements appear in the wrapper with unchanged source bytes. The wrapper maintains one-DO-statement atomicity, exact earlier migration digest prerequisites, grant restoration and postconditions. It is the **only** proposed hosted SQL execution artifact; do not separately execute candidate SQL or both files.

Additional previously completed frontend clock session Node tests: **8/8 PASS**.

## What it changes

- Grants the **existing, server-only** `uranius_smoke_reader` role **column-level SELECT** on just four clock fields: `season_number`, `month_number`, `day_number` and `is_paused`.
- Extends the current `game_state_manager_read` SELECT RLS policy role list from `authenticated` to `authenticated, uranius_smoke_reader`; the existing owner-based row filter remains unchanged.
- Adds exactly one custom ledger entry `009_clock_smoke_reader.sql` with the canonical source SHA-256 above, advancing the isolated `uranius_private.migration_ledger` from eight to nine entries.
- Uses the reviewed temporary SET-role management step and verifies exact grant membership restoration before commit.

No public schema, anonymous or table-wide SELECT, clock identifier column, write permission, scheduled process or frontend deployment is authorized by this migration.

## Read-only hosted preflight performed

A connected, read-only Supabase SQL inspection independently confirmed:

- Exact target project, DB `postgres`, PostgreSQL **17**.
- **8** current migrations, **zero hash differences** against the expected 001–008 manifest; 009 ledger entry absent.
- One frozen/paused Season 1 singleton; two owner mappings, 200 riders.
- `uranius_smoke_reader` and `anon` have **no** clock column SELECT; reader has no clock UPDATE. Current owner policy roles are exactly `{authenticated}`.
- `postgres` is non-superuser, cannot SET or inherit migrator, and has exactly one independently granted ADMIN-only membership.

Security advisors still report **INFO** for three intentional private RLS tables with no policies, and **WARN** that leaked-password protection is disabled. No new permission has been changed. The Auth warning is a separate hardening decision: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Safeguards after a future approval

1. A **new explicit owner approval** is required for this exact target and both SHA-256s. The owner sharing test output does not approve hosted DDL.
2. Immediately before execution, repeat the read-only preflight of project identity, role membership, exact eight-entry ledger hashes, frozen clock, two owners, RLS policy and reader/anon denied privileges. Abort on any difference.
3. Execute **only the exact reviewed single DO statement** from the pinned management wrapper on the isolated Uranius project; capture success/failure without leaking passwords or credentials.
4. Independently read back the nine-entry ledger SHA, unchanged 001–008 digests, frozen date, reader's **four** selectable fields and no additional SELECT/INSERT/UPDATE/DELETE privileges; verify owner RLS policy retains its original row filter, anonymous denial, management membership and fixture counts.
5. Run Supabase security advisors again; stop if an unanticipated clock-related finding appears.
6. **Only after successful postflight**, test HTTPS loopback with the existing local restricted-reader credentials and opt-in `URANIUS_CLOCK_READ_APPROVED=1`, using authenticated Manager A and Manager B sessions. Verify both clock responses, outsider/logout denial, session isolation, and all **15** negative HTTPS checks. Do not expose the listener publicly or bypass certificate verification.
7. If the transaction fails, inspect the error and verify eight-migration state, not an automatic retry. If a problem occurs after commit, review [`009_ROLLBACK_REVIEW.md`](009_ROLLBACK_REVIEW.md) before any separately approved retirement operation.

## What remains after 009

Migration 009 only enables a limited test dashboard to read a **paused** clock. It does **not** implement the full original Overview, Squad or Calendar, game-time progression, accepted race-team entries, real race schedules, race results or simulation. These remain separate U5.02/U5.03/U5.04+ tasks. **Overall verified progress is still 49/60.**

## Approval question

Do you approve applying **only** the exact migration 009 management wrapper to the isolated Uranius Supabase project `sdtsivgtcaoaeoihcwzd`, using wrapper SHA-256 `df7eb7ba0fd39cb4dbb826ecfdb1b80f6101b4fda1f79373b7e1509d967c5bab` and canonical source SHA-256 `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37`?

**Until explicit approval is received, keep 009 review-only and do not enable the local clock-reader feature.**
