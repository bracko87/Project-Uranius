-- DISPOSABLE LOCAL PG17 ONLY. Requires unmodified 035 fixture. No official tables.
CREATE SCHEMA uranius_043c_fixture;
REVOKE ALL ON SCHEMA uranius_043c_fixture FROM PUBLIC;
CREATE TABLE uranius_043c_fixture.packets(
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.stage_input(stage_id),
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='object'),
 packet_sha text NOT NULL CHECK(packet_sha=encode(sha256(convert_to(packet::text,'UTF8')),'hex'))
);
CREATE TABLE uranius_043c_fixture.resources(
 resource_key text PRIMARY KEY, state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 CHECK(resource_key=(state->>'resourceType')||':'||(state->>'resourceId'))
);
CREATE TABLE uranius_043c_fixture.effects(
 stage_id uuid REFERENCES uranius_043c_fixture.packets(stage_id),
 resource_key text REFERENCES uranius_043c_fixture.resources(resource_key),
 before_state jsonb NOT NULL,after_state jsonb NOT NULL,PRIMARY KEY(stage_id,resource_key)
);
CREATE TABLE uranius_043c_fixture.receipts(
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.authority(stage_id),
 packet jsonb NOT NULL, packet_sha text NOT NULL, ledger jsonb NOT NULL
);
-- Full prior award, prize/tax transaction and entry snapshots, including IDs.
CREATE FUNCTION uranius_043c_fixture.ledger_snapshot(p_stage uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,uranius_035_fixture AS $$
 WITH a AS (SELECT * FROM prize_awards WHERE stage_id=p_stage),
 g AS (SELECT t.* FROM transactions t JOIN a ON t.ref_id=a.id WHERE t.event_type='race_prize'),
 t AS (SELECT * FROM g UNION ALL SELECT x.* FROM transactions x JOIN g ON x.ref_id=g.id WHERE x.event_type='tax_withholding'),
 e AS (SELECT x.* FROM entries x JOIN t ON x.tx_id=t.id)
 SELECT jsonb_build_object('awards',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]') FROM a),
 'transactions',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') FROM t),
 'entries',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.tx_id,e.account),'[]') FROM e))
