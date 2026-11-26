# 043O — historical Phase10 post-incident health handoff (offline only)

2026-11-26. Owner 043N native 6/6 PASS; 95/95 previously accepted native groups, overall 49/60. Repository source only; neither hosted database queried or changed.

## Recovered source and material difference

Original ProPeloton-Manager pinned commit b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, src/universal-race-engine/runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886. Ordinary fetch returned empty due to size; direct blob retrieval returned 1,328,555 characters, 38,682 lines. Exact historical functions: deterministicRound lines 4700–4705, md5LeftRotate/md5Hex 8093 onward, phase10DeterministicRoll 32220–32223, phase10CrashHealthOutcome 32378–32508, phase10IntegerFromHash 32591–32594, status consequence branch 33942 onward. This is pinned repository source, not independent proof of current deployed engine revision or actual race provenance.

Historical handoff injury probability given an individual/group crash: minor .12, moderate .30, serious .75. Independent deterministic severity roll differentiates individual vs group serious crashes; independent case/body rolls produce six possible injury codes, exact original penalties/energy loss and continuation. Technical incident and exhaustion have no persistent injury from this path. Road exhaustion forces DNF, road serious technical incidents on equipment condition <25 can force nonmedical DNF (separate .30 deterministic draw). A major injury forces medical DNF in road scope. Team/pair TT exceptions exist in original; not accepted here. Hash uses 13 hex digits / 2^52 rounded 12 decimals, distinct from 043I preparation protection roll. Do not reinterpret serious as major health severity. These are conditional post-incident rules, not crash occurrence rates.

043L/M static candidate mapping is a different, disabled-runtime contract, with different probabilities, body parts and exhaustion effects. Never combine or substitute the contracts. Historical handoff body part strings may differ from current catalogue defaults; do not silently normalize or authorize case persistence. Exact candidate-package DNF override/body-index algorithm remains unverified; no activation. Original historical incident occurrence algorithm is also in blob (32112 onward), but not implemented or accepted here.

## Implementation and test

- scripts/uranius-historical-phase10-handoff-review.mjs commit df3ac1cdc540a6673fdfa5ecc3cb51de86199fc0, blob dd2cdb07e3b951e4f0669f6ba8cd1ea05fe027f8. Exact recovered health handoff translated TS to JS, uses Node UTF8 MD5, original deterministic round/index. Strict synthetic stage/run/rider/team scope, source digest, explicit hash and equipment condition, road only, unexpected fields refused; returns historical health/status prediction, not a generated incident, not authenticated source, no medical persistence, no official rights. Fails closed if rare rounded index yields undefined. Existing runtime and writers untouched.
- tests/uraniusHistoricalPhase10HandoffAcceptance.mjs commit d58b096459261f1ca753bbf470fdf139d596b88a, blob 88109757b839d2e59fc9097c6df56516ca5668f9. 1200 deterministic health outcomes across four kinds x three severities x 100 synthetic cases; oracle built directly from retrieved pinned source functions with TS type annotations stripped and original pure JS MD5. Aggregate MD5 92fdbeb450677d20466ab6b2f78dd268 is a parity checksum, not authentication. Development four groups PASS using actual re-fetched adapter/test, original MD5 and JSON equality shim (not native SHA/Node crypto). All six injury subtypes, exact penalties, continuation, nonmedical DNF boundary and rejection of altered source/injected authority. Native Node 4/4 pending.
- Further work: independent immutable actual incident provenance, actual occurrence and group effects, catalogue compatibility and explicit historical vs candidate-package choice, real preparation protection and health writer integration, source-authenticated readiness and official publication. No real incident generation, no official result, no additional live read authorized.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusHistoricalPhase10HandoffAcceptance.mjs --offline-only
```
Expected PASS 4/4 historical Phase10 handoff checks; no hosted connection. No PostgreSQL or private snapshots required. Hosted activation remains BLOCKED.

## Owner native acceptance — 2026-11-26

Owner pulled 96dac0d..6c151dd and ran prescribed offline harness. All four groups PASS, including 1200 exact historical outcomes, subtype/body/penalty/energy/continuation, nonmedical exhaustion/technical withdrawals and provenance refusal. No hosted connection. Scoped 043O CLOSED, 99/99 owner-accepted native groups through 043O; 49/60 overall. No live occurrence, source authentication or health writes authorized.
