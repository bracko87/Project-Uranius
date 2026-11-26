# Project Uranius — progress checklist

Status: preliminary setup evidence available; Codex must verify acceptance criteria before recording PASS. No race-engine changes or paid provisioning performed.
PASS only when the acceptance criterion in PROJECT_URANIUS_MASTER_PLAN.md is verified and evidence recorded.
Allowed statuses: TODO, IN_PROGRESS, BLOCKED, PASS.
Progress: 49/60 verified.

## Milestone 1 — Source clone, Codex connection and safety (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U1.01 | Freeze source provenance | PASS | TEST_REPORT.md, independent local evidence commit `ff2ed7da0a01769d775e79d9d921006b434b23ee` |
| U1.02 | Create public Uranius repository (owner-approved) | PASS | TEST_REPORT.md. Exact public destination, Actions disabled, local remotes empty. Local evidence commit `47665ee30b76187347295e4fa28a9416b4fca3a6`. |
| U1.03 | Copy entire application | PASS | TEST_REPORT.md. Source manifests and synthetic tests verified in local evidence commit 8d077e62643870f4a30d116b8f8c2608e5917e4e. |
| U1.04 | Disable copied execution paths | PASS | Offline execution checks in TEST_REPORT.md. Evidence commit 7f4887c77313ffa15d45494fa8ed59f82922a1be. |
| U1.05 | Inventory environment dependencies | PASS | ENVIRONMENT_INVENTORY.csv and TEST_REPORT.md. Evidence commit b2871ad71a58c4b8918609ede5c25ce1a54189d1. |
| U1.06 | Isolate engine dependency closure | PASS | TEST_REPORT.md and pin manifests. Evidence commit e83b4ff5f8d83d47ad52e33911e1e3df8b725b6b. |
| U1.07 | Connect Codex | PASS | Verified local session and authorized targets in TEST_REPORT.md. Evidence commit a5d20193db69c97347b0fe1c7c186d5cff72b246. |
| U1.08 | Transfer project context | PASS | Four handover hashes and 60-task check in TEST_REPORT.md. Evidence commit 75c46bc9a8909413c0e5b4d029ef64bb863a1f08. |
| U1.09 | Establish offline build/test | PASS | Windows offline install, build and smoke evidence in TEST_REPORT.md. Commit ec1df959d81c7753e098fa52336ab148663b18aa. |
| U1.10 | Design sandbox infrastructure | PASS | PRODUCTION_PROTECTION.md and TEST_REPORT.md. Evidence commit 40bbe9cec79fcd2387ad8f38d827735f10940333. |
| U1.11 | Add fail-closed guards | PASS | Three offline Node guard tests passed. Evidence commit 34a5fb5edaab903dd6dea02c14bc5e0eedfad739. |
| U1.12 | Verify milestone | PASS | Evidence, final checks and review snapshot recorded in TEST_REPORT.md. Preflight commit 39a1fcd49b488b74f0846dc3a5b684c659b23b50. |

Gate: PASSED

## Milestone 2 — Existing engine audit and deterministic baseline (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U2.01 | Map race lifecycle | PASS | CURRENT_RACE_ENGINE.md and TEST_REPORT.md, verified eight links and seven source markers in this task commit. |
| U2.02 | Map engine versions and prior experiments | PASS | Decision matrix and offline tests in this task commit. |
| U2.03 | Inventory current contracts | PASS | CONTRACTS.md and TEST_REPORT.md in this task commit. |
| U2.04 | Audit timeline and replay consumers | PASS | Current timeline map and five verified source markers in this task commit. |
| U2.05 | Set contracts and decisions | PASS | Three offline schema tests and clock/group semantics in this task commit. |
| U2.06 | Create micro-fixtures | PASS | Synthetic micro-fixtures and two passing validations in this task commit. |
| U2.07 | Verify existing no-command baseline | PASS | Repeatable canonical no-command hash and test in this task commit. |
| U2.08 | Validate single-rider motion | PASS | Three independently calculated terrain motion checks passed in this task commit. |
| U2.09 | Validate group and energy mechanics | PASS | Nine suites and 86 passing offline checks in this task commit. |
| U2.10 | Validate time gaps and timeline | PASS | Measured crossing and timeline checks in this task commit. |
| U2.11 | Test representative field sizes | PASS | Synthetic representative fields, puncture and benchmark evidence in this task commit. |
| U2.12 | Freeze verified baseline and gap list | PASS | Frozen golden hashes and 104 offline tests plus three guards in this task commit. |

Gate: PASSED

