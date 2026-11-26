// 043M: pinned private static policy lookup only; never generates an incident or case.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
export const INCIDENT_CONFIG_SHA256='10689e9cc26626a2e46ba0a9056ce1505f820e23ac45def3a20dc05f5d916eb0'
const CATALOGUE_SHA256='2a93157617cf471ca3e6c448b21c01059ddd644eed3cb6b72440de7f31d9565b'
const types=['crash','exhaustion','mechanical','puncture'],severities=['minor','moderate','major']
const selected=['weather_values_selected','equipment_values_selected','group_rule_selected','health_mapping_selected','weather_contract_approved','equipment_contract_approved','group_contract_approved','health_contract_approved','candidate_functions_enabled']
const disabled=['runtime_canary_enabled','execution_enabled','production_execution_enabled','runner_integration_enabled','historical_rewrite_enabled']
const req=(x,m)=>{if(!x)throw Error('043M: '+m)}
const fields=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',')
const read=(path,bytes,sha,label)=>{const raw=readFileSync(path);req(raw.length===bytes&&createHash('sha256').update(raw).digest('hex')===sha,label+' fingerprint mismatch');return JSON.parse(raw.toString('utf8'))}
const norm=x=>typeof x==='string'?x.trim().toLowerCase():''
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const flags=()=>({configurationVerified:true,incidentAuthorityVerified:false,healthCaseCreated:false,writesPerformed:false,runtimeAllowed:false,official:false,hostedWriteAllowed:false,accountingAllowed:false})
export function loadOriginalIncidentConfiguration({configPath,cataloguePath}){
 const config=read(configPath,6778,INCIDENT_CONFIG_SHA256,'incident configuration')
 const catalogue=read(cataloguePath,6456,CATALOGUE_SHA256,'health catalogue')
 req(fields(config,['contracts','mappings'])&&Array.isArray(config.contracts)&&config.contracts.length===1&&Array.isArray(config.mappings)&&config.mappings.length===12,'configuration coverage')
 req(Array.isArray(catalogue)&&catalogue.length===15&&new Set(catalogue.map(x=>x.case_code)).size===15,'catalogue coverage')
 const contract=config.contracts[0]
 req(fields(contract,['contract_key','package_version','candidate_specification_version','candidate_specification_hash',...selected,...disabled])&&contract.contract_key==='incident_gap_resolution_disabled_specification'&&selected.every(k=>contract[k]===true)&&disabled.every(k=>contract[k]===false),'activation contract mismatch')
 const seen=new Set()
 for(const m of config.mappings){
  req(fields(m,['mapping_key','incident_type','incident_severity','case_code','minimum_duration_days','maximum_duration_days','performance_penalty','approved','active','health_case_eligible','body_part_policy','health_case_creation_probability','dnf_health_case_required','duration_source']),'mapping fields')
  const t=m.incident_type,s=m.incident_severity,key=t+':'+s
  req(types.includes(t)&&severities.includes(s)&&!seen.has(key)&&m.mapping_key===t+'_'+s+'_v1'&&m.approved===true&&m.active===true,'mapping identity or approval')
  seen.add(key)
  req(typeof m.health_case_eligible==='boolean'&&typeof m.dnf_health_case_required==='boolean'&&typeof m.health_case_creation_probability==='number'&&Number.isFinite(m.health_case_creation_probability)&&m.health_case_creation_probability>=0&&m.health_case_creation_probability<=1&&m.performance_penalty===null,'mapping probability or penalty')
  if(m.health_case_eligible){
   const c=catalogue.find(x=>x.case_code===m.case_code),b=m.body_part_policy
   req(['crash','exhaustion'].includes(t)&&c?.case_type==='injury'&&c.source_contexts.includes('race')&&c.body_part_required===true,'catalogue race eligibility')
   req(m.duration_source==='catalogue'&&m.minimum_duration_days===c[s+'_min_days']&&m.maximum_duration_days===c[s+'_max_days'],'catalogue duration mismatch')
   req(fields(b,['mode','selection_key','catalogue_default_body_parts'])&&b.mode==='deterministic_catalogue_default'&&b.selection_key==="md5(incident_id::text || '|body_part_v1')"&&same(b.catalogue_default_body_parts,c.default_body_parts),'catalogue body-part mismatch')
   req(m.dnf_health_case_required===(s==='major'),'DNF policy mismatch')
  }else req(['mechanical','puncture'].includes(t)&&m.case_code===null&&m.minimum_duration_days===null&&m.maximum_duration_days===null&&m.duration_source===null&&fields(m.body_part_policy,[])&&m.health_case_creation_probability===0&&m.dnf_health_case_required===false,'non-health mapping mismatch')
 }
 req(seen.size===types.length*severities.length&&config.mappings.filter(x=>x.health_case_eligible).length===6,'matrix coverage mismatch')
 return {configSha256:INCIDENT_CONFIG_SHA256,catalogueSha256:CATALOGUE_SHA256,contract:structuredClone(contract),mappings:structuredClone(config.mappings),...flags()}
}
export function resolveOriginalIncidentMapping(p){
 req(fields(p,['configPath','cataloguePath','incidentType','incidentSeverity','sourceContext','mode']),'unexpected lookup fields')
 req(p.mode==='candidate_lookup','runtime activation and case generation prohibited')
 req(p.sourceContext==='race','only race candidate review supported')
 const t=norm(p.incidentType),s=norm(p.incidentSeverity)
 req(types.includes(t)&&severities.includes(s),'unsupported incident type/severity')
 const c=loadOriginalIncidentConfiguration(p)
 const matches=c.mappings.filter(m=>m.approved&&m.active&&m.incident_type===t&&m.incident_severity===s)
 req(matches.length===1,'exactly one approved active mapping required')
 return {version:'043M_original_incident_lookup_v1',status:'resolved',sourceContext:p.sourceContext,configSha256:c.configSha256,catalogueSha256:c.catalogueSha256,mapping:matches[0],candidateLookupAllowed:true,probabilityRollApplied:false,bodyPartSelected:false,dnfOutcomeDetermined:false,...flags()}
}
