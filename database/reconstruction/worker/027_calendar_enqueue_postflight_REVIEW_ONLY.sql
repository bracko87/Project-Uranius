-- REVIEW ONLY: appended to atomic 027 enqueue after input snapshot equality.
DO $post027$
DECLARE t text;
BEGIN
 IF (SELECT count(*) FROM uranius_jobs.race_jobs)<>2
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE job_id='a8800680-3970-4826-aca7-aa0e72420f66' AND job_kind='verified_repeat' AND calendar_date IS NULL AND status='completed' AND attempt=1 AND output_sha256='0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed')<>1
 OR (SELECT count(*) FROM uranius_jobs.race_jobs WHERE stage_id='882801c4-ea99-4aaf-8ae5-d2a11cd26fd8' AND job_kind='calendar_review' AND calendar_date='2000-01-03' AND status='queued' AND attempt=0 AND expected_output_sha256 IS NULL AND output_text IS NULL)<>1
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>4
 OR (SELECT count(*) FROM uranius_game.race_preparations WHERE total_cost_cash=0 AND finance_transaction_id IS NULL AND rider_count=0)<>4
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>20
 OR (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>1
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 THEN RAISE EXCEPTION '027 enqueue postcondition failed'; END IF;
 FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists'] LOOP
 EXECUTE format('DROP POLICY uranius_027_temp_read ON uranius_game.%I',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['race_team_entries','race_preparations','synthetic_race_startlists'] LOOP
 EXECUTE format('DROP POLICY uranius_027_temp_insert ON uranius_game.%I',t);
 END LOOP;
 DROP POLICY uranius_027_temp_insert ON uranius_jobs.race_jobs;
 DROP POLICY uranius_027_temp_read ON uranius_jobs.race_jobs;
 DROP POLICY uranius_027_temp_read ON uranius_private.synthetic_completed_race_runs;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'uranius_027_temp_%')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs')<>2
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_private' AND tablename='synthetic_completed_race_runs')
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='uranius_jobs.race_jobs'::regclass AND relrowsecurity AND relforcerowsecurity)
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','uranius_smoke_reader']) t(role_name) WHERE has_schema_privilege(role_name,'uranius_jobs','USAGE') OR has_any_column_privilege(role_name,'uranius_jobs.race_jobs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(role_name,'uranius_jobs.race_jobs','DELETE,TRUNCATE,TRIGGER'))
 OR has_column_privilege('uranius_worker','uranius_jobs.race_jobs','job_kind','UPDATE')
 OR has_column_privilege('uranius_worker','uranius_jobs.race_jobs','calendar_date','UPDATE')
 OR EXISTS(SELECT 1 FROM unnest(ARRAY['uranius_private','uranius_game','uranius_catalog']) t(schema_name) WHERE has_schema_privilege('uranius_worker',schema_name,'USAGE'))
 THEN RAISE EXCEPTION '027 security postcondition failed'; END IF;
END $post027$;
