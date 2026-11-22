# Race engine contracts

## U2.03 inherited contracts

| Area | Verified source contract | Units and invariants |
|---|---|---|
| Stage | [StageInput](src/race-engine/domain/StageInput.ts) carries identifiers, format, seed, settings, teams, riders, profile, orders and optional weather. | Distance is km, elevation is metres, speed is km/h, tick and sample intervals are seconds. The deterministic starting lane handles road races. |
| Riders and teams | [RiderState](src/race-engine/domain/RiderState.ts) defines attributes, roles, condition, membership, availability and finish state. StageInput records each captain and roster. | Ability values are scores. [State validation](src/race-engine/validation/validateSimulationState.ts) requires finite energy between 0 and 100 and validates membership. |
| Terrain | [terrainSpeed](src/race-engine/simulation/terrainSpeed.ts) derives pace from the elevation profile and rider capabilities. | Pace can differ between riders at the same position. |
| Orders | [TeamOrder](src/race-engine/domain/TeamOrder.ts) defines rider and team IDs, status, eligibility bounds, priority, optional target and execution time. | Eligibility is in stage km and execution time is in race seconds. Live authorization and command ordering remain separate contracts. |
| Condition and weather | RiderStartingCondition separates energy, fatigue and morale. StageWeatherInput distinguishes stage and profile weather authority. | Temperature is Celsius, wind is km/h, precipitation is mm. Fields may be null. Presence does not establish that every lane applies weather to pace. |
| Incidents and finish | [Incident integration](src/race-engine/simulation/raceIncidentIntegration.ts) and [multi-group finish](src/race-engine/simulation/applyMultiGroupFinish.ts) handle race incidents and finishing. [SimulationOutput](src/race-engine/domain/SimulationOutput.ts) contains final rider states and events. | Finish time is race seconds. Status, rank and time are separate, and rank and time may be null for non-finishers. |
| Database | [RaceDetailPage](src/pages/dashboard/RaceDetailPage.tsx) reads race_stages, race_team_entries, participant team and rider relations, and race_classification_standings. The [lifecycle SQL reference](reference/database/20260929184629_baseline_04_sql_dump_121_240.sql.txt) and CURRENT_RACE_ENGINE.md identify lifecycle, claim, payload and submission RPC boundaries. | Exact deployed columns, constraints, privileges, retries and RPC versions remain unknown. Validate drift against a separately approved sandbox. |

No hosted schema inspection or SQL execution was used.
