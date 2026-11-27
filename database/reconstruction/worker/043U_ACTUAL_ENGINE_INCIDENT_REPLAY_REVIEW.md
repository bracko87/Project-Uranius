# 043U — actual legacy base-engine tick to historical incident/chase review

2026-11-27. Owner 043T 5/5 native accepted; 123/123 previous owner-accepted native groups, overall 49/60. Repository-only development; no hosted database queries, writes or activation.

## Scope
Actual internal runMultiGroupStage tick states contain per-rider energy/distance/status and group membership; public SimulationOutput snapshots omit intermediate rider energy. Child runs unchanged existing_v1 path internally, constructs output through existing createMultiGroupSimulationOutput and extracts actual initial and post-tick states. No caller-provided output, checkpoint or incident allowed at child boundary. Frozen 043N readiness binding first; common terminal tick, no commands, 30-second grid, all-finisher single-peloton road base only. Explicit synthetic supplemental weather, terrain, finish type, stage plans and GC; no authenticated server data. Legacy stamina mapped to historical endurance, condition fatigue to effective fatigue, team support and command intensity neutral. Supplemental incident weather is not a claim of actual legacy weather performance effects.

Historical occurrence uses original time-fraction distance, not measured road distance; retain both separately. Reuse 043Q eligibility with selected source checkpoint capture, then unchanged 043P/R/O initial consequence and 043T chase/rescue. Conservative no-rejoin feedback during occurrence selection: once affected, rider excluded from future candidate selection. Historical chase afterward may model rejoin; no result/energy/DNF feedback applied to legacy race and no general repeated incident or overlapping helper integration. No authority, official scoring, health persistence or final classification. Existing 043Q default receipt shape/logic preserved.

## Implementation
- 043Q selected-only capture export commit d10520275deeffb091265fc2c2467af756d666fd, blob f9b0518cb1cd138ff6ac0b4e10fe1fbe1688d739; unchanged default evaluation and receipt.
- scripts/uranius-engine-incident-replay-review.mjs initial b6b79db06a31218035f4c0fad3a99f9a00b0ff99, terminal inactive peloton correction a6430120f7606a47aae7713cec60dae299ea9198, blob 4240c43cff90bc95d1549bdbbd3d9207cca190dd.
- scripts/uranius-incident-replay-engine-review.ts f75130001c64563abea8796d0993cdadff7ec472, strict frozen input/source/context and internally run engine.
- tests/uraniusActualEngineIncidentReplayAcceptance.mjs 6441ffbafc61b8bc2aa61817eb3e3ae6e4f068d4, blob 8456df6c3b9246c8829b1eb6ad51fc3303e9f89c. Native five groups planned: unchanged independent engine output bytes, tick/snapshot/terminal energy crosscheck, selected incident and chase chain, deterministic reprojection and rejection paths, hard false authority.
- Development adapter preflight passed from re-fetched JS with original extracted MD5 and canonical JSON equality shim on explicitly synthetic 271 frames/24 riders: three selected incidents and two chase episodes; missing frame and incorrect initial energy refused. Full actual-engine esbuild/Node run not executed in development; native five groups pending. Synthetic frames do not count as actual runtime evidence.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusActualEngineIncidentReplayAcceptance.mjs --offline-only
```
Expected PASS 5/5 actual engine incident replay checks; no hosted connection, followed by cleanup. Existing node_modules/esbuild required as for 043N. No private files or PostgreSQL required. Re-run 043Q regression if desired: node tests\uraniusHistoricalIncidentEligibilityAcceptance.mjs --offline-only. Next verify actual native bridge, then chronological chase/rejoin feedback and final classification/sprint-zone integration with authenticated source admission. Hosted activation remains BLOCKED.
