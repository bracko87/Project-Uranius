# 043AS — automatic terrain incidents (offline only)

043AR owner native 4/4 accepted; cumulative 216/216 distinct native groups. d681a7e adds explicit measured-terrain eligibility evaluator; 3491f55/e544d76 forward 043AR local gradient mode to physical ticks and baseline; 036016b/2c95c08 use local terrain chase and helper motion through terminal finish; 333a5ae binds automatic observations to actual checkpoint groups; c05eac0/afb45b2/3f30811 add native acceptance. Native execution and TypeScript checks pending.

Opt-in terrainCapability=true, hilly/mountain context must agree with computed elevation category, ordered profile covers whole stage, flatSprint false, road no-command and 30s ticks. Existing omitted/false flat path unchanged. Checkpoint speed is physical group's stored speed from previous tick, gradient sampled at that group's current position; movement proposals separately retain gradient at start of tick. All candidate probability inputs use those measured values, not average-stage speed plus inferred descent bonus. Original historical Phase10 caps, cooldowns, eligibility, weather and equipment factors retained; original fatigue reference still derived from energy expenditure, not independently calibrated terrain fatigue. Explicit baseline retains existing synthetic evidence grid, measured callback may continue past baseline until prefinish boundary within 1440 ticks; fail closed if horizon or unsupported incident stops encountered. Only peloton candidates eligible, separated riders excluded until real rejoin; no terrain-induced split groups admitted.

Terrain chase policy is an isolated adaptation: own terrain-adjusted speed + 8 km/h times local terrain multiplier, bounded by configured maximum and physical contact, instead of target speed +8. Helper during repair uses 25% of own terrain-adjusted speed; affected stationary until repair deadline; pickup and rejoin require exact physical contact. After target finishes, affected group continues at own pace; no rejoin to finished target. No production tactical equivalence or actual road repair calibration claimed. Existing flat policy unchanged. Automatic prefix and standalone finish review supported; multi-stage nonflat tour wiring remains pending. Incident selection through prefinish boundary only, physical repair/chase continue to terminal finish; no fresh selection in terminal continuation.

Acceptance: two 200km alternating ascent/descent routes, +3%/-3% hilly and +8%/-8% mountain, 24 riders, fixed seed 043Y-engine-4, wet context, six component setups with tire condition74, selected mechanical support .95 risk/.9 time, synthetic +5% equipment, nutrition stock. Verifies actual selected checkpoint speed and gradient, descent risk, equipment and support factors, physical application, stationary repair and local chase motion, terminal classifications and energy audit; controlled 20km mountain repair checks 60s wait, physical helper pickup and rejoin, no teleportation and full finish; exact replay, absent/false flat parity, mismatch and authority guards. Tests require actual selected descent candidates and incidents; no fabricated selection, and no claim they pass before native execution. Further blockers: automatic terrain separation, mixed tour, actual cobbles and time trials, actual original catalogue and jersey rules, illness writer, TS checking and official activation. No hosted connection or writes.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusAutomaticTerrainIncidentsAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043as-test.cjs"
node "%TEMP%\uranius-043as-test.cjs" --offline-only
del "%TEMP%\uranius-043as-test.cjs"
```

Expected PASS 4/4 automatic terrain incident checks; no hosted connection.
