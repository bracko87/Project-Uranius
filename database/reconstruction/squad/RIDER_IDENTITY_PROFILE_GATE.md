# Uranius — Rider identity & detailed profile reconstruction gate
Date: 2026-11-24
Status: SOURCE MODEL REVIEW + SYNTHETIC READ-ONLY PROFILE IMPLEMENTED IN CODE; NOT THE ORIGINAL RIDER IDENTITY.

## Observed source contract (from the original copied source in this repository)

- `src/pages/dashboard/Squad.tsx` reads `public.club_roster` as club-scoped data. The first-paint roster includes `club_id, rider_id, display_name, country_code, assigned_role, age_years, overall, availability_status, fatigue` and orders by `overall` descending.
- `src/features/squad/types.ts` specifies `ClubRosterRow.rider_id: string` and detailed `RiderDetails.id: string` with country/name/birth/role, nine performance skills (`sprint,climbing,time_trial,endurance,flat,recovery,resistance,race_iq,teamwork`), morale/potential, overall and optional health and economic fields.
- The original page subsequently calls its season dashboard, health overview and rider details. Those calls are *not* reconstructed by the current synthetic profile view.

## Hosted isolated Uranius verification (metadata only, READ ONLY)

Project `sdtsivgtcaoaeoihcwzd` table `uranius_catalog.riders` contains exactly seven columns:
`rider_id integer, team_id integer, label text, flat smallint, climbing smallint, stamina smallint, resistance smallint`.
`uranius_catalog.team_owners` maps `team_id integer` to `user_id uuid`, and the existing `uranius_game.clubs` exposes club `id uuid`, owner and club display metadata. There is currently **no source-backed relationship to produce a UUID for each synthetic rider**.

The installed Migration 013 permits the dedicated reader to select six rider columns, deliberately **excluding team_id**, and uses the preexisting authenticated `riders_read` RLS ownership predicate. Do not reinterpret `uranius_catalog.riders.rider_id` as the UUID expected by the original `public.club_roster`.

## Scope delivered in this step

1. `database/reconstruction/squad/synthetic-rider-profile.mjs`: a frozen read-only profile projector that *requires* the verified A/B owner-scoped Squad packet and a selected synthetic integer rider ID **present within that packet**; rejects foreign/nonexistent IDs, invalid row shapes, duplicate IDs and fabricated original fields.
2. `database/synthetic-world/hosted-smoke-client.tsx`: a user may click a rider name in the already authenticated Squad roster to expand only their stored label and four authentic skill values. It explicitly marks the integer ID as synthetic, lists original-game data as unavailable and provides no edit controls, write API or deep link to the original rider page.
3. `tests/uraniusSyntheticRiderProfile.test.mjs`: four projector checks; `tests/uraniusRiderProfileFrontendBoundary.test.mjs`: two source boundary checks. **Six new tests, not yet executed on the owner's machine.** Existing React bundle test also needs re-run after the JSX change.

## Why the original rider identity cannot yet be populated

To add original-equivalent profiles, the isolated Uranius database needs a separately designed **synthetic-only** UUID rider identity and owner-bound membership model (or a legitimately permitted original-source dataset approved for transfer). UUIDs must never be derived from integer rider IDs by formatting or guessing, and original identity / age / nationality / fitness / contracts must never be invented. An independent exact schema design, validation tests and approval gate are required before hosted migrations. Nothing in this milestone authorizes copying players out of the original production database.

The next original-data planning phases are:

| Phase | Required new contract | Current state |
|---|---|---|
| A | Internal rider UUID and identity mapping (generated only in isolated synthetic world), stable uniqueness and owner-scoped membership | NOT DESIGNED / NO HOSTED CHANGE |
| B | Synthetic profile attributes with explicit source/provenance and strict validators; support original nine-skill model only when populated | NOT IMPLEMENTED |
| C | Original `club_roster` read API compatibility, scoped club row and RLS tests | NOT IMPLEMENTED |
| D | Season, health, contracts and rider actions | BLOCKED; no writes |

