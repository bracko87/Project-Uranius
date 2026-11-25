# U5.03 — authenticated populated Calendar preview (2026-11-25)

019 hosted installation independently verified (15 exact ledger records, 3 races, 4 stages, 2 accepted entries, 2 linked synthetic preparations). See 019_SYNTHETIC_RACE_WORLD_REVIEW.md.

The isolated loopback HTTPS smoke now has a Calendar page at /dashboard/calendar, reached via View Calendar from Overview. Its GET /fixture/calendar accepts no caller-selected club or date. The existing approved Overview read flag enables the server-owned calendar query; default remains disconnected without that flag. It reuses the restricted TLS reader, session authentication and already installed 010 SELECT grants/RLS. It reads only the next 30 game days from the paused authoritative game clock, up to 500 rows (overflow fails closed), with global race/stage details and the requesting club's accepted-entry boolean. It never exposes other managers' private entry rows. The frontend independently checks club identity, displays an unavailable state without fabricating calendar records, and filters locally to own accepted races. Terrain/distance/start times are not included because existing reader grants do not cover them. The current preview is not the full original Calendar or a gameplay action. No new database migration, permissions, production or scheduler changes.

Offline source changes committed; runtime verification pending:
```bat
git pull origin main
node --test tests\uraniusCalendarPreview.test.mjs tests\uraniusOverviewScheduleRouteIsolation.test.mjs tests\uraniusSquadHostedBundle.test.mjs
```

Then use the previously approved local HTTPS launcher run-approved-overview-https-windows.ps1 with existing certificate, key, CA and portable PostgreSQL client. It bundles the new client before asking for credentials. Both managers must see 4 shared Calendar stage rows, 1 global today's race; manager A has 1 accepted Calendar stage and its own one upcoming race, manager B has 2 accepted Calendar stages and its own one upcoming race. Filter must not show another manager's entry status. Test logout and unavailable response separately. No passwords or full identifiers need be sent to chat.

No further 019 installation or 63-case rehearsal needed. Overall 49/60 unchanged; full startlists, full Calendar and application/engine/accounting acceptance still pending.
