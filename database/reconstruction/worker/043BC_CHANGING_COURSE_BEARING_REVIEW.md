# 043BC — changing course bearings (offline synthetic review)

043BB owner native 4/4 accepted; cumulative 256/256 distinct native groups. 043BC implementation commits a2ca395..9a1d9a8, including native test 6304fd9. Owner native execution accepted 4/4 on Windows at e92c940; cumulative 260/260 distinct native groups. TypeScript verification pending. No hosted connection or write.

Optional weather.courseBearingSegments is an ordered contiguous array of {fromKm,toKm,courseBearingDegrees}, 1–512 entries, finite increasing distances covering exactly 0..stageDistanceKm, bearing [0,360), first bearing matching directionalWind.courseBearingDegrees. Requires synthetic source and existing directional wind header; header is opening bearing only in segmented mode. No geographic inference. At an internal boundary the following segment applies, at the finish the final segment applies. The 043BB coefficients are unchanged. The local sample is each physical group's tick-start position, held for the 30-second tick (not exact sub-tick corner integration). Flat and calibrated terrain speed use that local factor; existing speed caps remain. Repair uses local factor; flat chase retains the accepted target-based rule when local speed factors match and uses own pace plus bounded local pursuit increment when target exposure differs. Stationary repair remains stationary. No new crosswind separation or echelon algorithm.

Native energy records experimentalWeatherStartKm from actual movement proposal; recomputes local weather energy from frozen snapshot, multiplies uncapped gross*efficiency*local weather*supply once and caps once. Terminal fractional workload verifies local weather witness rather than opening factor. Temperature and precipitation are stage-wide, wind fatigue identity; existing fatigue and stock rules remain. Stage-level context historicalRiskMultiplier is maximum capped local risk envelope (<=2.5), not an extra factor. Historical feedback measures each active group's current checkpoint position, supplies local capped risk and candidate probabilities use it instead of stage factor. Thus movement/energy sample tick start; incident eligibility samples current checkpoint position. Tour reports retain per-tick factor and start distance. Opening effects/energy fields remain for compatibility; segmentEffects contains full local factors. Segmented neutral iff all segment effects are neutral. Nondirectional/constant-bearing inputs omit new witness fields and retain prior behavior.

Acceptance covers exact boundaries, invalid coverage, 20km four-bearing matched flat course, local conserved energy and fractional finish, one-segment/constant-bearing physical parity, controlled stationary repair with different simultaneous group exposures and terminal continuation, 120km prepared mountain course with severe weather and eight segments, local historical candidate risk, natural separation, recovery workload, deterministic replay and authority guards. Controlled group split is an incident consequence, not crosswind-induced formation. Owner native output: flatTicks=1248, tailTicks=288, winner=1554.349115451; simultaneousTicks=3; naturalTicks=10260, localFactors=3, candidates=149, naturalDrops=6. All four groups passed; no hosted connection. Remaining: exact corner time subdivision, real route bearings/weather sources, variable wind over time, echelon and crosswind separation, segmented full tour acceptance, wet descents, cobbles, TT, original catalogue/jersey rules, natural-group helper assistance, health writer, TypeScript, official activation. Hosted activation BLOCKED.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusChangingCourseBearingAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043bc-test.cjs"
node "%TEMP%\uranius-043bc-test.cjs" --offline-only
del "%TEMP%\uranius-043bc-test.cjs"
```

Expected PASS 4/4 changing course bearing checks; no hosted connection.
