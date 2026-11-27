# 043W — chronological incident candidate feedback (offline only)

2026-11-27. Owner 043V native 4/4 accepted; 132/132 prior owner-accepted native groups, overall 49/60. No hosted queries, writes or activation.

## Scope and decisions
Feed only previously selected incident prefixes into later historical candidate checks on the frozen actual base-engine timeline. Initial energy losses, original 043V interpolated chase energy, modeled separation, permanent DNF and one-time modeled rejoin witness now influence later 043Q group membership, runtime fatigue, depletion and candidate eligibility. Keep 120s global and 900s rider cooldowns; rejoin never bypasses cooldown. Future incident selections are not consulted for earlier decisions. Recompute 043T chase only when selected prefix grows, using the already frozen full base replay (including future baseline observations; not a live predictive movement engine). Refuse changed previously confirmed rejoin, repeated selected incident rider, helper/rescue overlap or unsupported plans. Explicit neutral domestique/hold plans and empty GC required for this slice; team rescue is previously tested separately in 043T. Historical time-fraction position, not measured physical incident-adjusted positions. Prior tick decisions are retained; no retrospective application of later prefix. No claim of original full-loop parity or physical engine reintegration. Original source arithmetic reused from 043Q, 043T and 043V (pinned runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886). This is an experimental feedback bridge, not a replacement for source-owned authoritative simulation.

## Implementation
- scripts/uranius-historical-incident-eligibility-review.mjs opt-in feedback hook e1e5f75172b91e001b1f4931f50d6adc3e5cc514, blob 26bbe6bbb3c4eaa594bcf36b37fa5d8b789367a9. Existing 043Q/U default path and receipt unchanged.
- scripts/uranius-engine-incident-replay-review.mjs opt-in capture of projection evidence f988aeec26eda54f8cec5222f5859f78fda3e3ed, blob 78d4db45d330c08f5f04573fad2c055721c0374e. Default 043U review shape unchanged.
- scripts/uranius-chronological-incident-feedback-review.mjs initial e62a0dd76bbde0adf5ca171248dca954d2082040, guard correction b1c368bc47e0ffb0c620954244cf847f348008ce, blob 251f490880e420074ae8916b09df6a8a13bcaadb. Validate through 043V and reproject 043U source, derive selected prefix consequences, reuse 043T and original chase interpolation, record per-tick adjustments/rejoins/group membership and prefix receipt digests. Unaffected rider energy preserved exactly; future prefix refused. No changed legacy movement, final classification, health persistence, source authentication or official authority. All such flags false.
- tests/uraniusChronologicalIncidentFeedbackAcceptance.mjs 8eaf170da3397468dff397c3dfabc2d57210640d, blob 1dde61dc622d850defea9ad6b35671d0bec7488e. Four native groups planned: prior-only debit/separation/DNF, rejoin/cooldown/immutability, actual base-engine observations driving later eligibility and fatigue, tamper/authority rejection. Development re-fetched JS executed with original MD5/canonical digest shim: first two boundary groups PASS; synthetic 271-frame/24-rider full adapter preflight three incidents, 232 feedback ticks, one modeled rejoin, earlier decision equality and third-group assertions PASS with synthetic source. Actual engine, native SHA and complete four-group run not executed in development. Native 4/4 pending. Bounded test tries up to six deterministic base seeds only if repeated incident/rejoin-change limitation refuses a scenario; unexpected failures are not swallowed.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusChronologicalIncidentFeedbackAcceptance.mjs --offline-only
```
Expected PASS 4/4 chronological incident feedback checks; no hosted connection, then cleanup. Existing Node/esbuild only; no PostgreSQL or private files. Next expand repeated incident and helper episodes with chronological state ownership, then physically apply incident consequences in isolated movement simulation and reconcile adjusted finish scoring. Hosted activation BLOCKED.

## Owner native acceptance — 2026-11-27

Owner confirmed main up to date and ran prescribed offline harness. All four groups PASS; actual base-engine observations, causal feedback and immutable prior decisions, no hosted connection, cleanup completed. Scoped 043W CLOSED; 136/136 owner-accepted native groups through 043W, overall 49/60. Physical engine feedback, repeated incident and rescue integration remain outstanding.
