# Project Uranius — Post-015 UUID Squad integration (local HTTPS, owner-only)

Status: CODE IMPLEMENTED IN REPOSITORY; runtime tests and live HTTPS smoke **NOT YET EXECUTED**. No database DDL, hosted permission changes, new migration or original ProPeloton production access.

## Completed wiring
- The already independently installed migration 015 grants restricted `uranius_smoke_reader` SELECT to the synthetic UUID mapping's `rider_id` and `rider_uuid` columns, with FORCE RLS and ownership-scoped policy. The previously installed 013 reader continues to filter original synthetic `uranius_catalog.riders` using the verified manager session.
- New `database/synthetic-world/hosted-squad-uuid-read_REVIEW_ONLY.sql` uses `BEGIN READ ONLY` and TLS/role checks, sets JWT subject from server-owned `verified_subject`, requires an owned club, and LEFT JOINs the RLS-filtered rider catalog to the RLS-filtered UUID mapping. A missing/NULL mapping is rejected by the projector rather than silently shown as a fabricated identity.
- New `database/reconstruction/squad/synthetic-squad-uuid-preview.mjs` fails closed on invalid UUIDs, duplicate IDs/UUIDs, hidden or invented fields, missing original-field contract, excess roster or unverified owner. It never treats a synthetic UUID as a migrated real ProPeloton identity.
- The adapter now has separate `/fixture/squad-uuid` GET, authenticated by a private same-origin session cookie; no club ID or rider ID query parameters accepted. The existing `/fixture/squad` route and projector are unchanged.
- The HTTPS runner's `URANIUS_SQUAD_UUID_READ_APPROVED=1` controls the new callback; default OFF. It connects only as the restricted smoke reader with `PGSSLMODE=verify-full`, never uses service_role or direct client Supabase reads. The previously approved local Windows HTTPS launcher now enables this flag because isolated migration 015 was installed and verified, and cleans it afterward.
- The read-only Squad page prefers `squad-uuid`, can fall back to the existing read-only Squad packet if the new route is not connected, and shows `Uranius synthetic UUID` when available. Original game fields remain explicitly missing; no health, contracts, training or transfers are enabled.

## Acceptance tests added
- `tests/uraniusSquadUuidRouteIsolation.test.mjs` checks strict UUID schema; signed-in A/B sessions receive different riders, wrong origin, missing session, disabled callback, wrong method, query injection, session revocation and forbidden fields are denied.
- `tests/uraniusSquadUuidIntegrationBoundary.test.mjs` checks read-only TLS SQL, the opt-in backend, verified-subject routing, exact source separation and read-only UI.
- Existing Squad route, projector, frontend boundary and HTTPS preflight tests should remain green.

## Next verification (no database writes)
```bat
git pull origin main
node --test tests\uraniusSquadUuidRouteIsolation.test.mjs tests\uraniusSquadUuidIntegrationBoundary.test.mjs tests\uraniusSquadRouteIsolation.test.mjs tests\uraniusSquadHostedFrontendBoundary.test.mjs tests\uraniusSquadPreviewReview.test.mjs tests\uraniusSquadHttpsStartupPreflight.test.mjs tests\uraniusSquadHostedBundle.test.mjs
```
After these pass, local HTTPS `--offline-preflight` and a real two-manager authenticated smoke using previously approved `scripts/run-approved-overview-https-windows.ps1` should verify distinct UUIDs per manager and no cross-club data. The HTTPS test requires the owner's private local smoke-reader password and publishable key; never share these with the assistant.

**No additional schema migration or owner approval is necessary to exercise this already-installed 015 read path**, but the local integration remains unverified until tests and live HTTPS smoke pass. Do not deploy a public backend or turn on write actions. The nine-skill, nationality, age, contracts, fatigue, morale and other original rider profile fields remain a separate reconstruction milestone.

## 2026-11-24 — First integrated test acceptance PASS; HTTPS acceptance open

Owner's local Windows terminal confirms all **8/8** requested new integration tests passed, including real client esbuild bundle, read-only TLS SQL boundary, restricted backend subject routing, legacy fallback, UUID projector failures, signed/unsigned sessions, A/B ownership isolation, wrong-origin and query injection rejection. Existing legacy route and other broader regression suite tests were **not** all executed in this run.

