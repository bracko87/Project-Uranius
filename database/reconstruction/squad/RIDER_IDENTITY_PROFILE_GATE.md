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

## 2026-11-24 — Owner verified 014 preliminary tests; exact manifest freeze

Owner-provided Windows terminal output confirms **4/4 source checks and 10/10 disposable PostgreSQL 17 tests PASS**, with disposable PGDATA removed. The offline source digest is `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`. These tests prove the proposal under a small synthetic disposable fixture; they do not prove a hosted installation or full replay of existing 001–013 migrations.

Prepared `014_install_manifest_REVIEW_ONLY.json` with the *unchanged* tested SQL digest, project ID, expected 11 ledger entries and **all eleven exact version/hash prerequisites** from the previously frozen 013 history (001–010 plus installed 013), and recorded the explicit approval-required status. Strengthened `scripts/review-uranius-rider-identity.mjs --review` to reject source SHA mismatch, reordered/missing/altered historical ledger prerequisites, or unexpected scope. Added four new `tests/uraniusRiderUuidManifestFreeze.test.mjs` checks.

**This is only source review, no authorized installer.** Neither frozen manifest nor offline hash reviewer is permission to install. The future installer must compare all 11 historical ledger version+hash pairs *against hosted state inside the transaction*, as the candidate 014 preflight itself currently checks only the total count and the 010/013 digests. It must also verify private table ownership, no public role privileges, FORCE RLS, exactly 200 persisted UUID mappings before row reads become denied by FORCE RLS, and ledger 12th row insertion atomically. This is a **separate implementation and owner approval gate**.

Next safe offline commands:

```bat
git pull origin main
node --test tests\uraniusRiderUuidMappingReview.test.mjs tests\uraniusRiderUuidManifestFreeze.test.mjs
node scripts\review-uranius-rider-identity.mjs --review
```

The new tests have not yet been run by the owner. No production or isolated hosted SQL was modified.

## 2026-11-24 — Owner verified 014 frozen review and guarded installer prepared

Owner confirmed **8/8 static review checks PASS** and the standalone offline review printed exact candidate digest `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f` and manifest SHA-256 `620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62`, with eleven historical prerequisites.

Added `scripts/apply-uranius-rider-identity.mjs`. Review mode never connects to a database. Its separately gated apply mode (NOT AUTHORIZED) requires the exact frozen manifest digest, same exact source hash, prior frozen 013 hash history, strict target guard for `db.sdtsivgtcaoaeoihcwzd.supabase.co:5432` and direct `uranius_migrator`, verified full TLS CA, one `psql --single-transaction` batch, **bidirectional equality of all eleven original migration version/hash pairs**, unchanged 014 SQL, atomic twelfth ledger record and postflight verifying private FORCE RLS, no public/reader mapping reads or writes, preserved 200 rider records, two owner bindings and frozen game clock. Errors are classified without leaking database password. Added `tests/uraniusRiderUuidGuardedInstaller.test.mjs` (four static security tests; unexecuted). None of this changes the original tested 014 candidate or the frozen manifest hashes.

**Do not run any apply mode** until separate explicit owner consent for the two exact digests, a successful disposable end-to-end installer rehearsal against the full historical fixture (including installed 013), and independent hosted read-only preflight. Full original gameplay Squad reconstruction remains incomplete.

Safe local checks:

```bat
git pull origin main
node --test tests\uraniusRiderUuidMappingReview.test.mjs tests\uraniusRiderUuidManifestFreeze.test.mjs tests\uraniusRiderUuidGuardedInstaller.test.mjs
node scripts\apply-uranius-rider-identity.mjs --review
```

## 2026-11-24 — Native full-history 014 rehearsal prepared

Owner confirms **12/12 security/freeze/installer source tests passed**, with unchanged exact hashes (candidate `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`, manifest `620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62`). The guarded installer was only executed in `--review` mode, so nothing was applied.

Added `tests/uraniusRiderUuidFullHistoryNativePg17.mjs`, based on the previously owner-passed 28-check native PG17 Squad fixture (not a new minimal schema). It replays canonical 001–010 with real populated A/B data, rehearses exact 013 with its original preflight and explicit local-only TLS guard substitution, then records 013 in the *disposable* ledger. It compares the entire eleven-element 014 manifest against the actual disposable ledger, checks deliberate earlier hash tampering is rejected, verifies unaltered 014 refuses non-TLS and unauthorized execution, executes 014 with only its TLS predicate substituted in-memory, then verifies 200 unique UUIDs, referential/provenance integrity, FORCE RLS, denied public/reader privileges, preserved original catalog/clock and duplicate-install denial. All PGDATA is disposable, bound to `127.0.0.1`; no hosted connection paths. Also added three static fixture boundary tests. **These latest tests are unexecuted**.

