-- REVIEW ONLY. Exact hosted upgrade and one synthetic opponent.
-- Must be in one direct TLS migrator transaction; preview transaction is rolled back.
DO $guard027$
DECLARE t text; n integer;
 a constant uuid:='19000000-0000-4000-8000-000000000001';
 b constant uuid:='19000000-0000-4000-8000-000000000002';
 club_a constant uuid:='00000000-0000-4000-8000-000000000011';
 club_b constant uuid:='00000000-0000-4000-8000-000000000012';
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410527);
 PERFORM uranius_private.assert_project();
 IF current_user<>'uranius_migrator' OR session_user<>current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_worker' AND NOT (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member='uranius_worker'::regrole)
 OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='uranius_worker')
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_scheduler')
 THEN RAISE EXCEPTION '027 isolated role boundary refused'; END IF;
 LOCK TABLE uranius_private.migration_ledger,uranius_catalog.riders,uranius_catalog.teams,
 uranius_catalog.team_owners,uranius_game.club_profiles,uranius_game.game_state IN SHARE MODE;
 IF (SELECT count(*) FROM uranius_private.migration_ledger)<>19
 OR (SELECT count(*) FROM uranius_catalog.riders)<>200
 OR (SELECT count(*) FROM uranius_catalog.team_owners WHERE team_id IN(1,2))<>2
 OR (SELECT count(*) FROM uranius_game.club_profiles WHERE (team_id=1 AND club_id=club_a) OR (team_id=2 AND club_id=club_b))<>2
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR EXISTS(WITH expected(version,sha256) AS (VALUES ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
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
('022_completed_race_archive.sql','5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d'),
('024_participant_replay_preview.sql','ee90f17d233680052b7fb281019467e7b6040f136371a52cd3686ded4102da55'),
('025_private_race_job_worker.sql','af4958b1b7e873058d0e687d5e4cc355808d8ccaceaca8a96b94c9ee1924baaf'))
 (SELECT * FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT * FROM expected))
 THEN RAISE EXCEPTION '027 ledger or fixture baseline refused'; END IF;
 FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists'] LOOP
  EXECUTE format('LOCK TABLE uranius_game.%I IN ACCESS EXCLUSIVE MODE',t);
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='uranius_game'::regnamespace AND relname=t AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
  OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t)<>(CASE WHEN t='synthetic_race_startlists' THEN 0 ELSE 1 END)
  OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t AND (cmd<>'SELECT' OR roles<>ARRAY['uranius_smoke_reader']::name[]))
  THEN RAISE EXCEPTION '027 unexpected game policy: %',t; END IF;
  EXECUTE format('CREATE POLICY uranius_027_temp_read ON uranius_game.%I FOR SELECT TO uranius_migrator USING (true)',t);
 END LOOP;
 LOCK TABLE uranius_jobs.race_jobs,uranius_private.synthetic_completed_race_runs IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_private.synthetic_completed_race_runs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs')<>2
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs' AND (roles<>ARRAY['uranius_worker']::name[] OR cmd NOT IN('SELECT','UPDATE')))
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='uranius_jobs' AND table_name='race_jobs' AND column_name='job_kind')
 THEN RAISE EXCEPTION '027 queue or archive security refused'; END IF;
 CREATE POLICY uranius_027_temp_read ON uranius_jobs.race_jobs FOR SELECT TO uranius_migrator USING (true);
 CREATE POLICY uranius_027_temp_read ON uranius_private.synthetic_completed_race_runs FOR SELECT TO uranius_migrator USING (true);
 IF (SELECT count(*) FROM uranius_jobs.race_jobs)<>1
 OR (SELECT count(*) FROM uranius_jobs.race_jobs j JOIN uranius_private.synthetic_completed_race_runs a ON a.stage_id=j.stage_id AND a.input_text=j.input_text AND a.output_text=j.output_text WHERE j.job_id='a8800680-3970-4826-aca7-aa0e72420f66' AND j.status='completed' AND j.attempt=1 AND j.output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed' AND a.run_id='ff57a18f-9eca-4c65-9692-5d9bec28b101')<>1
 OR (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>1
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>3
 OR (SELECT count(*) FROM uranius_game.race_preparations)<>3
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>15
 OR (SELECT count(*) FROM uranius_game.races)<>3 OR (SELECT count(*) FROM uranius_game.race_stages)<>4
 OR NOT EXISTS(SELECT 1 FROM uranius_game.race_stages s JOIN uranius_game.races r ON r.id=s.race_id WHERE s.id='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8' AND s.race_id=b AND s.stage_number=1 AND s.stage_date='2000-01-03' AND s.terrain_type='hilly' AND s.distance_km=120 AND s.stage_format='road_race' AND r.status='scheduled' AND r.metadata->>'uranius_synthetic'='true' AND s.metadata->>'uranius_synthetic'='true')
 OR (SELECT count(*) FROM uranius_game.race_team_entries WHERE race_id=b AND club_id=club_b AND status='accepted')<>1
 OR (SELECT count(*) FROM uranius_game.race_team_entries WHERE race_id=b)<>1
 OR (SELECT array_agg(rider_id ORDER BY selection_order) FROM uranius_game.synthetic_race_startlists WHERE race_id=b AND team_id=2 AND club_id=club_b) IS DISTINCT FROM ARRAY[11,12,13,14,15]
 OR (SELECT array_agg(rider_id ORDER BY selection_order) FROM uranius_game.synthetic_race_startlists WHERE race_id=a AND team_id=1 AND club_id=club_a) IS DISTINCT FROM ARRAY[1,2,3,4,5]
 THEN RAISE EXCEPTION '027 exact completed job or Mountain Tour baseline refused'; END IF;
 CREATE POLICY uranius_027_temp_insert ON uranius_game.race_team_entries FOR INSERT TO uranius_migrator WITH CHECK(race_id='19000000-0000-4000-8000-000000000002' AND club_id='00000000-0000-4000-8000-000000000011' AND participating_club_id=club_id AND status='accepted' AND entry_source='uranius_synthetic_fixture');
 CREATE POLICY uranius_027_temp_insert ON uranius_game.race_preparations FOR INSERT TO uranius_migrator WITH CHECK(race_id='19000000-0000-4000-8000-000000000002' AND club_id='00000000-0000-4000-8000-000000000011' AND participating_club_id=club_id AND status='submitted' AND startlist_status='submitted' AND rider_count=0 AND total_cost_cash=0 AND finance_transaction_id IS NULL);
 CREATE POLICY uranius_027_temp_insert ON uranius_game.synthetic_race_startlists FOR INSERT TO uranius_migrator WITH CHECK(race_id='19000000-0000-4000-8000-000000000002' AND club_id='00000000-0000-4000-8000-000000000011' AND team_id=1 AND rider_id BETWEEN 1 AND 5 AND provenance='uranius_synthetic_fixture');
 WITH e AS (INSERT INTO uranius_game.race_team_entries(race_id,club_id,participating_club_id,status,entry_source)
 VALUES(b,club_a,club_a,'accepted','uranius_synthetic_fixture') RETURNING id)
 INSERT INTO uranius_game.race_preparations(race_id,club_id,participating_club_id,race_team_entry_id,status,startlist_status,metadata)
 SELECT b,club_a,club_a,id,'submitted','submitted','{"uranius_synthetic":true}'::jsonb FROM e;
 INSERT INTO uranius_game.synthetic_race_startlists(race_id,club_id,team_id,rider_id,selection_order,role,provenance)
 SELECT b,club_id,team_id,rider_id,selection_order,role,provenance FROM uranius_game.synthetic_race_startlists WHERE race_id=a AND team_id=1 AND club_id=club_a;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>5 THEN RAISE EXCEPTION '027 opponent roster mismatch'; END IF;
END $guard027$;
-- REVIEW ONLY: extend 025 private queue without modifying its completed job.
-- Standalone contract component, not an authorized hosted migration.
-- Hosted wrapper must assert exact project/ledger/ACLs and acquire an exclusive lock.
ALTER TABLE uranius_jobs.race_jobs
 ADD COLUMN job_kind text NOT NULL DEFAULT 'verified_repeat',
 ADD COLUMN calendar_date date,
 ALTER COLUMN expected_output_sha256 DROP NOT NULL,
 DROP CONSTRAINT race_jobs_check2,
 ADD CONSTRAINT race_job_kind_valid CHECK(
  (job_kind='verified_repeat' AND expected_output_sha256 IS NOT NULL AND calendar_date IS NULL)
  OR (job_kind='calendar_review' AND expected_output_sha256 IS NULL AND calendar_date IS NOT NULL)),
 ADD CONSTRAINT race_job_result_valid CHECK(
  (status='completed' AND output_text IS NOT NULL AND output_sha256 IS NOT NULL AND completed_at IS NOT NULL
   AND (job_kind='calendar_review' OR output_sha256=expected_output_sha256)
   AND output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex'))
  OR (status<>'completed' AND output_text IS NULL AND output_sha256 IS NULL AND completed_at IS NULL));
CREATE UNIQUE INDEX race_jobs_one_calendar_stage ON uranius_jobs.race_jobs(stage_id) WHERE job_kind='calendar_review';
-- Old guard continues to enforce immutable input, leases and terminal states.
-- New columns are NOT in worker's allowed UPDATE list.
-- No scheduler grant, new role or game-table permissions.
CREATE FUNCTION uranius_jobs.guard_calendar_job() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $calendar027$
DECLARE i jsonb; o jsonb;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.job_kind,NEW.calendar_date) IS DISTINCT FROM (OLD.job_kind,OLD.calendar_date)
 THEN RAISE EXCEPTION 'Immutable calendar identity changed'; END IF;
 IF NEW.job_kind<>'calendar_review' THEN RETURN NEW; END IF;
 i:=NEW.input_text::jsonb;
 IF i->>'stageId' IS DISTINCT FROM NEW.stage_id::text
 OR i->>'stageFormat' IS DISTINCT FROM 'road_race'
 OR i->>'seed' IS DISTINCT FROM ('uranius-calendar-v1:'||NEW.stage_id::text||':'||NEW.calendar_date::text)
 OR i->'orders' IS DISTINCT FROM '[]'::jsonb
 OR jsonb_typeof(i->'riders') IS DISTINCT FROM 'array'
 OR jsonb_typeof(i->'teams') IS DISTINCT FROM 'array'
 OR jsonb_array_length(i->'riders')<>10 OR jsonb_array_length(i->'teams')<>2
 THEN RAISE EXCEPTION 'Invalid calendar input identity'; END IF;
 IF NEW.status='completed' THEN
 o:=NEW.output_text::jsonb;
 IF o->>'raceId' IS DISTINCT FROM i->>'raceId'
 OR o->>'stageId' IS DISTINCT FROM i->>'stageId'
 OR o->>'seed' IS DISTINCT FROM i->>'seed'
 OR o->>'engineVersion' IS DISTINCT FROM 'race_engine_ts_v1'
 OR o->>'simulationMode' IS DISTINCT FROM 'deterministic_road_race_v1'
 OR jsonb_typeof(o->'finalRiderStates') IS DISTINCT FROM 'array'
 OR jsonb_array_length(o->'finalRiderStates')<>10
 OR jsonb_typeof(o->'snapshots') IS DISTINCT FROM 'array' OR jsonb_array_length(o->'snapshots')<2
 OR jsonb_typeof(o->'events') IS DISTINCT FROM 'array'
 OR (SELECT count(DISTINCT x->>'riderId') FROM jsonb_array_elements(o->'finalRiderStates') x)<>10
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(o->'finalRiderStates') x WHERE NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(i->'riders') y WHERE y->>'riderId'=x->>'riderId' AND y->>'teamId'=x->>'teamId'))
 THEN RAISE EXCEPTION 'Invalid calendar result identity'; END IF;
 END IF;
 RETURN NEW;
END $calendar027$;
REVOKE ALL ON FUNCTION uranius_jobs.guard_calendar_job() FROM PUBLIC,anon,authenticated,uranius_smoke_reader,uranius_worker;
CREATE TRIGGER guard_calendar_job BEFORE INSERT OR UPDATE ON uranius_jobs.race_jobs
 FOR EACH ROW EXECUTE FUNCTION uranius_jobs.guard_calendar_job();

CREATE POLICY uranius_027_temp_insert ON uranius_jobs.race_jobs FOR INSERT TO uranius_migrator WITH CHECK(stage_id='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8' AND job_kind='calendar_review' AND calendar_date='2000-01-03' AND expected_output_sha256 IS NULL AND status='queued' AND attempt=0);