Independent **read-only** Supabase SQL against isolated project `sdtsivgtcaoaeoihcwzd` after these commits confirms 13 migration ledger entries, installed 015 digest `71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e`, 200 distinct synthetic rider UUIDs, one owner-reader policy, FORCE RLS, no `anon` or `authenticated` UUID-mapping SELECT, and paused game clock. No hosted SQL writes.

GitHub Actions API reported **zero workflow runs** at the time of inspection, so the new automated CI workflow cannot yet be claimed passing or even triggered. The owner has independently confirmed local test success.

**Remaining acceptance**: run the existing already-approved `scripts/run-approved-overview-https-windows.ps1` on owner's Windows machine using the previously configured local HTTPS TLS cert/key, Uranius CA, portable PostgreSQL 17 binaries, restricted `uranius_smoke_reader` password and Supabase publishable key entered locally. Authenticate both fixture-manager A and B in separate sessions; each Squad read-only profile should show its own *synthetic* UUID, not a foreign rider; verify no cross-club data, no original rider identity claim, and no mutating UI controls. Neither the assistant nor public clients should receive these passwords/keys. Only after this test can the complete live HTTPS integration be marked verified.

## 2026-11-24 — Full legacy regression PASS (live HTTPS still pending)

The owner reran all requested legacy Squad tests on Windows after correcting a source-level launcher cleanup assertion. Result: **17 tests, 17 PASS, 0 FAIL**, including frontend esbuild build, legacy Squad RLS boundaries, auth/session A/B route isolation, fail-closed malformed packet handling, TLS offline startup rules and legacy Squad read-only UI. The newer UUID integration suite had separately passed **8/8** tests. Total reported distinct test cases: **25/25 across the two suites**, with no hosted permission or data writes required.

Next acceptance is the existing local HTTPS launcher, using the known existing loopback TLS files and PostgreSQL client, not any new migration:
```bat
powershell -NoProfile -File scripts\run-approved-overview-https-windows.ps1 -TlsCert "C:\Users\Aleks\AppData\Local\Uranius\loopback-tls\loopback-cert.pem" -TlsKey "C:\Users\Aleks\AppData\Local\Uranius\loopback-tls\loopback-key.pem" -CaFile "%USERPROFILE%\Downloads\prod-ca-2021.crt" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```
It checks assets and TLS setup before prompting privately for the restricted reader password and Supabase publishable key. Verify manager A and manager B in separate signed-in sessions show distinct, own-club `Uranius synthetic UUID` fields on the Squad profile, not a fallback integer-only profile. No passwords or full UUIDs need be sent in chat. Stop the local server with Ctrl+C when done. Current status **code and unit regression accepted; live HTTPS A/B acceptance NOT YET VERIFIED**.

## 2026-11-24 — LIVE LOCAL HTTPS A/B SQUAD UUID ACCEPTANCE PASSED

Owner provided browser screenshots from the live locally launched TLS Uranius application after the verified startup preflight. Manager A displays **Fixture Rider 1–10** and Manager B displays **Fixture Rider 11–20**. Expanded read-only profiles visibly display distinct **Uranius synthetic UUIDs** (A Rider 1 and B Rider 12), four verified synthetic skill values, and honest warnings that original-game profile fields are missing. No editing controls or foreign-club riders appear in either screenshot.

Alongside independent hosted migration 015 RLS/ACL verification and previously owner-passed **8/8 UUID integration** and **17/17 legacy Squad** tests, these screenshots **complete the local HTTPS end-to-end read-only UUID Squad integration milestone**. Screenshots alone do not prove every denial property; cross-manager isolation and rejected unauthorized requests are supported by separate automated tests.

**Status: 016 LOCAL HTTPS UUID SQUAD INTEGRATION CLOSED / ACCEPTED.** Original-game rider identity, nine skills, age, roles, fatigue, morale, contracts and related gameplay remain separate, unreconstructed milestones. No original ProPeloton production writes or public deployment.
