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


## 2026-11-25 — Owner native verification PASS, exact frozen release staged

Owner pulled `614825d` and executed the documented disposable PG17 command. All 57 historical checks and six new seed checks passed (63/63 total); scratch PGDATA cleaned up. Exact candidate rejected non-TLS/wrong role, full rollback removed temporary policies and rows, success produced 3 races / 4 stages / 2 accepted entries / 2 preparations with FORCE RLS and identical reader policy definitions. Real JWT A/B reads each returned only own upcoming card and both shared today's event; unknown owners had no private rows, anon and restricted writes denied, repeat rejected, 14 ledger entries/paused clock/200 riders preserved. The previous "not executed" note is superseded for the native test only.

Frozen candidate SHA-256: `7e5f8a727dfc44784c0a8abf48c51b8ddfb19766a2cc319b7ff31686a068283b`.
Frozen `019_install_manifest_REVIEW_ONLY.json` SHA-256: `98eb06ca99761f229caf680ff36e4ded9bc44d241d6a2ee274811f912d815cdf`.
Hash calculation independently cross-checked against the known pinned 018 manifest digest. Candidate SQL unchanged (Git blob 9b846c4133b3be2ccc85ced9bf57afa588de3cd6).

Dormant `scripts/apply-uranius-race-world-019.mjs` and `scripts/run-approved-race-world-019-windows.ps1` use the previously accepted dedicated migrator/direct verify-full TLS pattern. They require exact approved manifest digest, local typed confirmation and private local password; run hash review before connecting; candidate plus ledger insert and postflight are one transaction. The new installer wrapper has not itself been run; candidate native verification does not prove wrapper execution. Do not run installer before separately explicit target- and hash-scoped owner approval and fresh read-only preflight. No automatic retry. On success independently verify 15 exact ledger pairs, 3/4/2/2 records, all four FORCE RLS policies, no new public/reader write privileges, paused clock and existing roster. Then exercise populated A/B Overview and build Calendar page. No production or paid infrastructure changes. **49/60 unchanged.**


## 2026-11-25 — Explicit owner approval recorded; local installation pending

Owner explicitly approved ONLY Migration 019 on isolated project `sdtsivgtcaoaeoihcwzd`, candidate SHA-256 `7e5f8a727dfc44784c0a8abf48c51b8ddfb19766a2cc319b7ff31686a068283b`, manifest SHA-256 `98eb06ca99761f229caf680ff36e4ded9bc44d241d6a2ee274811f912d815cdf`. Original ProPeloton production explicitly excluded.

Fresh project-scoped READ ONLY preflight after approval: PostgreSQL 17, 14 ledger records with zero missing/extra/changed version-hash pairs, races/stages/entries/preparations all zero, 200 riders, 2 owners, 1 paused Season 1 Day 1 clock row, all 4 race tables owned by uranius_migrator with FORCE RLS and 4 expected restricted reader SELECT policies. Connector execution identity is postgres, not the approved direct uranius_migrator; no alternative role switching or privilege escalation is authorized. No write or install attempt made.

Use frozen `scripts/run-approved-race-world-019-windows.ps1` with existing trusted CA, portable PG17 binaries and exact approved manifest digest. Local launcher requires typed APPLY URANIUS 019 and privately entered dedicated migrator password. After success independently verify 15 exact ledger records, 3/4/2/2 race counts, FORCE RLS, preserved policies/ACL and paused clock; on failure do not retry before checking actual state. Candidate/manifest bytes unchanged. No production changes or additional infrastructure costs.
