# 043BA — weather-enabled mixed Grand Tour endurance (offline only)

043AZ owner native 4/4 accepted; cumulative 248/248 distinct native groups. fdb495d adds test-only 21-stage weather endurance acceptance, based on the exact accepted 043AZ opening seven stages and 043AX terrain schedule. No runtime changes or hosted activation. Native execution and TypeScript verification pending.

21 stages, 850km, 8 flat / 6 hilly / 7 mountain, 24 initial riders, two rest days before stages 3 and 15, 23 calendar days. Opening 200km stage retains historical risk-only reference and known 8 OTL exclusions. All other 20 stages use explicit synthetic physical weather, including three neutral stages (7,15,21) and 17 nonneutral stages. Weather includes drizzle, rain, heavy rain, cold, heat and nondirectional strong wind, with repeated adverse exposure in later stages. Shortened synthetic routes and extreme attribute contrast test lifecycle and combined effects, not real-world Grand Tour calibration. No new coefficients or policy.

Acceptance requires 21 completed stages, weather evidence and energy conservation on actual ticks including all terrain categories beyond stage 7, natural separation after stage 7, weather fatigue observations after stage 7, measured historical risk and fractional finishing energy, 528 dated recovery calculations, permanent withdrawals and exact cumulative GC. Stock/asset exhaustion and equipment mileage wear must persist; aggregate quantity, durable use and condition deltas reconcile across all 21 stages. Weather exposure history remains cumulative, unique per stage/rider and includes stage 20; illness candidate flags remain nonauthoritative. Full repeat must reproduce final receipt and observations. Separate seven-stage run must match the full tour opening physical/sporting results, riders, resource balances, GC, clothing exposure and observation digests. Schedule-bound receipt hashes intentionally differ across schedules. Neutral markers checked, exact omitted-marker parity already native accepted by 043AZ. Digest, weather mismatch and authority guards remain. No assertion of final GC size or late incident counts before execution.

Remaining: directional wind/crosswind and specific wet-descent physics, cobbles, time trials, natural-group teammate assistance, actual catalogue/jersey rules, health writer, TypeScript checks, official activation. No hosted connection or write. Hosted activation BLOCKED.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusWeatherGrandTourAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ba-test.cjs"
node "%TEMP%\uranius-043ba-test.cjs" --offline-only
del "%TEMP%\uranius-043ba-test.cjs"
```

Expected PASS 4/4 weather-enabled Grand Tour checks; no hosted connection.
