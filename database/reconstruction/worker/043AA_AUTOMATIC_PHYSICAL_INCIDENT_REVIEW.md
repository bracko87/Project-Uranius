# 043AA — automatic physical incident feedback (offline review)

043Z owner native 3/3 accepted; cumulative 145/145. 9931b51 adds explicit opt-in measured progress and bounded stop to the historical eligibility evaluator; standard 043Q/U/W/X paths remain unchanged. 2598a7b bridges 043N frozen readiness, 043Q/P automatic candidate selection, 043R consequence receipts and 043Z physical motion; deac5ce adds native acceptance harness.

Scope: flat no-command road stage, 30s ticks, actual base simulation supplies fixed time horizon and historical reference average speed. Every evaluated checkpoint receives actual evolving state, current energy, measured road progress, active group membership and contact-derived rejoin witness. Apply selected consequence at the next tick start, deduct initial energy once, round repair duration up to 30 seconds, choose at most one same-team explicit-protection helper using current peloton membership (provisional bounded policy), exclude detached riders, preserve historical cooldowns. DNF path exists but automatic DNF acceptance is not asserted by this harness. Multi-rider events, overlapping active episodes, nonseparating incidents and finish boundary explicitly stop; no official classification. Chase and waiting calibrations remain provisional. Historical selection speed remains reference-based, not instantaneous measured speed. No authoritative source or hosted activation.

Native test requires actual automatic selection, verified consequence, physical separation and rejoin, later selected checkpoint using measured progress and energy, deterministic result, digest and authority guards. Bounded seed search may fail if witness absent. Native execution and type checking not performed in development.

Owner Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusAutomaticPhysicalIncidentAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043aa-test.cjs"
node "%TEMP%\uranius-043aa-test.cjs" --offline-only
del "%TEMP%\uranius-043aa-test.cjs"
```

Expected PASS 3/3 automatic physical incident checks; no hosted connection. Next: extend simultaneous/group incident support and integrate finish/withdrawal classification only after native acceptance. Hosted activation BLOCKED.
