-- REVIEW ONLY. Completed synthetic race archive; no worker, public or reader grant.
-- No hosted application authorization, scheduler, publication or finance side effects.
DO $run022_guard$
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410522);
 PERFORM uranius_private.assert_project();
 IF current_user<>'uranius_migrator' OR session_user<>current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
 OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>16
 OR (SELECT count(*) FROM uranius_catalog.riders)<>200
 OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR to_regclass('uranius_private.synthetic_completed_race_runs') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_game.synthetic_race_startlists'::regclass AND relrowsecurity AND relforcerowsecurity AND relowner=current_user::regrole)
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename='synthetic_race_startlists')
 THEN RAISE EXCEPTION '022 isolated baseline refused'; END IF;
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
      ('021_synthetic_startlists.sql','041964c176d2e647d13f7ef01d211757fc6738226f4679e18baea64b4df57186')
 )
 (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL
 (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected)
 ) THEN RAISE EXCEPTION '022 ledger mismatch'; END IF;
END
$run022_guard$;

CREATE TABLE uranius_private.synthetic_completed_race_runs (
 run_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 race_id uuid NOT NULL REFERENCES uranius_game.races(id) ON DELETE RESTRICT,
 stage_id uuid NOT NULL REFERENCES uranius_game.race_stages(id) ON DELETE RESTRICT,
 contract_version integer NOT NULL CHECK(contract_version=1),
 engine_lane text NOT NULL CHECK(engine_lane='existing_v1'),
 provenance text NOT NULL CHECK(provenance='uranius_synthetic_review'),
 input_text text NOT NULL CHECK(octet_length(input_text) BETWEEN 1 AND 1048576),
 output_text text NOT NULL CHECK(octet_length(output_text) BETWEEN 1 AND 4194304),
 input_sha256 text NOT NULL CHECK(input_sha256=encode(sha256(convert_to(input_text,'UTF8')),'hex')),
 output_sha256 text NOT NULL CHECK(output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(stage_id,contract_version,engine_lane,input_sha256)
);
REVOKE ALL ON uranius_private.synthetic_completed_race_runs FROM PUBLIC,anon,authenticated,uranius_smoke_reader;

-- Invoker-only validation. No current application role can write or read.
-- Narrow initial contract: two complete five-rider teams, every rider finishes.
-- Future DNF/DNS, commands, checkpoint and live publication need separate contracts.
CREATE FUNCTION uranius_private.validate_synthetic_completed_race_run()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $run022$
DECLARE
 i jsonb;
 o jsonb;
 row_count integer;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Completed review run is immutable'; END IF;
 i:=NEW.input_text::jsonb;
 o:=NEW.output_text::jsonb;
 IF jsonb_typeof(i) IS DISTINCT FROM 'object' OR jsonb_typeof(o) IS DISTINCT FROM 'object'
 OR i->>'raceId' IS DISTINCT FROM NEW.race_id::text
 OR i->>'stageId' IS DISTINCT FROM NEW.stage_id::text
 OR o->>'raceId' IS DISTINCT FROM NEW.race_id::text
 OR o->>'stageId' IS DISTINCT FROM NEW.stage_id::text
 OR o->>'engineVersion' IS DISTINCT FROM 'race_engine_ts_v1'
 OR o->>'simulationMode' IS DISTINCT FROM 'deterministic_road_race_v1'
 OR i->>'seed' IS NULL OR o->>'seed' IS DISTINCT FROM i->>'seed'
 OR i->>'stageFormat' IS DISTINCT FROM 'road_race'
 OR jsonb_typeof(i->'orders') IS DISTINCT FROM 'array' OR jsonb_array_length(i->'orders')<>0
 OR jsonb_typeof(i->'teams') IS DISTINCT FROM 'array' OR jsonb_array_length(i->'teams')<>2
 OR jsonb_typeof(i->'riders') IS DISTINCT FROM 'array' OR jsonb_array_length(i->'riders')<>10
 OR jsonb_typeof(o->'finalRiderStates') IS DISTINCT FROM 'array' OR jsonb_array_length(o->'finalRiderStates')<>10
 OR jsonb_typeof(o->'snapshots') IS DISTINCT FROM 'array' OR jsonb_array_length(o->'snapshots')<2
 OR jsonb_typeof(o->'events') IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'Completed review run has invalid input/output identity or shape'; END IF;
 IF NOT EXISTS(SELECT 1 FROM uranius_game.race_stages s JOIN uranius_game.races r ON r.id=s.race_id
 WHERE s.id=NEW.stage_id AND s.race_id=NEW.race_id
 AND s.distance_km=(i->>'distanceKm')::numeric AND s.stage_format='road_race'
 AND r.metadata->>'uranius_synthetic'='true')
 THEN RAISE EXCEPTION 'Completed review run stage does not match synthetic database'; END IF;
 -- The entire roster must match the stored selections and accepted preparations.
 SELECT count(*) INTO row_count FROM uranius_game.synthetic_race_startlists l
 JOIN uranius_game.synthetic_rider_identity u USING(rider_id)
 JOIN uranius_game.race_preparations p ON p.race_id=l.race_id AND p.club_id=l.club_id
 JOIN uranius_game.race_team_entries e ON e.id=p.race_team_entry_id AND e.race_id=l.race_id AND e.club_id=l.club_id
 WHERE l.race_id=NEW.race_id AND e.status='accepted' AND l.provenance='uranius_synthetic_fixture'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(i->'riders') x WHERE x->>'riderId'=u.rider_uuid::text AND x->>'teamId'=l.club_id::text AND x->>'role'=l.role);
 IF row_count<>10 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists WHERE race_id=NEW.race_id)<>10
 OR (SELECT count(DISTINCT x->>'riderId') FROM jsonb_array_elements(i->'riders') x)<>10
 OR (SELECT count(DISTINCT x->>'teamId') FROM jsonb_array_elements(i->'riders') x)<>2
 THEN RAISE EXCEPTION 'Completed review run roster does not match stored selections'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(o->'finalRiderStates') x
 WHERE x->>'stageStatus' IS DISTINCT FROM 'finished' OR x->'finished' IS DISTINCT FROM 'true'::jsonb
 OR jsonb_typeof(x->'finishPosition') IS DISTINCT FROM 'number'
 OR jsonb_typeof(x->'finishTimeSeconds') IS DISTINCT FROM 'number'
 OR (x->>'finishPosition')::numeric NOT BETWEEN 1 AND 10
 OR (x->>'finishPosition')::numeric<>trunc((x->>'finishPosition')::numeric)
 OR (x->>'finishTimeSeconds')::numeric<=0
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(i->'riders') y WHERE y->>'riderId'=x->>'riderId' AND y->>'teamId'=x->>'teamId'))
 OR (SELECT count(DISTINCT x->>'riderId') FROM jsonb_array_elements(o->'finalRiderStates') x)<>10
 OR (SELECT count(DISTINCT (x->>'finishPosition')::numeric) FROM jsonb_array_elements(o->'finalRiderStates') x)<>10
 THEN RAISE EXCEPTION 'Completed review run classification invalid'; END IF;
 RETURN NEW;
END
$run022$;
REVOKE ALL ON FUNCTION uranius_private.validate_synthetic_completed_race_run() FROM PUBLIC,anon,authenticated,uranius_smoke_reader;
CREATE TRIGGER synthetic_completed_run_validate
 BEFORE INSERT OR UPDATE OR DELETE ON uranius_private.synthetic_completed_race_runs
 FOR EACH ROW EXECUTE FUNCTION uranius_private.validate_synthetic_completed_race_run();
ALTER TABLE uranius_private.synthetic_completed_race_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_private.synthetic_completed_race_runs FORCE ROW LEVEL SECURITY;