The existing browser-accepted ten-rider A/B Squad first paint **remains closed** and unchanged. Project-wide U5.02 / U5.03 progress should not be inflated.

## Immediate offline checks

```bat
git pull origin main
node --test tests\uraniusSyntheticRiderProfile.test.mjs tests\uraniusRiderProfileFrontendBoundary.test.mjs tests\uraniusSquadHostedBundle.test.mjs tests\uraniusSquadRouteIsolation.test.mjs
```

These tests do not contact Supabase or change database permissions. **No new browser trust installation is necessary for this source review.**

## 2026-11-24 — Phase A design candidate: isolated synthetic UUID mapping (014)

Read-only hosted PostgreSQL 17 metadata audit verified:
- `uranius_catalog.riders` has an integer `rider_id` primary key and an integer `team_id` foreign key; **200 rows**.
- `pg_catalog.gen_random_uuid()` is available.
- The isolated migration ledger has **11 rows**, including verified `013_squad_reader_grant.sql` SHA-256 `8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859`.
- No existing rider identity mapping table was found in `uranius_game`.

Prepared **`014_synthetic_rider_uuid_REVIEW_ONLY.sql`**, which is an **unapproved design candidate, not an installed migration**. Its proposed schema is a separate `uranius_game.synthetic_rider_identity` table:
- `rider_id integer PRIMARY KEY REFERENCES uranius_catalog.riders(rider_id) ON DELETE RESTRICT`, retaining canonical synthetic identity.
- `rider_uuid uuid NOT NULL UNIQUE DEFAULT pg_catalog.gen_random_uuid()`, unrelated to, and not represented as, a real original-game player ID.
- Locked `identity_provenance='uranius_generated_synthetic'`, `created_at`.
- Exactly **200** mapping rows generated from the existing riders, with count, uniqueness, nonzero UUID and referential integrity checks **before enabling FORCE RLS**. This check order matters because FORCE RLS then prevents even the migrator/table owner from reading rows without a policy.
- **FORCE ROW LEVEL SECURITY**, **no SELECT policies**, and explicitly revoked `PUBLIC`, `anon`, `authenticated`, and `uranius_smoke_reader` privileges. No Data API access, profile endpoints, changes to existing riders, or gaming actions are proposed.
- Direct restricted migrator, isolated-project, PostgreSQL 17, exact 013 ledger digest, 11-ledger, row counts and TLS guards. This candidate is deliberately not atomic/approved by itself; a future reviewed installer would be required to wrap it in a single verified transaction, exact-hash owner approval and rollback-on-failure.

This model is the *foundation for future original-compatible identity handling*, **not a replacement for `public.riders` or `public.club_roster`**. It does not backfill original names, dates of birth, countries, roles, skills, finance or health. No player data was read from or copied out of production.

New unexecuted tests and review:
- `tests/uraniusRiderUuidMappingReview.test.mjs` (four static guard checks).
- `tests/uraniusRiderUuidMappingNativePg17.mjs` (nine self-contained disposable PostgreSQL 17 checks; synthetic setup only, TLS bypass in temporary fixture solely to prove remaining guards). PostgreSQL binds `127.0.0.1` and scratch PGDATA must be cleaned up.
- `scripts/review-uranius-rider-identity.mjs --review` prints a SHA-256 without contacting the database or having an apply mode.

**Owner check to run, all offline:**

```bat
git pull origin main
node --test tests\uraniusRiderUuidMappingReview.test.mjs
node scripts\review-uranius-rider-identity.mjs --review
node tests\uraniusRiderUuidMappingNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

**Release gate remains CLOSED.** Do not execute 014 SQL against isolated hosted Uranius or original production. Only after source and native checks pass should a separately frozen candidate/manifest and an exact owner-approved guarded installer be considered. Existing completed 013/Squad browser preview, 11 migrations and gameplay are unchanged.
