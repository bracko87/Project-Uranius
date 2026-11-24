# U5.03 / U5.02 — Squad first-paint reconstruction: source-to-sandbox gap
Date: 2026-11-24. Status: SOURCE_AUDIT_ONLY — no hosted SQL changes, API grants, Auth mutations, game engine operations, or production modifications.

## Milestone decision

The **limited authenticated Overview schedule** is finished: Migration 010 installed; local browser screenshots show both owner clubs; live manager A/B secure reader responses PASS; 21/21 populated A/B tests in disposable PostgreSQL PASS. Do not reopen it. The broader **U5.02 database reconstruction remains BLOCKED**, **U5.03 full synthetic world remains IN_PROGRESS** as tracked by `MASTER_CHECKLIST.md`; the 49/60 full-project task count must not be increased because a partial Overview slice does not satisfy either task's full acceptance contract.

Next vertical: **Squad first-paint read model**, without enabling transfers, training, medical changes, financial writes, squad movement or fictitious profile attributes.

## Authoritative original page contract — inspected source

`src/pages/dashboard/Squad.tsx`, `loadSquadPageData`:
1. Resolves `supabase.auth.getUser()`, `get_current_game_date` and optional `get_my_premium_status`.
2. Finds an owned main `clubs` row by `owner_user_id` and `club_type='main'`; developing team fallback/status is a distinct optional path.
3. First-paint read is `public.club_roster`, scoped by `club_id`, ordered by `overall DESC`, selecting **`club_id, rider_id, display_name, country_code, assigned_role, age_years, overall, availability_status, fatigue`**.
4. Only after displaying this roster does the page request `get_club_squad_season_dashboard_v1`, `get_club_health_overview`, international points, transfer listings and detailed rider data.
5. `src/features/squad/types.ts` confirms exact original rider roles, availability statuses, broader rider details and developing-team contract. A synthetic partial roster must not masquerade as `ClubRosterRow`.

## Live isolated Supabase metadata — read-only audit

Project **sdtsivgtcaoaeoihcwzd**, schema `uranius_catalog.riders` contains exactly:
`rider_id integer, team_id integer, label text, flat smallint, climbing smallint, stamina smallint, resistance smallint`.
The current synthetic catalog has **200 riders**; the two Auth-owned synthetic teams have **10 each**. Existing rider RLS policy `riders_read` filters via `team_owners.team_id` and verified `request_uid()`. `uranius_smoke_reader` has only column SELECT on **`rider_id`**, not `team_id`, `label` or the four skills; no full-table SELECT. Existing `uranius_game.clubs` invoker view and `get_my_club_id()` provide owner-bound club identity. There is no `public.club_roster` nor `club_riders`/rider daily activity equivalent in the isolated schemas, and none of the sampled Squad RPCs exists except the game-date function.

**Do not invent or infer**:
- rider UUID (synthetic rider_id is INTEGER, not a compatible original UUID)
- age, role, overall, fatigue, availability, country, first/last name, morale, potential or contract values
- season dashboard, health, premium, transfer, developing-team or movement states
- all 200 catalog riders as a club's owned roster (the dashboard's earlier 200-rider count was **global**, not an owned roster count)

## Proposed limited reader contract (not approved for hosted execution)

A **separate verified server session** can bind the Auth subject, resolve its owned `club_id` and its mapped `team_id` via `club_profiles`, and read **only** a RLS-filtered list of `(rider_id, label, flat, climbing, stamina, resistance)`. This is **synthetic Squad preview only**, not the original `club_roster` API. Never guess the missing original fields. Future strict client output must name its own shape (`syntheticSquadPreview`) and label unknown fields as unavailable.

A later reviewed, hash-pinned **isolated-only** schema/ACL migration could grant the seven required rider columns (`rider_id`, `team_id`, `label`, `flat`, `climbing`, `stamina`, `resistance`) with column-level grants; `team_id` is required for the reviewed owner-scoped join, and must not be returned to the browser. The database enforces ownership through the already-existing riders RLS policy. Deny anon, ordinary public clients and writes; no broad table SELECT and no `SECURITY DEFINER` function. Test with disposable PostgreSQL 17 and verified A/B + unknown Auth subject, negative writes and wrong-role guards, then seek separate **explicit owner approval** for exact digest before any hosted change.

## Current action

Prepared a review-only SQL query and a strict synthetic preview projector/tests. **No runner activation**, no new database role grants, no public endpoint, no hosted records or migrations changed. Recheck the SQL against exact existing role ACLs and original source before preparing a formal permission manifest.
