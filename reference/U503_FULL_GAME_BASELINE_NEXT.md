# U5.03 → U5.02/U5.07: first full-game baseline gate (review-only)

Date: 2026-11-23. Isolated target: Project Uranius `sdtsivgtcaoaeoihcwzd`. No original ProPeloton Manager change is authorized.

## Verified completed

- Hosted migration ledger 001–007; approved restricted reader access and unchanged manager ownership.
- Owner browser results: Manager A / Team 1 and Manager B / Team 2 sign in to the limited local HTTPS dashboard, each with 10 riders, 10,000 credits and 3 calendar entries; B logout denied and A session persisted.
- Owner executed `tests/uraniusHostedNegativeProbe.mjs` against the actual local HTTPS listener (port 59403): 11/11 negative checks passed, including certificate/host, Origin, anonymous access, fake cookie and unsupported paths. These checks sent no manager credentials or authenticated requests.
- Local session regression checks cover replay, expiry and server-owned identity. They do not substitute for a whole-app game smoke.

## Concrete remaining frontend/backend gap

Read-only hosted inspection on 2026-11-23 found only **two** functions in `uranius_catalog` and `uranius_game`: `uranius_catalog.request_uid()` and `uranius_game.get_my_club_id()`. The restricted server-side smoke uses narrow fixed SQL against approved fixture tables; it is **not the full game Overview**.

Relevant exact React consumers:

| Consumer (source) | Required named reads currently absent from sandbox implementation |
|---|---|
| `src/pages/dashboard/Overview.tsx` | `get_dashboard_overview`, `get_dashboard_header`, `get_current_game_date_date`, `get_overview_race_schedule_v1`, `get_overview_race_world_v1`, `get_overview_recent_race_results_v1`, `get_overview_active_operations_v1`, `get_overview_finance_period_summary_v1`, `get_overview_attention_items_v1`, `get_overview_squad_pulse_v1`, `get_overview_season_snapshot_v1`. Additional RPCs and table fallbacks also exist; inventory all active paths, not just this list. |
| `src/pages/dashboard/Squad.tsx` | `get_current_game_date`, `get_club_squad_season_dashboard_v1`, `club_roster` projection, main/developing club views and rider summaries. Some other page actions are writes and **must remain disabled** pending separate review. |
| `src/pages/dashboard/CalendarPage.tsx` | `get_current_game_date_date`, `get_current_game_date_parts`, `get_race_calendar_entries_v1`, race entry and stage relations, optional national entries and premiums. |
| `database/reconstruction/world/006_synthetic_world.sql` | Synthetic stage calendar is **only** `stage_id` and `season_day` (day 7/8/9); it does not yet establish the complete legacy game date, race and stage output contracts. |

Do **not** infer that a matching function name alone proves signature, return shape, security, fallback behavior or timing semantics. Reference: `reference/DB_RECONSTRUCTION_PLAN.md` and `reference/DB_CONTRACT_MAP.tsv`.

## Next development work, in strict order

1. **U5.02 read-only reconciliation**: select the smallest credible *game clock + Overview race schedule* slice. Inspect exact React inputs/outputs, sanitized reference SQL, transitive dependencies and the existing live Uranius tables/RLS. Preserve time-zone/day-advance rules, existing UI and actual route/stage meanings. Record missing source definitions as blockers rather than generating plausible replacement values.
2. **Offline contract test**: create deterministic fixtures for Manager A/B, no-access anonymous state and the canonical no-command baseline. Verify result shape, wrong owner denial, meaningful game-date mapping and no future race leakage; do not mix these with the restricted 007 smoke-reader contract.
3. **Review-bound DDL/API tranche**: prepare a separately versioned, target-guarded migration, exact digest and rollback/test report. Require owner approval **before any hosted write, API exposure or privileged role change**. Do not rerun 007.
4. **U5.03 full-game baseline**: only after compatible read contracts exist, exercise the **real cloned** Login → Overview → Squad → Calendar routes under the two separate hosted managers. Check A/B session segregation, non-fictional data provenance (test data is explicitly fictional), stage ownership, RLS and logout. Document any unavailable cards/features as blocked rather than showing successful fake UI.
5. After baseline acceptance, advance U5.04 hybrid persistence, U5.05 API/storage security and U5.07 full clone integration in the master plan order. Preserve golden no-command engine behavior.

## Non-negotiable constraints

- The actual Project Uranius backend has no complete Overview contract yet. Do not mark U5.03 PASS or increase the 49/60 count solely because the limited smoke passed.
- Preserve the working synthetic managers, ledger, data, security policy predicates, test server and original game. No public signup, scheduled workers, payment, external emails, Netlify deploy or original production accesses.
- Do not request more passwords from the owner for this preparatory work. Use sanitized source + read-only connected Uranius inspection; any new hosted change requires a separately reviewed approval package.

**Status:** U5.03 IN_PROGRESS; U5.02 still BLOCKED on full legacy-contract reconciliation. This is a handoff for implementing the next reviewed slice, not authorization to execute it.
