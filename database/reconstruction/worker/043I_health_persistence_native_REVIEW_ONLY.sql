-- Disposable local PG17 only. Private static catalogue, synthetic riders.
CREATE SCHEMA uranius_043i_fixture;
REVOKE ALL ON SCHEMA uranius_043i_fixture FROM PUBLIC;
CREATE TABLE uranius_043i_fixture.catalogue(
 singleton boolean PRIMARY KEY CHECK(singleton),
 raw text NOT NULL CHECK(encode(sha256(convert_to(raw,'UTF8')),'hex')='2a93157617cf471ca3e6c448b21c01059ddd644eed3cb6b72440de7f31d9565b')
);
CREATE TABLE uranius_043i_fixture.riders(
 rider_id uuid PRIMARY KEY, club_id uuid NOT NULL,
 availability text NOT NULL DEFAULT 'fit' CHECK(availability IN ('fit','not_fully_fit','injured','sick')),
 unavailable_until date, last_stage_date date
);
CREATE TABLE uranius_043i_fixture.cases(
 case_id uuid PRIMARY KEY, rider_id uuid NOT NULL REFERENCES uranius_043i_fixture.riders,
 case_code text NOT NULL, case_type text NOT NULL CHECK(case_type IN ('injury','sickness')),
 severity text NOT NULL CHECK(severity IN ('minor','moderate','major')),
 status text NOT NULL CHECK(status IN ('active','recovering','resolved')),
 started_on date NOT NULL, active_until date NOT NULL, recovery_until date NOT NULL,resolved_on date,
 selection_blocked boolean NOT NULL,training_blocked boolean NOT NULL,development_blocked boolean NOT NULL,
 CHECK(started_on<=active_until AND active_until<=recovery_until),
 CHECK((status='resolved')=(resolved_on IS NOT NULL)),CHECK(resolved_on IS NULL OR resolved_on>=started_on)
);
CREATE UNIQUE INDEX one_open_case ON uranius_043i_fixture.cases(rider_id) WHERE status IN ('active','recovering');
CREATE TABLE uranius_043i_fixture.contexts(
 case_id uuid PRIMARY KEY REFERENCES uranius_043i_fixture.cases, run_id uuid NOT NULL, stage_id uuid NOT NULL,
 incident_id text NOT NULL, body_part text, calculation jsonb NOT NULL, merged_incidents jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE uranius_043i_fixture.jobs(
 run_id uuid PRIMARY KEY,stage_id uuid UNIQUE NOT NULL,race_id uuid NOT NULL,stage_date date NOT NULL,
 packet jsonb NOT NULL CHECK(jsonb_typeof(packet)='array'),packet_sha text NOT NULL,
 CHECK(packet_sha=encode(sha256(convert_to(packet::text,'UTF8')),'hex'))
);
CREATE TABLE uranius_043i_fixture.events(
 run_id uuid REFERENCES uranius_043i_fixture.jobs,stage_id uuid NOT NULL,rider_id uuid NOT NULL REFERENCES uranius_043i_fixture.riders,
 incident_id text, outcome text NOT NULL CHECK(outcome IN ('prevented','merged','created','superseded')),
 case_id uuid REFERENCES uranius_043i_fixture.cases, detail jsonb NOT NULL,
 PRIMARY KEY(stage_id,rider_id,incident_id), UNIQUE(run_id,rider_id,incident_id)
);
CREATE TABLE uranius_043i_fixture.receipts(
 run_id uuid PRIMARY KEY REFERENCES uranius_043i_fixture.jobs, job_sha text NOT NULL, events jsonb NOT NULL,
 official boolean NOT NULL DEFAULT false CHECK(NOT official),
 hosted_write_allowed boolean NOT NULL DEFAULT false CHECK(NOT hosted_write_allowed),
 accounting_allowed boolean NOT NULL DEFAULT false CHECK(NOT accounting_allowed)
);
CREATE FUNCTION uranius_043i_fixture.apply_health(p_run uuid,p_fault boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uranius_043i_fixture SET timezone='UTC' AS $body$
DECLARE j jobs%ROWTYPE; old receipts%ROWTYPE; cfg jsonb; x jsonb; cat jsonb; rid uuid; club uuid; rider riders%ROWTYPE; prior cases%ROWTYPE;
 code text; sev text; typ text; body text; incident text; risk numeric; roll numeric; staff numeric; center integer;
 base integer; reduction numeric; days integer; until_date date; active_date date; recovery_date date;
 sb boolean; tb boolean; db boolean; cid uuid; outcome text; calculation jsonb; snap jsonb; job_hash text;
BEGIN
 SELECT * INTO STRICT j FROM jobs WHERE run_id=p_run FOR UPDATE;
 SELECT raw::jsonb INTO STRICT cfg FROM catalogue WHERE singleton AND encode(sha256(convert_to(raw,'UTF8')),'hex')='2a93157617cf471ca3e6c448b21c01059ddd644eed3cb6b72440de7f31d9565b';
 job_hash:=encode(sha256(convert_to(to_jsonb(j)::text,'UTF8')),'hex');
 SELECT * INTO old FROM receipts WHERE run_id=p_run;
 IF FOUND THEN
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY rider_id,incident_id),'[]') INTO snap FROM events e WHERE run_id=p_run;
  IF old.job_sha<>job_hash OR old.events IS DISTINCT FROM snap THEN RAISE EXCEPTION 'Immutable health receipt changed'; END IF;
  RETURN 'already_applied_fixture';
 END IF;
 IF EXISTS(SELECT 1 FROM events WHERE run_id=p_run) THEN RAISE EXCEPTION 'Partial health events'; END IF;
 IF jsonb_array_length(j.packet)>500 OR EXISTS(SELECT 1 FROM jsonb_array_elements(j.packet) a WHERE jsonb_typeof(a)<>'object' OR nullif(a->>'riderId','') IS NULL OR nullif(a->>'incidentId','') IS NULL)
 OR (SELECT count(DISTINCT (a->>'riderId',a->>'incidentId')) FROM jsonb_array_elements(j.packet) a)<>jsonb_array_length(j.packet)
 THEN RAISE EXCEPTION 'Invalid or duplicate health incident'; END IF;
 -- Shared rider lock across independent races; deterministic lock order.
 FOR rid IN SELECT DISTINCT (a->>'riderId')::uuid FROM jsonb_array_elements(j.packet) a ORDER BY 1 LOOP
  PERFORM 1 FROM riders WHERE rider_id=rid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown rider'; END IF;
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(j.packet) ORDER BY value->>'riderId',value->>'incidentId' LOOP
  rid:=(x->>'riderId')::uuid; club:=(x->>'clubId')::uuid; incident:=x->>'incidentId';
  SELECT * INTO STRICT rider FROM riders WHERE rider_id=rid;
  IF club IS DISTINCT FROM rider.club_id THEN RAISE EXCEPTION 'Health club mismatch'; END IF;
  IF rider.last_stage_date>j.stage_date THEN RAISE EXCEPTION 'Out of order health stage'; END IF;
  code:=lower(trim(x->>'caseCode')); sev:=x->>'severity'; body:=nullif(trim(x->>'bodyPart'),'');
  code:=CASE code WHEN 'minor_strain' THEN 'muscle_strain' WHEN 'viral_illness' THEN 'respiratory_infection' WHEN 'viral_infection' THEN 'respiratory_infection' WHEN 'illness' THEN 'flu' WHEN 'dehydration' THEN 'heat_exhaustion' ELSE code END;
  SELECT value INTO cat FROM jsonb_array_elements(cfg) WHERE value->>'case_code'=code;
  IF cat IS NULL OR NOT (cat->'source_contexts' ? 'race') OR sev IS NULL OR sev NOT IN ('minor','moderate','major') THEN RAISE EXCEPTION 'Invalid race catalogue case or severity'; END IF;
  IF (cat->>'body_part_required')::boolean AND body IS NULL THEN RAISE EXCEPTION 'Body part required'; END IF;
  risk:=(x->>'riskMultiplier')::numeric; staff:=(x->>'staffReductionPct')::numeric; center:=(x->>'medicalCenterLevel')::integer;
  IF risk IS NULL OR risk<0 OR risk::text='NaN' OR staff IS NULL OR staff<0 OR staff>25 OR staff::text='NaN' OR center IS NULL OR center NOT BETWEEN 0 AND 5
   OR coalesce(x->>'medicalCenterLevel','') !~ '^[0-5]$' THEN RAISE EXCEPTION 'Invalid medical evidence'; END IF;
  risk:=greatest(.78,least(1,risk));
  roll:=round((('x'||substr(md5(p_run::text||':'||rid::text||':'||incident||':health_consequence'),1,12))::bit(48)::bigint)::numeric/281474976710655,6);
  base:=ceil(((cat->>(sev||'_min_days'))::numeric+(cat->>(sev||'_max_days'))::numeric)/2);
  reduction:=least(45,staff+center*4); days:=greatest(1,ceil(base*(1-reduction/100)));until_date:=j.stage_date+days;
  typ:=cat->>'case_type';
  calculation:=jsonb_build_object('catalogueSha256','2a93157617cf471ca3e6c448b21c01059ddd644eed3cb6b72440de7f31d9565b','caseCode',code,'severity',sev,'baseDays',base,'staffReductionPct',staff,'centerLevel',center,'reductionPct',reduction,'recoveryDays',days,'recoveryUntil',until_date,'riskMultiplier',risk,'roll',roll);
  cid:=NULL;
  IF risk<1 AND roll>=risk THEN outcome:='prevented';
  ELSE
   SELECT * INTO prior FROM cases WHERE rider_id=rid AND status IN ('active','recovering') FOR UPDATE;
   IF prior.case_id IS NOT NULL AND prior.started_on>j.stage_date THEN RAISE EXCEPTION 'Out of order prior case'; END IF;
   IF prior.case_id IS NOT NULL AND (CASE prior.severity WHEN 'major' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END)>(CASE sev WHEN 'major' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END) THEN
    cid:=prior.case_id; outcome:='merged';
    UPDATE contexts SET merged_incidents=merged_incidents||jsonb_build_array(jsonb_build_object('stageId',j.stage_id,'runId',p_run,'incidentId',incident,'caseCode',code,'severity',sev)) WHERE case_id=cid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing prior health context'; END IF;
   ELSE
    active_date:=until_date; recovery_date:=until_date;
    sb:=(cat->>'selection_blocked_default')::boolean;tb:=(cat->>'training_blocked_default')::boolean;db:=(cat->>'development_blocked_default')::boolean;
    outcome:='created';
    IF prior.case_id IS NOT NULL THEN
     outcome:='superseded'; active_date:=greatest(active_date,prior.active_until);recovery_date:=greatest(recovery_date,prior.recovery_until);
     sb:=sb OR prior.selection_blocked;tb:=tb OR prior.training_blocked;db:=db OR prior.development_blocked;
     UPDATE cases SET status='resolved',resolved_on=j.stage_date WHERE case_id=prior.case_id;
    END IF;
    IF sev<>'major' THEN sb:=coalesce(prior.selection_blocked,false); END IF;
    IF sev='minor' THEN tb:=false;db:=false;END IF;
    cid:=gen_random_uuid();
    INSERT INTO cases VALUES(cid,rid,code,typ,sev,'active',j.stage_date,active_date,recovery_date,NULL,sb,tb,db);
    INSERT INTO contexts(case_id,run_id,stage_id,incident_id,body_part,calculation)
     VALUES(cid,p_run,j.stage_id,incident,body,calculation||jsonb_build_object('priorCaseId',prior.case_id,'finalRecoveryUntil',recovery_date));
    UPDATE riders SET availability=CASE WHEN sev<>'major' THEN 'not_fully_fit' WHEN typ='sickness' THEN 'sick' ELSE 'injured' END,
     unavailable_until=CASE WHEN sev='major' THEN recovery_date ELSE NULL END WHERE rider_id=rid;
   END IF;
  END IF;
  UPDATE riders SET last_stage_date=j.stage_date WHERE rider_id=rid;
  INSERT INTO events VALUES(p_run,j.stage_id,rid,incident,outcome,cid,calculation||jsonb_build_object('beforeRider',to_jsonb(rider),'afterRider',(SELECT to_jsonb(z) FROM riders z WHERE rider_id=rid),'caseAfter',(SELECT to_jsonb(z) FROM cases z WHERE case_id=cid)));
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY rider_id,incident_id),'[]') INTO snap FROM events e WHERE run_id=p_run;
 INSERT INTO receipts(run_id,job_sha,events) VALUES(p_run,job_hash,snap);
 IF p_fault THEN RAISE EXCEPTION 'Injected health failure'; END IF;
 RETURN 'applied_fixture';
END $body$;
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_043i_fixture FROM PUBLIC;
REVOKE ALL ON FUNCTION uranius_043i_fixture.apply_health(uuid,boolean) FROM PUBLIC;
