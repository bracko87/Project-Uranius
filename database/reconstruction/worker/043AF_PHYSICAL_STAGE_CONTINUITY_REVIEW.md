# 043AF — physical stage continuity (offline only)

043AE owner native 4/4 accepted; cumulative 164/164. 166da01 connects automatic physical finish, synthetic sporting policy, corrected terminal rider energy, actual incident handoffs, pinned original fatigue arithmetic, existing 043C resource/carryover receipts and 043N frozen readiness. 5e7a49d requires explicit next-stage preparation rows. 10304c9 and 44fe967 add native acceptance.

Scope: consecutive two-stage synthetic tour, first stage uses accepted flat/no-command automatic physical prefix and finish continuation. Corrected energy is applied to a separate terminal state copy, validated; 043AD physical ranks and earlier event/tick evidence unchanged. Fatigue uses corrected energy and actual applied incident IDs/kinds, with incidentEnergyLoss=0 because deductions already occurred physically. No point costs or breakaway debt in this scoped engine; no additional injury performance penalty, sprint tie-break recalculation or sporting policy parity claimed. Existing original fatigue formula supplies stage load, status load, incident load and persisted rounded fatigue. Original daily recovery rule consumes explicit per-rider activity/doctor/travel inputs, one night only. Health outcomes are preserved from selected historical handoffs; review-only availability mapping is injured if selection blocked, not_fully_fit for other injury, otherwise prior availability. DNF/OTL cannot start next stage. No invented healing duration. Next preparation explicitly supplied and resource snapshot explicitly synthetic. Readiness covers full roster including excluded riders; no second-stage race simulation yet because legacy binder refuses non-fit/nonstarter rosters. No health case, fatigue, accounting or hosted writes.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusPhysicalStageContinuityAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043af-test.cjs"
node "%TEMP%\uranius-043af-test.cjs" --offline-only
del "%TEMP%\uranius-043af-test.cjs"
```

Expected PASS 4/4 physical stage continuity checks; no hosted connection. Long-wet seed 4 requires six actual admitted incidents, correct terminal state, no duplicate deduction, fatigue/status parity, overnight recovery, health handoff and digest-bound next readiness. Shorter seed 4 requires positive fractional correction. Deterministic replay and tamper guards required. Native runtime/type checking not performed during development. Historical sporting policy parity and actual next-stage mixed-roster execution remain pending. Hosted activation BLOCKED.
