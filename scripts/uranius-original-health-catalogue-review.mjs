// 043G: exact private original static configuration, offline only.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {injuryRecoveryReview,injuryHandoverReview} from './uranius-original-resource-health-review.mjs'
const req=(x,m)=>{if(!x)throw Error('043G catalogue: '+m)}
export const HEALTH_CATALOGUE_SHA256='2a93157617cf471ca3e6c448b21c01059ddd644eed3cb6b72440de7f31d9565b'
const sev=['minor','moderate','major']
const fields=['case_code','case_type','source_contexts','body_part_required','default_body_parts','minor_min_days','minor_max_days','moderate_min_days','moderate_max_days','major_min_days','major_max_days','selection_blocked_default','training_blocked_default','development_blocked_default'].sort().join(',')
const bools=['body_part_required','selection_blocked_default','training_blocked_default','development_blocked_default']
const contexts=['race','training','daily_life','travel','weather','manual','unknown']
const aliases={minor_strain:'muscle_strain',viral_illness:'respiratory_infection',viral_infection:'respiratory_infection',illness:'flu',dehydration:'heat_exhaustion'}
function readCatalogue(path){
 const raw=readFileSync(path)
 req(raw.length===6456&&createHash('sha256').update(raw).digest('hex')===HEALTH_CATALOGUE_SHA256,'private original catalogue fingerprint mismatch')
 const rows=JSON.parse(raw.toString('utf8'))
 req(Array.isArray(rows)&&rows.length===15,'wrong row count')
 const map=new Map()
 for(const x of rows){
  req(x&&Object.keys(x).sort().join(',')===fields&&typeof x.case_code==='string'&&/^[a-z_]+$/.test(x.case_code)&&!map.has(x.case_code)&&['injury','sickness'].includes(x.case_type),'invalid case identity')
  req(bools.every(k=>typeof x[k]==='boolean')&&Array.isArray(x.source_contexts)&&x.source_contexts.length>0&&x.source_contexts.every(c=>contexts.includes(c))&&new Set(x.source_contexts).size===x.source_contexts.length&&Array.isArray(x.default_body_parts)&&x.default_body_parts.every(c=>typeof c==='string'&&c.length>0),'invalid case restrictions')
  const ranges=Object.fromEntries(sev.map(s=>[s,[x[s+'_min_days'],x[s+'_max_days']]]))
  req(Object.values(ranges).every(([a,b])=>Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>0&&b>=a&&b<=3650),'invalid recovery ranges')
  map.set(x.case_code,{caseCode:x.case_code,caseType:x.case_type,sourceContexts:x.source_contexts,bodyPartRequired:x.body_part_required,defaultBodyParts:x.default_body_parts,ranges,selectionBlocked:x.selection_blocked_default,trainingBlocked:x.training_blocked_default,developmentBlocked:x.development_blocked_default})
 }
 req([...map.values()].filter(x=>x.caseType==='injury').length===9&&[...map.values()].filter(x=>x.sourceContexts.includes('race')).length===10,'catalogue coverage mismatch')
 return map
}
export function loadOriginalHealthCatalogue(path){
 const map=readCatalogue(path)
 return {sourceSha256:HEALTH_CATALOGUE_SHA256,rows:[...map.values()],verifiedConfigurationOnly:true,official:false,hostedWriteAllowed:false}
}
export function reviewOriginalCatalogueHealth({cataloguePath,recoveryInput,priorCase,mode}){
 req(recoveryInput?.provenance==='synthetic_review_fixture'&&['recovery','handover'].includes(mode),'explicit synthetic health review required')
 req(!Object.hasOwn(recoveryInput,'catalogueRow')&&!Object.hasOwn(recoveryInput,'catalogueEvidence'),'caller-supplied catalogue forbidden')
 req(typeof recoveryInput.caseCode==='string'&&recoveryInput.caseCode.trim(),'case code required')
 // Existing normalization used by original race incident matching; strict
 // explicit alias normalization here avoids inconsistent case creation.
 const raw=recoveryInput.caseCode.trim().toLowerCase(),caseCode=Object.hasOwn(aliases,raw)?aliases[raw]:raw
 const catalogueRow=readCatalogue(cataloguePath).get(caseCode)
 req(catalogueRow&&catalogueRow.sourceContexts.includes('race'),'unknown or non-race catalogue case')
 const input={...recoveryInput,caseCode,catalogueRow,catalogueEvidence:'explicit_synthetic_catalogue_row'}
 const result=mode==='recovery'?injuryRecoveryReview(input):injuryHandoverReview({provenance:'synthetic_review_fixture',incidentEvidence:'explicit_synthetic_candidate',recoveryInput:input,priorCase})
 return {version:'043G_original_catalogue_review_v1',catalogueSha256:HEALTH_CATALOGUE_SHA256,configurationVerified:true,caseCode,result,official:false,hostedWriteAllowed:false,accountingAllowed:false,incidentAuthorityVerified:false}
}
