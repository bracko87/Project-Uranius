# 043AY — prepared physical weather (isolated hilly/mountain review)

043AX owner native 4/4 accepted; cumulative 240/240 distinct groups. 50e498d adds explicit synthetic canonical weather resolver and uncapped combined energy; ead57de enables existing calibrated weather movement with physical repair/chase; a562613 binds fractional workload and post-stage fatigue; 42ef1bc/ab588a7 add native tests. Native execution and TypeScript checks pending.

Explicit physicalWeather only, raw input remains weather-free for the baseline grid. Validated synthetic normalized stage weather snapshot with explicit bounded temperature, wind speed and precipitation, aligned historical condition and clothing temperature. Canonical existing weatherPerformanceEffects supplies speed, energy/stamina, fatigue and incident coefficients. Nonneutral mode attaches weather to the actual physical state and enables existing calibrated movement weather scaling; pursuit speed increment receives same speed factor once. Neutral mode leaves physical state unchanged. The historical risk input must equal canonical risk capped at 2.5 (historical scope); do not multiply a second weather factor into historical risk. Existing wet-road gates and measured speed/gradient remain. This is an experimental cross-engine adaptation, not original production weather parity.

Combined energy debit = min(opening energy, uncapped gross * efficiency * max(weather energy, weather stamina) * resolved road supply multiplier). Do not scale already capped weather debit. Existing native runtime weather fatigue metadata retained for diagnostics only; no extra addition to historical fatigue proxy or terminal workload. Fractional finish workload uses same uncapped product times crossing fraction. Post-stage fatigue multiplier is supply times canonical weather fatigue, clamped to recovered .75–1.35 workload contract; original recovery bonus once. Incident losses already physically applied, no double debit. Existing resource and clothing allocation unchanged; no new stock deductions. Dry path retains original physical observations and classifications. Explicit physical weather applied marker distinct from unverified production weather parity.

Acceptance exercises dry/no-flag parity, rain on 40km mountain, heavy rain/cold/strong wind on accepted 120km route, heat on 20km hilly route, measured opening speed, actual energy/supply and runtime fatigue witnesses, descending movement, controlled exhaustion cap, historical risk, fractional finish and fatigue/stock accounting, deterministic severe replay, mismatched and out-of-range weather guards. No claim of directional wind, special wet descent coefficients, crosswind splits, hydration effects beyond existing supply model, or full mixed-tour/flat physical weather integration. Existing weather schema has no direction. Baseline remains unprepared/weather-free; actual checkpoint feedback authoritative only within synthetic review. Flat and mixed-tour physical weather, cobbles, TT, original catalogue/jersey rules, helper assistance in natural groups, health writer, TypeScript checks and official activation remain pending. No hosted connection or write.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusPreparedPhysicalWeatherAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ay-test.cjs"
node "%TEMP%\uranius-043ay-test.cjs" --offline-only
del "%TEMP%\uranius-043ay-test.cjs"
```

Expected PASS 4/4 prepared physical weather checks; no hosted connection.
