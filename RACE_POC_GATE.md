# URANIUS — Race Engine Proof-of-Concept Gate (sporting evidence first)

Date: 2026-11-24  
Owner intent: Determine quickly whether Codex's **existing isolated race simulator** is technically executable and produces *plausible* cycling behavior, before continuing broad U5 database reconstruction. Original production ProPeloton must never be touched.

## Distinguish three independent questions

1. **Does an isolated engine actually run?** YES, at the earlier offline gate: Milestones U2–U4 are PASS in `MASTER_CHECKLIST.md`; 104 no-command checks, 133 hybrid checks, 144–146 replay/attack checks are recorded in `TEST_REPORT.md` and `RACE_BASELINE.md`. Those are historical owner/agent run reports, not results from the new POC command.
2. **Can we see tactical effects?** YES, `demo/race-replay/README.md` describes the local race replay and Attack comparison. The existing recorded ten-rider synthetic strong-attack demonstration improves finish time from 1020s to 870s (150s), with a peak group lead ≈1.725km. **The same successful attack used less total recorded energy**, a potential realism warning. The weaker attack was recorded as caught with no finish-time improvement.
3. **Is cycling behavior representative of real races and safe for the original multiplayer game?** **NOT PROVEN**. Tests mostly use fictional 10km and 30km courses (24–96 riders), synthetic attributes and deterministic seeds. There is no recorded comparison against real historical racing, long 120–200km distances, full 150+ fields, time trials, actual hosted workers, or player accounting. A deterministic output can still be a bad sporting model.

**Project status:** 49/60 checklist tasks remains the official scoped value; completion of 018 synthetic Squad schema does not imply U5.02 / U5.03 end-to-end completion. 018 was independently installed and verified on isolated `sdtsivgtcaoaeoihcwzd` but does not feed the offline engine nor supply missing original RiderDetails skills. Do not block the POC on 019.

## New executable offline diagnostics

`scripts/run-uranius-race-poc.mjs` bundles `scripts/uranius-race-poc-evaluate.ts` into a temporary, offline Node 20 program, runs the selected existing_v1 engine, and removes the bundle. This has **no Supabase connection, worker, network transport, authentication, paid job or production settings**.

Run in your Windows CMD checkout after `git pull origin main`:

```bat
node --test tests\uraniusRacePocSourceBoundary.test.mjs
node scripts\run-uranius-race-poc.mjs --out race-poc-local.json
```

The runner evaluates flat/24, hilly/48, mountain/96, flat/96, plus two alternate-seed 96-rider scenarios. Every simulation is executed twice to check deterministic output, rider/finisher conservation, finishing spread, output sizes, time, speed, group separation and energy values. It also runs the existing strong/caught attack comparison and checks pre-command history and energy/finish-time changes.

It reports `TECHNICAL_NO_GO`, `TECHNICAL_GO_SPORTING_IMPROVEMENT_REQUIRED`, or `TECHNICAL_GO_SPORTING_UNVALIDATED`. **These are automated diagnostic labels, NOT overall release approval.** Their heuristic thresholds are not validated professional cycling performance norms. The report intentionally includes identified warning flags even when the engine technically executes.

**Execution status:** New tests and runner committed but **not yet executed** on owner's Windows checkout. Do not invent actual measurements or assert the new POC succeeds.

The standalone existing replay is also available, independently of the new evaluator:

```bat
node scripts\race-replay-demo.mjs
```

Open the loopback URL printed by that script; visit **Attack comparison** to compare both fictional outcomes. Local browser demo does not verify hosted U5 integration.

## Interpretation and next owner/Codex decision

A **technical GO** requires all scenarios to complete, complete conserved participant IDs, byte-identical repeat output and unchanged pre-command history. A technical NO-GO means fix that failure before expanding the integration.

A **sporting GO** needs additional human-reviewed evidence: plausible race lengths and average speeds for realistic course profiles; balanced fatigue/energy accounting; varied breakaway capture/survival; observable terrain and skill advantages; credible field time gaps, team strategies and results across many seeds. Avoid arbitrary passing thresholds based only on selected test fixtures.

