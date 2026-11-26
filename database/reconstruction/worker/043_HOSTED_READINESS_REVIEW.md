# 043 — hosted baseline and activation readiness (READ ONLY)

2026-11-26. Owner requested proceeding after 042 native 7/7 acceptance. Scope: independent read-only audit of isolated project sdtsivgtcaoaeoihcwzd and release preparation. No original production database connection, hosted writes, schema install, grants, credentials, scheduler, finance or clock changes. No authorization inferred for future activation.

## Verified baseline

- 043_hosted_baseline_READ_ONLY.sql (5a5d80e9f74f36ce844a30be723c99d7897d2658), executed using bounded repeatable-read read-only transaction on isolated project. Uses exact 20 ledger pairs from accepted 027 manifest and all three completed job identities/digests from accepted 031 evidence. Recomputes input/output SHA-256 inside database; no raw race payloads or player records returned.
- 043_hosted_baseline_evidence_REVIEW_ONLY.json (b4d5ee4d207bf95fbd61366b3abc8caddcb6d705) records all 16 boolean checks true, as actually returned by hosted database. PG17.12; exact project identity/ledger/jobs/archive; one participant replay; paused S1M1D1; worker NOLOGIN/no session/no roles granted to worker; no inheritable or SET-capable delegation; no uranius_scheduler role or cron.job table; four entries, four zero-cost preparation rows, 20 startlist selections; no 035/042 local fixture schemas; FORCE RLS on raw jobs/archive/replay, expected two worker policies; no raw client roles access, exact seven worker update columns and narrow schema access.
- Additional role audit: one pg_auth_members row grants uranius_worker administrative option to postgres, with inherit_option=false and set_option=false. This is not an outgoing role membership of the worker and does not authorize inherited or SET ROLE access. No role modifications; keep record visible and recheck on deployment. Scheduler check covers database role and pg_cron table only, not external automation platforms. The earlier three jobs represent one flat race and two tour stages, not three separate races. Archive/replay presence verified; raw archive equality checked for flat job. This is scoped baseline verification, not a full security audit or authorization to publish.

## Activation gate: BLOCKED

| Requirement | Evidence | Decision |
|---|---|---|
| Frozen isolated baseline | 16/16 actual hosted checks | PASS at review time; fresh recheck required |
| Local atomic settlement | 042 native 7/7, one-day synthetic only | PASS for that scope only |
| Engine-generated scoring | 039 native 4/6 confirmed; actual full-race checks missing, shared-group tie heuristic review-only | BLOCK |
| Authoritative results, markers, youth and penalties | 036/038 synthetic result/point adapter; no official source authority | BLOCK |
| Base fatigue | 040 overnight and debt calculations accepted; original base formula not recovered | BLOCK |
| Canonical wear, supply and health | 041 historical fallback and synthetic disposition/usage accepted; actual writer, catalogue and incident generation outstanding | BLOCK |
| Multi-stage integrated carryover | 035 multi-stage finance fixture accepted; 042 one-day integrated effects only | BLOCK |
| Hosted finalization implementation | Existing private worker only; no authorized official writer, authority, resource or settlement schema deployment | BLOCK |
| Operational authorization | No approved pinned deployment artifact, no approval for migration, scheduler or financial activation | BLOCK |

## Ordered next work

1. Resolve 039 actual-engine full-race checks, including runtime/timeout diagnosis if needed; do not repeat its four passed boundaries unless relevant changes require it. Recover canonical marker definition evidence and document sporting tie policy.
2. Recover exact original base stage workload calculation and canonical supply/wear/health writer contracts from source. Any further original production database inspection must be separately explicitly approved with bounded metadata/configuration scope; no player data or writes.
3. Extend 042 integrated effect carryover to multiple stages using local fixtures, prior-stage immutable receipts, resource continuity, recovery gate and rollback across the second stage. Preserve original per-award tax and already paid awards.
4. Design actual isolated-only finalization schema and worker transition with separate private authority, restricted permissions, actual receipt validation and no path from synthetic review packet to official effects. Prove native integration, negative authorization, duplicate and rollback guards before drafting migration.
5. Only then prepare exact SQL and manifest hashes for separate owner approval, with fresh baseline, backup/rollback or forward-fix plan, no automatic scheduler and no production access. Keep existing worker dormant. Review externally configured scheduling separately before any activation.

Do not install 035 or 042 REVIEW_ONLY fixtures on a hosted project. Do not promote their synthetic inputs into official game records. A passed baseline does not make the official publication gate ready. No repeat of accepted 035–038 or 040–042 tests needed absent relevant changes. Overall master checklist remains 49/60 verified, U5.09 in progress; 043 read-only baseline scoped review accepted, hosted activation blocked.

## 2026-11-26 — superseding scoped acceptance (activation still BLOCKED)

- 039/043A native combined 6/6 accepted, including actual engine crossing parity and repeatability. Canonical markers and sporting tie policy remain review-only.
- 043B native 15/15 accepted, original base workload and Phase9 resource arithmetic recovered, medical and reservation formulas reviewed. Actual authoritative inputs, canonical DB writers and health catalogue not verified.
- 043C native combined 14/14 accepted, including integrated ordinary two-stage all-finisher exact-policy settlement, prior paid awards, resource carryover and atomic rollback/concurrent retry. General multi-stage withdrawals, shared owners and health persistence remain out of scope.
- 043D local authority boundary rehearsal committed with native PG17 pending; independent evidence and admission role separation, rejection of existing review job kinds and hard false receipt flags. No real publication writer or migration drafted.
- The three earlier readiness rows for scoring/base fatigue/multi-stage now have scoped offline acceptance; they are not approval for official publication. Hosted activation remains BLOCKED on source authority, actual writers/effects, deployment contract and separate explicit approval. Do not install any REVIEW_ONLY fixture hosted. No new hosted baseline inspection or mutations in 043D.
