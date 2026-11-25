-- REVIEW ONLY: one private deterministic repeat job; no scheduler or official effects.
DO $guard025$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410525);
 PERFORM uranius_private.assert_project();
 IF current_user<>'uranius_migrator' OR session_user<>current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
 OR NOT EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_worker' AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='uranius_worker')
 OR to_regnamespace('uranius_jobs') IS NOT NULL
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>18
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 THEN RAISE EXCEPTION '025 isolated baseline refused'; END IF;
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
('022_completed_race_archive.sql','5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d'),
('024_participant_replay_preview.sql','ee90f17d233680052b7fb281019467e7b6040f136371a52cd3686ded4102da55'))
 (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL
 (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected))
 THEN RAISE EXCEPTION '025 exact ledger mismatch'; END IF;
 LOCK TABLE uranius_private.synthetic_completed_race_runs IN ACCESS EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_private.synthetic_completed_race_runs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 THEN RAISE EXCEPTION '025 archive security refused'; END IF;
END $guard025$;
-- Review-only reusable job contract. Install only as isolated schema owner.
-- No schedule, no official result writes. Separate approval required for hosted role/schema provisioning.
CREATE SCHEMA uranius_jobs;
REVOKE ALL ON SCHEMA uranius_jobs FROM PUBLIC,anon,authenticated,uranius_smoke_reader;
GRANT USAGE ON SCHEMA uranius_jobs TO uranius_worker;

