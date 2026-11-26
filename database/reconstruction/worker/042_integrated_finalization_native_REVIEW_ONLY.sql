-- DISPOSABLE LOCAL PG17 ONLY; requires unmodified 035 fixture schema.
-- No real game tables. Trusted fixture admin seeds packets/resources.
CREATE SCHEMA uranius_042_fixture;
REVOKE ALL ON SCHEMA uranius_042_fixture FROM PUBLIC;
CREATE TABLE uranius_042_fixture.packets (
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.stage_input(stage_id),
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='object'),
 packet_sha text NOT NULL CHECK(packet_sha=encode(sha256(convert_to(packet::text,'UTF8')),'hex'))
);
CREATE TABLE uranius_042_fixture.resources (
 resource_key text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('consumable','durable','equipment')),
 team_id uuid NOT NULL, target text NOT NULL, state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 UNIQUE(kind,team_id,target),
 CHECK(resource_key=kind||':'||team_id::text||':'||target)
);
CREATE TABLE uranius_042_fixture.effect_log (
 stage_id uuid REFERENCES uranius_042_fixture.packets(stage_id),
 resource_key text REFERENCES uranius_042_fixture.resources(resource_key),
 before_state jsonb NOT NULL, after_state jsonb NOT NULL, PRIMARY KEY(stage_id,resource_key)
);
CREATE TABLE uranius_042_fixture.receipts (
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.authority(stage_id),
 packet_sha text NOT NULL, evidence jsonb NOT NULL,
 CHECK(jsonb_typeof(evidence)='object')
);
CREATE FUNCTION uranius_042_fixture.finalize(p_stage uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_042_fixture AS $$
DECLARE p packets%ROWTYPE; s uranius_035_fixture.stage_input%ROWTYPE; j jsonb; outcome text; expected_count integer; changed integer;
BEGIN
 SELECT * INTO STRICT s FROM uranius_035_fixture.stage_input WHERE stage_id=p_stage;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius035-fixture:'||s.race_id::text,0));
 SELECT * INTO STRICT s FROM uranius_035_fixture.stage_input WHERE stage_id=p_stage FOR UPDATE;
 SELECT * INTO STRICT p FROM packets WHERE stage_id=p_stage FOR UPDATE;
 IF p.packet_sha IS DISTINCT FROM encode(sha256(convert_to(p.packet::text,'UTF8')),'hex')
 OR p.packet->>'version' IS DISTINCT FROM '042_integrated_synthetic_v1'
 OR p.packet->>'provenance' IS DISTINCT FROM 'synthetic_review_fixture'
 OR p.packet->>'official' IS DISTINCT FROM 'false'
 OR p.packet->>'hostedWriteAllowed' IS DISTINCT FROM 'false'
 OR p.packet->>'accountingAllowed' IS DISTINCT FROM 'false'
 OR p.packet->>'stageId' IS DISTINCT FROM p_stage::text
 OR p.packet->>'raceId' IS DISTINCT FROM s.race_id::text
 OR p.packet->>'runId' IS DISTINCT FROM s.run_id::text
 OR p.packet->'core' IS DISTINCT FROM s.packet
 OR jsonb_typeof(p.packet->'resources') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p.packet->'evidence') IS DISTINCT FROM 'object'
 OR p.packet->'evidence'->'source'->>'jobId' IS DISTINCT FROM s.run_id::text
 OR p.packet->'evidence'->'source'->>'stageId' IS DISTINCT FROM p_stage::text
 OR p.packet->'evidence'->'source'->>'raceId' IS DISTINCT FROM s.race_id::text
 THEN RAISE EXCEPTION 'Integrated fixture identity or packet mismatch'; END IF;
 expected_count:=jsonb_array_length(p.packet->'resources');
 IF expected_count=0 THEN RAISE EXCEPTION 'Missing resource fixture'; END IF;
 IF s.state='published' THEN
  IF NOT EXISTS(SELECT 1 FROM receipts WHERE stage_id=p_stage AND packet_sha=p.packet_sha AND evidence=p.packet->'evidence')
  OR NOT EXISTS(SELECT 1 FROM uranius_035_fixture.authority WHERE stage_id=p_stage AND run_id=s.run_id AND packet_sha=s.packet_sha)
  OR (SELECT count(*) FROM effect_log WHERE stage_id=p_stage)<>expected_count
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.packet->'resources') x WHERE NOT EXISTS(SELECT 1 FROM effect_log l WHERE l.stage_id=p_stage AND l.resource_key=x->>'key' AND l.before_state=x->'before' AND l.after_state=x->'after'))
  THEN RAISE EXCEPTION 'Partial integrated publication or changed packet'; END IF;
  RETURN 'already_published_fixture';
 END IF;
 IF EXISTS(SELECT 1 FROM receipts WHERE stage_id=p_stage) OR EXISTS(SELECT 1 FROM effect_log WHERE stage_id=p_stage) THEN RAISE EXCEPTION 'Partial stage effects'; END IF;
 -- Base finalizer has its own reveal/order/policy/ledger gates. Nested call is
 -- in the same transaction; even its publication rolls back if effects fail.
 outcome:=uranius_035_fixture.finalize(p_stage,false);
 IF outcome<>'published_fixture' THEN RAISE EXCEPTION 'Unexpected core outcome'; END IF;
 FOR j IN SELECT value FROM jsonb_array_elements(p.packet->'resources') ORDER BY value->>'key' LOOP
  IF jsonb_typeof(j->'before') IS DISTINCT FROM 'object' OR jsonb_typeof(j->'after') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Missing resource snapshot'; END IF;
  UPDATE resources SET state=j->'after' WHERE resource_key=j->>'key' AND kind=j->>'kind' AND team_id=(j->>'teamId')::uuid AND target=j->>'target' AND state=j->'before';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Stale or missing resource: %',j->>'key'; END IF;
  INSERT INTO effect_log VALUES(p_stage,j->>'key',j->'before',j->'after');
 END LOOP;
 INSERT INTO receipts VALUES(p_stage,p.packet_sha,p.packet->'evidence');
 IF p_fault THEN RAISE EXCEPTION 'Injected integrated failure after effects and accounting'; END IF;
 RETURN 'published_fixture';
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_042_fixture FROM PUBLIC;
REVOKE ALL ON FUNCTION uranius_042_fixture.finalize(uuid,boolean) FROM PUBLIC;
