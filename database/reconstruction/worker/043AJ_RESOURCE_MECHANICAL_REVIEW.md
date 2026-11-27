# 043AJ — resource-backed mechanical effects (offline only)

043AI native 4/4 accepted, cumulative 180/180. d9837b5 resolves complete six-component setups against explicit carried resources; 4beea99 binds condition, mechanical risk and repair multiplier to the historical automatic incident path; daea976 binds opening stage resource ledger to the tour runner; 541c3dd adds native acceptance. Default 043AC/AG/AH paths without explicit mechanical evidence retain previous behavior.

Supported historical rules: minimum condition of frame/wheelset/tires/groupset/helmet/shoes from RiderEquipment.ts, historical condition probability bands 1.50/1.30/1.15/1.05/1.00 and historical technical time-loss multiplier from 043P/043R. Uses the already accepted historical probability implementation, not the newer engine's separately clamped combined probability rule. Explicit unique same-team physical components required; missing or reused component is rejected. Each team's mechanical support asset requires selected use, positive remaining uses and positive condition; exhausted or unselected support is neutral. Multipliers .95 and .90 in the test are explicitly synthetic normalized inputs, not recovered staff/asset benefit formulas. Existing resource arithmetic still governs stock, wear and shortages; stage-specific equipment assignments remain fixed and component wear still follows existing active-team model rather than per-rider wear. No hidden in-stage speed, energy, supply or fatigue multiplier is invented. Original large pinned engine source could not be retrieved through available connector; original resource-to-performance derivation and actual production support eligibility are not established. Energy/speed/supply performance integration remains pending. No official, hosted or accounting authority.

Native test uses accepted 200/90/20km tour. Tires start at 90.1%, wear crosses 90% boundary before Stage 2; compare actual selected checkpoint candidate evidence to ledger. One durable team support use requested Stage 2, exhausted Stage 3. Verify actual technical repair loss when a technical selection occurs, record observed count; actual supported repair witness not guaranteed. Verify missing/reused setup rejection, digest, deterministic replay and flags. Native execution and TypeScript checking pending.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusResourceMechanicalAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043aj-test.cjs"
node "%TEMP%\uranius-043aj-test.cjs" --offline-only
del "%TEMP%\uranius-043aj-test.cjs"
```

Expected PASS 4/4 resource mechanical checks; no hosted connection. Hosted activation BLOCKED.

## Owner acceptance — 2026-11-27
Owner pulled 19721bc; esbuild bundle 345.4kb succeeded in 473ms. Native PASS 4/4: six physical components and weakest-condition wear carried into actual stages; historical mechanical risk reaches actual candidates (167 candidates, 48 worn, 5 technical applications); support benefit enabled only with available use, exhausted stock removes benefit; deterministic resource-bound replay, invalid setup rejection and authority guards. Temporary bundle deleted; no hosted connection. Scoped 043AJ accepted; cumulative 184/184 distinct native acceptance groups. Technical repair calculations witnessed; exact count of supported versus unsupported repair applications not reported. Original speed/energy/nutrition derivation, per-rider mileage wear and production preparation eligibility remain pending. Hosted activation BLOCKED.
