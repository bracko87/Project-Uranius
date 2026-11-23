-- Uranius Overview race reader, review candidate for a SINGLE atomic hosted migration.
-- REVIEW_ONLY_NOT_APPROVED; do not execute on any hosted database without explicit
-- approval of the package SHA-256 and confirmation of target + exact contents.
-- Target: sdtsivgtcaoaeoihcwzd only, PostgreSQL 17. Original production excluded.
-- All source-backed race tables are created EMPTY; no player records imported.
-- No public Auth, Data API, scheduler, payment, movement or season changes.
-- Must be executed through a verified single-transaction guarded migration runner.
SELECT uranius_private.assert_project();
DO $uranius_010_preflight$
BEGIN
  PERFORM set_config('search_path','pg_catalog',true);
  PERFORM set_config('lock_timeout','5s',true);
  PERFORM pg_advisory_xact_lock(410501);
  IF current_user <> 'uranius_migrator'
    OR session_user <> current_user
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::int / 10000 <> 17
    OR current_setting('uranius.approved_project_ref',true) <> 'sdtsivgtcaoaeoihcwzd'
    OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND
      (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
    OR to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
    OR (SELECT count(*) FROM uranius_private.migration_ledger) <> 9
    OR EXISTS (
      SELECT * FROM (VALUES
        ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
        ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
        ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
        ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
        ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
        ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
        ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
        ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
        ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37')
      ) AS expected(version,sha256)
      EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger
    )
    OR EXISTS (
      SELECT version,sha256 FROM uranius_private.migration_ledger
      EXCEPT SELECT * FROM (VALUES
        ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
        ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
        ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
        ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
        ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
        ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
        ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
        ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
        ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37')
      ) AS expected(version,sha256)
    )
    OR (SELECT count(*) FROM uranius_catalog.team_owners) <> 2
    OR (SELECT count(*) FROM uranius_catalog.riders) <> 200
    OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1) <> 1
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader' AND rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
  THEN
    RAISE EXCEPTION 'Uranius overview reader migration prereqs differ from the nine-entry isolated baseline';
  END IF;
END
$uranius_010_preflight$;

-- Original source-backed 010 table structure; no fixture BEGIN/ROLLBACK.
DO $guard$ BEGIN
  IF current_schema() IS NULL OR to_regclass('uranius_game.club_profiles') IS NULL OR
     to_regclass('uranius_game.races') IS NOT NULL OR
     to_regclass('uranius_game.race_stages') IS NOT NULL OR
     to_regclass('uranius_game.race_team_entries') IS NOT NULL OR
     to_regclass('uranius_game.race_preparations') IS NOT NULL THEN
     RAISE EXCEPTION 'Uranius 010 review-only fixture preconditions not met';
  END IF;
END $guard$;

CREATE TABLE uranius_game."races" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "short_name" text,
  "start_date" date,
  "end_date" date,
  "country_code" text,
  "host_city" text,
  "category" text NOT NULL DEFAULT 'uncategorized'::text,
  "race_type" text NOT NULL DEFAULT 'one_day'::text,
  "is_stage_race" boolean NOT NULL DEFAULT false,
  "stage_count" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'scheduled'::text,
  "profile_image_url" text,
  "description" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "logo_url" text,
  "start_time_region_code" text,
  "planned_start_hour_number" integer,
  "planned_start_minute" integer NOT NULL DEFAULT 0,
  "planned_start_time_label" text,
  "planned_start_assigned_at" timestamp with time zone,
  CONSTRAINT "races_date_order_chk" CHECK (end_date >= start_date),
  CONSTRAINT "races_pkey" PRIMARY KEY (id),
  CONSTRAINT "races_planned_start_hour_number_chk" CHECK (planned_start_hour_number IS NULL OR planned_start_hour_number >= 0 AND planned_start_hour_number <= 23),
  CONSTRAINT "races_planned_start_minute_chk" CHECK (planned_start_minute = ANY (ARRAY[0, 15, 30, 45])),
  CONSTRAINT "races_race_type_chk" CHECK (race_type = ANY (ARRAY['one_day'::text, 'stage_race'::text])),
  CONSTRAINT "races_stage_count_chk" CHECK (stage_count > 0),
  CONSTRAINT "races_start_time_region_code_chk" CHECK (start_time_region_code IS NULL OR (start_time_region_code = ANY (ARRAY['apac'::text, 'emea'::text, 'americas'::text]))),
  CONSTRAINT "races_status_chk" CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text, 'archived'::text]))
);

