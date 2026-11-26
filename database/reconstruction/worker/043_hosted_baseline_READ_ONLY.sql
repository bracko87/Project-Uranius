-- 043 read-only evidence query. Isolated project sdtsivgtcaoaeoihcwzd only.
-- No migrations, credentials, job claims, function invocation of game code or writes.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
WITH expected_ledger(version,sha256) AS (VALUES
('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37'),
('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'),
('013_squad_reader_grant.sql','8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859'),
('014_synthetic_rider_uuid.sql','f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f'),
('015_rider_uuid_owner_read.sql','71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e'),
('018_synthetic_nine_skill_attributes.sql','622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc'),
('019_synthetic_race_world.sql','7e5f8a727dfc44784c0a8abf48c51b8ddfb19766a2cc319b7ff31686a068283b'),
('021_synthetic_startlists.sql','041964c176d2e647d13f7ef01d211757fc6738226f4679e18baea64b4df57186'),
('022_completed_race_archive.sql','5839e61caadced1a44a9f40e3f41c8fd45dbb9a99963312d1bd224e7a43c979d'),
('024_participant_replay_preview.sql','ee90f17d233680052b7fb281019467e7b6040f136371a52cd3686ded4102da55'),
('025_private_race_job_worker.sql','af4958b1b7e873058d0e687d5e4cc355808d8ccaceaca8a96b94c9ee1924baaf'),
('027_calendar_job_dispatch.sql','34084f249e1546815cf4674921968ed4485f05258c740ee74a3a451d0de274cc')
), expected_jobs(job_id,stage_id,job_kind,input_sha256,output_sha256) AS (VALUES
('a8800680-3970-4826-aca7-aa0e72420f66','25251441-bd5d-4f00-993d-859a95cf099e','verified_repeat','a4b666233b28e829ca55f3f3ca46f8cfd881eaa992897f70abc1c9b7fafd81bf','0501d5fcdcb39237b1f371768f7e08d56ad3f9bd0c580cd8d97142498c18c3ed'),
('e3fe3c1e-7eb3-40c1-9f44-d8e38ce359f0','882801c4-ea99-4aaf-8ae5-d2a11cd26fd8','calendar_review','f10fdaf48b87a4b3fcef2f075d50e6ab44b2f0f846a550819ecb7fee4337182a','6ca7d849e4aa4c2ac3257380f4a0a2a841223ebe8ff0775df592cc76a40dd150'),
('ffd45277-daf4-46eb-b231-1cf4ce6cfe5b','263edaea-28a2-438a-81b8-f7ca1fcd6d9f','calendar_review','d260f02b7447fa9caf40d41bd563197735ebf9dee05ae2bb553d4d89a70510f7','89b60ca820fe886d187d3c24fbe28eb6ebd4d083e3813260cca21dbe27ed56d8')
), protected_roles AS (SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','uranius_smoke_reader'))
SELECT
 (SELECT count(*)=1 AND bool_and(project_ref='sdtsivgtcaoaeoihcwzd') FROM uranius_private.project_identity) AS project_identity,
 current_setting('server_version') LIKE '17.%' AS pg17,
 (SELECT count(*)=20 FROM uranius_private.migration_ledger)
 AND NOT EXISTS(SELECT * FROM expected_ledger EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 AND NOT EXISTS(SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT * FROM expected_ledger) AS exact_ledger,
 (SELECT count(*)=3 FROM uranius_jobs.race_jobs)
 AND (SELECT count(*)=3 FROM uranius_jobs.race_jobs j JOIN expected_jobs e ON j.job_id::text=e.job_id AND j.stage_id::text=e.stage_id AND j.job_kind=e.job_kind AND j.input_sha256=e.input_sha256 AND j.output_sha256=e.output_sha256
 WHERE j.status='completed' AND j.attempt=1 AND j.lease_token IS NULL AND j.lease_until IS NULL AND j.completed_at IS NOT NULL
 AND j.input_sha256=encode(sha256(convert_to(j.input_text,'UTF8')),'hex') AND j.output_sha256=encode(sha256(convert_to(j.output_text,'UTF8')),'hex')) AS exact_completed_jobs,
 (SELECT count(*)=1 FROM uranius_private.synthetic_completed_race_runs)
 AND (SELECT count(*)=1 FROM uranius_private.synthetic_completed_race_runs a JOIN uranius_jobs.race_jobs j ON a.stage_id=j.stage_id AND a.input_text=j.input_text AND a.output_text=j.output_text WHERE j.job_kind='verified_repeat') AS archive_exact,
 (SELECT count(*)=1 FROM uranius_game.synthetic_race_replay_preview) AS replay_count,
 (SELECT count(*)=1 AND bool_and(is_paused AND season_number=1 AND month_number=1 AND day_number=1) FROM uranius_game.game_state) AS clock_paused,
 (SELECT count(*)=1 AND bool_and(NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication) FROM pg_roles WHERE rolname='uranius_worker')
 AND NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='uranius_worker')
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member='uranius_worker'::regrole) AS worker_dormant,
 NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE m.roleid='uranius_worker'::regrole AND (r.rolname<>'postgres' OR m.inherit_option OR m.set_option)) AS no_worker_delegation,
 NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='uranius_scheduler') AND to_regclass('cron.job') IS NULL AS scheduler_absent,
 (SELECT count(*)=4 FROM uranius_game.race_team_entries)
 AND (SELECT count(*)=4 FROM uranius_game.race_preparations WHERE total_cost_cash=0 AND finance_transaction_id IS NULL AND rider_count=0)
 AND (SELECT count(*)=20 FROM uranius_game.synthetic_race_startlists) AS zero_cost_preparation,
 NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('uranius_035_fixture','uranius_042_fixture')) AS local_fixtures_absent,
 (SELECT count(*)=3 AND bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class WHERE oid IN ('uranius_jobs.race_jobs'::regclass,'uranius_private.synthetic_completed_race_runs'::regclass,'uranius_game.synthetic_race_replay_preview'::regclass)) AS force_rls,
 (SELECT count(*)=2 AND bool_and(roles=ARRAY['uranius_worker']::name[] AND ((policyname='worker_read' AND cmd='SELECT') OR (policyname='worker_transition' AND cmd='UPDATE'))) FROM pg_policies WHERE schemaname='uranius_jobs' AND tablename='race_jobs') AS job_policy_scope,
 (SELECT count(*)=4 FROM protected_roles) AND NOT EXISTS(SELECT 1 FROM protected_roles WHERE has_schema_privilege(oid,'uranius_jobs','USAGE') OR has_any_column_privilege(oid,'uranius_jobs.race_jobs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(oid,'uranius_jobs.race_jobs','DELETE,TRUNCATE,TRIGGER') OR has_any_column_privilege(oid,'uranius_private.synthetic_completed_race_runs','SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(oid,'uranius_private.synthetic_completed_race_runs','DELETE,TRUNCATE,TRIGGER')) AS no_client_raw_access,
 has_schema_privilege('uranius_worker','uranius_jobs','USAGE') AND has_table_privilege('uranius_worker','uranius_jobs.race_jobs','SELECT') AND NOT has_any_column_privilege('uranius_worker','uranius_jobs.race_jobs','INSERT,REFERENCES') AND NOT has_table_privilege('uranius_worker','uranius_jobs.race_jobs','DELETE,TRUNCATE,TRIGGER')
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['uranius_private','uranius_game','uranius_catalog']) s(name) WHERE has_schema_privilege('uranius_worker',name,'USAGE'))
 AND (SELECT array_agg(attname::text ORDER BY attname) FROM pg_attribute WHERE attrelid='uranius_jobs.race_jobs'::regclass AND attnum>0 AND NOT attisdropped AND has_column_privilege('uranius_worker','uranius_jobs.race_jobs',attname,'UPDATE'))=ARRAY['attempt','completed_at','lease_token','lease_until','output_sha256','output_text','status'] AS worker_narrow_access;
ROLLBACK;
