# U5.03 — authenticated clock interface slice (review/implementation record)

**Date:** 2026-11-23. **Project:** isolated Uranius `sdtsivgtcaoaeoihcwzd`. **Hosted state:** migration 008 already installed (paused synthetic clock). **009 NOT applied.** No original ProPeloton Manager changes, public signup, scheduler, game-time advancement or real race-result writer.

## Code committed

- `database/synthetic-world/manager-clock-projection.mjs` maps **only** the authoritative `season_number`, `month_number`, `day_number`, `is_paused` fields into a small validated read-only JSON response with `current_game_date`. It reuses the original game clock mapping (2000 + season - 1); it does not default to the real-world date, the shared stage calendar, or a client-supplied value. Extra source fields are removed.
- `database/synthetic-world/club-dashboard-adapter.mjs` handles `GET /fixture/clock` only for the short-lived, server-verified manager session. The endpoint uses the same Host, Origin, Secure/HttpOnly cookie and logout lifecycle as the existing dashboard. URL tenant/subject selectors do not match any route. The callback receives **only the verified server-owned subject**. A missing authorized clock-reading backend returns **HTTP 503** after authentication, not a fabricated date.
- `database/synthetic-world/hosted-smoke-client.tsx` renders a small **Game clock** section in the existing limited test dashboard. While not connected it honestly says clock data is unavailable and calendar entries remain fixtures. It does not navigate away from the working club dashboard solely because clock reading is unavailable.
- `database/synthetic-world/hosted-clock-read_REVIEW_ONLY.sql` is a **fixed, parameterized read-only TLS query** with current-role guard, no arbitrary client SQL and no client-selected club. It selects exactly the four clock fields and requires the server to inject the Auth-verified subject.
- `scripts/run-uranius-hosted-smoke.mjs` wires this fixed query behind `URANIUS_CLOCK_READ_APPROVED=1`. **The flag is off by default** and no new database permission is installed yet. With default settings the established dashboard remains functional and the new clock endpoint returns 503 for logged-in managers.

## Tests and evidence

- `tests/uraniusClockRouteIsolation.test.mjs`: Node test coverage of server-owned A/B identity, anonymous/forged cookie rejection, cross-origin/method rejection, query-string tenant denial, logout replay, other-manager session preservation, strict projection and missing-provider fallback.
- `tests/uraniusHostedNegativeProbe.mjs`: extended the existing 11 negative HTTPS checks to **15 checks** by adding unauthenticated clock, wrong Origin, wrong method, and tenant query denial. These four new checks have **not yet been run against the owner's loopback HTTPS listener**.
- A separate **in-process JS adapter probe** executed against the exact committed modules with synthetic request/response objects and passed **14 assertions**, including manager isolation and no invented date. This is not a substitute for the Node HTTP and real browser tests.
- `tests/uraniusClockReaderReview.test.mjs`: **5/5 source/contract assertions passed** in an isolated JS harness against GitHub-backed SQL, transport, adapter and manifest. Native Node test-runner execution is still pending.
- `tests/uraniusClockReaderNativePg17.mjs`: new disposable PostgreSQL 17 test runner. It replays original 001–007 and canonical 008, then tests proposed 009 under strict RLS/ACL, denied roles, cross-manager identity, error rollback, project/ledger drift, duplicate application and cleanup. The source passed a JavaScript parse check, with the mock JWT JSON literal verified. It has **not** been executed against PostgreSQL 17 yet.

## New permission needed for actual hosted clock read

The existing `uranius_smoke_reader` was intentionally denied clock privileges by migration 008. A newly approved **009** would grant only `SELECT (season_number,month_number,day_number,is_paused)` to that existing server-only reader and add the reader to the existing owner-backed game clock RLS policy; it would not grant the anonymous role or table writes.

Proposed **not approved** artifacts:
- `database/reconstruction/clock/009_clock_smoke_reader_REVIEW_ONLY.sql`
- `database/reconstruction/clock/009_clock_reader_manifest.json` with the exact SHA-256 and status `REVIEW_ONLY_NOT_APPROVED`.

The proposed 009 SQL checks the project's identity, role, schema, single paused clock, current eight-entry ledger including **all eight exact digests**, and the expected pre-grant policy state. It is a *candidate*, not a management-connection execution package.

**Next gates:** (1) run Node contract/route tests in a verified checkout, (2) run the new 009 disposable native PostgreSQL 17 test and fix any findings, (3) prepare and separately test an atomic 009 management wrapper and rollback review, (4) request **explicit, target- and SHA-scoped owner approval** before *any* hosted 009 ACL change, (5) only afterward set the local clock-read feature flag and test both managers on the actual loopback HTTPS server, including the 15 negative checks. The original Overview and accepted-race/finance/squad/calendar contracts remain a separate milestone. Do not claim the entire original game is connected.

