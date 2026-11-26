-- Disposable PG17 ONLY. Compose unchanged 035, 043D, 043H and 043I fixture writers.
CREATE SCHEMA uranius_043j_fixture;
REVOKE ALL ON SCHEMA uranius_043j_fixture FROM PUBLIC;
CREATE TABLE uranius_043j_fixture.bundles(
 run_id uuid PRIMARY KEY REFERENCES uranius_043d_fixture.source(job_id),
 tour jsonb NOT NULL CHECK(jsonb_typeof(tour)='object'),
 tour_sha text NOT NULL CHECK(tour_sha=encode(sha256(convert_to(tour::text,'UTF8')),'hex'))
);
CREATE TABLE uranius_043j_fixture.receipts(
 run_id uuid PRIMARY KEY REFERENCES uranius_043j_fixture.bundles,
 snapshot jsonb NOT NULL,
 official boolean NOT NULL DEFAULT false CHECK(NOT official),
 hosted_write_allowed boolean NOT NULL DEFAULT false CHECK(NOT hosted_write_allowed),
 accounting_allowed boolean NOT NULL DEFAULT false CHECK(NOT accounting_allowed)
);
CREATE FUNCTION uranius_043j_fixture.evidence(p_run uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog SET timezone='UTC' AS $body$
 SELECT jsonb_build_object(
 'roster',d.input_text::jsonb->'riders',
 'markers',jsonb_build_object('points',b.tour->'pointResults','source',b.tour->'source'),
 'workload',b.tour->'carryover'->'riders',
 'resources',jsonb_build_object('computed',b.tour->'carryover'->'resources','writer',to_jsonb(h)),
 'health',to_jsonb(i),
 'penalties',(SELECT jsonb_agg(jsonb_build_array(x->>'riderId',x->'penaltySeconds') ORDER BY x->>'riderId') FROM jsonb_array_elements(b.tour->'stageResults') x),
 'youth',b.tour->'youngRiderIds',
 'policy',jsonb_build_object('tour',b.tour,'core',s.packet),
 'recovery',jsonb_build_object('verified',s.daily_recovery_verified,'prior',s.prior_stage_id,'carryover',b.tour->'carryover'->'priorDigest'),
 'lifecycle',jsonb_build_object('stageStart',s.stage_start,'gameNow',s.game_now,'replayClose',s.replay_close,'realNow',s.real_now))
 FROM uranius_043j_fixture.bundles b
 JOIN uranius_043d_fixture.source d ON d.job_id=b.run_id
 JOIN uranius_035_fixture.stage_input s ON s.run_id=b.run_id
 JOIN uranius_043h_fixture.jobs h ON h.run_id=b.run_id
 JOIN uranius_043i_fixture.jobs i ON i.run_id=b.run_id WHERE b.run_id=p_run
$body$;
CREATE FUNCTION uranius_043j_fixture.closed_snapshot(p_run uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog SET timezone='UTC' AS $body$
 WITH s AS (SELECT * FROM uranius_035_fixture.stage_input WHERE run_id=p_run),
 a AS (SELECT p.* FROM uranius_035_fixture.prize_awards p JOIN s USING(stage_id)),
 g AS (SELECT t.* FROM uranius_035_fixture.transactions t JOIN a ON t.ref_id=a.id WHERE t.event_type='race_prize'),
 t AS (SELECT * FROM g UNION ALL SELECT x.* FROM uranius_035_fixture.transactions x JOIN g ON x.ref_id=g.id WHERE x.event_type='tax_withholding'),
 e AS (SELECT x.* FROM uranius_035_fixture.entries x JOIN t ON x.tx_id=t.id)
 SELECT jsonb_build_object(
 'bundle',(SELECT to_jsonb(x) FROM uranius_043j_fixture.bundles x WHERE run_id=p_run),
 'source',(SELECT to_jsonb(x) FROM uranius_043d_fixture.source x WHERE job_id=p_run),
 'expected',(SELECT jsonb_agg(to_jsonb(x) ORDER BY evidence_kind) FROM uranius_043d_fixture.expected x WHERE job_id=p_run),
 'attested',(SELECT jsonb_agg(to_jsonb(x) ORDER BY evidence_kind) FROM uranius_043d_fixture.attestations x WHERE job_id=p_run),
 'admission',(SELECT to_jsonb(x) FROM uranius_043d_fixture.receipts x WHERE job_id=p_run),
 'stage',(SELECT to_jsonb(s) FROM s),
 'authority',(SELECT to_jsonb(x) FROM uranius_035_fixture.authority x JOIN s USING(stage_id)),
 'classification',(SELECT to_jsonb(x) FROM uranius_035_fixture.classifications x JOIN s USING(stage_id)),
 'fatigue',(SELECT jsonb_agg(to_jsonb(x) ORDER BY rider_id) FROM uranius_035_fixture.fatigue x JOIN s USING(stage_id)),
 'ranking',(SELECT jsonb_agg(to_jsonb(x) ORDER BY source_key) FROM uranius_035_fixture.ranking_awards x JOIN s USING(stage_id)),
 'completion',(SELECT to_jsonb(x) FROM uranius_035_fixture.completed_tours x JOIN s USING(stage_id)),
 'awards',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM a),
 'transactions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM t),
 'entries',(SELECT jsonb_agg(to_jsonb(e) ORDER BY tx_id,account) FROM e),
 'resourceJob',(SELECT to_jsonb(x) FROM uranius_043h_fixture.jobs x WHERE run_id=p_run),
 'resourceReceipt',(SELECT to_jsonb(x) FROM uranius_043h_fixture.receipts x WHERE run_id=p_run),
 'resourceEffects',(SELECT jsonb_agg(to_jsonb(x) ORDER BY resource_key) FROM uranius_043h_fixture.effects x WHERE run_id=p_run),
 'healthJob',(SELECT to_jsonb(x) FROM uranius_043i_fixture.jobs x WHERE run_id=p_run),
 'healthReceipt',(SELECT to_jsonb(x) FROM uranius_043i_fixture.receipts x WHERE run_id=p_run),
 'healthEvents',(SELECT jsonb_agg(to_jsonb(x) ORDER BY rider_id,incident_id) FROM uranius_043i_fixture.events x WHERE run_id=p_run))
$body$;
CREATE FUNCTION uranius_043j_fixture.finalize(p_run uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_043j_fixture SET timezone='UTC' AS $body$
DECLARE d uranius_043d_fixture.source%ROWTYPE; s uranius_035_fixture.stage_input%ROWTYPE;
 h uranius_043h_fixture.jobs%ROWTYPE; i uranius_043i_fixture.jobs%ROWTYPE;
 b bundles%ROWTYPE; old receipts%ROWTYPE; prior receipts%ROWTYPE; ev jsonb; answer text;
BEGIN
 SELECT * INTO STRICT d FROM uranius_043d_fixture.source WHERE job_id=p_run;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius043j:'||d.race_id::text,0));
 SELECT * INTO STRICT b FROM bundles WHERE run_id=p_run FOR UPDATE;
 SELECT * INTO STRICT d FROM uranius_043d_fixture.source WHERE job_id=p_run FOR UPDATE;
 SELECT * INTO STRICT s FROM uranius_035_fixture.stage_input WHERE run_id=p_run FOR UPDATE;
 SELECT * INTO STRICT h FROM uranius_043h_fixture.jobs WHERE run_id=p_run FOR UPDATE;
 SELECT * INTO STRICT i FROM uranius_043i_fixture.jobs WHERE run_id=p_run FOR UPDATE;
 IF d.stage_number NOT IN (1,2) OR b.tour->>'version' IS DISTINCT FROM '043C_tour_settlement_v1'
 OR b.tour->>'provenance' IS DISTINCT FROM 'synthetic_review_fixture'
 OR b.tour->>'official' IS DISTINCT FROM 'false' OR b.tour->>'hostedWriteAllowed' IS DISTINCT FROM 'false' OR b.tour->>'accountingAllowed' IS DISTINCT FROM 'false'
 OR b.tour->>'runId' IS DISTINCT FROM p_run::text OR b.tour->>'raceId' IS DISTINCT FROM d.race_id::text OR b.tour->>'stageId' IS DISTINCT FROM d.stage_id::text
 OR b.tour->>'stageNumber' IS DISTINCT FROM d.stage_number::text OR b.tour->'core' IS DISTINCT FROM s.packet
 OR b.tour->'source'->>'inputSha256' IS DISTINCT FROM d.input_sha OR b.tour->'source'->>'outputSha256' IS DISTINCT FROM d.output_sha
 OR s.race_id<>d.race_id OR h.race_id<>d.race_id OR i.race_id<>d.race_id
 OR s.stage_id<>d.stage_id OR h.stage_id<>d.stage_id OR i.stage_id<>d.stage_id
 OR s.stage_start<>d.stage_start OR s.game_now<>d.game_now OR s.replay_close<>d.replay_close OR s.real_now<>d.real_now
 OR h.stage_date<>s.stage_start::date OR i.stage_date<>h.stage_date OR h.distance_km IS DISTINCT FROM (d.input_text::jsonb->>'distanceKm')::numeric
 OR h.exact_only OR (s.packet->>'final')::boolean IS DISTINCT FROM (d.stage_number=2)
 THEN RAISE EXCEPTION 'Integrated scope mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(i.packet) c WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.input_text::jsonb->'riders') r WHERE r->>'riderId'=c->>'riderId' AND r->>'teamId'=c->>'clubId'))
 THEN RAISE EXCEPTION 'Health candidate outside admitted roster'; END IF;
 ev:=evidence(p_run);
 IF ev IS NULL OR (SELECT count(*) FROM jsonb_each(ev))<>10
 OR EXISTS(SELECT 1 FROM jsonb_each(ev) x WHERE NOT EXISTS(SELECT 1 FROM uranius_043d_fixture.expected a WHERE a.job_id=p_run AND a.evidence_kind=x.key AND a.evidence_sha=encode(sha256(convert_to(x.value::text,'UTF8')),'hex')))
 THEN RAISE EXCEPTION 'Integrated evidence mismatch'; END IF;
 IF d.prior_job_id IS NULL THEN
  IF s.prior_stage_id IS NOT NULL OR b.tour->'previousPacket' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Unexpected integrated prior'; END IF;
 ELSE
  SELECT * INTO prior FROM receipts WHERE run_id=d.prior_job_id;
  IF NOT FOUND OR prior.snapshot IS DISTINCT FROM closed_snapshot(d.prior_job_id)
   OR prior.snapshot->'stage'->>'stage_id' IS DISTINCT FROM s.prior_stage_id::text
   OR prior.snapshot->'bundle'->'tour' IS DISTINCT FROM b.tour->'previousPacket'
  THEN RAISE EXCEPTION 'Prior integrated receipt missing or changed'; END IF;
 END IF;
 SELECT * INTO old FROM receipts WHERE run_id=p_run;
 IF FOUND THEN
  IF old.snapshot IS DISTINCT FROM closed_snapshot(p_run) THEN RAISE EXCEPTION 'Closed integrated receipt changed'; END IF;
  RETURN 'already_finalized_fixture';
 END IF;
 IF s.state<>'replay_live' OR EXISTS(SELECT 1 FROM uranius_043d_fixture.receipts WHERE job_id=p_run)
 OR EXISTS(SELECT 1 FROM uranius_043h_fixture.receipts WHERE run_id=p_run)
 OR EXISTS(SELECT 1 FROM uranius_043i_fixture.receipts WHERE run_id=p_run) THEN RAISE EXCEPTION 'Partial integrated state'; END IF;
 answer:=uranius_043d_fixture.admit(p_run);
 IF answer<>'rehearsed_only' THEN RAISE EXCEPTION 'Admission outcome mismatch'; END IF;
 answer:=uranius_043h_fixture.apply_resources(p_run,false);
 IF answer<>'applied_fixture' THEN RAISE EXCEPTION 'Resource outcome mismatch'; END IF;
 answer:=uranius_043i_fixture.apply_health(p_run,false);
 IF answer<>'applied_fixture' THEN RAISE EXCEPTION 'Health outcome mismatch'; END IF;
 answer:=uranius_035_fixture.finalize(s.stage_id,false);
 IF answer<>'published_fixture' THEN RAISE EXCEPTION 'Settlement outcome mismatch'; END IF;
 INSERT INTO receipts(run_id,snapshot) VALUES(p_run,closed_snapshot(p_run));
 IF p_fault THEN RAISE EXCEPTION 'Injected integrated late failure'; END IF;
 RETURN 'finalized_fixture';
END $body$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_043j_fixture FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA uranius_043j_fixture FROM PUBLIC;
