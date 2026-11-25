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

## 2026-11-24 — Owner pressure probe results identify same-tick disappearance question

Owner ran the 3/3 pressure-trace boundary tests (PASS) and the new offline calibrated runner. Reported:

| Test fixture | cannot_hold evaluations | Unique affected riders | Max consecutive unable | Eligible window events | Actual transitions | Max replay groups | Finish spread |
|---|---:|---:|---:|---:|---:|---:|---:|
| flat baseline / 24 | 0 | 0 | 0s | 0 | 0 | 1 | 0s |
| mountain baseline / 96 | 0 | 0 | 0s | 0 | 0 | 1 | 0s |
| extreme mountain stress / 96 | 2,589 | 24 | 120s | 633 | 29 | 1 | 0s |

This **disproves** the theory that the calibrated engine cannot detect ANY rider who is physically unable to sustain the group. Under deliberately extreme fictional terrain/weakness, it computes hundreds of eligibility events and creates 29 dropped-group transitions. However, the replay still records only one active group and zero finish spread. A successful transition does not imply a surviving distinct group.

Source inspection suggests a **same-tick reabsorption** mechanism: `calculateDroppedGroupTransitionProposal.ts` constructs a new dropped group at the source group's current `distanceKm`, while `runIntegratedTerrainSeparationStage.ts` calls `reconcileBreakawayGroups` in the same tick. `reconcileBreakawayGroups.ts` reabsorbs nearby dropped groups within a five-second peloton window and updates their riders' `currentGroupId`. This is a plausible cause, **not confirmed** until trace records pre/post reconciliation.

Extended the existing OFFLINE `scripts/uranius-race-pressure-trace.ts` to inspect each tick's existing `reconciledBreakaways.previousState` and `.state`, record whether newly dropped group IDs remain active, count `reabsorbedBreakawayGroupIds`, count riders returned to peloton in same tick, and compare maximum group counts before/after reconciliation. The human-readable CLI and no-network static checks were updated. No race rules, source golden fixtures, existing SQL, live scheduler, original production or host were changed.

**Next owner action (extended probe has NOT YET RUN):**
```bat
git pull origin main
node --test tests\uraniusRacePressureTraceBoundary.test.mjs
node scripts\run-uranius-race-pressure-trace.mjs --out race-pressure-trace-local.json
```

If `reabsorbedSameTick=29` and `survivingDrops=0`, there is a concrete reconciliation rule-ordering bug to fix **in the isolated engine only**, using a regression proving dropped riders have a physical separation opportunity and later rejoin only after a genuine catch. Keep old golden baselines pinned and require an explicit new version/mode for any changed sport rule; do not edit checks merely to force success. If counts differ, inspect recorded `firstTransitionSamples` and determine the genuine reason before changing implementation.

## 2026-11-24 — 29/29 immediate reabsorptions CONFIRMED; narrow opt-in POC repair prepared

Owner executed the extended pressure diagnostic and 4/4 boundary checks passed. For the deliberately extreme mountain test (96 synthetic riders), `cannotHold=2589`, 24 riders affected, `eligibleEvents=633`, `transitions=29`, **`reabsorbedSameTick=29`**, **`survivingDrops=0`**, **`ridersBackInPeloton=633/633`**; active groups **2 before reconciliation / 1 after**, 1 recorded in replay; **0s finish spread**. In baseline flat/24 and mountain/96, no `cannot_hold` riders and no transitions. This confirms the *same-tick peloton reabsorption* as a cause for loss of stress-fixture group separation; it does not establish ordinary rider/cycling calibration.

**Code review:** `applyDroppedGroupTransitionProposal` creates new dropped groups at the source group position. `runIntegratedTerrainSeparationStage` immediately calls `reconcileBreakawayGroups`. That reconciler applies the normal <5-second peloton catch criterion before newborn dropped riders have had any physical movement tick.

**Smallest reversible source experiment (not yet executed):**
- `reconcileBreakawayGroups(state, {protectedNewDroppedGroupIds})` accepts optional IDs, defaulting to none. It exempts **only dropped groups created at the current race second** with explicitly listed IDs from birth-tick reabsorption. No teleport, artificial initial gap, speed modification or perpetual protection. Older groups can still be physically caught normally.
- `runIntegratedTerrainSeparationStage` exposes `experimentalPreserveBirthTickDroppedGroups` default FALSE; passes only transitions with `transitionKind='created'`. `runCalibratedTerrainSeparationStage` forwards the option explicitly, default FALSE. **Existing_v1 and canonical calibrated_v1 untouched by default; earlier golden outputs are intended to remain identical**.
- The pressure trace has 4 cases: original flat and mountain baselines, identical extreme mountain control, and SAME-SEED/SAME-RIDERS extreme mountain with the opt-in experiment. The isolated stress pair differs only in the experimental birth-tick reconciliation flag. Reports remain OFFLINE and must never be used to authorize a hosted worker change.

No previous frozen baselines were modified. The new experimental probe has **NOT YET BEEN EXECUTED**. Test it before interpreting outcomes:

```bat
git pull origin main
node --test tests\uraniusRacePressureTraceBoundary.test.mjs
node scripts\run-uranius-race-pressure-trace.mjs --out race-pressure-trace-local.json
```

**Interpretation:** The experiment should eliminate immediate first-tick absorption, but may still show legitimate catches after a movement tick or zero net finishing spread. Only observed tick/position/finish evidence can establish whether this opt-in is useful. If it fails, do not change engine thresholds or existing golden tests to fabricate a pass. Only consider a sporting fix after rider energy and peloton-group catch physical consistency is independently checked. Original ProPeloton production remains excluded.

## 2026-11-24 — Birth-tick fix observed effective on same-seed extreme mountain (OWNER-RUN)

Owner ran `git pull`, the five static probe tests and the four-case offline pressure trace after the opt-in patch. Four static tests PASSED and one failed from **an outdated source-string assertion only**: the test expected `runCalibratedTerrainSeparationStage(createInitialState(input))` without the new options object, while the correct code calls `runCalibratedTerrainSeparationStage(createInitialState(input), { experimentalPreserveBirthTickDroppedGroups: ... })`. Fixed the static assertion in commit `6b96914b` to validate the two-argument opt-in call; rerun of the static suite remains pending.

**Crucial measured same-seed 96-rider stress comparison** (30km, intentionally weak 24 riders / steep artificial mountains; not a realistic cycling benchmark):

| Metric | Legacy calibrated (flag off) | Experimental protection (flag on) |
|---|---:|---:|
| `cannot_hold` evaluations | 2589 | 96 |
| Unique affected riders | 24 | 24 |
| Longest sustained unable | 120s | 120s |
| Eligible pressure events | 633 | 24 |
| Drop transitions | 29 | 1 |
| Same-tick reabsorptions | 29 | **0** |
| Groups surviving reconcile | 0 | **1** |
| Riders moved straight back to peloton | 633/633 | **0/24** |
| Max active pre/post reconcile groups | 2/1 | **2/2** |
| Max replay groups | 1 | **2** |
| Finish spread | 0s | **1104.612875195s (18m24.613s)** |

This confirms the newborn-drop same-tick reabsorption defect is prevented in the opt-in synthetic run, and physical group separation persists through replay and finish in this extreme case. **It does not establish realistic magnitudes or solve the normal flat/mountain baselines**: those remain `cannot_hold=0`, single-group, zero spread under their relatively similar attributes. The opt-in experimental behavior remains disabled by default; golden existing_v1/calibrated_v1 results were not changed or revalidated in this owner execution. Do not imply a completed sporting GO or deploy to hosted workers/production.

Next: rerun the now-repaired offline static test. Then independently verify default-off/frozen baselines, physical catch/rejoin, full rider conservation and finished classifications for the experimental scenario, and design realistic heterogeneous stages with multiple seeds and a modest gradient/skill distribution. Investigate attacker energy accounting separately before allowing engine activation. Project checklist 49/60 unchanged.

## 2026-11-24 — Owner confirms 5/5 static tests after regex repair; next integrity gate added

Owner executed `git pull origin main` to `6f2a1e9` and `node --test tests\uraniusRacePressureTraceBoundary.test.mjs`: **5 tests passed, 0 failed**. No new simulation was run in that message; the last owner-run dynamic comparison remains the **two-group opt-in extreme-mountain stress result**, with 18m24.613s gap, and 29/29 reabsorptions in default control.

Before treating the opt-in as ready for broader calibration, extended the **same offline pressure-trace command** to check: exact final rider-ID roster, all riders finishing, unique non-null finish positions, duplicate/unknown rider IDs in active replay groups, number of frames with multiple active groups, and actual peak **spatial** separation between groups in kilometres. The CLI now exits with error on failed roster, classification, or replay membership checks, not on subjective sporting spread. No simulation rules, RNG, routes, golden fixtures, database, or original game were changed.

New instrumentation and updated source-boundary test are committed but **not yet executed** on owner's local Windows checkout:

```bat
git pull origin main
node --test tests\uraniusRacePressureTraceBoundary.test.mjs
node scripts\run-uranius-race-pressure-trace.mjs --out race-pressure-trace-local.json
```

The remaining high-value sporting validation is a **realistic heterogeneous full-sized field on 120–200km stages**, true rider ability differences, smooth terrain and plausible small/medium gaps, plus physically correct rejoin and energy accounting. Do not turn on experimental flag globally or close U5 integration gates.


## 2026-11-24 — Long-stage sporting diagnostic committed (execution pending)

Owner's latest offline run after commit `7fd6243` confirmed **6/6 boundary tests PASS** and four pressure cases successfully executed. The opt-in extreme 30km/96-rider case recorded **96/96 finishers, unique ranks, zero replay membership failures, 107 multi-group frames, 6.536812km peak spatial separation, and 1104.612875195s finish spread**. The comparison default-off case still reabsorbs all 29 drops on their birth tick. The normal flat/24 and mountain/96 baselines still have zero group splits. These are observations from the owner's reported Windows output, not independent hosted execution.

Prepared a NEW, isolated long-stage sporting diagnostic to evaluate **120km with 128 synthetic riders** and **160km with 160 synthetic riders**. It varies attributes independently (rather than using 24 deliberately crippled riders), includes synthetic rolling/mountain elevation profiles, and runs two distinct deterministic seeds. Each seed/course is evaluated with the canonical calibrated default-off flag and the explicitly opt-in birth-tick experimental flag on **identical inputs** (eight runs total). Captured metrics include exact rider roster, finishers, unique valid rank positions, replay duplicates/foreign IDs, number of groups, spatial and temporal gaps, transition counts, winner average speed, energy range, runtime and output digests. A failed technical integrity condition makes the launcher exit nonzero; **sporting warning labels do not imply validated realism**. No rule changes, worker changes, database writes, hosting or live clock actions.

The three new files are:

- `scripts/uranius-long-stage-diagnostic.ts`
- `scripts/run-uranius-long-stage-diagnostic.mjs`
- `tests/uraniusLongStageDiagnosticBoundary.test.mjs`

**Not yet executed on owner's Windows machine:**

```bat
git pull origin main
node --test tests\uraniusLongStageDiagnosticBoundary.test.mjs
node scripts\run-uranius-long-stage-diagnostic.mjs --out race-long-stage-local.json
```

If a run fails, preserve the exact failure report and investigate before adjusting inputs or rules. If the two modes differ, review normal-cycling magnitudes and actual physical group catches rather than equating a gap with quality. Explicitly review the attack energy anomaly before sporting GO. **No U5 checklist gates or production decisions changed; progress stays 49/60.**


## 2026-11-24 — Owner executes long-stage diagnostics; sporting deficiencies confirmed

Owner ran new boundary tests **4/4 PASS** and all eight long-stage offline simulations with complete rider roster / classifications, no technical integrity issues. The 120km/128-rider rolling stage returned 1 group / 0s finish spread / 0 transitions for both alpha and beta seeds, with default and opt-in identical. The 160km/160-rider mountain stage returned 1 group in default-off and 2 groups in opt-in, with 8 and 7 transitions respectively, yet both had **0km peak replay spatial gap and 0s finish-time spread**. Winner speed was 40.78km/h rolling and 39.802km/h mountain in both seeds and modes. This is a **technical pass but sporting IMPROVE**, not a release GO; these observations do not prove every possible race fails.

Because `maxGroups=2` with `peakGap=0` cannot demonstrate physical separation, the long-stage diagnostic now records **per-tick** counts: birth transitions, birth-tick catches, transitions that survive birth reconciliation, later catches, ticks with >1 group, ticks with strictly positive physical distance between groups, first/last group times, maximum per-tick spatial gap, and sampled catch group ages. The printed summary exposes the new quantities. This is offline instrumentation only; no altered race logic or thresholds. Both test fixture seeds produce identical published aggregate speeds/spreads; compare the saved `inputDigest` and `classificationDigest` per seed to determine whether inputs vary without material sporting output changes. Do not infer that seed randomization is broken just from matching rounded metrics.

**Next owner-side execution (new per-tick report not yet run):**

```bat
git pull origin main
node --test tests\uraniusLongStageDiagnosticBoundary.test.mjs
node scripts\run-uranius-long-stage-diagnostic.mjs --out race-long-stage-local.json
```

Interpret `positiveGapTicks` and `laterCaught` first. If groups never acquire positive gap, inspect drop movement timing and reconciliation ordering; if a positive gap exists then disappears, validate the catch against actual group positions and speeds. Do not modify canonical golden outputs, deploy engine changes, claim sporting GO, or progress U5 based on these synthetic findings. The attack energy paradox remains unreviewed. **Checklist stays 49/60.**


## 2026-11-24 — Owner confirms the 160km groups never establish a positive distance gap

Owner reran the augmented long-stage suite: **5/5 static tests PASS**, all eight offline races completed with no technical corruption. Rolling 120km/128: no transitions and 0s spread for both seeds/modes. Mountain 160km/160: default-off had eight born and eight same-tick caught; opt-in had seven born, all seven surviving birth reconciliation, all seven later caught, **seven multi-group ticks but ZERO positive-gap ticks, ZERO peak spatial gap, ZERO finish-time spread**. Both seeds repeated the same visible summary values. Therefore the opt-in prevents instantaneous absorption but **has not established meaningful spatial separation in the normal 160km test**. Do not claim a cycling realism GO.

Source inspection shows each integrated tick performs `calculateTerrainAwareMultiGroupMovement` and `applyMultiGroupMovement` **before** evaluating sustained cannot-hold pressure and creating new dropped groups; a new dropped group inherits the source position and speed. The following tick is its first opportunity to develop a physical gap. Catch reconciliation occurs after movement. A new **read-only diagnostic extension** records each newborn group's first subsequent pre-reconciliation position and speed against the peloton, whether distance or relative speed was nonzero, and whether the catch path swallowed the group. This separates an actual no-relative-motion defect from a legitimately small gap caught under the existing five-second rule. No engine rules or thresholds changed.

**Run on Windows** (first-movement instrumentation not yet executed):

```bat
git pull origin main
node --test tests\uraniusLongStageDiagnosticBoundary.test.mjs
node scripts\run-uranius-long-stage-diagnostic.mjs --out race-long-stage-local.json
```

Inspect `firstMovementSamples` in the local JSON alongside `preCatchPositiveGapTicks` and `relativeSpeedTicks`. If relative speeds and gaps are zero, diagnose movement capability treatment for dropped groups. If actual gaps form but are immediately caught, review whether a dropped group behind the peloton should be classified by an absolute time-gap threshold with physically consistent catch criteria. No changes to golden results or production. Checklist 49/60.


## 2026-11-24 — First post-birth movement is real; catch threshold needs numerical audit

Owner's new Windows diagnostics: long-stage boundary tests **6/6 PASS**, eight long-stage simulations completed with no technical integrity errors. In each 160km/160-rider opt-in mountain run, **7/7 dropped groups survive the birth tick, 7/7 exhibit nonzero relative speed and nonzero pre-catch distance gap on their next movement tick, yet 7/7 are then caught**, leaving zero post-reconciliation gap and zero finish spread. This rules out the hypothesis that the opt-in dropped group never moves differently. It does **not** yet prove those catches are incorrect; five seconds of separation may be legitimately small.

The existing reconciler's `gapToPelotonSeconds` uses `Math.abs(group.gapFromLeaderSeconds - peloton.gapFromLeaderSeconds)` and catches groups when that is below 5 seconds. Before modifying this rule, inspect actual group-peloton distance, both speeds, and signed gap metadata in the already-saved local `race-long-stage-local.json` `firstMovementSamples` for the `mountain_160` / `birth_tick_protected` scenarios. A physical time-equivalent distance estimate must use a grounded reference speed, explicitly state convention, and preserve geometry for groups behind the peloton. Do not assume 7 legitimate 0–5s catches are defective or widen thresholds to force separation. Separate longer-stage race realism and attack energy accounting remain open. Canonical rules and U5 scope remain unchanged; 49/60.


## 2026-11-24 — Seven measured receding drops: new isolated opt-in catch experiment

Owner printed actual saved `mountain_160` / alpha / `birth_tick_protected` first-movement samples. All seven sampled newborn groups, at 2850–3750 race seconds, are **0.032546856km (32.55m) behind** the peloton, traveling **30.6471km/h** versus peloton **34.5527km/h** (relative -3.9056km/h), and all seven are reabsorbed at the first next tick. Thus the same-tick fix alone works but the legacy proximity rule erases physically receding groups on the next tick. The legacy `gapToPelotonSeconds` uses the absolute difference of stored leader-gap values and applies a <5s catch window; proximity alone does not prove a trailing slower group physically rejoined. The 32.55m distance corresponds to about 3.39s at 34.55km/h, although the stored gap fields have not been independently checked.

Added an **independent, explicit, default-off** `experimentalPreserveRecedingDroppedGroups` option wired through `runCalibratedTerrainSeparationStage` → `runIntegratedTerrainSeparationStage` → `reconcileBreakawayGroups`. When enabled only, a dropped group physically **behind** and traveling **slower** than the peloton does not merge based solely on the <5s proximity window. It may still be reabsorbed when moving fast enough to close the gap; no initial teleport, threshold change, forced gap, or permanent group exemption. The previous `default_off` and `birth_tick_protected` diagnostic paths remain unchanged. A third `receding_drop_protected` mode enables BOTH opt-ins. Long-stage runner now reports **12 paired-scenario executions** (two routes × two seeds × three modes), with the same integrity and physical movement checks. This is a hypothesis-testing POC, **not an accepted cycling rule**, and does not yet prove true catch/rejoin behavior. All canonical golden outputs and production remain untouched by default.

Source contract assertions were independently checked against the repository contents (16/16 checked patterns), but the updated Node boundary suite and twelve simulations have **not yet run** on owner's workstation. Next commands:

```bat
git pull origin main
node --test tests\uraniusLongStageDiagnosticBoundary.test.mjs
node scripts\run-uranius-long-stage-diagnostic.mjs --out race-long-stage-local.json
```

If the receding mode now produces a spatial gap, independently verify that a genuinely closing group is caught and speed/energy remain reasonable. If no gap survives, inspect samples and report exact failure; do not tune thresholds to fabricate a result. The normal rolling race still needs skill/terrain calibration and strong attack energy accounting remains open. Overall checklist: **49/60**, sporting approval **NOT GRANTED**.


## 2026-11-24 — Owner 12-run experiment passes integrity; strong separation is still uncalibrated

Owner's Windows boundary suite **8/8 PASS**, followed by the twelve-scenario offline comparison. All 128/128 rolling and 160/160 mountain participants finished; every scenario reported `technical none`. Rolling 120km returned zero transitions, one group, zero finishing spread for all three modes and both seeds. Mountain 160km default-off returned eight immediately reabsorbed drops, no separation; birth-tick-only returned seven later reabsorbed drops and zero lasting gap; **combined explicit receding-drop experiment** returned one created drop, zero same-tick/later catches, **388 multi-group ticks, 387 positive-gap ticks, 11.972km peak separation and 1105.817s finishing spread** (18m25.817s), in both alpha and beta. Winner speeds were 39.818km/h (combined), compared with 39.802km/h (other modes). The result supports **technical mechanism effectiveness**, not plausible sporting gap magnitude. Repeated aggregate outputs across seeds do not by themselves prove seed handling broken; saved per-run input and classification digests still need comparison.

For deterministic, lightweight catch validation, added `scripts/uranius-receding-catch-regression.ts` and `scripts/run-uranius-receding-catch-regression.mjs`. The focused offline synthetic test directly exercises the reconciler with: (1) receding group protected only under explicit experiment, while original default catches it; (2) a faster trailing group 3m behind that must be caught; (3) a collocated group that must be caught; and asserts rider conservation on the resulting groups. It does **not** run a long race or change race mechanics. Run locally:

```bat
git pull origin main
node scripts\run-uranius-receding-catch-regression.mjs
```

This new focused regression has **not yet been executed** on owner's checkout; do not claim PASS. Follow with review of the earlier energy/fatigue paradox and investigate rolling-stage nondifferentiation. The opt-in receding-catch rule is not activated by default. No original ProPeloton production/database changes. Sporting GO withheld and checklist remains 49/60.


## 2026-11-24 — Owner confirms direct receding/closing catch regression PASS

Owner pulled through commit `1946d31` and ran `node scripts\\run-uranius-receding-catch-regression.mjs`. Actual output: `PASS: default unchanged, slower trailing group preserved, faster closing group caught, collocated group caught, roster conserved`. This **closes the focused synthetic reconciliation behavior gate** for the opt-in experimental catch rule, but NOT the global cycling realism gate: real long-race catches, varied gaps and rider energy have not been validated. The opt-in remains disabled by default; canonical/default race rules unchanged. No hosted/prod activity. Project checklist remains 49/60.

Started next isolated audit of strong-vs-caught attack **energy totals versus time-normalized usage**. In a race finished 150 seconds earlier, total spent energy can be lower even if instantaneous effort is higher; cannot call this a confirmed energy accounting bug without reviewing the rates. New offline-only `scripts/uranius-attack-energy-audit.ts`, runner `scripts/run-uranius-attack-energy-audit.mjs` and source boundary tests measure total energy used, cost per minute/km, elapsed time and preserved pre-command history using the existing unchanged attack replay. No simulator rules, original golden tests, production, or DB modified. New test execution is **pending**:

```bat
git pull origin main
node --test tests\\uraniusAttackEnergyAuditBoundary.test.mjs
node scripts\\run-uranius-attack-energy-audit.mjs --out race-attack-energy-local.json
```

After the audit, decide whether energy behavior is explained by shorter exposure, a missing attack effort surcharge, shelter effects, or another model issue. Continue normal rolling-stage calibration and seed sensitivity investigation without broadening the rules prematurely.


## 2026-11-24 — Energy-rate contradiction resolved; saved seed audit added

Owner ran `tests/uraniusAttackEnergyAuditBoundary.test.mjs`: **3/3 PASS**, then ran the offline attack audit. Strong attack gained 150s, expended **0.370788 less total stage energy**, but expended **0.000994 more energy per minute**. The comparison pre-command race history was identical. Caught attack yielded 0s gain and zero change in both total/rate energy consumption, with history preserved. Therefore the earlier claim that the faster attack necessarily has defective energy accounting was **not justified**: shorter exposure explains lower total usage despite a higher per-minute rate. This is a scoped accounting explanation, **not a validation of realistic attack surcharge, fatigue, shelter, pacing, or energy economy**. No race rules or baselines changed.

To avoid repeated 12-run simulations, added a read-only local saved-report audit `scripts/inspect-uranius-seed-sensitivity.mjs`, plus `tests/uraniusSeedSensitivityBoundary.test.mjs`. It loads `race-long-stage-local.json` from the owner's workstation and compares paired alpha/beta input digests, exact final classification digests and visible aggregate metrics for each of six course/mode combinations; does not simulate, modify rules, or access any hosted state. Different input digests are expected because the seed text is embedded in StageInput. Identical classification digests can indicate no outcome sensitivity on these fixtures but **do not prove a universally broken RNG**. Integrated calibrated source visibly includes `state.seed` in final deterministic hash, which alone is not proof it affects movement.

New offline check **not yet executed on owner's Windows checkout**:

```bat
git pull origin main
node --test tests\uraniusSeedSensitivityBoundary.test.mjs
node scripts\inspect-uranius-seed-sensitivity.mjs race-long-stage-local.json
```

Reconciliation-specific synthetic regression remains PASS, but sporting realism remains IMPROVE (rolling stages bunch, mountain gap potentially excessive). Canonical engine mode and production unchanged; checklist still **49/60**.


## 2026-11-24 — Owner confirms zero seed sensitivity in all six long-stage comparisons

Owner ran `tests/uraniusSeedSensitivityBoundary.test.mjs`: **2/2 PASS**. Read-only saved report inspection: every alpha/beta pair has `inputDiff true` but `classificationDiff false`, `speedSame true`, `spreadSame true`; this holds for rolling_120 and mountain_160, under default-off, birth-tick-only, and receding-drop-protected (six pairs). This is direct evidence that **changing the StageInput.seed string alone does not alter classifications in these fixtures**. It is NOT evidence of nondeterminism or a universal RNG defect.

Source inspection adds a useful explanation: `runIntegratedTerrainSeparationStage.ts` does not directly read the seed in the actual per-tick movement/energy/pressure/transition path; `state.seed` is included later in the canonical deterministic report hash. `terrainAwareMultiGroupMovement.ts` also contains no direct seed/RNG references. Therefore the current calibrated path appears to implement **deterministic equations without seed-driven variation for these scenarios**. The seed appears to be part of replay identity rather than a random generator input here. This is a source-level observation over inspected files, not a proof across every transitive dependency or the older separate existing_v1 runner.

**Decision:** Do not add artificial randomness to force different seeds to vary. Cycling performance should respond first to changes in rider strengths, team orders, terrain, weather, fatigue and race events with reproducible outputs. Seed-controlled stochastic incidents/tactical uncertainty require a separate explicit design decision, deterministic RNG and pinned golden tests. Sporting gate remains IMPROVE, particularly the all-bunched rolling race and excessive 160km mountain tail gap. The catch/rejoin and time-normalized energy-accounting sub-investigations are technically resolved, while realism remains unapproved. Keep canonical modes unchanged and no hosted/production change. Official checklist **49/60**.


## 2026-11-24 — Sporting calibration: tactical responsiveness before altering physical thresholds

Owner already confirmed all six long-stage seed comparisons have unchanged classification despite differing input digests. Static source review shows no direct seed-driven variation in the inspected calibrated movement/runner. Do not inject randomness merely to make race results differ. A 120km rolling bunch with equal time may be valid; assigning identical time to a same-group sprint finish is not by itself proof of broken sports logic.

Source review identified **a more actionable missing quality gate**: `applyExecutedTeamOrderEffects.ts` implements actual `attack` grouping, but `chase`, `leadout`, `sprint`, `protect` and others are still lifecycle-only in this helper. Therefore an ordinary rolling race with `orders:[]` is not a realistic tactical contest. Before changing pressure/drop margins, validate that an explicit player attack materially changes the simulation using precisely the same field, route and seed.