**Checklist:** U5.02 BLOCKED on broader DB contract parity; U5.03 IN_PROGRESS; total **49/60** unchanged.

## Owner native 009 test outcome and route-test correction (2026-11-23)

Owner's Windows console confirmed **21/21 native PostgreSQL 17 checks PASS** for review-only candidate 009 with clean fixture shutdown. The Node tests returned 7/8; all five reader-review cases passed, and the one failure was `response.json()` on an intentionally empty 404 for a tenant-parameter URL. The test-only fix `070346b1d5e30f9c08eaf98a04851543e76677c8` now interprets empty 404 as `data:null` and requires zero extra server clock reads. A separate local Node HTTP reproduction of the empty-404 behavior passed, but **full amended Node suite owner rerun pending**. Native 009 does not need rerunning unless the actual candidate SQL changes (it has not).

009 remains unapproved and not applied to the hosted sandbox. A separate management-wrapper rehearsal and explicit owner permission are required for hosted reader column grants and RLS policy extension.

## Management wrapper 009 staged after owner Node 8/8 confirmation (2026-11-23)

The owner reran the fixed Node clock-route and reader-review tests: **8/8 PASS** on Windows. Separately, the proposed 009 SQL had already passed **21/21 native disposable PostgreSQL 17 checks**, with clean shutdown. Those results apply to the exact candidate SQL SHA `1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37`, which has not changed.

The additional one-DO-statement, non-superuser management wrapper has been prepared and independently SHA-pinned at `database/reconstruction/clock/009_management_REVIEW_ONLY.sql` (`df7eb7ba0fd39cb4dbb826ecfdb1b80f6101b4fda1f79373b7e1509d967c5bab`). Its four embedded statements match canonical SQL byte-for-byte. Seven source/permission/approval assertions passed in a JS assertion harness. `tests/uraniusClockReaderManagedPg17.mjs` will test the wrapper and role membership restoration in a fresh local PostgreSQL 17 fixture; **this new native test has not yet been executed**. See `database/reconstruction/clock/009_MANAGEMENT_REVIEW.md` for the exact commands.

Hosted project still has only migrations 001–008, owner-bound clock policy restricted to `authenticated`, and no reader clock SELECT. The 009 project-manifest status is `REVIEW_ONLY_NOT_APPROVED`; full-game integration and new A/B HTTPS clock tests remain outstanding. Project progress remains **49/60**.

## Current hosted reader status and next acceptance step (2026-11-23)

Migration 009's exact reviewed management wrapper is now **installed and read-back verified** in the isolated Uranius sandbox: nine-entry custom ledger with **zero checksum drift**, existing paused clock, four permitted reader clock fields, mapped-owner RLS, anonymous denial and unchanged original role grants. The earlier 009 approval instructions here describe the *historical pre-application stage*. Current source: `database/reconstruction/clock/009_HOSTED_APPLICATION_REPORT.md`.

The optional `GET /fixture/clock` source and dashboard panel were committed earlier, but the local HTTPS runner still needs **fresh real Manager A/B acceptance**. In the owner's original trusted HTTPS environment, restart with `URANIUS_CLOCK_READ_APPROVED=1`; do not bypass TLS or expose the listener off `127.0.0.1`. Then run `tests/uraniusHostedClockAcceptance.mjs` (private Manager A/B password prompts, positive and logout assertions) and the extended `tests/uraniusHostedNegativeProbe.mjs` (**15** unauthenticated negative checks) against the actual printed `https://127.0.0.1:PORT` URL. Neither test has run against the newly installed hosted clock from this chat.

No production ProPeloton or full original game functionality is affected. Still 49/60; U5.03 IN_PROGRESS.

## Verified owner-hosted HTTPS acceptance (2026-11-23)

Owner-provided Windows console results against an actual local loopback HTTPS listener at `https://127.0.0.1:61475` (ephemeral port, not a hosted public deployment):

- `tests/uraniusHostedClockAcceptance.mjs`: **14/14 PASS**. Both existing Manager A and B signed in using hidden terminal passwords; each read their own dashboard and paused Season 1 clock; separate clubs/users and sessions verified; old sessions invalid after logout; anonymous clock denied.
- `tests/uraniusHostedNegativeProbe.mjs`: **15/15 PASS**. Anonymous and forged session requests denied; wrong Origin/Host, invalid methods, tenant-query routes and unknown paths rejected; certificate identity validated.
- No hosted database writes were performed by these tests. Original ProPeloton production untouched.

The prior pending acceptance sentences in this file are historical. **The migration 009 read-only clock slice is now verified**. This does *not* certify rendering the full original Overview, accepted race entries, running game clock or other production flows. Project task U5.03 remains IN_PROGRESS, 49/60 unchanged until full task criteria are satisfied. Next work: reconstruct and verify the source contract of `get_overview_race_schedule_v1`, accepted team entry ownership, and schedule gating before connecting the full Overview.
