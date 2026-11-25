# U5.02/U5.03 — populated synthetic race world review

2026-11-25. Isolated Uranius project `sdtsivgtcaoaeoihcwzd` ONLY. Original ProPeloton production excluded. **Review only; hosted installation not approved or attempted.**

Fresh independent read-only query: 14 ledger records, 200 catalog riders, 200 attribute records, 2 owner bindings, paused Season 1 Day 1; races/stages/team entries/preparations all zero. Existing 010/015/018 deployment records supersede older checklist descriptions. The limited authenticated Overview, clock and UUID Squad previews already passed local HTTPS manager A/B acceptance. Do not repeat those checks absent changes.

## New seed candidate

`019_synthetic_race_world_REVIEW_ONLY.sql` is one atomic DO statement, requiring direct dedicated migrator, PostgreSQL 17, approved isolated project ref and TLS. It checks bidirectional equality of the 14 frozen ledger pairs, 200 riders, two mapped clubs and paused date. Locks the four race tables; requires expected ownership and FORCE RLS plus existing single reader policy on each. Transaction-only migration-role SELECT and INSERT policies permit empty-table checks and seeding, then are dropped before completion. No persistent new reader grants or policy changes; no relaxation of FORCE RLS. A repeat or nonempty table is refused. No ledger entry is inserted by the candidate itself.

| Fixture | Game date | Scope |
|---|---|---|
| World Opening Race | 2000-01-01 | Global race card, no accepted team entry |
| Club A Flat Classic | 2000-01-02 | Club A accepted entry and linked synthetic submitted preparation |
| Club B Mountain Tour | 2000-01-03–04 | Club B accepted entry and linked synthetic submitted preparation, two stages |

All dates and races are fictional test-world design choices. Explicit synthetic labels/metadata. Four 120 km stages; no rider startlists, no preparation costs, no finance transactions, no actual engine payload, no activation, no game-time progression. The schedule previews preparations; private accepted entries are separately verified. This is not an operational submitted startlist or evidence of full calendar parity.

## One owner-local native check

The existing reviewed disposable full-history harness gained an optional flag `--race-world-seed-review`; its original invocation is unchanged. The optional branch replays the installed baseline in scratch loopback PostgreSQL, removes only the earlier test harness's own transient race rows, appends the exact 018 ledger record, then runs six new gates: TLS/wrong role denial, rollback, exact fixture counts/unchanged policies, real JWT A/B isolation and shared world event, anonymous/unknown/reader-write denial, duplicate rejection/unchanged world. As with 018, only the TLS condition is substituted in the disposable-only copy; original candidate is first verified to refuse local non-TLS. Full source SQL is not executed against Supabase.

```bat
git pull origin main
node tests\uraniusRider018FullHistoryNativePg17.mjs --race-world-seed-review --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected new gate result: 6/6, not yet executed. Existing historical replay is a prerequisite in the same run, not a request to repeat separate old tests. Following success, freeze exact candidate bytes, independently verify hosted baseline and request explicit scope approval before any data insert into hosted Uranius. Separate guarded installation and read-back must preserve existing grants and paused state. Calendar full page, startlists, actual race simulation and accounting remain open. **49/60 unchanged. No paid infrastructure or production modifications.**
