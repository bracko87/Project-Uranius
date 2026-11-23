# Blockers

## U1.02 resolved

The authorized GitHub checks confirmed the public destination and disabled Actions. See TEST_REPORT.md.

## Proposed upload review

1. Verify the destination owner and repository identity, its public visibility, saved Actions setting and deployment integration settings during the authorized review.
2. Build a separate export from a reviewed file manifest. Preserve lockfiles and required assets. Exclude inherited Git metadata, credentials, CLI state, production data and private fixtures. Preserve necessary schema logic for review while excluding executable production schedules and callbacks.
3. Scan the exact export for secret formats, personal data, dumps, device and configuration metadata, and outbound targets. Reconcile all exclusions and changes with the pinned source manifest. Verify that production execution paths are disabled, workers use isolated dependencies and missing or wrong sandbox configuration fails closed.
4. Initialize a new repository from that reviewed export. Verify that its root commit has no parents and its tree matches the reviewed manifest. Keep the local evidence repository outside that export.
5. Present the manifest, scan results, destination checks and root commit for owner review. Add the verified destination and publish only after explicit approval.

## Missing pinned worker source — resolved

The five direct files and seven relative dependencies at the three authorized pins were recovered. The draft contains content and blob provenance under reference/engine-pins. See TEST_REPORT.md.

## U1.03 — Missing visual assets resolved

The owner authorized local placeholders. ASSET_REPLACEMENT_REGISTER.md records each replacement. Existing tracked artwork was retained where available.

## U1.03 — Historical fixture disposition resolved

The owner authorized anonymization or quarantine. Numerical inputs were preserved in the attempted transform, but historical sporting equivalence remains unverified after the dependent test run. The affected historic files remain outside the export, with two verified synthetic replacement tests in the staged source. See TEST_REPORT.md.

## Upload preflight resolved

The owner confirmed the Netlify repository access configuration and authorized upload of the exact approved root. GitHub independently confirmed disabled Actions, no Pages, zero webhooks, deployments and environments, and zero refs before the push. Installed App inventory was unavailable to the token. No Netlify access or deployment was used. The published main initially matched the approved root exactly. This checkout is the sole development workspace. The inherited checkout is read-only provenance.

## U3.08 — Chase and follow rule approval

R03 requires approval for live controls beyond attack. The selected existing_v1 effect executor ignores every non-attack TeamOrder. The available flat-stage chase effort function is a group-level bonus and supplies neither a rider's target or eligibility rules nor a follow lifecycle. Reusing it for a live order requires a sporting decision about who can initiate or join the pursuit, how long the order lasts, and which actions can affect group pace.

Proposed scope for approval: a manager may tell an eligible owned rider already in a chase group to pursue a designated group ahead, using the existing flat-stage pace and energy calculations. Follow may target a rider in the same group and attempts that rider's next eligible move through existing movement and energy rules. Use no position jump or guaranteed catch. Existing terrain restrictions apply. U3.09 through U3.12 remain pending in order.

U3.08 was resolved by the owner approving pursuit and follow rules. Flat-stage chase uses the existing chase pace cap and energy formula. Follow attempts the target's next supported tactical movement, currently an attack, and uses simulated pace before choosing whether to leave the source group.

## U5.01 ? Paid sandbox authorization pending

Approve one standalone Supabase Micro project in the existing paid Pro organization in Frankfurt at approximately $10/month incremental before tax. See INFRASTRUCTURE_PLAN.md for the exact hourly rate, shared quota headroom and isolation safeguards. The owner must confirm the dashboard billing estimate and available shared quota before any charge. After provisioning is authorized, independently verify the organization, project ref, origin, region, owner access and separate credentials before enabling the target guard. U5.02 remains pending.

## U5.01 - Final offline review pending