CREATE TABLE uranius_game."race_stages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "race_id" uuid NOT NULL,
  "stage_number" integer NOT NULL,
  "stage_date" date,
  "name" text,
  "start_city" text NOT NULL,
  "finish_city" text NOT NULL,
  "host_city" text,
  "host_country_code" text,
  "distance_km" numeric(7,2) NOT NULL,
  "terrain_type" text NOT NULL,
  "finish_type" text NOT NULL DEFAULT 'flat_finish'::text,
  "is_summit_finish" boolean NOT NULL DEFAULT false,
  "flat_pct" numeric(5,2) NOT NULL DEFAULT 100,
  "hilly_pct" numeric(5,2) NOT NULL DEFAULT 0,
  "mountain_pct" numeric(5,2) NOT NULL DEFAULT 0,
  "cobbled_pct" numeric(5,2) NOT NULL DEFAULT 0,
  "elevation_gain_m" integer,
  "profile_image_url" text,
  "weather_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "rules_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "start_city_name" text,
  "finish_city_name" text,
  "profile_type" text,
  "notes" text,
  "intermediate_sprints_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "mountain_climbs_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "weather_summary" text,
  "start_time_region_code" text,
  "planned_start_hour_number" integer,
  "planned_start_minute" integer NOT NULL DEFAULT 0,
  "planned_start_time_label" text,
  "planned_start_assigned_at" timestamp with time zone,
  "stage_format" text NOT NULL DEFAULT 'road_race'::text,
  "weather_cancelled" boolean NOT NULL DEFAULT false,
  "weather_cancellation_reason" text,
  "weather_cancelled_at" timestamp with time zone,
  CONSTRAINT "race_stages_distance_km_chk" CHECK (distance_km > 0::numeric),
  CONSTRAINT "race_stages_elevation_gain_chk" CHECK (elevation_gain_m IS NULL OR elevation_gain_m >= 0),
  CONSTRAINT "race_stages_finish_type_chk" CHECK (finish_type = ANY (ARRAY['flat_finish'::text, 'uphill_finish'::text, 'summit_finish'::text, 'time_trial_finish'::text, 'team_time_trial_finish'::text, 'prologue_finish'::text, 'cobbled_finish'::text])),
  CONSTRAINT "race_stages_pkey" PRIMARY KEY (id),
  CONSTRAINT "race_stages_planned_start_hour_number_chk" CHECK (planned_start_hour_number IS NULL OR planned_start_hour_number >= 0 AND planned_start_hour_number <= 23),
  CONSTRAINT "race_stages_planned_start_minute_chk" CHECK (planned_start_minute = ANY (ARRAY[0, 15, 30, 45])),
  CONSTRAINT "race_stages_stage_format_chk" CHECK (stage_format IS NULL OR (stage_format = ANY (ARRAY['road_race'::text, 'individual_time_trial'::text, 'team_time_trial'::text, 'pair_time_trial'::text, 'prologue'::text]))),
  CONSTRAINT "race_stages_stage_number_chk" CHECK (stage_number > 0),
  CONSTRAINT "race_stages_start_time_region_code_chk" CHECK (start_time_region_code IS NULL OR (start_time_region_code = ANY (ARRAY['apac'::text, 'emea'::text, 'americas'::text]))),
  CONSTRAINT "race_stages_terrain_percent_ranges_chk" CHECK (flat_pct >= 0::numeric AND flat_pct <= 100::numeric AND hilly_pct >= 0::numeric AND hilly_pct <= 100::numeric AND mountain_pct >= 0::numeric AND mountain_pct <= 100::numeric AND cobbled_pct >= 0::numeric AND cobbled_pct <= 100::numeric),
  CONSTRAINT "race_stages_terrain_percent_sum_chk" CHECK ((flat_pct + hilly_pct + mountain_pct + cobbled_pct) >= 99.00 AND (flat_pct + hilly_pct + mountain_pct + cobbled_pct) <= 101.00),
  CONSTRAINT "race_stages_terrain_type_chk" CHECK (terrain_type = ANY (ARRAY['flat'::text, 'hilly'::text, 'mountain'::text, 'individual_time_trial'::text, 'team_time_trial'::text, 'prologue'::text, 'cobbled'::text])),
  CONSTRAINT "race_stages_unique_race_stage_number" UNIQUE (race_id, stage_number)
);

