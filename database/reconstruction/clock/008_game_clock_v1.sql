-- REVIEW-ONLY candidate, NOT approved for hosted execution.
-- Version: 008_game_clock_v1.sql; project: sdtsivgtcaoaeoihcwzd; PostgreSQL 17.
-- Must execute atomically as uranius_migrator under a separately reviewed,
-- target-pinned management wrapper. No public Data API exposure or clock jobs.
SELECT uranius_private.assert_project();

DO $uranius_008_preflight$
BEGIN
  PERFORM set_config('search_path', 'pg_catalog', true);
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM pg_advisory_xact_lock(410501);
  IF current_user <> 'uranius_migrator'
     OR session_user NOT IN ('uranius_migrator', 'postgres')
     OR current_database() <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR current_setting('uranius.approved_project_ref', true) <> 'sdtsivgtcaoaeoihcwzd' THEN
    RAISE EXCEPTION 'Clock migration requires reviewed Uranius owner session';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
     OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 7
     OR EXISTS (
       SELECT * FROM (VALUES
         ('001_identity.sql', '87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
         ('002_reference_schema.sql', '6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
         ('003_access.sql', 'b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
         ('004_synthetic_reference.sql', 'e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
         ('005_club_identity.sql', '9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
         ('006_synthetic_world.sql', '56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
         ('007_smoke_reader.sql', 'dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b')
       ) AS expected(version, sha256)
       EXCEPT SELECT version, sha256 FROM uranius_private.migration_ledger
     )
     OR to_regclass('uranius_game.game_state') IS NOT NULL
     OR to_regprocedure('uranius_game.get_current_game_date_date()') IS NOT NULL
     OR to_regprocedure('uranius_game.get_current_game_date_parts()') IS NOT NULL
     OR to_regprocedure('uranius_game.get_current_game_date()') IS NOT NULL
     OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
     OR (SELECT count(*) FROM uranius_game.stage_calendar) <> 3 THEN
    RAISE EXCEPTION 'Clock schema or seven-entry ledger differs from approved baseline';
  END IF;
END
$uranius_008_preflight$;

-- Frozen, synthetic season-one clock. This is NOT a production clock service.
-- No UPDATE/INSERT/DELETE grants, clock triggers, workers or speed configuration.
CREATE TABLE uranius_game.game_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  season_number integer NOT NULL CHECK (season_number BETWEEN 1 AND 8000),
  month_number smallint NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 31),
  hour_number smallint NOT NULL CHECK (hour_number BETWEEN 0 AND 23),
  minute_number smallint NOT NULL CHECK (minute_number BETWEEN 0 AND 59),
  is_paused boolean NOT NULL DEFAULT true CHECK (is_paused),
  CONSTRAINT valid_game_calendar_day CHECK (
    make_date(1999 + season_number, month_number, day_number) IS NOT NULL
  )
);

ALTER TABLE uranius_game.game_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game.game_state FROM PUBLIC, anon, authenticated, uranius_smoke_reader;
GRANT SELECT (id, season_number, month_number, day_number, hour_number, minute_number, is_paused)
  ON uranius_game.game_state TO authenticated;

CREATE POLICY game_state_manager_read ON uranius_game.game_state
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners AS owner
    WHERE owner.user_id = (SELECT uranius_catalog.request_uid())
  ));

INSERT INTO uranius_game.game_state
  (id, season_number, month_number, day_number, hour_number, minute_number, is_paused)
VALUES (true, 1, 1, 1, 0, 0, true);

-- Original consumer signatures from the later authoritative sanitized baseline.
CREATE FUNCTION uranius_game.get_current_game_date_date()
RETURNS date LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $clock_date$
  SELECT make_date(1999 + gs.season_number, gs.month_number, gs.day_number)
  FROM uranius_game.game_state AS gs
  WHERE gs.id = true LIMIT 1
$clock_date$;

CREATE FUNCTION uranius_game.get_current_game_date_parts()
RETURNS TABLE (current_game_date date, season_number integer, month_number integer, day_number integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $clock_parts$
  SELECT make_date(1999 + gs.season_number, gs.month_number, gs.day_number),
         gs.season_number, gs.month_number::integer, gs.day_number::integer
  FROM uranius_game.game_state AS gs
  WHERE gs.id = true LIMIT 1
$clock_parts$;

CREATE FUNCTION uranius_game.get_current_game_date()
RETURNS TABLE (season_number integer, month_number smallint, day_number smallint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $clock_triple$
  SELECT gs.season_number, gs.month_number, gs.day_number
  FROM uranius_game.game_state AS gs
  WHERE gs.id = true LIMIT 1
$clock_triple$;

REVOKE ALL ON FUNCTION uranius_game.get_current_game_date_date() FROM PUBLIC, anon, authenticated, uranius_smoke_reader;
REVOKE ALL ON FUNCTION uranius_game.get_current_game_date_parts() FROM PUBLIC, anon, authenticated, uranius_smoke_reader;
REVOKE ALL ON FUNCTION uranius_game.get_current_game_date() FROM PUBLIC, anon, authenticated, uranius_smoke_reader;
GRANT EXECUTE ON FUNCTION uranius_game.get_current_game_date_date() TO authenticated;
GRANT EXECUTE ON FUNCTION uranius_game.get_current_game_date_parts() TO authenticated;
GRANT EXECUTE ON FUNCTION uranius_game.get_current_game_date() TO authenticated;

-- The separately reviewed atomic migration runner must record its canonical
-- 008_game_clock_v1.sql SHA-256 in uranius_private.migration_ledger.
-- This source intentionally does not insert a self-referential hash.