The owner confirmed the $10/month Micro base charge before tax and usage overages and explicitly withheld provisioning authorization. The initial migration and synthetic reference tranche is rehearsed locally. Hosted project identity, owner access, exact aggregate quota headroom and platform security checks remain pending until approval. The 18 Vitest failures reproduce at the sanitized root. Preserve the quarantined production worker dependency and track the remaining legacy coverage in TEST_REPORT.md. Further schema reconciliation and hosted application remain U5.02 onward.

## U5.02 - First sandbox write needs authorization

The owner-provisioned target sdtsivgtcaoaeoihcwzd passed scoped read-only identity and empty-catalog verification. This resolves the U5.01 provisioning blocker. Approval is required to create the dedicated migration role and apply the exact four-file manifest to this project. The local Windows environment also needs a trusted psql client and the project's CA and dedicated migration credential supplied via local secure settings. Never send these credentials in chat or commit them. U5.02 remains blocked at the first write.

## U5.02 - First-write scope approved, connection prerequisites pending

The owner authorized the dedicated role and four reviewed files for sdtsivgtcaoaeoihcwzd. Read-only metadata and catalog verification passed. The local session has no Uranius DBA or migration DSN, no project CA configured and no psql found on PATH or in the standard installation directory. The hosted TLS certificate and login could therefore not be verified. Provide project-only access through secure local settings. Do not share secret values in chat or Git.

## U5.02 - Local password entry pending

The portable client and verify-full connection to the exact Uranius host now work. The owner must enter the Uranius-only database password and choose the distinct migration-role password in the private Windows terminal. See the Windows interactive connection section in INFRASTRUCTURE_PLAN.md. No credentials are needed in chat. If the connection script reports a failure, inspect role and ledger state before any retry.

## U5.02 - Revised manifest awaiting approval

The existing restricted hosted role is retained. The owner reports no application tables and no committed migrations. The original numbered files fail the restricted-role rehearsal at the managed Auth dependency. The replacement manifest is rehearsed offline and requires explicit approval before any remote write. See INFRASTRUCTURE_PLAN.md for the exact digest and resume procedure.

## U5.02 - Foundation applied, remaining reconstruction requires review

The owner completed initialization and live read-only verification passed for the four-file foundation. U5.02 remains blocked on reconciliation of the retained app contracts, review of missing source dependencies and approval of any additional pinned migrations. See reference/DB_DRIFT_AUDIT.md. U5.03 synthetic world preparation is available offline. Hosted seed/login work follows the U5.02 gate.

## U5.02 - Reviewed club identity package pending approval

Migration 005 is ready for owner review. The package adds the initial read-only game club contract and private-table RLS hardening. No remote writes or API exposure were performed. Approve only the exact manifest and target in database/reconstruction/README.md. Remaining reconstruction work is tracked in reference/DB_RECONSTRUCTION_PLAN.md. U5.03 requires separately authorized account creation and seed import after the dependent contracts are ready.

## U5.02 - 005 approved, existing login requires private entry

The owner approved the exact 005 checksum for sdtsivgtcaoaeoihcwzd and scoped read-only verification passed. The agent session has no migration credential. Run the private terminal command in database/reconstruction/README.md, using the existing migration-role password at the masked prompt. Any failure requires read-only ledger inspection before attempting a retry.

## U5.02/U5.03 - Migration 006 review pending

Migration 005 is complete per the owner's independent verification. U5.02 stays open pending further clone dependencies. 006 was tested offline and awaits approval of the exact manifest in database/reconstruction/world/README.md. Hosted Auth users, ownership binding and login are separate actions and remain pending. The fixture-only browser smoke passed for both fictional managers.

## U5.02/U5.03 - 006 Windows path ready for private execution

The owner accepted 006 in principle and requested an offline-only Windows workflow correction. Full loopback TLS rehearsal passed. Hosted application remains pending owner execution with the unchanged manifest. Auth account setup, binding and live login are separate gates.

## U5.03 - Two-manager Auth and ownership approval pending

