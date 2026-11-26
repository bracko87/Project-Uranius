-- Disposable local PG17 only. Synthetic data, no production/hosted authority.
CREATE SCHEMA uranius_043h_fixture;
REVOKE ALL ON SCHEMA uranius_043h_fixture FROM PUBLIC;
CREATE TABLE uranius_043h_fixture.owners(owner_id uuid PRIMARY KEY);
CREATE TABLE uranius_043h_fixture.stock(
 owner_id uuid REFERENCES uranius_043h_fixture.owners, supply_key text,
 quantity integer NOT NULL CHECK(quantity>=0), total_used integer NOT NULL DEFAULT 0 CHECK(total_used>=0), last_used date,
 PRIMARY KEY(owner_id,supply_key),
 CHECK(supply_key IN ('bidons_water_bottles','energy_gels','nutrition_packs','race_jersey_complete','rain_jackets'))
);
CREATE TABLE uranius_043h_fixture.units(
 unit_id uuid PRIMARY KEY, owner_id uuid NOT NULL, supply_key text NOT NULL,
 remaining integer NOT NULL CHECK(remaining>=0), max_uses integer NOT NULL,
 total_used integer NOT NULL DEFAULT 0 CHECK(total_used>=0), status text NOT NULL CHECK(status IN ('ready','assigned','worn_out','discarded')),
 last_used date, retired date, created_order bigint NOT NULL,
 FOREIGN KEY(owner_id,supply_key) REFERENCES uranius_043h_fixture.stock,
 CHECK((supply_key='race_jersey_complete' AND max_uses=10 OR supply_key='rain_jackets' AND max_uses=25) AND remaining<=max_uses),
 CHECK(status<>'worn_out' OR remaining=0)
);
CREATE TABLE uranius_043h_fixture.wear(
 resource_id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES uranius_043h_fixture.owners,
 kind text NOT NULL CHECK(kind IN ('equipment','team_car','team_bus','equipment_van','mobile_workshop','medical_van')),
 condition numeric NOT NULL CHECK(condition BETWEEN 0 AND 100),
 distance_km numeric NOT NULL DEFAULT 0 CHECK(distance_km>=0), race_days integer NOT NULL DEFAULT 0 CHECK(race_days>=0), last_used date
);
CREATE TABLE uranius_043h_fixture.jobs(
 run_id uuid PRIMARY KEY, stage_id uuid UNIQUE NOT NULL, race_id uuid NOT NULL, stage_date date NOT NULL,
 distance_km numeric NOT NULL CHECK(distance_km>0), exact_only boolean NOT NULL,
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='array'), packet_sha text NOT NULL,
 CHECK(packet_sha=encode(sha256(convert_to(packet::text,'UTF8')),'hex'))
);
CREATE TABLE uranius_043h_fixture.effects(
 run_id uuid REFERENCES uranius_043h_fixture.jobs, resource_key text, owner_id uuid NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('applied','rebound','shortage_skip','no_usage')),
 applied_id text, effect jsonb NOT NULL, PRIMARY KEY(run_id,resource_key)
);
CREATE TABLE uranius_043h_fixture.receipts(
 run_id uuid PRIMARY KEY REFERENCES uranius_043h_fixture.jobs, job_sha text NOT NULL, effects jsonb NOT NULL,
 official boolean NOT NULL DEFAULT false CHECK(NOT official),
 hosted_write_allowed boolean NOT NULL DEFAULT false CHECK(NOT hosted_write_allowed),
 accounting_allowed boolean NOT NULL DEFAULT false CHECK(NOT accounting_allowed)
);
CREATE FUNCTION uranius_043h_fixture.apply_resources(p_run uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_043h_fixture SET timezone='UTC' AS $body$
DECLARE j jobs%ROWTYPE; old receipts%ROWTYPE; x jsonb; o uuid; k text; t text; s text; uid uuid; chosen uuid;
 n integer; loss numeric; st stock%ROWTYPE; u units%ROWTYPE; w wear%ROWTYPE; after_cond numeric;
 outcome text; detail jsonb; app text; snap jsonb; job_hash text; previous_used integer;
BEGIN
 SELECT * INTO STRICT j FROM jobs WHERE run_id=p_run FOR UPDATE;
 job_hash:=encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex');
 SELECT * INTO old FROM receipts WHERE run_id=p_run;
 IF FOUND THEN
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY resource_key),'[]') INTO snap FROM effects e WHERE run_id=p_run;
  IF old.job_sha<>job_hash OR old.effects IS DISTINCT FROM snap THEN RAISE EXCEPTION 'Immutable receipt changed'; END IF;
  RETURN 'already_applied_fixture';
 END IF;
 IF EXISTS(SELECT 1 FROM effects WHERE run_id=p_run) THEN RAISE EXCEPTION 'Partial effects'; END IF;
 IF jsonb_array_length(j.packet)>500 OR jsonb_array_length(j.packet)=0 THEN RAISE EXCEPTION 'Invalid packet count'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(j.packet) a WHERE jsonb_typeof(a)<>'object' OR nullif(a->>'key','') IS NULL OR nullif(a->>'ownerId','') IS NULL)
 OR (SELECT count(DISTINCT a->>'key') FROM jsonb_array_elements(j.packet) a)<>jsonb_array_length(j.packet)
 THEN RAISE EXCEPTION 'Invalid resource identity'; END IF;
 -- Serialize every shared owner in deterministic order across independent races.
 FOR o IN SELECT DISTINCT (a->>'ownerId')::uuid FROM jsonb_array_elements(j.packet) a ORDER BY 1 LOOP
  PERFORM 1 FROM owners WHERE owner_id=o FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown resource owner'; END IF;
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(j.packet) ORDER BY value->>'key' LOOP
  o:=(x->>'ownerId')::uuid; k:=x->>'key'; t:=x->>'kind'; s:=x->>'supplyKey'; app:=NULL;
  outcome:='applied';
  IF t='wear' THEN
   uid:=(x->>'resourceId')::uuid; loss:=(x->>'conditionUsed')::numeric;
   IF k IS DISTINCT FROM 'wear:'||uid::text OR loss IS NULL OR loss<0 OR loss>100 OR loss::text='NaN' THEN RAISE EXCEPTION 'Invalid wear delta'; END IF;
   SELECT * INTO w FROM wear WHERE resource_id=uid AND owner_id=o FOR UPDATE;
   IF NOT FOUND OR w.kind IS DISTINCT FROM x->>'assetKind' THEN RAISE EXCEPTION 'Wear owner or asset mismatch'; END IF;
   after_cond:=greatest(0,w.condition-loss);
   IF w.kind IN ('equipment','team_car','team_bus') THEN after_cond:=round(after_cond,2); END IF;
   UPDATE wear SET condition=after_cond,distance_km=distance_km+j.distance_km,race_days=race_days+1,last_used=j.stage_date WHERE resource_id=uid;
   detail:=jsonb_build_object('conditionBefore',w.condition,'conditionAfter',after_cond,'conditionUsed',loss,'distanceKm',j.distance_km,'gameDate',j.stage_date);
   app:=uid::text;
  ELSIF t='consumable' THEN
   IF s IS NULL OR s NOT IN ('bidons_water_bottles','energy_gels','nutrition_packs') OR k IS DISTINCT FROM 'supply:'||o::text||':'||s
    OR coalesce(x->>'quantityUsed','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid consumable resource'; END IF;
   n:=(x->>'quantityUsed')::integer;
   SELECT * INTO st FROM stock WHERE owner_id=o AND supply_key=s FOR UPDATE;
   IF NOT FOUND OR st.quantity<n THEN RAISE EXCEPTION 'Consumable shortage'; END IF;
   IF n=0 THEN outcome:='no_usage'; ELSE
    UPDATE stock SET quantity=quantity-n,total_used=total_used+n,last_used=j.stage_date WHERE owner_id=o AND supply_key=s;
   END IF;
   app:=k; detail:=jsonb_build_object('quantityBefore',st.quantity,'quantityAfter',st.quantity-n,'quantityUsed',n,'gameDate',j.stage_date);
  ELSIF t='durable' THEN
   uid:=(x->>'unitId')::uuid; chosen:=uid;
   IF uid IS NULL OR k IS DISTINCT FROM 'durable:'||uid::text OR s IS NULL OR s NOT IN ('race_jersey_complete','rain_jackets')
    OR coalesce(x->>'stageUsesUsed','') !~ '^[01]$' THEN RAISE EXCEPTION 'Invalid durable resource'; END IF;
   n:=(x->>'stageUsesUsed')::integer;
   SELECT * INTO st FROM stock WHERE owner_id=o AND supply_key=s FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Missing durable summary'; END IF;
   SELECT * INTO u FROM units WHERE unit_id=uid FOR UPDATE;
   IF FOUND AND (u.owner_id<>o OR u.supply_key<>s) THEN RAISE EXCEPTION 'Durable owner or key mismatch'; END IF;
   IF n=0 THEN outcome:='no_usage'; app:=NULL; detail:=jsonb_build_object('stageUsesUsed',0);
   ELSE
    IF u.unit_id IS NULL OR u.remaining<n OR u.status NOT IN ('ready','assigned') OR u.last_used>=j.stage_date THEN
     IF j.exact_only THEN RAISE EXCEPTION 'Exact durable unavailable'; END IF;
     SELECT * INTO u FROM units v WHERE v.owner_id=o AND v.supply_key=s AND v.status IN ('ready','assigned')
      AND v.remaining>=n AND (v.last_used IS NULL OR v.last_used<j.stage_date)
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(j.packet) z WHERE z->>'kind'='durable' AND z->>'unitId'=v.unit_id::text)
      AND NOT EXISTS(SELECT 1 FROM effects e WHERE e.run_id=p_run AND e.applied_id=v.unit_id::text)
      ORDER BY v.remaining,v.created_order,v.unit_id LIMIT 1 FOR UPDATE;
     IF NOT FOUND THEN outcome:='shortage_skip'; chosen:=NULL; ELSE outcome:='rebound'; chosen:=u.unit_id; END IF;
    END IF;
    IF chosen IS NULL THEN detail:=jsonb_build_object('stageUsesUsed',0,'requestedStageUses',n,'sportingOutputChanged',false);
    ELSE
     UPDATE units SET remaining=remaining-n,total_used=total_used+n,last_used=j.stage_date,
      status=CASE WHEN remaining-n=0 THEN 'worn_out' ELSE 'ready' END,
      retired=CASE WHEN remaining-n=0 THEN j.stage_date ELSE retired END WHERE unit_id=chosen;
     UPDATE stock SET quantity=(SELECT count(*) FROM units v WHERE v.owner_id=o AND v.supply_key=s AND v.status IN ('ready','assigned') AND v.remaining>0),
      total_used=total_used+n,last_used=j.stage_date WHERE owner_id=o AND supply_key=s;
     detail:=jsonb_build_object('stageUsesBefore',u.remaining,'stageUsesAfter',u.remaining-n,'stageUsesUsed',n,'gameDate',j.stage_date,'sportingOutputChanged',false);
     app:=chosen::text;
    END IF;
   END IF;
  ELSE RAISE EXCEPTION 'Unsupported resource kind'; END IF;
  INSERT INTO effects VALUES(p_run,k,o,outcome,app,detail);
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY resource_key),'[]') INTO snap FROM effects e WHERE run_id=p_run;
 INSERT INTO receipts(run_id,job_sha,effects) VALUES(p_run,job_hash,snap);
 IF p_fault THEN RAISE EXCEPTION 'Injected resource failure'; END IF;
 RETURN 'applied_fixture';
END $body$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_043h_fixture FROM PUBLIC;
REVOKE ALL ON FUNCTION uranius_043h_fixture.apply_resources(uuid,boolean) FROM PUBLIC;
