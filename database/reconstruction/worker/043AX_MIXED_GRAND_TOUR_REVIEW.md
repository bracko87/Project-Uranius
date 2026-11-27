# 043AX — full mixed-terrain Grand Tour endurance (offline only)

043AW owner native 4/4 accepted; cumulative 236/236 distinct native groups. f20b4f1 and 0a6a908 add native test-only 21-stage mixed endurance acceptance. No runtime changes, no production activation; native execution pending.

The first seven stages are retained verbatim from accepted 043AW, including their seeds, readiness, requests and dates. Fourteen additional synthetic short flat/hilly/mountain stages use the same original roster, existing mixed dispatch and prior receipt chain. 21 stages, 790km, 8 flat / 6 hilly / 7 mountain, two rest days (before stages 3 and 15), 23 calendar days. Short synthetic route and extreme climbing contrast deliberately test lifecycle continuity, not realistic Grand Tour distance calibration. Later stages use the existing dry context. No new policy or engine behavior introduced.

Acceptance requires terminal physical completion on all stages, genuine natural separation beyond the opening seven, physical contact witnesses when present, 528 dated rider-night calculations (24 original roster x 22 elapsed nights), first-stage 8 OTL and permanent exclusion from subsequent physical/GC fields, exact cumulative sporting GC, distinct incident IDs, corrected energy and fatigue continuity, component mileage-based wear, shared asset debit once, partial/exhausted consumables, clothing history, and cumulative ledger conservation for quantity, durable uses and condition. Exhausted consumables and assets must remain unchanged for the remaining stages. Seven-stage standalone prefix must match the full schedule's first seven physical and sporting results, rider and resource rows, GC and observation digests; schedule-bound receipt hashes are intentionally not compared across different schedules. Full 21-stage replay must match final receipt, GC and all observation digests. Digest and authority guards retained. No guarantee of particular late incident counts or final GC count until executed.

Physical weather movement/energy, cobbled surfaces, time trial integration, natural-group teammate assistance, original catalogue and jersey rules, health writer compatibility, TypeScript checks and official activation remain pending. Hosted activation BLOCKED. No hosted connections or writes.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusMixedGrandTourAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ax-test.cjs"
node "%TEMP%\uranius-043ax-test.cjs" --offline-only
del "%TEMP%\uranius-043ax-test.cjs"
```

Expected PASS 4/4 mixed Grand Tour checks; no hosted connection.
