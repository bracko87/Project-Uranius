# Uranius 017 — Original nine-skill contract bridge (SOURCE-ONLY, READ-ONLY)

Date: 2026-11-24
Status: **Code committed; local tests and live UI acceptance still pending. No database migration has been created or approved.**

## Inspected original contract

The recovered source `src/features/squad/types.ts`, `RiderDetails`, declares exactly these nine skills: `sprint`, `climbing`, `time_trial`, `endurance`, `flat`, `recovery`, `resistance`, `race_iq`, `teamwork`. The original rider contract also defines a UUID identity, country, full name, role, birth date, morale, potential, overall and other optional health/contract/economics fields.

The separate race-engine `RiderAttributes` type uses different names and additional attributes including `stamina` and `acceleration`. **Do not conflate the game UI `RiderDetails` taxonomy with the race engine or assume that `stamina` equals `endurance`.** No conversion formula has been source-verified.

## Isolated 013–016 data availability

The hosted isolated `uranius_catalog.riders` currently stores `rider_id, team_id, label, flat, climbing, stamina, resistance`, and migration 014/015 exposes an owner-protected *synthetic* `rider_uuid`. Therefore exactly **three of the original nine skills** can be shown by their unmodified same-name catalog values: `flat`, `climbing`, `resistance`. The other six must be `null` / UI `Unavailable`, never zero, guessed, sampled, or derived from stamina or other attributes.

No actual original-game rider profiles were imported into Uranius. The original fields do not exist in the isolated database. Treat a synthetic generated UUID as a stable internal identity only, not as evidence of original player identity.

## Implemented

- `database/reconstruction/squad/original-nine-skill-availability.mjs`: frozen nine-key source contract, exact three same-name source mappings, six missing values with provenance, and a separate explicitly non-equivalent synthetic stamina field. Requires a verified, valid owner-scoped rider row.
- `database/synthetic-world/hosted-smoke-client.tsx`: adds a read-only nine-skill availability panel within the existing local HTTPS Squad rider profile. It preserves the original four available synthetic skill metrics and synthetic UUID, with explicit unavailability warnings and no editing options.
- `tests/uraniusOriginalNineSkillAvailability.test.mjs`: four new source/order, fidelity, strict-validation, and UI fallback tests. The existing Squad tests and bundle check should be rerun.
- `.github/workflows/uranius-squad-uuid-checks.yml`: includes the new source-fidelity tests; GitHub Actions results not confirmed.

## Next validation

From the existing Windows project checkout:
```bat
git pull origin main
node --test tests\uraniusOriginalNineSkillAvailability.test.mjs tests\uraniusSquadUuidRouteIsolation.test.mjs tests\uraniusSquadUuidIntegrationBoundary.test.mjs tests\uraniusSquadRouteIsolation.test.mjs tests\uraniusSquadHostedFrontendBoundary.test.mjs tests\uraniusSquadPreviewReview.test.mjs tests\uraniusSquadHttpsStartupPreflight.test.mjs tests\uraniusSquadHostedBundle.test.mjs
```

Then restart the already-approved **local-only** HTTPS runner and open the Squad profile for each manager: there must be nine named original-skill slots, only Climbing/Flat/Resistance populated from isolated values, remaining six labeled Unavailable, plus the separate four-skill synthetic summary. No public API or production changes.

## Future original profile reconstruction (separate milestones)

1. **017 current:** source-faithful nine-skill UI availability with no fabricated data.
2. **Future 018:** review-only proposal for a separate *synthetic-only* per-rider attribute storage model with one-to-one UUID identity, nullable skills and explicit provenance for each supplied value, ownership RLS and optional role/health metadata. Do not fill six missing skills with synthetic estimates unless a separate user-approved synthetic game design explicitly chooses to do so and labels the result as synthetic.
3. **Future 019:** after isolated native PostgreSQL 17 tests, frozen exact manifest and separate owner approval, install a restricted reader for genuinely provided profile attributes. Only then change the HTTPS reader to load those attributes. Never treat migration 015 approval as permission for more schema writes.
4. **Beyond:** design separate authorized age/nationality/role/health/contract systems with trustworthy source records, transactional validation and gameplay tests. These are not completed by the nine-skill view.

Original ProPeloton production is excluded from every hosted write. Never claim the full rider profile is complete while six of nine skills and other data are unavailable.
