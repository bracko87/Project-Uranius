-- PROPOSED ONLY. Not executed. Original project requires separate owner approval.
-- Metadata only. Static configuration rows require verification of table shape
-- and purpose before an explicit column-allowlisted, bounded second statement.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
WITH rel AS (
 SELECT c.oid,n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
 obj_description(c.oid,'pg_class') AS description
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname IN ('race_engine_incident_health_mapping_v1','race_engine_incident_gap_resolution_contract_v1')
)
SELECT r.nspname,r.relname,r.relkind,r.relrowsecurity,r.relforcerowsecurity,r.description,
 a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) AS column_type,a.attnotnull
FROM rel r JOIN pg_attribute a ON a.attrelid=r.oid
WHERE a.attnum>0 AND NOT a.attisdropped ORDER BY r.relname,a.attnum LIMIT 100;
WITH rel AS (
 SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname IN ('race_engine_incident_health_mapping_v1','race_engine_incident_gap_resolution_contract_v1')
)
SELECT r.relname,k.conname,k.contype,pg_get_constraintdef(k.oid,true) AS definition
FROM rel r JOIN pg_constraint k ON k.conrelid=r.oid ORDER BY r.relname,k.conname LIMIT 100;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_function_result(p.oid) AS return_type,
 encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') AS definition_sha256
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private') AND p.prokind='f'
AND p.proname IN (
 'race_engine_resolve_incident_health_mapping_v1',
 'race_engine_hash_roll_v1',
 'universal_race_stage_apply_health_candidates_v1',
 'race_engine_get_stage_rider_inputs_v1',
 'race_startlist_engine_readiness_v1',
 'race_engine_get_stage_phase9_inputs_v1',
 'race_engine_get_stage_rider_preparation_modifiers_v2'
)
ORDER BY n.nspname,p.proname,arguments LIMIT 30;
ROLLBACK;
