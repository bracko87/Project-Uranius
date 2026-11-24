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

A **separate verified server session** can bind the Auth subject, resolve its owned `club_id` via `get_my_club_id()`, and read **only** a RLS-filtered list of `(rider_id, label, flat, climbing, stamina, resistance)`. This is **synthetic Squad preview only**, not the original `club_roster` API. Never guess the missing original fields. Future strict client output must name its own shape (`syntheticSquadPreview`) and label unknown fields as unavailable.

A later reviewed, hash-pinned **isolated-only** schema/ACL migration could grant only five newly required columns (`label`, `flat`, `climbing`, `stamina`, `resistance`) while retaining the existing `rider_id` column grant. **Do not grant `team_id`.** The read SQL has no owner JOIN: the existing owner-bound `riders_read` RLS policy is responsible for filtering the actual rows. The database enforces ownership through the already-existing riders RLS policy. Deny anon, ordinary public clients and writes; no broad table SELECT and no `SECURITY DEFINER` function. Test with disposable PostgreSQL 17 and verified A/B + unknown Auth subject, negative writes and wrong-role guards, then seek separate **explicit owner approval** for exact digest before any hosted change.

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

This is a **review milestone**, not a real Squad frontend feature. The existing login and Overview smoke interface stay unchanged. The current owner-scoped restricted role has `rider_id` SELECT but is missing `label, flat, climbing, stamina, resistance`; `team_id` must remain unavailable; implementing any hosted Squad preview requires a separately approved exact-grant migration and disposable PostgreSQL 17 A/B coverage.

## Read-only aggregate validation for preview field bounds

A hosted `BEGIN READ ONLY` aggregate check (no rider identities or rows exported) confirmed:
- 200 catalog riders, no duplicate `rider_id`, longest synthetic label 17 characters.
- `flat` and `climbing`: min 50 / max 95.
- `stamina` and `resistance`: min 55 / max 95.

All observed values fit the projector's strict 0–100 skill range and 150-character label maximum. These aggregates validate the **current synthetic catalog only**, not the legacy original Squad attribute scale or broader gameplay rules.

## 2026-11-24: 5/5 source-review tests PASS; restricted grant preview staged

The owner reran `node --test tests\\uraniusSquadPreviewReview.test.mjs`: **5/5 PASS, zero failures** after correcting test-only JavaScript regular-expression escaping. This proves the projector contract and SQL static review gates, **not PostgreSQL execution**.

Prepared `013_squad_reader_acl_DISPOSABLE_REVIEW_ONLY.sql`: **rollback-only, NOT APPROVED for hosted execution**. It guards direct `uranius_migrator` session, PostgreSQL 17, 10-entry ledger with the approved 010 candidate digest, RLS on synthetic riders, restricted reader role attributes, absent current reader permissions on `team_id` and `label`, and absence of broad reader write/privileged access. It temporarily grants **exactly five missing rider columns** (`label,flat,climbing,stamina,resistance`) to the existing restricted reader, retaining pre-existing `rider_id` grant, asserts those six preview columns are available and `team_id` remains unreadable, while anon reads and writes stay denied, then **ROLLBACKs**. It has no new table, function, API access, policy, role, row or ledger writes that survive the transaction. No project-identity bypass and no authorization for live use is implied.

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

## Native test failure and security correction — 2026-11-24

The owner's first disposable PostgreSQL 17 run completed all **21** canonical Overview checks and successfully removed the PGDATA. The next Squad check stopped at a **test-only boolean rendering mismatch**: `has_column_privilege(...)::text` returned `false`, not `f`.

Review then found a **more important permission flaw in the initial proposed review-only ACL**: since the synthetic rider table has exactly seven columns, granting six on top of existing `rider_id` would effectively expose every column. PostgreSQL `has_table_privilege(...,'SELECT')` also returns true with any selectable column, so it is not a valid guard for complete-row access. **No hosted grant was made.** The revised proposal grants only five new rider attributes and **never `team_id`**; the query relies on the actual PostgreSQL `riders_read` owner RLS filter instead of a reader-level `team_id` JOIN. The native test now checks `team_id` denial directly and uses correct PostgreSQL boolean text. This corrected design must pass all native PG17 checks before any hosted grant review. Do not run the old ACL source.

## 2026-11-24: owner-confirmed native PG17 success, forward review candidate

The owner confirmed **9/9 source-review checks and 28/28 disposable native PostgreSQL 17 checks PASS**, including manager A/B ten-rider RLS separation, unknown-user denial, restricted reader write and anonymous read denial, preservation of ten migration ledger rows and 200 rider rows, and successful disposal of the temporary native PostgreSQL instance. **No hosted DDL or grant was made.**