## Milestone 3 — Hybrid simulation and tactical commands (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U3.01 | Complete resumable state | PASS | Versioned state round-trip and future-tick tests in this task commit. |
| U3.02 | Checkpoint/continuation engine | PASS | Five checkpoint positions and frozen baseline verified in this task commit. |
| U3.03 | Command contract and ordering | PASS | Seven command order and rejection tests in this task commit. |
| U3.04 | No-command invariance | PASS | Frozen output and results hold for empty, rejected and no-op cases. |
| U3.05 | Single attack test | PASS | Tick-5 accepted attack, preserved history and recomputed result tested. |
| U3.06 | Future causality | PASS | Position, membership and event causality checks passed. |
| U3.07 | Repeated commands | PASS | Latest-revision, duplicate and two-attack history checks passed. |
| U3.08 | Chase and follow | PASS | Pursuit energy, physical catch and variable follow tests passed. |
| U3.09 | Support/work/effort | PASS | Existing caps, energy cost and one-tick expiration tested. |
| U3.10 | Server authority in test harness | PASS | Ownership, revision ordering, duplicate and elapsed projection checked. |
| U3.11 | Recovery and finalization | PASS | Cancellation, restart and idempotent finalization checks passed. |
| U3.12 | Hybrid gate benchmark | PASS | 133 offline tests, three guards and representative hybrid benchmark passed. |

Gate: PASSED

## Milestone 4 — Accurate live view and completed replay (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U4.01 | Isolated replay fixture viewer | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.02 | Course and axes | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.03 | Time-driven positions | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.04 | Terrain-dependent speed | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.05 | Separate group markers | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.06 | Real gaps and distances | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.07 | Group split/formation | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.08 | Merge/finish/DNF | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.09 | Playback controls | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.10 | Connect hybrid timeline revisions | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.11 | Live controls and reconnection UI | PASS | TEST_REPORT.md and verified evidence in this task commit. |
| U4.12 | Visual regression acceptance | PASS | TEST_REPORT.md and verified evidence in this task commit. |

Gate: PASSED

