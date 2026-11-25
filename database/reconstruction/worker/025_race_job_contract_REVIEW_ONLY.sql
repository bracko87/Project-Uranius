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
