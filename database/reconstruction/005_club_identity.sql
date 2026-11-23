SELECT uranius_private.assert_project();

DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> 'uranius_migrator'
     OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Uranius reconstruction role or server version mismatch';
  END IF;
  IF to_regnamespace('uranius_game') IS NOT NULL THEN
    RAISE EXCEPTION 'Uranius game schema already exists';
  END IF;
END
$$;

-- Preserve owner access for the authoritative migration ledger.
ALTER TABLE uranius_private.project_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_private.migration_ledger ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA uranius_game;
REVOKE ALL ON SCHEMA uranius_game FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA uranius_game TO authenticated;

CREATE TABLE uranius_game.club_profiles (
  team_id integer PRIMARY KEY REFERENCES uranius_catalog.teams (team_id),
  club_id uuid NOT NULL UNIQUE,
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  logo_path text,
  primary_color text,
  secondary_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE uranius_game.club_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game.club_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON uranius_game.club_profiles TO authenticated;

CREATE POLICY own_club_profile ON uranius_game.club_profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners AS owner
    WHERE owner.team_id = club_profiles.team_id
      AND owner.user_id = (SELECT uranius_catalog.request_uid())
  ));

-- Initial main-club projection for the login gate and club-context consumers.
CREATE VIEW uranius_game.clubs WITH (security_invoker = true) AS
SELECT p.club_id AS id, o.user_id AS owner_user_id, t.label AS name,
       p.country_code, p.logo_path, p.primary_color, p.secondary_color,
       'main'::text AS club_type, NULL::uuid AS parent_club_id, p.created_at
FROM uranius_game.club_profiles AS p
JOIN uranius_catalog.teams AS t USING (team_id)
JOIN uranius_catalog.team_owners AS o USING (team_id);

REVOKE ALL ON uranius_game.clubs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON uranius_game.clubs TO authenticated;

CREATE FUNCTION uranius_game.get_my_club_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
RETURN (
  SELECT id
  FROM uranius_game.clubs
  WHERE owner_user_id = (SELECT uranius_catalog.request_uid())
  ORDER BY created_at, id
  LIMIT 1
);

REVOKE ALL ON FUNCTION uranius_game.get_my_club_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION uranius_game.get_my_club_id() TO authenticated;
