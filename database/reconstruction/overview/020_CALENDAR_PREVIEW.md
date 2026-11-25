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


## Owner offline acceptance — 2026-11-25

Owner pulled `8439b33` and ran the exact three-file Node suite documented above. **9/9 PASS, 0 failures, 0 skipped, 1193.88 ms.** This includes five Calendar projection/HTTP isolation/SQL source tests, three existing Overview isolation tests and actual esbuild React client compilation through the original Login page. These are local test-provider and source/bundle checks, not actual hosted Calendar SQL or real authenticated browser execution.

019 installation was already independently verified; the repeated installer success text in the supplied console is not evidence of a necessary second installation. Do not rerun the installer. Next: launch the established local HTTPS smoke with the existing reader credentials, verify populated A/B Overview plus Calendar, shared four stage records, own accepted filter A=1/B=2, and log out. No new migrations, permissions or paid resources. 49/60 unchanged.


## Owner live populated Calendar visual acceptance — 2026-11-25

Owner launched the existing isolated loopback HTTPS smoke at port 55355; both startup preflights passed and the server started. Owner supplied separate Manager A and B Calendar screenshots. Both show authoritative game date 2000-01-01, four stages (Jan 1 world opening, Jan 2 A flat classic, Jan 3–4 B mountain tour). Manager A has only Jan 2 marked Accepted; Manager B has only Jan 3 and Jan 4 marked Accepted. Other rows show No accepted entry. This verifies the populated hosted read path and manager-specific entry indicators in the actual browser, alongside prior 9/9 offline tests. Both screenshots show the own-only checkbox unchecked: live filter interaction, populated Overview cards and live logout/replay are not separately evidenced by these screenshots. No claim of full original Calendar parity. Manager A screenshot shows browser certificate trust warning; resolve before any public deployment; no permission to bypass verification. Scoped populated Calendar data display accepted. Operational rider startlists, original race lifecycle and hybrid engine connection remain next priorities. No database writes, no new grants, no production changes. Overall 49/60 unchanged.
