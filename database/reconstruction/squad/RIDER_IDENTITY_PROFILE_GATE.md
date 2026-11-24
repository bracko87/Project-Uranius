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
