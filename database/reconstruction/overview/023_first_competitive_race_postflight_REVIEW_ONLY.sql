-- REVIEW ONLY. Must follow approved 023 prefix, packet comparison and archive insert
-- in the same transaction; never execute alone. No persistent permission changes.
DO $finish023$ BEGIN
 IF (SELECT count(*) FROM uranius_private.synthetic_completed_race_runs)<>1
 OR (SELECT count(*) FROM uranius_game.races)<>3
 OR (SELECT count(*) FROM uranius_game.race_stages)<>4
 OR (SELECT count(*) FROM uranius_game.race_team_entries WHERE status='accepted')<>3
 OR (SELECT count(*) FROM uranius_game.race_team_entries)<>3
 OR (SELECT count(*) FROM uranius_game.race_preparations WHERE rider_count=0 AND total_cost_cash=0 AND finance_transaction_id IS NULL)<>3
 OR (SELECT count(*) FROM uranius_game.race_preparations)<>3
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>15
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists WHERE race_id='19000000-0000-4000-8000-000000000001')<>10
 OR (SELECT count(*) FROM uranius_game.synthetic_race_startlists WHERE race_id='19000000-0000-4000-8000-000000000002')<>5
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>17
 THEN RAISE EXCEPTION '023 final counts refused'; END IF;
END $finish023$;
SELECT jsonb_build_object('runs',count(*),'inputSha',min(input_sha256),'outputSha',min(output_sha256),
 'finishers',max(jsonb_array_length(output_text::jsonb->'finalRiderStates')),
 'teams',max(jsonb_array_length(input_text::jsonb->'teams')),
 'frames',max(jsonb_array_length(output_text::jsonb->'snapshots')),
 'events',max(jsonb_array_length(output_text::jsonb->'events')))
FROM uranius_private.synthetic_completed_race_runs;
DO $cleanup023$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['race_team_entries','race_preparations','synthetic_race_startlists'] LOOP
 EXECUTE format('DROP POLICY uranius_023_temp_insert ON uranius_game.%I',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists'] LOOP
 EXECUTE format('DROP POLICY uranius_023_temp_read ON uranius_game.%I',t);
 END LOOP;
 DROP POLICY uranius_023_temp_read ON uranius_private.synthetic_completed_race_runs;
 DROP POLICY uranius_023_temp_insert ON uranius_private.synthetic_completed_race_runs;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'uranius_023_temp_%')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename IN ('races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity'))<>5
 OR EXISTS(SELECT 1 FROM pg_policies WHERE (schemaname='uranius_game' AND tablename='synthetic_race_startlists') OR (schemaname='uranius_private' AND tablename='synthetic_completed_race_runs'))
 OR (SELECT count(*) FROM pg_class WHERE relrowsecurity AND relforcerowsecurity AND ((relnamespace='uranius_game'::regnamespace AND relname IN ('races','race_stages','race_team_entries','race_preparations','synthetic_rider_identity','synthetic_race_startlists')) OR oid='uranius_private.synthetic_completed_race_runs'::regclass))<>7
 THEN RAISE EXCEPTION '023 policy restoration refused'; END IF;
END $cleanup023$;