Added an OFFLINE 120km rolling tactical A/B: `scripts/uranius-rolling-tactical-sensitivity.ts`, runner `scripts/run-uranius-rolling-tactical-sensitivity.mjs`, and source-boundary test `tests/uraniusRollingTacticalSensitivityBoundary.test.mjs`. Both runs use 128 fictional riders, the same terrain and seed, with the existing combined **experimental** birth/receding drop options. Only difference: one real `attack` `TeamOrder` scheduled at 35–42km for a captain, with `metadata.uraniusLiveCommand=true` to avoid an artificial five-second starting gap. The report checks ORDER_EXECUTED and ATTACK_STARTED events, finish classifications, maximum groups/gaps, selected rider time and energy, and final classification+energy digest. It **does not force tactical success**; an attack may legitimately be caught. If it produces no result change, inspect ordering/movement and avoid fabricating a win. No new racing rules or production activation.

New test committed but **NOT YET EXECUTED** on the owner's workstation:

```bat
git pull origin main
node --test tests\uraniusRollingTacticalSensitivityBoundary.test.mjs
node scripts\run-uranius-rolling-tactical-sensitivity.mjs --out tactical-local.json
```

This is two runs, not the original twelve. Realism review still must cover credible sprint ranking/time rules, meaningful sprint/leadout/chase support, team tactics, fatigue, and a variety of natural mountain time gaps before sporting GO. Official checklist remains 49/60.


## 2026-11-24 — Rolling tactical A/B fixture validation repair

Owner ran boundary test 3/3 PASS but the two-race tactical A/B executable failed **before simulation** when `createInitialState` rejected `offline-attack-1`: `maximumFollowers must be null or a non-negative integer`. This was a fixture contract oversight (omitted optional-looking field), **not proof of a tactical engine failure**. Added explicit `maximumFollowers:null` and `targetRiderId:null` to the synthetic attack order, plus source boundary assertion guarding the exact state validator's requirement. No engine rules changed. This correction has NOT yet been executed on the owner's Windows checkout:

```bat
git pull origin main
node --test tests\uraniusRollingTacticalSensitivityBoundary.test.mjs
node scripts\run-uranius-rolling-tactical-sensitivity.mjs --out tactical-local.json
```

The tactical responsiveness question remains pending until executable A/B results are captured; no sporting GO. Checklist 49/60.


## 2026-11-24 — Player tactical attack accepted, but only 0.016459452s finish difference; first-tick launch trace added

Owner's Windows tactical boundary tests **4/4 PASS**. The 120km rolling/128-rider no-order control and same-seed scheduled-attack run both finished **128/128** with **one observed active group, zero group gap and zero overall finish-time spread**. The attack run emitted exactly one ORDER_EXECUTED and one ATTACK_STARTED. The selected rider remained 128th with unchanged final energy (71.1825023680002), but was **0.016459452 seconds faster** (10593.375872657 → 10593.359413205). The digest changed but this is **not meaningful validated tactical performance**. Group-count summaries cannot prove the attack never existed between snapshots.

Source inspection: `applyExecutedTeamOrderEffects` gives the new breakaway a launchSpeedKmh (source speed + up to 4km/h), and `createBreakawayGroup` puts that in group speed. The following `calculateTerrainAwareMultiGroupMovement` computes each active group's next speed anew from group terrain pace and does **not directly use the group's launchSpeedKmh** in its pace proposal. In addition, `reconcileBreakawayGroups` has five-second catch logic and first-tick protection only while the breakaway is physically ahead. It is therefore *plausible* that the launch impulse is not physically applied and the rider is reabsorbed, but the exact first-tick proposals/catches are **not yet observed**; do not claim a confirmed root cause.

Augmented the **same two-race** offline comparison with explicit `attackTrace` and `subsequentAttackTrace`: launch speed; first movement proposed speed; peloton movement speed; signed physical distance immediately before reconciliation; whether caught; and group state over the first five ticks after the attack. The CLI prints these to distinguish lack of launch acceleration from legitimate catch. No engine physics, race rules or golden results changed.

Run only:

```bat
git pull origin main
node --test tests\uraniusRollingTacticalSensitivityBoundary.test.mjs
node scripts\run-uranius-rolling-tactical-sensitivity.mjs --out tactical-local.json
```

Inspect the new `LAUNCH` and `ATTACK TICK` rows. If launch speed is discarded by movement, design a realistic, opt-in physical launch impulse with corresponding energy accounting; if first physical gap exists but is small and caught, do not force attacker success. No production, hosted game or database changes. Checklist remains **49/60**; sporting GO not granted.


## 2026-11-24 — Real launch bonus is lost at first physical movement; opt-in proposal experiment

Owner reran the 120km rolling tactical A/B. Static tests **5/5 PASS**, both scenarios completed 128/128, single active group and zero time spread at replay resolution. One real attack order executed. Direct first-tick evidence: assigned attack launch **42.27325680742317 km/h**, applied attack physical movement **35.48669339613971 km/h**, peloton **38.29595718623174 km/h**. Attacker was **0.023410531584104888 km behind** after 30 seconds and correctly absorbed in that same tick. Thus the launch bonus is discarded by the recalculated terrain movement proposal, before the receding group rule is relevant. Selected rider gains just 0.016459452 seconds with unchanged final energy/rank. Ignore later stale inactive breakaway distances after the first caught tick; these are not active groups.

Committed a new **independent default-off** `experimentalPhysicalAttackLaunch` through the calibrated/integrated runner. Only if enabled, the integrated tick passes speeds from `appliedOrderEffects.attackEffects` created **in the current tick** into `calculateTerrainAwareMultiGroupMovement`. That calculator uses the greater of the original terrain-group pace and launch speed (within maximum configured speed), then applies existing weather multiplier. The result is a single physical `movement.movement` proposal, shared unchanged by `applyMultiGroupMovement`, `applyMultiGroupEnergy`, gap calculation and finish handling. Launch is NOT carried to later ticks, and no spatial gap is fabricated. The original options-off path is unchanged.

The offline same-seed tactical A/B scenario now opts in to the launch impulse (along with prior experimental dropped-group options). Added source assertions for option routing and common energy/movement proposal. **Not yet run on owner's Windows checkout**. Next:

```bat
git pull origin main
node --test tests\uraniusRollingTacticalSensitivityBoundary.test.mjs
node scripts\run-uranius-rolling-tactical-sensitivity.mjs --out tactical-local.json
```

Expected: LAUNCH row first movement speed should now reflect the initially assigned attack speed, but the breakaway may still be legitimately caught later. Confirm a physical positive gap on first tick, an accurate energy delta and stable roster. Check that legacy and golden behavior remain identical with the flag disabled. No sporting approval, production or original live game change; official checklist remains **49/60**.


## 2026-11-24 — Owner confirms physical launch impulse works (OFFLINE POC)

Owner pulled through commit `403dbc5`. Tactical boundary tests **6/6 PASS**. The 120km/128-rider paired rolling runs both finished all riders without technical integrity errors. Without attack: one group, zero gap, selected rider 128th at 10593.375872657s, final energy 71.1825023680002. With experimental first-tick physical attack: first move **42.27325680742317km/h**, peloton **38.29595718623174km/h**, **positive +0.033144163509923885km** signed gap and active breakaway after first reconciliation. Next 30s: attacker slowed to **35.48669339613971km/h**, peloton at **38.29595718623174km/h**, gap shrank to **+0.009733631925818997km**, and group was caught. Result: selected rider still 128th, finish time 10593.342953754s (~0.032918903s faster) and final energy 71.16858695285302 (~0.013915415 extra consumed); two active groups observed briefly, 0s final finish spread. Compared to previous OFF experiment (launch assigned 42.27 but actually moved 35.49), this verifies that the opt-in fixes the physical impulse and that a real catch remains possible. Inactive group distances in later trace rows are stale/inert; ignore them when assessing physical race gaps.

**Decision:** Close the precise discarded-launch-speed defect for the isolated experimental pathway. Do NOT describe the attacking rider as winning or a meaningful long breakaway; an underpowered single-rider attempt being caught after 60 seconds is a valid outcome. Do not react by creating a grace-period immunity or fabricating a lead. The experimental flag `experimentalPhysicalAttackLaunch` remains default OFF; production/golden simulation mode untouched.

Further source review: `multiGroupFinishCandidates.ts` already ranks riders who cross the line in the same group by **sprint score → acceleration → energy → rider ID** after comparing exact group crossing times, while `applyMultiGroupFinish.ts` assigns distinct rank with equal group time. This makes zero group finish-time spread consistent with a mass sprint and **not a defect by itself**. However, `applyExecutedTeamOrderEffects.ts` explicitly handles only `attack` and places `sprint`, `leadout`, `chase`, etc. in `ignoredOrders`. Therefore the next product gap is **meaningful execution of sprint/leadout/chase decisions**, not whether a mass sprint must show elapsed-time gaps.

Before adding tactical modifiers: define narrow, auditable effects that conserve riders and preserve same-group official time, account for higher effort/energy, and respect legal order eligibility. Keep new capabilities isolated or behind an explicit opt-in until validated. Do not activate production; sporting GO withheld. Checklist remains **49/60**.


## 2026-11-24 — First sprint/lead-out tactic prototype committed (NOT RUN)

After the owner verified the physically correct one-tick launch impulse (6/6 tests PASS and observed 33.144m positive launch lead, then catch), source analysis confirmed the engine already ranks same-group finishers by sprint → acceleration → energy while assigning one group crossing time. It also confirms the tactical effect handler supports `attack` but treats `sprint` and `leadout` as lifecycle-only.

Added an **experimental, default-off finishing tactic** to the calibrated/integrated stage via `experimentalFinishTacticsEnabled`; did not change canonical option defaults, canonical golden fixtures, hosted runtime, or player DB. Pure `experimentalFinishTactics.ts` applies only to previously **executed** sprint/leadout orders with an eligible start within the final 3km. A rider's `sprint` order adds +8 candidate ranking score, and up to two same-team/same-finishing-group lead-out riders who targeted that rider each add +4 (experimental POC values, NOT sporting calibration). A sprinter executing the order spends up to 1 energy unit; an assisting rider with valid same-group teammate target spends up to 0.75, charged on finish. These values are *hypotheses for functional tests*, not approved physiology. No speed, official group finish time, distance, rank uniqueness or rider membership is fabricated. Without the option, candidate ranking and rider energy are unmodified. The main `applyExecutedTeamOrderEffects` still labels sprint/lead-out as ignored tactical effects, but their order lifecycle can advance to `executed`, and the new finish-time evaluator explicitly interprets those executed statuses when opted in.

Added **10km / 10-rider same-seed same-orders** A/B script `scripts/uranius-finish-tactics-poc.ts` with launcher `scripts/run-uranius-finish-tactics-poc.mjs` and static boundary tests `tests/uraniusFinishTacticsBoundary.test.mjs`. It schedules a sprint and a lead-out for teammates at 8–10km, compares default-off versus experiment-on, checks actual order execution, valid classifications, individual energy, increased sprint rank and exact unchanged crossing time; fail-closed if assertions do not hold. This prototype and tests are **committed but have NOT been executed by owner**. If output fails, correct the precise contract/bug; do not modify rankings to fabricate passage. Run:

```bat
git pull origin main
node --test tests\uraniusFinishTacticsBoundary.test.mjs
node scripts\run-uranius-finish-tactics-poc.mjs
```

Next after verified functional test: calibrate fatigue/effort cost, ensure strategy cannot be exploited by multiple orders, and implement chase with physical distance/energy and real pursuit/catch tests. Sporting GO remains withheld; official checklist 49/60.


## 2026-11-24 — Sprint/lead-out fixture canonical-JSON failure isolated and repaired

Owner pulled through `03fad0b`; sprint/leadout boundary assertions **3/3 PASS**, but the executable 10-rider comparison failed in `canonicalSerialization.ts` with `Undefined object properties are not allowed in canonical JSON`. Source review confirms `createInitialState.ts` materializes each incoming order's `metadata` as an own property (`metadata: order.metadata`). Both new StageInput orders originally omitted `metadata`, leaving that property `undefined` in the canonical state. This is a **synthetic test fixture construction issue**, not yet an evaluated sprint outcome and not a reason to loosen strict serialization.

Set `metadata:{}` explicitly on both sprint and leadout orders, preserving the existing state and serializer contracts. Added a static regression asserting both order metadata objects are present and pointing to the canonical initial-state mapping. No race-rule, production or historical fixture changes. **This fix has not yet been rerun** by owner:

```bat
git pull origin main
node --test tests\uraniusFinishTacticsBoundary.test.mjs
node scripts\run-uranius-finish-tactics-poc.mjs
```

Once the POC successfully executes, verify that rank improves without artificial group-time separation, energy is charged to both the sprinter and the leadout rider, and all ten finish exactly once. If not, diagnose the next precise problem rather than forcing success. Sporting GO withheld, checklist 49/60.


## 2026-11-24 — Owner confirms experimental sprint and lead-out runtime PASS

Owner pulled through `0f3ce50`, ran `tests/uraniusFinishTacticsBoundary.test.mjs`: **4/4 PASS**, then the 10km/10-rider real executable comparison. Both same-seed, same-orders races finished and classified all ten riders. Both `leadout-a` and `sprint-a` transitioned to `executed`. With the experiment disabled, selected rider was **10th** with 902.491357259s group time and energy 97.39386999999995, teammate support energy 97.39386999999995. With `experimentalFinishTacticsEnabled`, selected rider was **1st** with exactly the **same group finishing time**, energy 96.39386999999995 (1 extra unit consumed) and helper energy 96.64386999999995 (0.75 extra consumed). Report confirms valid classification, both actual executed orders, improved rank and no fabricated time gap.

**Decision:** Mark sprint/lead-out experimental **functional proof PASSED**, not calibrated or production-ready. Going from 10th to 1st using experimental +8 sprint and +4 leadout candidate score is a potentially excessive effect. The POC currently applies the finish-order cost on crossing and has no sustained leadout/effort model, tactical location simulation, multiple-order exploitation analysis or real-race benchmark. Keep option default OFF and canonical mode unchanged.

Next source review confirms `flatStageChaseEffort.ts` and `groupCooperationPace.ts` already implement bounded pure helpers for organized chase group speed; avoid inventing duplicate helper formulas. However `runIntegratedTerrainSeparationStage.ts` currently has no direct chase order movement routing, and `applyExecutedTeamOrderEffects.ts` still ignores non-attack tactical effects. Chase development must first distinguish a team ordering riders to pursue a physically leading breakaway from a chase-group effect, establish valid membership and distance, then connect an opt-in movement/energy proposal and validate physical gap closing and catches. Do not artificially create chase groups or force catch results. Sporting GO withheld; official checklist still **49/60**.


## 2026-11-24 — Physical chase-order prototype added (not yet runtime-verified)

Following owner-verification that the opt-in sprint+leadout POC passed (10/10 valid classifications, sprinter 10th→1st with identical group time and extra energy cost for sprinter/helper), added the first **default-OFF** real chase-order movement effect, reusing the existing `calculateGroupCooperationPace` rather than inventing another chase mechanic. The option `experimentalChaseOrdersEnabled` is exposed on the calibrated and integrated POC runners and passed only when explicitly true to terrain-aware group movement.

The pure helper `experimentalChasePace.ts` only boosts an **active peloton** when a **physically ahead active breakaway** exists, its lead exceeds 5s using the actual distance/speed, and a correctly affiliated rider in the peloton has an **executed chase order** and >5 energy remaining. Cooperation score is based on existing group size, actual average teamwork, terrain gradient, capped to a maximum of 1.5% before a participation factor (one order earns half, two orders reach the maximum). The increased speed is passed into the **same physical movement proposal** used for actual distance and rider energy. This affects whole-group effort, not individual rider tactical positioning or a guaranteed catch. The current slice does not create chase groups or support sustained realistic drafting, so it is a limited hypothesis.

A fast **one-tick same-seed 10-rider POC** was added: `scripts/uranius-chase-order-poc.ts`, `scripts/run-uranius-chase-order-poc.mjs`, `tests/uraniusChaseOrderBoundary.test.mjs`. It gives one fictional rider a scheduled chase order and another rider a **real** 30s initial physical lead using the existing breakaway creation API, then compares a control vs experimental tick with identical initial state. It checks actual order execution, peloton speed improvement, gap reduction vs control, greater rider energy cost, same roster, valid uncaught breakaway, and **negative control** with the flag on but without a chase order. The launcher fails if comparisons fail. All changes are OFFLINE and no release/production options were enabled.

**Important:** The new code and static tests have **NOT yet been executed on the owner's Windows checkout**. Run:

```bat
git pull origin main
node --test tests\uraniusChaseOrderBoundary.test.mjs
node scripts\run-uranius-chase-order-poc.mjs
```

If it errors, repair the precise test or model cause without forcing an outcome. If it passes, compare physical gap closing and energy before proceeding to many-tick chase-versus-survival tests. A verified one-tick catch **is not required**; artificially swallowing a breakaway is unacceptable. Sporting realism release gate remains IMPROVE, official checklist 49/60; legacy/golden path unchanged until independent verification.


## 2026-11-24 — Owner's chase POC first run uncovered a fixture group-ID assumption

Owner pulled through commit `4c4a6f8`, ran the chase boundary assertions **3/3 PASS**, then the executable failed *before the first tick*: `createBreakawayGroup: source group peloton does not exist`. The POC hardcoded `sourceGroupId:'peloton'`, while `createInitialState` sets the group's ID using `INITIAL_PELOTON_GROUP_ID` (not guaranteed to be that string). This is **fixture setup**, not yet an engine chase defect or failed chase performance.

Repaired `scripts/uranius-chase-order-poc.ts` to determine exactly one initial active group of type `peloton` from `createInitialState(stageInput).groups` and pass that *actual* `groupId` to `createBreakawayGroup`. Both the scheduled-order fixture and no-order negative control reuse this helper; the real 30s gap is preserved. Added a static regression test preventing a hardcoded source group ID. No engine rules, production game, baseline mode or DB changed. **Not yet executed on owner's Windows machine**.

```bat
git pull origin main
node --test tests\uraniusChaseOrderBoundary.test.mjs
node scripts\run-uranius-chase-order-poc.mjs
```

The one-tick physical speed, gap and energy comparisons remain unverified pending this rerun. Checklist 49/60; sporting GO withheld.


## 2026-11-24 — Owner verifies one-tick chase; eight-tick extension added

Owner pulled through `8487d75`. Static chase assertions **4/4 PASS** and real offline one-tick chase POC **PASS**:
- Normal: peloton **42.36km/h**, breakaway **42.42km/h**, remaining gap **0.3171666666666667km**, chasing rider energy **99.931**; order executed
- Chase enabled: peloton **42.6777km/h**, breakaway **42.42km/h**, gap **0.3145191666666667km**, chasing rider energy **99.9304825**; order executed
- All seven checks true: order execution, speed increased, physical gap reduced by **0.0026475km**, more energy consumed, no-order neutrality, no forced catch and roster conservation

Thus one-tick chase-order movement functionality is **verified experimentally**; the modest physical advantage does not imply that a 30-second gap should disappear in one tick. The existing `experimentalChaseOrdersEnabled` flag remains **default OFF**; do not approve sporting calibration or production release.

Extended the same `scripts/uranius-chase-order-poc.ts` with a repeatable **eight consecutive 30-second ticks** from an identical initial breakaway state in three conditions: default-off chase command, experiment-on chase command, and flag-on without a chase command. It records every signed physical gap between active peloton and breakaway, exact movement proposal speeds, chasing rider energy, actual order status, active group count and rider count. The launcher now fails closed unless all eight ticks remain comparable, the chasing order remains executed, physical separation persists, chase reduces the final gap versus control, repeated chase incurs extra energy, the no-order run is identical at every tick and all riders are conserved. If the test reveals a legitimate catch, update the scenario/expectations based on physical evidence rather than artificially preventing reconciliation.

These additional multi-tick assertions are **committed but have NOT been executed** on the owner's checkout:

```bat
git pull origin main
node --test tests\uraniusChaseOrderBoundary.test.mjs
node scripts\run-uranius-chase-order-poc.mjs
```

Next after multi-tick results: test calibrated chase persistence, recovery and negative cases with physically stronger breakaways, then combine tactics at realistic field sizes/distances. The official progress checklist remains **49/60**; no production changes.


## 2026-11-24 — Eight-tick physical pursuit OWNER-VERIFIED

Owner ran `git pull origin main` (up to date), `node --test tests\\uraniusChaseOrderBoundary.test.mjs` (**5/5 PASS**), and `node scripts\\run-uranius-chase-order-poc.mjs` (**complete executable PASS**). The prior 1-tick test still passed all 7 physical/energy/integrity checks.

**Four-minute sustained chase comparison, identical initial 10-rider state with an actual 30s breakaway launch gap:**
- Control, executed chase order but feature OFF: final breakaway gap **0.32066666666666643 km**; chasing rider energy **99.44799999999998**.
- Executed chase order with opt-in feature ON: final gap **0.2994866666666667 km**; rider energy **99.44385999999997**.
- Chase therefore closes **0.02118 km (21.18 m)** relative to identical control, with **0.00414** more actor energy spent over the eight 30-second ticks. A true active breakaway persists; this is not a forced catch.
- **7/7 multi-tick checks true:** same tick count, physically positive gaps, all riders conserved, chase order remained executed, sustained gap reduction, sustained energy cost and no-order neutrality on every tick.

**Decision:** Mark default-off physical chase feature as **functionally demonstrated in 8-tick POC**. This does **not** validate the 1.5% cap as realistic, a full chase lifecycle, consistent performance on gradients and long stages, or actual race-level sporting results. Keep canonical and hosted paths unchanged; sporting GO withheld and official checklist remains **49/60**.

Next evidence gate: longer chase with a stronger escape to confirm a FAILED pursuit and energy depletion; a catchable scenario to verify actual group reabsorption; then mixed attack/chase/sprint integration at realistic stage distances/field sizes. Preserve identical-input negative controls, no artificial gap or catch, no production actions.


## 2026-11-24 — Chase lifecycle outcome scenarios (committed; not yet executed)

The owner confirmed the eight-tick chase experiment passes (5/5 boundary tests, all seven multistep checks). The physically ahead escape maintained a 0.32066666666666643km gap without chase and 0.2994866666666667km with chase after 4 minutes; chase consumed 0.00414 more energy. No rider was forced into a catch.

Next added `scripts/uranius-chase-lifecycle.ts`, a separate 24km **flat** fictional same-seed multi-tick probe for **two contrasting escape strengths**, each with feature OFF/ON (four simulations). All start from validated `createInitialState` and an actual `createBreakawayGroup`; the weaker rider (flat 40, stamina/resistance 55) gets a 30s launch gap, and the stronger rider (flat 99, stamina/resistance 95) gets 90s. A valid chase order is issued by a rider remaining in the peloton. Each run advances up to **36 actual 30-second ticks**, logging active breakaway's signed physical gap, both movement proposal speeds, rider energy, active group count, reabsorption from `reconcileBreakawayGroups`, and order lifecycle. Catch evidence is tied to physical collocation or the existing 5s catch window; the test never turns groups inactive manually and never forces either outcome.

The launcher `scripts/run-uranius-chase-lifecycle.mjs` fails on roster conservation, order lifecycle, fabricated reabsorption, mismatched tick windows and non-finite/absent gap evidence. It **reports rather than demands** weak catch/strong survival, because scenario outcomes cannot be assumed before real execution. Static assertions: `tests/uraniusChaseLifecycleBoundary.test.mjs`. No engine physics or production settings changed.

**Not runtime-tested yet**. On the Windows checkout:

```bat
git pull origin main
node --test tests\uraniusChaseLifecycleBoundary.test.mjs
node scripts\run-uranius-chase-lifecycle.mjs --out chase-lifecycle-local.json
```

Review actual reported `caughtAtTick`, physical gap and energy; if it reveals a genuine physical-order/reabsorption bug, repair the cause, not the expected result. Continue to mixed stage tactics only when these scenarios are validated. Keep official checklist **49/60**, sporting gate IMPROVE, all flags default off.


## 2026-11-24 — Owner verifies weak catch and strong survival in 18-minute chase lifecycle

The owner ran `node --test tests\\uraniusChaseLifecycleBoundary.test.mjs` (**3/3 PASS**) and `node scripts\\run-uranius-chase-lifecycle.mjs --out chase-lifecycle-local.json` (**runtime PASS**, all five integrity checks). Four 36-tick, 18-minute simulations:
- Weaker breakaway, 30s launch gap, no chase: **caught at tick 5**; with chase: **also caught at tick 5**. Signed gap just before final active snapshot was 0.08266666666666667km without chase and 0.07207666666666657km with chase. Both have confirmed physical reabsorption; chase rider's extra energy cost **0.0025875**.
- Stronger breakaway, 90s launch gap, no chase: **survives**, 2.4115999999999964km ahead; with chase: **survives**, 2.3162899999999915km ahead. Pursuit narrows the lead by **0.09531km (95.31m)** but does not invent a catch. Chase rider pays **0.01863** extra energy units.
- All riders conserved, real chase order executed, no fabricated catch, scenario tick horizons match, and gaps recorded. This closes **isolated chase lifecycle functional verification**, NOT sporting calibration or release approval.

### Next committed offline combined-tactics integration probe (NOT RUN)

Added `scripts/uranius-mixed-tactics-integration.ts`, an **OFFLINE, fictional flat 24km, 10-rider StageInput** with all four real supported scheduled orders: attack (km4–6), chase (km4–6), lead-out for teammate (km22–24), sprint (km22–24). The attack uses `metadata:{uraniusLiveCommand:true}` so no artificial head start is supplied. One same-input/seed control with all experimental flags OFF is compared with one experiment enabling physical launch, chase pace and finish tactics together. Real engine runner handles every movement, order and finish. Records actual order statuses, event counts, first attack launch and applied speed, physical group count, catch, eligible chase ticks, finishing rank/times/energy and classification digest. Launcher validates conservation, unique finishing positions, finite finish times, all four executed orders and actual launch movement. It reports *rather than assumes* successful catch, sprint victory or positive chase duration, so adverse sporting outcomes can be investigated honestly. All code default-off; historical and production paths unchanged. Static checks `tests/uraniusMixedTacticsBoundary.test.mjs`.

This new combined probe and checks are **committed but not yet executed on the owner's checkout**:

```bat
git pull origin main
node --test tests\\uraniusMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json
```

Do not mark full tactical integration verified before owner runs it. Next after confirmed integrated A/B: check that chase was actually eligible while a breakaway was ahead (otherwise this fixture proves only order lifecycle), compare energy charges, golden baseline safety, longer flat/rolling/mountain stages. Official 49/60, sporting GO withheld, production unchanged.


## 2026-11-24 — Mixed four-tactic integrated A/B OWNER-VERIFIED; chase coverage limitation identified

Owner ran `node --test tests\\uraniusMixedTacticsBoundary.test.mjs` (**3/3 PASS**) and `node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json` (**runtime PASS**). Both same-input 24km ten-rider races finished all ten with unique ranks, finite finish times, exactly one real `ATTACK_STARTED` and all four orders (`attack`, `chase`, `leadout`, `sprint`) executed. Attack's movement respects first-tick physical launch. Both races caught the attack; two groups appeared during the stage. Sprint/lead-out experiment changed the sprinter's ranking from 10th to 1st, charging 1 and 0.75 energy units respectively. The six committed integrity checks all passed.

