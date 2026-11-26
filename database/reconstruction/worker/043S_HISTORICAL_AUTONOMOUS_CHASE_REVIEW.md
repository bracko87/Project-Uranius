# 043S — historical single-incident autonomous chase (offline only)

2026-11-26. Owner 043R native 5/5 accepted; 114/114 previously owner-accepted native groups, overall 49/60. Neither hosted database queried or modified.

## Original source
Pinned ProPeloton-Manager b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886. Lines 31219–31447 replay interpolation, terrain skill, group closure and chase energy; 31514–32012 autonomous chase, helper rescue and group merge; 34150 onward consequence update. Phase base closure seconds/km 4.8,3.2,.4,-1.2; drafting, skills, relative energy, fatigue, target pressure and late sprint penalties; clamp closure -8..8. Half-km grid, interpolate within interval when gap crosses five seconds, charge only ridden fraction, zero final gap on rejoin; otherwise rounded remaining gap becomes model time penalty. Historical approximation, not a proof of actual physical positions or official finish times.

## Implementation and verification
- scripts/uranius-historical-autonomous-chase-review.mjs commit 40b9e0be2a0a752e364b861f46cb308f113f887c, blob 48cb4cb4b945c1bf78e8afe659a5e41ef2d75ce2. Original closure, gradient, energy and target gap functions extracted and translated to JS. Bounded single-incident group reconstruction from recomputed 043R consequence, complete synthetic rider attributes, route and base timeline digest, road only. Same incident surviving riders share group closure with individual energy costs. Explicit no-rescue-eligible synthetic policy required; no independently verified team plan, actual base replay, physical positions, multi-incident group merge, team rescue, repeated incident/rejoin coordination, or official sprint protection. The modeled gap is not authoritative finish time. All authority and official flags false. Existing accepted packages unchanged.
- tests/uraniusHistoricalAutonomousChaseAcceptance.mjs commit 3853643abff9265c8e87feed6d25461d009582c7, blob 361fe65d18b8c74705ca9f5b1577de38d5b7664f. 400 exact original closure outputs checksum 5b8d7cb04011dfa5c9292b43c4750180, early rejoin and late nonrejoin, multi-rider single incident, monotone trace and energy, tamper and scope guards. Development 4/4 PASS using exact re-fetched JS with original MD5 and JSON equality shims; full native Node crypto/SHA pending. This validates source arithmetic and bounded simulation properties, not end-to-end original engine parity.
- Next: multi-incident group merge and team rescue with frozen source stage plans and GC, followed by physical replay/source and final-time authority reconciliation. Hosted activation BLOCKED.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusHistoricalAutonomousChaseAcceptance.mjs --offline-only
```
Expected PASS 4/4 historical autonomous chase checks; no hosted connection. No additional private files or PostgreSQL required.

## Owner native acceptance — 2026-11-26

Owner pulled 511d834..381a0a3 and ran prescribed offline harness. All four groups PASS, including 400 reference calculations, successful/failed chase, shared group and energy, and evidence protection. No hosted connection. Scoped 043S CLOSED; 118/118 owner-accepted native groups through 043S; overall 49/60. Actual physical source and multi-incident/rescue authority remain unverified.
