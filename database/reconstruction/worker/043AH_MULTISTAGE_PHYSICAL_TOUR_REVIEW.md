# 043AH — reusable physical tour lifecycle (offline only)

043AG owner native 4/4 accepted, cumulative 172/172 distinct groups. 61cbbc3 adds opt-in tour readiness with full roster and date-bound daily recovery chain; a8e3270 adds opt-in tour automatic incident prefix. cd6343c implements reusable tour loop; f93d71a adds native three-stage acceptance; e5538d1 rejects future-dated durable usage.

Scope: 3–21 distinct consecutive-in-order flat road stages, no live commands, 30-second ticks, stage dates 1–7 days apart, no cancellation or same-day stages. Each actual physical stage must reach fully applied pre-finish prefix, then all physical finishes. Explicit synthetic policy yields separate sporting rows. Full original roster preserved in receipts, prior DNF/OTL/DNS never starts again, original withdrawal stage/status retained, excluded riders gain no race workload. At least two starters required throughout. Carried health records retained; no inferred healing or injury-performance penalties. Existing post-stage fatigue formula consumes corrected terminal energy without double incident deduction; existing race-night arithmetic applied for each explicit calendar day, including rest days. Recovery receipts cover excluded riders too. Synthetic stage preparation is supplied explicitly and must remain compatible; resource stocks, wear and durable uses carry between stages using original Phase9 arithmetic. Resources for inactive teams remain unchanged; supplied requests must be zero for their consumption. Resource effects are not yet automatically bound to in-stage equipment modifiers. Stage-specific classification policy remains experimental. Cumulative GC uses integer sporting times, rank sum and rider ID; bonuses, penalties, points, team/youth classifications absent. Receipt chain includes schedule hash, prior digest and unique run IDs; compact review outputs rather than persistent engine state. No official authority, database writes or accounting.

Native acceptance: three actual physical stages (200/90/20 km), eight Stage 1 OTL exclusions inherited from 043AG fixture, two daily recovery receipts per rider before Stage 3 including a rest day, resource continuity, cumulative GC after every stage, deterministic replay, missing recovery rejection. 7/14/21-stage full native execution not yet verified. Native execution and TypeScript checking not performed during development.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusMultistagePhysicalTourAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ah-test.cjs"
node "%TEMP%\uranius-043ah-test.cjs" --offline-only
del "%TEMP%\uranius-043ah-test.cjs"
```

Expected PASS 4/4 multi-stage physical tour checks; no hosted connection. Hosted activation BLOCKED.