**Important limit:** The combined-race comparison printed `chaseEligibleMovementTicks=1`, but the pursuing rider's final energy was **exactly equal** with and without experimental tactics: **95.30799999999982**. This means the combined fixture **does not yet establish a physical chase-speed or energy effect** despite executing a chase order. The count only establishes a movement tick with simultaneously present peloton and breakaway *after an order executed*, not that the distance gap met the 5s pre-movement requirement. In this fixture the attack may launch from the peloton at zero initial separation; reconciliation catches it quickly. Separately, the prior 8-tick and 18-minute chase experiments have already verified meaningful chase speed/gap/energy effects.

**Response:** Keep the mixed result as a confirmed **multi-order lifecycle/attack/finish integration pass** with an explicit chase physical-evidence gap. Added `chaseTimeline` diagnostic to the same combined comparison, exposing true breakaway-to-peloton distance and approximate seconds *before* each movement tick, peloton/escape applied speeds, chase rider energy used in that tick and whether the breakaway survived that tick. The CLI now prints `CHASE PHYSICS` rows; a regression guards the distinction between order acceptance and physical eligibility. No race mechanics, feature defaults, production, hosted game or DB changed.

Diagnostic not yet executed after change:

```bat
git pull origin main
node --test tests\\uraniusMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json
```

If pre-movement gap is <5s, the zero chase-energy difference is expected behavior for the current model, not a failure. Next integrated experiment should make a *real physically established* leading breakaway and separately test that chase raises applied movement and changes rider energy while sprint and lead-out orders also execute; no fabricated catch or sprint win. Sporting GO withheld, official checklist remains 49/60.


## 2026-11-24 — Owner diagnoses zero mixed-race chase energy; established-breakaway integration probe added

Owner pulled through `3df39b7` and verified the mixed tactics static assertions **4/4 PASS** and mixed 24km runtime **PASS** with all four executed orders, ten classified riders, real attack launch and actual catch. The new `CHASE PHYSICS` output resolves the apparent chase discrepancy:

- Default-off attack: first tick of attack order at race second 390 started at **0 seconds** lead and applied escape **42.42km/h** vs peloton **42.36km/h**. Next pre-movement lead **0.0005km = 0.04249 seconds**; then it was caught.
- Opt-in physical attack: first launch movement **46.366km/h** vs peloton **42.36km/h**, creating **0.0333833km = 2.83711 seconds** by the next pre-movement tick. The breakaway was caught after that tick because the existing peloton reabsorption window is **<5 seconds**.
- As the experiment requires a **pre-movement gap >=5s** for chase to activate, neither version ever qualified. The chase order *executed*, but per-tick pursuing rider energy cost was **0.069** in both versions and final rider energy was identical. **This is an explicit gap in combined-race chase activation coverage, not a validated chase benefit.**

**Additional diagnostic scenario COMMITTED, not yet runtime-verified:** Extended `scripts/uranius-mixed-tactics-integration.ts` to run a second 24km combined A/B with **one pre-existing physically separated breakaway (90-second initial lead)** using the same validated `createBreakawayGroup` fixture as earlier chase lifecycle tests. This is a purposeful mid-race setup; it is **not** attributed to the simultaneously executing attack order. The actual four scheduled orders (another attack, chase, sprint and teammate lead-out) remain in the input; all experimental options remain default OFF outside this explicit runner. The runner reports true pre-movement chase eligibility, peloton applied speed comparison between matched physical ticks, chasing rider energy cost difference, final energy delta and final classifications. It requires race completion, all finishers, four real executed orders and at least one pre-movement eligible chase tick; it *does not* require a fabricated catch or a specific winner. The earlier zero-gap control remains completely unchanged.

Review on owner Windows checkout:

```bat
git pull origin main
node --test tests\\uraniusMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json
```

Next evaluate `PHYSICAL CHASE EVIDENCE`: paired tick speed/energy, actual gap progression and whether an additional feature conflict exists. Do not claim all-four-effect physics until a positive applied speed and energy result is observed and attributable. Sporting GO withheld, checklist 49/60.


## 2026-11-24 — Owner confirms mixed established-escape chase physics; stale boundary assertion repaired

Owner pulled through `eb78a79` and ran mixed integration. Runtime **PASS**: all four real scheduled tactical orders executed and all ten riders classified in both same-input A/B trials, including the established 90-second-escape test. The new established scenario recorded **8 physically eligible chase ticks** and **8 paired trace ticks** with `positiveAppliedSpeedDifference=true` and `positiveTickEnergyDifference=true`. On the first paired tick (race second 300) the control peloton moved at **42.325500000000005 km/h** while the opt-in chase moved at **42.64294125000001 km/h**, energy consumed in that tick **0.06899999999999999** vs **0.0695175** for the chasing rider. Both had a real breakaway gap of **0.972500000000001 km (82.695578 s)** before moving. The enhanced scenario had a second-place sprinter versus tenth-place control. Both completed with all real orders.

The original no-established-breakaway scenario remains physically ineligible for chase, and correctly consumes the same energy in both paths; its attack launch gap stayed below 5s and was caught next tick. The established escape is explicit fixture setup, **not evidence that the attack system sustained a 90-second lead**.

**Additional important qualification:** the established scenario's *final* chasing-rider energy was **95.23899999999982** in control versus **95.27901999999978** in full opt-in, a delta control-minus-on of **-0.04001999999995576** (i.e. the opt-in rider ends with 0.04002 *more* energy despite greater instantaneous chase cost). This is a multi-mechanic, full-stage comparison and may reflect different race duration/exposure; it **does not prove total chase effort costs more energy**. Energy budget attribution and realistic calibration remain open.

Static boundary suite was **4/5 PASS** because test still expected literal `function run(enabled:boolean)`, changed in this patch to `function run(enabled:boolean,withEstablishedBreakaway=false)`. This is a stale string expectation, not an engine error. The test was updated. The executable launcher was additionally strengthened to **fail closed** unless one or more matched eligible ticks demonstrate positive actual peloton speed gain and per-tick rider energy increase, rather than merely printing booleans. A corresponding static guard was added. No core race physics were modified in this repair; no hosted/production configuration, paid staging or canonical golden path altered.

**These precise fixes are committed but NOT yet independently rerun by owner:**

```bat
git pull origin main
node --test tests\\uraniusMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json
```

Next evidence gate: isolate the cause of whole-stage final-energy reversal with actual tick counts/energy histories, then run realistic multi-rider long-distance calibration. Official checklist remains **49/60**; sporting GO withheld.


## 2026-11-24 — Combined tactical owner rerun PASS; full-stage chase energy attribution instrumented

Owner pulled through `a274c57` and reran the revised combined-race integration. Static assertions **5/5 PASS** and executable correctness gate PASS. All four orders executed and the ten riders received valid classifications in both baseline and established-breakaway scenarios. The established-breakaway chase achieved **8 paired eligible ticks**, actual per-tick pace improvement (**42.3255 km/h** control vs **42.64294125 km/h** experiment at race second 300) and higher actual tick energy (**0.069** vs **0.0695175**). Sprint rank improved from 10th to 2nd for the established-breakaway variant. The original zero-starting-gap attack variant still correctly fails the physical chase eligibility requirement and is reabsorbed.

**Important remaining accounting question:** In that same established-breakaway whole-race A/B the chasing rider ends at **95.23899999999982** energy (control) vs **95.27901999999978** (all-tactics). The experimental rider ends **0.04002** higher despite paying **0.0005175** more energy on eligible movement ticks. These are compatible observations only if movement exposure, stage duration, rider state or other costs differ; the precise cause has not yet been verified. Do not conclude an energy-model bug or realistic physiological calibration from a single final-state scalar.

Added purely observational instrumentation to `scripts/uranius-mixed-tactics-integration.ts` and its CLI, without changing race physics or StageInput: per-rider charged movement tick count, sum of actual `applyMultiGroupEnergy` tick energy costs, last charged second, authoritative finish timestamp, initial/final energy and the residual of (initial-final-summed movement cost). Also logs control-minus-experiment deltas of tick counts, movement costs, finish time and residual costs. New static boundary regression protects the accounting fields. The CLI prints `PURSUER ENERGY ACCOUNTING` and `ENERGY EXPOSURE DELTAS`. This is an explanatory probe, **not yet owner-executed**.

```bat
git pull origin main
node --test tests\\uraniusMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json
```

Review the new accounting rows to distinguish differing finish duration from cost mismatch. A nonzero residual should be investigated against state semantics rather than rounded away. All options remain default-off, no production/game/database changes, checklist **49/60**, sporting GO withheld.


## 2026-11-24 — Owner resolves integrated chase energy reversal; 120km/128-rider gate added

Owner pulled through `73d3ad0`, ran `node --test tests\\uraniusMixedTacticsBoundary.test.mjs` (**6/6 PASS**) and `node scripts\\run-uranius-mixed-tactics-integration.mjs --out mixed-tactics-local.json` (**executable PASS**). In the established-breakaway four-order comparison:
- Control pursuing rider finish time **2040.831207483s**, **69** charged movement ticks, summed movement energy cost **4.7609999999999975**, final energy **95.23899999999982**.
- Full experiment finish time **2028.23131909s**, **68** charged ticks, summed movement energy cost **4.720979999999995**, final energy **95.27901999999978**.
- The experiment finished **12.599888393s earlier**, saving **one complete charged tick**. Its total movement energy cost was **0.04002000000000283 less**, despite higher energy charge on actual qualifying chase ticks.
- Energy conservation residuals are within floating-point noise (~`1.83e-13` and `2.30e-13`, difference `-4.7e-14`), proving the apparent final-energy reversal is due to discrete movement exposure and not missing/duplicated per-tick charges in this fixture. This clears the **technical accounting blocker**; realistic calibration remains open.

**Next substantial offline sporting gate (committed, not yet owner-run):** Added `scripts/uranius-long-mixed-tactics-poc.ts`, a fictional **120km rolling stage with 128 riders on 16 teams**, 30s ticks, diversified deterministic abilities, **all four genuinely scheduled orders** (early chase, km35-42 attack, final 2km lead-out + sprint). An explicit pre-established 90s breakaway ensures meaningful chase opportunities; this is a separate rider and is **not claimed to arise naturally from the attack order**. The same input and seed are simulated with all three experimental toggles disabled vs explicitly enabled, leaving POC dropped-reconciliation conditions equal. Report verifies completion, 128 unique classifications, finite official times, four orders executed, true attack event, and at least one actual chase-eligible gap. It also records movement charges/finish time of the chasing rider, sprint outcome, max physical groups, and canonical comparison hashes. The launcher fails on integrity violations; it does not force tactical victory, a gap, or an energy delta. Added static checks and a self-contained esbuild/Node launcher. No hosted game, DB, production or baseline defaults changed.

**This 120km probe has NOT been run by owner.** Run on Windows:

```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

This is still a **fictional deterministic sporting stress test**, not a real-world cycling performance benchmark. After results, evaluate finish spread, tactical selection, overpowered sprint scoring, and mountain/flat cross-profile sensitivity before considering sporting GO. Official 49/60; no production changes.


## 2026-11-24 — Owner-verifies 120km/128-rider combined tactics; long-stage chase and sprint diagnostic added

Owner pulled through `8642bfb`; `node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs` **3/3 PASS**. The 120km/128-rider (16 teams) combined four-order comparison **runtime PASS**, with all five integrity checks true: 128/128 classified, unique positions, valid times, one real attack event in both, all four orders executed and real physical chase opportunity.

Observed control: **354 ticks**, peak **2 groups**, 340 ticks with a potentially chase-eligible gap, sprinter **128th**, pursuer finish **10592.895612493s**, movement-energy cost **28.213449879999988**, final energy **71.78655011999945**. All-tactics: **352 ticks**, peak **3 groups**, 207 ticks with qualifying physical separation, sprinter **96th**, pursuer finish **10548.411358741s**, movement-energy cost **28.134330571206696**, final energy **71.86566942879284**. The pursuing rider finished **44.484253752s** earlier and used 0.0791193087933 less *total* movement energy from shorter race exposure. Different final classification hashes confirm genuine output change.

**Sporting issues remain:** finishing 96th despite sprint+leadout needs group-relative analysis; 207 qualifying chase ticks does not itself mean the bonus was active for all 207 ticks, and an early executed chase command might affect the peloton far beyond its km5-8 scheduling window because `executed` status persists. A breakaway that has a 90s initial lead was explicitly pre-established for this experiment, NOT created from the live attack order. No sporting GO, no production modifications; official checklist 49/60.

**Committed observational-only refinement, NOT yet owner-run:** The same 120km script now uses the **real existing pure `calculateExperimentalChaseMultiplier` helper** on actual pre-movement state to distinguish physically eligible gaps from strictly positive chase-speed multiplier. It reports number of boost ticks, number *after* the chase order's declared eligibleUntilKm, and the first/last active speed-multiplier tick, plus sprinter's finishing-group size and relative group finishing position and sprint/acceleration attributes. CLI prints `LONG CHASE DURATION` and `SPRINT FINISH CONTEXT`. Static boundary test covers those fields. Does not change the physical movement, race state, order lifecycle, any golden baseline or release settings.

Run:

```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

Decide whether tactical chase effects should expire when the scheduled eligibility window ends based on the measured active ticks. No mechanics adjustment or extra physical-energy charge without sporting calibration evidence.


## 2026-11-24 — Chase-order duration defect discovered in 120km/128-rider owner test; experimental lifetime bounded

Owner reran the 120km 128-rider four-order POC through `41018fd`. Static boundary tests **4/4 PASS** and all five runtime integrity checks true. The new duration diagnostic exposed a real **persistent experimental chase effect beyond the scheduled km window**:
- Executed chase order has `eligibleFromKm:5, eligibleUntilKm:8`.
- The diagnostic calculated bonus eligibility over **340 ticks in OFF mode** (329 beyond the order window), and **207 ticks in ON mode** (196 beyond the window). Last potentially boosted breakaway chase position reached **119.6219km OFF** / **74.2306km ON**.
- **Correction to interpretation:** The OFF-mode diagnostic directly called the pure multiplier helper despite the engine's experiment flag being OFF; thus 340 was only a *hypothetical bonus* and no actual boost happened in that control race. The ON-mode calculation exposed actual long-lived behavior. Official classifications still valid: 128/128 finishers; sprinter 128th OFF, 96th ON; all four orders executed. Sprint rider's attribute values (sprint 49, acceleration 50) and reported relative group place 96/128 show that a 32-place improvement from an unusually weak sprinter should not itself be taken as sprint-balance failure. Any deeper sporting conclusion still needs controlled skill/context analysis.
- The proximate code cause: `calculateExperimentalChaseMultiplier` only checked `order.status==='executed'` and execution time, not the order distance window. As an executed order remains executed, the physical boost could persist after kilometre 8.

**Experimental-only code repair committed, NOT yet runtime-verified:** In `src/race-engine/simulation/experimentalChasePace.ts`, require the authoritative `state.currentKm` to lie in `[order.eligibleFromKm, order.eligibleUntilKm)` for that executed chase order to confer pace. This uses the same authoritative stage-km marker as the order's eligibility clock, without deleting the executed order or changing its event lifecycle. All flags remain default OFF; no canonical engine or production path changed.

The long-stage diagnostic now counts *applied* boost ticks only when `enabled=true`. The executable gate refuses an OFF-mode boost, zero actual experiment boost ticks, or any experiment boost after the order's km8 end. Both chase boundary and long-stage static assertions were updated. The earlier isolated chase POCs schedule through km10 and are expected to remain valid, but must be rerun to confirm.

**Required owner validation:**
```bat
git pull origin main
node --test tests\\uraniusChaseOrderBoundary.test.mjs tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-chase-order-poc.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

Interpret the expected new diagnostics as **zero control boost ticks and zero boost ticks after order expiry**, with at least one experiment chase-boost tick inside the window. New outcome rankings and finish times may change legitimately because a long-lived experimental pace buff was removed. A **strictly successful runtime** is required before marking the defect repaired. Check sprint group context again; sporting approval remains withheld, official checklist **49/60**, no hosted production work.


## 2026-11-24 — Owner verifies 120km chase expiry fix; sprint finishing-score audit added

Owner pulled through `dfa0f8c` and ran both updated chase boundary suites **9/9 PASS**, original one/eight tick chase POC **PASS**, and 120km/128-rider four-tactics A/B **PASS** with all five integrity checks. This validates the earlier chase lifetime repair:
- Real boost ticks in feature-OFF control: **0**. In opt-in race: **8**.
- Chase order was scheduled to km5-8; boosted ticks after the scheduled window: **0** in both runs.
- First boosted tick was at race second **420**, peloton physical distance **4.411699km** (global authoritative race kilometre was already within the 5-8km window). Last boosted tick second **630**, peloton physical distance **6.803713km**. The order's eligibility clock uses `state.currentKm`, not each group's distance, so this distinction is intentional for now and should be separately reviewed in sporting calibration.
- Both races completed all **128/128** riders with classifications and all four orders executed. Control: **354 ticks**, sprinter **128th**, pursuing rider finish **10592.895612493s**, total movement cost **28.21344988**. Full experiment: **354 ticks**, sprinter **96th**, pursuer finish **10591.255575794s**, movement cost **28.217657425**. The experimental rider finished **1.640036699s earlier** but spent **0.004207545** more energy. No endless boost and no canonical/production changes.
- The target sprinter has low base sprint **49** and acceleration **50**, and finished **96/128** in a same-group sprint. One fixed 8-point sprint + 4-point leadout boost raises effective sprint score to 61 at most; this is plausibly insufficient against many riders with higher sprint attributes, rather than evidence of an underpowered sprint tactic.

**New scoring audit committed, not yet owner-run:** The same 120km combined POC now reads the genuine `finishDetection.candidates` from the sprinter's actual crossing tick; it reports original sprint skill, effective actual finish-candidate sprint score, assigned bonus, number of rivals with strictly higher/equal score in the *same finish batch*, and the sprinter's actual within-batch rank. This avoids inferring bonus application solely from the final position. The runner prints `SPRINT SCORE AUDIT`, and the static boundary test guards instrumentation. This is observation only; no fixed bonuses changed. Run:

```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

After confirmation, develop a controlled high-skill sprinter sensitivity sweep before tuning fixed sprint/leadout bonuses. Keep global sporting GO withheld and official checklist **49/60**.


## 2026-11-24 — Owner confirms sprint score accounting; controlled strong-sprinter sensitivity committed

Owner pulled through `0b35da5` and ran the 120km/128-rider four-tactic POC. Static boundary tests **5/5 PASS**; all 128 riders finished in each control/experiment and all four orders executed. The actual authoritative crossing-tick `finishDetection.candidates` establish:
- Original rider sprint **49**, acceleration **50**. Normal finish candidate sprint **49**, with **125 higher-scoring rivals and 2 ties**, rank **128**. With opt-in sprint+lead-out, effective sprint score **61**, exactly the expected **+12**. He then had **92 higher-scoring rivals and 3 ties**, rank **96**. This is fully explained by the deterministic finish order, **not** evidence that the +12 sprint bonus failed or should automatically be increased.
- Chase lifetime remains correctly bounded: 0 actual boosted ticks in control, 8 within the scheduling window in experiment, and 0 after expiry. Complete stage outputs unchanged compared with prior verified run.

**New opt-in calibration evidence, committed but not yet runtime-tested:** The existing 120km synthetic same-seed A/B now also runs an otherwise-identical second pair in which the selected rider's **sprint skill alone is raised from 49 to 94**, preserving acceleration, stamina, energy setup, teammates, seed, route, all four order schedules, physical escape setup and all 127 other riders. The same engine is run with tactics OFF and ON. The report records actual crossing-tick sprint scores, same-batch higher-score rivals, within-batch and official positions, all rider classifications, signed movement effort, and the same chase-expiry protections. Strong-sprinter outcomes are reported rather than a 1st-place win being forced. The main executable report adds `SPRINT SKILL SENSITIVITY` and `STRONGER SPRINTER` lines and fails if the new pair loses all-rider classification or violates its fixed 94-vs-49 skill assumptions. This is a four-scenario **offline** experiment, not a scoring or sporting-rule change.

Owner Windows verification:

