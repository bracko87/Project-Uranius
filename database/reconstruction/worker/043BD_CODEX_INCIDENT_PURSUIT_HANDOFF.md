# 043BD — Codex implementation handoff: exact wind, incident and pursuit

Baseline: owner native 276/276 distinct acceptance groups; physical runner test 4/4 at 63b03eb; recorded in 088762c. Read 043BD_COURSE_WIND_TICK_REVIEW.md and 043BC_CHANGING_COURSE_BEARING_REVIEW.md before editing. Existing opt-in exact path is incident-free, synthetic wind-only, and not official. Do not replace the default.

## Objective
Extend the existing offline experimental exact-course-wind runner to controlled mechanical incidents, recovery and pursuit. Use the accepted wind integration and rider-energy primitives, not a second independent weather model.

Inspect scripts/uranius-multi-rider-incident-motion-review.ts, scripts/uranius-physical-incident-finish-review.ts, scripts/uranius-prepared-physical-weather-review.ts, src/race-engine/simulation/{integrateCourseWindTick,calculateCourseWindEnergy,reviewCourseWindGroupTick,multiGroupMovement,multiGroupFinishCandidates,applyMultiGroupMovement,applyMultiGroupEnergy}.ts and all relevant downstream consumers and previous tests. Trace actual callers and frozen evidence contracts.

## Required behavior
- Explicit offline opt-in; default 043BC/043BD behavior unchanged. No hosted access, production credentials, SQL, migration, deployment, or official flags. Do not push main. Work on an isolated branch from current main and report diff.
- Integrate each active group's local wind over distance boundaries at its own actual position, preserving existing terrain and speed cap behavior; do not infer new wind coefficients.
- Stationary repair remains stationary for the full repair period, with canonical stationary workload. Pursuit and helper movement must honor accepted pursuit/terrain rules and contact limits. If target-relative speed or contact is ambiguous, document the assumption and test it; do not fabricate rejoin or movement. Exact within-tick moving-target intersection must either be implemented and tested or explicitly scoped out with a guard, not silently approximated as verified.
- Use the same chronological distance/time/speed slices for movement, energy, and terminal time. Apply supply once, accumulate uncapped costs and cap once. Do not double-count fractional finish workload. Keep actual historical incident-risk sampling semantics unchanged.
- Preserve no backward movement, no merge into finished group, valid membership, deterministic sorting/replay, and complete classification. Retain exact workload receipts. Block unsupported post-stage accounting until its consumers understand receipts. Do not broaden severe-weather or sporting authority silently.
- Prefer narrow explicit review APIs, existing test fixture conventions, and no unrelated refactor.

## Acceptance
Add focused tests for (1) a stationary repair group while the peloton crosses a turn; (2) pursuit across local wind boundaries with different group exposure and physical contact/rejoin (including helper pickup if supported); (3) a trailing rider's fractional finish after target finishes, with conserved per-slice workload and no artificial merge; (4) deterministic replay, cap/invalid input/authority guards and legacy default parity. Include negative cases for blocked unsupported semantics. Complete a synthetic full race with actual incident runner and terminal continuation. Verify against independent analytic calculations or canonical per-slice energy, not merely self-comparison.
Run existing 043BD boundary, energy, group and physical runner suites plus 043BC changing course bearing and relevant incident/finish/classification regressions. Discover the repository's actual typecheck/build scripts; execute them and distinguish baseline failures from introduced failures. Run offline only with no secrets or service connections. Report exact commands, exit codes, output and changed files. If dependencies prevent testing, say so and do not claim acceptance. Do not increment native acceptance count until owner verification.

## Deliverable
Commit on review branch, provide SHA/diff summary, test evidence, limitations and Windows CMD reproduction commands. No main merge or official activation without explicit owner review.
