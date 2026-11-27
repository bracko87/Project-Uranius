# 043AL — equipment suitability and physical pace (offline only)

043AK owner native 4/4 accepted, cumulative 188/188. Historical source `src/universal-race-engine/runRaceEngine.ts` blob 606e698eebe12f935b6e28923e41ea7389315fe8, roadStageSkillWeights lines 6340–6395 and calculateRiderSuitabilityScores lines 6614–6670. Flat profile weights: sprint .30, flat .25, endurance .20, resistance .10, raceIQ .10, teamwork .05. Review maps stamina to endurance and raceIq to raceIQ. Historical equipment adjustment = weighted stage skill × explicitly normalized equipment percentage / 100, rounded to four decimals, percentage bounded [-20,20]. Original suitability score uses several other readiness channels; this slice does not reconstruct or add those channels again.

46fd1df adds digest-verified full roster equipment evidence bound to 043AJ six-component physical setups. Nonzero percentage with zero effective condition rejected; preexisting equipment or generic performance modifiers rejected to avoid double application. Individual normalized equipment percentages are explicit stage-specific synthetic inputs, not recovered component catalogue or original condition-scaling derivation. 2f8cf2d/80a4661/ff1966c/2237a39 add opt-in pace input to pure engine functions; e6167b7/f5d87f4 propagate it through repair/chase and physical finish; 5f01ec8/a2d4065 connect baseline and actual tour path; 5cf922e adds native test; af07ebf exposes optional pace contribution type. No changes to default numeric behavior or persistent attributes. Experimental bridge adds historical equipment adjustment points to the new engine's own weighted raw capability, clamps to 0–100 before existing fatigue multiplier, averages active group capability and uses existing configured speed range. This is an adaptation, not historical speed formula parity; it is not a direct percentage of km/h, and no separate Phase9 speed multiplier is applied. Group members move together. Existing repair/chase policy and finish interpolation retained. Flat no-command physical tour only. Individual mileage wear and original catalogue/condition scaling remain pending; no official or hosted authority.

Acceptance: matched actual three-stage tours with same first two stages and dry 20km third stage, neutral vs +10% synthetic normalized equipment; verify DNS absence, exact historical score arithmetic, actual first tick distance, shorter baseline time. Controlled full physical finishes use -10%, neutral, +10% same roster/seed and starting conditions, compare times, speed cap and unchanged attributes. Digest and incomplete evidence rejection, deterministic replay, authority guards. Native execution and TypeScript checking pending.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusEquipmentPerformanceAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043al-test.cjs"
node "%TEMP%\uranius-043al-test.cjs" --offline-only
del "%TEMP%\uranius-043al-test.cjs"
```

Expected PASS 4/4 equipment performance checks; no hosted connection. Hosted activation BLOCKED.

## Owner acceptance — 2026-11-27
Owner pulled 22fb37b; esbuild bundle 359.4kb succeeded in 200ms. Native PASS 4/4: historical flat suitability adjustment, full equipment evidence and DNS exclusion; actual tour movement responds to equipment (openingKm=0.3255 -> 0.33809999999999996, baselineSeconds=1860 -> 1800); matched physical finishes, neutral parity, negative/positive capability and speed bounds (seconds=1921.888944544/1847.673352662/1778.964517126); deterministic replay, tamper rejection and authority guards. Temporary bundle deleted; no hosted connection. Scoped 043AL accepted; cumulative 192/192 distinct native acceptance groups. Experimental physical pace bridge uses explicit synthetic normalized equipment percentages, not recovered catalogue or condition-scaling derivation. Individual mileage wear, broader terrain and tactical verification, official sporting parity and TypeScript checking remain pending. Hosted activation BLOCKED.
