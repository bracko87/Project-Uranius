# 043R — historical technical incident and initial separation consequences (offline only)

2026-11-26. Owner 043Q native 6/6 accepted; 109/109 previous owner-accepted native groups, overall 49/60. Repository-only development; no hosted access or changes.

## Original source
Pinned ProPeloton-Manager b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886: technical subtype weighted selection 32283 onward, 32594–32632 time-loss and energy ranges, 33885–34020 selected hash suffixes, repair multiplier, original provisional separation, health and sprint zone. Five technical subtypes: dropped chain, puncture, wheel damage, drivetrain failure, bike change. Condition-dependent weight bands <25, <50, <75, <90, >=90; distinct severity ranges. Original time-loss draw inclusive, technical repair multiplier .82..1, rounded seconds. Energy base clamp(loss/30 * factor,.5,8), technical factor .5, group crash .85, individual crash 1; exhaustion zero. Additional original injury energy cost added. Road surviving rider separates if loss >5s; DNF no provisional time penalty. Sprint zone eligibility only, default 3km on flat non-summit finish. Actual official protection requires original checkpoint/finish resolution and is not invented.

## Implementation
- scripts/uranius-historical-incident-consequences-review.mjs commit bb1a2e487cd2c88f10eadfaecfa0091b59f1e2f0, blob 39474d2c5122e6e9cbf87b0cc38a9b0b1c0a4be5. Source-extracted arithmetic translated to JS, frozen synthetic checkpoint digest and complete normalized repair modifier coverage, re-run unchanged 043P selection and 043O handoff, exact initial loss and provisional gap per affected rider. Explicit road stage geometry and sprint eligibility are synthetic, not derived from a verified timeline; no actual chase/rejoin or final classification, penalty, sprint zone protection, health persistence or official write. Final fields remain null and authority flags false. Does not alter 043Q trace or production engine. Current archived source and disabled candidate package remain separate.
- tests/uraniusHistoricalIncidentConsequencesAcceptance.mjs commit 79354e682cfedf6c65a35613988f2352840cc864, blob 50ab7b89a674e6341b313ccca539caea6107b0cf. 1200 source-extracted initial loss cases, reference checksum b8601ae20aa868d001527dda50769833, all five subtypes, modifier and 5s boundary, 800 checkpoint selection comparisons, health/energy/DNF and sprint eligibility, frozen scope and tamper rejection. Development 5/5 groups PASS from re-fetched committed JS using original MD5 and JSON equality shims, not native Node SHA/crypto. Native 5/5 pending.
- Remaining priority: actual physical autonomous chase and rejoin source evidence, finish-time/sprint protection and chronological integration; no official activation.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusHistoricalIncidentConsequencesAcceptance.mjs --offline-only
```
Expected PASS 5/5 historical incident consequence checks; no hosted connection. No private configuration downloads or PostgreSQL required. Hosted activation BLOCKED.

## Owner native acceptance — 2026-11-26

Owner pulled d4262dc..511d834 and ran prescribed offline harness. All five groups PASS, including 1200 initial loss cases, five technical types, checkpoint handoff/separation, sprint eligibility and tamper refusal. No hosted connection. Scoped 043R CLOSED; 114/114 owner-accepted native groups, 49/60 overall. Physical chase and final time authority remain unverified.
