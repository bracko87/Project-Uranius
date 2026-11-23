BEGIN;
DO $$
BEGIN
  IF inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
     OR current_database() !~ '^uranius_006_test_[a-z0-9]+$' THEN
    RAISE EXCEPTION 'Disposable loopback database required';
  END IF;
  IF (SELECT count(*) FROM uranius_private.synthetic_manager_slots) <> 2
     OR (SELECT count(*) FROM uranius_game.club_profiles) <> 20
     OR (SELECT array_agg(season_day ORDER BY stage_id) FROM uranius_game.stage_calendar) <> ARRAY[7,8,9]
     OR (SELECT count(*) FROM uranius_game.opening_balances WHERE credits=10000) <> 20
     OR (SELECT count(*) FROM uranius_catalog.startlists) <> 450
     OR EXISTS (SELECT 1 FROM uranius_catalog.team_owners)
     OR has_schema_privilege('anon', 'uranius_game', 'USAGE')
     OR has_schema_privilege('authenticated', 'uranius_private', 'USAGE')
     OR has_function_privilege('authenticated', 'uranius_private.bind_synthetic_managers(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected world seed or grants';
  END IF;
END
$$;

SET SESSION AUTHORIZATION uranius_migrator;
SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);
SELECT uranius_private.bind_synthetic_managers('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
SELECT uranius_private.bind_synthetic_managers('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
DO $$
BEGIN
  IF (SELECT count(*) FROM uranius_catalog.team_owners) <> 2 THEN
    RAISE EXCEPTION 'Repeated bind duplicated ownership';
  END IF;
  BEGIN
    PERFORM uranius_private.bind_synthetic_managers('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Conflicting bind succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Synthetic manager binding conflicts with existing ownership' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM uranius_private.bind_synthetic_managers('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Duplicate subject accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Restricted synthetic binding requires two distinct UUIDs' THEN RAISE; END IF;
  END;
END
$$;
RESET SESSION AUTHORIZATION;

SET LOCAL ROLE authenticated;
DO $$
DECLARE manager integer;
BEGIN
  FOR manager IN 1..2 LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',
      '00000000-0000-4000-8000-00000000000' || manager)::text, true);
    IF (SELECT array_agg(team_id) FROM uranius_game.opening_balances) IS DISTINCT FROM ARRAY[manager]
       OR (SELECT count(*) FROM uranius_game.stage_calendar) <> 3
       OR (SELECT count(*) FROM uranius_catalog.riders WHERE team_id=manager) <> 10
       OR EXISTS (SELECT 1 FROM uranius_catalog.riders WHERE team_id<>manager)
       OR (SELECT count(*) FROM uranius_game.clubs) <> 1
       OR uranius_game.get_my_club_id() IS DISTINCT FROM
          ('00000000-0000-4000-8000-0000000000' || (10+manager))::uuid THEN
      RAISE EXCEPTION 'Cross-manager or own-scope snapshot mismatch';
    END IF;
  END LOOP;
END
$$;
ROLLBACK;
