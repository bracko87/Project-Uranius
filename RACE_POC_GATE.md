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
