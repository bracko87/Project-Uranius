-- REVIEW ONLY, NOT EXECUTED. Original ProPeloton project only after separate explicit owner approval.
-- Catalog discovery/fingerprints and schema metadata only. No function execution or game rows.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
-- Bounded function identity inventory; never inspect secret-verification functions.
WITH functions AS (
 SELECT n.nspname AS schema_name,p.proname AS function_name,
 pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_function_result(p.oid) AS return_type,
 p.prosecdef AS security_definer,
 encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') AS definition_sha256
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','private') AND p.prokind='f'
 AND (
 p.proname IN (
 'universal_race_stage_finalize_core_survival_v1',
 'universal_race_stage_finalize_v1',
 'race_engine_apply_stage_equipment_asset_wear_v1',
 'race_engine_apply_missing_stage_equipment_wear_v2',
 'universal_race_stage_apply_health_candidates_v1',
 'race_engine_get_stage_phase9_inputs_v1',
 'universal_race_stage_compact_phase9_for_engine_v1',
 'race_engine_get_stage_rider_preparation_modifiers_v2',
 'universal_race_resource_owner_club_v1',
 'universal_race_stage_planned_supplies_v1',
 'universal_race_stage_other_supply_reservations_v1',
 'universal_race_stage_effective_supply_available_v1',
 'validate_race_stage_supply_reservation_v1',
 'get_race_stage_supply_availability_v1',
 'get_club_race_supply_unit_summary_v1',
 '_race_supply_unit_max_uses',
 'health_normalize_case_code_v1',
 'health_validate_case_assignment_v1',
 'health_create_rider_case_v1',
 'health_calculate_case_recovery_v1',
 'health_get_medical_staff_support_v1',
 'health_get_medical_center_level_v1',
 'health_get_medical_center_recovery_bonus_pct_v1',
 'health_get_medical_center_risk_reduction_pct_v1',
 'health_get_medical_center_fatigue_floor_reduction_v1',
 'race_engine_hash_roll_v1',
 'race_startlist_engine_readiness_v1'
 )
 OR p.proname ~ '^(universal_race_stage|race_engine)_[a-z0-9_]*(supply|supplies|wear|health|resource|manifest)[a-z0-9_]*_v[0-9]+$'
 )
 AND p.proname !~ '(secret|token|password|credential|auth|admin|test|debug|preview|rollback)'
)
SELECT * FROM functions ORDER BY schema_name,function_name,arguments LIMIT 100;
-- Column definitions of only the known resource/health/persistence relations.
WITH relations AS (
 SELECT c.oid,n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
 AND c.relname IN ('health_case_catalogue_v1','rider_health_cases','rider_health_case_context_v1',
 'club_race_supplies','club_race_supply_units','club_equipment_inventory',
 'race_engine_stage_wear_applications','race_stage_simulation_runs','race_stage_authoritative_runs',
 'race_engine_stage_effect_writer_adapter_manifest_v2','race_stage_plans','race_stage_plan_supplies',
 'race_preparations','race_stage_points','race_stage_profile_details')
)
SELECT r.nspname,r.relname,r.relkind,r.relrowsecurity,r.relforcerowsecurity,
 a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) AS column_type,a.attnotnull
FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid
WHERE a.attnum>0 AND NOT a.attisdropped ORDER BY r.relname,a.attnum;
WITH relations AS (
 SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('health_case_catalogue_v1','rider_health_cases','rider_health_case_context_v1',
 'club_race_supplies','club_race_supply_units','club_equipment_inventory',
 'race_engine_stage_wear_applications','race_stage_simulation_runs','race_stage_authoritative_runs',
 'race_engine_stage_effect_writer_adapter_manifest_v2','race_stage_plans','race_stage_plan_supplies',
 'race_preparations','race_stage_points','race_stage_profile_details')
)
SELECT r.relname,k.conname,k.contype,pg_get_constraintdef(k.oid,true) AS constraint_definition
FROM relations r JOIN pg_constraint k ON k.conrelid=r.oid ORDER BY r.relname,k.conname;
WITH relations AS (
 SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('health_case_catalogue_v1','rider_health_cases','rider_health_case_context_v1',
 'club_race_supplies','club_race_supply_units','club_equipment_inventory',
 'race_engine_stage_wear_applications','race_stage_simulation_runs','race_stage_authoritative_runs',
 'race_stage_plans','race_stage_plan_supplies','race_preparations','race_stage_points','race_stage_profile_details')
)
SELECT r.relname,idx.relname AS index_name,i.indisunique,pg_get_indexdef(i.indexrelid) AS index_definition
FROM relations r JOIN pg_index i ON i.indrelid=r.oid JOIN pg_class idx ON idx.oid=i.indexrelid
WHERE i.indisunique ORDER BY r.relname,idx.relname;
ROLLBACK;
