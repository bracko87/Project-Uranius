# Current race engine

## U2.01 lifecycle map

Verified here means a source contract exists at the audited snapshot. Production execution, deployed RPC bodies, schedule settings and live data remain unknown. The sanitized checkout has no running scheduler or worker. The original worker files cited below were inspected read-only at the inherited source pin recorded in TEST_REPORT.md.

| Phase | Verified source evidence | Runtime unknown |
|---|---|---|
| Schedule and dispatch | The inherited universal runner calls universal_race_stage_process_lifecycle_v1 around a loop that claims next due stages through universal_race_stage_claim_next_due_v2. The accelerated branch queues checkpointed safe mode. | Active schedule, cadence, current game-speed mode and claim leases. |
| Eligibility and startlist | The inactive [team-list SQL reference](reference/database/20261009054500_chunk_team_list_finalization_in_accelerated_clock.sql.txt) checks timing and accepted team readiness before calling finalize_race_team_list_announcement_v1. [RaceDetailPage](src/pages/dashboard/RaceDetailPage.tsx) reads race entry rules and team and rider participant rows. | Actual eligibility decisions and null or stale roster behavior at deployment. |
| Preparation and lock | [Preparation API](src/pages/dashboard/race-preparation/racePreparationApi.ts) reads game time, squad options, the tactical planner, resource constraints and assignment lock state. The team-list reference limits finalization to before a race starts. | Exact lock and unlock enforcement across deployed writes. |
| Calculation input | The inherited runner requires claimed stage and simulation-run identifiers, uses a claim payload or universal_race_stage_get_calculation_payload_v1, and adapts input using pinned universal builders. [Pinned source inventory](reference/engine-pins/PINNED_ENGINE_MANIFEST.json) records the isolated copies. | Effective engine lane and payload versions on current jobs. |
| Resume lanes | Inherited pass1 and pass2 workers have separate claim RPCs and can request safe mode. The safe worker claims steps, saves progress, reads checkpoint shards, writes replay chunks and submits chunked calculation. | Active lanes, checkpoint completeness and crash/retry behavior against deployed contracts. |
| Persistence and publication | Inherited runners submit calculation via universal_race_stage_submit_calculation_v1 or its chunked counterpart and handle scenario finalization separately. [Baseline SQL reference](reference/database/20260929184629_baseline_04_sql_dump_121_240.sql.txt) contains lifecycle and live-state definitions. | Deployed publication order, transaction boundaries, replay availability timing and failure recovery. |
| Live view | [RaceReplayLiveWindowBridge](src/components/race/RaceReplayLiveWindowBridge.tsx), mounted in [main](src/main.tsx), reads get_race_stage_live_state_v1 and locks live playback to x1. [Client replay wrapper](src/lib/supabase.ts) distinguishes payload and availability reads. | Live timing and access boundaries across an actual deployed run. |
| Finish | RaceDetailPage reads persisted race classification standings; the inherited runner hands calculated results to the lifecycle RPC. Checkpoint chunks serve replay persistence and are separate from classification rows. | Exactly-once downstream effects and final ordering need later sandbox verification. |

No live command path is established by this map. Checkpoint persistence alone does not establish exact resumable simulation state or immutable history.

## U2.02 engine candidates

| Candidate | Evidence and role |
|---|---|
| Universal | Inherited worker boundary uses the universal builders and runner. U1.06 records exact local pins and a passing pinned recovery helper. Keep the universal code as the reference for worker contracts and future baseline comparison. |
| Deterministic | [runDeterministicRoadRace](src/race-engine/simulation/runDeterministicRoadRace.ts) accepts a typed StageInput without a service client. Its default existing_v1 lane passed the two offline synthetic stage tests through the shadow wrapper. Start the Milestone 2 offline audit with this lane, pinned to its source in the sanitized root d7efe2edfcda15c09bc862f418ed7e3f8feaf189. Reuse the existing shadow and replay adapters. |
| V4 | [Bridge handoff](src/race-engine-v4/bridgeHandoffV4.ts) passed its inherited Node assertion script, including eight negative cases and an idempotence check. Treat these modules as individually testable candidates. Their deployed status remains unknown. |

The selection is for offline verification. Compatibility with production results and full-field performance remain separate checks.

## U2.04 timeline and replay consumers

| Boundary | Calculated, reconstructed, and missing information |
|---|---|
| Engine output | [SimulationOutput](src/race-engine/domain/SimulationOutput.ts) records race and stage IDs, seed, mode, ordered events, snapshots and final rider states. Each snapshot contains a frame number, race seconds, stage km, group order and membership, and event sequence references. [RiderState](src/race-engine/domain/RiderState.ts) distinguishes finish status, time and position. Presentation frames alone do not establish a full resumable checkpoint. |
| Persistence | U2.01 identifies the universal safe-worker checkpoint chunk and replay submission boundary. Replay availability is separately checked by the [client wrapper](src/lib/supabase.ts). There is no deployed persistence or revision-order trace from this offline audit. |
| Replay adapter | [createReplayStageModelFromSimulationOutput](src/race-replay/createReplayStageModelFromSimulationOutput.ts) enforces increasing snapshot times and nondecreasing event times. It accepts source groupId or id, rejects duplicate membership and reconstructs stable labels for source IDs. It checks source distance, speed and leader gap. It derives presentation order and finish rows from simulation inputs, frames, events and final states. |
| Race UI | [RaceDetailPage](src/pages/dashboard/RaceDetailPage.tsx) includes a legacy visual gap calculation using gapSeconds multiplied by 0.035 and another using speed conversion and limits. Those coordinates are approximations and do not establish same-time group distance. The source leader gap is not proof of a same-location crossing-time gap. Preserve this discrepancy for later replacement with validated positions and gaps. |
| Live gating | [RaceReplayLiveWindowBridge](src/components/race/RaceReplayLiveWindowBridge.tsx) polls backend live state for playback locking. It provides no evidence that future simulation state is hidden, elapsed history is immutable, or accepted live commands are applied in a reproducible order. |

The two-rider synthetic test verifies replay adaptation in the isolated lane. It does not establish agreement between the deployed UI and calculated checkpoints, late-race retirement handling at scale or replay parity on a historical stage.
