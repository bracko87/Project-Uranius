# Project Uranius — progress checklist

Status: preliminary setup evidence available; Codex must verify acceptance criteria before recording PASS. No race-engine changes or paid provisioning performed.
PASS only when the acceptance criterion in PROJECT_URANIUS_MASTER_PLAN.md is verified and evidence recorded.
Allowed statuses: TODO, IN_PROGRESS, BLOCKED, PASS.
Progress: 24/60 verified.

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
| U3.01 | Complete resumable state | TODO | — |
| U3.02 | Checkpoint/continuation engine | TODO | — |
| U3.03 | Command contract and ordering | TODO | — |
| U3.04 | No-command invariance | TODO | — |
| U3.05 | Single attack test | TODO | — |
| U3.06 | Future causality | TODO | — |
| U3.07 | Repeated commands | TODO | — |
| U3.08 | Chase and follow | TODO | — |
| U3.09 | Support/work/effort | TODO | — |
| U3.10 | Server authority in test harness | TODO | — |
| U3.11 | Recovery and finalization | TODO | — |
| U3.12 | Hybrid gate benchmark | TODO | — |

Gate: NOT PASSED

## Milestone 4 — Accurate live view and completed replay (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U4.01 | Isolated replay fixture viewer | TODO | — |
| U4.02 | Course and axes | TODO | — |
| U4.03 | Time-driven positions | TODO | — |
| U4.04 | Terrain-dependent speed | TODO | — |
| U4.05 | Separate group markers | TODO | — |
| U4.06 | Real gaps and distances | TODO | — |
| U4.07 | Group split/formation | TODO | — |
| U4.08 | Merge/finish/DNF | TODO | — |
| U4.09 | Playback controls | TODO | — |
| U4.10 | Connect hybrid timeline revisions | TODO | — |
| U4.11 | Live controls and reconnection UI | TODO | — |
| U4.12 | Visual regression acceptance | TODO | — |

Gate: NOT PASSED

## Milestone 5 — Database, full clone integration and acceptance (12 tasks)

| ID | Task | Status | Evidence / commit |
|---|---|---|---|
| U5.01 | Authorize and provision isolated infrastructure | TODO | — |
| U5.02 | Reconstruct existing sandbox DB | TODO | — |
| U5.03 | Seed full test world | TODO | — |
| U5.04 | Implement hybrid DB contracts | TODO | — |
| U5.05 | Secure sandbox APIs and storage | TODO | — |
| U5.06 | Deploy sandbox workers and schedule | TODO | — |
| U5.07 | Integrate complete clone | TODO | — |
| U5.08 | End-to-end no-command and active-manager races | TODO | — |
| U5.09 | Multi-stage and game accounting tests | TODO | — |
| U5.10 | Performance, recovery and regression | TODO | — |
| U5.11 | Owner acceptance and evidence | TODO | — |
| U5.12 | Handover and future migration plan | TODO | — |

Gate: NOT PASSED

