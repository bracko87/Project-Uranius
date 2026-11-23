# U5.03 synthetic world preparation

Reuse the verified 20 teams, 200 riders, two equipment records and three routes from the approved foundation. The offline draft adds logical manager slots for teams 1 and 2, an indexed three-stage calendar in season 1, and 20 equal fictional opening balances. The amounts and calendar are fixture inputs. Neither is a change to game economy or sporting behavior.

The catalog adapter preserves the live SQL values for four rider attributes, roster membership, distances and elevations. The fixture fills other required attributes from the existing ten-rider synthetic fixture. It uses the existing RaceAuthority and keeps generated test labels fictional. The integration smoke test builds directly from the four reviewed SQL files in a disposable local PGlite instance.

Future authorized import order is calendar and balances against the approved game contract, separately created synthetic Auth users through a project-scoped admin path, then team ownership mappings after UUIDs are verified. Keep account UUIDs, passwords and tokens out of source and reports. No fixture email delivery or public signup. Validate uniqueness, absence of orphaned owners and repeat-import behavior. Confirm local clone login plus two-manager isolation through the real sandbox API before claiming U5.03 acceptance. Existing hosted owners and Auth users remain empty. No SQL import is included for the draft balances or calendar while the reconstruction gate is open.

For the offline fixture test, set URANIUS_PGLITE_ENTRY to the absolute file path of the locally installed PGlite 0.3.16 dist/index.js and run the existing Vitest runner with database/synthetic-world/stage-input.test.ts. This test checks stage/roster data and three ticks with no commands at 100, 150 and 200 riders.

## Local login smoke

Run `node database/synthetic-world/login-browser-check.mjs` from the repository root. The check bundles the original Login page and existing club-context lookup with an offline-only Auth fixture. Each headless browser session uses a different fictional manager, submits the original form and checks the club label after dashboard navigation. The fixture dashboard is a limited projection, while the full Overview still requires its own database contract tranche. Native SQL rehearsal of 006 separately verifies cross-manager riders and opening balances under RLS.

## Native PostgreSQL dashboard smoke

The full Windows terminal test in tests/uraniusSyntheticWorldWrapper.test.ps1 starts a disposable loopback PostgreSQL 17.12 database, applies all six reviewed files, creates two fixture mappings, then runs login-browser-check.mjs in postgres-fixture mode. The browser follows the original Login flow and reads the dashboard through the local session adapter and native RLS. It also tests private HTTP rejection before sign-in and after logout. The fixture mode refuses any non-loopback database target by construction and only accepts its disposable database name. See HOSTED_SMOKE_REVIEW.md for the proposed real sandbox connection.
