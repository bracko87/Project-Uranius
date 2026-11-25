-- REVIEW ONLY: one-shot competitive synthetic archive run, NOT a new schema migration.
-- Must execute in one transaction using the dedicated TLS migrator. Every policy
-- below is transaction-local in effect: roll back rehearsal or drop before commit.
DO $first_hosted_race$
DECLARE
 t text;
 n integer;
 a constant uuid := '19000000-0000-4000-8000-000000000001';
 b constant uuid := '19000000-0000-4000-8000-000000000002';
 club_a constant uuid := '00000000-0000-4000-8000-000000000011';
 club_b constant uuid := '00000000-0000-4000-8000-000000000012';
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);
 PERFORM pg_advisory_xact_lock(410523);
 PERFORM uranius_private.assert_project();
 IF current_user<>'uranius_migrator' OR session_user<>current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 THEN RAISE EXCEPTION '023 isolated direct TLS role refused'; END IF;
 LOCK TABLE uranius_private.migration_ledger,uranius_catalog.riders,uranius_catalog.teams,
 uranius_catalog.team_owners,uranius_game.club_profiles,uranius_game.game_state IN SHARE MODE;
 IF (SELECT count(*) FROM uranius_private.migration_ledger)<>17
 OR (SELECT count(*) FROM uranius_catalog.riders)<>200
 OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2
 OR (SELECT count(*) FROM uranius_catalog.team_owners WHERE team_id IN (1,2))<>2
 OR (SELECT count(*) FROM uranius_game.club_profiles WHERE (team_id=1 AND club_id=club_a) OR (team_id=2 AND club_id=club_b))<>2
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 THEN RAISE EXCEPTION '023 baseline counts or clock refused'; END IF;
 IF EXISTS(
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
      ('018_synthetic_nine_skill_attributes.sql','622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc'),
      ('019_synthetic_race_world.sql','7e5f8a727dfc44784c0a8abf48c51b8ddfb19766a2cc319b7ff31686a068283b'),
      ('021_synthetic_startlists.sql','041964c176d2e647d13f7ef01d211757fc6738226f4679e18baea64b4df57186'),
      ('022_completed_race_archive.sql','5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d')
 )
 (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL
 (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected)
 ) THEN RAISE EXCEPTION '023 ledger mismatch'; END IF;
 FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists'] LOOP
   EXECUTE format('LOCK TABLE uranius_game.%I IN ACCESS EXCLUSIVE MODE',t);
   IF NOT EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='uranius_game'::regnamespace AND relname=t
      AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
   OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t)
       <>(CASE WHEN t='synthetic_race_startlists' THEN 0 ELSE 1 END)
   OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t AND (cmd<>'SELECT' OR roles<>ARRAY['uranius_smoke_reader']::name[]))
   THEN RAISE EXCEPTION '023 unexpected game policy or owner: %',t; END IF;
   EXECUTE format('CREATE POLICY uranius_023_temp_read ON uranius_game.%I FOR SELECT TO uranius_migrator USING (true)',t);
 END LOOP;
 LOCK TABLE uranius_private.synthetic_completed_race_runs IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_private.synthetic_completed_race_runs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='uranius_private.synthetic_completed_race_runs'::regclass AND tgname='synthetic_completed_run_validate' AND NOT tgisinternal AND tgenabled='O')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) t(role_name) WHERE
 has_any_column_privilege(role_name,'uranius_private.synthetic_completed_race_runs','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_table_privilege(role_name,'uranius_private.synthetic_completed_race_runs','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 OR has_any_column_privilege(role_name,'uranius_game.synthetic_race_startlists','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_table_privilege(role_name,'uranius_game.synthetic_race_startlists','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
 THEN RAISE EXCEPTION '023 archive or startlist security refused'; END IF;
 CREATE POLICY uranius_023_temp_read ON uranius_private.synthetic_completed_race_runs FOR SELECT TO uranius_migrator USING (true);
 IF (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>0
 OR (SELECT count(*) FROM uranius_game.races)<>3
 OR (SELECT count(*) FROM uranius_game.race_stages)<>4
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>2
 OR (SELECT count(*) FROM uranius_game.race_preparations)<>2
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>10
 OR (SELECT count(*) FROM uranius_game.synthetic_rider_identity)<>200
 OR NOT EXISTS(SELECT 1 FROM uranius_game.races WHERE id=a AND status='scheduled' AND metadata->>'uranius_synthetic'='true')
 OR (SELECT count(*) FROM uranius_game.race_stages WHERE race_id=a AND stage_number=1 AND stage_format='road_race' AND terrain_type='flat' AND distance_km=120 AND stage_date='2000-01-02')<>1
 OR (SELECT count(*) FROM uranius_game.race_preparations p JOIN uranius_game.race_team_entries e ON e.id=p.race_team_entry_id AND e.race_id=p.race_id AND e.club_id=p.club_id
   WHERE e.status='accepted' AND e.entry_source='uranius_synthetic_fixture' AND p.status='submitted' AND p.startlist_status='submitted'
   AND p.rider_count=0 AND p.total_cost_cash=0 AND p.finance_transaction_id IS NULL
   AND p.metadata->>'uranius_synthetic'='true' AND ((p.race_id=a AND p.club_id=club_a) OR (p.race_id=b AND p.club_id=club_b)))<>2
 OR (SELECT array_agg(rider_id ORDER BY selection_order) FROM uranius_game.synthetic_race_startlists WHERE race_id=a AND team_id=1 AND club_id=club_a) IS DISTINCT FROM ARRAY[1,2,3,4,5]
 OR (SELECT array_agg(rider_id ORDER BY selection_order) FROM uranius_game.synthetic_race_startlists WHERE race_id=b AND team_id=2 AND club_id=club_b) IS DISTINCT FROM ARRAY[11,12,13,14,15]
 THEN RAISE EXCEPTION '023 exact empty archive and existing fixture baseline refused'; END IF;
 -- Only one specific opponent entry, preparation, five selections and one run.
 CREATE POLICY uranius_023_temp_insert ON uranius_game.race_team_entries FOR INSERT TO uranius_migrator WITH CHECK (
 race_id='19000000-0000-4000-8000-000000000001' AND club_id='00000000-0000-4000-8000-000000000012' AND participating_club_id=club_id AND status='accepted' AND entry_source='uranius_synthetic_fixture');
 CREATE POLICY uranius_023_temp_insert ON uranius_game.race_preparations FOR INSERT TO uranius_migrator WITH CHECK (
 race_id='19000000-0000-4000-8000-000000000001' AND club_id='00000000-0000-4000-8000-000000000012' AND participating_club_id=club_id AND status='submitted' AND startlist_status='submitted' AND rider_count=0 AND total_cost_cash=0 AND finance_transaction_id IS NULL);
 CREATE POLICY uranius_023_temp_insert ON uranius_game.synthetic_race_startlists FOR INSERT TO uranius_migrator WITH CHECK (
 race_id='19000000-0000-4000-8000-000000000001' AND club_id='00000000-0000-4000-8000-000000000012' AND team_id=2 AND rider_id BETWEEN 11 AND 15 AND provenance='uranius_synthetic_fixture');
 CREATE POLICY uranius_023_temp_insert ON uranius_private.synthetic_completed_race_runs FOR INSERT TO uranius_migrator WITH CHECK (
 race_id='19000000-0000-4000-8000-000000000001' AND provenance='uranius_synthetic_review' AND contract_version=1 AND engine_lane='existing_v1');
 WITH e AS (
 INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status,entry_source)
 VALUES(a,club_b,club_b,'accepted','uranius_synthetic_fixture') RETURNING id
 )
 INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,race_team_entry_id,status,startlist_status,metadata)
 SELECT a,club_b,club_b,id,'submitted','submitted','{"uranius_synthetic":true}'::jsonb FROM e;
 INSERT INTO uranius_game.synthetic_race_startlists(race_id,club_id,team_id,rider_id,selection_order,role,provenance)
 SELECT a,club_id,team_id,rider_id,selection_order,role,provenance FROM uranius_game.synthetic_race_startlists WHERE race_id=b AND team_id=2;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>5 THEN RAISE EXCEPTION '023 opponent selection count mismatch'; END IF;
END
$first_hosted_race$;
