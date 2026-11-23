# Uranius 008 — hosted sandbox approval gate (not approved)

**Prepared:** 2026-11-23. **Decision state:** awaiting explicit owner authorization. This document is not a deployment instruction or approval.

## Target and exact artifacts

- Isolated target: Supabase project ref `sdtsivgtcaoaeoihcwzd`, database `postgres`, PostgreSQL 17.
- Tested candidate: `database/reconstruction/clock/008_game_clock_v1.sql`; SHA-256 `f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b`.
- Single-statement management wrapper: `database/reconstruction/clock/008_management_REVIEW_ONLY.sql`; SHA-256 `a1317dca31d768c6fc73dd2090c58ad3e97498a83b1422ad194e1336b30fc92c`.
- The wrapper embeds 17 canonical SQL statements and is a different reviewed artifact from the candidate SQL; a passing candidate test does not replace the management-wrapper test.

## Evidence now accepted

The owner ran `git pull origin main` to commit `2897277` on Windows, then supplied full stdout from:

1. `node --test tests\uraniusClockManagementWrapper.test.mjs`: **6 passed, 0 failed**.
2. `node tests\uraniusClockManagedPg17.mjs --disposable-native-pg17 --postgres-bin "...\postgresql-17.12-portable\bin"`: **12/12 passed** on a disposable loopback PostgreSQL 17 cluster, with `INFO Disposable PostgreSQL files cleaned up`.

The native test verified exact 001–007 replay, independent admin-only management membership, denial of direct SET ROLE, wrong role/project and ledger drift, forced rollback after a temporary role grant and again after DDL/ledger changes, exact membership restoration, owned and unowned manager reads, anonymous/smoke-reader denial, forbidden writes/unpause and duplicate application. Original unwrapped SQL also previously passed 12/12 native checks; 16 offline game-clock/preflight Node tests had passed.

## Hosted read-only preflight — no migration executed

The separate **connected Supabase read-only query** returned:
- `db_name=postgres`, `read_connection_user=postgres`, project ref exactly `sdtsivgtcaoaeoihcwzd`.
- Ledger count **7**, **0** ledger-digest differences against the reviewed 001–007 manifest.
- `uranius_game.game_state` absent; two manager mappings; 200 riders; three stages.
- `postgres` is **not** superuser and cannot SET or inherit `uranius_migrator`. Exactly **one** independent ADMIN-only grant from another grantor was observed.

Security advisors showed **INFO** for three `uranius_private` RLS-enabled tables without policies. Those private tables intentionally have no client-facing policies; this does not alone indicate a vulnerability. Separately, a **WARN** was raised because Auth leaked-password protection is disabled. Do not automatically change Auth security settings under this game-clock approval; track it independently. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## What hosted application would change

One isolated, **paused and synthetic** game-clock singleton `uranius_game.game_state`, initialized to Season 1 / 2000-01-01 00:00 and immutable for players; its new RLS read policy; and three original-signature invoker-only read functions:
- `get_current_game_date_date()`
- `get_current_game_date_parts()`
- `get_current_game_date()`

The wrapper records an eighth entry with the canonical SQL SHA, restores the management membership, and rejects if prior owner/fixture/RLS data changes. It is **not** the full original game clock: no advancing time, scheduler, speed, hosted API schema exposure, race-entry writer, gameplay results or React screen wiring. No change to the original ProPeloton Manager is authorized.

## Before and after any authorized hosted application

1. **Separate owner approval must identify this exact target and exact wrapper/candidate SHA.** A generic “proceed” with repository work does not grant hosted migration authorization.
2. Immediately before executing, refresh read-only project identity, database version, seven-entry digest, membership, manager mappings and absence of clock schema. Abort on drift. Never change the original production project.
3. Apply **only** the separately approved, single-statement 008 management wrapper using the project-scoped, reviewed PostgreSQL 17 management connection. Do not paste the canonical SQL separately or run both scripts. Do not use service-role keys or change Data API exposure.
4. After a successful commit, verify the eighth ledger entry and its SHA, paused Season 1 clock and functions, RLS and public/anonymous/smoke-reader denial, both manager access shapes, old fixture records, and role membership identity. Re-run read-only security advisors and the hosted login/session negative-access tests. On any anomalous result, halt and investigate; do not automatically rerun the migration.
5. **A committed migration is not reversed by rolling back a later SQL statement.** Before application, review an independent rollback/retirement plan for just the new 008 clock objects and ledger state, respecting dependencies, ownership and the need to preserve any later migrations. No destructive rollback is currently approved.

**Scope remaining after 008:** accepted team entries and `get_overview_race_schedule_v1`, complete original clock behavior, squad/calendar contracts, genuine frontend integration and full two-manager baseline. Milestone 5 remains **NOT PASSED**; overall checklist stays 49/60.

## Approval request

Explicit owner decision requested before hosted execution:

> Approve applying Uranius migration 008 **only to sandbox project `sdtsivgtcaoaeoihcwzd`**, using management-wrapper SHA-256 `a1317dca31d768c6fc73dd2090c58ad3e97498a83b1422ad194e1336b30fc92c` and canonical SQL SHA-256 `f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b`. No original game/production changes.

Until that approval is explicitly received, this remains **REVIEW-ONLY, NOT APPLIED**.
