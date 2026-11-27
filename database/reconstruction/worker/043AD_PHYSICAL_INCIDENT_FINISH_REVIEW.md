# 043AD — physical finish and classification continuation (offline only)

043AC owner native 4/4 accepted; cumulative 156/156. d67edb3 exposes opt-in finish prefix without changing default accepted 043AC output. 002acb1 adds physical continuation using existing movement, energy, sub-tick crossing detection and finish application. 032298b adds controlled and automatic native acceptance.

Scope: fully applied 043AC pre-finish prefix, one peloton source, flat no-command stage, existing 30s ticks. No new selection in finish continuation; original pre-finish selection cutoff retained. Riders still repairing/chasing continue moving after winner; active helper waits for physical pickup, no merge into finished peloton. After target finish, chase uses canonical group pace, no target +8km/h bonus. Finish crossing takes priority over merging at line; crossing groups are ranked by sub-tick time and canonical tie-breakers. Energy charged by existing full-tick rule even for fractional crossing tick; partial-tick energy, sprint-zone protection, OTL, tactical interactions and official classification parity remain unverified. DNF rows carry null rank/time/gap; no additional movement or charge. Classification is explicitly nonofficial and in-memory only. No writer, production activation or hosted connection.

Acceptance requires controlled late repair and post-winner helper pickup, every finisher crossing witness, unique contiguous ranks and actual gaps, terminal immutability, bounded deterministic replay, and continuation of the accepted long-wet seed 4 with six admitted incidents and genuine overlap. Native execution and TypeScript type checking not performed in development.

Windows CMD:

```bat
git pull origin main
node_modules\.bin\esbuild.cmd tests\uraniusPhysicalIncidentFinishAcceptance.ts --bundle --platform=node --format=cjs --outfile="%TEMP%\uranius-043ad-test.cjs"
node "%TEMP%\uranius-043ad-test.cjs" --offline-only
del "%TEMP%\uranius-043ad-test.cjs"
```

Expected PASS 4/4 physical incident finish checks; no hosted connection. Hosted activation BLOCKED.
