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
| U5.02 | Reconstruct existing sandbox DB | BLOCKED | Hosted 001–022 exact 17 ledger records, 200 riders/UUIDs/attributes, 2 owners, paused S1D1; 3 races, 4 stages, 3 accepted entries/preparations, 15 private selections and one verified synthetic archive after 023. Original clock progression and remaining original data/logic contracts not reconstructed. |
| U5.03 | Seed full test world | IN_PROGRESS | A/B authenticated Overview/Squad and populated Calendar verified. 023 independently verified two competing teams, ten finishers, 347 replay frames, 12 events stored in hosted DB; B Mountain Tour preserved. Full test-world assets and operational lifecycle pending. |
| U5.04 | Implement hybrid DB contracts | IN_PROGRESS | 022 native 76/76 and hosted installation PASS; 023 one private immutable competitive archive, actual hosted data-to-local-engine-to-hosted-DB readback, exact digests, ranks 1–10 and restored RLS verified. General input/run lifecycle, worker privileges, checkpoints, commands, timeline revisions and official finalization pending. |
| U5.05 | Secure sandbox APIs and storage | IN_PROGRESS | 024 participant-only derived replay: five frontend/API/bundle tests and 80 native checks passed; hosted 18 exact ledger pairs, one sanitized replay, narrow two-column reader grant, FORCE RLS, zero raw archive access grants. Actual A/B browser acceptance and remaining worker/command APIs pending. |
| U5.06 | Deploy sandbox workers and schedule | TODO | — |
| U5.07 | Integrate complete clone | IN_PROGRESS | Original Login and isolated Overview/Squad/Calendar smoke integrated; 024 restricted results and replay interface compiled, hosted projection installed, A/B browser acceptance pending. Full original clone and live viewer integration not yet complete. |
| U5.08 | End-to-end no-command and active-manager races | IN_PROGRESS | 023 manually executed no-command synthetic competitive race archived and independently verified, with no deployed worker or official effects. Automated no-command and active-manager race paths, live commands, UI integration and acceptance pending. |
| U5.09 | Multi-stage and game accounting tests | TODO | — |
| U5.10 | Performance, recovery and regression | TODO | — |
| U5.11 | Owner acceptance and evidence | TODO | — |
| U5.12 | Handover and future migration plan | TODO | — |

Gate: NOT PASSED

