-- DISPOSABLE LOCAL PG17 ONLY. Never apply to a hosted project.
-- This schema has NO official result, publication, finance, inventory or worker transition writer.
-- Trusted local fixture admin seeds independent source and expected evidence.
CREATE ROLE uranius_043d_guard NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE uranius_043d_verifier NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE uranius_043d_admitter NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE uranius_043d_worker NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE ROLE uranius_043d_client NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
CREATE SCHEMA uranius_043d_fixture AUTHORIZATION uranius_043d_guard;
SET ROLE uranius_043d_guard;
REVOKE ALL ON SCHEMA uranius_043d_fixture FROM PUBLIC;
CREATE TABLE uranius_043d_fixture.source(
 job_id uuid PRIMARY KEY, race_id uuid NOT NULL, stage_id uuid UNIQUE NOT NULL,
 stage_number int NOT NULL CHECK(stage_number>0), prior_job_id uuid REFERENCES uranius_043d_fixture.source(job_id),
 job_kind text NOT NULL CHECK(job_kind IN ('verified_repeat','calendar_review','authority_rehearsal')),
 status text NOT NULL CHECK(status IN ('completed','queued','running')),
 input_text text NOT NULL, output_text text NOT NULL,
 input_sha text NOT NULL CHECK(input_sha ~ '^[0-9a-f]{64}$'),
 output_sha text NOT NULL CHECK(output_sha ~ '^[0-9a-f]{64}$'),
 completed_at timestamptz, lease_token uuid, lease_until timestamptz,
 stage_start timestamptz NOT NULL, game_now timestamptz NOT NULL,
 replay_close timestamptz NOT NULL, real_now timestamptz NOT NULL,
 UNIQUE(race_id,stage_number), CHECK(prior_job_id IS DISTINCT FROM job_id),
 CHECK((stage_number=1)=(prior_job_id IS NULL))
);
CREATE TABLE uranius_043d_fixture.expected(
 job_id uuid REFERENCES uranius_043d_fixture.source(job_id), evidence_kind text NOT NULL CHECK(evidence_kind IN ('roster','markers','workload','resources','health','penalties','youth','policy','recovery','lifecycle')),
 evidence_sha text NOT NULL CHECK(evidence_sha ~ '^[0-9a-f]{64}$'), PRIMARY KEY(job_id,evidence_kind)
);
CREATE TABLE uranius_043d_fixture.attestations(
 job_id uuid NOT NULL,evidence_kind text NOT NULL,evidence_sha text NOT NULL,
 PRIMARY KEY(job_id,evidence_kind), FOREIGN KEY(job_id,evidence_kind) REFERENCES uranius_043d_fixture.expected(job_id,evidence_kind)
);
CREATE TABLE uranius_043d_fixture.receipts(
 job_id uuid PRIMARY KEY REFERENCES uranius_043d_fixture.source(job_id), stage_id uuid UNIQUE NOT NULL,
 source_sha text NOT NULL, evidence_sha text NOT NULL, prior_job_id uuid REFERENCES uranius_043d_fixture.receipts(job_id),
 decision text NOT NULL CHECK(decision='local_boundary_rehearsal_only'),
 official boolean NOT NULL CHECK(NOT official), hosted_write_allowed boolean NOT NULL CHECK(NOT hosted_write_allowed),
 accounting_allowed boolean NOT NULL CHECK(NOT accounting_allowed)
);
CREATE FUNCTION uranius_043d_fixture.attest(p_job uuid,p_kind text,p_sha text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s uranius_043d_fixture.source%ROWTYPE; old_sha text;
BEGIN
 SELECT * INTO STRICT s FROM uranius_043d_fixture.source WHERE job_id=p_job;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius043d:'||s.race_id::text,0));
 SELECT * INTO STRICT s FROM uranius_043d_fixture.source WHERE job_id=p_job FOR UPDATE;
 IF s.job_kind<>'authority_rehearsal' OR s.status<>'completed' THEN RAISE EXCEPTION 'Review job not eligible for authority rehearsal'; END IF;
 IF NOT EXISTS(SELECT 1 FROM uranius_043d_fixture.expected e WHERE e.job_id=p_job AND e.evidence_kind=p_kind AND e.evidence_sha=p_sha)
 THEN RAISE EXCEPTION 'Evidence identity or digest mismatch'; END IF;
 SELECT a.evidence_sha INTO old_sha FROM uranius_043d_fixture.attestations a WHERE a.job_id=p_job AND a.evidence_kind=p_kind;
 IF FOUND THEN
  IF old_sha IS DISTINCT FROM p_sha THEN RAISE EXCEPTION 'Changed evidence'; END IF;
  RETURN 'already_attested';
 END IF;
 IF EXISTS(SELECT 1 FROM uranius_043d_fixture.receipts r WHERE r.job_id=p_job) THEN RAISE EXCEPTION 'Receipt already closed'; END IF;
 INSERT INTO uranius_043d_fixture.attestations VALUES(p_job,p_kind,p_sha);
 RETURN 'attested';
END $$;
CREATE FUNCTION uranius_043d_fixture.admit(p_job uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s uranius_043d_fixture.source%ROWTYPE; prev uranius_043d_fixture.source%ROWTYPE; r uranius_043d_fixture.receipts%ROWTYPE; sh text; eh text; prior_sh text; prior_eh text;
BEGIN
 SELECT * INTO STRICT s FROM uranius_043d_fixture.source WHERE job_id=p_job;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius043d:'||s.race_id::text,0));
 SELECT * INTO STRICT s FROM uranius_043d_fixture.source WHERE job_id=p_job FOR UPDATE;
 IF s.job_kind<>'authority_rehearsal' THEN RAISE EXCEPTION 'Review jobs cannot be promoted'; END IF;
 IF s.status<>'completed' OR s.completed_at IS NULL OR s.lease_token IS NOT NULL OR s.lease_until IS NOT NULL THEN RAISE EXCEPTION 'Job not terminal'; END IF;
 IF s.input_sha IS DISTINCT FROM encode(sha256(convert_to(s.input_text,'UTF8')),'hex')
 OR s.output_sha IS DISTINCT FROM encode(sha256(convert_to(s.output_text,'UTF8')),'hex') THEN RAISE EXCEPTION 'Job digest mismatch'; END IF;
 IF s.input_text::jsonb->>'raceId' IS DISTINCT FROM s.race_id::text OR s.output_text::jsonb->>'raceId' IS DISTINCT FROM s.race_id::text
 OR s.input_text::jsonb->>'stageId' IS DISTINCT FROM s.stage_id::text OR s.output_text::jsonb->>'stageId' IS DISTINCT FROM s.stage_id::text THEN RAISE EXCEPTION 'Job scope mismatch'; END IF;
 IF s.game_now<s.stage_start+interval '30 minutes' OR s.real_now<s.replay_close THEN RAISE EXCEPTION 'Reveal gate closed'; END IF;
 IF (SELECT count(*) FROM uranius_043d_fixture.expected e WHERE e.job_id=p_job)<>10
 OR (SELECT count(*) FROM uranius_043d_fixture.attestations a WHERE a.job_id=p_job)<>10
 OR EXISTS(SELECT 1 FROM uranius_043d_fixture.expected e WHERE e.job_id=p_job AND NOT EXISTS(SELECT 1 FROM uranius_043d_fixture.attestations a WHERE a.job_id=e.job_id AND a.evidence_kind=e.evidence_kind AND a.evidence_sha=e.evidence_sha))
 THEN RAISE EXCEPTION 'Incomplete or changed independent evidence'; END IF;
 sh:=encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex');
 SELECT encode(sha256(convert_to(jsonb_object_agg(a.evidence_kind,a.evidence_sha)::text,'UTF8')),'hex') INTO eh FROM uranius_043d_fixture.attestations a WHERE a.job_id=p_job;
 IF s.prior_job_id IS NOT NULL THEN
  SELECT * INTO STRICT prev FROM uranius_043d_fixture.source WHERE job_id=s.prior_job_id;
  prior_sh:=encode(sha256(convert_to(to_jsonb(prev)::text,'UTF8')),'hex');
  SELECT encode(sha256(convert_to(jsonb_object_agg(a.evidence_kind,a.evidence_sha)::text,'UTF8')),'hex') INTO prior_eh FROM uranius_043d_fixture.attestations a WHERE a.job_id=prev.job_id;
  IF prev.race_id<>s.race_id OR prev.stage_number<>s.stage_number-1
  OR NOT EXISTS(SELECT 1 FROM uranius_043d_fixture.receipts p WHERE p.job_id=prev.job_id AND p.stage_id=prev.stage_id AND p.source_sha=prior_sh AND p.evidence_sha=prior_eh)
  OR (SELECT count(*) FROM uranius_043d_fixture.expected e WHERE e.job_id=prev.job_id)<>10
  OR EXISTS(SELECT 1 FROM uranius_043d_fixture.expected e WHERE e.job_id=prev.job_id AND NOT EXISTS(SELECT 1 FROM uranius_043d_fixture.attestations a WHERE a.job_id=e.job_id AND a.evidence_kind=e.evidence_kind AND a.evidence_sha=e.evidence_sha))
  THEN RAISE EXCEPTION 'Prior rehearsal receipt missing or changed'; END IF;
 END IF;
 SELECT * INTO r FROM uranius_043d_fixture.receipts WHERE job_id=p_job;
 IF FOUND THEN
  IF r.stage_id IS DISTINCT FROM s.stage_id OR r.source_sha IS DISTINCT FROM sh OR r.evidence_sha IS DISTINCT FROM eh OR r.prior_job_id IS DISTINCT FROM s.prior_job_id THEN RAISE EXCEPTION 'Changed closed receipt'; END IF;
  RETURN 'already_rehearsed';
 END IF;
 INSERT INTO uranius_043d_fixture.receipts VALUES(p_job,s.stage_id,sh,eh,s.prior_job_id,'local_boundary_rehearsal_only',false,false,false);
 RETURN 'rehearsed_only';
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_043d_fixture FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA uranius_043d_fixture FROM PUBLIC;
GRANT USAGE ON SCHEMA uranius_043d_fixture TO uranius_043d_verifier,uranius_043d_admitter,uranius_043d_worker,uranius_043d_client;
GRANT EXECUTE ON FUNCTION uranius_043d_fixture.attest(uuid,text,text) TO uranius_043d_verifier;
GRANT EXECUTE ON FUNCTION uranius_043d_fixture.admit(uuid) TO uranius_043d_admitter;
RESET ROLE;
