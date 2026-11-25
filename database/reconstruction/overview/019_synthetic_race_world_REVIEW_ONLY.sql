-- REVIEW ONLY: not an authorization to seed hosted Uranius.
-- One atomic statement, exact isolated baseline, no scheduler or race engine activation.
DO $uranius_seed$
DECLARE
  clubs uuid[];
  t text;
  tables constant text[] := ARRAY['races','race_stages','race_team_entries','race_preparations'];
  race_a constant uuid := '19000000-0000-4000-8000-000000000001';
  race_b constant uuid := '19000000-0000-4000-8000-000000000002';
  race_world constant uuid := '19000000-0000-4000-8000-000000000003';
  entry_a constant uuid := '19000000-0000-4000-8001-000000000001';
  entry_b constant uuid := '19000000-0000-4000-8001-000000000002';
  n integer;
BEGIN
  PERFORM set_config('search_path','pg_catalog',true);
  PERFORM set_config('lock_timeout','5s',true);
  PERFORM pg_advisory_xact_lock(410519);
  PERFORM uranius_private.assert_project();
  IF current_user <> 'uranius_migrator' OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND
      (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 14
    OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
    OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
    OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1) <> 1
  THEN RAISE EXCEPTION 'Seed refused: isolated TLS baseline mismatch'; END IF;
  IF EXISTS (
    WITH expected(version,sha256) AS (VALUES
      ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
      ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
      ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
      ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
      ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
      ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
      ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
      ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
      ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37'),
      ('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'),
      ('013_squad_reader_grant.sql','8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859'),
      ('014_synthetic_rider_uuid.sql','f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f'),
      ('015_rider_uuid_owner_read.sql','71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e'),
      ('018_synthetic_nine_skill_attributes.sql','622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc')
    )
    (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
    UNION ALL
    (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected)
  ) THEN RAISE EXCEPTION 'Seed refused: exact history mismatch'; END IF;
  SELECT array_agg(club_id ORDER BY team_id) INTO clubs
  FROM uranius_game.club_profiles
  WHERE team_id IN (SELECT team_id FROM uranius_catalog.team_owners);
  IF cardinality(clubs) IS DISTINCT FROM 2 OR clubs[1]=clubs[2]
  THEN RAISE EXCEPTION 'Seed refused: two distinct mapped clubs required'; END IF;

  -- Preserve FORCE RLS throughout; only the dedicated migration role receives
  -- transactional SELECT and INSERT policies, dropped before statement completion.
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('LOCK TABLE uranius_game.%I IN ACCESS EXCLUSIVE MODE',t);
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
      WHERE ns.nspname='uranius_game' AND c.relname=t AND c.relrowsecurity AND c.relforcerowsecurity
      AND c.relowner=current_user::regrole)
      OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t)<>1
      OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t
        AND cmd='SELECT' AND roles=ARRAY['uranius_smoke_reader']::name[])
    THEN RAISE EXCEPTION 'Seed refused: unexpected RLS on %',t; END IF;
    EXECUTE format('CREATE POLICY uranius_seed_temporary_select ON uranius_game.%I FOR SELECT TO uranius_migrator USING (true)',t);
    EXECUTE format('SELECT count(*) FROM uranius_game.%I',t) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'Seed refused: % is not empty',t; END IF;
    EXECUTE format('CREATE POLICY uranius_seed_temporary_insert ON uranius_game.%I FOR INSERT TO uranius_migrator WITH CHECK (true)',t);
  END LOOP;

  INSERT INTO uranius_game.races(id,name,start_date,end_date,country_code,category,race_type,is_stage_race,stage_count,metadata)
  VALUES
    (race_a,'Uranius Fixture — Club A Flat Classic','2000-01-02','2000-01-02','DE','uncategorized','one_day',false,1,'{"uranius_synthetic":true}'::jsonb),
    (race_b,'Uranius Fixture — Club B Mountain Tour','2000-01-03','2000-01-04','AT','uncategorized','stage_race',true,2,'{"uranius_synthetic":true}'::jsonb),
    (race_world,'Uranius Fixture — World Opening Race','2000-01-01','2000-01-01','FR','uncategorized','one_day',false,1,'{"uranius_synthetic":true}'::jsonb);

  INSERT INTO uranius_game.race_stages(race_id,stage_number,stage_date,name,start_city,finish_city,distance_km,terrain_type,flat_pct,hilly_pct,mountain_pct,metadata)
  VALUES
    (race_a,1,'2000-01-02','Fixture flat stage','Fixture Start A','Fixture Finish A',120,'flat',100,0,0,'{"uranius_synthetic":true}'::jsonb),
    (race_b,1,'2000-01-03','Fixture rolling stage','Fixture Start B','Fixture Finish B',120,'hilly',40,60,0,'{"uranius_synthetic":true}'::jsonb),
    (race_b,2,'2000-01-04','Fixture mountain stage','Fixture Start C','Fixture Finish C',120,'mountain',20,20,60,'{"uranius_synthetic":true}'::jsonb),
    (race_world,1,'2000-01-01','Fixture opening stage','Fixture Start W','Fixture Finish W',120,'flat',100,0,0,'{"uranius_synthetic":true}'::jsonb);

  INSERT INTO uranius_game.race_team_entries(id,race_id,club_id,participating_club_id,status,entry_source)
  VALUES (entry_a,race_a,clubs[1],clubs[1],'accepted','uranius_synthetic_fixture'),
         (entry_b,race_b,clubs[2],clubs[2],'accepted','uranius_synthetic_fixture');

  -- Submitted test preparations exercise the accepted-entry boundary only.
  -- No rider startlists, costs, finance transactions or engine payloads are invented.
  INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,race_team_entry_id,status,startlist_status,metadata)
  VALUES (race_a,clubs[1],clubs[1],entry_a,'submitted','submitted','{"uranius_synthetic":true}'::jsonb),
         (race_b,clubs[2],clubs[2],entry_b,'submitted','submitted','{"uranius_synthetic":true}'::jsonb);

  IF (SELECT count(*) FROM uranius_game.races)<>3
    OR (SELECT count(*) FROM uranius_game.race_stages)<>4
    OR (SELECT count(*) FROM uranius_game.race_team_entries)<>2
    OR (SELECT count(*) FROM uranius_game.race_preparations p
      JOIN uranius_game.race_team_entries e ON e.id=p.race_team_entry_id AND e.race_id=p.race_id AND e.club_id=p.club_id
      WHERE e.status='accepted' AND p.status='submitted' AND p.startlist_status='submitted'
      AND p.rider_count=0 AND p.total_cost_cash=0 AND p.finance_transaction_id IS NULL)<>2
  THEN RAISE EXCEPTION 'Seed postcondition failed'; END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY uranius_seed_temporary_insert ON uranius_game.%I',t);
    EXECUTE format('DROP POLICY uranius_seed_temporary_select ON uranius_game.%I',t);
  END LOOP;
END
$uranius_seed$;
