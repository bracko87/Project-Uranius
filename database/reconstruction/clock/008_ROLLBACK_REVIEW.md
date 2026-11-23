# Project Uranius — Migration 008 rollback/retirement review

**Status: PLANNING ONLY — NOT AUTHORIZED TO EXECUTE.** Prepared 2026-11-23, solely for the isolated project `sdtsivgtcaoaeoihcwzd`. This is not a runnable rollback script or a grant of destructive-access authorization.

## Transaction-level failure versus post-commit retirement

The reviewed `008_management_REVIEW_ONLY.sql` is a single PostgreSQL `DO` statement. If any part fails **before successful commit**, PostgreSQL rolls back the temporary membership grant, new table/functions and migration ledger insert together; the disposable test verified errors after the temporary grant and after clock DDL/ledger insertion.

If 008 *commits successfully*, rollback is a **new, separately reviewed migration/retirement operation**. It cannot be undone merely by causing another SQL statement to fail. Do not automatically run `DROP` commands or delete the ledger entry during an incident.

## What would be eligible for retirement (only if no dependents)

The canonical 008 addition consists of exactly:
- `uranius_game.get_current_game_date_date()`
- `uranius_game.get_current_game_date_parts()`
- `uranius_game.get_current_game_date()`
- `uranius_game.game_state`, including its one frozen row and `game_state_manager_read` policy
- `uranius_private.migration_ledger` record `008_game_clock_v1.sql` with SQL SHA-256 `f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b`

**Do not** remove or change 001–007 schemas, fixture data, owner mappings, reader role, previous policies, auth users, API exposure, or original ProPeloton Manager. In particular, retirement must never cascade into unrelated objects.

## Mandatory stop conditions before writing a rollback transaction

- Confirm the exact sandbox project/database identity, non-superuser management role and independent ADMIN-only membership, same as the preflight.
- Confirm the current highest ledger version, full digest set and absence of newer dependent migrations; an 009+ schema must not be silently rolled back by removing 008.
- Inspect `pg_depend`, `pg_proc`, `pg_class`, `pg_policy`, `pg_roles` and table ACLs for any dependents, grants or modified state. Check whether any player-facing frontend or integration has started relying on the new clock.
- Verify 008 is still exactly a frozen Season 1 singleton and has not been advanced, populated with new data, or used as an authoritative clock for actual player actions. If it has, escalate to a preservation/migration plan rather than removing it.
- Verify the exact three function signatures and ownership; do not drop similarly named original-game functions or objects in other schemas.
- Capture a read-only before-snapshot and plan a post-retirement recheck of 001–007 digests, owner mappings, riders, stages, RLS policies and management membership.
- Perform an independent **disposable PostgreSQL 17** rehearsal of the separate retirement procedure, with failure-injection verifying all-or-nothing behavior.
- Obtain a **new, explicit owner approval** identifying the exact retirement plan and its SHA-256, distinct from the application approval.

## Recovery policy

1. If application fails **before commit**, do not run rollback SQL; verify the original seven-entry ledger, absent clock and unchanged role grants, then diagnose the original error.
2. If application succeeds but a read-only postflight fails, stop all further migrations or UI activation. Preserve evidence. First assess whether a simple grants/RLS configuration correction can resolve the issue **without changing sporting rules or fixture data**.
3. If retirement is safe after review, use an isolated, atomic, target-pinned non-superuser management wrapper that checks dependencies and exact object definitions, removes only 008-owned functions and table (without `CASCADE`), removes only the matching 008 ledger row as part of the same transaction, then restores original grant state. The exact destructive SQL is **not** prepared or authorized in this document.
4. If there are dependencies, application data, changed timestamps or later migrations, **do not** retire 008 automatically. Require a compatible forward-fix or explicit preservation path.
5. After any approved change, repeat ledger/project/roles/RLS/fixtures read-only verification and the owner A/B browser smoke.

This plan makes the failure boundary explicit but does not imply rollback is already executable. Application approval remains separate and conditional on a final just-in-time preflight.