After native acceptance, prepared `013_squad_reader_grant_REVIEW_ONLY.sql`, a **non-installable, explicit-approval-required forward candidate**. Unlike the rollback-only test query, this SQL has:
- Direct `uranius_migrator` role, exact isolated project reference, PostgreSQL 17 and database/TLS guards.
- Exact 10 migration ledger fingerprints including 010; expected 200 synthetic riders, two ownership mappings and frozen Season 1 game clock.
- Existing `riders_read` row ownership policy and unchanged preexisting table privileges, including original `authenticated` role's SELECT grant. The latter was independently confirmed read-only on hosted Uranius and **must not be revoked or duplicated**.
- The narrow reader-only grant of `label,flat,climbing,stamina,resistance`, preserving existing `rider_id` access and preventing `team_id` access. No server Auth, original project, public routes, Data API exposure, engine rules, scheduler or client privileges are changed.
- A postflight that fails the transaction if anonymous access is broadened, reader `team_id` is exposed, or write privileges appear.

There is **no install mode or approved SHA manifest**. A separate guarded atomic installer + manifest and independent PostgreSQL 17 candidate rehearsal must be completed before the owner can review an exact final hash and authorize any hosted change.

New tests: `tests/uraniusSquadInstallCandidateReview.test.mjs` (four new static checks); the existing `tests/uraniusSquadReaderNativePg17.mjs` was extended with **three** candidate checks using only the disposable fixture: unmodified candidate denies non-TLS, wrong execution role denies, and a local-only TLS-disabled candidate rehearsal succeeds with exact restricted columns and duplicate rejection. Thus expected native count is **31** if successful (not yet run by owner). `scripts/review-uranius-squad.mjs --review` prints the draft SHA-256 locally without connecting to any database. These new tests are **not yet validated**.

```bat
git pull origin main
node --test tests\uraniusSquadPreviewReview.test.mjs tests\uraniusSquadReaderAclReview.test.mjs tests\uraniusSquadInstallCandidateReview.test.mjs
node tests\uraniusSquadReaderNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
node scripts\review-uranius-squad.mjs --review
```

**Important:** Owner acceptance of the 28-check disposable ACL test is **not** approval to run the 013 candidate on hosted Uranius. Do not paste SQL into the dashboard. No new password, hosted API, or billing step is needed for the above offline commands.

## 2026-11-24: Owner-confirmed 013 candidate rehearsal PASS; proposed package frozen for review

The owner supplied terminal evidence for:
- **13/13** standalone Node source/static security checks passed.
- **31/31** disposable native PostgreSQL 17 checks passed, including corrected five-field grant, strict `team_id` denial, manager A/B ownership isolation, unknown-user denial, no-TLS denial, wrong-role rejection, duplicate candidate refusal, unchanged ledger and successful temp-directory cleanup.
- The offline candidate reviewer reported SHA-256 **`8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859`**, for exact `013_squad_reader_grant_REVIEW_ONLY.sql`.

**New frozen review manifest:** `013_install_manifest_REVIEW_ONLY.json` pins the owner's candidate hash, 10 exact prior ledger versions/hashes, restricted scope and approval status `REVIEW_ONLY_NOT_APPROVED`. The offline-only reviewer `scripts/review-uranius-squad.mjs --review` now checks candidate bytes against the frozen manifest and prints both its candidate hash and the **manifest SHA-256**, which is the digest intended for separate owner approval. It has NO database connection or apply mode. New `tests/uraniusSquadManifestFreeze.test.mjs` contains two regression checks; those are not yet owner-executed.

Review command:

```bat
git pull origin main
node --test tests\uraniusSquadManifestFreeze.test.mjs
node scripts\review-uranius-squad.mjs --review
```

**Release gate:** Even when the manifest review passes, this is **not** approved for hosted installation. A direct-migrator exact-approved digest installer, read-only hosted preflight, independent postflight and explicit owner approval of the frozen **manifest SHA-256** remain required. No hosted permissions or game-data changes were performed in this review phase.

## Guarded 013 installation tooling staged — approval still withheld

After the owner reported **2/2 manifest freeze checks PASS** and verified the printed manifest SHA-256 **`ab63e7949889a49bd33fb584885f4911df6b027eb20d3aed3be43e77f0ccaa7a`**, staged:
- `scripts/apply-uranius-squad.mjs`: `--review` checks **exact frozen manifest and SQL candidate hashes** offline; `--apply-reviewed-squad <manifest digest>` is a deliberately separate, potentially hosted-mutating path. It requires the exact digest, isolated target guard, **direct `uranius_migrator`**, PostgreSQL TLS `verify-full`, CA file, PostgreSQL 17 candidate assertions, an **atomic single-transaction** insert of ledger version `013_squad_reader_grant.sql` with exact frozen candidate hash and an in-transaction postflight. Failures abort/roll back. The applicant must have provided separate explicit approval of the **exact** manifest digest before using that mode.
- `scripts/run-approved-squad-windows.ps1`: no default approval digest. Requires exact approved SHA-256 parameter, verified frozen source, manual `APPLY URANIUS 013` confirmation and a **private masked migrator password prompt**; removes temporary environment credential variables.
- `tests/uraniusSquadGuardedInstallerReview.test.mjs`: three new source-contract tests for exact hash, atomic direct TLS and owner confirmation. These tests are **not yet owner-run**.

The only allowed immediate offline command, with **no hosted connection**, is:

