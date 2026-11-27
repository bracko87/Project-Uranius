# 043AE — sporting classification and fractional energy projection (offline only)

043AD owner native 4/4 accepted; cumulative 160/160. 367b50a adds separate sporting projection over accepted physical finish results; 23c0b94, 77ee93e and 2527ad4 add controlled and automatic acceptance. Existing movement, finish and accepted outputs unchanged.

Historical cumulative classification adapter requires integer elapsed times, but exact historical stage-specific group gaps, sprint-zone adjustments and OTL policy are not yet pinned for this new path. The review requires an explicit frozen synthetic policy and incident evidence; no claimed official rule parity. Policy: adjacent crossing gap >= configured threshold starts a new group; group start time floored to seconds. Eligible crash/technical incident inside explicitly enabled flat finish zone can receive earliest grouped time of an unaffected finishing member of the source group. No reference, outside-zone, exhaustion, disabled zone and DNF do not receive protection. Sporting OTL computed after adjustments against floored winner time plus configured percent, equality allowed; OTL rows unranked with null sporting elapsed/gap, physical result preserved. Classified ranks retain physical order, contiguous after OTL exclusion. These choices are experimental and require owner/source confirmation before official use.

Fractional crossing energy is a read-only correction derived from uncapped neutral canonical energy formula (duration-linear), capped by available energy; alternate weather/shelter/puller/absolute-speed energy modes refused. Actual physical state, sprint tie-break order and prior energy records unchanged. Does not yet integrate corrected energy into finish ranking, fatigue or carryover. Synthetic incident evidence is digest-bound, not authenticated source proof. No database writes, accounting or publication.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusSportingClassificationAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ae-test.cjs"
node "%TEMP%\uranius-043ae-test.cjs" --offline-only
del "%TEMP%\uranius-043ae-test.cjs"
```

Expected PASS 4/4 sporting classification checks; no hosted connection. Native execution and TypeScript type checking not performed in development. Next verify pinned sporting rules and integrate fractional energy into isolated engine state only after acceptance. Hosted activation BLOCKED.