CREATE TABLE uranius_jobs.race_jobs (
 job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 stage_id uuid NOT NULL,
 input_text text NOT NULL CHECK(octet_length(input_text) BETWEEN 1 AND 524288),
 input_sha256 text NOT NULL CHECK(input_sha256=encode(sha256(convert_to(input_text,'UTF8')),'hex')),
 expected_output_sha256 text NOT NULL CHECK(expected_output_sha256 ~ '^[a-f0-9]{64}$'),
 due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
 attempt integer NOT NULL DEFAULT 0 CHECK(attempt BETWEEN 0 AND 3),
 lease_token uuid,
 lease_until timestamptz,
 output_text text CHECK(octet_length(output_text) BETWEEN 1 AND 4194304),
 output_sha256 text,
 completed_at timestamptz,
 UNIQUE(stage_id,input_sha256),
 CHECK((status='queued' AND attempt=0 AND lease_token IS NULL AND lease_until IS NULL)
 OR (status='running' AND attempt>0 AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
 OR (status IN ('completed','failed') AND attempt>0 AND lease_token IS NULL AND lease_until IS NULL)),
 CHECK((status='completed' AND output_text IS NOT NULL AND output_sha256 IS NOT NULL AND completed_at IS NOT NULL
 AND output_sha256=expected_output_sha256 AND output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex'))
 OR (status<>'completed' AND output_text IS NULL AND output_sha256 IS NULL AND completed_at IS NULL))
);
REVOKE ALL ON uranius_jobs.race_jobs FROM PUBLIC,anon,authenticated,uranius_smoke_reader,uranius_worker;
GRANT SELECT ON uranius_jobs.race_jobs TO uranius_worker;
GRANT UPDATE(status,attempt,lease_token,lease_until,output_text,output_sha256,completed_at) ON uranius_jobs.race_jobs TO uranius_worker;

CREATE FUNCTION uranius_jobs.guard_job_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $transition$
DECLARE now_at timestamptz:=clock_timestamp();
BEGIN
 IF OLD.status IN ('completed','failed') THEN RAISE EXCEPTION 'Terminal job is immutable'; END IF;
 IF (NEW.job_id,NEW.stage_id,NEW.input_text,NEW.input_sha256,NEW.expected_output_sha256,NEW.due_at)
 IS DISTINCT FROM (OLD.job_id,OLD.stage_id,OLD.input_text,OLD.input_sha256,OLD.expected_output_sha256,OLD.due_at)
 THEN RAISE EXCEPTION 'Immutable job input changed'; END IF;
 IF NEW.status='running' AND NEW.attempt=OLD.attempt+1 AND OLD.attempt<3
 AND NEW.lease_token IS NOT NULL AND NEW.lease_token IS DISTINCT FROM OLD.lease_token
 AND NEW.lease_until>now_at AND NEW.lease_until<=now_at+interval '5 minutes'
 AND ((OLD.status='queued' AND OLD.due_at<=now_at) OR (OLD.status='running' AND OLD.lease_until<=now_at))
 THEN RETURN NEW; END IF;
 IF OLD.status='running' AND NEW.attempt=OLD.attempt AND NEW.status='completed' AND OLD.lease_until>now_at
 AND NEW.completed_at BETWEEN now_at-interval '5 seconds' AND now_at
 THEN RETURN NEW; END IF;
 IF OLD.status='running' AND NEW.attempt=OLD.attempt AND NEW.status='failed'
 AND OLD.attempt=3 AND OLD.lease_until<=now_at THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Invalid job lifecycle transition';
END $transition$;
REVOKE ALL ON FUNCTION uranius_jobs.guard_job_transition() FROM PUBLIC,anon,authenticated,uranius_smoke_reader,uranius_worker;
CREATE TRIGGER guard_job_transition BEFORE UPDATE ON uranius_jobs.race_jobs FOR EACH ROW EXECUTE FUNCTION uranius_jobs.guard_job_transition();
ALTER TABLE uranius_jobs.race_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_jobs.race_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY worker_read ON uranius_jobs.race_jobs FOR SELECT TO uranius_worker USING (true);
CREATE POLICY worker_transition ON uranius_jobs.race_jobs FOR UPDATE TO uranius_worker USING (status IN ('queued','running')) WITH CHECK (true);
-- The schema owner has no persistent RLS read or insert policy. Provisioning
-- seeds explicitly approved jobs using temporary policies removed before commit.

ALTER TABLE uranius_jobs.race_jobs ADD CONSTRAINT race_job_stage_fk FOREIGN KEY(stage_id) REFERENCES uranius_game.race_stages(id) ON DELETE RESTRICT;
CREATE POLICY uranius_025_seed_source ON uranius_private.synthetic_completed_race_runs FOR SELECT TO uranius_migrator USING(run_id='ff57a18f-9eca-4c65-9692-5d9bec28b101');
CREATE POLICY uranius_025_seed_insert ON uranius_jobs.race_jobs FOR INSERT TO uranius_migrator WITH CHECK(stage_id='25251441-bd5d-4f00-993d-859a95cf099e' AND input_sha256='a4b666233b28e829ca55f3f3ca46f8cfd881eaa992897f70abc1c9b7fafd81bf' AND expected_output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed' AND status='queued');
DO $seed025$
DECLARE inserted integer;
BEGIN
 INSERT INTO uranius_jobs.race_jobs(stage_id,input_text,input_sha256,expected_output_sha256,due_at)
 SELECT stage_id,input_text,input_sha256,output_sha256,clock_timestamp()
 FROM uranius_private.synthetic_completed_race_runs
 WHERE run_id='ff57a18f-9eca-4c65-9692-5d9bec28b101'
 AND stage_id='25251441-bd5d-4f00-993d-859a95cf099e'
 AND input_sha256='a4b666233b28e829ca55f3f3ca46f8cfd881eaa992897f70abc1c9b7fafd81bf'
 AND output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed'
 AND input_sha256=encode(sha256(convert_to(input_text,'UTF8')),'hex')
 AND output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex');
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION '025 exact archive seed missing'; END IF;
END $seed025$;
DROP POLICY uranius_025_seed_insert ON uranius_jobs.race_jobs;
DROP POLICY uranius_025_seed_source ON uranius_private.synthetic_completed_race_runs;
DO $post025$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs')<>2
 OR EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'uranius_025_seed_%')
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) t(role_name) WHERE has_schema_privilege(role_name,'uranius_jobs','USAGE') OR has_any_column_privilege(role_name,'uranius_jobs.race_jobs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_jobs.race_jobs','DELETE,TRUNCATE,TRIGGER'))
 OR has_schema_privilege('uranius_worker','uranius_private','USAGE')
 OR has_schema_privilege('uranius_worker','uranius_game','USAGE')
 OR has_schema_privilege('uranius_worker','uranius_catalog','USAGE')
 OR has_any_column_privilege('uranius_worker','uranius_jobs.race_jobs','INSERT,REFERENCES')
 OR has_table_privilege('uranius_worker','uranius_jobs.race_jobs','UPDATE,DELETE,TRUNCATE,TRIGGER')
 THEN RAISE EXCEPTION '025 postflight refused'; END IF;
END $post025$;
