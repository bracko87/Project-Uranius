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