Run:
```bat
git pull origin main
node --test tests\uraniusRiderUuidFullHistoryBoundary.test.mjs
node tests\uraniusRiderUuidFullHistoryNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Caution: this native test evaluates the **reviewed 014 SQL** against the complete synthetic 001–013 fixture; it does not yet execute the CLI installer as a real hosted transaction. That last separately-approved application step and independent read-only hosted verification remain outstanding. No change to either frozen 014 digest. Do not run `--apply-approved-014` yet.

## 2026-11-24 — Full-history native acceptance + independent hosted read-only preflight PASS

Owner supplied terminal output for **3/3 full-history boundary tests** and **40/40 full-history disposable native PostgreSQL 17 checks**, with all temporary PostgreSQL files cleaned up. Native rehearsal replayed 001–010, exercised the existing 013 candidate, compared all 11 historical fingerprints in both directions, rejected a simulated earlier fingerprint mismatch, rejected non-TLS and wrong-user attempts, generated all 200 synthetic UUIDs, checked uniqueness and FK/provenance mapping, verified FORCE RLS access denial, preserved paused clock and owner state, and rejected duplicate application. **No hosted data changes.**

Independent hosted Uranius project `sdtsivgtcaoaeoihcwzd` was inspected using `BEGIN READ ONLY` / `ROLLBACK` on 2026-11-24. Results:
- Custom ledger count **11**, exact equality with frozen eleven version/digest pairs **true**.
- `uranius_game.synthetic_rider_identity` table absent (**true**).
- 200 synthetic riders, 2 synthetic owner mappings, 1 paused Season 1 Day 1 game-state row.
- Existing `uranius_catalog.riders` RLS enabled; its dedicated `riders_read` owner policy exists.
- Anonymous rider read denied; restricted reader `team_id` read denied.

**Final status: ready for separate explicit OWNER APPROVAL of exact manifest SHA-256 `620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62` and exact candidate SHA-256 `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`, for *isolated Uranius only*. Neither hash nor manifest has been changed. Not installed. The on-disk guarded installer `scripts/apply-uranius-rider-identity.mjs` is prepared, but the approved-hosted apply path has not been end-to-end executed; therefore direct TLS credentials and final independent postflight must still be verified if approved. Do not claim original rider identities have been reconstructed: only generated synthetic UUID mapping is in scope.

## 2026-11-24 — Explicit owner authorization of 014; secure local execution handoff

Owner explicitly approved **only** isolated project `sdtsivgtcaoaeoihcwzd`, exact candidate SHA-256 `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`, and manifest SHA-256 `620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62`. Original ProPeloton production expressly excluded. Owner approval covers the previously frozen SQL, not unreviewed changes.

**Execution state: NOT YET EXECUTED.** The connected Supabase administrative SQL tool does not provide a direct `uranius_migrator` login/TLS session, which is mandatory in the approved SQL. Do not bypass the `session_user=current_user='uranius_migrator'` guard by using an administrative connection or relaxing the frozen candidate.

Added `scripts/run-approved-rider-014-windows.ps1`, adapted from the previously used strict Squad 013 Windows launcher. It validates PostgreSQL 17 and the CA path, runs frozen 014 installer `--review` *before* credential requests, requires local confirmation text `APPLY URANIUS 014`, prompts for private `uranius_migrator` password as a hidden SecureString and invokes `--apply-approved-014` with the previously approved manifest hash. The installer enforces direct pinned TLS, exact migration hashes, full historical bidirectional ledger comparison, single transaction and postflight. Environment credentials are cleared afterward and no automatic retry is allowed. Three static launcher tests were added; owner execution is **not yet confirmed**.

Owner command (run inside local `.uranius-upload-review` checkout; password entered locally, NEVER in chat):

```bat
git pull origin main
node --test tests\uraniusRider014ApprovedWindowsLauncher.test.mjs
powershell -NoProfile -File scripts\run-approved-rider-014-windows.ps1 -CaFile "%USERPROFILE%\Downloads\prod-ca-2021.crt" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin" -ApprovedManifestSha256 "620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62"
```

Only if the guarded installer returns success may the assistant run **independent read-only hosted verification**: exact twelve ledger entries, 014 hash, table row count/unique UUIDs (readable through privileged Supabase metadata), FORCE RLS and no anonymous/auth/smoke reader mapping privileges, unchanged 200 synthetic riders and two owners, paused game clock. If execution fails, inspect hosted state before any retry. Do not declare installation complete based on owner approval alone.

## 2026-11-24 — Migration 014 INSTALLED and independently VERIFIED

Owner supplied direct TLS `uranius_migrator` guarded Windows installer output reporting a completed single-transaction Migration 014 after an explicit exact-hash approval. The launcher ran 3/3 static checks and the frozen 014 review, and all steps succeeded. No database password was shared with the assistant.

Independent hosted **READ ONLY** postflight on isolated project `sdtsivgtcaoaeoihcwzd` verified:
- **12/12 exact historical migration version/hash pairs**, including `014_synthetic_rider_uuid.sql` digest `f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f`.
- `uranius_game.synthetic_rider_identity` exists with **200 mapping rows, 200 distinct nonzero rider UUIDs and 200 distinct integer rider IDs**; 200 successful rider FK joins, zero unmapped riders or orphaned mappings, zero records with invalid synthetic provenance.
- Database constraints: one PK, one UUID uniqueness constraint, one rider foreign key, one provenance check constraint.
- **Both ordinary RLS and FORCE RLS enabled**, zero SELECT policies; `anon`, `authenticated` and `uranius_smoke_reader` cannot read UUID mappings; restricted reader cannot insert, update or delete them.
- Previous reader restrictions preserved (`team_id` not selectable; anonymous catalog rider reads denied); 200 synthetic riders, 2 owner bindings and frozen Season 1 Day 1 clock preserved.

Immutable status evidence was committed as `014_DEPLOYMENT_STATUS.json`. **Migration 014 is closed**, no further 014 installation attempts. This completes the *private synthetic UUID identity foundation only*; the original game's rider details and profile read API remain unreconstructed. No original player data was imported or modified and original production was not targeted. The next separately scoped task is designing owner-restricted read access to these UUIDs and later original-compatible profile fields, with no automatic permission expansion.
