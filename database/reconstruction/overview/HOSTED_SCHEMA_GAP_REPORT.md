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

## Original production metadata-only recovery — 2026-11-23

User authorized the proposed *strictly read-only, schema-only* inspection. Independently identified original project **ProPeloton Manager** `okuravitxocyevkexfgi` and the separate Uranius project `sdtsivgtcaoaeoihcwzd`. All live original queries were `BEGIN READ ONLY` catalog inspections: pg_class/pg_attribute/pg_attrdef, pg_constraint, pg_policy, pg_proc/pg_get_functiondef. **No table SELECT of player/application rows, no Auth-user export, no DDL/DML, no writes.**

### Complete captured source references

- `reference/database/20261123_original_overview_race_schema_METADATA_ONLY.json`: 23 race columns (9 constraints), 40 stage columns (15 constraints), 18 team-entry columns (5 constraints), 29 race-preparation columns (19 constraints). Contains column types, required/default flags, original constraints; zero rows.
- `reference/database/20261123_original_overview_race_schedule_SOURCE_ONLY.sql.txt`: original full `public.get_overview_race_schedule_v1(p_club_id uuid) RETURNS jsonb` source (7,356 chars); **reference only, do not deploy**.
- Live production RLS also observed: race preparations own-club policy plus privileged shadow-reader; race team entries public/anonymous read and trial direct-write policies; races/stages broadly readable to authenticated and privileged shadow reader. None of these authorizes copying permission models into Uranius.

### Crucial behavioral distinction — separate the first-paint schedule from team race hub

Inspecting the actual RPC body corrects an earlier assumption: **`get_overview_race_schedule_v1` does not join `race_team_entries` and does not require `submitted` preparation status.** Instead, its `upcomingSchedule` selects distinct races from `race_preparations` with matching club scope (main + developing), excludes certain cancelled/declined statuses and completed/cancelled races, requires a future or present stage date and returns at most 5 upcoming cards. Its `todayRaces` includes up to 20 current-day stage cards **from the global race catalog**, irrespective of manager accepted entry. The separate `loadOverviewTeamRaceHub` in Overview.tsx *does* join `race_team_entries.status='accepted'` with submitted/locked preparation before selecting next team race. Do not conflate these UI sections or filter global today races to owned accepted team entries.

The original RPC produces internal links `#/dashboard/races/<race UUID>`. The new offline projector originally rejected this source-valid URL; code and a regression test have been updated to permit this specific internal hash route without opening external navigation. The new suite needs fresh Node execution.

### Serious security discrepancy to address in Uranius adaptation

The original production RPC is `SECURITY DEFINER` and grants `EXECUTE` to `PUBLIC`, `anon`, and `authenticated`. Its body does **not** check `auth.uid()` or verify ownership of supplied `p_club_id`. In Uranius, **never** expose or copy this exact function into the client-accessible database. The planned read boundary must derive club scope server-side from an authenticated verified manager, use minimum read privileges and apply RLS/invoker semantics. Leave original production unchanged; this is a reconstruction hardening finding, not approval to alter the source game.

Next milestone: construct source-backed, review-only tables with original constraints in a disposable PostgreSQL 17 fixture, map the original club UUID to `uranius_game.club_profiles.club_id`, and split tested schedule and next-team-race read models to preserve distinct original UI behavior. No hosted migration 010 applied.

## Review-only 010 schema candidate prepared (2026-11-23)

Owner reran original Overview offline tests after source-valid hash-link fix: **17/17 PASS**, zero failures, zero skipped. These are local tests, not hosted data acceptance.

Created `database/reconstruction/overview/010_race_schema_DISPOSABLE_REVIEW_ONLY.sql` directly from the exact recovered live metadata (23+40+18+29 = **110 columns**). It carries all captured PK, UNIQUE and CHECK constraints; maps original club UUID foreign keys to `uranius_game.club_profiles(club_id)`; preserves the four intra-race foreign key relationships; enables and FORCEs RLS on every new table; revokes client privileges; and wraps the entire candidate in `BEGIN ... ROLLBACK` to prevent accidental persistent application. It is **not** a deployable migration, does not append the ledger, has no public-facing RPC and performs no inserts. It deliberately defers original `countries`, finance and equipment foreign keys, original triggers and status transitions until corresponding synthetic catalog contracts are reviewed.

Added `tests/uraniusOverviewSchemaCandidateReview.test.mjs` to compare column/types/defaults and PK/check constraints against the source snapshot, verify known FK rewiring, and require restrictive RLS and rollback. **This new suite has not yet been executed.** Next: run Node static review, then use a disposable PostgreSQL 17 fixture to validate SQL and row ownership before preparing any hosted installation package. No new database writes or changes executed against either project.

## Owner 010 static review PASS; native fixture runner prepared (2026-11-23)

Owner pulled commit `3dfc086` and ran `node --test tests\\uraniusOverviewSchemaCandidateReview.test.mjs`: **5/5 PASS, zero failures**. This verifies the checked-in generated source structure only, **not** PostgreSQL execution.

Added `tests/uraniusOverviewSchemaNativePg17.mjs` for an isolated, disposable PostgreSQL 17 test database. It requires the owner's existing portable PG17 binaries; creates a fresh loopback-only PGDATA, runs the exact unmodified rollback-only schema candidate, confirms zero persistent race tables, then performs a temporary in-transaction schema/security/foreign-key rehearsal and rolls back again. It never connects to any hosted Supabase database, has no production DSN, and cleans up the local fixture after shutdown. Native runtime results **pending** and must not be reported as passed before owner execution.

