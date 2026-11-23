# Uranius 008 — verified hosted sandbox application report

**Applied on:** 2026-11-23. **Scope:** isolated Project Uranius only, Supabase project `sdtsivgtcaoaeoihcwzd`, database `postgres`, PostgreSQL 17. **Status:** `HOSTED_SANDBOX_APPLIED_VERIFIED`. No change to the original ProPeloton Manager database, deployed UI, game processes, billing or clock speed.

## Authorization and exact source

The owner answered “ok, what next?” to the direct preceding question requesting approval to apply migration 008 to **the isolated Uranius sandbox** using the exact reviewed management wrapper. The executor stated that it would treat that response as authorization for the *sandbox-only* migration before performing the change.

The exact reviewed artifacts were fetched from `bracko87/Project-Uranius`:
- `database/reconstruction/clock/008_game_clock_v1.sql`, SHA-256 `f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b`.
- `database/reconstruction/clock/008_management_REVIEW_ONLY.sql`, SHA-256 `a1317dca31d768c6fc73dd2090c58ad3e97498a83b1422ad194e1336b30fc92c`; corresponding Git blob SHA `f53e3f54e3f72c847df3dfe2ca064b1814fe23fd`.

The reviewed candidate had passed 12/12 disposable PostgreSQL 17 checks, then the separately tested management wrapper had passed 6/6 Node and 12/12 disposable PostgreSQL 17 checks on the owner's Windows computer.

The exact **single DO statement** wrapper was submitted using the project-scoped SQL execution action. This is necessary to preserve the existing custom `uranius_private.migration_ledger` and role grant/restoration sequence; the separate Supabase automatic migration-history mechanism was not used. The execution returned successfully without SQL error.

## Immediate postflight results (direct read-only Supabase queries)

| Check | Observed value |
|---|---|
| Project identity | `sdtsivgtcaoaeoihcwzd` |
| `uranius_private.migration_ledger` count | **8** |
| 008 migration ledger SHA | Exact candidate digest above |
| `uranius_game.game_state` | One frozen singleton row |
| Clock values | Season 1, month 1, day 1, 00:00, `is_paused=true` |
| Clock RLS enabled | **true** |
| Authenticated SELECT RLS policy | One `game_state_manager_read`, filter requires a matching owner via `uranius_catalog.request_uid()` |
| Original-signature clock read functions | 3 `STABLE SECURITY INVOKER` |
| Authenticated column-level SELECT | **true** for all clock columns |
| Authenticated table INSERT/UPDATE/DELETE | **false** |
| Anonymous clock SELECT/EXECUTE | **false** |
| Restricted smoke-reader clock SELECT/EXECUTE | **false** |
| Non-superuser management role | Verified |
| Management SET/INHERIT of migrator | Both **false** after installation |
| Independent ADMIN-only membership | **1** preserved |
| Teams / riders / starters | **20 / 200 / 450** |
| Synthetic owners / stage fixtures / calendar rows | **2 / 3 / 3** |
| Opening balances | **20** |
| Existing RLS policies (excluding the new clock policy) | **11** |

Note: `has_table_privilege('authenticated', ..., 'SELECT')` alone is false because 008 deliberately grants **column-level SELECT**, not whole-table SELECT. A separate `has_any_column_privilege` and per-column `has_column_privilege` check confirmed all intended clock columns are readable. This is the expected least-privilege behavior.

The new clock does **not** advance. There are no scheduler jobs, accepted race-entry records, real game calculations or automatic results in this tranche.

## Supabase security-advisor postflight

No new clock-related security lint appeared. The security advisor reported the same earlier findings:
- `INFO`: three private `uranius_private` tables have RLS enabled without policies, consistent with their deliberate client denial.
- `WARN`: Auth leaked-password protection disabled. Remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. This is a separate potential hardening task and was **not** changed during 008.

## Still outstanding

- A **fresh owner browser/server-side smoke** must verify both synthetic managers' authenticated reads using the newly installed clock, separate sessions, outsider denial and logout isolation. The assistant cannot directly access `127.0.0.1` on the owner's Windows computer.
- The original Overview, Squad and Calendar screens still cannot load the complete game: original clock speed/time progression, `get_overview_race_schedule_v1`, accepted race-team entries, squad/finance/header contracts and full frontend wiring remain unfinished.
- The existing 11/11 hosted HTTPS negative-access checks from before 008 remain historical evidence; they have **not yet been rerun after installation**.
- Migration 008 cannot be described as full U5.02 or U5.03 completion. Overall progress remains 49/60, U5.02 BLOCKED on full game contracts, U5.03 IN_PROGRESS.

## Artifact and recovery policy

The earlier `database/reconstruction/clock/manifest.json` retains `REVIEW_ONLY_NOT_AUTHORIZED` as its **historical immutable test/approval snapshot**, so the prior reproducible Node/native tests still validate the exact reviewed files. Current hosted application state is tracked separately in `008_DEPLOYMENT_STATUS.json` and this report. Do not interpret the historical manifest as a claim that the database is still unmodified.

The migration was committed. Failure *before* commit would have been rolled back atomically; *post-commit* retirement requires a different, explicitly authorized dependency-reviewed operation (see `008_ROLLBACK_REVIEW.md`). No rollback was executed. Do not rerun 008, add a conflicting second ledger entry, alter Auth settings or deploy the original game before the next review gates.

**Next implementation:** connect a server-mediated, read-only authoritative game-clock projection with authenticated access in the isolated Uranius smoke adapter, test A/B session isolation and frontend data mapping, then reconstruct original accepted race entries and Overview schedule without inventing race dates or results.