CREATE TABLE uranius_game."race_team_entries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "race_id" uuid NOT NULL,
  "club_id" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'under_review'::text,
  "commitment_score_snapshot" integer,
  "acceptance_score" numeric,
  "review_round" integer,
  "decision_reason" text,
  "reviewed_at" timestamp with time zone,
  "final_decision_at" timestamp with time zone,
  "withdrawn_at" timestamp with time zone,
  "missed_startlist_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "entry_source" text NOT NULL DEFAULT 'user'::text,
  "is_ai_filler" boolean NOT NULL DEFAULT false,
  "auto_filled_at" timestamp with time zone,
  "participating_club_id" uuid NOT NULL,
  CONSTRAINT "race_team_entries_pkey" PRIMARY KEY (id),
  CONSTRAINT "race_team_entries_status_check" CHECK (status IS NOT NULL AND btrim(status) <> ''::text)
);

CREATE TABLE uranius_game."race_preparations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "race_id" uuid NOT NULL,
  "club_id" uuid NOT NULL,
  "race_team_entry_id" uuid,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "startlist_status" text NOT NULL DEFAULT 'draft'::text,
  "setup_window_opens_on" date,
  "rider_submission_deadline_on" date,
  "submitted_at" timestamp with time zone,
  "locked_at" timestamp with time zone,
  "default_equipment_setup_id" uuid,
  "rider_count" integer NOT NULL DEFAULT 0,
  "staff_count" integer NOT NULL DEFAULT 0,
  "participation_cost_cash" bigint NOT NULL DEFAULT 0,
  "travel_cost_cash" bigint NOT NULL DEFAULT 0,
  "staff_travel_cost_cash" bigint NOT NULL DEFAULT 0,
  "asset_transport_cost_cash" bigint NOT NULL DEFAULT 0,
  "supplies_cost_cash" bigint NOT NULL DEFAULT 0,
  "operations_cost_cash" bigint NOT NULL DEFAULT 0,
  "total_cost_cash" bigint NOT NULL DEFAULT 0,
  "finance_transaction_id" uuid,
  "cost_breakdown_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "team_policies_snapshot_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "validation_snapshot_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "engine_payload_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "participating_club_id" uuid NOT NULL,
  CONSTRAINT "race_preparations_asset_transport_cost_cash_check" CHECK (asset_transport_cost_cash >= 0),
  CONSTRAINT "race_preparations_operations_cost_cash_check" CHECK (operations_cost_cash >= 0),
  CONSTRAINT "race_preparations_participation_cost_cash_check" CHECK (participation_cost_cash >= 0),
  CONSTRAINT "race_preparations_pkey" PRIMARY KEY (id),
  CONSTRAINT "race_preparations_rider_count_check" CHECK (rider_count >= 0),
  CONSTRAINT "race_preparations_staff_count_check" CHECK (staff_count >= 0),
  CONSTRAINT "race_preparations_staff_travel_cost_cash_check" CHECK (staff_travel_cost_cash >= 0),
  CONSTRAINT "race_preparations_startlist_status_check" CHECK (startlist_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'locked'::text, 'auto_defaulted'::text, 'missed_startlist'::text])),
  CONSTRAINT "race_preparations_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'locked'::text, 'auto_defaulted'::text, 'missed_startlist'::text, 'sent_to_engine'::text, 'cancelled'::text])),
  CONSTRAINT "race_preparations_supplies_cost_cash_check" CHECK (supplies_cost_cash >= 0),
  CONSTRAINT "race_preparations_total_cost_cash_check" CHECK (total_cost_cash >= 0),
  CONSTRAINT "race_preparations_travel_cost_cash_check" CHECK (travel_cost_cash >= 0),
  CONSTRAINT "race_preparations_unique_race_club" UNIQUE (race_id, club_id)
);