**Prioritized next Codex work, after reviewing the JSON:**
1. Classify each measured anomaly as intended rules, fixture artifact or engine defect, citing the actual events and states. Pay particular attention to **stronger attack finishes faster while recording less energy use**.
2. Add a 120–200km realistic road stage and a 120–160-rider fixture that preserves the simulator's actual contracts and does not force a result. Run multiple distinct seeds and report distribution and performance. If the engine cannot handle it, record exact reproducible failure; do not change racing rules to make tests pass.
3. Run a human-spectator review in the local replay comparing a flat sprint, a mountain separation and a breakaway that gets caught. Preserve initial seed and inputs and inspect real group positions, event timing and classifications.
4. Decide **GO / IMPROVE / NO-GO** for the selected engine lane, with evidence and required changes. Only after that decide the minimal U5 stage worker integration; U5.04–U5.12 stay TODO.

### Guardrails

No original ProPeloton repository writes, database connections, staging/production workers, clock unpause, payments or new hosting. Do not alter prior frozen engine output hashes merely to pass the POC. Keep new scenarios isolated, with an explicit separate engine-version decision if sporting changes are required.

## 2026-11-24 — Owner's first POC measurements: technical GO, sporting IMPROVE

Owner executed `node --test tests\uraniusRacePocSourceBoundary.test.mjs`: **4/4 PASS**. `node scripts\run-uranius-race-poc.mjs --out race-poc-local.json` completed **6/6 fictional 30km runs** with deterministic identical repeats, all finishers and conserved rosters, and unchanged pre-command history. The local demo runner opened successfully on loopback. The JSON remains on the owner's Windows workstation and was not uploaded to GitHub.

**Measured outputs:**
| Scenario | Average winner km/h | Final finish spread | Maximum simultaneous active groups | Runtime |
|---|---:|---:|---:|---:|
| flat / 24 | 42.353 | 0 s | 1 | 935 ms |
| hilly / 48 | 40.909 | 0 s | 1 | 1643 ms |
| mountain / 96 | 36.364 | 0 s | 1 | 4136 ms |
| flat / 96 | 42.353 | 0 s | 1 | 3971 ms |
| flat / 96 alternate seed | 42.353 | 0 s | 1 | 4042 ms |
| mountain / 96 alternate seed | 36.364 | 0 s | 1 | 5558 ms |

The strong attack gained **150 s** while using **0.371 less** of the engine's recorded final energy, and reached **1.725 km** peak separation; the weak attack gained zero finish time and had zero peak gap. The runner verdict was `TECHNICAL_GO_SPORTING_IMPROVEMENT_REQUIRED`. **No sporting GO is warranted.** A zero spread is a measured behavior of these selected inputs and **existing_v1 lane**, not proof that all Uranius engine modes or other fixtures cannot produce separation.

**Important source finding after reviewing results:** `src/race-engine/simulation/runDeterministicRoadRace.ts` defaults to `existing_v1`, which invokes `runMultiGroupStage`. A separate, explicit `terrain_separation_calibrated_v1` invokes `runCalibratedTerrainSeparationStage`, which configures terrain capability influence, sustained separation and drop/transition mechanics. The original POC only selected `existing_v1`. Therefore we **must compare both lanes on identical inputs before declaring the underlying separation system broken or modifying race rules**.

Added source-only `scripts/uranius-race-poc-mode-comparison.ts`, `scripts/run-uranius-race-poc-mode-comparison.mjs`, `tests/uraniusRacePocModeComparisonBoundary.test.mjs`. They compare existing and calibrated lanes using identical same-seed fictional flat, hilly and mountain races with rider conservation, group count, finish spread, event counts, speed and runtime. No engine files, production code or hosted database changed. These are committed but **NOT YET EXECUTED**:

```bat
git pull origin main
node --test tests\uraniusRacePocModeComparisonBoundary.test.mjs
node scripts\run-uranius-race-poc-mode-comparison.mjs --out race-lane-comparison-local.json
```

A calibrated mode with multiple groups is only *promising*, not sporting validated; confirm actual finish distributions and climbing realism. If both modes remain bunched, investigate terrain-hold pressure and fixture heterogeneity rather than inventing a success. The long-stage/150-rider stress scenario is still outstanding. **Do not proceed to Migration 019 on the basis of the initial POC.**

## 2026-11-24 — Calibrated POC input-contract blocker identified and fixed

Owner's first side-by-side run passed **3/3 static boundary tests**, but **all five comparison pairs failed before calibrated simulation**, reporting:
`calculateRiderTerrainCapability: full-field-rider-001.attributes.timeTrial must be between 0 and 100`.