$$;
CREATE FUNCTION uranius_043c_fixture.finalize(p_stage uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_043c_fixture AS $$
DECLARE s uranius_035_fixture.stage_input%ROWTYPE; p packets%ROWTYPE; prior receipts%ROWTYPE; j jsonb; k text; changed integer; n integer; stage_no integer; outcome text;
BEGIN
 SELECT * INTO STRICT s FROM uranius_035_fixture.stage_input WHERE stage_id=p_stage;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius035-fixture:'||s.race_id::text,0));
 SELECT * INTO STRICT s FROM uranius_035_fixture.stage_input WHERE stage_id=p_stage FOR UPDATE;
 SELECT * INTO STRICT p FROM packets WHERE stage_id=p_stage FOR UPDATE;
 stage_no:=(p.packet->>'stageNumber')::integer;
 IF p.packet_sha IS DISTINCT FROM encode(sha256(convert_to(p.packet::text,'UTF8')),'hex')
 OR p.packet->>'version' IS DISTINCT FROM '043C_tour_settlement_v1'
 OR p.packet->>'provenance' IS DISTINCT FROM 'synthetic_review_fixture'
 OR p.packet->>'official' IS DISTINCT FROM 'false'
 OR p.packet->>'hostedWriteAllowed' IS DISTINCT FROM 'false'
 OR p.packet->>'accountingAllowed' IS DISTINCT FROM 'false'
 OR p.packet->>'raceId' IS DISTINCT FROM s.race_id::text
 OR p.packet->>'stageId' IS DISTINCT FROM s.stage_id::text
 OR p.packet->>'runId' IS DISTINCT FROM s.run_id::text
 OR p.packet->'core' IS DISTINCT FROM s.packet
 OR p.packet->'carryover'->>'stageId' IS DISTINCT FROM p_stage::text
 OR p.packet->'carryover'->>'raceId' IS DISTINCT FROM s.race_id::text
 OR p.packet->'carryover'->>'runId' IS DISTINCT FROM s.run_id::text
 OR p.packet->'carryover'->>'stageNumber' IS DISTINCT FROM p.packet->>'stageNumber'
 OR jsonb_typeof(p.packet->'carryover'->'resources') IS DISTINCT FROM 'array'
 OR stage_no IS NULL OR stage_no NOT IN (1,2)
 OR (stage_no=2) IS DISTINCT FROM (s.packet->>'final')::boolean THEN RAISE EXCEPTION 'Tour packet identity mismatch'; END IF;
 n:=jsonb_array_length(p.packet->'carryover'->'resources');
 IF n=0 THEN RAISE EXCEPTION 'No resource effects'; END IF;
 IF stage_no=1 THEN
  IF s.prior_stage_id IS NOT NULL OR p.packet->'previousPacket' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Unexpected prior stage'; END IF;
 ELSE
  IF s.prior_stage_id IS NULL THEN RAISE EXCEPTION 'Prior stage missing'; END IF;
  SELECT * INTO prior FROM receipts WHERE stage_id=s.prior_stage_id;
  IF NOT FOUND OR prior.packet IS DISTINCT FROM p.packet->'previousPacket'
  OR prior.packet->>'raceId' IS DISTINCT FROM s.race_id::text
  OR prior.packet->>'stageNumber' IS DISTINCT FROM '1'
  OR prior.packet->>'carryoverSha256' IS DISTINCT FROM p.packet->'carryover'->>'priorDigest'
  OR NOT EXISTS(SELECT 1 FROM uranius_035_fixture.authority a JOIN uranius_035_fixture.stage_input z USING(stage_id) WHERE a.stage_id=s.prior_stage_id AND z.state='published' AND a.packet_sha=z.packet_sha AND z.packet=prior.packet->'core')
  OR prior.ledger IS DISTINCT FROM ledger_snapshot(s.prior_stage_id)
  THEN RAISE EXCEPTION 'Prior integrated receipt or ledger changed'; END IF;
 END IF;
 IF s.state='published' THEN
  IF NOT EXISTS(SELECT 1 FROM receipts WHERE stage_id=p_stage AND packet=p.packet AND packet_sha=p.packet_sha AND ledger=ledger_snapshot(p_stage))
  OR NOT EXISTS(SELECT 1 FROM uranius_035_fixture.authority WHERE stage_id=p_stage AND run_id=s.run_id AND packet_sha=s.packet_sha)
  OR (SELECT count(*) FROM effects WHERE stage_id=p_stage)<>n
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.packet->'carryover'->'resources') x WHERE NOT EXISTS(SELECT 1 FROM effects e WHERE e.stage_id=p_stage AND e.resource_key=(x->'before'->>'resourceType')||':'||(x->'before'->>'resourceId') AND e.before_state=x->'before' AND e.after_state=x->'after'))
  THEN RAISE EXCEPTION 'Changed published receipt'; END IF;
  RETURN 'already_published_fixture';
 END IF;
 IF EXISTS(SELECT 1 FROM receipts WHERE stage_id=p_stage) OR EXISTS(SELECT 1 FROM effects WHERE stage_id=p_stage) THEN RAISE EXCEPTION 'Partial integrated state'; END IF;
 outcome:=uranius_035_fixture.finalize(p_stage,false);
 IF outcome<>'published_fixture' THEN RAISE EXCEPTION 'Unexpected core result'; END IF;
 FOR j IN SELECT value FROM jsonb_array_elements(p.packet->'carryover'->'resources') ORDER BY value->'before'->>'resourceType',value->'before'->>'resourceId' LOOP
  k:=(j->'before'->>'resourceType')||':'||(j->'before'->>'resourceId');
  IF jsonb_typeof(j->'before') IS DISTINCT FROM 'object' OR jsonb_typeof(j->'after') IS DISTINCT FROM 'object'
  OR j->'before'->>'teamId' IS DISTINCT FROM j->'after'->>'teamId' THEN RAISE EXCEPTION 'Resource identity mismatch'; END IF;
  IF stage_no=2 AND NOT EXISTS(SELECT 1 FROM effects e WHERE e.stage_id=s.prior_stage_id AND e.resource_key=k AND e.after_state=j->'before') THEN RAISE EXCEPTION 'Prior resource effect mismatch'; END IF;
  UPDATE resources SET state=j->'after' WHERE resource_key=k AND state=j->'before';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Stale resource %',k; END IF;
  INSERT INTO effects VALUES(p_stage,k,j->'before',j->'after');
 END LOOP;
 IF stage_no=2 AND ((SELECT count(*) FROM effects WHERE stage_id=s.prior_stage_id)<>n OR prior.ledger IS DISTINCT FROM ledger_snapshot(s.prior_stage_id)) THEN RAISE EXCEPTION 'Prior effects or ledger changed'; END IF;
 INSERT INTO receipts VALUES(p_stage,p.packet,p.packet_sha,ledger_snapshot(p_stage));
 IF p_fault THEN RAISE EXCEPTION 'Injected tour failure after accounting and effects'; END IF;
 RETURN 'published_fixture';
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_043c_fixture FROM PUBLIC;
REVOKE ALL ON FUNCTION uranius_043c_fixture.finalize(uuid,boolean),uranius_043c_fixture.ledger_snapshot(uuid) FROM PUBLIC;
