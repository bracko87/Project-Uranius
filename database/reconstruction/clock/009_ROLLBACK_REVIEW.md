# Migration 009 — post-commit rollback and incident-response review

**Status:** non-executable review only, **not authorization**. Prepared November 23, 2026.
**Scope:** isolated Project Uranius Supabase project `sdtsivgtcaoaeoihcwzd` only. Original ProPeloton Manager, Auth settings, simulation and public Data API remain outside scope.

## Failure boundaries

The SHA-pinned `009_management_REVIEW_ONLY.sql` is a single PostgreSQL DO statement. The owner demonstrated **13/13 successful checks** with the disposable native PostgreSQL 17 management fixture, including two failures injected (1) after the temporary role grant, and (2) after clock ACL/RLS modification, both leaving role memberships, ledger and clock permissions unchanged. The separately tested 009 SQL candidate also passed **21/21** native checks. This establishes the **pre-commit** transaction failure behavior of the exact reviewed files, not an automated post-commit rollback.

If 009 commits successfully to the hosted sandbox, a later error cannot reverse it by running another failing SQL statement. Any post-commit retirement must be a **new, separately approved and rehearsed atomic management operation**.

## 009-owned changes eligible for retirement, if still safe

1. The column-level SELECT privileges granted **only** to `uranius_smoke_reader` on `uranius_game.game_state`: `season_number`, `month_number`, `day_number`, and `is_paused`.
2. `game_state_manager_read` policy membership addition of `uranius_smoke_reader`. Original `authenticated` membership, `qual`, `with_check`, command and permissiveness must be retained.
3. The custom `uranius_private.migration_ledger` record `009_clock_smoke_reader.sql` with canonical source SHA-256 `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37` **only after** those two effects are demonstrably retired and only when no 010+ migration depends on 009.

Never remove migration 008's game-state table, frozen clock, owner RLS logic or original three clock read functions while retiring 009. Never grant anonymous or owner/management write access in a recovery attempt.

## Mandatory verification before designing destructive retirement

- Verify exact hosted project/database, PostgreSQL 17, and `postgres` independent ADMIN-only (not SET/INHERIT) membership. Confirm 009 is installed with the expected ledger digest and no later migration references it.
- Inspect current `pg_class`, `pg_attribute`, `pg_policy`, `pg_depend`, `pg_roles`, `pg_auth_members` and `pg_attribute.attacl` for clock-table privileges, additional dependencies or changes made by a later tranche. Do not overwrite new grants/policy members blindly.
- Confirm `game_state_manager_read` still has exactly the expected two roles, and its owner restriction has not changed. If new dependent roles or UI features exist, require a compatible forward fix rather than a blind REVOKE.
- Assess whether the local HTTPS clock client and `URANIUS_CLOCK_READ_APPROVED` are active. Disable *only* that optional reader feature first if incident containment requires it; keep original dashboard login working.
- Take read-only snapshots before and after of the eight earlier migration digests, two club-owner mappings, 20 teams, 200 riders, 450 starters, frozen singleton date, authenticated player access, anonymous denial and exact management-membership rows.
- Rehearse a separately SHA-pinned retirement wrapper in disposable PostgreSQL 17 with failure injection. Obtain explicit owner approval of **the retirement operation** and its scope, distinct from authorization to install 009.

## Operating procedure for an incident

**Failure before commit:** do not run any rollback. Confirm hosted ledger remains 8 and reader cannot read the clock; analyze the original SQL error.

**Successful commit followed by browser/HTTPS test failure:** keep 009 in place until diagnosing whether the failure comes from local HTTPS trust, client session handling, TLS credential validation, RLS subject mapping or SQL output. Do not delete schema objects or override RLS as a workaround.

**Suspected security exposure:** stop enabling the optional `URANIUS_CLOCK_READ_APPROVED` read route, preserve logs without secrets, verify reader is limited to the four columns and owner-backed RLS, and review whether a narrower forward fix is sufficient.

**Retirement demonstrably safe:** only after the above safeguards and a separate owner decision, design an atomic, project-pinned management statement that restores the **prior** authenticated-only policy membership, removes just the four smoke-reader column-level grants and matching 009 ledger entry, then restores and checks membership. Use no `CASCADE`; do not affect 001–008 or any production database. The destructive SQL is deliberately **not provided** here.

This document closes the rollback *planning* gate, not a future approval requirement. Current hosted 009 remains unapplied.
