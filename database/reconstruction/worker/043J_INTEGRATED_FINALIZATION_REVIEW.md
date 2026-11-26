# 043J — integrated two-stage finalization transaction (disposable PG17 only)

2026-11-26. Owner 043I native 7/7 accepted, 043A–I 73/73 scoped native groups. No hosted connections, writes or deployments.

- 043J_integrated_finalization_native_REVIEW_ONLY.sql (3460cfad8b161fc0eb3390dea8df8c4bad98a924) composes unchanged 043D admission, 043H resource delta, 043I health and 035 classification/fatigue/prize/tax/ledger writers in a single transaction. Uses existing 043C JS exact-policy two-stage settlement packet; does NOT apply 043C old compare-and-set resource writer in parallel. Race-level lock, scope agreement across run/race/stage, dates, distance, input/output SHA, core and previous packet, ten expected evidence hashes, roster-bound health candidates. Full historical snapshot of admissions, evidence, stage classifications, fatigue, rankings, awards, prize/tax transactions and entries, resource/health packets, receipts and historical events; prior stage and exact retry verify snapshot. Shared current inventory and health case rows may legitimately change later, not included in immutable historical receipt. Prior authority and reveal enforced by unchanged child gates. Fault after all child writers and combined receipt tests atomicity. No direct public access and combined authority flags always false.
- tests/uranius043JIntegratedFinalizationNativePg17.mjs (e1d6b3379738c6cccc11d561062556e1f8814437) reuses accepted 043C two-stage fixture and exact private policy, exact private 043G health catalogue; converts calculated resource deltas to normalized 043H packets, resolves developing club to parent for resource ownership, seeds synthetic health candidates (minor first stage, major last stage), and supplies expected evidence hashes and verifier role attestations. Tests prior gate and late rollback, full first-stage commit, incomplete attestation/shortage/health failure, tampered prior award/component mismatch, concurrent final-stage exactly once with current wear delta, final gross/tax/balanced entries and immutable retry/outsider refusal. Existing 042 harness filename preserved; new name includes 043J.
- Exact re-fetched JS syntax preflight PASS (imports and import.meta replaced for parsing); six SQL dollar delimiters paired; native PG17 execution not performed here. No claim of native acceptance.

## Limitations and decisions

This is a composition of local fixtures, not an official finalizer or independently authenticated evidence pipeline. The same trusted harness generates expected hashes and seeds source data; attestation exercises wiring/role separation rather than proving independent semantic authority. Frozen scoring output is synthetic all-finisher 043C data (not an actual engine race); 043F actual engine scoring remains separately accepted. Resource IDs/mapping and candidate medical inputs seeded in harness, not verified independent production state. Stage-two start eligibility/readiness, daily health recovery, real incident mapping/activation, authoritative workload and resource evidence generation, live tactics, withdrawals and official DB wiring remain unresolved. No official accounting despite balanced synthetic ledger. Only two-stage all-finisher review scope. Never install these review schemas on hosted DB.

## Native gate

```bat
git pull origin main
node tests\uranius043JIntegratedFinalizationNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin" --policy-file "%USERPROFILE%\Downloads\uranius-037-policy-review.json" --catalogue-file "%USERPROFILE%\Downloads\uranius-043g-health-catalogue-review.json"
```

Expected PASS 6/6 integrated finalization checks; no hosted connection; cleanup. Both previously verified exact private files required; never commit or upload them. Overall 49/60 pending actual authority and source integration. Hosted activation BLOCKED.

## Owner native acceptance — 2026-11-26

Owner fast-forwarded 7bf623d..be78478 and executed prescribed exact policy/catalogue disposable PG17 harness. All 6/6 groups PASS: full rollback, complete first stage, missing evidence/stock/health failure, prior award/scope tamper, concurrent final-stage settlement and balanced tax/cash, immutable retry and outsider refusal. Cleanup confirmed; no hosted connection. Scoped 043J acceptance CLOSED, 043A–J 79/79 native groups. Overall 49/60, official source and deployment gates remain blocked.
