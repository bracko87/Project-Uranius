# 018 — Proposed synthetic rider-attribute storage (DESIGN ONLY)

Date: 2026-11-24
Status: **NO SQL MIGRATION GENERATED; NOT APPROVED; NO DATABASE CHANGE.**

## Purpose and source limits

The original UI's `RiderDetails` nine attributes are `sprint, climbing, time_trial, endurance, flat, recovery, resistance, race_iq, teamwork`. Only `flat, climbing, resistance` have same-name, currently observed values in the isolated `uranius_catalog.riders`; synthetic `stamina` is not original `endurance`. Migration 014 installed unique generated synthetic rider UUIDs (200/200), and 015 exposes those UUIDs only to the existing ownership-restricted reader. The original model requires role, age and other state beyond 018.

The proposal intentionally stores **null** for an unknown skill, rather than a random, inferred or zero value. The data contract must distinguish `unknown` from `known zero`, and `copied_from_isolated_catalog` from `separately_authorized_synthetic_fixture`. No original game player data is being copied.

## Draft relational model (for future review, not executable)

- New private `uranius_game.synthetic_rider_attributes` relation, one row per `uranius_game.synthetic_rider_identity.rider_id` (integer primary key/foreign key; no new UUID generation).
- Nine **nullable** smallint columns, each with a CHECK allowing NULL or 0–100. For launch, only `climbing`, `flat`, `resistance` would be populated using the already isolated synthetic source. All six others remain NULL.
- Per-attribute **provenance must be explicit**, not a single all-fields source string. The recommended design is a separate key/value `uranius_game.synthetic_rider_attribute_provenance` keyed by `(rider_id, attribute_code)` with fixed allowed attribute codes, fixed provenance enum (`isolated_catalog`, `approved_synthetic_fixture`), and timestamp. A trigger or transactional validation must prohibit a non-NULL skill without provenance, a provenance record for a NULL skill, and an `isolated_catalog` provenance on any skill other than the three verifiable same-name fields.
- Retain private schema protections: `REVOKE ALL ... FROM PUBLIC, anon, authenticated, uranius_smoke_reader`, enable **FORCE RLS** before any read exposure, and add only a separately reviewed SELECT policy for the restricted reader relying on the existing `riders_read` policy (as in 015), with SELECT on explicitly approved columns. Avoid `SECURITY DEFINER`, public schemas, or broader grants.
- Historical ledger target would be 14 entries after a **separately approved 018 installation**. A future guarded installer must verify all 13 exact prior ledger hashes, isolated project `sdtsivgtcaoaeoihcwzd`, direct `uranius_migrator`, PostgreSQL 17 and verified CA/TLS, then use atomic SQL with rollback on errors. This document is **not** owner approval for that installer.
- An eventual server-owned read-only route should join owner-filtered `uranius_catalog.riders` to mapping and attribute values through the existing verified Auth subject, validate strict field shape and provenance, and never trust browser-supplied rider/club IDs.

## Acceptance gate before any hosted install

1. Confirm that all 200 existing synthetic riders are still present and 015 RLS is intact by read-only hosted query.
2. Choose whether to extend the profile only with three observed fields (avoids a schema migration now) or introduce nullable nine-attribute storage as a true future game system. Do **not** fill unknown skills by default.
3. Implement independent source-contract tests, checksum-freeze the proposed SQL and manifest, and rehearse against **full historical migrations 001–015** in disposable PostgreSQL 17 with real restricted reader.
4. Negative tests must prove A cannot read B, unknown users read zero, anon and authenticated read nothing, and no reader INSERT/UPDATE/DELETE or provenance modification is allowed. Prove an attempted forged provenance or NULL→numeric update is denied.
5. Obtain separately explicit owner approval for the exact proposal SHA-256/manifest SHA-256, then install only on isolated project through a guarded local direct TLS migrator. Verify read-only hosted postflight before declaring installed.

## Explicitly out of scope

No generated original player names, nationalities, dates of birth, age, role, morale, potential, fatigue, contract details, skill backfill, transfers, training, or public website. No changes to original ProPeloton production.

