# 043AM — individual equipment mileage wear (offline only)

043AL native 4/4 accepted; cumulative 192/192 distinct native acceptance groups. 1c7ade5 implements individual wear projection, 5564682 binds it to the tour resource ledger, d4dcb1f/58b52d2 add acceptance. Enable only with explicit packet.individualEquipmentWear=true and complete 043AJ mechanical binding. Default team-level wear path remains unchanged when the option is omitted.

Historical Phase9 equipment wear formula (archived original source blob 606e698eebe12f935b6e28923e41ea7389315fe8, phase9ResourceUpdates; accepted originalPhase9ResourceReview): conditionUsed = round6(min(openingCondition, distanceKm/100 * configuredWear)), conditionAfter = round6(max(0, openingCondition-conditionUsed)). Adaptation changes the distance input to the actual terminal physical rider distance, not the wear rate. Finished and OTL use full physical stage distance, DNF uses terminal distance at withdrawal, DNS and unassigned components use zero wear. For zero distance the opening resource is preserved exactly, with null historical effect because original review expects positive distance. Requires six unique same-team component assignments, condition-only equipment rows (no stock or durable-use counters), complete terminal physical classification and full sporting roster. No inferred replacement or repair, no direct crash damage multiplier or non-race training wear. Rest days have no stage receipt and no equipment consumption; team support assets and supplies retain their prior accounting path. The component-specific wear receipt is embedded in the stage receipt with opening ledger digest, mileage digest and physical classification hash. Resource state is carried to next stage and the old team-level debit is bypassed for equipment; duplicate run IDs rejected by existing tour guard. Pure replay is deterministic, not a live transactional idempotency mechanism.

Native acceptance: accepted three-stage mechanical fixture, including actual OTL and subsequent DNS, one rest day, unused spare equipment, all six components. Controlled genuine physical DNF uses accepted 043AD-style batch and terminal state in a 3 km stage; not an automatically selected DNF witness. Compare with historical wear formula and full-distance debit, verify ledger chain, next-stage weakest condition, unchanged support resources, neutral first-stage physical classification, tamper rejection and deterministic replay. Native execution and TypeScript checking not performed during development. Original catalogue wear rates, equipment bonus condition-scaling derivation, automatic injury healing, broader terrain/tactics and production persistence remain outside scope. Hosted activation BLOCKED.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusIndividualEquipmentWearAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043am-test.cjs"
node "%TEMP%\uranius-043am-test.cjs" --offline-only
del "%TEMP%\uranius-043am-test.cjs"
```

Expected PASS 4/4 individual equipment wear checks; no hosted connection.
