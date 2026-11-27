// Explicit synthetic resource binding, no preparation writer or invented boost.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const req=(x,m)=>{if(!x)throw Error('043AJ: '+m)}
const cats=['frame','wheelset','tires','groupset','helmet','shoes']
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const uniq=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
const key=x=>x.resourceType+':'+x.resourceId
export function resolveResourceMechanicalReview({evidence,expectedEvidenceSha256,ready}){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256&&evidence.stageId===ready.stageId&&evidence.date===ready.date,'frozen stage resource evidence required')
 const {resources,requests,setups,supports}=evidence
 req(uniq(resources,key)&&uniq(requests,key)&&resources.length===requests.length&&uniq(setups,x=>x.riderId)&&setups.length===ready.rows.length&&uniq(supports,x=>x.teamId),'complete resource and setup coverage')
 req(resources.every(r=>requests.some(q=>key(q)===key(r))),'resource request coverage')
 const usedComponents=new Set(),usedSupport=new Set()
 const supportRows=supports.map(s=>{
  const r=resources.find(x=>x.resourceType==='asset'&&x.resourceId===s.resourceId),q=requests.find(x=>x.resourceType==='asset'&&x.resourceId===s.resourceId)
  req(r&&q&&r.teamId===s.teamId&&ready.rows.some(x=>x.teamId===s.teamId)&&!usedSupport.has(s.resourceId)&&num(s.mechanicalRisk,.78,1)&&num(s.mechanicalTimeLoss,.82,1),'invalid explicit mechanical support')
  usedSupport.add(s.resourceId)
  req(Number.isSafeInteger(r.stageUsesRemaining)&&r.stageUsesRemaining>=0&&Number.isSafeInteger(q.selectedStageUses)&&q.selectedStageUses>=0&&q.selectedStageUses<=1,'explicit durable support request required')
  const active=ready.rows.some(x=>x.teamId===s.teamId&&x.startStatus==='starter')
  const available=active&&q.selectedStageUses===1&&r.stageUsesRemaining>=1&&r.lastUsedDate!==evidence.date&&num(r.condition,0,100)&&r.condition>0
  return {teamId:s.teamId,resourceId:s.resourceId,available,mechanicalRisk:available?s.mechanicalRisk:1,mechanicalTimeLoss:available?s.mechanicalTimeLoss:1}
 })
 const rows=ready.rows.map(r=>{
  const setup=setups.find(s=>s.riderId===r.riderId)
  req(setup&&setup.teamId===r.teamId&&uniq(setup.components,x=>x.category)&&setup.components.length===6&&cats.every(c=>setup.components.some(x=>x.category===c)),'six component setup required')
  const components=cats.map(category=>{
   const c=setup.components.find(x=>x.category===category),e=resources.find(x=>x.resourceType==='equipment'&&x.resourceId===c.resourceId)
   req(e&&e.teamId===r.teamId&&num(e.condition,0,100)&&!usedComponents.has(e.resourceId),'missing, foreign or reused physical component')
   usedComponents.add(e.resourceId)
   return {category,resourceId:e.resourceId,condition:e.condition}
  })
  const p=r.preparation.modifiers
  req(!p||p.equipmentConditionPercent===100&&p.mechanicalIncidentRiskMultiplier===1&&p.mechanicalTimeLossMultiplier===1,'duplicate mechanical modifier source')
  const s=supportRows.find(s=>s.teamId===r.teamId)
  return {riderId:r.riderId,teamId:r.teamId,components,equipmentConditionPercent:Math.min(...components.map(c=>c.condition)),mechanicalRisk:s?.mechanicalRisk??1,mechanicalTimeLoss:s?.mechanicalTimeLoss??1,supportAvailable:s?.available??false}
 })
 return {version:'043AJ_resource_mechanical_review_v1',evidenceSha256:expectedEvidenceSha256,rows,supportRows,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
}
