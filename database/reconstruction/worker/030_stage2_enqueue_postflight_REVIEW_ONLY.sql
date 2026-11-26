-- REVIEW ONLY: appended to atomic 030 enqueue after input snapshot equality.
DO $post030$
DECLARE t text;
BEGIN
 IF (SELECT count(*) FROM uranius_jobs.race_jobs)<>3
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE job_id='a8800680-3970-4826-aca7-aa0e72420f66' AND job_kind='verified_repeat' AND calendar_date IS NULL AND status='completed' AND attempt=1 AND output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed')<>1
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE stage_id='263edaea-28a2-438a-81b8-f7ca1fcd6d9f' AND job_kind='calendar_review' AND calendar_date='2000-01-04' AND status='queued' AND input_sha256='d260f02b7447fa9caf40d41bd563197735ebf9dee05ae2bb553d4d89a70510f7' AND input_sha256=encode(sha256(convert_to(input_text,'UTF8')),'hex') AND attempt=0 AND expected_output_sha256 IS NULL AND output_text IS NULL)<>1
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE job_id='e3fe3c1e-7eb3-40c1-9f44-d8e38ce359f0' AND status='completed' AND attempt=1 AND input_sha256='f10fdaf48b87a4b3fcef2f075d50e6ab44b2f0f846a550819ecb7fee4337182a' AND output_sha256='6ca7d849e4aa4c2ac3257380f4a0a2a841223ebe8ff0775df592cc76a40dd150' AND output_sha256=encode(sha256(convert_to(output_text,'UTF8')),'hex'))<>1
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>20
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>4
 OR (SELECT count(*) FROM uranius_game.race_preparations WHERE total_cost_cash=0 AND finance_transaction_id IS NULL AND rider_count=0)<>4
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>20
 OR (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>1
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 THEN RAISE EXCEPTION '030 enqueue postcondition failed'; END IF;
 FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists'] LOOP
 EXECUTE format('DROP POLICY uranius_030_temp_read ON uranius_game.%I',t);
 END LOOP;
 DROP POLICY uranius_030_temp_insert ON uranius_jobs.race_jobs;
 DROP POLICY uranius_030_temp_read ON uranius_jobs.race_jobs;
 DROP POLICY uranius_030_temp_read ON uranius_private.synthetic_completed_race_runs;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'uranius_030_temp_%')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs')<>2
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass AND relrowsecurity AND relforcerowsecurity)
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) t(role_name) WHERE has_schema_privilege(role_name,'uranius_jobs','USAGE') OR has_any_column_privilege(role_name,'uranius_jobs.race_jobs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_jobs.race_jobs','DELETE,TRUNCATE,TRIGGER'))
 OR has_column_privilege('uranius_worker','uranius_jobs.race_jobs','job_kind','UPDATE')
 OR has_column_privilege('uranius_worker','uranius_jobs.race_jobs','calendar_date','UPDATE')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['uranius_private','uranius_game','uranius_catalog']) t(schema_name) WHERE has_schema_privilege('uranius_worker',schema_name,'USAGE'))
 THEN RAISE EXCEPTION '030 security postcondition failed'; END IF;
END $post030$;
