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
