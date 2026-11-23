SELECT uranius_private.assert_project();

DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> current_user
     OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Uranius reconstruction role or server version mismatch';
  END IF;
  IF (SELECT count(*) FROM uranius_catalog.teams) <> 20
     OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
     OR (SELECT count(*) FROM uranius_catalog.stages) <> 3
     OR (SELECT count(*) FROM uranius_catalog.startlists) <> 450
     OR EXISTS (SELECT 1 FROM uranius_catalog.team_owners)
     OR EXISTS (SELECT 1 FROM uranius_game.club_profiles) THEN
    RAISE EXCEPTION 'Uranius synthetic foundation differs from the reviewed state';
  END IF;
END
$$;

CREATE TABLE uranius_game.stage_calendar (
  stage_id integer PRIMARY KEY REFERENCES uranius_catalog.stages,
  season_day integer NOT NULL CHECK (season_day > 0)
);
CREATE TABLE uranius_game.opening_balances (
  team_id integer PRIMARY KEY REFERENCES uranius_catalog.teams,
  credits bigint NOT NULL CHECK (credits >= 0)
);
CREATE TABLE uranius_private.synthetic_manager_slots (
  slot text PRIMARY KEY,
  team_id integer UNIQUE NOT NULL REFERENCES uranius_catalog.teams,
  CHECK ((slot = 'fixture-manager-a' AND team_id = 1)
      OR (slot = 'fixture-manager-b' AND team_id = 2))
);

ALTER TABLE uranius_game.stage_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_game.opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_private.synthetic_manager_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game.stage_calendar, uranius_game.opening_balances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON uranius_private.synthetic_manager_slots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON uranius_game.stage_calendar, uranius_game.opening_balances TO authenticated;

CREATE POLICY calendar_read ON uranius_game.stage_calendar FOR SELECT TO authenticated
  USING ((SELECT uranius_catalog.request_uid()) IS NOT NULL);
CREATE POLICY own_opening_balance ON uranius_game.opening_balances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners AS owner
    WHERE owner.team_id = opening_balances.team_id AND owner.user_id = (SELECT uranius_catalog.request_uid())
  ));

INSERT INTO uranius_game.club_profiles (team_id, club_id, country_code, created_at)
SELECT team_id,
       ('00000000-0000-4000-8000-' || lpad((team_id + 10)::text, 12, '0'))::uuid,
       CASE WHEN team_id % 2 = 1 THEN 'DE' ELSE 'FR' END,
       '2000-01-01 00:00:00+00'
FROM uranius_catalog.teams;

INSERT INTO uranius_game.stage_calendar VALUES (1, 7), (2, 8), (3, 9);
INSERT INTO uranius_game.opening_balances SELECT team_id, 10000 FROM uranius_catalog.teams;
INSERT INTO uranius_private.synthetic_manager_slots VALUES
  ('fixture-manager-a', 1), ('fixture-manager-b', 2);

-- Only the existing migration owner may bind separately verified synthetic Auth subjects.
CREATE FUNCTION uranius_private.bind_synthetic_managers(manager_a uuid, manager_b uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM uranius_private.assert_project();
  IF current_user <> 'uranius_migrator' OR session_user <> current_user
     OR manager_a IS NULL OR manager_b IS NULL OR manager_a = manager_b THEN
    RAISE EXCEPTION 'Restricted synthetic binding requires two distinct UUIDs';
  END IF;

  LOCK TABLE uranius_catalog.team_owners IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners
    WHERE (team_id = 1 AND user_id <> manager_a)
       OR (team_id = 2 AND user_id <> manager_b)
       OR (user_id = manager_a AND team_id <> 1)
       OR (user_id = manager_b AND team_id <> 2)
  ) THEN
    RAISE EXCEPTION 'Synthetic manager binding conflicts with existing ownership';
  END IF;

  INSERT INTO uranius_catalog.team_owners (team_id, user_id)
  SELECT team_id, CASE slot WHEN 'fixture-manager-a' THEN manager_a ELSE manager_b END
  FROM uranius_private.synthetic_manager_slots
  ON CONFLICT (team_id) DO NOTHING;
END
$$;

REVOKE ALL ON FUNCTION uranius_private.bind_synthetic_managers(uuid, uuid) FROM PUBLIC, anon, authenticated;