The hosted six-entry foundation and empty Auth and ownership state were verified read-only. The exact two-account and binding procedure is ready in database/synthetic-world/AUTH_BINDING_REVIEW.md. Hosted account creation, temporary Auth sessions and two ownership writes require approval. Data API exposure and full dashboard integration remain separate work.

## U5.03 - Owner verification-only Auth retry pending

The owner confirmed both intended accounts exist and reported a gateway HTTP 555 during Manager A sign-in. Offline diagnostics and retry handling are verified. One private verification-only attempt with NoRetry is ready. Hosted identity proof and ownership binding remain pending.

## U5.03 - Independent Auth verification pending

Confirmed and repaired a Windows PowerShell 5.1 UTF-8 serialization fault offline. Run the project-pinned official SDK verifier once in the private terminal. Do not recreate accounts or update passwords. The next hosted step depends on the sanitized result. Ownership remains gated.

## U5.03 - Owner-bound managers, hosted UI access review pending

The owner confirmed successful hosted Auth and ownership binding. Local authenticated login/dashboard/logout and native RLS checks passed. Hosted UI smoke requires review of the minimal dedicated server-side reader and pinned Auth connection in database/synthetic-world/HOSTED_SMOKE_REVIEW.md. The Auth security setting recommendation is a separate owner decision.

## U5.03 - 007 approved; private DBA session pending

Prepared the dedicated restricted reader bootstrap, 007 manifest and hosted-capable loopback HTTPS adapter. Native offline TLS database and session tests passed. The owner approved the operations on sdtsivgtcaoaeoihcwzd. The private DBA bootstrap is the first pending operation. See database/reconstruction/smoke/HOSTED_ACTIVATION.md. No hosted writes, Auth calls or exposure changes occurred.

## U5.03 - 007 management execution review

The owner reports reader creation succeeded and 007 was not applied after direct authentication failures. The password-based migration route is paused. The alternative in database/reconstruction/smoke/MANAGEMENT_REVIEW.md passed native offline rehearsal and awaits approval for the exact management SQL. The hosted dashboard and remaining game contracts stay open.

The owner confirmed the live management role has ADMIN OPTION with SET and INHERIT disabled and that all application objects are migrator-owned. The reviewed owner-context replacement uses an atomic temporary self-grant and awaits approval. No hosted SQL ran.

## U5.02/U5.03 - Full-game Overview clock and accepted-schedule contract missing

Read-only live inspection on 2026-11-23: the isolated Uranius database has stage fixtures for season 1 days 7, 8 and 9 (100/150/200 starters) and both synthetic owners, but **no** `uranius_game.game_state`, `race_team_entries` or `get_current_game_date_date`. Source inspection confirms that the original Overview's authoritative date comes from one `game_state` row, not `current_date`. The original `get_overview_race_schedule_v1(p_club_id)` consumer exists, but no verified definition is available in the sanitized inventory.

Prepared a test-only `database/reconstruction/overview/game-clock-contract.mjs` and deterministic `tests/uraniusGameClockContract.test.mjs` (9/9 passed locally); these cannot substitute for missing backend contracts. In particular, shared fixture stages must not be represented as an individual manager's accepted schedule or as published results.

**Next action:** reconcile original `game_state` table, clock initialization/pause/speed/advance rules and exact accepted-entry schedule response from reviewed source. Prepare a target-scoped versioned migration with RLS, consumer shape tests, digest and rollback for **separate owner approval**. Until then, no real Overview switch, hosted DDL, API exposure, jobs or simulation writes. U5.02 remains BLOCKED; U5.03 IN_PROGRESS, progress 49/60. See `database/reconstruction/overview/README.md`.

## U5.02 - Clock 008 prepared but not yet eligible for hosted approval

A minimal RLS-protected, paused synthetic clock and the three original game-date read signatures are prepared in `database/reconstruction/clock/008_game_clock_v1.sql` and SHA-pinned in the review-only manifest. The exact candidate hash is `f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b`. Eight static safety checks passed; authored Node tests are not yet locally executed.

