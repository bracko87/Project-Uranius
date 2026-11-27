# 043AU — historical incidents with natural terrain separation (offline only)

043AT owner native 4/4 accepted; cumulative 224/224 distinct groups. 8ee9326 protects externally tracked repair groups from native proximity reconciliation; c4f5d6f adds an explicit single-tick motion hook ahead of movement/energy; 617bf7e adds the combined isolated historical adapter; e272b52 adds native acceptance. Native execution and TypeScript checking pending.

Uses accepted 043AT calibrated movement, pressure and 120-second natural drop threshold, physical dropped catch, disabled wave consolidation, sub-tick finish; no native incident sampler active. Historical 043Q/AS measured eligibility considers all actual racing groups, including natural drops, excluding tracked repair/chase riders until actual contact. Candidate speed from physical checkpoint and gradient at each group's current position. Historical phase caps, cooldown, deterministic hashes, handoffs and energy loss retained. Explicit synthetic weather is incident-risk context only, not movement weather. Historical selection ends at prefinish boundary; already selected consequences are applied and all active groups continue physically to terminal states. Global leader progress remains the historical eligibility coordinate; actual contact distance is separately recorded. No fresh incidents selected during terminal continuation.

Each affected rider leaves their actual source group at its current position; surviving rider receives tracked dropped repair group, stationary for historical time loss rounded up to a 30-second tick. DNF permanently withdrawn. Chase uses own calibrated local speed +8 km/h times local terrain multiplier, bounded by speed limit and original source target contact. No helper in this slice. Original source target retained if surviving members remain; if naturally reabsorbed, target retargets to peloton; absent/inactive target means own pace to finish. Externally tracked repair groups excluded from native catch and reclassification. Merging requires actual contact before finish, no finish-line merges. Natural groups continue native pressure, movement and finish calculations. No retroactive time penalty, no health writes, no official result. This is an isolated experimental combination, not production-equivalent historical movement. Native incident paths and external motion cannot coexist.

Acceptance runs two fixed-seed 120km mountain stress scenarios, 24 riders with extreme climbing contrast inherited from 043AT, rain incident context, plus controlled dropped-group repair admission. Requires genuine sustained natural separation, historical candidate activity on natural dropped groups, measured group speed/gradient, deterministic selected consequences, repair motion and terminal classification. Actual selected dropped-group incident/contact counts are reported, not guaranteed; controlled case separately verifies original dropped target, stationary repair and duplicate admission rejection. Replays first seed exactly and checks scope/digest guards. No native execution performed yet. Combined preparation resources, helper assistance with natural groups, original equipment catalogue, actual weather movement parity, mixed-stage persistence, cobbled physics and TypeScript checking remain pending. Hosted activation BLOCKED.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusHistoricalNaturalTerrainAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043au-test.cjs"
node "%TEMP%\uranius-043au-test.cjs" --offline-only
del "%TEMP%\uranius-043au-test.cjs"
```

Expected PASS 4/4 historical natural terrain checks; no hosted connection.
