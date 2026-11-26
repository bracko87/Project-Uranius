-- Executed with owner-approved static configuration scope only, 2026-11-26.
-- Original ProPeloton Manager only; never run against a guessed project.
-- Metadata and relation purpose checked first. No application rows, free-form
-- evidence/source hashes, timestamps or credentials selected.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
WITH m AS (
 SELECT mapping_key,incident_type,incident_severity,case_code,minimum_duration_days,
 maximum_duration_days,performance_penalty,approved,active,health_case_eligible,
 body_part_policy,health_case_creation_probability,dnf_health_case_required,duration_source
 FROM public.race_engine_incident_health_mapping_v1 LIMIT 101
), c AS (
 SELECT contract_key,package_version,candidate_specification_version,candidate_specification_hash,
 weather_values_selected,equipment_values_selected,group_rule_selected,health_mapping_selected,
 weather_contract_approved,equipment_contract_approved,group_contract_approved,health_contract_approved,
 candidate_functions_enabled,runtime_canary_enabled,execution_enabled,production_execution_enabled,
 runner_integration_enabled,historical_rewrite_enabled
 FROM public.race_engine_incident_gap_resolution_contract_v1 LIMIT 21
), a AS (
 SELECT count(*) AS n,jsonb_agg(to_jsonb(m) ORDER BY incident_type,incident_severity) AS rows FROM m
), b AS (
 SELECT count(*) AS n,jsonb_agg(to_jsonb(c) ORDER BY contract_key) AS rows FROM c
)
SELECT a.n AS mapping_count,b.n AS contract_count,
 CASE WHEN a.n<=100 AND b.n<=20 THEN a.rows END AS mappings,
 CASE WHEN a.n<=100 AND b.n<=20 THEN b.rows END AS contracts,
 CASE WHEN a.n<=100 AND b.n<=20 THEN encode(sha256(convert_to(jsonb_build_object('mappings',a.rows,'contracts',b.rows)::text,'UTF8')),'hex') END AS configuration_sha256
FROM a CROSS JOIN b;
ROLLBACK;
