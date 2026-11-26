import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {loadOriginalIncidentConfiguration,resolveOriginalIncidentMapping,INCIDENT_CONFIG_SHA256} from '../scripts/uranius-original-incident-config-review.mjs'
const args=process.argv.slice(2)
assert.ok(args.length===5&&args[0]==='--offline-only'&&args[1]==='--config-file'&&args[3]==='--catalogue-file')
const configPath=args[2],cataloguePath=args[4],paths={configPath,cataloguePath}
const source=JSON.parse(readFileSync(configPath,'utf8')),catalogue=JSON.parse(readFileSync(cataloguePath,'utf8'))
const config=loadOriginalIncidentConfiguration(paths)
const request=(incidentType,incidentSeverity)=>({...paths,incidentType,incidentSeverity,sourceContext:'race',mode:'candidate_lookup'})
const lookup=(t,s)=>resolveOriginalIncidentMapping(request(t,s))
let checks=0;const pass=s=>{checks++;console.log('PASS '+s)}
assert.equal(config.configSha256,INCIDENT_CONFIG_SHA256);assert.equal(config.mappings.length,12);assert.deepEqual(config.mappings,source.mappings);assert.deepEqual(config.contract,source.contracts[0]);assert.equal(config.configurationVerified,true)
pass('043M exact private incident and catalogue configuration fingerprints')
for(const type of ['crash','exhaustion','mechanical','puncture'])for(const severity of ['minor','moderate','major']){
 const actual=lookup(' '+type.toUpperCase()+' ',severity.toUpperCase()),expected=source.mappings.find(x=>x.incident_type===type&&x.incident_severity===severity)
 assert.equal(actual.status,'resolved');assert.deepEqual(actual.mapping,expected);assert.equal(actual.candidateLookupAllowed,true);assert.deepEqual(lookup(type,severity),actual)
}
pass('043M all twelve approved active mappings resolve with original normalization and deterministic lookup')
let eligible=0
for(const m of config.mappings){
 if(m.health_case_eligible){eligible++;const c=catalogue.find(x=>x.case_code===m.case_code);assert.ok(c.source_contexts.includes('race'));assert.deepEqual([m.minimum_duration_days,m.maximum_duration_days],[c[m.incident_severity+'_min_days'],c[m.incident_severity+'_max_days']]);assert.deepEqual(m.body_part_policy.catalogue_default_body_parts,c.default_body_parts);assert.equal(m.dnf_health_case_required,m.incident_severity==='major')}
 else{assert.equal(m.case_code,null);assert.equal(m.health_case_creation_probability,0);assert.equal(m.dnf_health_case_required,false);assert.deepEqual(m.body_part_policy,{})}
}
assert.equal(eligible,6)
pass('043M six health-eligible mappings agree with catalogue; six technical mappings do not create health cases')
for(const mode of ['runtime','production','generate_case','apply','canary','runner','historical_rewrite'])assert.throws(()=>resolveOriginalIncidentMapping({...request('crash','major'),mode}),/prohibited/)
for(const k of ['runtime_canary_enabled','execution_enabled','production_execution_enabled','runner_integration_enabled','historical_rewrite_enabled'])assert.equal(config.contract[k],false)
for(const k of ['runtimeAllowed','incidentAuthorityVerified','healthCaseCreated','writesPerformed','official','hostedWriteAllowed','accountingAllowed','probabilityRollApplied','bodyPartSelected','dnfOutcomeDetermined'])assert.equal(lookup('crash','major')[k],false)
pass('043M candidate lookup permitted but activation, probability rolls, case creation and official effects blocked')
assert.throws(()=>lookup('illness','minor'),/unsupported/);assert.throws(()=>lookup('crash','critical'),/unsupported/)
assert.throws(()=>resolveOriginalIncidentMapping({...request('crash','major'),sourceContext:'training'}),/race candidate/)
for(const extra of [{mapping:{}},{candidateFunctionsEnabled:true},{incidentId:'fake'},{probabilityRoll:0},{bodyPart:'knee'},{dnf:true}])assert.throws(()=>resolveOriginalIncidentMapping({...request('crash','major'),...extra}),/unexpected lookup fields/)
const mutated=lookup('crash','major');mutated.mapping.active=false;assert.equal(lookup('crash','major').mapping.active,true)
pass('043M invalid combinations, injected candidate/authority inputs and mutable return tampering refused or isolated')
const dir=mkdtempSync(join(tmpdir(),'uranius-043m-'))
try{
 for(const [key,path] of Object.entries(paths)){
  const file=join(dir,key+'.json'),raw=readFileSync(path)
  for(const changed of [Buffer.concat([raw,Buffer.from('\n')]),Buffer.from(raw)]){
   if(changed.length===raw.length)changed[10]^=1
   writeFileSync(file,changed);assert.throws(()=>loadOriginalIncidentConfiguration({...paths,[key]:file}),/fingerprint mismatch/)
  }
 }
}finally{rmSync(dir,{recursive:true,force:true})}
pass('043M tampered private configuration or health catalogue refused, no fallback')
assert.equal(checks,6);console.log('PASS 6/6 original incident configuration checks; no hosted connection')
