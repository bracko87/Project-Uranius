-- PROPOSED ONLY. Not executed. Original ProPeloton Manager project only
-- after separate explicit owner approval and project identity verification.
-- Metadata only: no inventory, riders, club/staff records or catalogue data.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
WITH rel AS (
 SELECT c.oid,n.nspname,c.relname,c.relkind,c.relrowsecurity
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname IN ('equipment_catalog','equipment_bonus_category_weights',
 'equipment_bonus_allowed_keys','race_plan_effect_rules','infrastructure_asset_config')
)
SELECT r.nspname,r.relname,r.relkind,r.relrowsecurity,a.attnum,a.attname,
 format_type(a.atttypid,a.atttypmod) AS column_type,a.attnotnull
FROM rel r JOIN pg_attribute a ON a.attrelid=r.oid
WHERE a.attnum>0 AND NOT a.attisdropped ORDER BY r.relname,a.attnum LIMIT 250;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_function_result(p.oid) AS return_type,
 encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') AS definition_sha256
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private') AND p.prokind='f'
AND p.proname IN ('equipment_calculate_catalog_setup_bonus_preview',
 'race_engine_get_stage_rider_preparation_modifiers_v2',
 'race_engine_resolve_stage_rider_equipment_condition_v1',
 'race_team_stage_eligibility_v1','race_team_stage_jersey_shortage_penalty_v1',
 'race_engine_stage_rain_jacket_requirement_v1',
 'race_engine_get_stage_phase9_inputs_v1',
 'race_plan_equipment_van_protection_pct_for_stage_v1',
 'race_plan_mobile_workshop_field_recovery_pct_for_stage_v1')
ORDER BY n.nspname,p.proname,arguments LIMIT 40;
ROLLBACK;
