# 043AQ — combined preparation lifecycle (offline only)

043AP owner native 4/4 accepted; cumulative 208/208 distinct native acceptance groups. eb67814 adds `tests/uraniusCombinedPreparationAcceptance.ts`. No runtime implementation changes: this is a new integrated regression of existing opt-in review paths 043AJ–043AP. Native execution and TypeScript checking pending.

The accepted 043AI 21-stage schedule (850 km; 200/90/20 km first three stages, remaining flat short stages, two rest days) is reused. Original 24-rider/two-team synthetic roster and first-stage fixed speed retained. First-stage equipment percentage and consumable requests neutral; subsequent stages use explicit synthetic +5% equipment suitability. Individual six-component condition, mileage wear, mechanical condition effects, archived consumable fallback, van/workshop wear protection and weather clothing are enabled simultaneously. Each consumable has 24 units; 16 requested on stages 2–4 (full, partial, exhausted); other stages request none. Both support assets have two remaining uses; stage 2/3 use them, stage 4 requests exhausted stock. Van is deliberately referenced by mechanical and wear-protection bindings; the resource ledger must debit it once, not twice. One rain jacket has one use left, assigned to a starter on stage 1; spare untouched. First three stages wet/cold; later stages dry/mild; illness candidates use synthetic hash witnesses and never mutate availability. No automatic clothing assignment or live inventory.

Four acceptance groups: (1) 21 completed physical stages with terminal receipt; (2) actual speed capability, physical tick and fractional finish energy, post-stage fatigue, mechanical candidates, mileage wear, clothing history and candidate evidence; (3) exact ledger chain, one shared-vehicle debit, partial/exhausted consumables, unused/DNS wear neutrality, permanent withdrawals and rest-day coverage; (4) matched 3-stage neutral equipment control, common-prefix invariance, deterministic 21-stage replay digest and authority guards. Test prints elapsed time and heap snapshot (not production SLA or peak memory). Expected all four pass only after owner native execution. No production changes, database connections or official classifications.

Remaining blockers: actual original catalogue effects, category weights, component wear rates, current road condition scaling, vehicle-level configuration, original clothing allocation and health writer contract, PostgreSQL hashtext parity, jersey penalty derivation, non-flat/tactical physical scope and TypeScript checks. All existing experimental adaptations and authority restrictions remain. Hosted activation BLOCKED.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusCombinedPreparationAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043aq-test.cjs"
node "%TEMP%\uranius-043aq-test.cjs" --offline-only
del "%TEMP%\uranius-043aq-test.cjs"
```

Expected PASS 4/4 combined preparation checks; no hosted connection.

## Owner acceptance — 2026-11-27
Owner pulled 5e4020b; esbuild bundle 392.8kb succeeded in 80ms. Native PASS 4/4: complete 21-stage combined physical tour (km=850, finalGC=16, elapsedMs=60906, heapMiB=76); interacting pace, energy, fatigue, mechanical, clothing and wear evidence (savedTicks=2683, paceRows=320, protectedComponents=96, mechanicalCandidates=215, incidents=12, illnessCandidates=13); one shared vehicle debit, consumable partial/exhausted stock, permanent withdrawals and 21-stage receipt continuity; matched combined pace response, prefix invariance, deterministic 21-stage replay and authority guards. Temporary bundle deleted; no hosted connection. Scoped 043AQ accepted; cumulative 212/212 distinct native acceptance groups. Runtime and heap snapshot are local observations, not production SLA or peak memory. Flat synthetic preparation fixture only; illness candidates do not create health cases. Actual catalogue configuration, health writer compatibility, jersey penalty derivation, PostgreSQL hashtext parity, broader terrain/tactical scope, TypeScript checks and production integration remain pending. Hosted activation BLOCKED.
