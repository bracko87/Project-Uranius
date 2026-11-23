-- Uranius 012: REVIEW_ONLY_NOT_APPROVED. NEVER apply to a hosted database.
-- Disposable PostgreSQL 17 grant/RLS rehearsal for reconstructed race read models.
-- Requires the separately reviewed 010 race schema with all four FORCE RLS tables.
-- This transaction ALWAYS ROLLS BACK; it never creates a live role grant or policy.
BEGIN;
DO $gate$ BEGIN
 IF to_regclass('uranius_game.races') IS NULL OR
    to_regclass('uranius_game.race_stages') IS NULL OR
    to_regclass('uranius_game.race_team_entries') IS NULL OR
    to_regclass('uranius_game.race_preparations') IS NULL OR
    to_regprocedure('uranius_game.get_my_club_id()') IS NULL OR
    NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader') THEN
    RAISE EXCEPTION 'Original race schema or verified manager resolver missing';
 END IF;
END $gate$;

-- Global race descriptions are intentionally reader-visible: the original
-- Today Races card is a global world-stage listing, not a private application.
CREATE POLICY uranius_races_reader ON uranius_game.races
  FOR SELECT TO uranius_smoke_reader USING (true);
CREATE POLICY uranius_race_stages_reader ON uranius_game.race_stages
  FOR SELECT TO uranius_smoke_reader USING (true);

-- Private accepted team entries and preparations remain owner-scoped.
-- This role receives authenticated subject only inside the trusted server SQL.
CREATE POLICY uranius_entries_owner ON uranius_game.race_team_entries
  FOR SELECT TO uranius_smoke_reader
  USING (club_id = (SELECT uranius_game.get_my_club_id()));
CREATE POLICY uranius_preparations_owner ON uranius_game.race_preparations
  FOR SELECT TO uranius_smoke_reader
  USING (club_id = (SELECT uranius_game.get_my_club_id()));

GRANT SELECT (id, name, category, country_code, status)
  ON uranius_game.races TO uranius_smoke_reader;
GRANT SELECT (race_id, stage_number, stage_date, stage_format)
  ON uranius_game.race_stages TO uranius_smoke_reader;
GRANT SELECT (id, race_id, club_id, status)
  ON uranius_game.race_team_entries TO uranius_smoke_reader;
GRANT SELECT (id, race_id, club_id, status, startlist_status, updated_at)
  ON uranius_game.race_preparations TO uranius_smoke_reader;

-- No user or anonymous privileges, no direct changes or public Data API.
-- This file is NOT a migration, and intentionally rolls back all changes.
ROLLBACK;