**Current delivery:** The 017 read-only nine-slot interface is already complete at code/test level (owner reported 28/28 combined tests PASS). This 018 document is a practical storage contract for a future separate implementation, not a repetition of 014–017 or evidence that the six unknown skills now exist.

## 2026-11-24 — Implemented OFFLINE 018 SQL candidate and focused tests (not approved)

The earlier two-relation idea was simplified before implementation. New candidate file `018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql` creates **one** private `uranius_game.synthetic_rider_attributes` table keyed to the existing 014 rider identity. It has nine nullable 0–100 smallint attributes and **nine paired per-attribute provenance columns** (19 columns including `rider_id`), with immediate PostgreSQL `CHECK` constraints requiring a value and its provenance to be present or absent together. This offers per-skill provenance without the cross-table consistency and deferred-trigger complexities of a separate provenance relation.

Only `climbing`, `flat`, `resistance` are initially copied exactly from the isolated catalog with `isolated_catalog` provenance. The remaining six values and sources are NULL. These six disallow `isolated_catalog` provenance entirely; an explicitly marked `approved_synthetic_fixture` provenance is reserved for a future separately authorized synthetic design, **not populated** in the proposed migration. Existing synthetic `stamina` is never treated as `endurance`.

The candidate checks restricted direct `uranius_migrator`/PostgreSQL 17/TLS/specific isolated project, requires installed 015 ledger digest and 13 ledger rows, 200 riders and identity FORCE RLS, creates/revokes the table, verifies 200 copied rows and NULL unknowns **before enabling FORCE RLS**, and leaves **zero policies and zero smoke-reader, anon or authenticated SELECT rights** on the new relation. The proposal does not append a migration ledger entry; a later separately reviewed full-history atomic installer would be necessary. **Do not execute this candidate on any hosted database.**

Added `tests/uraniusRider018SourceReview.test.mjs` for source-contract/SQL guard checks and `tests/uraniusRider018NativePg17.mjs` for isolated loopback PostgreSQL 17 negative tests. The latter creates a deliberately small **13-ledger disposable fixture**, not the full historical 001–015 replay. It substitutes **only** the explicit TLS clause in its temporary local test SQL and verifies original SQL refuses non-TLS. It tests provenance checks, value ranges, FK, no reader access, no policies, duplicate and wrong-target denials, and wipes scratch PGDATA.

**Status: source files committed; owner has NOT yet executed tests; hosted migration NOT AUTHORIZED; no manifest or deploy installer.** Before any approval, full 001–015 replay and exact digest manifest remain necessary.

## 2026-11-24 — Full historical disposable PG17 acceptance harness prepared

Beyond the minimal standalone 018 fixture, `tests/uraniusRider018FullHistoryNativePg17.mjs` now independently **replays the entire previously native-tested 001–015 synthetic migration history** inside new scratch PGDATA. It extends (but does **not** modify) the existing 015 native test and appends an exact 13th 015 ledger record before testing the new 018 candidate.

The new full-history checks include bidirectional 13-version/hash ledger equality from the 015 manifest, original unmodified SQL rejecting local non-TLS, wrong direct role, modified ledger digest, three exact same-name sourced values for 200 riders, six NULL unknown values, FORCE RLS/no policy/zero reader grants, denied reader writes, 0–100/provenance/FK constraint failures, rollback of a synthetic-only fixture value, and duplicate migration refusal with paused game and original synthetic data preserved. This is **not** a hosted rehearsal and not authorization to run the proposal on Supabase.

A source-only reviewer `scripts/review-uranius-rider-018.mjs --review` computes the 018 SHA-256 without any database connection or install mode. New source tests are included in Squad GitHub Actions config; GitHub Actions execution is not yet confirmed.

**The owner should now run these two test stages** in the existing Windows checkout; they are not yet verified passing:

