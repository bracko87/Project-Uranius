-- REVIEW ONLY. Participant-only, immutable derived display; no raw archive grant.
DO $result024$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410524);
 PERFORM uranius_private.assert_project();
 IF current_user<>'uranius_migrator' OR session_user<>current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>17
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR to_regclass('uranius_game.synthetic_race_replay_preview') IS NOT NULL
 THEN RAISE EXCEPTION '024 isolated baseline refused'; END IF;
 IF EXISTS(WITH expected(version,sha256) AS (VALUES ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
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
('022_completed_race_archive.sql','5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d'))
 (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL
 (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected))
 THEN RAISE EXCEPTION '024 exact ledger mismatch'; END IF;
 LOCK TABLE uranius_private.synthetic_completed_race_runs IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_private.synthetic_completed_race_runs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 THEN RAISE EXCEPTION '024 archive security refused'; END IF;
 CREATE POLICY uranius_024_temp_read ON uranius_private.synthetic_completed_race_runs FOR SELECT TO uranius_migrator USING (run_id='ff57a18f-9eca-4c65-9692-5d9bec28b101');
 CREATE TABLE uranius_game.synthetic_race_replay_preview (
 run_id uuid PRIMARY KEY REFERENCES uranius_private.synthetic_completed_race_runs(run_id) ON DELETE RESTRICT,
 race_id uuid NOT NULL REFERENCES uranius_game.races(id) ON DELETE RESTRICT,
 stage_id uuid NOT NULL REFERENCES uranius_game.race_stages(id) ON DELETE RESTRICT,
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='object' AND octet_length(packet::text)<=524288)
 );
 REVOKE ALL ON uranius_game.synthetic_race_replay_preview FROM PUBLIC,anon,authenticated,uranius_smoke_reader;
 INSERT INTO uranius_game.synthetic_race_replay_preview(run_id,race_id,stage_id,packet)
 SELECT a.run_id,a.race_id,a.stage_id,jsonb_build_object(
 'runId',a.run_id,'raceId',a.race_id,'stageId',a.stage_id,'title','Uranius Fixture — Club A Flat Classic',
 'kind','syntheticRaceReplay','distanceKm',(a.input_text::jsonb->>'distanceKm')::numeric,
 'classification',(SELECT jsonb_agg(jsonb_build_object('rank',(x->>'finishPosition')::int,'rider',x->>'riderName','team',x->>'teamName','seconds',(x->>'finishTimeSeconds')::numeric) ORDER BY (x->>'finishPosition')::int) FROM jsonb_array_elements(a.output_text::jsonb->'finalRiderStates') x),
 'frames',(SELECT jsonb_agg(jsonb_build_object('second',(f->>'raceSecond')::numeric,'km',(f->>'km')::numeric,'groups',(SELECT jsonb_agg(jsonb_build_object('id',g->>'groupId','type',g->>'groupType','km',(g->>'distanceKm')::numeric,'speed',(g->>'speedKmh')::numeric,'gap',(g->>'gapFromLeaderSeconds')::numeric,'count',jsonb_array_length(g->'riderIds'),'active',g->'active') ORDER BY g->>'groupId') FROM jsonb_array_elements(f->'groups') g)) ORDER BY (f->>'frameNumber')::int) FROM jsonb_array_elements(a.output_text::jsonb->'snapshots') f),
 'events',(SELECT jsonb_agg(jsonb_build_object('sequence',(e->>'sequenceNumber')::int,'second',(e->>'raceSecond')::numeric,'km',(e->>'kmMarker')::numeric,'type',e->>'eventType') ORDER BY (e->>'sequenceNumber')::int) FROM jsonb_array_elements(a.output_text::jsonb->'events') e)
 ) AS packet FROM uranius_private.synthetic_completed_race_runs a WHERE a.run_id='ff57a18f-9eca-4c65-9692-5d9bec28b101' AND a.race_id='19000000-0000-4000-8000-000000000001' AND a.provenance='uranius_synthetic_review' AND a.input_sha256='a4b666233b28e829ca55f3f3ca46f8cfd881eaa992897f70abc1c9b7fafd81bf' AND a.output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed';
 IF (SELECT count(*) FROM uranius_game.synthetic_race_replay_preview WHERE jsonb_array_length(packet->'classification')=10 AND jsonb_array_length(packet->'frames')=347 AND jsonb_array_length(packet->'events')=12)<>1
 THEN RAISE EXCEPTION '024 source archive mismatch'; END IF;
 DROP POLICY uranius_024_temp_read ON uranius_private.synthetic_completed_race_runs;
 ALTER TABLE uranius_game.synthetic_race_replay_preview ENABLE ROW LEVEL SECURITY;
 ALTER TABLE uranius_game.synthetic_race_replay_preview FORCE ROW LEVEL SECURITY;
 GRANT SELECT (race_id,packet) ON uranius_game.synthetic_race_replay_preview TO uranius_smoke_reader;
 CREATE POLICY participant_replay_read ON uranius_game.synthetic_race_replay_preview FOR SELECT TO uranius_smoke_reader USING (
 EXISTS(SELECT 1 FROM uranius_game.race_team_entries e WHERE e.race_id=synthetic_race_replay_preview.race_id AND e.club_id=(SELECT uranius_game.get_my_club_id()) AND e.status='accepted'));
END $result024$;
