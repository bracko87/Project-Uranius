# 043AV — combined preparation with natural separation (offline only)

043AU owner native 4/4 accepted; cumulative 228/228 distinct groups. 91fa43d/90ec65c/5b88a05 add opt-in equipment base pace and pressure adjustment, and energy hook before pressure. d7f0804 binds existing resource resolvers to the historical/natural terrain runner. e8693e2 creates one terminal preparation receipt; d784955 records requested versus allocated resource use. 5cd41cb/de86410 add native acceptance. No production activation.

Uses 043AU calibrated movement and natural drops, historical measured incident selection, actual repair/chase motion, and physical catch. Explicit equipment percentage is resolved via recovered stage skill weights. Equipment delta enters calibrated base pace once (existing terrain ratio unchanged) and individual holding pressure once (delta times current fatigue multiplier, then clamp and shelter); raw rider attributes unchanged. This is an isolated adaptation, not verified original movement calibration. Supplies use archived partial-stock fallback; road energy multiplier is applied to neutral gross times efficiency before cap, before pressure evaluation; no duplicate incident debit. Existing unprepared path remains default. Incident risk and repair duration use resolved physical component condition and available support. No physical weather marker, shelter energy, or absolute effort stacking: existing supply energy adapter rejects those. Weather context applies to historical risk and clothing exposure only.

Frozen shared opening resource ledger validated; mileage wear uses actual physical distance with optional van/workshop protection. Shared van support and wear protection consumes one durable use. Debit allocated usable quantities only; retain requested/allocated/shortfall evidence. Unallocated resources unchanged. Jacket allocations bound before race, exposure only after physical finish, prior exposure history explicit synthetic, illness candidate evidence only; no illness creation or availability change. Terminal receipt uses physical crossing fraction for corrected workload energy, retains full-tick energy as witness, uses original fatigue/recovery arithmetic; incident energy loss already deducted physically and not repeated. No official resource or fatigue writes. Full-tick calibrated physical terminal energy is unchanged; corrected energy used for receipt only. Baseline grid still unprepared, measured physical callback supplies actual checkpoint values. No multistage persistence yet.

Native test uses accepted 120km extreme mountain route, 24 riders, +5% synthetic equipment, tire condition 74, one team van/workshop, partial stocks 8 of 16 requested each, one jacket use, synthetic prior exposure. Tests actual prepared pace and pressure, energy, natural drops, mechanical risk, shared asset debit, clothing, mileage wear, fractional workload and deterministic replay, mismatch guards. Native execution and TypeScript checks pending. Remaining blockers: mixed-terrain multistage integration, actual weather movement with preparation, teammate helper path, DNF-specific combined regression, cobbled surface, TT, original catalogue/jersey rules, health writer and official activation. Hosted activation BLOCKED; no hosted connection.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusPreparedNaturalTerrainAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043av-test.cjs"
node "%TEMP%\uranius-043av-test.cjs" --offline-only
del "%TEMP%\uranius-043av-test.cjs"
```

Expected PASS 4/4 prepared natural terrain checks; no hosted connection.
