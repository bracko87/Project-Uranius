-- REVIEW_ONLY_NOT_APPROVED | 010 candidate | DO NOT APPLY TO HOSTED SUPABASE
-- Target: isolated Uranius only. Source: 20261123 original live metadata-only export.
-- PostgreSQL 17 disposable fixture candidate. No ledger entry, migrations or client grants.
-- Mirrors original column types/defaults and PK/UNIQUE/CHECK constraints.
-- Adaptations: club FKs reference uranius_game.club_profiles(club_id) (original public.clubs).
-- Deferred, deliberately NOT reconstructed: countries FKs, finance.transactions,
-- club_equipment_setup_presets, trigger implementations and original RPC.
-- No inserts, no bootstrap owners, no fixture players, no scheduling or accepted rows.
-- IMPORTANT: existing RLS on uranius_game.club_profiles remains authoritative.
BEGIN;
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

-- Deny every client role until audited server-side RLS and ownership tests exist.
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

-- This is deliberately not a deployable migration; do not append to the ledger.
ROLLBACK;
