# 043T — historical team rescue and multi-incident chase merge (offline only)

2026-11-26. Owner 043S native 4/4 accepted, 118/118 previous owner-accepted native groups; overall 49/60. Neither hosted database queried or changed.

## Source and implementation
Pinned ProPeloton-Manager b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886. Original 31219–32012 interpolation, skill, closure, rescue pickup, helper priority and selection, chronological half-km/event grid, group merge, exact rejoin and energy. Source rescue planner uses GC leader, protected GC top ten or team leader; same-team helpers in same source group, explicit protect_leader (GC leader may also use free_role except gradient >=4%), previously DNF excluded, reserved helpers unique. Pickup computed from elapsed average road speed, gap and waiting speed. Same-target chase groups within five seconds merge with older identity and member-weighted gap. Historical model, not independent physical position proof.

- scripts/uranius-historical-team-rescue-review.mjs initial 0c00b2443f5b8dcb0b929251b87b704853e32246, exact selected candidate identity fix 069ab8d1d63f46796e679631ca57ae46d86ff884, blob cdfd1aaae69f011d3c5c5f2d9b93375e3899b4b7. Original chase algorithm translated TS to JS using previously accepted 043S arithmetic, frozen normalized stage-plan and pre-stage GC inputs (not server extractor). Recompute 043P selection and 043R initial consequences; bounded 1–7 sequential incidents, shared stage/run/seed, chronology and global cooldown, candidate roster and source group/state match. No repeat affected rider, overlapping rescue/incident episodes refused. Includes helper and merged-group samples, final modeled gap and penalty, individual chase energy. Explicit synthetic evidence only; source plans/standings, physical timeline, full incident loop eligibility and official finish/sprint protection remain unauthenticated. Existing accepted scripts unchanged. All official and authority flags false.
- tests/uraniusHistoricalTeamRescueAcceptance.mjs initial 456bf9f1328a64badb12ef46c0c9be49df9812fb; fixture fix 7566d4aea834fb501dc519aee9e2b4bd2dbd18c1, blob 9af7c082c856e566dcc2000c6106fff83dbbe5cb. First development attempt passed pickup group but did not find compatible pair within 10000 seed search. Recovered fixed seed 043T-19314 with exact 45s/43s initial losses from source-derived draws and pinned it; no test-time search. Re-fetched committed final JS 5/5 groups PASS using original MD5 and JSON equality/clone shims, not native Node SHA/crypto. Pickup boundaries, rescue and helper energy, leader/free-role and steep climb restrictions, separate-group merge and authority guards. Full native test pending.

## Owner acceptance
```bat
git pull origin main
node tests\uraniusHistoricalTeamRescueAcceptance.mjs --offline-only
```
Expected PASS 5/5 historical team rescue checks; no hosted connection. No PostgreSQL or additional downloads. Next prioritize actual engine base-replay/locked-plan evidence bridge and integrated incident trace rather than more isolated arithmetic. Official writer admission and production deployment remain BLOCKED.
