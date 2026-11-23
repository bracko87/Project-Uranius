-- Disposable local PostgreSQL test. Fixture rows are rolled back.
BEGIN;
DO $$
BEGIN
  IF inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
     OR current_database() !~ '^uranius_005_test_[a-z0-9]+$' THEN
    RAISE EXCEPTION 'Disposable loopback database required';
  END IF;
  IF (SELECT count(*) FROM uranius_catalog.teams) <> 20
     OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
     OR EXISTS (SELECT 1 FROM pg_class
          WHERE relnamespace = 'uranius_private'::regnamespace
            AND relkind = 'r' AND (NOT relrowsecurity OR relforcerowsecurity))
     OR has_schema_privilege('anon', 'uranius_game', 'USAGE')
     OR has_schema_privilege('authenticated', 'uranius_private', 'USAGE')
     OR has_table_privilege('authenticated', 'uranius_game.club_profiles', 'INSERT,UPDATE,DELETE,TRUNCATE')
     OR has_function_privilege('anon', 'uranius_game.get_my_club_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected counts or grants';
  END IF;
END
$$;

INSERT INTO uranius_catalog.team_owners VALUES
  (1, '00000000-0000-4000-8000-000000000001'),
  (2, '00000000-0000-4000-8000-000000000002');
INSERT INTO uranius_game.club_profiles (team_id, club_id, country_code) VALUES
  (1, '00000000-0000-4000-8000-000000000011', 'DE'),
  (2, '00000000-0000-4000-8000-000000000012', 'FR');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001"}', true);
DO $$
BEGIN
  IF uranius_game.get_my_club_id() IS DISTINCT FROM '00000000-0000-4000-8000-000000000011'::uuid
     OR (SELECT count(*) FROM uranius_game.clubs) <> 1
     OR (SELECT count(*) FROM uranius_game.club_profiles) <> 1 THEN
    RAISE EXCEPTION 'Manager A visibility mismatch';
  END IF;
END
$$;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002"}', true);
DO $$
BEGIN
  IF uranius_game.get_my_club_id() IS DISTINCT FROM '00000000-0000-4000-8000-000000000012'::uuid
     OR (SELECT count(*) FROM uranius_game.clubs) <> 1 THEN
    RAISE EXCEPTION 'Manager B visibility mismatch';
  END IF;
END
$$;

SELECT set_config('request.jwt.claims', '{"user_metadata":{"sub":"00000000-0000-4000-8000-000000000001"}}', true);
DO $$
BEGIN
  IF uranius_game.get_my_club_id() IS NOT NULL OR EXISTS (SELECT 1 FROM uranius_game.clubs) THEN
    RAISE EXCEPTION 'Unowned claim exposed club';
  END IF;
END
$$;
ROLLBACK;