```bat
git pull origin main
node --test tests\uraniusSquadGuardedInstallerReview.test.mjs
node scripts\apply-uranius-squad.mjs --review
```

**Do not run `--apply-reviewed-squad` or the Windows launcher without separate, explicit approval.** Migration 013 remains uninstalled. A successful installation will still need independent read-only hosted postflight and authenticated Squad preview wiring; it does not mean the original complete Squad page is rebuilt.

## 2026-11-24 — First authenticated Squad frontend source integration

The owner approved exactly `013_install_manifest_REVIEW_ONLY.json` SHA-256 `ab63e7949889a49bd33fb584885f4911df6b027eb20d3aed3be43e77f0ccaa7a` for isolated project `sdtsivgtcaoaeoihcwzd`. The owner installed 013 with direct-TLS migrator; an **independent read-only hosted Supabase check** confirmed 11 ledger entries, exact `013_squad_reader_grant.sql` candidate SHA, six selectable preview columns, `team_id` denied to restricted reader, anonymous access/writes denied, 200 synthetic riders, two owners and the unchanged paused clock. Actual riders RLS is **enabled, not FORCE** (existing policy unchanged). No original game production changes.

The first local frontend integration is now source-staged:
- `database/synthetic-world/hosted-squad-preview-read_REVIEW_ONLY.sql`: owner-scoped **read-only** SQL for the new installed 013 reader grant; verified subject only, TLS guard, no fabricated fields, transaction rollback.
- `database/synthetic-world/club-dashboard-adapter.mjs`: new `GET /fixture/squad` protected by the same short-lived verified Auth session, origin checks and HttpOnly cookie. No user-controlled team or club identifier; unavailable backend returns **503**, invalid projection fails closed.
- `scripts/run-uranius-hosted-smoke.mjs`: explicit `URANIUS_SQUAD_READ_APPROVED=1` opt-in bound to the restricted PostgreSQL reader, using the verified server session subject only. Opt-in off otherwise.
- `database/synthetic-world/hosted-smoke-client.tsx`: `#/dashboard/squad` read-only Squad screen, opened by a link from authenticated Overview. Displays only real owned synthetic rider label and four existing skills, validates club UUID/response contract/unique IDs, and distinguishes missing server data from an empty roster. It does **not** claim original Squad parity or enable writes.
- `scripts/run-approved-overview-https-windows.ps1` now opts into the installed verified Squad reader alongside completed Overview and clock; it remains loopback HTTPS only.

Added tests:
`tests/uraniusSquadRouteIsolation.test.mjs` — 4 route/authorization checks including A/B session isolation, wrong origin/method, logout, unknown users, malformed response denial.
`tests/uraniusSquadHostedFrontendBoundary.test.mjs` — 3 source-boundary checks.
`tests/uraniusSquadHostedBundle.test.mjs` — actual offline React/esbuild bundle compilation.

**These new tests have not yet been run by the owner.** Next safe offline test command:

```bat
git pull origin main
node --test tests\uraniusSquadRouteIsolation.test.mjs tests\uraniusSquadHostedFrontendBoundary.test.mjs tests\uraniusSquadHostedBundle.test.mjs
```

After offline tests pass, a local HTTPS smoke with real two-manager login can be performed using the existing `scripts/setup-uranius-loopback-tls-windows.ps1` helper and `scripts/run-approved-overview-https-windows.ps1`. The user previously removed CurrentUser Root trust for the short-lived loopback certificate, so **do not assume browser trust is currently installed**; require explicit opt-in for a new/current cert, and remove the same trust after testing. Never paste database passwords or publishable keys into chat. It is important to do manual browser A/B acceptance before marking the frontend complete. No hosted DB schema changes are needed beyond already verified 013.

## 2026-11-24 — Browser acceptance: limited authenticated Squad first paint PASS

Owner supplied **two screenshots** of the live loopback HTTPS browser page `#/dashboard/squad` after the guarded installer and restricted-reader setup:
- The first authenticated club shows **10 riders, Fixture Rider 1–10**, with Flat, Climbing, Stamina and Resistance columns.
- The second authenticated club shows **10 riders, Fixture Rider 11–20**, with the same four columns.
- Distinct, nonoverlapping rider identities confirm the expected A/B owner scope for this visible first-paint check.
- Both screenshots retain the **read-only synthetic preview** disclosure and explicitly state missing original-game fields and disabled rider changes.

This closes the **limited synthetic Squad first-paint acceptance** milestone: independently verified hosted migration 013, prior **8/8 frontend automated checks passed**, loopback HTTPS server started and both separate authenticated roster screenshots passed. No writes to original production, no gameplay actions, no claim of full original Squad parity.

**Outstanding:** Original full Squad schema and attributes, the original page's interactions, transfers/training/medical flows and broader U5.02 / U5.03 world reconstruction remain unresolved. Do not mark global project completion on account of this focused slice. The short-lived loopback certificate was temporarily trusted for browser acceptance; the user must terminate the smoke server and remove its CurrentUser Root trust using `scripts/setup-uranius-loopback-tls-windows.ps1 -RemoveTrust`. Trust removal not yet confirmed.
