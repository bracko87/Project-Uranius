-- DISPOSABLE LOCAL PG17 FIXTURE ONLY. Never install into a hosted database.
-- Separate test schema; no live game relations or roles. Invoker only.
CREATE SCHEMA uranius_035_fixture;
REVOKE ALL ON SCHEMA uranius_035_fixture FROM PUBLIC;
CREATE TABLE uranius_035_fixture.stage_input (
 stage_id uuid PRIMARY KEY, race_id uuid NOT NULL, run_id uuid UNIQUE NOT NULL,
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='object'),
 packet_sha text NOT NULL CHECK(packet_sha=encode(sha256(convert_to(packet::text,'UTF8')),'hex')),
 state text NOT NULL DEFAULT 'replay_live' CHECK(state IN ('replay_live','published')),
 stage_start timestamptz NOT NULL, game_now timestamptz NOT NULL,
 replay_close timestamptz NOT NULL, real_now timestamptz NOT NULL,
 daily_recovery_verified boolean NOT NULL, prior_stage_id uuid REFERENCES uranius_035_fixture.stage_input(stage_id),
 CHECK(prior_stage_id IS DISTINCT FROM stage_id)
);
CREATE TABLE uranius_035_fixture.authority (
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.stage_input(stage_id), run_id uuid UNIQUE NOT NULL,
 packet_sha text NOT NULL, final boolean NOT NULL
);
CREATE TABLE uranius_035_fixture.classifications (
 stage_id uuid PRIMARY KEY REFERENCES uranius_035_fixture.authority(stage_id), rows jsonb NOT NULL
);
CREATE TABLE uranius_035_fixture.fatigue (
 stage_id uuid REFERENCES uranius_035_fixture.authority(stage_id), rider_id uuid, fatigue integer NOT NULL CHECK(fatigue BETWEEN 0 AND 100),
 PRIMARY KEY(stage_id,rider_id)
);
CREATE TABLE uranius_035_fixture.prize_awards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), race_id uuid NOT NULL, stage_id uuid NOT NULL REFERENCES uranius_035_fixture.stage_input(stage_id),
 bucket text NOT NULL, rank integer NOT NULL CHECK(rank>0), team_id uuid NOT NULL, rider_id uuid,
 payment_club_id uuid NOT NULL, gross_cash bigint NOT NULL CHECK(gross_cash>=0),
 paid boolean NOT NULL DEFAULT false,
 UNIQUE NULLS NOT DISTINCT(race_id,stage_id,bucket,rank,team_id,rider_id)
);
CREATE TABLE uranius_035_fixture.ranking_awards (
 stage_id uuid REFERENCES uranius_035_fixture.authority(stage_id), source_key text, rider_points integer NOT NULL CHECK(rider_points>=0),
 team_points integer NOT NULL CHECK(team_points>=0), PRIMARY KEY(stage_id,source_key)
);
CREATE TABLE uranius_035_fixture.transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL CHECK(event_type IN ('race_prize','tax_withholding')),
 club_id uuid NOT NULL, ref_id uuid NOT NULL, amount bigint NOT NULL CHECK(amount>0),
 UNIQUE(event_type,club_id,ref_id)
);
CREATE TABLE uranius_035_fixture.entries (
 tx_id uuid REFERENCES uranius_035_fixture.transactions(id), account text NOT NULL,
 amount bigint NOT NULL CHECK(amount<>0), PRIMARY KEY(tx_id,account)
);
CREATE TABLE uranius_035_fixture.completed_tours (
 race_id uuid PRIMARY KEY, stage_id uuid UNIQUE REFERENCES uranius_035_fixture.authority(stage_id)
);
CREATE FUNCTION uranius_035_fixture.finalize(p_stage uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_035_fixture AS $$
DECLARE s stage_input%ROWTYPE; a prize_awards%ROWTYPE; j jsonb; t uuid; withholding bigint; tax_rate integer; is_final boolean;
BEGIN
 -- Race-level lock serializes adjacent stages and final-stage regeneration.
 SELECT * INTO STRICT s FROM stage_input WHERE stage_id=p_stage;
 PERFORM pg_advisory_xact_lock(hashtextextended('uranius035-fixture:'||s.race_id::text,0));
 SELECT * INTO STRICT s FROM stage_input WHERE stage_id=p_stage FOR UPDATE;
 IF s.packet_sha IS DISTINCT FROM encode(sha256(convert_to(s.packet::text,'UTF8')),'hex')
 OR s.packet->>'version' IS DISTINCT FROM '035_synthetic_finalization_v1'
 OR s.packet->>'official' IS DISTINCT FROM 'false'
 OR s.packet->>'hostedWriteAllowed' IS DISTINCT FROM 'false'
 OR s.packet->>'raceId' IS DISTINCT FROM s.race_id::text
 OR s.packet->>'stageId' IS DISTINCT FROM s.stage_id::text
 OR s.packet->>'runId' IS DISTINCT FROM s.run_id::text THEN RAISE EXCEPTION 'Fixture packet identity invalid'; END IF;
 IF s.state='published' THEN
  IF EXISTS(SELECT 1 FROM authority WHERE stage_id=p_stage AND run_id=s.run_id AND packet_sha=s.packet_sha) THEN RETURN 'already_published'; END IF;
  RAISE EXCEPTION 'Partial authority';
 END IF;
 IF NOT s.daily_recovery_verified OR s.game_now<s.stage_start+interval '30 minutes' OR s.real_now<s.replay_close THEN RAISE EXCEPTION 'Reveal/recovery gate closed'; END IF;
 IF s.prior_stage_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM authority a0 JOIN stage_input p0 ON p0.stage_id=a0.stage_id WHERE a0.stage_id=s.prior_stage_id AND p0.race_id=s.race_id AND p0.state='published') THEN RAISE EXCEPTION 'Prior stage not authoritative'; END IF;
 IF EXISTS(SELECT 1 FROM authority WHERE stage_id=p_stage) OR EXISTS(SELECT 1 FROM prize_awards WHERE stage_id=p_stage) THEN RAISE EXCEPTION 'Partial state refused'; END IF;
 IF jsonb_typeof(s.packet->'classifications'->'general') IS DISTINCT FROM 'array' OR jsonb_array_length(s.packet->'classifications'->'general')=0 THEN RAISE EXCEPTION 'No GC'; END IF;
 IF jsonb_typeof(s.packet->'cash') IS DISTINCT FROM 'array' OR jsonb_typeof(s.packet->'ranking') IS DISTINCT FROM 'array' OR jsonb_typeof(s.packet->'fatigue') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Missing rows'; END IF;
 is_final:=(s.packet->>'final')::boolean;
 tax_rate:=(s.packet->>'fixtureTaxRateBps')::integer;
 IF tax_rate IS NULL OR tax_rate NOT BETWEEN 0 AND 10000 OR is_final IS NULL THEN RAISE EXCEPTION 'Invalid fixture policy'; END IF;
 INSERT INTO authority VALUES(p_stage,s.run_id,s.packet_sha,is_final);
 INSERT INTO classifications VALUES(p_stage,s.packet->'classifications');
 FOR j IN SELECT value FROM jsonb_array_elements(s.packet->'fatigue') LOOP
  INSERT INTO fatigue VALUES(p_stage,(j->>'riderId')::uuid,(j->>'fatigue')::integer);
 END LOOP;
 FOR j IN SELECT value FROM jsonb_array_elements(s.packet->'ranking') LOOP
  IF j->>'stageId' IS DISTINCT FROM p_stage::text OR j->>'raceId' IS DISTINCT FROM s.race_id::text THEN RAISE EXCEPTION 'Ranking scope mismatch'; END IF;
  INSERT INTO ranking_awards VALUES(p_stage,j->>'sourceKey',(j->>'riderPoints')::integer,(j->>'teamPoints')::integer);
 END LOOP;
 FOR j IN SELECT value FROM jsonb_array_elements(s.packet->'cash') LOOP
  IF j->>'raceId' IS DISTINCT FROM s.race_id::text OR NOT EXISTS(SELECT 1 FROM stage_input s0 WHERE s0.stage_id=(j->>'stageId')::uuid AND s0.race_id=s.race_id AND (s0.stage_id=p_stage OR (is_final AND s0.state='published'))) THEN RAISE EXCEPTION 'Cash scope mismatch'; END IF;
  SELECT * INTO a FROM prize_awards WHERE race_id=s.race_id AND stage_id=(j->>'stageId')::uuid AND bucket=j->>'bucket' AND rank=(j->>'rank')::integer AND team_id=(j->>'teamId')::uuid AND rider_id IS NOT DISTINCT FROM (j->>'riderId')::uuid;
  IF FOUND THEN
   IF a.gross_cash IS DISTINCT FROM (j->>'grossCash')::bigint OR a.payment_club_id IS DISTINCT FROM (j->>'paymentClubId')::uuid THEN RAISE EXCEPTION 'Changed prior award refused'; END IF;
   IF a.gross_cash>0 AND (NOT a.paid OR NOT EXISTS(SELECT 1 FROM transactions WHERE event_type='race_prize' AND club_id=a.payment_club_id AND ref_id=a.id AND amount=a.gross_cash)) THEN RAISE EXCEPTION 'Incomplete prior settlement'; END IF;
   CONTINUE;
  END IF;
  IF (j->>'stageId')::uuid<>p_stage THEN RAISE EXCEPTION 'Missing prior award refused'; END IF;
  INSERT INTO prize_awards(race_id,stage_id,bucket,rank,team_id,rider_id,payment_club_id,gross_cash)
  VALUES(s.race_id,p_stage,j->>'bucket',(j->>'rank')::integer,(j->>'teamId')::uuid,(j->>'riderId')::uuid,(j->>'paymentClubId')::uuid,(j->>'grossCash')::bigint) RETURNING * INTO a;
  IF a.gross_cash=0 THEN CONTINUE; END IF;
  INSERT INTO transactions(event_type,club_id,ref_id,amount) VALUES('race_prize',a.payment_club_id,a.id,a.gross_cash) RETURNING id INTO t;
  INSERT INTO entries VALUES(t,'TREASURY',-a.gross_cash),(t,'CLUB:'||a.payment_club_id::text,a.gross_cash);
  withholding:=round(a.gross_cash::numeric*tax_rate/10000)::bigint;
  IF withholding>0 THEN
   INSERT INTO transactions(event_type,club_id,ref_id,amount) VALUES('tax_withholding',a.payment_club_id,t,withholding) RETURNING id INTO t;
   INSERT INTO entries VALUES(t,'CLUB:'||a.payment_club_id::text,-withholding),(t,'TAX_AUTHORITY',withholding);
  END IF;
  UPDATE prize_awards SET paid=true WHERE id=a.id;
 END LOOP;
 IF p_fault THEN RAISE EXCEPTION 'Injected failure after all postings'; END IF;
 IF EXISTS(SELECT 1 FROM entries GROUP BY tx_id HAVING sum(amount)<>0 OR count(*)<>2) THEN RAISE EXCEPTION 'Unbalanced ledger'; END IF;
 IF is_final THEN INSERT INTO completed_tours VALUES(s.race_id,p_stage); END IF;
 UPDATE stage_input SET state='published' WHERE stage_id=p_stage;
 RETURN 'published_fixture';
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_035_fixture FROM PUBLIC;
REVOKE ALL ON FUNCTION uranius_035_fixture.finalize(uuid,boolean) FROM PUBLIC;