Source inspection verified that `createSyntheticFullFieldStage` inherits the old ten-rider fixture, which deliberately omits the optional `timeTrial` and `raceIq` fields; `riderTerrainCapability.ts` requires BOTH as finite 0–100 values in the calibrated lane. This is **a POC fixture / mode-contract mismatch, not evidence that calibrated separation mechanics succeeded or failed**. No changes have been made to the underlying race rules, source fixtures, baseline golden hashes, or hosted database.

**Fix:** `scripts/uranius-race-poc-mode-comparison.ts` now constructs one explicit pair-local `StageInput` that adds bounded **fictional synthetic** `timeTrial: 60+(index*13)%35` and `raceIq: 62+(index*17)%31` to every rider. The same input is passed to the two modes. These values do not pretend to be the original player's missing skills and are not persisted. Updated boundary test asserts the two fields and shared-input structure.

Rerun only:
```bat
git pull origin main
node --test tests\uraniusRacePocModeComparisonBoundary.test.mjs
node scripts\run-uranius-race-poc-mode-comparison.mjs --out race-lane-comparison-local.json
```

**Status:** patch committed; corrected comparison has **not yet been executed**. Any new failure must be diagnosed before interpreting sporting outcomes. Keep technical and sporting verdicts separate.

## 2026-11-24 — Both engine lanes validated technically; pressure-trace investigation prepared

Owner reran the corrected paired comparison. Boundary tests: **3/3 PASS**. All five pair comparisons completed successfully. Each lane (`existing_v1` and `terrain_separation_calibrated_v1`) returned **max one active group and 0-second finish spread** for: flat 24, hilly 48, mountain 96, flat 96, mountain 96 with another seed. Calibrated runtimes on owner's Windows host were approximately 348ms / 675ms / 1352ms / 1031ms / 1081ms respectively. Explicit verdict: `BOTH_LANES_LACK_SEPARATION_ON_TEST_FIXTURES`. This does NOT imply all conceivable inputs fail or that longer realistic stages are tested.

Review of the **actual calibrated source** identifies mechanism and a measurable diagnostic next step. `groupHold.ts` classifies `cannot_hold` only below capability margin -8. `runCalibratedTerrainSeparationStage.ts` configures `separationWindowSeconds:120`; `runIntegratedTerrainSeparationStage.ts` calculates each rider's effective capability against group demand, tracks consecutive cannot-hold seconds, and proposes dropped transitions only once eligible. A replay with one group does not reveal whether no rider reaches `cannot_hold`, their pressure keeps resetting, or an eligible transition is blocked.

Added `scripts/uranius-race-pressure-trace.ts` + `scripts/run-uranius-race-pressure-trace.mjs` + `tests/uraniusRacePressureTraceBoundary.test.mjs`: no rule changes. Directly reuse the calibrated runner's existing **per-tick pressure evaluation** records, summarize comfortable / under_pressure / cannot_hold, minimum margins, consecutive pressure, reached 120-second eligibility, proposed/applied transitions, group count and final spread. Three inputs: existing flat/24 and mountain/96 fictional baselines, plus a **separate deliberately extreme fictional mountain stress test** (weaker quarter of riders, ~9–10% climb segments) for mechanism sensitivity. This stress test is not real-race calibration. Missing optional `timeTrial` and `raceIq` attributes are supplied to the local POC input with provenance of fictional-only fixture; no hosted rows, previously frozen golden fixtures or player attributes are modified.

**Owner execution pending** (committed source but not yet actually run):
```bat
git pull origin main
node --test tests\uraniusRacePressureTraceBoundary.test.mjs
node scripts\run-uranius-race-pressure-trace.mjs --out race-pressure-trace-local.json
```

Interpret the pressure trace before changing sporting rules. If `cannot_hold=0`, inspect demand / capability / terrain and fixture values. If `cannot_hold>0` but max consecutive duration under 120, determine whether resets are physically plausible or a model design issue. If eligibility reaches 120 without transitions, inspect the transition application path. If stress test separates riders but baseline doesn't, prioritize realistic heterogeneous course and rider calibration instead of blanket engine replacement. **Milestone 019 remains deprioritized; original ProPeloton production untouched.**