Owner command in the reviewed Windows checkout:

```bat
node tests\\uraniusOverviewSchemaNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\\Users\\Aleks\\Desktop\\Project-Uranius\\.uranius-pin-review\\postgresql-17.12-portable\\bin"
```

If this fails, inspect the first SQL/PG17 error and correct the review candidate or harness; do not retry repeatedly or apply migration 010 to hosted. The candidate remains `REVIEW_ONLY_NOT_APPROVED`, and the authoritative Uranius ledger is still at nine installed entries. Separate ownership/RLS policy and existing schema integration tests are required before a hosted upgrade is even considered.

## Native 010 execution verified; private schedule read proposed (2026-11-23)

Owner's Windows console reported **5/5 disposable native PostgreSQL 17 checks PASS** for `tests/uraniusOverviewSchemaNativePg17.mjs`, with fresh loopback-only PGDATA and complete temporary-file cleanup. The exact 010 candidate compiled, rolled back without persistence, preserved restrictive FORCE RLS and column constraints, accepted internally consistent synthetic race/entry/preparation fixtures and rejected invalid FK data. Combined with 5/5 prior static candidate review and 17/17 Overview JS tests, this **closes the offline schema syntax gate** but **not** the owner permission or live schedule read gate. Do not repeat the five native tests unless the candidate changes.

Added a separate read-only source-informed schedule query `database/reconstruction/overview/011_overview_schedule_REVIEW_ONLY.sql` and five source-review assertions `tests/uraniusOverviewScheduleReaderReview.test.mjs`. This query gets the manager's club UUID from the existing `get_my_club_id()` invoker resolver (not a caller-provided club id); intentionally separates manager-specific upcoming preparation races from global current-day stage races, based on the actual original RPC. It requires later **separately approved** owner-scoped permissions and a database-installed schema; it is **not executable in current hosted Uranius**, is not yet wired to the server, has no new grants and no deployed public API. It excludes developing-team variants until parent club contracts are implemented. The source-review test was committed but **not run by the owner yet**.

Important: the 010 table candidate sets FORCE RLS without any policies, so a future hosted installation must establish an authenticated/reader SELECT policy with a tested ownership predicate before the Overview can read its contents. Applying the source query as-is without that work would return no usable entries. Maintain read-only and single-project separation throughout.

## Schedule server boundary and permissions staged (2026-11-23)

Owner independently reran the five native PostgreSQL 17 checks with clean temporary fixture shutdown, then pulled latest main and ran `node --test tests\\uraniusOverviewScheduleReaderReview.test.mjs`: **5/5 PASS**. These verify the read-only `011` source contract, not its live hosted execution.

The existing local HTTPS dashboard adapter now recognizes `GET /fixture/overview-schedule` using the same short-lived verified manager session as the clock/dashboard. A server-owned optional `readSchedule(subject)` callback receives only the verified manager subject; absent approval/backend integration it returns HTTP **503** after authentication, anonymous access returns 401, and raw club/tenant URL parameters are not recognized. Responses go through the strict source-informed Overview projector; malformed backend data fails closed. **This route is disabled by default because `scripts/run-uranius-hosted-smoke.mjs` does not provide a readSchedule callback**; it is not player-facing deployment.

Added `tests/uraniusOverviewScheduleRouteIsolation.test.mjs` with A/B, origin/method/URL-tenant/logout and malformed reader assertions; execution **pending**.

Added `database/reconstruction/overview/012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql` and `tests/uraniusOverviewReaderPrivilegesReview.test.mjs`. This **ROLLBACK-only** policy candidate separates global world races/stages from owner-private race preparations and accepted entries, grants only specific SELECT columns to the existing restricted server reader, and uses `get_my_club_id()` for owner checks. Both code and permission tests **not yet executed**. In particular, native PG17 policy semantics, role membership, deny-by-default and safe read path must pass before building any installable migration or setting reader flags. No hosted permissions or production data changed.

## Owner seven route and ACL static checks passed; native role test pending (2026-11-23)

Owner's Windows console: `node --test tests\\uraniusOverviewScheduleRouteIsolation.test.mjs tests\\uraniusOverviewReaderPrivilegesReview.test.mjs` **7/7 PASS**, 0 failures, 0 skipped. This confirms A/B session routing and 012 static review only.

New `tests/uraniusOverviewReaderNativePg17.mjs` uses the owner's portable PostgreSQL 17 executable in a **fresh loopback-only disposable PGDATA**. It replays original rollback-only 010 and 012 files without persistence, then installs only inside the disposable instance to test actual native role privileges, RLS, owner A/B upcoming schedule separation, global today race visibility, anonymous and authenticated denial, reader write denial, and complete cleanup. Fixture `get_my_club_id()` is a **disposable mock** derived from a test-only setting, not equivalent to the real Uranius Auth/JWT resolver: a later full 001–009 replay against the original owner mapping is still required before any hosted migration.

This new native file **has not yet been run**. Do not count native RLS as passed until owner reports a clean PostgreSQL 17 run. It changes no hosted schema or role.
