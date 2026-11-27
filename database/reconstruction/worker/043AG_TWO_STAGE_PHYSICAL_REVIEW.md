# 043AG — actual two-stage physical simulation (offline only)

043AF owner native 4/4 accepted twice, cumulative 168/168 distinct native groups. a85bcef adds opt-in mixed-roster readiness binding; 1abb5c9 adds automatic incident evaluation using that binding while preserving default 043AC/AD path. e91710f connects two physical stages and cumulative time classification; 14a4e02 adds native acceptance.

Scope: two consecutive flat no-command road stages, 30-second ticks, synthetic policy. Stage 2 validates entire original roster and teams against Stage 1, binds digest-verified next readiness, includes only starters with fit/not_fully_fit status and supported preparation. Excluded riders remain explicit DNS rows outside physical state, never move, consume energy or become incident candidates. Empty teams omitted; if captain withdrew, lexically first remaining rider is deterministic review fallback, not a final team selection policy. Eligible not_fully_fit condition is carried unchanged; no new injury-performance penalty or healing duration inferred. Stage 2 uses updated starting energy and fatigue in actual engine and historical incident probability; new stage ID and seed isolate incident identity and timing, prior incident consequences not reapplied. Stage 2 must reach fully applied pre-finish prefix before physical continuation. GC includes only riders with finished sporting status in both stages, sum of integer sporting elapsed times, tie by rank sum then rider ID. No bonus/penalty/points, youth/team classifications or official rule parity asserted. Stage 2 terminal energy is still the physical full-tick state plus separate sporting correction projection; no Stage 2 fatigue/resource persistence or Stage 3 execution.

Native acceptance requires mixed starters/DNS witness, exact carried conditions and team mapping, actual Stage 2 automatic incidents and candidate fatigue arithmetic, no prior incident replay, full DNS coverage and cumulative rank/time parity, deterministic replay and digest/authority guards. Eligible not_fully_fit count logged; actual non-fit starter witness is not guaranteed by fixture. Native execution and TypeScript checking not performed during development.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusTwoStagePhysicalAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ag-test.cjs"
node "%TEMP%\uranius-043ag-test.cjs" --offline-only
del "%TEMP%\uranius-043ag-test.cjs"
```

Expected PASS 4/4 two-stage physical checks; no hosted connection. Hosted activation BLOCKED.
