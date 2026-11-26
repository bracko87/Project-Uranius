# 043P — historical incident probability and checkpoint selection (offline only)

2026-11-26. Owner 043O 4/4 native accepted; 99/99 previously accepted native groups, 49/60 overall. Neither hosted database queried or modified.

## Pinned original source

Original ProPeloton-Manager commit b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, src/universal-race-engine/runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886. Probability constants 31056–31076; condition risk and probability 32103–32218; deterministic roll, crash severity, technical severity and member selection 32220 onward; historical candidate construction/selection and consequence handoff 33570–33943; fatigue risk 37153 onward. Historical base per 30s probabilities .00008 individual crash, .00008 group crash, .00012 technical, .003 exhaustion; caps .08/.04/.05/.015 respectively. Exact original weather, speed, gradient, density, fatigue, rider control, preparation, command, race situation, equipment condition and mechanical support multiplication/rounding. Exhaustion base is conditional upon eligibility, NOT an unconditional withdrawal risk.

Source also recovers full-loop guards, not implemented in this slice: stage budget 3–7 based on distance, terrain and adverse weather; per-phase allocation; 2 or 3 crash cap; global/rider cooldown; physically eligible racing states; first 60s/1km and final .5km exclusion; sustained depletion >=240s with distance >=60km, progress .35 to <.99, energy <=15 and runtime fatigue >=83; actual context/gradient/speed/chase/weather and member eligibility. Further source reconciliation required before complete occurrence integration.

## Implementation

- scripts/uranius-historical-incident-probability-review.mjs (d653e221f3b31b05ee5c95e223e770eeb5e92847, blob 023305f331a171313f93b37dfa38b09f54018341): exact historical probability functions and strict finite explicit input, synthetic single-checkpoint digest and stage/run/roster scope, original seed composition, MD5 draw, ratio-based selection with deterministic tie breaks, affected group rider count and membership, crash/technical severity and 043O consequence handoff. Only candidate list explicitly supplied as synthetic eligible; not derived from physical runtime. No full-loop generation, technical subtype/time loss/chase/group mutation, actual exhaustion exposure or cooldown enforcement, authoritative health persistence or deployment. Hard false physical checkpoint/occurrence/authority/official flags. Disabled 043L/M contract untouched.
- tests/uraniusHistoricalIncidentProbabilityAcceptance.mjs (3579acd2f65611ea83819306509210fd5787c893, blob 0bf2ba2bae72efd019d1135eb39c3cb275450c3d): 400 historical source-derived probability outputs, checksum bdf9c1269f0a1561ce8440a63b5187c8; 2,000 deterministic synthetic checkpoint draws, candidate competition, group members, handoff and negative boundaries. Development 4/4 groups PASS from re-fetched committed JS using original extracted MD5 and JSON equality shims, not native Node crypto/SHA. Native Node 4/4 pending. No existing engine/writer modified.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusHistoricalIncidentProbabilityAcceptance.mjs --offline-only
```
Expected PASS 4/4 historical incident probability checks; no hosted connection. No PostgreSQL or private files required. Next derive complete physical eligibility and cooldown/cap state from actual engine checkpoints, verify against pinned original, then independent source admission. Hosted activation BLOCKED.

## Owner native acceptance — 2026-11-26

Owner pulled 6c151dd..fa36b7f and ran the prescribed offline test. All four groups PASS, including 400 probability breakdowns, equipment/cap boundaries, 2000 checkpoint draws and tamper refusal. No hosted connection. Scoped 043P CLOSED; 103/103 owner-accepted native groups, overall 49/60. Full physical eligibility and occurrence authority remain outstanding.