```bat
git pull origin main
node --test tests\uraniusRider018SourceReview.test.mjs
node scripts\review-uranius-rider-018.mjs --review
node tests\uraniusRider018FullHistoryNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

If failures occur, fix only the new review/test components when possible. If SQL candidate bytes change, invalidate and recompute its digest; no source freeze or hosted apply is currently approved. **Completion of the local tests permits a separate approval-manifest design, not automatic installation.**

## 2026-11-24 — 57/57 owner-verified full native tests; exact release candidate frozen

Owner's Windows terminal confirms **all 57/57** full 001–015 historical replay plus 018 candidate checks **PASS** on disposable PostgreSQL 17. Original unmodified 018 refused non-TLS; a disposable-only copy bypassed only the TLS predicate to prove the remaining guards/DDL. No incorrect provenance accepted, all three observed skills preserved exactly, other six values remained NULL, FORCE RLS and zero reader/public grants held, duplicate application was rejected, all 13 historical ledger fingerprints stayed intact, and the scratch PGDATA was removed. Prior source checks: **7/7 PASS**.

Source SQL 018 remains **byte-for-byte unchanged**, SHA-256:
`622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc`.

Prepared **`018_install_manifest_REVIEW_ONLY.json`**, which includes exact 13 historical version and SHA-256 pairs, isolated project ref, explicit unchanged 200 rider mapping and zero reader exposure scope, and `REVIEW_ONLY_NOT_APPROVED`. Its exact SHA-256:
`9995c7a1558d222426e759b5af4911981d5d4b12688a4e2e3c1adee8d6975205`.

Also prepared dormant, **NOT AUTHORIZED** `scripts/apply-uranius-rider-018.mjs` / `scripts/run-approved-rider-018-windows.ps1` with exact source and manifest hashes, bidirectional 13-ledger check, direct TLS migrator target restriction, atomic 14th-ledger insertion, force-RLS/privacy and unchanged-world postflight, typed Windows approval and private password prompt. `tests/uraniusRider018InstallerGate.test.mjs` verifies those guards, but has **not yet been executed**. Unlike 015, 018 introduces a table with NO SELECT RLS policy or any restricted-reader grants, so it will **not** make the six unknown skills appear in the live Squad client. That would need further separate source-backed data and owner-scoped read release.

**Do not run the 018 installer/launcher.** The owner has **not** approved 018 hosted installation. Initial review only:
```bat
git pull origin main
node --test tests\uraniusRider018SourceReview.test.mjs tests\uraniusRider018InstallerGate.test.mjs
node scripts\review-uranius-rider-018.mjs --review
node scripts\apply-uranius-rider-018.mjs --review
```
A separately owner-approved hash pair, final independent read-only hosted baseline and successful installer verification are prerequisites to any actual 018 release. Original ProPeloton production must never be targeted.

## 2026-11-24 — Release freeze 12/12 PASS and independent hosted READ ONLY preflight PASS

Owner confirms **12/12 source/frozen manifest/installer/Windows launcher gate tests PASS**, plus both `review-uranius-rider-018.mjs --review` and `apply-uranius-rider-018.mjs --review` PASS with exact candidate and manifest hashes. The full historical native rehearsal remains **57/57 PASS**. Original SQL fingerprint `622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc`; manifest fingerprint `9995c7a1558d222426e759b5af4911981d5d4b12688a4e2e3c1adee8d6975205`. Test execution does **not** authorize hosted deployment.

Independent read-only Supabase preflight of isolated project `sdtsivgtcaoaeoihcwzd` confirms: **13** ledger rows, installed 015 SHA `71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e`, **200** catalog riders and **200 distinct** synthetic rider UUID mappings, **2** owner bindings, identity mapping with FORCE RLS and exactly 1 owner-only SELECT policy; `anon` and `authenticated` cannot select the mapping, the restricted reader cannot select `team_id`, the game is paused at Season 1 Day 1, and `uranius_game.synthetic_rider_attributes` **does not exist**. No hosted SQL writes.

**Status: source freeze and release preflight ACCEPTED; 018 HOSTED INSTALLATION IS NOT OWNER-APPROVED AND WAS NOT ATTEMPTED.** The already prepared Windows launcher must remain dormant until the owner separately approves exact frozen SQL and manifest hashes. No further test reruns are needed before an owner approval decision.

## 2026-11-24 — EXPLICIT OWNER APPROVAL RECEIVED; HOSTED INSTALL STILL PENDING

The project owner explicitly approved installation of **only** Project Uranius Migration 018 on isolated Supabase project `sdtsivgtcaoaeoihcwzd`, referencing the exact SQL SHA-256 `622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc` and manifest SHA-256 `9995c7a1558d222426e759b5af4911981d5d4b12688a4e2e3c1adee8d6975205`. Explicit exclusion: original ProPeloton production. This authorizes **one guarded 018 installation attempt**, not a raw administrator SQL shortcut or broader schema grants.

An independent **read-only** preflight after approval confirmed isolated hosted baseline still contains exactly 13 ledger entries with pinned 015 digest, 200 catalog riders, 2 owners, 200 distinct rider UUIDs, identity FORCE RLS, one owner-only mapping read policy, no anon/authenticated mapping access and no `team_id` reader access; game clock remains paused and the 018 table does **not yet exist**.

The guarded launcher requires the owner's locally held private `uranius_migrator` password and CA path, which the assistant does not possess. Installation therefore **has not been attempted**. The approved owner must run the already-frozen `scripts/run-approved-rider-018-windows.ps1` on the trusted Windows workstation and enter the password **locally** (never send it to chat). Once the command returns success, independently query the hosted ledger, 200 rows, 19 columns, 27 checks, 3 sourced/6 NULL skills, FORCE RLS, zero public/reader grants and unchanged 200 UUID mappings and paused game clock. A failure must NOT be automatically retried.

**Status: OWNER APPROVED / GUARDED OWNER-LOCAL INSTALLATION PENDING.** Older notes describing 018 as unapproved are historical; this entry records superseding permission, but not installation completion.

## 2026-11-24 — GUARDED ISOLATED 018 INSTALLED AND INDEPENDENTLY VERIFIED

Owner executed the pinned `scripts/run-approved-rider-018-windows.ps1` from the trusted Windows checkout, typed `APPLY URANIUS 018` and supplied the dedicated migrator password locally (never shared in chat). The atomic restricted migrator reported success. No privilege escalation or admin SQL fallback was used.

Independent **read-only** hosted verification on project `sdtsivgtcaoaeoihcwzd` confirmed:
- Migration ledger now **14** entries and `018_synthetic_nine_skill_attributes.sql` SHA-256 is exactly `622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc`; installed 015 SHA remains unchanged.
- New `uranius_game.synthetic_rider_attributes` contains **200** entries, **19** columns and **27** CHECK constraints; FORCE RLS active, **zero RLS policies**.
- **200/200** rows match source catalog values exactly for Climbing, Flat and Resistance, with three `isolated_catalog` provenance markers each.
- **200/200** rows have the six unavailable original skills **and all six corresponding provenance values NULL**. No original data was invented.
- No missing/orphan rider-attribute IDs. Existing catalog riders **200**, owner bindings **2**, existing synthetic UUID identities **200**, distinct UUIDs **200**.
- No SELECT privilege on the new table for `anon`, `authenticated`, or `uranius_smoke_reader`; restricted reader also has no INSERT/UPDATE/DELETE. Existing rider `team_id` is inaccessible to the reader.
- Original UUID identity FORCE RLS remains enabled with one owner-only SELECT policy; Season 1 Day 1 game clock remains paused.

**018 STATUS: INSTALLED AND ACCEPTED on isolated hosted Uranius.** The original source/manifest files remain frozen as a historical release record; their prior review-only metadata reflects their **pre-installation state**, not the currently installed hosted state. Do not modify hashes or retroactively rewrite evidence. No more 018 installation attempts are necessary.

**Scope limit:** The new attributes table deliberately has **NO reader grant/policy**, so 018 does *not* expose additional fields in the live Squad UI. The six unavailable skills remain unknown. Any 019 owner-scoped read integration or future filling of synthetic missing values requires a separate design, security test and approval. Original ProPeloton production was not targeted.
