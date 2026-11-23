# Project Uranius — Candidate 008: frozen synthetic game-clock contract

**Status: REVIEW-ONLY — NOT AUTHORIZED FOR HOSTED EXECUTION.**

Target: `sdtsivgtcaoaeoihcwzd`, PostgreSQL 17.
Existing migration ledger **must stay at 7 entries** until explicit owner approval and successful native PostgreSQL rehearsal.
The isolated, public Uranius repository contains **no secret key, password or production credential** for this package.

## What was verified

The original React consumer signatures:
- `src/pages/dashboard/Overview.tsx` calls `get_current_game_date_date()`.
- `src/pages/dashboard/CalendarPage.tsx` calls `get_current_game_date_date()` and `get_current_game_date_parts()`.
- `src/pages/dashboard/Squad.tsx` calls `get_current_game_date()`.

The later sanitized baseline SQL `reference/database/20260929184613_baseline_04_sql_dump_001_120.sql.txt`, around lines 439–486, implements these functions from one `game_state` row, using `game_date_from_parts` and `game_year_from_season`. The original year calculation is **2000 + season_number − 1**. The earlier `current_date` stub in baseline 01b is **not** authoritative. Other archived functions (including a public clock anchor) refer to pause and speed settings.

Live read-only Supabase inspection confirmed that the Uranius sandbox has:
- Seven applied migrations (001–007), 20 teams, 200 riders, two manager mappings and a restrictive server-side smoke reader.
- A three-stage fixture world with season days 7, 8 and 9.
- **No `uranius_game.game_state` and no accepted race-team-entry relations.** No live clock RPCs.

The full original `game_state` creation DDL and `get_overview_race_schedule_v1` implementation are **not** present in the sanitized inventory. Therefore the proposed table is an intentionally reduced, paused sandbox **test clock**, not a claim that full production clock behavior has been reconstructed.

## Candidate artifacts

- `008_game_clock_v1.sql`: creates one RLS-protected, paused, non-advancing synthetic clock and the three original read RPC signatures. Dates are backed by fixed `game_state`, not `current_date` or JavaScript time.
- `manifest.json`: explicitly unapproved candidate with exact seven prerequisite ledger hashes.
- `../../../tests/uraniusGameClockMigrationPreflight.test.mjs`: offline static guard test for source hash, project pinning, permissions, role prerequisites, legacy RPC signatures, and prohibition on scheduler/writer access.
- `../overview/game-clock-contract.mjs` and `../../../tests/uraniusGameClockContract.test.mjs`: offline behavior mapping and fixture schedule fail-closed checks.

Canonical SQL SHA-256:

```text
f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b
```

The candidate migration does not insert into `migration_ledger`: a *separately reviewed atomic* owner-context management statement must do so with this canonical hash, preserving the exact original membership and fixture data.

## Design and intended access

- Initialize only `Season 1, 2000-01-01 00:00`, `is_paused = true`.
- `CHECK (is_paused)` forbids unpausing the fixture state, including accidentally by a future worker.
- Fixed `id = true` singleton and PostgreSQL `make_date` validity check.
- `get_current_game_date_date()`: `date`.
- `get_current_game_date_parts()`: `(current_game_date date, season_number int, month_number int, day_number int)`.
- `get_current_game_date()`: `(season_number int, month_number smallint, day_number smallint)`.
- All three functions `STABLE SECURITY INVOKER`, schema-qualified reads; no `SECURITY DEFINER`.
- Owner-backed table RLS and explicit `authenticated` read-only privileges. No table writes granted, no `anon` or smoke-reader grants.
- Does **not** change existing grants/policies, Data API exposed schemas, Auth, storage, external jobs or original ProPeloton Manager.

**This does not make the original React Overview render:** the Data API remains unexposed by design, and the Overview still needs header, finance, accepted race schedule and other contracts. The correct server-only UI adapter must be separately verified. Do not silently substitute a fixture calendar for an accepted race schedule.

## Verification state

The two committed Node test files were executed against matching source blobs: **16/16 tests passed** (nine game-clock behavior tests and seven migration/preflight tests). The original 008 SQL SHA-256 and the native runner's Git blob SHA were independently matched to the repository. The new native PostgreSQL 17 runner passed JavaScript syntax checks and fail-fast invocation/path checks, but **the actual PostgreSQL 17 database rehearsal has NOT run** because no PostgreSQL server binaries are installed in the assistant's local environment. The original full-game browser integration is also pending. Do not treat static/Node tests as deployment acceptance.

To run the static tests in a local verified Uranius checkout:

```cmd
node --test tests\uraniusGameClockContract.test.mjs tests\uraniusGameClockMigrationPreflight.test.mjs
```


### Disposable native PostgreSQL 17 rehearsal runner

Added [`tests/uraniusClockNativePg17.mjs`](../../../tests/uraniusClockNativePg17.mjs) for the next verification gate. It does not use any existing database server, Supabase credentials, public ports or production data. It requires the `--disposable-native-pg17` guard; checks the portable PostgreSQL 17 binary versions and SHA-256 of all seven canonical historical migrations; creates a unique temporary local PostgreSQL cluster on `127.0.0.1` with a randomized port; replays 001–007; binds two fictional UUIDs; tests 008 against forced rollback, wrong project, ledger drift, wrong execution role, authenticated manager A/B and unrelated-user RLS, anonymous/smoke reader rejection, write/unpause/invalid-date denial and duplicate-apply rejection. The fixture cluster is stopped and discarded. Local trust authentication is used ONLY inside that disposable loopback cluster and MUST NEVER be used on the hosted project.

From Windows Command Prompt in the project checkout (the portable binaries already used for earlier 007 rehearsals):

```bat
node tests\uraniusClockNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

This runner was authored and syntax-checked, **not yet executed against PostgreSQL 17**. Preserve its actual console output as the acceptance artifact before updating the checklist. Any SQL failure must be fixed in a new reviewed version with an updated candidate SHA, never applied to the live sandbox while unresolved.

### Mandatory before any approval request

1. Run `008_game_clock_v1.sql` under a *disposable*, non-superuser PostgreSQL 17 fixture after replaying the seven canonical migration sources, and exercise both manager claims plus anon/reader denial and the three original RPC output shapes. Add a non-leap invalid-date and a rejected clock unpause/write test.
2. Test wrong project, ledger drift, duplicate 008, and forced failure after schema creation to prove rollback.
3. Prepare and review a **single-transaction management-connection statement** preserving `postgres`→`uranius_migrator` membership exactly like 007. This SQL does not currently include such a wrapper.
4. Verify privilege/RLS advisor state and zero changes to game fixture records; prepare target-pinned rollback and retirement steps.
5. **Request explicit owner approval for exact manifest/SQL SHA before any hosted DDL**, role permission, Data API exposure, new account, schedule or worker change.

U5.02 still BLOCKED on broader schema reconciliation; U5.03 still IN_PROGRESS until full cloned Overview/Squad/Calendar is actually exercised; progress remains **49/60**.