**Blockers before submitting 008 for approval:** (1) native disposable PostgreSQL 17 migration/RLS and rollback rehearsal; (2) exact owner-context management wrapper restoring temporary role membership; (3) test both verified manager subjects versus anonymous/reader denial, and confirm the frozen singleton cannot be updated; (4) verify the full original game clock table source is unavailable and clearly treat this as a sandbox fixture, not as production parity; (5) separate owner approval for an exact hashed atomic package. The actual Overview race schedule still lacks accepted-entry relations and a verified response contract.

A final live read-only inspection confirmed 007 is still the last migration and the two manager mappings and synthetic stages remain unchanged. **Do not apply 008, expose new schema APIs or change any worker/scheduler now.** See `database/reconstruction/clock/README.md`.

## U5.02 - 008 native test runner ready; PostgreSQL execution still unverified

The exact candidate 008 SQL and the GitHub-backed tests were executed through Node locally: **16/16 PASS**, with candidate SQL hash and test Git blobs verified. Added `tests/uraniusClockNativePg17.mjs` for isolated, disposable PostgreSQL 17 rehearsal using the owner's existing portable binaries. The runner passes JavaScript syntax and fail-closed CLI/binary-path checks, but no PostgreSQL 17 server binaries are available to the agent session, so its full native execution remains pending.

**Remaining acceptance blockers:** native runner output must confirm exact 001–007 source replay, 008 transaction rollback and wrong-target/drift rejection, both verified manager read shapes, anon/reader/writer denial, invalid date, duplicate and cleanup. Then inspect result and prepare a reviewed, project-pinned atomic management wrapper that restores temporary role membership and records the actual SQL SHA. Owner must separately approve **any** hosted migration; neither 008 nor the original game Overview are deployed. Progress 49/60, U5.02 BLOCKED and U5.03 IN_PROGRESS.

## U5.02 - 008 native 12/12 PASS, next blocker narrowed to managed atomic wrapper

Owner-provided output on 2026-11-23 conclusively closes the prior Windows `EBUSY` and native PostgreSQL 17 rehearsal blockers: all seven migrations replayed, 008 passed **12 of 12** local PostgreSQL checks, and temporary files were cleaned up. The SQL candidate and its SHA are unchanged. The tested fixture did not connect to hosted Supabase; any pre-existing native-runner warnings in this file are superseded by this later evidence.

Remaining blockers **before hosted 008 consideration**: (1) create and test a single-statement management connection wrapper replicating the validated 007 approach with exact role grant/restoration and the eighth ledger insertion; (2) read-only privileges/advisor review and independent rollback for wrapper failure; (3) explicit owner approval for the exact scoped wrapper and SQL hash. Broader U5.02 remains blocked by missing `game_state` parity and accepted race/calendar/Overview contracts; U5.03 remains in progress. No hosted DDL, changes to project settings, original ProPeloton or AI jobs are authorized.

## U5.02 - 008 management wrapper staged but native management-role execution outstanding

After owner's successful **12/12** disposable PG17 SQL test, a separate `database/reconstruction/clock/008_management_REVIEW_ONLY.sql` wrapper was prepared and SHA-pinned (`a1317dca31d768c6fc73dd2090c58ad3e97498a83b1422ad194e1336b30fc92c`). Eight source-level static checks passed; it embeds the exact 17 statements from the 12/12-passed canonical candidate, guards the management connection, and attempts atomic role grant/restoration and ledger insertion.

**Still blocked:** the wrapper has not been executed under the realistic non-superuser management role. Native failure-injection must verify the exact temporary privilege membership state and rollback before approval. The newly added wrapper-specific five-case Node tests are authored but not yet independently run. Also the full-game accepted-race/Overview contracts remain missing. No hosted DDL or settings change and no original game modification is authorized.