## Milestone 5 — Database, full clone integration and acceptance (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U5.01 | Authorize and provision isolated infrastructure | PASS | Owner provisioned the approved Micro. Scoped verification and exact project guard evidence in TEST_REPORT.md. |
| U5.02 | Reconstruct existing sandbox DB | BLOCKED | Hosted through 027 exact 20 ledger records, 200 riders/UUIDs/attributes, 2 owners, paused S1D1; 3 races, 4 stages, 4 accepted entries/preparations, 20 private selections and one verified synthetic archive after 023. Original clock progression and remaining original data/logic contracts not reconstructed. |
| U5.03 | Seed full test world | IN_PROGRESS | A/B authenticated Overview/Squad and populated Calendar verified. 023 independently verified two competing teams, ten finishers, 347 replay frames, 12 events stored in hosted DB; B Mountain Tour preserved. Full test-world assets and operational lifecycle pending. |
| U5.04 | Implement hybrid DB contracts | IN_PROGRESS | 022 native 76/76 and hosted installation PASS; 023 one private immutable competitive archive, actual hosted data-to-local-engine-to-hosted-DB readback, exact digests, ranks 1–10 and restored RLS verified. 032 historical original finalizer recovered, lifecycle authority/replay-close and duplicate prevention identified; 034 current core finalizer and wrapper verified through metadata, official result relation contracts inspected; isolated writer and supporting effects still pending. General input/run lifecycle, checkpoints, commands, timeline revisions and official finalization pending. |
| U5.05 | Secure sandbox APIs and storage | IN_PROGRESS | 024 participant-only derived replay: five frontend/API/bundle tests and 80 native checks passed; hosted 18 exact ledger pairs, one sanitized replay, narrow two-column reader grant, FORCE RLS, zero raw archive access grants. One authenticated hosted browser display accepted; second manager visual and remaining worker/command APIs pending. |
| U5.06 | Deploy sandbox workers and schedule | IN_PROGRESS | 025/026 hosted repeat PASS; 027 calendar upgrade and novel enqueue PASS; 028 hosted new calendar race executed twice independently, one exact result persisted, duplicate idle, NOLOGIN restored, 20 exact ledger pairs, two completed jobs. Actual clock progression and continuous scheduler remain pending. |
| U5.07 | Integrate complete clone | IN_PROGRESS | Original Login and isolated Overview/Squad/Calendar smoke integrated; 024 restricted results and replay interface compiled, hosted projection installed, one authenticated browser display accepted. Full original clone and live viewer integration not yet complete. |
| U5.08 | End-to-end no-command and active-manager races | IN_PROGRESS | 023/026 verified no-command Flat Classic; 028 independently verified new calendar-generated Mountain Tour Stage 1, ten finishers, 357 frames, 12 events. Both stages have tied times and identical rank order; sporting behavior needs review. Active-manager/live command path and official finalization pending. |
| U5.09 | Multi-stage and game accounting tests | IN_PROGRESS | 029 stage-to-stage recovery proxy, withdrawal roster and provisional cumulative classification implemented; read-only actual Stage 1 energy projection verified. Seven focused offline actual-engine checks PASS, including reduced-field GC and energy carryover. Calibrated mode creates more groups but tied finishes remain. 030 hosted Stage 2 enqueue PASS; exact frozen carryover input and all ten individual conditions independently verified; both completed jobs unchanged, worker dormant and clock paused. 031 hosted Stage 2 execution PASS; exact two-stage 240km provisional GC calculated read-only, all ten conditions preserved, both prior jobs unchanged, three completed jobs and dormant worker. 032 recovered original GC/points/mountain/youth/team rules, read-only projection implemented, all nine final Node tests PASS including cancellation guard. Original finalizer and delayed-fatigue source identified. 033 recovered V1/V2 classification writers, finance prize primitive, withholding and event-lock rules; all eleven final Node tests PASS. 034 authorized original metadata-only inspection recovered deployed award generation, international ranking, payment orchestration and fatigue writers; 16 definitions fingerprinted and 21 relation contracts inspected. 035 synthetic V1 classification/award planner implemented and two pure assertion groups PASS; disposable atomic finalization, null-safe keys, paid award guard, rollback/concurrency harness committed. 035 native PG17 8/8 PASS including rollback, concurrency, null-safe award key and paid-award immutability; 032/033 Node 20/20 PASS. 036 ten historical category seed definitions recovered; exact completed private engine adapter exercised on three actual hosted outputs, 30/30 result rows mapped with missing official fields null. All six native Node adapter tests PASS. 037 approved original configuration inspection PASS: 10 categories, 40 prize rules, 281 ranking rows, race-prize tax rule; source seed exact and policy totals/rank continuity verified. 038 exact private snapshot policy adapter integrated with 035; 13/13 native Node policy checks PASS across all ten categories after private snapshot downloaded and exact SHA-256 verified. Explicit synthetic stage scoring adapter implemented; all 11 native Node result/scoring tests PASS. 036/038 scoped acceptance closed. 039 opt-in no-command legacy motion-trace competition crossing collector and 038 scoring bridge implemented; four native movement boundary groups PASS; 043A focused three-simulation harness native 2/2 full-engine checks PASS (40 crossings, exact legacy output parity, repeatability and one-day bonus suppression); scoped 039/043A offline acceptance closed, 6/6 combined. Shared-group tie policy is review-only. 040 original race-night/delayed recovery and progressive breakaway fatigue adjustment implemented; 9/9 native Node tests PASS, scoped 040 offline acceptance closed. 041 source-backed supply planning/durable limits, explicit synthetic usage, historical user-equipment fallback wear, asset modifier caps and health candidate review implemented; 8/8 native Node tests PASS, scoped 041 offline acceptance closed. 042 integrated one-day synthetic original-policy finalization packet and disposable 035 transaction wrapper with resource compare-and-set, receipts and rollback/concurrency harness committed; 7/7 native PG17 checks PASS including full rollback, concurrent exactly-once settlement, immutable retry and successful cleanup; scoped 042 one-day synthetic acceptance closed. 043 independent isolated hosted read-only baseline 16/16 PASS: 20 exact ledger pairs, three exact completed jobs and archive parity, clock paused, dormant worker, scoped access and no fixture schemas. Release readiness contract recorded; hosted activation BLOCKED. 043B recovered complete pinned original engine blob; original base workload and Phase9 canonical resource arithmetic implemented, direct source comparisons 320 fatigue/48 resource PASS; archived medical staff/centre/recovery/handover and shared supply reservation formulas implemented; 15/15 new development JS groups PASS and owner native Node 15/15 PASS; scoped 043B offline acceptance closed. 043C first offline slice composes original workload, race-night recovery and Phase9 resources with prior digest, stage/roster and resource continuity; seven development JS preflight groups PASS with canonical string equality shim; owner native 7/7 PASS. 043C second slice binds two-stage all-finisher scoring and exact policy to original carryover, prior immutable awards and local PG17 atomic settlement wrapper; two development JS groups PASS with substitute synthetic policy/hash shim; owner exact-policy native PG17 7/7 PASS, combined 043C native 14/14, scoped ordinary two-stage integrated settlement accepted. 043D separate-role authority boundary rehearsal implemented with no official writer, review-job promotion denied, independent digest evidence, prior receipt/reveal gates and immutable local receipts; owner native PG17 7/7 PASS after corrected SQL delimiters; scoped 043D authority boundary acceptance closed. 043E recovered pinned original point/profile reconciliation and historical timing guard; strict canonical row/physical marker adapter produces 038 scoring and 039 trace shapes, 7/7 development JS groups PASS with hash shim, native Node pending. Actual original health catalogue, canonical DB application writers, authoritative engine/readiness/effects inputs, server-owned marker rows, general withdrawal scoring/shared resource owner and official tables remain pending; no official accounting. |
| U5.10 | Performance, recovery and regression | TODO | — |
| U5.11 | Owner acceptance and evidence | TODO | — |
| U5.12 | Handover and future migration plan | TODO | — |

Gate: NOT PASSED

