# 043AK — resource-backed supply energy and fatigue (offline only)

043AJ native 4/4 accepted, cumulative 184/184. Recovered actual original source via Git blob 606e698eebe12f935b6e28923e41ea7389315fe8 (`src/universal-race-engine/runRaceEngine.ts` at main). Phase9 caps and summary near lines 5134–5142, 5510–5578, application near 5659–5687, road preparation multiplier in calculateRoadStepEnergyComponents. Original summary clamps energy to [.88,1.18], fatigue [.90,1.15], recovery [0,4]; road energy calculator further clamps preparation multiplier to [.90,1]. These exact formulas are retained for the explicit supply-only subset. No original per-item standardized bonus derivation established; synthetic values are not catalogue values. Base road cost model differs in new physical engine, so the recovered multiplier is applied to its neutral gross cost before exhaustion cap; no claim of complete historical energy parity. Existing incident loss is not scaled or deducted again. No speed adjustment or rain-jacket effects in this slice.

Commits aa86bfb, 6e38067, bce997d, 9d54089, f1a3683, 4bf0794, f65c1e8, ded17a2, 31210a8. Opt-in only. Stock-backed consumable evidence covers bidons, gels, nutrition packs; explicit standardized numeric input per resource; conservative all-or-none availability (exact selected quantity and sufficient stock) is a synthetic review choice, not recovered allocation policy. Multiple supply contributions sum once then historical caps apply. Missing or exhausted supplies supply neutral effects; partial consumption still follows accepted resource ledger, no invented partial bonus. Reject duplicate preexisting energy/fatigue modifiers, overlapping unsupported weather/shelter/effort modes and ambiguous resource evidence. Active prefix energy advances actual next tick state; incident repair/chase and sub-tick physical finish use same multiplier. Historical post-stage fatigue/recovery bonus uses corrected energy. Default paths without opt-in preserve behavior. Individual equipment mileage wear, speed/suitability integration, actual per-item benefit derivation and original allocation/shortage policy remain pending.

Acceptance fixture 200/90/20km, one rest day, explicitly synthetic nutrition pack stock 2. No use Stage 1, full selection Stage 2, exhausted Stage 3. Test values 8% energy savings, 5% fatigue reduction, 2 recovery points are not production settings. Verify available stock, actual positive tick savings and finish witness, historical fatigue formula, lower/upper caps, shortage neutrality, invalid evidence, deterministic replay and neutral first-stage parity. Native execution and TypeScript checking pending. No hosted or accounting authority.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusResourceEnergyAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ak-test.cjs"
node "%TEMP%\uranius-043ak-test.cjs" --offline-only
del "%TEMP%\uranius-043ak-test.cjs"
```

Expected PASS 4/4 resource energy checks; no hosted connection. Hosted activation BLOCKED.
