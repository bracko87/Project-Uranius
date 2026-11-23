# U5.02 / U5.03 — Original Overview race schema dependency review

Date: 2026-11-23. Scope: read-only GitHub/source analysis; **not a migration and not an execution approval**.

## Original sources inspected

- `src/pages/dashboard/Overview.tsx` lines 1943-1952, 2005-2185, 2343-2396, 2440-2475: consumer, submitted-status filter and fast first-paint RPC `get_overview_race_schedule_v1(p_club_id)`.
- `reference/database/20260929184838_baseline_05a_primary_unique_check.sql.txt`: recovered PRIMARY KEY, UNIQUE and CHECK rules below.
- `reference/database/20260929184852_baseline_05b_foreign_keys.sql.txt`: recovered FK graph below.
- `reference/database/20260929185019_baseline_09_rls_policies.sql.txt`: historical access policies below.
- The retrieved baseline fragments are **not enough** to reconstruct full CREATE TABLE column definitions, column defaults or a final authoritative RPC signature/body. Later migrations may override the baseline. This report must not be used to invent missing fields.

## Primary keys and relationship boundaries

| Table | Primary key | Essential original relationships |
| --- | --- | --- |
| races | id | country_code -> countries(code); start/end date validity |
| race_stages | id | race_id -> races(id); host_country_code -> countries(code); UNIQUE(race_id, stage_number) |
| race_team_entries | id | club_id -> clubs(id); participating_club_id -> clubs(id); race_id -> races(id) |
| race_preparations | id | club_id -> clubs(id); participating_club_id -> clubs(id); race_id -> races(id); race_team_entry_id -> race_team_entries(id); default_equipment_setup_id -> club_equipment_setup_presets(id); finance_transaction_id -> finance.transactions(id); UNIQUE(race_id, club_id) |

The sandbox currently has `uranius_game.club_profiles` mapping club UUID -> integer team, not original `public.clubs`. A race SQL replay against the synthetic schema would therefore be invalid without a separately reviewed compatibility mapping. Original preparatory costs, staff, assets, equipment and finance links cannot be casually discarded when enabling actual race preparations.

## Verified original constraints and conflict

- `race_preparations.status` baseline permits draft/submitted/locked/auto_defaulted/missed_startlist/sent_to_engine/cancelled.
- `race_preparations.startlist_status` baseline permits draft/submitted/locked/auto_defaulted/missed_startlist.
- Original Overview client also recognizes `finalised` / `finalized` as a *read-side compatibility predicate*; those values are **not in the inspected baseline CHECK constraints**. Do not broaden database accepted values solely to match the frontend.
- `race_team_entries.status` baseline requires a nonempty string, not a closed enum. Its state transitions must be traced separately.
- `races.status` baseline includes draft/scheduled/active/completed/cancelled/archived; race dates enforce end_date >= start_date.
- `race_stages` baseline enforces stage_number > 0, distance > 0, terrain percentages ~100%, supported terrain/finish types, and stage start minute granularity.

## Security boundary (requires redesign, not blind copy)

Historical baseline policy at `baseline_09_rls_policies.sql.txt:838` is `SELECT to anon, authenticated USING (true)` for race_team_entries. **Do not deploy it into Uranius's owner-private management surface**. Another policy at line 889 allows authenticated select on race_preparations using `can_read_club_v1(club_id)`; that helper has not yet been reconciled with the sandbox's verified identity and RLS. Use original policy as audit evidence, not as authorized SQL.

For Uranius, first prove owner identity server-side; keep the initial accepted-entry read private to the owner. No anonymous SELECT, no broad role membership, no Security Definer shortcut and no Data API exposure changes. Future globally published races may need a separately designed public projection, distinct from private applications/preparations.

## Verified state and next gate

- User's Windows tests of the offline accepted-entry and schedule response models **16/16 PASS**.
- Isolated hosted Supabase metadata and READ ONLY SQL confirm missing `races`, `race_stages`, `race_team_entries`, `race_preparations` in both Uranius app schemas.
- Still missing: authoritative original CREATE TABLE DDL for all four tables, later migrations, the exact `get_overview_race_schedule_v1` function body, status transition behavior, and an approved UUID club model.
- Next: locate missing DDL and later overrides from the reviewed source corpus or a separately authorized **read-only metadata-only** original-system inspection; do **not** copy player data. Then build a minimum compatible PostgreSQL 17 fixture, review constraints and owner-only ACL/RLS, and test before proposing an explicit sandbox migration.
- No database writes, hosted schema changes, worker/scheduler activation, production changes or public deployment have been performed in this work.
