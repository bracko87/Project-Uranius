# 043AB — multi-rider physical incident review (offline only)

043AA owner native 3/3 accepted; cumulative 148/148. 2aebcaa implements atomic batch separation, per-rider loss/repair/DNF and single-clock independent physical chase groups with reserved same-team helpers. f2260b3 adds a separate automatic bridge from selected historical group-crash consequences, preserving the accepted 043AA and 043Z paths. ac0c838 adds controlled and selected automatic acceptance checks.

Scope: 2–6 affected riders per group crash (single rider also supported), one selected incident batch at a time, single peloton source, flat no-command stage, 30s ticks, pre-finish. Affected riders cannot be helpers; helper assignments are unique. The historical group incident has shared severity/time loss; per-rider health outcome and energy loss remain individually calculated, and DNF is terminal. Distinct repair durations are supported and tested by controlled fixtures, not invented for selected historical group crashes. Physical contact merges each affected group into peloton; detached groups do not otherwise merge with each other. Chase and waiting calibration inherited from 043Z. Automatic bridge stops on overlapping independent incidents, nonseparating incidents, empty peloton or pre-finish boundary. No official classification, health persistence or production authority. Native execution/type checking not performed in development.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusMultiRiderIncidentAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ab-test.cjs"
node "%TEMP%\uranius-043ab-test.cjs" --offline-only
del "%TEMP%\uranius-043ab-test.cjs"
```

Expected PASS 4/4 multi-rider incident checks; no hosted connection. Acceptance requires controlled mixed recovery/DNF, deterministic recovery, a naturally selected applied group crash using physical state and later candidate exclusion, and deterministic automatic replay/authority guards. Full-stage classification and overlapping independent incidents remain pending. Hosted activation BLOCKED.
