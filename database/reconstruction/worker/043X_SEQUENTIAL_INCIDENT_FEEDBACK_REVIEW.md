# 043X — sequential incident and helper episode feedback (offline only)

2026-11-27. Owner 043W native 4/4 accepted; 136/136 previously owner-accepted native groups, overall 49/60. Repository-only development; no hosted access, changes or activation.

## Scope
Extend 043W with per-incident and per-episode identity rather than one episode per rider. Accumulate initial incident costs and historical interpolated chase costs across sequential episodes; maintain one rejoin confirmation per episode. Incident rejoin witness only for the affected rider (not helper); detached helpers and affected riders excluded from candidate selection, and helpers rejoin modeled peloton without fabricated incident cooldown. Repeat incident requires prior successful modeled rejoin and 900-second rider cooldown; no incident after DNF, no overlapping active episodes. Reuse 043T historical rescue planner (same-team/command/GC restrictions and reserved helpers) through opt-in sequential validation. Refuse prefix extension if any already observed feedback (energy, status, group, eligibility exclusion or rejoin) changes or a confirmed crossing changes. Validate helper source group against available earlier feedback audit. Frozen base replay includes future baseline observations; no physical movement, authenticated source, final classification, accounting or health writes. Original 043Q/T/W default paths retained. Full historical parity not asserted; existing 043U/V source gates may refuse unsupported overlap scenarios before this adapter. No natural repeat/helper occurrence in actual engine has yet been demonstrated. Source arithmetic unchanged from pinned historical blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.

## Implementation
- scripts/uranius-historical-team-rescue-review.mjs a5381f179fb328855dfe9f33a02f877cc502947a, opt-in sequential nonoverlap and repeat cooldown/rejoin validation; blob fe8b9e5448d63b19d7504867bcf9b3cb64742846.
- scripts/uranius-historical-incident-eligibility-review.mjs 799feb4556a186bf1de682cc4a4c67d1f1d17d32, opt-in explicit candidate exclusion for detached helpers; blob 516cfb36ae4b3d7897dd88d3c3a898002839c0a7.
- scripts/uranius-sequential-incident-feedback-review.mjs aca13933150fd7d850d13a40b303889b0e0cbe51, blob cd3d088f55e9a2de4e3d05f9877dab4f0e1d10dd. Revalidate 043U/V evidence, recompute selected prefixes, ledger and earlier feedback invariant.
- tests/uraniusSequentialIncidentFeedbackAcceptance.mjs a279cfd980300bdd4d36d99f768da994ffb177b1, blob 9dcaabfa59fa4b3ff86cc727a6f20a341cb86ed3. Development first two controlled synthetic episode groups PASS; synthetic 271-frame/24-rider full adapter preflight and third-group assertions PASS (three incidents, 232 feedback ticks, one modeled rejoin) using re-fetched JS, original MD5/canonical digest shim. Actual native engine, native SHA, complete four-group run and actual selected repeat/rescue scenarios not executed in development. Native 4/4 pending. Harness neutral actual-engine fixture verifies source/causal integration, while repeat/helper cases are explicit synthetic episode fixtures. Bounded unsupported scenario refusals are allowed in deterministic fixture search; unexpected errors are not swallowed.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusSequentialIncidentFeedbackAcceptance.mjs --offline-only
```
Expected PASS 4/4 sequential incident feedback checks; no hosted connection, then cleanup. Node/esbuild only, no PostgreSQL/private files. Next prioritize deterministic selected repeat/helper scenarios at the actual-engine bridge, physical movement feedback and final classification before official writer admission. Hosted activation BLOCKED.
