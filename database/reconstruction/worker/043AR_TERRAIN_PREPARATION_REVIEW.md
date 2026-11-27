# 043AR — controlled terrain preparation (offline only)

043AQ owner native 4/4 accepted; cumulative 212/212 distinct groups. fc4e243 recovers hilly, mountain and cobbled suitability from original `src/universal-race-engine/runRaceEngine.ts` blob 606e698eebe12f935b6e28923e41ea7389315fe8 lines 6340–6390. 3707ad9/f0e615d/bc5b4fa/fd873c9 opt in to existing diagnostic local gradient capability for controlled physical completion; 7591334 adds controlled terrain review, 7f0788f adds native acceptance. No production activation.

Stage-specific historical suitability weights: flat sprint .30 flat .25 endurance .20 resistance .10 raceIQ .10 teamwork .05; hilly sprint .10 climbing .25 flat .20 endurance .20 resistance .15 raceIQ .10; mountain climbing .45 endurance .20 recovery .15 resistance .10 raceIQ .10; cobbled sprint .10 flat .30 endurance .20 resistance .25 raceIQ .15. New engine stamina maps to historical endurance. Explicit stage-profile evidence required; hilly/mountain match elevation category; cobbled label only accepted with flat elevation classification, does not establish physical surface. Existing absent-profile flat scope unchanged. Explicit synthetic normalized equipment percentages, not actual catalogue values.

Opt-in local gradient capability uses existing `riderTerrainCapability.ts` diagnostic interpolation (flat toward climb/descent weights, full at +/-8%), including its own zero-gradient weights throughout nonflat opted-in stages for continuity. Raw local capability replaces original base capability, explicit stage-level equipment adjustment added once, fatigue applied once; original gradient speed multiplier and bounds then applied. This is an isolated new-engine adaptation, not original road movement parity. Default movement path unchanged. Controlled finish runner requires no incident episodes, no commands, 30s ticks and full ordered profile. Uses actual gradient and speed from movement proposals with historical technical probability; frozen opening fatigue is a reference, not runtime fatigue parity. Does not select or apply terrain incidents; automatic incident tour remains flat-only. No cobblestone surface drag, group terrain separation, mixed-route surface tags or TT physics. Nutrition multiplier and individual mileage wear included in controlled completion; no hosted stock deduction, post-stage health writer or multi-stage terrain persistence.

Native acceptance: 24 riders split into climbing and flat-specialist attribute profiles, historical four road suitability matrices; local climb/descent capability and continuity; matched 20km hilly/mountain runs with -10/0/+10% equipment; physical movement, gradient energy and measured risk, mileage wear; cobbled suitability only, exact default flat physical parity; deterministic replay, invalid profile/format/digest and authority guards. Native execution and TypeScript checks pending. Original catalogue data, actual surface and automatic terrain incident modeling remain blocked/pending. No hosted connection.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusTerrainPreparationAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ar-test.cjs"
node "%TEMP%\uranius-043ar-test.cjs" --offline-only
del "%TEMP%\uranius-043ar-test.cjs"
```

Expected PASS 4/4 terrain preparation checks; no hosted connection.
