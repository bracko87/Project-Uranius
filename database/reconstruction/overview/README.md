# U5.02 / U5.03 — Overview clock and stage schedule, first offline code slice

**Target:** isolated Project Uranius `sdtsivgtcaoaeoihcwzd` only. **Status:** offline-only; no hosted DDL, data write, API exposure, app route change or deployment. The real ProPeloton Manager remains untouched.

## Source-of-truth reconciliation (2026-11-23)

The original frontend calls `get_current_game_date_date()` and `get_overview_race_schedule_v1(p_club_id uuid)` from `src/pages/dashboard/Overview.tsx`. The original calendar and squad screens additionally call `get_current_game_date_parts()` and `get_current_game_date()`.

The sanitized *later* clock definitions in `reference/database/20260929184613_baseline_04_sql_dump_001_120.sql.txt`, lines 439–486 and 985–1035, define:
- `get_current_game_date_date()` as a SQL `date` derived from one `game_state` row with `id = true`.
- `get_current_game_date_parts()` with `current_game_date`, `season_number`, `month_number`, `day_number`.
- `game_year_from_season(n)` as `2000 + n - 1` and `game_date_from_parts` as Gregorian `make_date`.

**Do not use** the early `current_date` stub in `20260929183112_baseline_01b_default_function_stubs.sql.txt` as authoritative; it is superseded. Never map the actual wall-clock date to game time.

The live Uranius schema currently has only `uranius_catalog.request_uid()` and `uranius_game.get_my_club_id()` as app-facing functions. Independent read-only Supabase checks confirmed that `uranius_game.game_state`, `uranius_game.race_team_entries` and the clock RPC do **not** exist. This means the full original Overview cannot load as-is.

The live synthetic stage data *does* exist:

| Stage | Label | Season / day | Distance | Starters | Teams |
|---|---|---|---:|---:|---:|
| 1 | Fixture flat | 1 / 7 | 120 km | 100 | 10 |
| 2 | Fixture rolling | 1 / 8 | 160 km | 150 | 15 |
| 3 | Fixture mountain | 1 / 9 | 200 km | 200 | 20 |

These are shared test-world stages. They do **not** establish that Manager A or B accepted a race, that the stage has started, or that a game-clock date has elapsed. Do not render them as accepted upcoming races or completed results.

The `get_overview_race_schedule_v1` definition is absent from the sanitized schema inventory, although its call is present in `src/pages/dashboard/Overview.tsx`, around line 2451. The original code normalizes `upcomingSchedule` and `todayRaces` from its returned object; exact ordering, visibility, future result treatment and accepted-entry semantics still require verified source and dependency review.

## Implemented (safe, no database access)

- `game-clock-contract.mjs`: deterministic conversion from **explicit, authoritative** `season_number/month_number/day_number` fields; null if no `game_state`. Enforces valid Gregorian calendar dates, including leap-year behavior. Matches the later game-date SQL.
- `gameDatePartsFromState`: preserves the four RPC result fields.
- `projectFixtureStageListing`: preserves ordered fixture stages, labels, distances and season days; deliberately omits any calendar date, race acceptance, race result and private manager information.
- `overviewScheduleGate`: explicitly denies a supposedly ready Overview schedule unless the authoritative clock and accepted-entry contract are supplied and separately reviewed. Its default is fail-closed even with an example fixture clock.

This module is **offline contract code**, not a replacement for real Overview or an authorized hosted RPC.

### Reproducible test

From the Uranius repository root:

```cmd
node --test tests\uraniusGameClockContract.test.mjs
```

Nine deterministic tests cover missing clock, season 1/2 mapping, leap/non-leap cases, malformed values, stage ordering, no fabricated dates/acceptances, invalid stages and fail-closed schedule readiness.

## Exact next implementation gates

1. Reconcile the actual authoritative `game_state` schema, one-row clock initialization, pause/speed/day-advance behavior, timezone and restoration logic from sanitized sources and approved read-only inspection. The stage fixture intentionally has no live clock anchor.
2. Inspect accepted-team-entry contracts, stage status, and full `get_overview_race_schedule_v1` response shape. The current inventory marks the schedule definition **missing**: do not fabricate it.
3. Prepare a *separately reviewable* sandbox migration (future version after 007) with RLS, explicit read-only API/adapter contracts, rollback, isolated tests, exact SHA-256 and the target guard. Do not execute or enable API exposure without owner approval.
4. Only then integrate the **original** React Overview → Squad → Calendar consumers behind the sandbox feature flag and execute true two-manager baseline smoke, preserving the existing golden no-command engine baseline.

**Status:** U5.02 still BLOCKED on full contract reconstruction; U5.03 IN_PROGRESS. **Progress remains 49/60.**
