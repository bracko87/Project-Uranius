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
