# U5.03 — Overview accepted-race hosted schema gap (2026-11-23)

## Verified source and acceptance
- Owner Windows regression: `node --test tests\\uraniusAcceptedEntryBoundary.test.mjs tests\\uraniusOverviewScheduleResponse.test.mjs` **16/16 PASS**, 0 fail, 0 skipped (2026-11-23). These are offline tests, not connected gameplay.
- HTTPS clock slice previously passed **14/14 positive** and **15/15 negative** tests. Migration 009 applied and verified.
- Original frontend: `src/pages/dashboard/Overview.tsx`, `get_overview_race_schedule_v1(p_club_id)` at lines 2440-2475, and separate race-hub accepted-entry join at lines 2005-2148.
- The original race hub needs `race_team_entries` (`id,race_id,club_id,status='accepted'`), `race_preparations` (`id,race_id,club_id,status,startlist_status`), `races` (`id,name,short_name,category,country_code,start_date,end_date,stage_count,is_stage_race,status`) and `race_stages` (`id,race_id,stage_number,stage_date`).

## Live read-only sandbox inspection
Target independently verified by Supabase project listing: **Project Uranius** `sdtsivgtcaoaeoihcwzd`, Frankfurt `eu-central-1`, PostgreSQL 17.12.

Direct schema inspection via the connected project's table metadata, cross-checked with an explicit `BEGIN READ ONLY` information_schema query:
- Present: `uranius_game.game_state` (1 paused clock row), `uranius_game.stage_calendar` (3 synthetic rows), `uranius_catalog.stages` (3 stages), `uranius_catalog.teams` (20), `uranius_catalog.riders` (200), `uranius_catalog.startlists` (450).
- **Absent** under both `uranius_game` and `uranius_catalog`: `races`, `race_stages`, `race_team_entries`, `race_preparations`. There is also no trusted original `get_overview_race_schedule_v1` implementation installed in these schemas.
- The existing `stage_calendar` is a shared fixture stage-day mapping, not a verified accepted-race/team-entry schedule. Do not mislabel it as one.

## Required implementation order — NOT YET COMPLETED
1. Recover or reconcile authoritative original SQL definitions and later migration overrides for `races`, `race_stages`, `race_team_entries`, `race_preparations` and `get_overview_race_schedule_v1(p_club_id)`. Validate types, constraints, foreign keys, status lifecycle, acceptance/writes and source provenance. Do not invent a substitute racing schema.
2. Map the synthetic Uranius club UUID/team_id identity to the original club/race entry model, including developing-team ownership, while keeping the original authenticated owner predicate on all reader paths.
3. Prepare a source-pinned, review-only sandbox migration plus disposable PostgreSQL 17 tests: A/B ownership isolation, submitted/locked preparation conditions, cancelled race exclusions, date behavior, anonymous denial, invoker permissions and rollback.
4. Only with separately reviewed artifact digests and owner approval should the sandbox receive schema/ACL changes. Preserve old migration history, original production isolation and paused clock.
5. Connect a read-only Overview backend and exercise A/B HTTPS schedule parity. Do not implement race application or result writers until their full workflows are reviewed.

**Current project status:** 49/60 checklist tasks; U5.02 blocked on broader original-game contract parity, U5.03 in progress. Passing 16 offline tests is not a full frontend or hosted-entries PASS.

**No SQL DDL/DML, schema changes, exposed APIs, new workers, public deployments or ProPeloton production modifications performed in this inspection.**
