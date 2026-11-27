# 043AT — natural mountain separation (offline only)

043AS owner native 4/4 accepted; cumulative 220/220 distinct groups. b6a62c0 adds default-off dropped-group physical catch rule; 9162be3 forwards it to integrated terrain runner and protects birth-tick drops; 877d846 adds isolated frozen review; 795d732 adds native acceptance. Native execution and TypeScript checking pending.

Reuse existing integrated calibrated movement and pressure: terrain influence .5, progressive resilience for steep-gradient movement and pressure, 120 consecutive seconds of cannot_hold, sub-tick finish interpolation. A drop is created at its source position, not given an artificial starting gap. Newborn group is protected for that tick and subsequently moves independently. Explicit physical dropped catch prevents proximity merge while trailing, permits merge at physical contact/crossing before finish, forbids reabsorption due solely to finish-line clamping. This is a tick-level contact approximation, not continuous within-tick trajectory integration. Existing absent/false path unchanged. Review disables five-second dropped-wave consolidation to prevent unrelated proximity transfers; it retains existing calibrated group speed model rather than layering the 043AR/AS alternate pace model. No original production terrain calibration claimed.

Frozen 40km mountain stress fixture: 24 riders, six climbing skill 5 and eighteen climbing skill 95; otherwise matching attributes, initial flat, +10% ascent, -10% descent, final +8% climb. Extreme synthetic skill contrast intentionally tests separation rather than realistic calibration. Acceptance requires actual sustained pressure-generated drops, independent group movement and physical finishing gap. Explicit controlled reconciliation fixture checks birth protection, near-but-not-contact rejection, exact contact merge and finish-line nonmerge; not a naturally occurring rejoin witness. Native calibrated raceIncidentIntegration can run alongside natural separation, with its own selection rules and max three incidents; acceptance checks candidate activity and terminal run, reports actual selected count (may be zero), not 043AS historical Phase10 application parity. Historical automatic incident compatibility with natural groups, combined equipment/consumable preparation, mixed-stage persistence, surface physics, original catalogue configuration and TypeScript checks remain pending. Hosted activation BLOCKED. No hosted connections or writes.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusNaturalTerrainSeparationAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043at-test.cjs"
node "%TEMP%\uranius-043at-test.cjs" --offline-only
del "%TEMP%\uranius-043at-test.cjs"
```

Expected PASS 4/4 natural terrain separation checks; no hosted connection.

## Owner acceptance — 2026-11-27
Owner pulled 58f0bab; esbuild bundle 414.1kb succeeded in 307ms. Native PASS 4/4: actual sustained natural mountain drops and independent physical finish gaps (transitions=1, weakDrops=6, independentTicks=121, naturalRejoins=0); birth protection, no near-gap teleportation, exact-contact merge and independent finish-line groups; calibrated native incident path coexists with terrain pressure (candidates=6822, selected=1, transitions=1); deterministic terrain replay, default catch preservation and authority guards. Temporary bundle deleted; no hosted connection. Scoped 043AT accepted; cumulative 224/224 distinct native acceptance groups. Zero spontaneous natural rejoins observed; exact-contact merge verified by controlled boundary fixture only. Native incident path is not the recovered 043AS historical Phase10 adapter. Extreme synthetic climbing contrast, tick-boundary catch approximation and disabled dropped-wave consolidation remain deliberate review choices. Combined historical incidents with natural separation, preparation integration, mixed-terrain tours, actual surface physics, catalogue configuration and TypeScript checks remain pending. Hosted activation BLOCKED.
