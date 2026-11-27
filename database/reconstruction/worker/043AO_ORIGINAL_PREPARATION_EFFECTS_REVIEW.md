# 043AO — archived clothing and equipment protection (offline only)

043AN native 4/4 accepted; cumulative 200/200 distinct accepted groups. a9c62d5 ports archived rain-jacket requirement and exposure score, workshop condition bands and snapshot protection arithmetic. 016d74b/50ab78d bind protection to 043AM actual mileage ledger; 9427371 adds native acceptance. 0daaea5 prepares metadata-only configuration discovery SQL, NOT executed. Sources: archived `reference/database/20260929183600_baseline_03_plpgsql_751_900.sql.txt` lines 1866–2100 (weather requirement and exposure); `20260929184719_baseline_04_sql_dump_361_416.sql.txt` lines 603–810 (snapshot caps and workshop condition); `20260929184654_baseline_04_sql_dump_241_360.sql.txt` lines 8740–8770 (combined intensity).

Rain jacket required if temperature below 15 C, rain chance >=40%, precipitation >=2mm or condition text contains rain/shower/storm/drizzle. Finished physical riders in required conditions have historical exposure scores 10 with jacket or 60 without. Score is not a probability, illness diagnosis or health penalty. Only standalone pure calculation tested, no durable jacket usage, actual health effect or in-race modifier integration. SQL requirement is distinct from engine-specific weather modifier. Workshop condition factors >=90:1, >=75:.95, >=60:.85, >=45:.70, >=30:.50, else 0. Snapshot wear protection takes max absolute relevant numeric effect capped 30% van, 50% workshop; combined intensity=(1-van/100)*(1-workshop/100). Effects are explicit standardized numeric synthetic snapshot values, not actual configured vehicle levels; do not reapply condition scaling. Opt-in availability requires same-team asset, active starter, requested single stage use, positive condition, unused date and remaining use; stage-use policy is review adaptation, not asserted original vehicle allocation. Each asset consumed once through existing ledger. No extra physical wear debit; intensity applied to configured wear rate before original wear arithmetic on actual mileage. Exhausted stock removes protection. No repair or condition increase. Default behavior unchanged. Test uses 200/90/20km tour, no protection stage 1, selected van/workshop stage 2, exhausted stage 3; verifies capped maximum 65% combined wear reduction, actual component receipts, ownership/duplicate/date/condition/digest guards and deterministic replay. Native execution and TypeScript checking pending.

Catalogue configuration blocker: no verified actual item effects, active category weights, allowed keys, vehicle level rules or current road performance scaling found in archive. Proposed metadata query is not permission to run any hosted SQL; separate explicit approval and verified original project identity required before metadata read; then separately review bounded explicit static configuration extraction. Jersey shortage wrapper is recovered but underlying current eligibility/penalty derivation not verified; jersey penalties remain pending, no invented rule. Jacket durable allocations, health roll and production effects remain pending. Hosted activation BLOCKED. No hosted connection or writes performed.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusOriginalPreparationEffectsAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ao-test.cjs"
node "%TEMP%\uranius-043ao-test.cjs" --offline-only
del "%TEMP%\uranius-043ao-test.cjs"
```

Expected PASS 4/4 original preparation effects checks; no hosted connection.