ALTER TABLE uranius_game."race_stages" ADD CONSTRAINT "race_stages_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES uranius_game."races" ("id") ON DELETE CASCADE;
ALTER TABLE uranius_game."race_team_entries" ADD CONSTRAINT "race_team_entries_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES uranius_game."races" ("id") ON DELETE CASCADE;
ALTER TABLE uranius_game."race_preparations" ADD CONSTRAINT "race_preparations_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES uranius_game."races" ("id") ON DELETE CASCADE;
ALTER TABLE uranius_game."race_preparations" ADD CONSTRAINT "race_preparations_race_team_entry_id_fkey" FOREIGN KEY ("race_team_entry_id") REFERENCES uranius_game."race_team_entries" ("id") ON DELETE SET NULL;
ALTER TABLE uranius_game."race_team_entries" ADD CONSTRAINT "race_team_entries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES uranius_game."club_profiles" ("club_id") ON DELETE CASCADE;
ALTER TABLE uranius_game."race_team_entries" ADD CONSTRAINT "race_team_entries_participating_club_id_fkey" FOREIGN KEY ("participating_club_id") REFERENCES uranius_game."club_profiles" ("club_id") ON DELETE RESTRICT;
ALTER TABLE uranius_game."race_preparations" ADD CONSTRAINT "race_preparations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES uranius_game."club_profiles" ("club_id") ON DELETE CASCADE;
ALTER TABLE uranius_game."race_preparations" ADD CONSTRAINT "race_preparations_participating_club_id_fkey" FOREIGN KEY ("participating_club_id") REFERENCES uranius_game."club_profiles" ("club_id") ON DELETE RESTRICT;

ALTER TABLE uranius_game."races" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game."races" FROM PUBLIC, anon, authenticated;
ALTER TABLE uranius_game."races" FORCE ROW LEVEL SECURITY;
ALTER TABLE uranius_game."race_stages" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game."race_stages" FROM PUBLIC, anon, authenticated;
ALTER TABLE uranius_game."race_stages" FORCE ROW LEVEL SECURITY;
ALTER TABLE uranius_game."race_team_entries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game."race_team_entries" FROM PUBLIC, anon, authenticated;
ALTER TABLE uranius_game."race_team_entries" FORCE ROW LEVEL SECURITY;
ALTER TABLE uranius_game."race_preparations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON uranius_game."race_preparations" FROM PUBLIC, anon, authenticated;
ALTER TABLE uranius_game."race_preparations" FORCE ROW LEVEL SECURITY;

-- Reviewed 012 restricted reader policies and SELECT columns.
DO $gate$ BEGIN
 IF to_regclass('uranius_game.races') IS NULL OR
    to_regclass('uranius_game.race_stages') IS NULL OR
    to_regclass('uranius_game.race_team_entries') IS NULL OR
    to_regclass('uranius_game.race_preparations') IS NULL OR
    to_regprocedure('uranius_game.get_my_club_id()') IS NULL OR
    NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='uranius_smoke_reader') THEN
    RAISE EXCEPTION 'Original race schema or verified manager resolver missing';
 END IF;
END $gate$;

CREATE POLICY uranius_races_reader ON uranius_game.races
  FOR SELECT TO uranius_smoke_reader USING (true);
CREATE POLICY uranius_race_stages_reader ON uranius_game.race_stages
  FOR SELECT TO uranius_smoke_reader USING (true);

CREATE POLICY uranius_entries_owner ON uranius_game.race_team_entries
  FOR SELECT TO uranius_smoke_reader
  USING (club_id = (SELECT uranius_game.get_my_club_id()));
CREATE POLICY uranius_preparations_owner ON uranius_game.race_preparations
  FOR SELECT TO uranius_smoke_reader
  USING (club_id = (SELECT uranius_game.get_my_club_id()));

GRANT SELECT (id, name, category, country_code, status)
  ON uranius_game.races TO uranius_smoke_reader;
GRANT SELECT (race_id, stage_number, stage_date, stage_format)
  ON uranius_game.race_stages TO uranius_smoke_reader;
GRANT SELECT (id, race_id, club_id, status)
  ON uranius_game.race_team_entries TO uranius_smoke_reader;
GRANT SELECT (id, race_id, club_id, status, startlist_status, updated_at)
  ON uranius_game.race_preparations TO uranius_smoke_reader;

-- Ledger INSERT belongs to separately reviewed digest-pinned transactional runner.
