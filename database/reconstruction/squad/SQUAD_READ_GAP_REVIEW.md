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

## Delivered source-only artifacts

- `database/reconstruction/squad/013_synthetic_squad_preview_REVIEW_ONLY.sql` — candidate fixed, owner-scoped **read-only** SQL under restricted TLS reader; it cannot run successfully on hosted Uranius with current column privileges and is **not approved** for live execution.
- `database/reconstruction/squad/synthetic-squad-preview.mjs` — strict projection for synthetic integer rider IDs and actual stored attributes only; explicitly rejects fabricated original-game fields.
- `tests/uraniusSquadPreviewReview.test.mjs` — five standalone source-contract tests for owner binding, original-field non-invention, malformed/duplicate row denial, restricted reader SQL and source gap.

These tests have **not** been run on the owner's Node environment. Execute:

```bat
git pull origin main
node --test tests\uraniusSquadPreviewReview.test.mjs
```

This is a **review milestone**, not a real Squad frontend feature. The existing login and Overview smoke interface stay unchanged. The current owner-scoped restricted role has `rider_id` SELECT but is missing `team_id, label, flat, climbing, stamina, resistance`; implementing any hosted Squad preview requires a separately approved exact-grant migration and disposable PostgreSQL 17 A/B coverage.

## Read-only aggregate validation for preview field bounds

A hosted `BEGIN READ ONLY` aggregate check (no rider identities or rows exported) confirmed:
- 200 catalog riders, no duplicate `rider_id`, longest synthetic label 17 characters.
- `flat` and `climbing`: min 50 / max 95.
- `stamina` and `resistance`: min 55 / max 95.

All observed values fit the projector's strict 0–100 skill range and 150-character label maximum. These aggregates validate the **current synthetic catalog only**, not the legacy original Squad attribute scale or broader gameplay rules.

## 2026-11-24: 5/5 source-review tests PASS; restricted grant preview staged

The owner reran `node --test tests\\uraniusSquadPreviewReview.test.mjs`: **5/5 PASS, zero failures** after correcting test-only JavaScript regular-expression escaping. This proves the projector contract and SQL static review gates, **not PostgreSQL execution**.

Prepared `013_squad_reader_acl_DISPOSABLE_REVIEW_ONLY.sql`: **rollback-only, NOT APPROVED for hosted execution**. It guards direct `uranius_migrator` session, PostgreSQL 17, 10-entry ledger with the approved 010 candidate digest, RLS on synthetic riders, restricted reader role attributes, absent current reader permissions on `team_id` and `label`, and absence of broad reader write/privileged access. It temporarily grants **exactly six missing rider columns** (`team_id,label,flat,climbing,stamina,resistance`) to the existing restricted reader, retaining pre-existing `rider_id` grant, asserts seven columns are available and full-table reads, anon reads and writes stay denied, then **ROLLBACKs**. It has no new table, function, API access, policy, role, row or ledger writes that survive the transaction. No project-identity bypass and no authorization for live use is implied.

Added `tests/uraniusSquadReaderAclReview.test.mjs` (four source-only checks). These newly committed tests have **not yet been executed** by the owner or against disposable PG17. Next:

```bat
git pull origin main
node --test tests\uraniusSquadPreviewReview.test.mjs tests\uraniusSquadReaderAclReview.test.mjs
```

**Do not execute the SQL file against hosted Uranius** even though it rolls back: the planned direct role preconditions and exact ten-entry history still need a native PostgreSQL 17 dry run with populated A/B RLS. Any forward-only grant migration requires a separate reviewed installation manifest/hash and the owner's explicit approval. No new credentials or Supabase writes are needed for the next offline check.

## Native PostgreSQL 17 Squad rehearsal (new; owner execution pending)

The owner confirmed **9/9** source and SQL security-static checks passing on Windows, 2026-11-24.

New test: `tests/uraniusSquadReaderNativePg17.mjs`, based on the already-owner-tested combined 001–010 disposable PostgreSQL 17 fixture. It creates and removes its own loopback PostgreSQL data directory, replays the actual source migrations and checks their exact digests, and then exercises the Squad candidate. It first verifies the original rollback-only ACL source persists **no privileges**, then checks that labels are still denied; applies the same ACL **only inside disposable PGDATA**; checks reader column access but no full-table, write or anon access; confirms the original TLS-only read query **denies non-TLS connections**; uses a narrowly in-memory TLS-bypass **only for local mock session authorization testing**; and verifies ten distinct rider records for each of A and B, no cross-owner IDs and denied unknown subjects. The full original 010 ledger and 200 riders are checked after all tests.

This runner intentionally cannot reach remote services: no hosted DSNs, no app secrets, no Supabase clients, and all subprocesses connect to `127.0.0.1` on the disposable PostgreSQL port. It replays the existing 21-check source fixture and adds seven Squad assertions, so expect **28 checks** if everything passes. It is **not yet native-executed**.

From the already-used Windows checkout:

```bat
git pull origin main
node tests\uraniusSquadReaderNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

If this test fails, stop and inspect the exact failed assertion and cleanup report. Do not apply either 013 SQL review file to hosted Uranius. Native test success is the **only** next prerequisite for designing a separate forward-only, owner-approved exact-hash hosted migration.
