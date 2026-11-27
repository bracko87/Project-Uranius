# 043AI — Grand Tour lifecycle endurance (offline only)

043AH owner native 4/4 accepted; cumulative 176/176 distinct acceptance groups. e13de28 adds tests/uraniusGrandTourEnduranceAcceptance.ts without changing the accepted engine or tour runner.

Test fixture preserves the accepted first three stages (200/90/20 km, wet, eight genuine Stage 1 OTL exclusions, a rest day before Stage 3). Extends to 7, 14 and 21 stages with distinct stage/run/seed identities, dry lower-risk 20/30/40 km flat road stages, no live commands, a second rest day before Stage 15. The long-tour fixture is intentionally abbreviated to stress lifecycle length, not realistic Grand Tour distance/terrain, tactical or physiological calibration. All stages execute actual physical simulation and automatic incident evaluation; Stage 2 requires real incident applications. No manually forced withdrawal or skipped stage. Any unsupported incident or engine failure is a test failure.

Acceptance groups: (1) complete all three lengths, report stage count, total km, GC finishers, incident count, wall-clock runtime and observed heap usage; (2) permanent withdrawal history, per-stage full roster coverage, date-bound daily recovery, fatigue arithmetic, injury history, no double deductions or incident replay, and independently accumulated GC; (3) resource arithmetic parity, exhaustion after five stages, shortage flags, no negative stock or reset; (4) stage/run digest chain, deterministic full 21-stage replay, common-prefix physical/sporting outcome invariance between lengths, tampered digest and repeated run rejection, disabled authority. Timings are diagnostics, not production SLA or peak memory claims. Existing resource arithmetic may continue equipment wear after durable stock exhaustion; no automatic resource-to-performance binding asserted.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusGrandTourEnduranceAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ai-test.cjs"
node "%TEMP%\uranius-043ai-test.cjs" --offline-only
del "%TEMP%\uranius-043ai-test.cjs"
```

Expected PASS 4/4 Grand Tour endurance checks; no hosted connection. Native runtime and TypeScript checking not performed during development. Full-distance mountain/cobbled/time-trial stages, live tactics, exact sporting policies, injury healing, equipment-performance binding and production publication remain outside this scope. Hosted activation BLOCKED.

## Owner acceptance — 2026-11-27
Owner pulled 4321958; esbuild bundle 343.7kb succeeded in 88ms. Native PASS 4/4: complete 7/14/21-stage physical endurance; permanent withdrawals, dated rest-day recovery, fatigue and cumulative classification at every stage; equipment and supply exhaustion, shortage receipts and no stock resurrection; deterministic 21-stage replay, cross-length prefix invariance and authority guards. Observed diagnostics: 7 stages 430km, final GC 16, incidents 9, elapsed 21075ms, heap 48MiB; 14 stages 650km, final GC 16, incidents 10, elapsed 24977ms, heap 386MiB; 21 stages 850km, final GC 16, incidents 12, elapsed 42197ms, heap 44MiB. Heap snapshots are not peak measurements; timings are local synthetic fixture diagnostics, not production SLA. Temporary bundle deleted; no hosted connection. Scoped 043AI accepted; cumulative 180/180 distinct native acceptance groups. Full-distance and varied-terrain races, equipment-to-performance binding, injury healing, live commands and official sporting parity remain pending. Hosted activation BLOCKED.