```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

After observing results, judge whether the +12 sprint/lead-out bonus behaves proportionately with rider quality and whether deterministic rank ordering requires further modelling (e.g., position or fatigue); do not tune a fixed bonus without comparative evidence. No production work, canonical default changed or paid staging; official 49/60 and sporting GO withheld.


## 2026-11-24 — Owner verifies weak/strong sprint-skill sensitivity; independent sprint/leadout factorial added

Owner pulled through `5c3f6fc` and executed 120km 128-rider four-scenario A/B with **6/6 static tests PASS** and all nine executable integrity checks true. Unchanged synthetic rider with base sprint 49: **128th** without effects, **96th** with +12 (sprint +8, leadout +4). Only changing that rider's sprint to **94** produced **4th** without effects and **1st** with +12 (effective sprint score **106**). Both strong-rider variants have zero strictly higher-scoring same-finish-batch rivals; ranking 4th in the control is therefore attributable to tie ordering and/or acceleration/energy criteria among riders with the same sprint skill. All 128 riders classified, scheduled four-order lifecycles executed and early chase remained bounded (0 actual OFF-mode boost ticks, 8 ON-mode, 0 after order expiry). These data validate fixed bonus application to both rider skill levels; they do not by themselves establish external sporting realism. Do **not** change +8/+4 just to force a ranking.

**Next controlled, OFFLINE score-isolation gate committed, not yet owner-run:** Extended the *same* 120km/128-rider long-mixed race with three additional **high-sprint (94)** simulations. All experimental attack/chase/finish flags are identical and ON; the only difference is whether the two finishing orders are present:
- Neither finishing order: **0** expected sprint-score bonus.
- Leadout only: **+4** expected.
- Sprint only: **+8** expected.
- Both finishing orders: **+12** expected (reuse existing verified `strongerExperiment`).

The existing earlier weak-sprinter and strong-sprinter A/B runs are preserved. The new `strongFinishFactorial` report captures true finishing candidate score, final rank, same-group rivals with higher score, helper and sprinter energy, all classified riders and executed orders. It fails closed on 128-rider classification, preserved attack and chase, default-off chase lifetime, or unexpected actual 0/4/8/12 bonuses. This is a `StageInput` order-presence ablation, **not a tweak to any of the race engine's scoring formulas**. It will help establish independent and combined finishing effects under identical race physics; it deliberately does not assume each isolated boost must yield a win. This adds three full-stage offline runs; no paid resources, hosted traffic or production changes.

Owner Windows verification:

```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
node scripts\\run-uranius-long-mixed-tactics-poc.mjs --out long-mixed-local.json
```

Output includes `STRONG SPRINTER FACTORIAL` / `FINISH ORDERS`. Next evaluate sprint vs leadout rank and energy effects before deciding if formula needs further sporting calibration. Sporting GO withheld; official checklist **49/60**.


## 2026-11-24 — Owner verifies independent +4 leadout and +8 sprint contributions; stale signature assertion repaired

Owner pulled through `9539e5d` and executed the 120km/128-rider factorial experiment. All **12 executable integrity checks passed**; all six simulated race variants classified their full 128-rider fields, the early attack/chase remained intact, the bounded chase did not boost after its intended window, and the four finishing-order conditions produced their expected real finish-candidate scores. Strong rider with sprint 94:
- Neither: effective sprint 94, ranked 4th, helper final energy 74.62621092087976, sprinter 71.17820473939855.
- Leadout only: effective 98 (+4), **ranked 1st**, helper energy 73.87621092087976 (**0.75 charged**), sprinter energy unchanged.
- Sprint only: effective 102 (+8), ranked 1st, helper energy unchanged, sprinter energy 70.17820473939855 (**1.00 charged**).
- Both: effective 106 (+12), ranked 1st, helper and sprinter both charged respective energy costs. Bonuses additive in *score*, **not additive in rank** once the rider is already first. Not a sporting defect established by this evidence.

Static boundary suite was **6/7 PASS** because an obsolete regex still demanded `function makeInput(strongSprinter:boolean):StageInput`, while the correct implemented function is `function makeInput(strongSprinter:boolean,finishOrders:FinishOrders='both'):StageInput`. This is a stale test expectation, unrelated to runtime mechanics. Updated the assertion to the actual signature, with no runtime/physics modification. The updated static suite has **not yet been owner-run**.

Verify:
```bat
git pull origin main
node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs
```

The expensive six-race executable factorial was already owner-verified on this code except for its static assertion, and need not be repeated merely to validate a text-matching test change. Next sporting evidence should address varied field skill distribution and finish-position tie-breaks instead of changing bonuses from a single winning configuration. Official 49/60; no production/hosted game/DB changes; sporting GO withheld.


## 2026-11-24 — Owner verifies final static boundary repair; sprint/lead-out factorial gate closed

Owner pulled through `655270a` and ran `node --test tests\\uraniusLongMixedTacticsBoundary.test.mjs`: **7 tests, 7 PASS, 0 FAIL**. This resolves the stale `makeInput` signature assertion without altering any engine logic.

Combined with the immediately preceding owner-executed six-race 120km/128-rider factorial (all **12 executable integrity checks true**), the isolated sprint/leadout integration test is now **complete**:
- Four physically simulated long-stage tactical orders and bounded chase operation already verified.
- Selected strong rider sprint 94: **4th** with neither finishing order, **1st** with leadout only (+4 points; helper 0.75 energy), **1st** with sprint only (+8 points; sprinter 1.00 energy), and **1st** with both (+12, both energy costs).
- Selected low-sprint rider 49: **128th** with effects disabled, **96th** with both bonuses. Same 128-rider field and deterministic fixture.
- Identical ranks for leadout-only/sprint-only/both once 1st place is reached are a **rank-ceiling effect**, not failure of additive score bonuses.
- No further rerun of this fixed factorial is necessary absent code changes or new requirements.

**Do not interpret this local integration closure as sporting GO.** Official project checklist stays **49/60**. Next substantive sporting gate should test alternative course profiles and field skill distributions plus actual escape/catch behavior, not repeatedly probe this same 120km 128-rider fixture. No production, hosted DB or canonical default changed.


## 2026-11-24 — Sprint and lead-out integration closed; course × rider-field realism gate implemented

Owner verified the previous sprint/lead-out factorial by pulling `655270a` and running `tests/uraniusLongMixedTacticsBoundary.test.mjs`: **7/7 static tests PASS**, following the previously verified 12/12 runtime integrity checks. That particular fixed-bonus integration milestone is complete; no additional reruns needed.

**Next genuinely distinct POC committed, not yet executed by owner:** `scripts/uranius-course-field-realism.ts` and its self-contained esbuild launcher `scripts/run-uranius-course-field-realism.mjs` run a deterministic six-race matrix: **three fictional route profiles** (120km completely flat, 120km rolling, 160km mountainous) × **two 128-rider/16-team ability distributions** (varied heterogeneous skill vs uniform all-74-skill negative control). All races share a fixed synthetic seed, the same 128 rider/team IDs and the same km35–42 **real live attack order**. Physical attack launch and the dropped-group preservation experiments are explicit POC opt-ins. **No initial breakaway/gap is manufactured.** This contrast is intentionally about *natural* actual attack evolution, not the earlier 90-second established-escape scenario.

Reports per scenario: exact 128-rider roster; finish-position uniqueness, finite times, replay membership; real `ATTACK_STARTED` effect and actual first movement speed; positive-gap tick count, peak physical gap in kilometres, recorded actual reabsorption/catch second, peak concurrently active group count, finish-time spread, winner average speed, winner flat/climbing/sprint attributes, and classification hash. Survival and capture are **observations**, not forced PASS criteria. The launcher fails closed only on broken simulation/roster/classification or absent genuine attack effects, while sporting realism remains subject to critical human review. Added static boundary tests for scope, physical attack provenance, isolated execution, and technical failure modes.

Run on Windows:

```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```

The output will provide direct new evidence on whether more demanding terrain and skill diversity produce sensible catch/gap behavior, instead of repeatedly exercising the same sprint bonus. **No production, Supabase, paid staging, canonical fixture or default engine change.** Official checklist **49/60**, sporting GO still withheld.


## 2026-11-24 — Owner runs six terrain×ability simulations; major sporting realism warning

Owner pulled through `df12326`. The new six-race offline matrix completed **3/3 static boundary tests and 5/5 technical integrity checks**. Each 120km flat/rolling and 160km mountain scenario finished 128/128 riders, exactly one genuinely issued attack, no synthetic initial attack gap, no missing riders or invalid rankings.

**Sporting evidence is worrying, not a pass:**
- In **all six scenarios**, official finishing-time spread was **0 seconds**, despite heterogeneous climbing/flat/rider sprint attributes.
- All six live attacks generated only **two physical positive-gap ticks** and were caught; their peak gaps were only around **0.0333–0.0364km** (33–36m).
- Winner averages: flat varied **41.1532km/h**, rolling varied **40.7802km/h**, mountain varied **39.7989km/h**. Uniform groups were slightly faster (~41.76, 41.39, 40.38km/h).
- Attacks and group membership are demonstrably functional at short time scales. These results do **not** prove real cycling race outcomes or stage-dependent selection. The mountain profile has ten-kilometre elevation intervals and is quite gentle in effective grade despite its nominal name; gradient must be quantified before claiming elite mountain-grade selection.
- Zero finishing spread may be a fully intact peloton and insufficient pressure to split, rather than a bug in finish-time interpolation. We must trace the engine's **`pressureEvaluations`**, rolling inability-to-hold durations and actual dropped-wave transitions before modifying catch rules or fabricating outcome gaps.

**Observational diagnosis committed (not yet owner-executed):** The existing six-race POC now reports actual maximum segment uphill/downhill percent grade from route points; number of rider×tick evaluations with `hold.status==='cannot_hold'`, unique riders experiencing it, maximum accumulated separation-pressure seconds; number of actual terrain-drop group creations and newborn same-tick or later catches; count of unique official finishing times and final rider energy range. These values come from the real calibrated integrated tick traces and do not alter rider scoring, group movement, course, default options or any race results. Static boundary regression guards the added instrumentation.

Owner validation (diagnostic run is needed; unlike last factorial, this collects new substantive evidence):

```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```

If inability-to-hold pressure stays zero on the mountain route, the next separate hypothesis should test *real* sustained 8%+ gradients with explicit severity flag and held-out rider field, before changing any default split thresholds. If positive pressure accumulates but drops are eliminated, investigate the exact eligibility and reconciliation stage. No default/core/production change; official project checklist remains **49/60**, sporting GO withheld.


## 2026-11-24 — Owner verifies zero group pressure across six races; real steep-climb control added

Owner ran six 128-rider races through `8956120`; **4/4 static checks PASS**, all five runtime technical checks true. In all six scenarios, `cannotHoldEvaluationCount=0`, `cannotHoldDistinctRiders=0`, `maxSeparationPressureSeconds=0`, `terrainDropsCreated=0`, and exactly one unique official finish time. The original profiles had max uphill gradients **0%** (flat), **2%** (rolling), **4.6%** (nominal mountain). Genuine live attack occurred once per run but only survived for two positive-gap movement ticks, max approximately 33–36m, before being physically caught. Thus no evidence yet of genuine terrain-driven dropped groups or sporting separation. Do not manipulate final times or fake initial gaps.

Root cause is now narrowed but not proved: `evaluatePressure` calculates group demand from mean rider terrain capability, applies shelter, then `calculateRiderGroupHold` marks a rider `cannot_hold` only when capability margin falls **strictly below -8 points** (requires 120 consecutive seconds of inability to hold for transition). Calibrated runner already activates the existing `progressive_resilience` steep severity in both pressure and movement, but the observed profiles never passed the **+8% steep severity onset**. An entirely unchanged group on +4.6% terrain does not demonstrate the steep severity algorithm's effectiveness.

**New diagnostic committed, not yet owner-executed:** Existing `uranius-course-field-realism.ts` adds a fourth **`steep_160`** fictional 160km route with two 10km segments climbing **1200 metres each = +12% gradient**, including descending/valley segments to avoid an endlessly ascending profile. Both the heterogenous and uniform 128-rider fields are run, bringing the matrix to **8 scenarios**. Same true attack order at km35–42, identical deterministic rider setup, default calibrated steep severity (already on), existing default-off physical-attack launch POC opt-in. The newly added scenario tests the actual severity onset *without changing any race engine constants, thresholds, catch rules, finish ranking or production data*. Runner technical gate is now `eightScenarios`; new static test protects route length, climb elevations and all eight scenarios. Run:

```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```

Inspect specifically the **steep_160 heterogeneous** `cannotHold`, `pressureMaxSec`, `terrainDrops` and `uniqueFinishTimes` fields. If there is still no inability-to-hold, the next sporting diagnosis should inspect raw **minimum capability margins and group-demand/shelter values** on the steep segment rather than weakening -8 or synthesizing gaps. Sporting GO remains **NO GO**, official checklist **49/60**, production untouched.


## 2026-11-24 — Owner verifies natural steep-climb group splitting; attack behavior remains suspect

Owner pulled through `b4e9b1f`. Static test **5/5 PASS** and eight-scenario runtime gate **5/5 PASS**, 128/128 classified in every race. New **steep_160** profile (two sustained +12% climbing segments) produced crucial distinct behavior:

**Heterogeneous 128-rider field:** 523 ticks; winner average **38.5084356548 km/h**; **240 cannot-hold evaluations involving 59 distinct riders**; reported maximum post-tick separation pressure **90s**; **5 terrain-dropped groups created**, none reabsorbed at birth or in later catch ticks; peak **6 concurrently active groups**; **6 distinct official finishing times** and total finish spread **712.664875572s** (~11m52.7s). Rider final energy range **46.2907–58.7261**.

**Uniform 128-rider negative control** on identical +12% climbs: 500 ticks; average **38.4450 km/h**, **0 cannot-hold evaluations**, 0 pressure, 0 terrain drops, **1** finishing time for all 128 riders. The contrast validates real field-ability sensitivity at steep terrain and argues against faking gaps or lowering canonical hold thresholds.

**Attack caveat:** In the heterogeneous steep scenario the sole live attack shows **zero positive-gap ticks**; reported maximum signed gap was **-0.16120559831km**. This does not mean the attack event failed; it may indicate the attack group was slower than the peloton at first movement/caught immediately or launched from another group. Other seven cases also caught their attempted attack. Do not infer a physics defect from sign alone: trace the source group and both applied speeds at the attack movement tick plus catch reconciliation before changing mechanics.

**New observability-only probe committed, awaiting owner run:** The eight-race diagnostic now captures the first 4 physical movement ticks following the attack, including source gap, actual attack and peloton applied speeds, before-catch signed distance and reconciliation, and lists every created dropped group with birth second/km, rider count, physical gap, catch status, final group active flag, actual rider finishing times and post-tick pressure. Runner prints `STEEP ATTACK LAUNCH` and `STEEP TERRAIN DROP FATE` for the two steep scenarios; static boundary regression added. This probes whether the negative attack lead is a tactical weakness versus an actual order-targeting/launch issue, and why peak pressure reads 90s despite 5 drops (post-transition reset is one hypothesis, not confirmed).

Owner Windows commands:

```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```

Next priority after receiving output: assess launch and drop lineage before any physics changes; then build sporting comparisons against grounded race-like conditions. No production or canonical default changes. Official checklist remains **49/60**, sporting GO withheld.


## 2026-11-24 — Steep attack trace diagnostic syntax fixed after owner build failure

Owner pulled through `54e620b` and ran `tests/uraniusCourseFieldRealismBoundary.test.mjs`: **6/6 PASS**. The full esbuild runner then failed **before simulation** at `scripts/uranius-course-field-realism.ts:126` with `Expected ";" but found ":"`. Root cause was a duplicated ternary fallback `}) : [] : []` in the newly authored `attackLaunchAudit` diagnostic. No race engine execution took place in this attempt; prior successful eight-race results from `b4e9b1f` remain the last runtime evidence.

Changed the erroneous expression to the valid `}) : []` in the **diagnostic script only**, without any race-physics change. The boundary suite now also imports esbuild's `transformSync` and parses/transpiles the actual TypeScript diagnostic, so another syntax regression fails the short static suite before the long stage run. These changes were committed but the owner has not yet rerun them.

Owner commands:
```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```
If successful, inspect `STEEP ATTACK LAUNCH` and `STEEP TERRAIN DROP FATE` and base any mechanic decision on actual negative gap provenance. Sporting gate remains **49/60 NO GO**; no hosted, canonical, or production change.


## 2026-11-24 — Owner confirms trailing attack is physically behind; default-off catch safeguard prototyped

Owner pulled through `a8229c0`, ran short boundary suite **7/7 PASS** and full eight 128-rider race simulations: all technical checks true. Steep +12% heterogeneous route created 5 legitimate terrain-dropped groups and 6 unique finish times; 59 distinct riders under pressure; maximum spread **712.664875572s**.

**Observed attack root cause (user-executed real tick trace):** at simulation second 3420, the attacking rider's new group had already been born at second 3390 at a position **-0.180364333km relative to the leading peloton**, because the attack originated behind it in an already trailing/drop group. The attacker physically moved **26.63885 km/h** while peloton moved **24.33981 km/h**, shortening gap to **-0.161205598km** over a 30s movement tick. Nevertheless, old `reconcileBreakawayGroups` marks any non-dropped group at or behind peloton as caught, moves all of its rider IDs into peloton and updates their `distanceKm` to peloton's position, even when it remains >160m behind. This is **real backwards-location teleportation**, not a failed attack acceleration; physical validity requires not reabsorbing a distant trailing attack.

**Proposed OFFLINE opt-in fix committed but NOT YET RUNTIME VERIFIED:**
- `reconcileBreakawayGroups` adds optional `experimentalPreserveTrailingAttackGroups`. If a `breakaway` is behind the active peloton by more than the latter's 5-second physical catch-distance, keep it as a separate active group. Once it physically closes that radius, normal catch/reconciliation is allowed. Existing historical behavior remains unchanged when flag off.
- `runIntegratedTerrainSeparationStage` and `runCalibratedTerrainSeparationStage` propagate this flag, defaulting false. Standard production/canonical paths are unchanged.
- `uranius-course-field-realism.ts` preserves all eight existing scenarios and executes **one additional**, otherwise identical 160km heterogeneous steep stage with this safety option ON. It requires complete classification of 128 riders; compares original catch versus the protected group's first physically negative gap and active survival; does not force a breakaway victory.
- Runner prints `TRAILING ATTACK PHYSICAL CATCH CONTROL` and `TRAILING ATTACK PHYSICAL CATCH PROTECTED`. Static boundary test asserts option wiring, protection predicate, report and TypeScript syntax. Build and test have **not** been executed after these commits.

Owner commands:

```bat
git pull origin main
node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs
node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json
```

This is a geometry safeguard candidate, not proof of full realistic attack dynamics or a production release. Official 49/60, sporting NO GO; do not change canonical defaults.


## 2026-11-24 — Owner validates isolated trailing-attack catch safety in ninth offline race

Owner pulled through `7e24040`, ran `node --test tests\\uraniusCourseFieldRealismBoundary.test.mjs`: **8/8 PASS**. Ran `node scripts\\run-uranius-course-field-realism.mjs --out course-field-local.json`: **all 8** baseline 128-rider races and **one additional** protected heterogeneous 160km steep race completed with every technical check TRUE, including `trailingAttackProtectedComplete`, `trailingAttackNoTeleport` and `trailingAttackControlCaught`. All 128 riders classified in the protected run.

**Matched physical launch tick at t=3420:** attack group started 0.180364333019km behind peloton. Attacker's movement speed 26.6388532441 km/h vs peloton 24.3398050790 km/h; remaining separation 0.161205598310km behind. The original rule *caught* this rider anyway and transferred him forward to the peloton. The new default-OFF `experimentalPreserveTrailingAttackGroups` rule records `caught=false`, `remainsActive=true`, preserving the actual trailing group.

**Follow-up physics (protected):** at t=3450/3480/3510, isolated rider pace drops to 22.1420125139 km/h while peloton remains 24.3398050790 km/h. Trailing deficit increases 0.161206 → 0.179521 → 0.197835 → 0.216150km. No fabricated early breakaway win, no catch/teleport. Final stage finish spread was **712.759774444s**, versus **712.664875572s** historical behavior, **6 distinct finish times** in both. This is an important geometric correctness improvement, not proof that the overall attack-sustainability model is realistic.

**Physical catch milestone: experimental PASS only; canonical/production release NOT approved.** The correction remains default-OFF by design. No further runs of this identical protected-vs-original steep case are needed absent code modifications. Next distinct sporting question: sustained attack dynamics beyond the launch impulse. Source inspection confirms `attackLaunchSpeed.ts` computes a launch speed bonus, while `terrainAwareMultiGroupMovement.ts` applies the experimental launch speed only on the tick whose order executed, then future ticks use the group's normal terrain/energy pace; this may explain attacks fading quickly, but do not force a long-lived speed bonus or claim a defect without evidence from varying timing, rider strength, and fatigue. Sporting GO still withheld, official **49/60**. No production/backend/hosted state modified.


## 2026-11-24 — Attack sustainability study implemented with no-order controls

Following owner verification of the ninth protected trailing-attack race (**8/8 boundary tests; all simulation checks true**), started the next **different** sporting question: can a physical attack maintain a lead beyond its launch impulse, and how does timing and rider ability affect that?

New isolated scripts `scripts/uranius-attack-sustainability.ts`, `scripts/run-uranius-attack-sustainability.mjs`, and boundary test `tests/uraniusAttackSustainabilityBoundary.test.mjs` are committed but **NOT YET RUN by owner**. Six 120km/128-rider rolling-route races share the same synthetic 16-team field, fixed seed, one nominated attacker, route, opt-in physical attack launch and opt-in no-teleport catch protection:
- Original nominated rider with no order, original rider attacking **early (km 5–8)**, and original rider attacking **late (km 70–73)**.
- Otherwise-identical nominated rider with only his flat, climbing, acceleration, stamina, resistance, and recovery attributes elevated to 95, again with no order, early attack and late attack. All 127 competitors' inputs remain unchanged. This is intentionally a high-ability sensitivity intervention rather than historical rider calibration.

The study checks: all six complete and rank all 128 riders with finite official finishing times; exactly four physical `attackEffects` (and none in no-order controls); all scheduled attacks executed. It records per-run attack source group, real first- and second-tick velocities versus peloton, initial and peak positive signed spatial gaps, counts of positive-gap ticks, actual catch moment, group survival and nominated rider's rank/finish time/energy. Launcher prints explicit `AGAINST NO-ORDER` deltas by ability × timing. **No artificial lead gap or forced success.** The existing race engine's one-tick launch impulse and all scoring thresholds remain unchanged; defaults and production untouched.

Owner Windows commands:

```bat
git pull origin main
node --test tests\\uraniusAttackSustainabilityBoundary.test.mjs
node scripts\\run-uranius-attack-sustainability.mjs --out attack-sustainability-local.json
```

Next decision is empirical: whether any profile exhibits sustained positive physical separation or favorable trade-off in energy/finish time, and if not whether to model strategic continued effort as a distinct **default-off** behavior or revise target/order eligibility. Sporting approval remains **NO GO**, official **49/60**.


## 2026-11-24 — Owner verifies attack sustainability; anomalous apparent energy savings require accounting audit

Owner ran `tests/uraniusAttackSustainabilityBoundary.test.mjs`: **4/4 PASS**; six 120km/128-rider races all completed with 5/5 runtime checks. Nominated weak rider had no useful sustained escape (2 positive-gap ticks, caught) when attacking at km5 or km70, and remained rank 128. Nominated physically strong rider with flat/climbing/acceleration/stamina/resistance/recovery=95 escaped successfully in both cases: early attack at 480s achieved **303 positive-gap ticks**, 12.10648km peak lead, rank 1, official finish 9533.28023s versus no-order 10575.29438s (~1042.01415s gain); late attack at 6270s achieved 130 positive-gap ticks, 5.06281km peak lead, rank 1, finish 10136.02865s (~439.26573s gain). Early solo pace remains 45.4339km/h across multiple ticks; late solo pace settles around 43.8520km/h, above peloton ~38.8731km/h. Thus multi-tick group capability, not only first-tick impulse, can sustain a genuinely strong rider's gap. These are **synthetic extreme-ability examples, not calibrated realistic race odds**.

**Sporting warning:** Successful stronger attacker finishes with *more remaining energy* than own stronger-rider no-order baseline: +2.26418 early and +0.94213 late. This is not enough by itself to prove a conservation/accounting defect: the successful attacker races for many fewer ticks, hence fewer time-based energy charges, and the engine's current energy cost is calculated from applied speed, base speed, gradient, duration, stamina/resistance/recovery, with group shelter **only if** `groupShelterEnergyEnabled===true`. It may reflect cost-model calibration rather than bad bookkeeping.

Added an **observational real-cost ledger, not yet owner-run**, in the existing six-race offline study. Per scenario it now sums actual `tick.appliedEnergy.applications` for the nominated rider: number of energy-charged movement ticks/seconds, total actual charged energy, no-shelter cost, shelter saved and ticks where shelter applied, mean rider speed, first/last three charged ticks, launch and first follow-up charged tick, energy cost per course km, and independently checks `initialEnergy - sum(real charge) - finalEnergy` within 0.0001. Runner prints `ENERGY ACCOUNTING` and controlled against-baseline differences in active ticks, recorded energy cost/km and shelter savings. No change to `energyCost.ts`, movement, engine defaults or tactics. If the charge-ledger check fails, diagnose it before changing the core model. If it passes, focus on whether time-based effort and missing drafting relief generate plausible tradeoffs, and compare realistic-strength riders rather than boosting only one athlete to six 95s.

Owner:
```bat
git pull origin main
node --test tests\\uraniusAttackSustainabilityBoundary.test.mjs
node scripts\\run-uranius-attack-sustainability.mjs --out attack-sustainability-local.json
```

**Official checklist 49/60, sporting NO GO; production and canonical defaults untouched.**


## 2026-11-24 — Owner confirms energy ledger exact; shelter savings missing because OFF

Owner pulled through `5e90b42` and ran `tests/uraniusAttackSustainabilityBoundary.test.mjs`: **5/5 PASS**. Owner-executed six-race offline test returned **all 6 runtime technical checks TRUE**, including new `energyAccountingExact`: each `initialEnergy - sum(tick.appliedEnergy.applications[].energyCost) - finalEnergy` is within 1e-12 (numerical noise) across all runs. Thus **no missing/duplicated energy charge is evident** in these scenarios.

Strong rider no-order: **353 charged 30-second ticks**, **22.7633372** energy consumed, **77.2366628** remaining. Strong rider early attack: **318 charged ticks** (35 fewer), **20.4991530** consumed, **79.5008470** remaining; stage ~1042s faster. Strong rider late: **338 charged ticks** (15 fewer), **21.8212093** consumed, **78.1787907** remaining; stage ~439s faster. Faster solo success **saves stage-duration charges**. Original-strength unsuccessful attacks both expend ~0.016–0.017 extra, same 354 ticks. All six `shelterSaved=0` and `shelterAppliedTicks=0`: initial `SimulationState.groupShelterEnergyEnabled` defaults OFF, so these races cannot yet evaluate peloton drafting relief.

**Paired isolated experiment committed, not yet owner-executed:** Extend `uranius-attack-sustainability.ts` with a second six-race matching grid, toggling only `groupShelterEnergyEnabled:true` on the initial state passed into the accepted calibrated wrapper. Preserve all six OFF cases, strength/attacks/course/seed unchanged, plus new six ON cases. Fail closed if any of the six ON cases fails to complete/finish all 128/rank or energy ledger, or if the actual appliedEnergy applications show no shelter savings. Report per pair OFF/ON charge total, saved-by-shelter, charged ticks, final reserve/rank/time. This **does not change** engine code, canonical initial state, default flags or production; merely exercises the pre-existing experimental shelter energy state flag.

Owner CMD:
```bat
git pull origin main
node --test tests\\uraniusAttackSustainabilityBoundary.test.mjs
node scripts\\run-uranius-attack-sustainability.mjs --out attack-sustainability-local.json
```

Interpretation: positive energy relief for group riders and none for isolated rider after launch is a required qualitative sanity check; even if successful, physical attack effort calibration and the unusually enormous long escape success gap remain independent sporting NO-GO issues. Official checklist **49/60**.


## 2026-11-24 — Owner verifies paired drafting ON/OFF energy (12 runs); metric corrected

Owner pulled latest staging through `2e05bfd`, ran boundary suite **6/6 PASS** and twelve offline 120km/128-rider race comparisons, all runtime technical checks true: `sixComplete`, `classificationIntegrity`, `fourPhysicalAttacks`, `noFabricatedBaseline`, `allScheduledOrdersExecuted`, `energyAccountingExact`, `shelterComparisonComplete`, `shelterComparisonLedger`, `shelterReallyApplied`, `unchangedNoShelter`. All six baseline OFF race outcomes matched old deterministic hashes. Shelter ON did **not change ranks or finishing times** in these controlled scenarios, but it changed actual energy charges, with no unexplained accounting discrepancy.

Energy LEFT, for strong nominated rider:
- No order: OFF **77.2366628**, ON **79.403513**; shelter saved **2.16681** energy points across the whole race.
- Early attack: OFF **79.500847**, ON **79.594357**; shelter saved **0.09351** energy points, as rider attacks at ~km5 and rides alone most of the race.
- Late attack: OFF **78.1787907**, ON **79.4658519**; shelter saved **1.287038** points because rider stays in peloton until ~km70.
Original-strength no order/early/late: ON shelter saved respectively **2.742159**, **2.726427**, **2.726411** energy points, consistent with attacks that were caught almost immediately. Positive savings do not themselves demonstrate physically calibrated aerodynamic benefit. A radically strengthened solo attacker still wins by >17 minutes in early case and >7 minutes in late case; test deliberately sets six rider attributes to 95 while leaving opponents heterogenous 48–95.

**Minor diagnostic interpretation defect fixed, not yet owner-retested:** the printed `shelteredTicks` had been counting all ticks where `shelterMultiplier` was non-null, including **solo groups with zero actual energy saved**. The underlying energy ledger and `shelterSaved` totals were correct. The report now separates `shelterEvaluatedTicks` (multiplier was calculated) from `shelterAppliedTicks` (strictly positive `shelterEnergySaved`). Added a static TypeScript compilation test for both metrics. No race engine, actual energy, ranks, speed, or default options changed.

**Next distinct sporting priority:** investigate the strong rider's unreasonably large solo winning margin using a *gradient of plausible rider strength*, rather than repeating the known successful extreme 95-attribute run. Evaluate deterministic finish/attack and energy vs close-by strengths (e.g. multiple ability values), keep paired no-order baselines, and do not claim sporting GO without real-race-like calibration. Official checklist **49/60**, sporting NO GO. No hosted/production data touched.


## 2026-11-25 — Moderate rider-strength attack sustainability matrix committed

Previous owner-executed drafting energy study completed 12/12 128-rider race scenarios, with **6/6 boundary tests and every technical check PASS**. Existing `groupShelterEnergyEnabled:true` provided real deterministic peloton energy savings without changing stage placement/times in that 12-race scope. A subsequent reporting-only patch distinguished evaluated from positive-saving shelter ticks; that patch is not yet owner-run.

New, distinct sporting test, **committed but not yet dynamically executed**: `scripts/uranius-strength-gradient.ts`, `scripts/run-uranius-strength-gradient.mjs`, and `tests/uraniusStrengthGradientBoundary.test.mjs`. It runs **15** deterministic 120km rolling-stage races with 128 riders (16 teams), one nominated rider at five physical capability levels **76 / 82 / 86 / 90 / 94**, each with **no-order / early attack at km5–8 / late attack at km70–73**. Only the nominated rider's flat, climbing, acceleration, stamina, resistance and recovery are set to each target value; opponents and seed/course remain identical. Unlike the earlier extreme-95-only test, all 15 start with existing `groupShelterEnergyEnabled:true` and the pre-verified offline no-teleport option ON. The engine is otherwise unchanged, and there is no fabricated gap or deterministic forced winner.

The matrix records actual attack effect, positive-gap ticks, physical gap peak and catch; rider finish rank/time/energy, actual per-tick charged energy and shelter savings, and classification digest. The CLI prints matched `RIDER STRENGTH DELTA` versus that ability's no-order control. It fails closed unless all fifteen races complete with 128 finite official finish times and unique ranks, ten actual scheduled attack effects, five zero-order controls and executed orders, energy reserve reconciliation and real drafting savings. A 3-part Node boundary suite also transpiles the source with esbuild before simulation.

Owner command (new test, not a repeat of prior accepted matrices):

```bat
git pull origin main
node --test tests\\uraniusStrengthGradientBoundary.test.mjs
node scripts\\run-uranius-strength-gradient.mjs --out strength-gradient-local.json
```

**Decision gate:** Examine whether a capability threshold causes a sudden implausible jump from two-tick catch to multi-kilometre escapes. If so, characterize the pace/cost mechanism before modifying any canonical threshold. DO NOT mark sporting GO from synthetic 15-race sensitivity. Official checklist remains **49/60**; no production, hosted state or default engine settings changed.


## 2026-11-25 — 15/15 owner-tested strength gradient reveals discontinuous attack escape outcomes

Owner pulled through `9961c3d`, passed `tests/uraniusStrengthGradientBoundary.test.mjs` **3/3**, and executed **15/15 completed 128-rider 120km stages** with all seven technical checks TRUE, including 10 actual attack effects and five no-order controls. All no-order controls finish the nominated rider **126th** at every strength 76, 82, 86, 90, 94, and exhibit **0 official finish-time spread** despite heterogeneous field. An early attack at 76/82/86 is caught after two positive-gap ticks, with no rank gain. Early at **90/94** survives for >300 positive-gap ticks and wins by stage spreads **831.44s / 1009.20s**. Late at **76** is caught but **82/86/90/94** succeeds and wins with stage spreads **191.37s / 273.67s / 348.75s / 425.30s**. Winners' peak physical leads range ~2.19–11.62km. Rated 94 early attack ends with slightly more energy than its own no-order control; energy ledger and drafting savings checks pass.

**Sporting diagnosis:** The abrupt transition between two-tick catch and enormous escape does not follow directly from rider attribute input alone. `groupTerrainPace.ts` calculates each group's speed from that **group's average attributes**, while `pelotonPace.ts` averages every peloton member (flat 45%, stamina 25%, resistance 20%, teamwork 10%), so a lone sufficiently capable rider can travel considerably faster than a diluted large-group average. The movement engine permits this differential to persist for hundreds of ticks, and a near-peloton catch rule can eliminate small launches. This is a code-grounded **candidate mechanism**, not yet a quantified/verified causal attribution. Do not artificially cap the winning margin or modify default movement before comparing actual pace components.

**New default-neutral observation-only probe committed but owner-run pending:** The same 15-race strength experiment now reports `movementPaceAudit` for each attack's first three ticks from the **existing `tick.movement.groupDiagnostics[].pace`**, paired with actual movement proposals, including group sizes, `currentBaseSpeedKmh`, flat capability averages, terrain ratio, real movement speed and gradient for solo and peloton. Strong escape and caught cases are examined with identical diagnostic structure; caught groups may have no proposal on subsequent ticks and are correctly treated as such. The CLI prints `PACE THRESHOLD <rating> <timing>`. Added a short static TypeScript compilation test and a runtime `observedPaceDecomposition` gate (requires actual valid first-tick solo/peloton values, allows post-catch absent solo proposals).

Run:
```bat
git pull origin main
node --test tests\\uraniusStrengthGradientBoundary.test.mjs
node scripts\\run-uranius-strength-gradient.mjs --out strength-gradient-local.json
```

The original 15 scenario configurations and actual race engine are unchanged; a rerun is needed only to acquire NEW pace-decomposition observations. Before any mechanical edit, compare sustainable solo vs group speeds for ratings 82/86/90 early and 76/82 late, and investigate whether group average, no lead-puller choice, and lack of tactical peloton chase cause unrealistic long breakaways. Official sporting checklist remains **49/60; NO GO**, no production/hosted changes.


## 2026-11-25 — Real group pace trace verifies strength cliff; catch-window geometry audit added

Owner pulled through `ceeaf15` and ran `tests/uraniusStrengthGradientBoundary.test.mjs`: **5/5 PASS**. All **15/15** 120km/128-rider scenarios completed; `observedPaceDecomposition` and the seven previous technical gates TRUE. Owner's results show actual solo post-launch movement versus 127-rider peloton on early 0.3% grade: **76 = 41.32968 km/h; 82 = 42.62639 km/h; 86 = 43.49051 km/h; 90 = 44.35438 km/h; 94 = 45.21802 km/h**, while the peloton travels **40.748916 km/h** in all. Nevertheless attacks at 76/82/86 early are swallowed at second launch tick; 90/94 survive for hundreds of ticks and win large margins. The initial launch speed is ~44.75–45.22km/h across ratings. Late at 1.6% grade, rider 76 post-launch ~39.75747km/h against peloton ~38.87309km/h is swallowed while 82 at ~41.05377km/h survives. Baseline rated rider still ranks 126th at all ratings with one official finish time. This is a **documented catch sensitivity**, not yet a verified error in source code.

Source examination: `reconcileBreakawayGroups.ts` computes `gapToPelotonSeconds` as **absolute difference of `gapFromLeaderSeconds`**, with a strict **<5-second** threshold; it also protects fresh breakaways only for one tick and unconditionally absorbs non-dropped groups physically at/behind peloton. Meanwhile `groupTerrainPace.ts` uses the average capability of all riders in each group, creating high-solo vs slower-peloton speed differential. The distinction between computed replay `gapFromLeaderSeconds` and actual spatial separation is important; do not equate these without measuring.

**Additional diagnostic committed, not yet owner-executed:** per attack first three ticks print **signed km position gap, stored catch-window seconds, physical separation in seconds at peloton speed, strict <5s window decision, fresh-grace eligibility, actual catch outcome and group-active state**, together with applied speeds. The runner prints `CATCH GEOMETRY` for the most informative five cases (early 82/86/90; late 76/82) and retains earlier `PACE THRESHOLD` output. The technical report gains `catchAuditHasGeometry`; the boundary test checks the new trace fields and TypeScript transpilation. This is observation only; **no threshold, peloton pace, rider attributes, attack physics or canonical default modified**.

Owner commands:

```bat
git pull origin main
node --test tests\\uraniusStrengthGradientBoundary.test.mjs
node scripts\\run-uranius-strength-gradient.mjs --out strength-gradient-local.json
```

Before any change, compare the stored five-second gap vs physical distance, and whether 86-rated early attacker was genuinely within the catch radius on its second movement tick. Follow up with a separate default-off policy comparison only if evidence establishes an inconsistency. Official **49/60 sporting NO GO**, no production/paid staging changes.


## 2026-11-25 — Catch geometry confirmed; six-case alternative catch policy comparison queued

Owner pulled through `3da760d` and passed **6/6** boundary tests. All **15/15** 120km/128-rider original strength-gradient races completed with all **9 technical checks true**, including catch geometry.

**Observed exact second-tick catch boundary:** strength **86 early** at t=510: rider **56.358m ahead** of peloton, velocity **43.4905 km/h vs 40.7489 km/h** (separating), stored `gapFromLeaderSeconds` difference **4.665155s**, physical gap at peloton speed **4.979028s**, `freshBreakaway=false`, reabsorbed **true**. Strength **90 early**, otherwise matched, rider **63.614m ahead**, velocity **44.3544 vs 40.7489 km/h**, stored catch difference **5.163164s** and physical gap **5.620000s**, reabsorbed **false**. Strength **76 late**, 52.769m ahead with faster velocity 39.7575 vs 38.8731, stored catch gap **4.778218s**, physically **4.886924s**, reabsorbed. Strength **82 late**, 63.657m ahead moving 41.0538 vs 38.8731, stored catch gap **5.582039s**, physically **5.895177s**, not reabsorbed. Hence the 5s rule **correctly follows its current code**, yet **absorption can occur when rider is actively moving away**; this rule plus sustained high solo vs peloton average speed causes a sharp sporting discontinuity. Inactive group position on later ticks is stale and must not be interpreted as a live physical gap.

**Default-off, strictly isolated counterfactual committed, NOT YET OWNER RUN:** `reconcileBreakawayGroups` accepts `experimentalPreserveSeparatingBreakaways` (default false). When true only, an active `breakaway` physically **ahead** of the peloton and **faster** than peloton is not reabsorbed merely because it is within five stored gap seconds; if behind or slower, existing catch rules remain eligible. Wired through calibrated/integrated offline options. `uranius-strength-gradient.ts` retains all 15 original scenarios unchanged and adds exactly **6 matched true-flag replays** (strength 76/82/86/90 early; 76/82 late). Fail closed on 128-rider classification/energy balance/order execution, compare ranks, catch, sustained gap, stage spread and hashes. CLI adds `COUNTERFACTUAL` lines, static tests guard option default and TS compilation. This DOES NOT introduce an approved new rule, no production activation, and we may reject it if it simply causes implausible hours-long solo escapes. The purpose is to distinguish a catch-window policy effect from peloton pace imbalance.

Owner commands:

```bat
git pull origin main
node --test tests\\uraniusStrengthGradientBoundary.test.mjs
node scripts\\run-uranius-strength-gradient.mjs --out strength-gradient-local.json
```

**Status:** Historical 15-race baseline VERIFIED; counterfactual runtime pending. Sporting release gate **49/60 NO GO**. Do not change canonical/default behavior.


## 2026-11-25 — Owner validates six separating-catch counterfactuals; reject as standalone fix

Owner pulled `ec1d8f6`. All **7/7** static/transpile tests passed. The original **15/15** strength races and additional **6/6** default-off separating-breakaway counterfactuals completed, with all 12 runtime technical checks TRUE. Crucially, all verified 15 original results/hashes remained unchanged.

Matched comparisons:
- Strength **76 early**: baseline caught, rank 126, 0s spread; counterfactual not caught, rank 1, **150.571s** finishing spread, 333 positive-gap ticks.
- Strength **82 early**: baseline caught, rank 126; counterfactual rank 1 with **455.446s** spread, 323 positive-gap ticks.
- Strength **86 early**: baseline caught, rank 126; counterfactual rank 1 with **647.108s** spread, 317 positive-gap ticks.
- Strength **90 early**: both policies unchanged, rank 1, **831.439s** spread.
- Strength **76 late**: baseline caught, rank 126; counterfactual rank 1 with **62.305s** spread, 143 positive-gap ticks.
- Strength **82 late**: both policies unchanged, rank 1, **191.371s** spread.

**Decision:** The opt-in `experimentalPreserveSeparatingBreakaways` is **not accepted for canonical release or default enablement**. It corrects the unphysical capture of a rider moving away from the peloton, but unmasking that movement exposes a severe independent solo-vs-peloton pace imbalance. Simply disabling the proximity catch turns even moderate attacks into winning solo runs. Any sporting solution must address realistic peloton tactical response and leader selection/organized effort, not merely turn a catch switch ON.

Source reviewed: `pelotonPace.ts` uses group-wide mean attributes for group pace (flat 45%, stamina 25%, resistance 20%, teamwork 10%), meaning 127 mixed athletes set peloton effort despite potential stronger designated pullers. `experimentalChasePace.ts` exists but **requires an actually executed valid chase order** and increases peloton speed only while an ahead breakaway has at least 5s gap; caps additional pace at **1.5%** for at least two chase instructions. `groupCooperationPace.ts` is an independent helper with **3%** theoretical cap but it is not automatically wired to the calibrated stage. `finalStagePelotonEffort.ts` exists as a separate pure helper, ramping only after 70% distance with at most **3%**, and is not wired to the integrated runner. Neither current static chase-cap experiment nor uncommanded automatic peloton speedup should be treated as verified historical realism. Before adding a new simulation matrix, design a plausible pace-driving and tactical chase mechanism and define expected energy/effort budget and comparison controls, or audit the support already provided for group leadership.

**Verified technical correctness != sporting calibration**. Official release status remains **49/60 NO GO**; no production changes. The next development step should focus on *rider-contributed peloton chase effort and physically grounded coordination* with separate energy charge, while preserving all existing hashes when default-off. Do not repeatedly rerun the same 15+6 scenario without a new tested mechanism.


## 2026-11-25 — Pure, energy-funded peloton puller selection POC committed (not integrated)

After the owner-verified 21-race catch-rule counterfactual (7/7 tests, 15 original + 6 protected races, all runtime checks true), source review confirmed `experimentalChasePace.ts` requires already executed chase orders and can add up to 1.5% peloton pace with no explicitly charged *puller-specific* budget; `groupCooperationPace.ts` can calculate a 3% bonus but is not itself a selected-puller and energy-budget policy; `finalStagePelotonEffort.ts` is a standalone helper. The reabsorption-only correction is explicitly **not approved** as it would allow moderate riders to win 1–11 minutes solo.

New **pure function only** `src/race-engine/simulation/pelotonChaseEffort.ts` returns an observable proposed peloton-chase speed and explicit energy surcharge by the exact riders doing the work. **NO integration into actual movement / energy state yet**. Selection requires executed, within-distance-window chase orders from the riders' correct teams, at least 5s of physically ahead breakaway separation, racing status, and energy greater than 5. Up to **three** actual ordered pullers chosen deterministically by teamwork then stamina then ID. Cooperation strength declines for weak teamwork and steep gradients. Incremental speed capped at **3%** and by maximum permitted speed; requested charge scaled with 30-second tick duration, requested effort and stamina, attenuated if riders cannot afford cost above 5 energy. Explicit `totalEnergySurcharge` and `energySurchargeByRiderId` distinguish this model from free speed. Constants (3% peak, 0.06 energy per minute per 1% extra pace, 5-point reserve) are **hypotheses for tuning, not historically calibrated**.

Executable isolated Node test `tests/uraniusPelotonChaseEffort.test.mjs` (ESBuild TS transform + dynamic module import) checks: idle without actual gap/orders; stable three-puller selection with positive charges; low-energy and speed limit constraints; weaker teamwork/steeper grade reduce chase; cross-team order cannot authorize pulling; input immutability and offline-only provenance. **Committed but not yet runtime-tested**. Existing canonical and prior offline race outcomes are untouched. Before connecting this helper to the full 128-rider race, need prove exact budget charge is subtracted from the nominated riders' state without duplicating canonical movement costs, and evaluate whether 3% theoretical group benefit is remotely sufficient to counter the >4km/h solo/peloton differential.

Owner run:
```bat
git pull origin main
node --test tests\\uraniusPelotonChaseEffort.test.mjs
```

No full 15/21-race rerun requested for this pure model. Official **49/60 sporting NO GO**, production unchanged.


## 2026-11-25 — Owner passes funded chase pure helper; offline integration committed

Owner pulled through `784d473` and executed `tests/uraniusPelotonChaseEffort.test.mjs`: **5/5 PASS**. Covers real executed-order authorization, deterministic top-3 pullers, funding/energy reserves, speed limits, grade/teamwork response and input immutability.

Completed **default-off OFFLINE integration** of the already tested helper into (a) `terrainAwareMultiGroupMovement.ts`: on a live ahead breakaway, only a correctly executed chase order in its active km window can nominate peloton members; calculate funded selected-puller speed and return an explicit per-rider surcharge ledger, and (b) `applyMultiGroupEnergy.ts`: apply each nominated rider's additional energy cost on top of the canonical group movement cost/shelter result and expose it in tick `MultiGroupRiderEnergyApplication.experimentalPullerEnergySurcharge`. The `experimentalBudgetedPelotonChaseEnabled` flag is threaded through `runCalibratedTerrainSeparationStage` and `runIntegratedTerrainSeparationStage`, explicitly disabled by default. Both movement and rider-energy accounting are under **the same flag**, so pursuit speed is not meant to become free. The prior `experimentalChaseOrdersEnabled` 1.5% mechanism remains separate. No fabricated gap, automatic catch, arbitrary winning outcome, or server-side production execution.

Created `tests/uraniusBudgetedChaseIntegrationBoundary.test.mjs`: source and TypeScript-transpile checks require the flag across the full path and verify the movement proposal and extra rider-charge calculation, while keeping the historical default-off path. **This new integration and its boundary test have NOT yet been executed by owner** and no new full-race sporting results are claimed. Even if the boundary passes, real integration proof still needs a matched commanded-chase race fixture demonstrating nonzero per-rider charges and improved physical peloton speed in the same tick, conservation of energy, and unmodified default-off hashes. That is the next validation step before any calibration/production decision.

Owner CMD:
```bat
git pull origin main
node --test tests\\uraniusPelotonChaseEffort.test.mjs tests\\uraniusBudgetedChaseIntegrationBoundary.test.mjs
```

**Official checklist 49/60 sporting NO GO**. Neither live routes nor production state changed.


## 2026-11-25 — Nine funded chase wiring/unit tests pass; true offline movement/energy proof added

Owner pulled through `9641d89` and executed both `tests/uraniusPelotonChaseEffort.test.mjs` and `tests/uraniusBudgetedChaseIntegrationBoundary.test.mjs`: **9/9 PASS**. The earlier 8/9 was only an obsolete source-comment assertion, corrected without changing active physics. **9/9 validates pure calculation and integration syntax, not a full race.**

New E2E proving fixture (committed, not yet owner-tested): `scripts/uranius-funded-chase-e2e.ts` and fail-closed `scripts/run-uranius-funded-chase-e2e.mjs`, with `tests/uraniusFundedChaseE2EBoundary.test.mjs`. Runs **three matched 120km, 128-rider** races with physical strength-86 early breakaway and the prior default-off physically separating-breakaway experimental policy: (1) no chase orders, (2) two scheduled executed chase orders but budgeted effort flag OFF, (3) same orders with `experimentalBudgetedPelotonChaseEnabled:true`. Orders belong to two real peloton riders of Team 02 (`sustain-rider-009`/`-010`), valid from km5 to km120. It records first and last funded chase tick, group applied speeds, the actual per-tick `experimentalPullerEnergySurcharge`, selected rider energy conservation and end standings. The fail-closed report requires: 128 official finishers with unique positions, OFF scenarios giving identical race results, chase orders actually executed, strictly positive real funded chase ticks, charge only to peloton pullers, exact selected-rider energy ledgers and on-tick **higher actual peloton movement speed than flag-OFF at matched race second**. We deliberately do **not** force a win, catch or close outcome. This identifies whether the new pure model truly affects physical race execution with nonfree effort.

Run locally (first static/TS test, then actual three-run proof):

```bat
git pull origin main
node --test tests\\uraniusPelotonChaseEffort.test.mjs tests\\uraniusBudgetedChaseIntegrationBoundary.test.mjs tests\\uraniusFundedChaseE2EBoundary.test.mjs
node scripts\\run-uranius-funded-chase-e2e.mjs --out funded-chase-e2e-local.json
```

No historical 15+6 race matrix repeated. **Official 49/60 sporting NO GO**. Production/calibrated defaults unchanged. Three-run E2E still requires owner verification before any balance verdict.


## 2026-11-25 — Funded peloton chase end-to-end execution PASSED; balance remains NO GO

Owner pulled `9efe703` and ran `tests/uraniusPelotonChaseEffort.test.mjs`, `tests/uraniusBudgetedChaseIntegrationBoundary.test.mjs`, and `tests/uraniusFundedChaseE2EBoundary.test.mjs`: **12/12 PASS**. The three 120km/128-rider offline e2e races completed, and all **7 runtime e2e checks TRUE**: `allComplete`, `defaultUnchanged`, `executedChaseOrders`, `realFundedChase`, `onlyPelotonPullersCharged`, `exactSelectedRiderLedgers`, `physicallyHigherPelotonSpeed`.

**Observed three-way results (strength-86 early attacker with experimental physically separating breakaway):**
- No chase orders: breakaway selected rider wins, finish time **9939.315079131 s**, stage time spread **647.108293786 s**; zero paid chase ticks.
- Two valid chase orders with funded option OFF: same finish time and spread, same rider rank; zero paid chase ticks; both orders executed. Canonical/off baseline preserved.
- Two chase orders and funded option ON: both orders executed, **314** actual paid chase ticks, **28.658084** total additional energy charged to the two specific peloton riders (Rider 009 **13.782035**, Rider 010 **14.876049**); selected solo rider still wins at same **9939.315079131 s**, but stage spread falls to **493.844570594 s**, a **153.263723192 s / 23.7% reduction**. First paid tick at **raceSecond=570** with peloton speed **41.416103 km/h** and solo attacker **43.490511 km/h**. On late chase tick raceSecond=9960, peloton **42.094899 km/h**, attacker **44.064308 km/h**. Rider energy ledger balance errors are at floating-point noise (<1e-12), no duplicate or free surcharge observed for the nominated riders.

**Decision:** The technical funded-chase integration is demonstrated at full offline race scale, including correct default-off preservation and energy charges. Sporting outcome **still unacceptable** in this example: a lone strength-86 rider wins by 8m14s against an organized 127-rider peloton. A 3% theoretical funded boost from two ordered pullers does not overcome the persistent solo-versus-whole-peloton-average pace bias. Do not automatically raise the bonus, forcibly catch, or enable either experimental flag. Next investigate actual peloton pace leadership (who physically sets group pace), which riders should contribute, sustainable chase intensity and rider fatigue, plus baseline no-order ranking/zero-spread anomalies. Document plausible independent constraints and run a limited controlled A/B only after specifying them.

**Official checklist remains 49/60 sporting NO GO.** No production or hosted game changes.


## 2026-11-25 — Peloton leadership mechanics: deterministic candidate implemented, unapproved

After owner-verified **12/12 tests** and **3/3 128-rider funded-chase races**, source inspection confirmed `groupTerrainPace.ts` uses `calculatePelotonBasePace` built from **every current rider's group-wide mean** (45% flat, 25% stamina, 20% resistance, 10% teamwork). Thus a 127-person peloton does **not** currently distinguish pace-setting pullers from sheltered, weaker riders. The completed funded-chase experiment proves technical per-puller charging but still allows a strength-86 early solo rider to win by 493.845 seconds (down from 647.108), even after 314 paid chase ticks.

**New POC pure candidate:** `src/race-engine/simulation/pelotonPaceLeadership.ts` and `tests/uraniusPelotonPaceLeadership.test.mjs` identify deterministic capability-ranked candidate leaders, drop riders at <=5 energy, break ties by rider ID, and expose a leader-only potential intended base speed against original whole-group average, with cycle selection by race tick. Unit tests check whether leaders are distinct and stronger than the whole-group average, deterministic selection and rotation, low-energy exclusion, no fabricated boost for a uniform field, and immutability. **This model is not yet connected to movement or charged energy.** It intentionally does **not** grant any leader-speed advantage by default and is **NOT an accepted sport-calibration proposal**. Rotation per 30-second tick, capability cutoff, and leader count are technical initial hypotheses; meaningful chase order assignment, rotation duration, sustainable energy expenditure and possible catch-up constraints still need to be designed.

In the next step, establish an explicit plan for **leader energy cost and ownership of chase leadership**, integrate both speed and charges behind a single default-off flag, and compare with a real matched 128-rider fixture before claiming improved sporting realism. Investigate why baseline finishes have no time spread and the selected top-rated rider finishes 126th even with high attributes; that likely indicates collective time assignments/tie breaks, not automatically a rider-specific ability bug. Avoid ad-hoc speed bonuses and repeated run matrices.

Owner verification:

```bat
git pull origin main
node --test tests\\uraniusPelotonPaceLeadership.test.mjs
```

Official release gate **49/60 sporting NO GO**, no production change.


## 2026-11-25 — Funded pace-leader candidate added after 5/5 leadership tests

Owner pulled through `3c190e7` and ran `tests/uraniusPelotonPaceLeadership.test.mjs`: **5/5 PASS**. This verifies selected capable leaders, deterministic rotation, exclusion of low-energy nominal leaders and no uplift in homogeneous peloton. It does **not** establish sport realism.

Created default-inactive pure helper `src/race-engine/simulation/pelotonLeadershipBudget.ts` with unit tests `tests/uraniusPelotonLeadershipBudget.test.mjs`. This combines the previously verified capability-rank model with an **explicit eligible ordered rider-ID set**, selects only able designated leaders present in that set, computes capped max **3%** proposed peloton uplift and pays a separately bounded per-rider energy surcharge above a 5-point reserve. No eligible chase leader => **no uplift and zero charges**. Uniform field => no fictitious speed. This is deliberately still **NOT connected to full race movement or energy updates**, and has not yet been user-executed. Exact leadership rotation interval, coordination, effort and cost scaling remain uncalibrated hypotheses.

Verify on Windows:
```bat
git pull origin main
node --test tests\\uraniusPelotonPaceLeadership.test.mjs tests\\uraniusPelotonLeadershipBudget.test.mjs
```

The next milestone is single-flag simultaneous stage movement AND leader-energy integration, followed by a narrow matched full-race check. Do not change the accepted default-off paid-chase E2E comparisons or enable unverified models in production. Official **49/60 sporting NO GO**.


## 2026-11-25 — Owner verifies 9/9 leader budget tests; funded leadership connected to offline movement + energy

Owner pulled through `cbe1bc1` and ran both `tests/uraniusPelotonPaceLeadership.test.mjs` and `tests/uraniusPelotonLeadershipBudget.test.mjs`: **9/9 PASS**, showing capability-ranked rotating leaders, authorized funding, no leader boost without actual orders, bounded speeds, low-energy exclusion, deterministic selection and no fake uplift on equal riders.

**New integration, committed but not yet owner-run:** `experimentalFundedPelotonLeadershipEnabled` is now threaded through `runCalibratedTerrainSeparationStage`, the offline integrated stage and terrain movement. This is a **separate default-off policy**, mutually exclusive with the previously verified `experimentalBudgetedPelotonChaseEnabled` to prevent stacked funded pace uplifts. Only while an active breakaway is physically ahead AND designated peloton riders have correctly executed authorized chase orders from matching teams in the valid km window can the candidate `calculateFundedPelotonLeadership` raise applied group movement speed. The speed uplift scales the actual calculated terrain/physical group speed by the funded leader's relative base-speed gain, limited to 3%, and rider-specific surcharges flow through the same `experimentalPullerEnergyCosts` per-tick map to `applyMultiGroupEnergy`. Existing energy accounting applies each charge on top of the usual movement cost exactly once. Default-off path is unchanged; neither canonical simulator nor production backend is modified.

Added `tests/uraniusFundedLeadershipIntegrationBoundary.test.mjs` (4 checks covering default-off, real authorized orders, shared movement/charge flag, TypeScript transpilation). Added `scripts/uranius-funded-leadership-e2e.ts` and `scripts/run-uranius-funded-leadership-e2e.mjs` plus `tests/uraniusFundedLeadershipE2EBoundary.test.mjs`. The E2E reuses the real fixed 120km/128-rider rolling synthetic stage with strength-86 early attacking solo and actual chase orders from 24 capability candidates selected *before* the race. Compares (a) no orders control; (b) executed orders with leadership flag off; (c) executed orders with new leadership flag on. Fail-closed checks confirm 128 distinct finish places, untouched off-control finish outcome, actually executed orders, higher matched-tick **physical** peloton pace, actual separately charged authorized riders, energy conservation for all 24 nominated riders. All simulation output remains observational: no forced catch, teleport or predefined win.

Owner CMD:

```bat
git pull origin main
node --test tests\\uraniusPelotonPaceLeadership.test.mjs tests\\uraniusPelotonLeadershipBudget.test.mjs tests\\uraniusFundedLeadershipIntegrationBoundary.test.mjs tests\\uraniusFundedLeadershipE2EBoundary.test.mjs
node scripts\\run-uranius-funded-leadership-e2e.mjs --out funded-leadership-e2e-local.json
```

**At commit time neither new integration tests nor the three new race runs have been executed.** If a runtime check fails, investigate the actual mismatch before tuning a speed constant. The earlier 12/12 paid chase and 3 full races remain a separate verified reference. Official sporting calibration **49/60 NO GO**, default-off and production unchanged.


## 2026-11-25 — Funded leadership E2E OWNER VERIFIED; do not enable for release

Owner pulled `680be86`; **16/16** leadership unit, integration-boundary and E2E-boundary tests PASS. The new `scripts/run-uranius-funded-leadership-e2e.mjs` executed **3/3** matched offline 120 km / 128-rider races. All six runtime checks passed: `completed`, `defaultOffPreserved`, `actualExecutedOrders`, `fundedLeadersReallyMoved`, `onlyAuthorizedRidersCharged`, `conservation`.

- `control` no chase orders: strength-86 early solo rider rank 1, finish **9939.315079131 s**, finishing spread **647.1082937859992 s**, no charged leadership ticks.
- `orders-off`: **24** chase orders executed; finish, spread and zero-funded-tick results **exactly identical** to control.
- `leaders-on`: same 24 orders all executed; solo rider still wins at identical finish time, finishing spread **508.62207119400045 s** (**138.486222592 s / ~21.4% less** than control), **156 funded ticks**, **25.863915** total incremental energy, **23 distinct charged ordered riders**, first paid tick second 510 at peloton **41.97138409 km/h**, last second 9960 peloton **42.64603547 km/h**. Maximum measured rider ledger discrepancy **0.0000025704** (within explicit 1e-4 tolerance). The candidate does provide actual movement speed and nonfree funded rider work without fabricating gaps or guaranteed outcomes.

Comparison with previous `experimentalBudgetedPelotonChaseEnabled` trial should NOT be described as a controlled head-to-head: that earlier two-rider funded chase produced **493.844570594 s** final spread with **314** paid ticks and **28.658084** extra energy; the leadership trial allowed **24 orders** with different selection and gating, 156 paid ticks and 25.864 extra energy. A plausible *hypothesis*, requiring validation, is that the leadership candidate rotates over the full set of qualifying riders before filtering to authorized chase riders; this leaves many ticks with no funded chosen leader even when 24 other nominated riders are eligible, making its chase intermittent. Do not infer this is the only issue or immediately raise the 3% ceiling. Inspect selection order and interval, and protect physiological energy budget/rotation fairness. Consider selecting eligible authorized riders **before** rotating, provided it does not turn the candidate into permanent free collective speed; test on/off hashes and energy charges. Maintain both paid policies mutually exclusive and disabled by default.

Sporting gate **49/60 NO GO**; production/default race engine unchanged. No further reproduction of the verified 3-run fixture required unless candidate policy changes.


## 2026-11-25 — Correct authorized leader rotation order (candidate policy, pending E2E)

Owner previously verified **16/16** integration/leadership boundary tests and **3/3** matched full 128-rider runs, but the initial funded-leadership policy had **156 paid ticks**, 23 of 24 ordered riders charged, and still a **508.622 s** solo victory margin; default-off reference is **647.108 s**. Inspection of `pelotonLeadershipBudget.ts` proved the previously suspected selection-order issue: `calculatePelotonPaceLeadership` used the **entire group-qualified pool** to choose cyclic leaders, then `calculateFundedPelotonLeadership` removed those who lacked executed chase orders. Hence many ticks had no one left to fund even when several nominated eligible leaders existed.

**Fix:** `calculatePelotonPaceLeadership` now optionally accepts `eligibleOrderedRiderIds`; when supplied, it builds the candidate pool only from riders both (a) above the entire peloton's mean capability with energy >5 and (b) explicitly authorized by real executed chase orders before rotating. An empty/weak authorized pool returns the original group mean, zero gain and no selected leader, rather than falling back to unauthorized riders. The pure legacy call without this option preserves its prior ranking/rotation. `pelotonLeadershipBudget.ts` passes authorized IDs directly through; runtime movement/energy remain the same default-OFF single-flag integration already owner tested. Added 60-tick regression that keeps authorized strong leaders nominated and charged, plus an authorized-only rotation and no-fallback test.

**Important:** This change may make funded effort much more *continuous* and raise cumulative leader fatigue/energy spending. It is **not** an approved sporting tuning change. The prior 156-tick and 508.622 s results must be compared against fresh on/off runs to see what changed, including charged rider count, group speed and energy ledger conservation. The 3% speed cap and rider 5-energy reserve remain unchanged; don't raise bonus or activate production. New tests and new E2E result still **unverified as of commit**.

Owner CMD:
```bat
git pull origin main
node --test tests\\uraniusPelotonPaceLeadership.test.mjs tests\\uraniusPelotonLeadershipBudget.test.mjs tests\\uraniusFundedLeadershipIntegrationBoundary.test.mjs tests\\uraniusFundedLeadershipE2EBoundary.test.mjs
node scripts\\run-uranius-funded-leadership-e2e.mjs --out funded-leadership-rotation-local.json
```

Official **49/60 sporting NO GO**; both funded pace policy options remain default OFF. No production mutation.


## 2026-11-25 — Authorized-before-rotation full E2E OWNER VERIFIED (18/18)

Owner ran 18/18 Node leadership/budget/integration/e2e boundary tests: **ALL PASS**, with three complete 120km/128-rider offline comparison races. `ALL E2E CHECKS` again **6/6 true** (`completed`, `defaultOffPreserved`, `actualExecutedOrders`, `fundedLeadersReallyMoved`, `onlyAuthorizedRidersCharged`, `conservation`).

**Measured results:**
- No-orders control and 24-executed-orders feature-OFF: exactly the same strength-86 solo-rider rank 1, finish **9939.315079131 s**, finishing spread **647.108293786 s**, **0** charged leadership ticks, **0** extra energy.
- 24 orders with authorized-before-rotation feature ON: the solo still finishes first at **9939.315079131 s**; spread **366.917335395 s**, **316** charged ticks (previous pre-fix: **156**), **78.318086** total additional paid leader energy (previous: **25.863915**), **23** distinct charged riders; first paid tick second **510**, peloton **41.97138409 km/h**, last second **9960**, peloton **42.64596821 km/h**; maximum energy ledger residual **0.00000731703**, below 0.0001 gate.

The fix therefore **increases funded chase continuity by 160 ticks** and cuts the finishing spread **280.190958391 s / 43.3%** vs original control, compared with the prior leadership model's 138.486222592 s improvement. It also charges **~3× more total extra energy**, so improved finishing spread must **not** be described as cost-free or yet sustainably calibrated. The observed finish spread in this single solo escape scenario is not evidence of credible race tactics, general field ranking or full sporting readiness. Do **not** force a catch or increase the 3% cap blindly.

**Next priority:** investigate the persistent ~6m07 solo lead and unresolved no-attack 0-time-spread/strength-vs-rank anomaly via targeted trace review rather than additional redundant full-race runs. Evaluate whether leadership rotation every 30-second tick, selectivity and exhaustion are physiologically plausible, and whether leader abilities are reflected in their individual race results as opposed to only shared group speed. Then define evidence-based sporting acceptance criteria. Both new options remain default OFF; official **49/60 — sporting NO GO**; no production changes.


## 2026-11-25 — No-order finish rank and bunch-time mechanics audit added (pending owner run)

Investigation of the active offline integrated finish path shows **two distinct, intentional rules**:

1. `multiGroupFinishCandidates.ts` uses `interpolatedTiming()` to calculate **one exact crossing time per physical group**, not per rider. In a peloton remaining together, identical recorded finish times are therefore the expected bunch-arrival result rather than proof of a race bug. The group-computed speed derives from the entire group, so this also highlights a real limitation: individual riders cannot independently vary distance while still assigned to that group.
2. Within the same interpolated group crossing, the candidate comparator assigns rank primarily by **sprint**, secondarily acceleration, then remaining energy, then lexical rider ID. `applyMultiGroupFinish.ts` deliberately assigns **distinct sequential finish positions** but copies the same group crossing time into riders/results. The synthetic strength gradient `buildInput()` modifies the chosen rider's **flat, climbing, acceleration, stamina, resistance, recovery** to 76/82/86/90/94, but **does not modify sprint**. Thus the earlier "rider 126th with high strength" needs investigation as a **sprint-score mismatch** rather than assuming finishing rank is broken.

Added exact fixed-seed offline audit `scripts/uranius-finish-rank-audit.ts` with fail-closed `scripts/run-uranius-finish-rank-audit.mjs`, plus static/transpile guard `tests/uraniusFinishRankAuditBoundary.test.mjs`. It runs only **two complete 120 km, 128-rider no-order controls**, strength 76 and strength 94, using the existing genuine stage creation and calibrated runner. It reports selected rider's full sprint/acceleration/energy rank, rank by actual finish, group shared times, classification comparator and top/bottom five. It fails if grouped time-sharing or actual ranked finishing contradicts its established comparator. It deliberately **does not generate artificial rider time differences, force finishing winners, change sprint ability, or alter canonical race rules**.

Test and audit owner run (not yet executed):

```bat
git pull origin main
node --test tests\\uraniusFinishRankAuditBoundary.test.mjs
node scripts\\run-uranius-finish-rank-audit.mjs --out finish-rank-audit-local.json
```

If exact group ranking comparator is not satisfied, **inspect and explain** actual state/finish order rather than treating the audit's assumption as proven. Once verified, separate *physical group crossing* from *rank order* in sporting requirements. Do not invent staggered rider times solely to avoid ties. Original 18/18 funded-leadership tests and rotation E2E remain verified. No production changes, official **49/60 sporting NO GO**.


## 2026-11-25 — Owner verifies no-order bunch rank is NOT a classification defect

Owner ran `tests/uraniusFinishRankAuditBoundary.test.mjs`: **3/3 PASS**; then `scripts/run-uranius-finish-rank-audit.mjs --out finish-rank-audit-local.json` on **two complete 128-rider 120 km no-order races**. Audit **6/6 checks TRUE** (`bothComplete`, `groupTimeEquality`, `groupRankComparator`, `globalRankComparator`, `deliberateSprintUnchanged`, `deliberatelyChangedPhysicalStrength`).

At rider physical strength **76** and **94**, the selected rider finishes **rank 126** and has **sprint-comparator rank 126**. Each run yields **one physical peloton group (`peloton_main`), all 128 riders with exactly one shared interpolated finish time**. Actual order exactly matches descending sprint, acceleration, remaining energy and lexical tie-break. The experiment deliberately modified the selected rider's flat/climbing/stamina/other physical attributes but **not their sprint score**, so this is expected under the current ranking rule. **Do not label rank 126 or same bunch time as an independently confirmed bug.** No reason to fabricate finish gaps just to generate variable times.

This resolves two previously suspected classification issues as intentional group-time and sprint-rank behavior **for the tested no-order races only**. It does **not** validate whether all riders staying in one peloton under a 120km changing gradient is sporting-realistic, and does **not** resolve the remaining **366.917 s** solo-lead advantage of the strength-86 early attacker under 316 funded leadership ticks and 78.318 extra energy.

**Next sport priority:** rider-level within-peloton separation and positioning behavior during terrain changes and final kilometers, plus sustainable solo exertion versus coordinated group work. Evaluate whether dropping, attack, sprint and lead-out already provide supported individual differentiation before adding new physics. Do not adjust identical group finish times arbitrarily. Official **49/60 sporting NO GO**, production unchanged.


## 2026-11-25 — Per-rider terrain pressure investigation (offline audit, pending execution)

After owner verified finish-rank audit **3/3** + two full no-order controls: the strength 76 and 94 rider ranks both **126**, matching sprint rank **126** and one shared peloton crossing time. This is expected under currently implemented bunch ranking rather than a newly identified classification defect.

Reviewed the existing individual separation mechanics: `groupHold.ts` defines comfortable margin at **+5**, `cannot_hold` below a rider-vs-group-demand margin of **−8**; ordinary `under_pressure` does **not** trigger a drop. `groupSeparationEligibility.ts` accumulates `cannot_hold` ticks until a sustained window is reached (default windows 60,120,180s, integrated calibrated stage uses **120s**). The integrated runner computes each rider's terrain-adjusted capability including shelter and steep-gradient severity, compares with group demand, tracks a rider's cannot-hold duration, then applies actual dropped-wave transitions if eligible. The presence of this machinery does **not** prove it triggers on the current moderately rolling 120km fixture.

Added targeted read-only audit `scripts/uranius-terrain-pressure-audit.ts`, fail-closed runner `scripts/run-uranius-terrain-pressure-audit.mjs` and static TS/boundary checks `tests/uraniusTerrainPressureAuditBoundary.test.mjs`. Runs exactly one 128-rider 120km no-order strength-86 stage using the existing calibrated engine. It records per tick: gradient and km, peloton size, group speed and demand, counts of comfortable/under-pressure/cannot-hold riders, sustained eligible drops, actual source peloton transitions. Summarizes total ticks with cannot-hold, ticks of actual sustained drop eligibility, number of genuine group transitions, climbed vs flat pressure and top eight high-pressure moments. The audit does **not** modify state, force an escape, tweak hold thresholds, or produce fake finish gaps.

**Decision gate:** if the race's 128 riders never reach sustained `cannot_hold`, distinguish the following possible causes *using recorded numbers*: terrain gradients not severe enough; steep-terrain capability/demand/shelter thresholds too lenient; or physical within-group speeds not contributing enough to drop demand. Do not change policy until pressure observations support it. Solo-exertion economics remains an independent unresolved mechanism requiring its own evidence.

Owner CMD (unverified as of commit):
```bat
git pull origin main
node --test tests\\uraniusTerrainPressureAuditBoundary.test.mjs
node scripts\\run-uranius-terrain-pressure-audit.mjs --out terrain-pressure-audit-local.json
```

Official **49/60 sporting NO GO**, original race behavior and production unchanged.


## 2026-11-25 — Terrain pressure audit false failure diagnosed and repaired (owner re-run pending)

Owner pulled `08933ac`; `tests/uraniusTerrainPressureAuditBoundary.test.mjs` **3/3 passed**, but the actual 128-rider 120km full-race audit intentionally failed its `pressureRecorded` check: `{"completed":true,"pressureRecorded":false,"noInventedTransitions":true,"validClassification":true}`. Crucially the trace completed **353 simulation ticks**, and recorded **0 cannot-hold ticks**, **0 sustained drop eligibility**, **0 dropped transitions**, **0 grade >=3% ticks** and **233 |grade|<1% ticks**. Its maximum observed challenge involved **44 under-pressure riders** of 128 on a **2%** gradient, mean rider effective capability **79.549** vs group demand **71.424**. Those recorded observations are real, though they don't prove performance on a steeper stage.

**Root cause of failed audit check:** the check wrongly required hold evaluations for every rider listed in the movement proposal, including the **terminal finish-crossing tick**. The integrated runner runs `evaluatePressure` on state **after** movement, and deliberately excludes active groups at `distanceKm >= stageDistanceKm` (because those riders are now arriving, not continuing to hold the group). The crossing movement proposal still legitimately lists those 128 riders. Therefore an empty terminal pressure evaluation is expected, **not** absent rider accounting.

**Repair:** in `scripts/uranius-terrain-pressure-audit.ts`, mark finish-crossing ticks from actual `proposal.nextDistanceKm >= stage.initialState.stageDistanceKm`; assert **every nonterminal tick** still has exactly one pressure classification per peloton rider; assert **terminal ticks** have zero holding evaluations. Record terminal tick count, prefinish pressure mismatches, maximum/minimum gradients and maximum under-pressure rider count. Existing real transition/eligibility and valid-classification checks retained, and added a regression boundary test `tests/uraniusTerrainPressureAuditBoundary.test.mjs`. These checks are **not yet owner-run**; no changed physics or forced drops.

Run:
```bat
git pull origin main
node --test tests\\uraniusTerrainPressureAuditBoundary.test.mjs
node scripts\\run-uranius-terrain-pressure-audit.mjs --out terrain-pressure-audit-local.json
```

Once confirmed, the 120 km fixture establishes only that this **mild rolling course** does not meet sustained drop threshold. Next study genuinely steep gradients and attacker energy efficiency before calibration. Official **49/60 sporting NO GO**, production unchanged.


## 2026-11-25 — Owner verifies repaired terrain-pressure audit (4/4 plus real race)

Owner pulled `53cb75c` and ran `tests/uraniusTerrainPressureAuditBoundary.test.mjs`: **4/4 PASS**. Then `scripts/run-uranius-terrain-pressure-audit.mjs --out terrain-pressure-audit-local.json` completed the genuine 120km / 128-rider no-order stage and ALL **4/4 runtime audit checks TRUE**: `completed`, `pressureRecorded`, `noInventedTransitions`, `validClassification`. The earlier audit failure was confirmed to be the intentional absence of hold-pressure evaluations on the terminal group-crossing tick; the repaired audit now treats it appropriately.

Measured: **353** total simulation ticks, **352** prefinish pressure evaluations, **1** finish-crossing tick skipped, **0** missing/mismatched prefinish pressure counts. Course gradients ranged **−1.4% to +2.0%** (no >=3% climbing ticks); **232** of the 352 prefinish ticks were below 1% absolute gradient. Up to **44 of 128** riders were `under_pressure` at a +2% stretch; **0** riders were `cannot_hold` on any tick, **0** reached sustained-drop eligibility, **0** actual dropped-wave transitions. At the observed +2% pressure peak, mean effective capability was **79.5490** vs group demand **71.4240**.

**Finding:** this relatively mild rolling fixture does not challenge the `cannot_hold` threshold; it cannot validate mountain-stage dropping. Do **not** artificially lower the group-hold threshold just to force drops in this test. Distinguish future genuinely steep graded courses with extended +5% to +10% climbs, terrain severity flags, energy loss and actual sustained rider transitions. Reassess if a mountainous fixture also produces zero cannot-hold riders. Solo attacker sustainability remains separately unresolved. No production changes. Official **49/60 sporting NO GO**.


## 2026-11-25 — Owner confirms +2% terrain audit; mountain challenge added (pending execution)

Owner pulled through `53cb75c`; reran fixed terrain-boundary tests **4/4 PASS** and real 128-rider rolling audit **4/4 runtime checks PASS**. There were 353 simulation ticks, 352 evaluated, exactly one terminal no-pressure crossing tick, **zero pressure-accounting mismatches**, gradients **−1.4% to +2.0%**, **44 under-pressure riders** maximum, **0 cannot-hold**, **0 sustained eligible drops**, **0 actual transitions**. This only verifies non-dropping on the deliberately mild course, not mountain physics.

Implemented observational mountain challenge `scripts/uranius-mountain-terrain-audit.ts`, CLI `scripts/run-uranius-mountain-terrain-audit.mjs` and boundary checks `tests/uraniusMountainTerrainAuditBoundary.test.mjs`. It compares exactly two offline 128-rider no-order races with identical roster, seed, 120km distance, calibrated 120-second hold threshold and steep-gradient pressure/movement options:
- Existing verified **rolling** profile.
- New **mountain** profile sampled every 10km with metres `[100,150,950,1750,2000,1900,1800,2600,3500,3550,3100,2800,2500]`, giving sustained sections up to **+9%** (10km segments), e.g. +8% from 10 to 30 km, +8% from 60 to 70km, +9% from 70 to 80km. The extreme cumulative elevation is intentionally a stress-test route, not a claimed historical race course. All numbers are authentic terrain samples from the fixture and actual runner.

It observes, but does not force or artificially expect: number of >=5%, >=8% pressure ticks, `comfortable`/`under_pressure`/`cannot_hold` counts, 120-second sustained-drop eligibility, physical dropped-rider transitions, final group size, remaining and spent rider energy. Validates both race completions, nonterminal classification counts, real mountain gradients, authentic transition ledger and finite nonnegative energy. **Even zero actual drops is an informational outcome; it does not automatically fail the audit**. If mountain drops remain absent, inspect measured demand/shelter versus capability before tuning. No physical changes or production updates.

Owner CMD (not yet verified):
```bat
git pull origin main
node --test tests\\uraniusMountainTerrainAuditBoundary.test.mjs
node scripts\\run-uranius-mountain-terrain-audit.mjs --out mountain-terrain-audit-local.json
```

Official **49/60 sporting NO GO**.


## 2026-11-25 — Mountain-versus-rolling challenge OWNER VERIFIED (sporting separation works)

Owner pulled `08d19ff`, ran `tests/uraniusMountainTerrainAuditBoundary.test.mjs`: **3/3 PASS**, then ran `scripts/run-uranius-mountain-terrain-audit.mjs --out mountain-terrain-audit-local.json`: **two full 128-rider 120km races completed** and all **6/6 runtime checks TRUE** (`scenariosComplete`, `pressureComplete`, `dropsActuallyObserved`, `genuineMountainGradients`, `finiteEnergy`, `identicalRosterSize`).

**Rolling control:** 353 ticks, 352 peloton prefinish pressure ticks, gradients −1.4% to +2%, 0 cannot-hold, 0 sustained eligibility, 0 actual dropped-group transitions, peloton remains 128; max 44 under pressure; mean individual energy spent 26.1535216084, worst 29.018318784, selected rider 24.08402976.

**Mountain route:** 421 total simulation ticks, 391 peloton prefinish pressure ticks; sampled gradients −4.5% to +9%, **161 prefinish ticks at >=5% and >=8%**, 63 max under-pressure, **16 max cannot-hold in a tick**, **28 cannot-hold ticks**, **7 sustained-eligibility ticks**, **7 real dropped transitions involving 33 actual riders**, final main peloton **95**. Mean individual energy spent 39.4875029356, worst 46.15418288; selected rider 35.8574848; all finite and nonnegative. At first sustained +8% climb, 16 riders were `cannot_hold` at seconds 930,960,990, then became eligible at second 1020 and dropped (one transition, 16 riders), consistent with the configured 120-second threshold. Subsequent pressure and separations were resolved by existing engine mechanics, not scripted outcomes.

**Interpretation:** genuine rider-level mountain separation is already supported and occurs in a 128-rider realistic-gradient full-race simulation. **Do not lower existing −8 hold-margin or 120-second thresholds merely to generate drops**. Neither scenario establishes calibration of real-world mountain survival rates, physiological leader/solo costs, full group composition, final time gaps, or tactical race outcomes. The 421 vs 391 difference includes later ticks with no pressure-evaluated active peloton, so avoid calling it a missing-data defect without tracing group state. Next sporting gate: inspect mountain dropped-group trajectories, reabsorptions and actual gaps; independently investigate solo attacker sustainable pace / energy cost versus funded peloton. Retain feature defaults OFF and official **49/60 sporting NO GO**. No production modifications.


## 2026-11-25 — Mountain group trajectories and solo-vs-peloton energy audit (awaiting owner run)

Owner previously verified **3/3** mountain audit boundary checks, 2/2 complete 128-rider 120km races and **6/6** runtime audit gates. On the 8–9% mountain profile, **33 actual rider drops across seven peloton transitions** were observed, main peloton finishing with 95 riders. These numbers establish separation triggering, **not** physically sound dropped-group persistence, finishing gaps or sustainability of solo attack.

Added `scripts/uranius-group-trajectory-solo-cost.ts` and `scripts/run-uranius-group-trajectory-solo-cost.mjs`, plus three static/transpile guards in `tests/uraniusGroupTrajectorySoloCostBoundary.test.mjs`. The standalone audit executes exactly **two further actual offline 128-rider full stages** using existing policies, unchanged random seed and no invented movement or energy:
1. The verified 9%-maximum mountain no-orders scenario with accepted birth-tick/receding-drop experimental preservation. It traces actual dropped transition group IDs and rider counts; per-group state over the following ticks; physical signed distance gap against peloton, max behind/ahead position; reabsorption and reclassification; terminal status and recorded finish ranks. Existing seven transitions / 33 riders are checked as an observational fixture fingerprint, not a target for new physics.
2. The verified strength-86 early **solo escape** on original rolling course, with existing preservation policy and physical attack launch, **without new chase orders**. It captures real rider per-tick energy costs, solo vs peloton group duration/speed, final energy, independent comparison to peloton riders 009 and 010, and individual ledger conservation. Comparing average solo and peloton energy usage is diagnostic only because the individuals have different attributes and movement speeds; it does not establish a calibrated solo energy multiplier.

The script fails closed if races do not complete, real dropped transition count changes unexpectedly, group/gap traces cannot be reconstructed, or rider energy ledgers deviate beyond 1e-4. It **does not** force the seven drops, alter a speed cap, change reconciliation, add leader costs, or touch production. Audit and boundary tests **not yet owner-run**.

Owner verification:
```bat
git pull origin main
node --test tests\\uraniusGroupTrajectorySoloCostBoundary.test.mjs
node scripts\\run-uranius-group-trajectory-solo-cost.mjs --out group-trajectory-solo-cost-local.json
```

If the detailed audit reveals wrongly reabsorbed groups, trace the exact physical distance and speed at that transition before proposing a change. If solo speed is persistently higher but its incremental effort remains similar/lower than sheltered peloton costs, consider a separately funded physiological test, NOT a global arbitrary speed reduction. Official **49/60 sporting NO GO**, no production changes.


## 2026-11-25 — Owner verifies mountain group trajectories and identifies solo-energy calibration concern

Owner pulled `5abfeb9`; the 3-test static boundary suite passed **2/3**, with one **false-negative assertion**: it matched literal `tick.appliedEnergy.applications.filter`, but source correctly uses `t.appliedEnergy.applications.filter(a=>a.riderId===id)`. Repaired that exact boundary assertion in `tests/uraniusGroupTrajectorySoloCostBoundary.test.mjs`; **repair awaiting owner rerun**. No simulator changes.

The full offline CLI `scripts/run-uranius-group-trajectory-solo-cost.mjs` completed **2/2 real 128-rider races** and **6/6 runtime checks passed**: `mountainCompleted`, `soloCompleted`, `dropEventsGrounded`, `realGroupTrace`, `physicalGapFinite`, `soloEnergyLedger`.

**Mountain groups:** 7 dropped transitions and **33** riders in 7 unique dropped groups, none reabsorbed/reclassified in this run. Maximum measured distance behind peloton: dropped_1 **7.269 km** (16 riders), dropped_2 **4.826 km** (5), dropped_3 **9.873 km** (3), dropped_4 **5.142 km** (1), dropped_5 **3.444 km** (3), dropped_6 **2.131 km** (4), dropped_7 **2.132 km** (1). All finished, 95 remained in the original peloton. Caveat: terminal trace entries show 0 gap when both finished groups are clamped at stage distance; interpret *in-race maximum gap* and actual finish times, not final clamped distance.

**Early solo vs peloton:** strength-86 rider `sustain-rider-001` solo for **317 ticks** with mean speed **43.5925 km/h**, mean cost **0.0682354 energy per solo tick**, total spent **22.6486**, final energy **77.3514**, rank 1 and 647.108 s victory gap. Peloton comparators: rider 009 had mean speed **40.8072 km/h**, mean cost **0.0711391/tick**, total spent **25.1121** over 353 ticks; rider 010 same mean group speed, mean cost **0.0791729/tick**, total spent **27.9480**. All rider energy ledgers match to ~1e-12.

**Finding:** a solo rider maintaining ~2.8 km/h greater mean speed can have *lower per-tick energy expenditure* than peloton riders. Not conclusive physiological error until controlling for the solo rider's deliberately elevated stamina/resistance/recovery (86), the other riders' lower efficiency scores, and shelter-energy behavior. Source inspection: `calculateRiderEnergyCost` uses **speed / group-relative baseSpeedKmh**, not absolute aerodynamic speed / watts, and multiplies by a weighted stamina/resistance/recovery efficiency. Group shelter is applied only if `state.groupShelterEnergyEnabled===true`. The specific test does not turn that flag on. This makes the present solo advantage a serious realism calibration candidate, but do not claim an independently isolated same-rider solo-vs-sheltered causal result. Next experiment should hold rider attributes and speed constant and compare within-tick energy under solo versus peloton/shelter conditions before implementing a default-off physiological fatigue extension.

**Next command:**
```bat
git pull origin main
node --test tests\\uraniusGroupTrajectorySoloCostBoundary.test.mjs
```
Prior full two-race CLI is verified; do not rerun unless the audit implementation changes. Official 49/60 sporting NO GO; production unchanged.


## 2026-11-25 — Corrected group trajectory / solo energy boundary suite owner-verified

Owner pulled `2ac0748` and reran `node --test tests\\uraniusGroupTrajectorySoloCostBoundary.test.mjs`: **3/3 PASS** (actual mountain group/solo stage sourcing; physical group distances and energy applications; TypeScript/offline safety). This confirms the earlier **2/3** suite outcome was only an incorrect boundary-test variable-name match (`tick` vs source `t`) and that the repair has passed. The previously verified two full 128-rider trajectory/solo race runs and **6/6 runtime checks** need no rerun; no race physics were modified.

**Technical audit closed; sporting issue remains open.** Original 7 mountain dropped groups / 33 riders persist; solo speed **43.5925 km/h** with **0.0682354** energy per solo tick vs selected peloton comparators **40.8072 km/h** and **0.0711391** or **0.0791729** energy per tick. Rider attributes are not controlled, and group shelter-energy is OFF in the observed scenario, so this is a warning sign, not causal proof of a missing solo aerodynamic surcharge. Next isolate energy costs with matched attributes and speed, explicit aero shelter toggles and time/gradient matching before adjusting physiology. Official **49/60 sporting NO GO**; production unchanged.


## 2026-11-25 — Matched solo vs sheltered peloton energy counterfactual added (unverified)

After owner's corrected group-trajectory suite **3/3 PASS**, the actual 128-rider solo-run diagnosis still showed attacker mean **43.5925 km/h** at **0.0682354 energy/tick**, compared with peloton riders near **40.8072 km/h** at **0.0711391** and **0.0791729** energy/tick. Source review showed `calculateRiderEnergyCost` computes relative speed `speedKmh/baseSpeedKmh` and rider-specific stamina/resistance/recovery efficiency; `applyMultiGroupEnergy` has an **existing default-OFF `groupShelterEnergyEnabled`** which discounts energy by the `groupShelter` model (solo size 1 receives zero bonus; peloton receives up to 10% flat and 2.5% at +8%). A new surcharge would be premature without understanding the existing switch.

Created `scripts/uranius-matched-shelter-energy.ts`, offline CLI `scripts/run-uranius-matched-shelter-energy.mjs` and `tests/uraniusMatchedShelterEnergyBoundary.test.mjs`:

- **Nine exactly matched pure-cost comparisons:** same selected rider's stamina/resistance/recovery, energy 90, base 42 km/h, 30-second ticks, speeds 38/42/46 km/h and gradients 0/2/8%. Only the context changes: solo breakaway group size 1 versus 128-rider peloton; existing calculated group shelter percent and cost savings recorded. No rider attribute or physically applied speed differences between matched pairs.
- **Two full actual 128-rider early solo-attack 120km races:** identical input, fixed seed and physical escape options; only difference is `groupShelterEnergyEnabled:false` vs `true` on the initial state. Report actual selected finish rank/time, lead spread, real solo and peloton energy ledgers, total shelter savings, selected rider residual and any unauthorized puller surcharges. Guard both races complete, solo gets no shelter, peloton gets savings only when enabled, matched solo/peloton cost difference on every sample, and ledger conservation.

**This is not a newly calibrated aerodynamic power model.** The existing shelter model caps discounts at 10% and is inactive unless explicitly requested. A matched-cost comparison demonstrates what the *existing switch* does, not automatically that it matches real-world drag watts. No existing simulation files or production behavior were modified. Owner-run results pending:

```bat
git pull origin main
node --test tests\\uraniusMatchedShelterEnergyBoundary.test.mjs
node scripts\\run-uranius-matched-shelter-energy.mjs --out matched-shelter-energy-local.json
```

**Decision:** if shelter-on remains insufficient to affect solo victory margins (or over-protects a 128-rider peloton), isolate other issues such as relative-speed cost, team cooperation and climb demand before adding default-off physically calibrated resistance. Official **49/60 sporting NO GO**.


## 2026-11-25 — Matched solo-versus-peloton shelter energy OWNER VERIFIED

Owner pulled `7ee9393` and ran `tests/uraniusMatchedShelterEnergyBoundary.test.mjs`: **3/3 PASS**. Actual offline CLI `scripts/run-uranius-matched-shelter-energy.mjs --out matched-shelter-energy-local.json` completed two real 128-rider 120km early-attack races and all **7/7 checks TRUE** (`pairedIdenticalPhysicalInput`, `uphillShelterReduced`, `bothActualRacesComplete`, `soloHasNoShelter`, `actualPelotonShelterSaved`, `energyConservation`, `noSyntheticEffort`).

**Nine matched pure-cost samples**, holding rider attributes (stamina=86, resistance=86, recovery=86), time=30s, baseSpeed=42km/h, currentEnergy=90, speed (38,42,46km/h) and gradient constant between contexts, show existing solo breakaway size 1 shelter=0, group of 128 peloton shelter: **10% at 0% gradient**, **8.125% at +2%**, **2.5% at +8%**. Thus matched solo total cost premium over peloton equals **11.1111%**, **8.8435%**, **2.5641%**, respectively. The current implementation is a bounded group energy discount, not an absolute aerodynamics/watts power model.

**Actual full races with shelter OFF vs ON:** both complete 353 ticks, selected rank **1**, selected finish time **9939.315079131 s**, race-wide finish spread **647.108293786 s** (10m47s), unchanged. Solo rider spends **22.6485652042 energy** OFF, **22.5496372042** ON (sheltered while still in the peloton for the first 15 ticks); **exact solo-period energy spent 21.6306172042 in both runs**, with **0 solo shelter discount**. Peloton aggregate energy spent OFF **3326.540071632**, ON **3010.041925**; peloton shelter saved **316.498588** energy. The selected rider's final reserve rises **77.3514347958 -> 77.4503627958**. No artificial puller surcharges, energy ledgers conserved to ~1e-12.

**Sporting decision:** Existing shelter does confer the correctly directed energy advantage, but energy conservation improvements do **not translate to changed group movement/finish times in this particular stage**. An extra global shelter multiplier cannot be justified by this evidence alone. Identify the precise energy-to-pace coupling (fatigue modifier, ability score, peloton mean, group terrain pace) and whether it has a threshold/saturation, before adding a *default-off* credible physiology/drag model. Note that the winning margin is not a solo-versus-peloton same-rider comparison because other riders have different attributes. This diagnostic stage and tests are complete; do not request redundant runs. Official **49/60 sporting NO GO** and no production changes.


## 2026-11-25 — Fatigue onset root cause and opt-in absolute-speed effort candidate (owner E2E pending)

Owner verified matched aerodynamic shelter audit **3/3 boundary** and **7/7 runtime checks**. In two real 128-rider 120km early-solo-attack races, shelter ON discounted peloton energy by ~316.50 total units but did not change rider/group movement, finish ranking or the solo victory spread **647.1083s**. The high-strength solo rider finished with **77.35** energy OFF / **77.45** ON, remaining **above the 70 energy threshold** where `calculateRiderFatigueModifier` first begins to reduce capability. The canonical energy cost's speed contribution depends on `speedKmh/baseSpeedKmh` and does not directly price absolute aerodynamic effort at sustained 43+km/h. Thus a fatigue-speed penalty cannot engage in this fixture merely by reducing energy consumption through drafting; the existing energy-spend path is too low to trip fatigue for the solo rider.

Added an **explicitly default-OFF, offline-only** absolute-speed energy hypothesis for real physical E2E testing, not a claim of validated CdA/drag watts:
- New pure `src/race-engine/simulation/absoluteSpeedEffort.ts`: adds a speed-cubed exposure above a 30km/h reference, 0.075 provisional energy units per 30s at unit exposure, attenuated by the existing gradient-dependent shelter factor; at <=30km/h no extra charge, to avoid overlapping the existing uphill slope term.
- `SimulationState.experimentalAbsoluteSpeedEffortEnabled?:boolean` omitted / false by default, **not enabled by the calibrated wrapper**.
- `applyMultiGroupEnergy` now conditionally charges this separately *after* existing weather/shelter and funded-puller debits, capped to available energy, with optional `experimentalAbsoluteSpeedEnergySurcharge` in application logs; when OFF, former result and calculations are untouched.
- `scripts/uranius-absolute-speed-effort-e2e.ts`, `scripts/run-uranius-absolute-speed-effort-e2e.mjs` and `tests/uraniusAbsoluteSpeedEffortBoundary.test.mjs` evaluate two whole 128-rider real early-solo attack races, candidate OFF vs ON. Both must finish, baseline must preserve exact prior observed solo finish **9939.315079131s**, final-race spread **647.108293786s**; OFF has zero additional charges, ON actually charges solo and peloton, energy ledgers conserve, values stay finite/in-range. The trace reports candidate's impact on solo final energy, first time solo energy crosses 70, rank/time, winning spread and costs.

**Important:** coefficient (0.075), reference speed (30km/h) and cubic scaling are exploratory, not experimentally validated physiological power-to-energy calibration. Even if the experiment changes results, it must **not** be promoted to standard physics without systematic controlled sensitivity tests, realism targets and compatibility checks. No production branch/data touched, no default feature switched.

Owner commands, **not yet runtime-verified**:
```bat
git pull origin main
node --test tests\\uraniusAbsoluteSpeedEffortBoundary.test.mjs
node scripts\\run-uranius-absolute-speed-effort-e2e.mjs --out absolute-speed-effort-local.json
```

Official **49/60 sporting NO GO**.


## 2026-11-25 — Absolute-speed effort E2E OWNER VERIFIED; experimental model NOT approved

Owner pulled `b60085a`. `tests/uraniusAbsoluteSpeedEffortBoundary.test.mjs` reported **2/3 pass**, with the third failing solely because its syntax test required every TypeScript source to transpile to >100 bytes; `SimulationState.ts` is an interface-only module whose emitted JavaScript is legitimately empty. Changed the boundary test to assert that all four files transpile without throwing, and to apply the nontrivial-output guard only to three source files containing runtime code; **repaired test still awaits owner re-run**.

More importantly, `scripts/run-uranius-absolute-speed-effort-e2e.mjs --out absolute-speed-effort-local.json` ran **2/2 complete 128-rider 120km races** and passed **6/6 runtime checks**: bothRacesComplete, zeroDefaultCandidateCharge, candidateActuallyCharges, baselineFingerprint, conservation, candidatePreservesEnergyBounds. Baseline (candidate OFF) preserved exactly the accepted rider finish time **9939.315079131s**, 128 finishes, solo final reserve **77.35143479584**, 647.108293786s spread, **zero new charges**, and **never below 70-energy fatigue threshold**. Candidate ON: solo finish time **10005.640238028s** (+66.325s), chosen rider **still rank 1**, final reserve **27.636059** (−49.7154 versus OFF), charged chosen absolute-speed energy **49.593352**, first fatigue crossing at race second **4230** (70m30s), total stage ticks **355** versus **353**, observed finish spread **630.337331604s** (only −16.771s). Aggregate additional charges to peloton energy applications were **4545.348266**, so the new speed-exposure cost indiscriminately taxes many riders, not just the isolated attacker. Conservation residual of ~−0.00003156 is below the current 0.0001 tolerance, arising in repeated rounded debits, but is not exact zero.

**Decision:** opt-in candidate successfully makes absolute speed consume enough rider energy to reach the existing fatigue-to-pace pathway, but it is **not validated** as realistic aerodynamic physiology or appropriate tactical balance. A 66s solo slowdown with only 17s reduction in overall field spread does not solve the overpowered solo exploit. The provisional coefficient, reference speed, and group-based shelter scaling must not be promoted to default or production. Finish spread is a *whole-field first-to-last interval*, not necessarily the gap from solo rider to first peloton member. Future targeted measurement should compare leader to peloton-front finish time and examine whether group movement uses group-average capability in a way that suppresses pursuit. No production modifications; **49/60 sporting NO GO**.

Owner only needs to rerun the corrected short boundary suite:
```bat
git pull origin main
node --test tests\\uraniusAbsoluteSpeedEffortBoundary.test.mjs
```
The two full E2E race runs are verified and do not need repeating.


## 2026-11-25 — Absolute-speed experimental boundary suite OWNER VERIFIED (3/3)

Owner pulled `cff68d0` and reran `node --test tests\\uraniusAbsoluteSpeedEffortBoundary.test.mjs`: **3/3 PASS** (existing baseline strictly gated by explicit offline flag, candidate surcharge bounded after existing weather/shelter costs, syntactically valid offline fail-closed E2E wrapper). The earlier actual two full 128-rider candidate OFF/ON races remain **6/6 runtime checks PASS** and need no further rerun. The test's previous empty-interface emission false negative is resolved.

**Decision:** provisional absolute-speed coefficient remains a default-OFF candidate, *not approved* for authoritative physics. Solo now crosses fatigue threshold and slows ~66.3 seconds, but the peloton does not meaningfully narrow the ~10-minute finish spread. Next target: analyze peloton-front finish gap separately from whole-field spread, test whether averaging 128 riders' capabilities suppresses actual pace despite strong authorized leaders, and distinguish voluntary peloton coasting from a physics defect. Official **49/60 sporting NO GO**, production unchanged.


## 2026-11-25 — True peloton-front gap vs group-average pace audit added (owner execution pending)

Owner pulled `cff68d0`, reran `tests/uraniusAbsoluteSpeedEffortBoundary.test.mjs`, and verified **3/3 PASS**. The opt-in absolute-speed candidate remains **OFF** by default, is not promoted for actual release, and has no production effect. Its observed strength-86 rider finishes with only 27.64 energy and still wins; raw first-vs-last field spread is not the same as true breakaway-to-peloton gap.

Code inspection established:
- `pelotonPace.ts`: flat base speed = minimum speed + 0.5 * (maximum-minimum) * **mean capability of all current group members / 100**, with rider energy below 70 reducing capability through `fatigueModifier`.
- `groupTerrainPace.ts` calls the same pace logic for **every group**, including solo breakaway (one rider) and peloton (many riders). Thus a strong solo automatically gets own high capability pace, but entire peloton is paced off its mean even while high-capability leaders are available.
- Existing `pelotonPaceLeadership.ts` can derive qualified rotating leaders from orders, while `pelotonLeadershipBudget.ts` funds their speed-up capped at **3%** with rider-specific charged energy. The actual terrain-aware movement applies this only with executed chase orders, actual breakaway ahead, and `experimentalFundedPelotonLeadershipEnabled=true`; default OFF. Previous owner-funded E2E established 24 chase orders, 316 funded ticks and 78.318 additional energy across 23 leaders, while an early escape survived by ~6:07 in *whole field spread*, not necessarily peloton-front gap.

Added new **read-only diagnostic using this existing leader model**:
- `scripts/uranius-peloton-front-gap-leadership.ts` and its CLI `scripts/run-uranius-peloton-front-gap-leadership.mjs`, with `tests/uraniusPelotonFrontGapLeadershipBoundary.test.mjs`.
- Three genuine 128-rider 120km full races (control / same 24 chase orders with flag OFF / same chase orders with funded leaders ON) as in already verified E2E. The report now measures *finish time of the first actual `peloton_main` member* vs the solo winner, unlike misleading first-vs-last spread. For every peloton tick while the breakaway is physically ahead, reports whole-group average capability, authorized leader potential capability and speed, real applied peloton movement speed, charged active leader count and surcharge, and initial/mid/final chase snapshots. It does **not** add new chase bonuses, change the energy model, or assume the peloton should catch a solo without actual orders.
- Fail-closed invariants ensure all 3 races complete, the first peloton finisher is identified, control equals orders-OFF and authorized energy-funded rotation is actually executed.

Owner CMD (pending):
```bat
git pull origin main
node --test tests\\uraniusPelotonFrontGapLeadershipBoundary.test.mjs
node scripts\\run-uranius-peloton-front-gap-leadership.mjs --out peloton-front-gap-leadership-local.json
```

**Decision path:** if the true breakaway-to-first-peloton time gap remains excessive even with funded leadership, quantify potential qualified-leader gain vs capped funded movement before changing policy. Such a change would be a new, default-off realistic-cooperation implementation requiring individual energy funding and fatigue-dependent leader eligibility, not a fabricated free peloton catch. Official **49/60 sporting NO GO**, no production updates.


## 2026-11-25 — Peloton gap audit wrapper payload mismatch repaired (owner rerun pending)

Owner pulled `2b22261`, verified **3/3 static boundary tests PASS**, and ran `scripts/run-uranius-peloton-front-gap-leadership.mjs --out peloton-front-gap-leadership-local.json`. The bundled simulation returned structured JSON successfully; the command-line wrapper then crashed when trying to iterate `report.races` although the actual script emits `{checks,cases,...}`. Because the wrapper crashed before printing the results, the owner did not receive the three scenario metrics or a saved report. **This was a reporting/schema bug, not direct evidence of a race-engine failure**.

Changed CLI to use `report.cases` in both the failure diagnostics and the report loop, and added an explicit `Array.isArray(report.cases) && report.cases.length===3` fail-closed payload validation. Improved boundary test to assert producer `checks,cases,note`, consumer `report.cases`, and absence of `report.races`. No simulation rules, physics, orders or production state changed. Owner verification required:

```bat
git pull origin main
node --test tests\\uraniusPelotonFrontGapLeadershipBoundary.test.mjs
node scripts\\run-uranius-peloton-front-gap-leadership.mjs --out peloton-front-gap-leadership-local.json
```

Current sporting gate remains **49/60 NO GO**. Do not infer actual gap or pace improvements until output is inspected.


## 2026-11-25 — Peloton-front gap and funded leadership OWNER VERIFIED (3/3, 5/5)

Owner pulled `707de3d`, ran `tests/uraniusPelotonFrontGapLeadershipBoundary.test.mjs`: **3/3 PASS**. The fixed runner `scripts/run-uranius-peloton-front-gap-leadership.mjs --out peloton-front-gap-leadership-local.json` completed **three real 128-rider 120km races** and **5/5 runtime checks PASS**: `allRealRacesComplete`, `firstPelotonFinisherFound`, `noOrdersBaselineIdentical`, `authorizedFunded`, `nonzeroAvailableLeaderPace`.

**Measured actual solo-to-first-peloton-finisher gaps**, unlike field spread:
- Control no chase orders: solo `sustain-rider-001` finishes **9939.315079131s** rank 1, first original-peloton rider `sustain-rider-002` finishes **10586.423372917s**, **647.108293786s** (10:47.108) behind. 127 riders in peloton.
- Orders-off: all 24 chase orders executed, funded leadership disabled, *identical* finish times and 647.108293786s gap; no funded surcharge.
- Leaders-on: all 24 chase orders executed, **316 paid leader ticks** involving real group movement, **78.318086** extra energy paid, actual peloton leader `sustain-rider-002` finishes **10306.232414526s** vs solo **9939.315079131s**, gap **366.917335395s** (6:06.917). **280.190958391s = 4:40.191 / 43.3%** gap reduction. Solo winning time unchanged.
- Average actual peloton speed during ahead-breakaway ticks: **40.7694627km/h** control vs **41.9932102km/h** funded (+1.22375km/h). Base capability avg **71.59094**, authorized strongest-three leader capability avg **80.05132**; average theoretical authorized leader base pace advantage **2.03049km/h**, but existing `calculateFundedPelotonLeadership` caps funded leader bonus at **3%**, so most of the theoretical capability gap is not fully realized.
- The model pays actual leaders (3 per ordinary tick) and only activates with executed chase orders and a physically ahead breakaway. The peloton does **not** catch the solo rider. Do not claim 6:07 is entire field spread; verified as first original-peloton finisher's gap.

**Sporting diagnosis:** There is real, significant, funded team pursuit; the prior term “no useful chase” would be misleading. But peloton base pace is whole-group mean, and a fixed 3% pace-leader cap may suppress achievable organized pace, even with strong eligible rotating leaders. Next research should isolate dynamic energy-limited fraction of calculated leader-vs-group capability gap, rather than simply changing the fixed percentage globally. Verify that proposed ability-to-pace raises physical movement only when orders execute and costs increase appropriately, and compare actual solo-to-first-peloton gap (not whole-field spread), depleted-leader falloff and other stage types. Maintain previous experimental absolute-speed physics OFF. Official **49/60 sporting NO GO**. No production changes.


## 2026-11-25 — Capability-based energy-funded rotating leaders (experimental, owner E2E pending)

Owner verified previous peloton-front audit: **3/3 tests**, **5/5 E2E checks**, genuine 128-rider 120km solo vs first original-peloton finisher gap **647.1083 s** without pursuit versus **366.9173 s** after 24 actual chase orders, 316 funded ticks and **78.318086** energy paid. Existing peloton movement is computed using **mean of all group rider capabilities ~71.59** while authorized leaders average **~80.05**; historical funded leader bonus is capped at **3%**, although observed calculated leader potential averages ~2.03 km/h.

**Implemented a second, mutually exclusive default-OFF pursuit alternative** to test this restrictive cap. `src/race-engine/simulation/pelotonLeadershipBudget.ts` now accepts `experimentalCapabilityBasedFunding?:boolean`. The **existing model and default** still cap potential at 3% and retain historical costs; the new candidate uses measured actual authorized-leader-vs-peloton capability gain, bounded at 8% as an explicit experimental numerical safety ceiling rather than granting free speed, with incremental effort cost multiplying by `1+desiredBonusPercent/4`. Affordability scales the bonus and charges to the actual available energy of the 1–3 current rotating authorized leaders; riders under 5 energy remain ineligible as before. The higher bonus is applied to the same physically advanced peloton distance and group energy ledger. Both models require actual executed valid chase orders and a breakaway physically ahead. Existing absolute-speed-effort experiment remains OFF.

Wired `experimentalCapabilityBasedLeadershipEnabled?:boolean` through calibrated runner -> integrated runner -> terrain-aware movement, default false in each. Three funded pursuit variants (budgeted chase, historical 3% funded leadership, new capability based leadership) are now explicitly **mutually exclusive** to prevent double credits and double energy debits.

Added `scripts/uranius-capability-funded-leadership.ts`, fail-closed CLI `scripts/run-uranius-capability-funded-leadership.mjs`, and `tests/uraniusCapabilityFundedLeadershipBoundary.test.mjs`. Real **three 128-rider 120km** comparison: control (no orders), fixed 3% model (24 ordered real pullers), dynamic capability model (same orders). Every result reports actual solo-to-first-peloton time gap, winner rank, average peloton speed during real pursuit, authorized paid effort ticks, charged leader energy, leader final energy, and conservation residual. Fail closed if baseline win time/gap differ from previous owner fingerprint, if historical capped result differs from prior owner's **366.917335395s** and **78.318086** energy fingerprint, if the candidate fails to pay more energy and move the peloton faster, or if any ledger/race completion invariant fails. **Owner has not yet executed these new tests or scenario; do not treat candidate as verified or production-ready.**

Owner verification:
```bat
git pull origin main
node --test tests\\uraniusCapabilityFundedLeadershipBoundary.test.mjs
node scripts\\run-uranius-capability-funded-leadership.mjs --out capability-funded-leadership-local.json
```

This is a provisional game-mechanics hypothesis (not established real cycling power/drag/fatigue physics). **49/60 sporting NO GO; production unchanged**.


## 2026-11-25 — Capability-based funded leader rotation OWNER VERIFIED (3/3 + 8/8)

Owner pulled `33bea69` and ran `tests/uraniusCapabilityFundedLeadershipBoundary.test.mjs`: **3/3 PASS**. The genuine 128-rider 120km end-to-end comparison `scripts/run-uranius-capability-funded-leadership.mjs --out capability-funded-leadership-local.json` completed **3/3 races** with **8/8 TRUE checks**: allRacesComplete, baselinePreserved, historicalCappedModelPreserved, realOrdersAndFunding, moreCapabilityMoreEnergy, chargedRidersHaveEnergy, leaderEnergyConserved, noForcedVictory.

**Actual solo-to-first-peloton-finish gap:**
- Control, no chase orders: strong solo finishes **9939.315079131 s**, first peloton **10586.423372917 s**, **647.108293786 s / 10:47.108** behind; avg peloton speed during breakaway **40.7694627 km/h**, zero leader surcharge, 0 paid ticks.
- Historical capped 3% experiment: 24 executed chase orders, **316 funded ticks**, **78.318086 energy** paid by rotating leaders; first peloton finishes **10306.232414526 s**, **366.917335395 s / 6:06.917** behind; mean peloton chase speed **41.9932102 km/h**, mean leader final energy **70.4603**, minimum **68.8544**.
- Dynamic authorized capability-funded model: same 24 chase orders and 316 paid ticks, **290.764280** extra leader energy (**3.7127×** fixed capped funding); first peloton finishes **10130.293289974 s**, gap **190.978210843 s / 3:10.978** behind; mean actual peloton speed **42.7623536 km/h**, mean leader final energy **61.6534**, minimum **53.1855**. Solo itself retains rank 1, finish **9939.315079131 s**, final energy **77.3514**, unaffected by different pursuit mechanics.

Gap improvement from control to dynamic **456.130082943 s (7:36.130), 70.49%**. Compared with fixed 3%, improvement **175.939124552 s (2:55.939)**. No forced rider catch or winner; 128 real finishers per race. Leader energy residuals within 1e-4 (~3.54e-6 dynamic).

**Sporting interpretation:** A capability-based, energy-funded leader rotation produces genuine faster movement, much tighter pursuit and consequential rider energy costs. The 8% experimental safety ceiling and rising coefficient are still gameplay hypotheses, not physical calibrated cycling power/watts. **DO NOT PROMOTE TO DEFAULT** on one fixed-seed 128-rider rolling course. Next meaningful gates: fewer authorized chase riders, varied team/rider strengths and initial energy, slower/faster stage profiles including steep grades, order authorization and turning pursuit off, resistance to depleted leaders and repeatable deterministic outputs. Preserve historical fixed 3% path and baseline fingerprints. Official **49/60 sporting NO GO**, no production changes.


## 2026-11-25 — Leader availability and exhaustion sensitivity matrix added (owner execution pending)

Previously owner verified capability-funded rotating leadership in three full 128-rider 120km races: 3/3 static PASS and 8/8 E2E checks PASS. Solo-to-first-peloton finishing gaps: no orders **647.1083 s**, fixed 3% funded leaders **366.9173 s**, dynamic capability-funded leaders **190.9782 s**. Dynamic candidate paid **290.76428 extra leader energy** with 24 authorized chasers, improving physical movement but still NOT approved for default gameplay.

Created `scripts/uranius-leader-availability-sensitivity.ts`, offline `scripts/run-uranius-leader-availability-sensitivity.mjs`, and `tests/uraniusLeaderAvailabilitySensitivityBoundary.test.mjs`. This is the next **six actual 128-rider rolling 120km stage** sensitivity experiment using the **unchanged** default-OFF capability-funded leader model:
- Control: **0** chase orders, normal leader energy 100, leadership disabled.
- Dynamic authorized leader cases: **1**, **3**, **8**, **24** selected from exactly the same deterministic top-ranked rider list (full 100 starting leader energy).
- Leader exhaustion case: **24** same orders, but their **initial energy set to 12**, while rider attributes and all other rider conditions/starting course remain identical.

Results show actual first-peloton-finisher delay after solo (not entire field spread), real executed chase order count, physically funded ticks, unique authorized riders charged, individual leader ending energy, total energy-paid surcharge, and conservation residual for every nominated leader. There is **no synthetic catch, guaranteed victory, changed attack, injected leaderboard ranking or artificial race-time bonus**. Hard gates require 128 real finishers for all six, preserved full-energy baseline and 24-leader dynamic owner fingerprints, correct order execution, no unpaid speed, actual funded effort for the candidate variants, no unauthorized rider charged, energy conservation, bounded energies, and lower aggregate leader surcharge for the energy-depleted case. Do **not** require monotonic gap reduction purely from number of chasers: rotating selections are sensitive to pool and race conditions and could legitimately vary.

Owner CLI, **not yet verified**:
```bat
git pull origin main
node --test tests\\uraniusLeaderAvailabilitySensitivityBoundary.test.mjs
node scripts\\run-uranius-leader-availability-sensitivity.mjs --out leader-availability-sensitivity-local.json
```

This is a controlled sensitivity study of the prior candidate, not a new approved physics calibration. Production remains unchanged, dynamic model OFF by default, and official **49/60 sporting NO GO**.


## 2026-11-25 — Six-case leader sensitivity: owner results, exhausted debit bug, and reabsorption audit fix

Owner pulled `e6be4f5` and verified **3/3 boundary tests**. Six actual 128-rider 120km races ran and returned structured results; **9/10 runtime gates TRUE**, with `riderEnergyConserved:false`. Fail-closed runner did not save the report because the depleted case contained a real inconsistency: maximum leader ledger residual **17.281602482** energy units with 24 ordered leaders starting at **12 energy**. The canonical `calculateRiderEnergyCost` may report energy spent even after `nextEnergy` has clamped to zero, causing `applyMultiGroupEnergy` to emit an energyCost larger than the available reserve. No production/default-on engine change was authorized.

Case findings **before repair**:
- No orders: actual solo vs first peloton gap **647.1083s**, leader surcharge 0.
- One strong authorized leader: **461.3651s** gap, 316 paid ticks, **27.029747** surcharge, leader final energy **45.3326**.
- Three leaders: **271.6299s** gap, 298 paid ticks, **177.80644** surcharge, lowest final leader energy **3.1282**.
- Eight leaders: attacker finished **126th**, first original-peloton finisher time equal to selected finish time at **10576.953909878s**; only **one paid leader tick** at 510s, surcharge **1.835691**. This suggests a very early genuine breakaway *reabsorption* (subsequent pursuit is no longer required), not eight leaders sustaining 120km of chasing or guaranteed winner. The report must explicitly trace the actual rider group transition to verify this interpretation.
- 24 leaders: prior owner-verified **190.97821s** gap, 316 paid ticks, **290.76428** surcharge, all prior fingerprints preserved.
- 24 leaders with only 12 starting energy: **687.040914s** gap (11:27.041), 74 paid ticks ending at 2700s, **18.332972** surcharge, final leader energy all zero. Overstated canonical costs create the 17.28 residual; actual physical rider reserves are within bounds.

**Scoped fixes committed, owner verification pending:** Added `SimulationState.experimentalConservedEnergyLedgerEnabled?:boolean` (default OFF) and an opt-in normalization in `applyMultiGroupEnergy`: the reported `energyCost` (including the nested result ledger) equals the **actual difference** between previous and next rider energy, bounded by zero, without changing the existing movement, final rider energy, or normal default ledger. Enabled **only in the 12-energy leader test**. This is diagnostic protection for exhausted riders, *not yet a validated global accounting migration*. The updated six-case scenario also excludes the attack rider from the initial-peloton finishing reference, traces explicit breakaway-to-peloton group transition and its second, and rejects claiming the eight-leader catch as unexplained/free. Improved boundary suite to assert both opt-in debit conservation and reabsorption reporting.

Owner verification:
```bat
git pull origin main
node --test tests\\uraniusLeaderAvailabilitySensitivityBoundary.test.mjs
node scripts\\run-uranius-leader-availability-sensitivity.mjs --out leader-availability-sensitivity-local.json
```

If all checks pass, diagnose the broader low-reserve over-debit outside this opt-in experiment before considering default behavior changes. **49/60 sporting NO GO. No production changes.**


## 2026-11-25 — Six-stage depleted-energy accounting OWNER VERIFIED; missing static gate repaired

Owner supplied complete run after `37258b2`: **6/6 actual 128-rider races completed; all 10/10 runtime checks TRUE**, `leader-availability-sensitivity-local.json` saved successfully. Depleted 24-rider group starting on 12 energy now shows maximum leader ledger residual **3.20e-14** with explicit offline `experimentalConservedEnergyLedgerEnabled` (versus previous **17.2816** excess debit), 74 charged ticks and **18.332972** paid leadership energy; physical finish gap remains **687.040914s**. Existing baseline and full-energy 24-leader fingerprints hold.

The separately executed Node boundary tests reported **3/4 PASS**, with one **test/producer contract mismatch**: `tests/uraniusLeaderAvailabilitySensitivityBoundary.test.mjs` expected `eightLeaderCatchIsObserved:` and `notAnUnpaidReabsorption:` in the source `checks`, but these check entries had inadvertently been omitted from the previously committed scenario. The actual scenario output already shows the rider physically moved from breakaway into `peloton_main` at **race second 510**, finished **126th**, and had **one paid funded pursuit tick** with **1.835691** extra leader energy. This is genuinely distinct from the 24-leader case (solo still first, **190.978211s** ahead after 316 paid pursuit ticks), so do NOT interpret it as evidence of monotonic chase performance or a validated simulation result across team composition.

Repaired scenario by adding the two explicit fail-closed checks with **recorded owner fingerprints**: eight-leader reabsorption at 510s, final peloton group, rank 126, exactly one funded tick, zero solo-to-peloton group time difference, while 24-leader scenario does not reabsorb; and actual 510s charge with positive rider-specific surcharge. The tests already assert the presence of these gates. No change to the underlying race mechanics, pace models, rider energy or production.

Owner only needs to rerun `node --test tests\\uraniusLeaderAvailabilitySensitivityBoundary.test.mjs` after `git pull origin main` for static verification. The 6-race actual runtime result is already proven on preceding source. If a complete 12/12 check refresh is desired, running the CLI will include these 2 new gates, but rerunning six full races is **not necessary to confirm the physics result**. The **8-leader vs 24-leader non-monotonic capture** remains a sporting investigation blocker and calls for examining group merging/instantaneous order effects. Official **49/60 sporting NO GO**; no production change.


## 2026-11-25 — Owner verification: six-race sensitivity boundary suite 4/4 PASS

Owner pulled `6e63201` and ran `node --test tests\\uraniusLeaderAvailabilitySensitivityBoundary.test.mjs`: **4 tests passed; 0 failures**. The boundary suite verifies same-course scenario isolation, paid pursuit authorization, true reabsorption checks, default-off energy accounting, and fail-closed runner behavior. Together with the previously owner-executed 6/6 completed 128-rider simulations and 10/10 runtime checks, this completes verification of the six-case diagnostic **without promoting experimental physics to release**.

**Unresolved sporting investigation:** 8 authorized leaders produced a real breakaway-to-peloton group transition at second 510 (first paid chase tick; attacker ultimately rank 126), while 24 authorized leaders preserved a solo win with a 190.978211-second gap after 316 paid chase ticks. This non-monotonic difference could be due to deterministic leader rotation, group threshold/transition, order application, or another interaction; cause is **not yet established**. Investigate the first 2–4 movement/transition ticks for both cases, including selected leaders, actual movement speed and calculated gap, order execution state, group merge conditions and charged costs. Do not force monotonic results or loosen pursuit energy bounds without evidence.

Official sporting gate remains **49/60 NO GO**. Production and default-on physics unchanged.


## 2026-11-25 — Focused 8-versus-24 funded leaders reabsorption mechanism trace (owner run pending)

Owner confirmed **4/4** static leader-availability boundary tests, and previous six 128-rider 120km sensitivity races were **10/10 E2E checks PASS**. The remaining sporting anomaly is a real `breakaway_1` -> `peloton_main` move at race second **510** for eight authorized chasers after only one funded pursuit tick (solo later rank 126), while 24 authorized chasers did not reabsorb the attacker and the solo still won with a **190.978211-second** lead.

Inspected real integration pathway: after orders execute, `calculateTerrainAwareMultiGroupMovement` computes physical proposals, `applyMultiGroupMovement` advances groups, `applyMultiGroupEnergy` charges real leaders, and `reconcileBreakawayGroups` merges physically caught or close-enough breakaways. The normal reconciliation can absorb a breakaway that is **at or behind** the peloton, and also uses a **five-second proximity window** subject to launch and separating-breakaway experimental protections. This means a leader-rotation difference **during the first pursuit tick** could switch a binary reabsorption outcome and alter the entire remainder of the stage. This is a hypothesis awaiting per-tick verification, not a confirmed root cause.

Added independent offline diagnostic `scripts/uranius-early-reabsorption-mechanism.ts`, fail-closed CLI `scripts/run-uranius-early-reabsorption-mechanism.mjs`, and static boundary guard `tests/uraniusEarlyReabsorptionMechanismBoundary.test.mjs`. Two complete authentic 128-rider rolling 120km scenarios (same inputs, same selected strongest 8 vs 24 chase orders) isolate the first attack/chase ticks, from race seconds **450 through 600**, and report: group member/leader selection, actual peloton and attack physical speeds and before/after-movement distance differences, the capability-funded leader speed bonus, rider-specific funded energy, and actual `reconciledBreakaways.reabsorbedBreakawayGroupIds`. The report additionally identifies whether the catch was a physical overtake or within the rule's five-second window. It hard-gates both races complete, selected leaders differ by rotation, the observed reabsorption at 510 seconds for eight, no equivalent catch for 24 during the sampled window, and a real positive funded energy debit in each. **No physics or state change**: diagnostic only.

Owner verification (not yet run):
```bat
git pull origin main
node --test tests\\uraniusEarlyReabsorptionMechanismBoundary.test.mjs
node scripts\\run-uranius-early-reabsorption-mechanism.mjs --out early-reabsorption-mechanism-local.json
```

The diagnostic distinguishes a genuine physical crossing from an arguably overly coarse five-second merge rule and can identify an early threshold-driven discontinuity. Do not adjust merge radius, leader rotation, chase coefficient, or default-off experimental flags without observed results. **Official 49/60 sporting NO GO; production unchanged.**


## 2026-11-25 — Eight vs 24 authorized leaders: early reabsorption cause OWNER VERIFIED

Owner pulled `0aaf3bb`, executed `tests/uraniusEarlyReabsorptionMechanismBoundary.test.mjs`: **3/3 PASS**, and `scripts/run-uranius-early-reabsorption-mechanism.mjs --out early-reabsorption-mechanism-local.json`: **two complete 128-rider rolling races**, **5/5 E2E checks PASS**, output saved locally. The simulation trace directly identifies a **leader selection + closure speed + 5-second reabsorption threshold interaction**, not an unexplained free chase, and not physical overtaking:

- At 480 s both cases launched the attacker with **44.770321 km/h** against peloton **40.748916 km/h**, producing identical 33.511707m lead after the launch tick.
- At **510 s, 8 chasers**: actual selected rotating leader IDs `sustain-rider-059`, `-120`, `-011`; funded bonus **7.697991%** with paid energy **1.835691**; actual attacker **43.49051085 km/h**, peloton **43.88576399 km/h**; attacker remained **30.217931 metres ahead** after movement (no physical overtake). However peloton speed was higher and separation was within five seconds, so `reconcileBreakawayGroups` reabsorbed `breakaway_1` into `peloton_main` at 510 s. Subsequent attacker finished rank 126.
- At **510 s, 24 chasers**: leaders `sustain-rider-081`, `-068`, `-037`; funded bonus **3.803069%**, paid energy **0.626971**; attacker same **43.49051085 km/h**, peloton **42.29862552 km/h**. Attack group remained **43.444085 metres ahead** and was itself faster, so experimental preserve-separating-breakaway condition suppressed proximity reabsorption despite the group being within the 5-second window. At 540/570/600s advantage continued expanding to 55.125/68.487/82.213m. Solo subsequently won as already verified.

**Confirmed mechanism:** leader rotation indexes into a candidate list sorted by capability and filtered by executed chase orders; expanding eligible pool from 8 to 24 changes the cyclic rotation selection at the same tick. The smaller pool selected stronger pace leaders in this phase. This changes the peloton's physical speed and the binary proximity-reabsorption outcome. It is **not correct** to describe the eight-rider event as the peloton physically passing the attacker; it was a **threshold/proximity reclassification while still ~30m behind**, with evidence that the faster peloton was closing.

**Further validation priorities (do not conflate):** (1) test a deterministic rotation schedule that is stable when extra eligible riders are added and respects individual paid effort/rotation instead of candidate-list-length aliasing; (2) independently test reabsorption requiring an actual physically completed catch vs the current five-second closing-proximity interpretation, especially at attack birth + 30s; (3) compare tactical variety and leader exhaustion under each default-OFF alternative. Existing public release gate remains **49/60 NO GO**. No production or default-on physics change.


## 2026-11-25 — Experimental rider-stable duty rotation added; owner runs pending

Prior owner trace `scripts/run-uranius-early-reabsorption-mechanism.mjs` verified **3/3 static** and **5/5 runtime**. At race second 510 with 8 chase orders, leader trio (`059,120,011`) funded **7.697991%** bonus, peloton moved **43.885764 km/h**, attacker **43.490511 km/h**, physical attack lead remained **30.218 m**. The five-second proximity rule reabsorbed the breakaway despite no overtake. With 24 orders, trio (`081,068,037`) funded only **3.803069%**, peloton **42.298626 km/h**, attack lead grew to **43.444 m**, and faster breakaway remained separate. The culprit is **candidate-count-dependent cyclic rotation** (`floor(second/tickSeconds) % candidates.length`) interacting with a binary closeness/reabsorption rule, not an uncharged catch.

Implemented separately gated `experimentalStableLeaderRotationEnabled?: boolean` (default OFF) throughout calibrated runner, integrated runner, terrain-aware movement and funded leadership computation; requires existing `experimentalCapabilityBasedLeadershipEnabled=true` or errors. Historical cycling rotation, previous fixed 3% model, canonical movement and energy accounting remain unchanged when omitted. New `pelotonPaceLeadership.experimentalStableDutyRotation` computes each **already-qualified and authorized rider's** duty availability from a fixed deterministic rider-ID hash and 10-tick race-clock epoch, with a one-third off-duty window. It selects up to three strongest on-duty qualifying leaders from the sorted pool and otherwise falls back to authorized qualified riders; there is **no modulo by candidate-list size** in the new branch. Rider energy >5 qualification, authorization, same physical movement and per-rider rising-cost surcharge are retained. This is **only a scheduling hypothesis**, not proof of tactically or physiologically correct rotation, and does not promise monotonic outcomes under roster expansion.

Added `scripts/uranius-stable-duty-leadership.ts`, offline fail-closed CLI `scripts/run-uranius-stable-duty-leadership.mjs`, and `tests/uraniusStableDutyLeadershipBoundary.test.mjs`. Four genuine 128-rider rolling 120km races: existing 8 and 24 authorized leader rotation (regression fingerprints catch at second 510 / 24 solo wins by 190.97821s) and new identity-stable duty rotation with same 8 and 24 orders. Reports solo-to-first-peloton finish gap, winning rank, first 480–600s actual physical movement speeds/positions, selected authorized leaders, extra charged energy, actual catch transition, and energy ledger residual. Guards no free or unauthorized funded effort, both historical fingerprints, all 128 riders finishing and recorded non-forced outcomes. **Owner has not executed** new source tests or four-race scenario.

Owner commands:
```bat
git pull origin main
node --test tests\\uraniusStableDutyLeadershipBoundary.test.mjs
node scripts\\run-uranius-stable-duty-leadership.mjs --out stable-duty-leadership-local.json
```

Only after these results are inspected should the separately unresolved physical-catch-vs-five-second-window policy be considered. No production changes. **49/60 sporting NO GO**.


## 2026-11-25 — Stable duty owner VERIFIED; physical-only catch counterfactual added (owner run pending)

Owner executed `tests/uraniusStableDutyLeadershipBoundary.test.mjs` **3/3 PASS** and `scripts/run-uranius-stable-duty-leadership.mjs --out stable-duty-leadership-local.json`, completing **four authentic 128-rider rolling 120km races** with **7/7 runtime checks TRUE**.

Historical modulo rotation fingerprints preserved: 8 chasers reabsorb attacker at **510s** and finish rank **126**; 24 chasers leave solo winner **190.978211s** ahead. Under new identity-stable duty rotation, **8** chasers reabsorb at **630s** (five paid ticks, **6.205807** additional energy), while **24** chasers reabsorb at **510s** (one paid tick, **1.737303** additional energy). At 510s in this latter case the peloton's **43.774941 km/h** exceeds breakaway's **43.490511 km/h**, but breakaway is physically **31.141m ahead**. The group reabsorbs under existing five-second window, without a completed physical catch. Stable rotation technically works but does not remove the discontinuity, and is **NOT approved** for gameplay.

**Second, independent, default-OFF experiment committed** to test proximity reclassification apart from leader rotation, without changing the authorized leader selection, speed, charges, or order rules:
- Added `experimentalRequirePhysicalBreakawayCatch?:boolean` to `reconcileBreakawayGroups`, wired explicitly through the calibrated and integrated offline stage runners (default false). When true, only a *breakaway physically ahead of the peloton* is excluded from peloton reabsorption; breakaways at or behind the peloton retain existing physical-catch handling; chase and dropped groups retain unchanged rules. The existing five-second proximity and protection rules remain untouched when false.
- Added `scripts/uranius-physical-breakaway-catch.ts`, `scripts/run-uranius-physical-breakaway-catch.mjs`, `tests/uraniusPhysicalBreakawayCatchBoundary.test.mjs`. Four full 128-rider races: old 8/24 authorized capability-funded leaders with their original proximity rule and identical 8/24 authorized capability-funded leaders with physical-only breakaway catch. Explicit controls require original owner fingerprints (510s capture for 8, 190.978211-second solo lead for 24), no 510s artificial reabsorption for physical-only 8, actual funded energy and authorized riders, conservation of debits, all 128 finishers. Actual catch, finish outcome and gap under physical-only mode are reported rather than forced. No stable duty flag is used in this comparison, preserving one-factor-at-a-time discipline.
- **Do not claim the new four races or static tests have run**, until owner executes:
```bat
git pull origin main
node --test tests\\uraniusPhysicalBreakawayCatchBoundary.test.mjs
node scripts\\run-uranius-physical-breakaway-catch.mjs --out physical-breakaway-catch-local.json
```

The physical-only option may allow breakaways to persist longer or alter finishes; it is a sporting rule hypothesis, not verified as realistic. Maintain default-off and **49/60 sporting NO GO**. No production state or paid infrastructure changed.


## 2026-11-25 — Physical-only breakaway catch owner VERIFIED: 3/3 static and 8/8 real-race checks

Owner pulled `b8ac45b`, ran `tests/uraniusPhysicalBreakawayCatchBoundary.test.mjs` (**3/3 PASS**), and `scripts/run-uranius-physical-breakaway-catch.mjs --out physical-breakaway-catch-local.json` (**4/4 authentic 128-rider 120km races completed, 8/8 E2E checks TRUE**; local report saved).

Identical 8/24 authorized leaders under unchanged dynamic capability-funded, historical cyclic rotation; only `experimentalRequirePhysicalBreakawayCatch` differs:
- **8 leaders, existing 5-second proximity rule**: attacker still **30.217931 m physically ahead** at second 510; peloton **43.885764 km/h** vs attacker **43.490511 km/h**, yet `breakaway_1` is reabsorbed at **510s** despite no physical overtake. Attacker eventually rank **126**, group finish gap **0s**; only 1 funded tick and **1.835691** energy charged.
- **8 leaders, physical-only catch**: same selected leaders, speed, cost and **30.217931 m** separation at 510s, so no premature reabsorption. At 540/570/600s physical gaps are **32.465287 / 41.705023 / 53.253564 m**; solo ultimately wins with **244.920818354s (4:04.921)** over first original peloton rider, after **316 funded ticks**, **251.974850** actual paid leader energy; maximum ledger error **0.000009898**.
- **24 leaders, proximity and physical-only catch**: both maintain the *same exact prior owner fingerprint*: solo rank **1**, **190.978210843s (3:10.978)** ahead, **316 funded ticks**, **290.764280** paid additional energy, maximum ledger residual **0.000003539**. No reabsorption under either flag. These identical outcomes protect established 24-leader physics.
- All four runs reported **128 finishers**, **0 unauthorized leader energy charges**, and maximum leader ledger residual <1e-4.

**Finding:** the main demonstrated premature-catch defect stems from the five-second proximity reclassification of an ahead-of-peloton breakaway, NOT a verified physical catch. Requiring the peloton to physically reach a breakaway corrects this exact scenario and preserves the old no-catch 24-leader result. Eight-versus-24 leader finishing gaps remain different due to dynamically selected authorized leaders and energy; no claim of monotonicity should be made. The alternative physical-catch rule is a **leading default-OFF experimental candidate**, not yet approved canonical behavior.

**Next release-safety validation:** test isolated default-OFF physical catch across varied stage profiles (rolling/steep), attacker capability, attack timing, chaser count and controlled genuinely caught scenarios. Need explicit evidence that *actual physical overtakes still reabsorb* and no stranded overlapping groups or spurious finish ranks develop; add a direct unit test of separation >0 versus <=0 at reconciliation boundary. Do not promote or conflate with stable-duty rotation until these gates pass. **49/60 sporting NO GO. No production changes.**


## 2026-11-25 — Physical-only catch acceptance matrix added (owner execution pending)

Following verified commit dd0d5b7, added `scripts/uranius-physical-catch-matrix.ts` and `scripts/run-uranius-physical-catch-matrix.mjs`. These are offline-only validation files; no race-engine, canonical configuration, production or database changes. Existing verified four races are not repeated.

- Five controlled post-movement reconciliation fixtures use the real reconciliation implementation and validated 10-rider state: legacy catch at +30m, physical-only preservation at +30m and +1mm, rejoin at 0m and -30m. Check membership, inactive source group, energy/clock invariance, no mutation and repeated reconciliation stability.
- Eight 128-rider 120km races compare proximity vs physical-only mode in four matched scenarios: flat/76-strength/early/24 chasers; rolling/94-strength/late/8; mountainous/82-strength/early/24; mountainous/90-strength/late/8. Early=5km, late=70km. Selected chasers come from actual attributes. Same input within each pair; no forced winner or catch.
- Audit the actual pre-reconciliation state and previous tick, distinguish non-finish positive-to-nonpositive crossings from groups arriving simultaneously at the finish, check exact rejoin membership, catch only after physical contact, absence of stranded crossed breakaways, launch execution, finish ranks, authorization and leader energy ledger conservation. The runner saves structured evidence before rejecting failed gates; no observed natural crossing is a FAIL (coverage gap), not proof of broken physics or permission to relax tests. Mountain scenarios may reveal the previously known low-energy ledger limitation; report separately rather than silently normalize it.
- Integration observation: the existing physical-only option is passed by the integrated runner only inside the birth-tick dropped-group protection branch. The matrix explicitly enables that prerequisite, preserving the previous experiment's configuration. Independence of the flag needs a separate decision before canonical promotion.

Owner verification, one pull and two commands:
```bat
git pull origin main
node scripts\run-uranius-physical-catch-matrix.mjs --boundary-only
node scripts\run-uranius-physical-catch-matrix.mjs --out physical-catch-matrix-local.json
```
Expected report contains 5 boundary cases / 4 boundary gates, and full matrix 8 races / 13 gates. No execution evidence yet; do not claim PASS until results arrive. **49/60 sporting NO GO**, experimental rule default OFF.


## 2026-11-25 — Physical-only catch matrix OWNER VERIFIED: 4/4 boundary gates and 13/13 full gates

Owner pulled `2a031a2`, ran both documented commands, and supplied complete console evidence. All five controlled fixtures passed: +30m and +1mm remain separate in physical-only mode; exact equality and -30m correctly rejoin; legacy +30m reabsorbs; membership, input immutability, energy, clock and idempotence checks all TRUE. All eight authentic 128-rider 120km races completed with valid ranks, attack launch and paid authorized chase. The local JSON was saved by the owner; this report records the supplied console evidence, not an independently retrieved local file.

| Matched scenario | Proximity rank | Physical rank | Catch evidence |
|---|---:|---:|---|
| Flat, weak early, 24 chasers | 126 | 126 | Legacy 510s +24.532954m; physical 660s -9.533713m, previous +2.599621m, km 7.618705, valid membership |
| Rolling, strong late, 8 chasers | 1 | 1 | No catch, identical 10154.087813322s finish |
| Mountain, medium early, 24 chasers | 123 | 1 | Legacy 660s +58.353021m; physical no catch, 343 ahead-preserved ticks |
| Mountain, strong late, 8 chasers | 1 | 1 | No catch, identical 10882.184752295s finish |

All four physical cases: zero premature catches, zero stranded crossed groups, zero unauthorized charges. Maximum observed leader ledger residual across all eight runs 0.000006217054, below 0.0001 threshold. Genuine non-finish crossing observed in flat weak early scenario. Mountain medium physical chase paid 304.780992 energy vs 3.214549 with proximity; outcome is materially changed, not evidence of universal sporting calibration. The physical-only catch candidate has passed its scoped validation matrix; no rerun required.

Next: make the experimental physical-catch option independently forwarded by the integrated runner without requiring birth-tick dropped-group protection, and test explicit true/false/omitted flag behavior with default regression fingerprints. Then validate interactions with multiple attacking groups, trailing attacks and finish-line crossing order before deciding canonical behavior. No default promotion, no production change, no paid resources. Official checklist remains **49/60 sporting NO GO**; broader integration and acceptance remain pending.


## 2026-11-25 — Independent physical catch and finish-crossing regression package (owner execution pending)

Implemented independent forwarding of `experimentalRequirePhysicalBreakawayCatch` through the integrated tick even when birth-tick dropped-group protection is absent or false. Other previously bundled flags retain their historical forwarding semantics. Default remains false.

Code inspection also identified a finish-line edge case: movement caps group distances at stage length, so reconciliation before sub-tick finish detection can merge an earlier-crossing breakaway into the later-crossing peloton, erasing its own crossing time. In explicit physical-only mode with sub-tick interpolation, the integrated tick now supplies crossing seconds derived from each actual movement proposal (remaining distance / speed). A breakaway crossing before the peloton retains its group, and groups with a recorded finish crossing are excluded from cooperative breakaway merges. Equal or later crossings keep the existing reabsorption decision. Non-finish reconciliation and default-off execution remain unchanged by design. This is a scoped candidate fix, not a general continuous-motion/finish rewrite.

New `scripts/uranius-physical-catch-integration.ts` and fail-closed runner contain 11 gates:
- real integrated tick demonstrating independently enabled physical catch without birth protection, and identical explicit false/omitted legacy behavior;
- complete ten-rider stage hash/result equivalence between default and explicit false (not an independently captured pre-change golden);
- cooperative ahead breakaway merge, distant trailing attack preservation, actual catch of one breakaway without absorbing another;
- controlled finish state: no teleportation of unfinished group into a finishing breakaway, earlier finish preserved and later catch retained, exact finish tie handling;
- real integrated finish tick with independent calculation of crossing times, winner and all ten finishers; controlled fixture immutability.

Owner verification:
```bat
git pull origin main
node scripts\run-uranius-physical-catch-integration.mjs --out physical-catch-integration-local.json
```
Expect 11/11 gates, pending execution. The test saves and displays failed gate evidence before exiting nonzero; do not interpret missing observations as a PASS. The previously verified eight-race physical catch matrix remains recorded; no immediate repeat is required for this focused check. Final candidate promotion requires broader regression against prior canonical golden hashes and sporting acceptance. **49/60 sporting NO GO; no production/database changes or paid resources.**


### Owner execution correction — 2026-11-25

Owner pulled `f660e07`; esbuild succeeded, but the integrated runtime stopped at `calculateRiderTerrainCapability` because the historical ten-rider fixture lacks `timeTrial` and `raceIq` (both required by this engine path). No integration gate results were produced. Commit `bd8c4ea` enriches only this new test's local input with neutral 75 for both missing attributes, including the two default-stage comparisons; existing shared fixture, physics, and prior golden baselines are untouched. Re-run the same integration command after pulling main. Verification remains pending; 49/60 sporting NO GO.
