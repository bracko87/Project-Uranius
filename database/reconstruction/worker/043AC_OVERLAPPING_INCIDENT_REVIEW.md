# 043AC — overlapping independent physical incidents (offline only)

043AB owner native 4/4 accepted; cumulative 152/152. efdb288 adds opt-in batch extension to accepted 043AB movement module while preserving default single-peloton admission. b696378 adds independent automatic bridge with per-group incident identity, prior active episode receipts and physical contact witnesses. e48bdc6 adds controlled and automatic acceptance.

Scope: one peloton source, flat no-command road stage, 30-second ticks, pre-finish. New incident batches may be admitted while earlier groups repair/chase; candidates and helpers must belong to current peloton, prior groups must be tracked, reserved riders cannot be reused until physical rejoin; per-rider historical cooldown still enforced by automatic evaluator. Every group moves once per tick, DNF remains inactive, earlier group identities retained. Distinct episodes do not merge with one another, only their own helper or peloton. Same historical global 120s incident selection cooldown; not simultaneous selection in same tick. Provisional 043Z motion calibration unchanged. Empty peloton, nonseparating events and pre-finish boundary remain explicit stops. No full-stage classification, tactical interaction, health writes or production authority.

Native execution/type checking not performed during development. Automatic witness search is bounded to 48 deterministic seeds, and fails if overlap is not witnessed. Controlled tests require prior state preservation, active helper reservation, independent out-of-order rejoin and DNF. Automatic tests require overlapping live episodes, exact incident identities, candidate exclusion, deterministic replay and authority guards.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusOverlappingIncidentAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ac-test.cjs"
node "%TEMP%\uranius-043ac-test.cjs" --offline-only
del "%TEMP%\uranius-043ac-test.cjs"
```

Expected PASS 4/4 overlapping incident checks; no hosted connection. Next full-stage physical finish and classification review after native acceptance. Hosted activation BLOCKED.
