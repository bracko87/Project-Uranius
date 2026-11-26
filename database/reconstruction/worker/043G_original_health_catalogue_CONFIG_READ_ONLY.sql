-- REVIEW ONLY, NOT EXECUTED. Original ProPeloton project only after separate explicit owner approval.
-- Static game-rule catalogue only. Never query rider_health_cases, rider profiles or medical/staff records.
-- First verify from metadata that all named columns exist and belong to the configuration catalogue.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
SELECT count(*) AS catalogue_row_count FROM public.health_case_catalogue_v1;
SELECT case_code,case_type,source_contexts,body_part_required,default_body_parts,
 minor_min_days,minor_max_days,moderate_min_days,moderate_max_days,
 major_min_days,major_max_days,selection_blocked_default,training_blocked_default,development_blocked_default
FROM public.health_case_catalogue_v1
ORDER BY case_code LIMIT 500;
ROLLBACK;
