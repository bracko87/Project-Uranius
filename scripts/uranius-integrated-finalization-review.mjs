// 042 one-day synthetic integration only. No real engine-job promotion or DB access.
import {createHash} from 'node:crypto'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
import {loadOriginalPolicy,planWithOriginalPolicy} from './uranius-original-policy-review.mjs'
import {reviewPostStageAdjustment} from './uranius-original-fatigue-review.mjs'
import {reviewPlannedSupplies,reviewSupplyUsage,reviewEquipmentWear,reviewHealthCandidate} from './uranius-stage-effects-review.mjs'
const require=(x,m)=>{if(!x)throw Error('042: '+m)}
const unique=(xs,key)=>Array.isArray(xs)&&new Set(xs.map(key)).size===xs.length
const integer=x=>Number.isSafeInteger(x)&&x>=0
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const cmp=(a,b)=>a<b?-1:a>b?1:0
const sha=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex')
const provenance='synthetic_review_fixture'
export function buildIntegratedFixture(p){
 require(p?.provenance===provenance&&p.completeSyntheticEffects===true,'complete synthetic fixture required')
 const {policyText,category,job,scoringReceipt,clubs,penalties,fatigueInputs,youngRiderIds,supplyInputs,equipmentInputs,healthInputs,prizeFundCash,lifecycle}=p
 const policy=loadOriginalPolicy(policyText),c=policy.categories.find(x=>x.code===category)
 require(c?.format==='one_day'&&scoringReceipt?.raceFormat==='one_day','ordinary one-day scope only')
 const scoring=projectStageScoring({job,receipt:scoringReceipt})
 const input=JSON.parse(job.inputText),{raceId,stageId}=scoring.source,runId=job.jobId
 require(input.riders.every(r=>r.condition&&typeof r.condition.fatigueBeforeStage==='number'),'explicit starting fatigue required')
 const roster=new Map(scoring.resultRows.map(x=>[x.riderId,x])),teams=[...new Set(scoring.resultRows.map(x=>x.teamId))].sort()
 require(teams.length>=c.minTeams&&teams.length<=c.maxTeams,'category team count')
 require(teams.every(t=>{const count=scoring.resultRows.filter(x=>x.teamId===t).length;return count>=c.minRiders&&count<=c.maxRiders}),'category roster size')
 require(unique(clubs,x=>x.clubId)&&teams.every(t=>clubs.some(x=>x.clubId===t)),'club registry incomplete')
 require(unique(youngRiderIds,x=>x)&&youngRiderIds.every(x=>roster.has(x)),'explicit youth roster required')
 require(unique(penalties,x=>x.riderId)&&penalties.length===roster.size&&penalties.every(x=>roster.has(x.riderId)&&integer(x.seconds)),'complete penalty receipt required')
 require(unique(fatigueInputs,x=>x.riderId)&&fatigueInputs.length===roster.size,'complete fatigue inputs required')
 const fatigue=fatigueInputs.map(x=>{
  const row=roster.get(x.riderId)
  require(row&&x.status===row.status&&x.fatigueBefore===row.startingCondition?.fatigueBeforeStage&&x.distanceKm===input.distanceKm,'fatigue source mismatch')
  return reviewPostStageAdjustment(x)
 })
 const results=scoring.resultRows.map(x=>({...x,penaltySeconds:penalties.find(v=>v.riderId===x.riderId).seconds,fatigueAfterStage:fatigue.find(v=>v.riderId===x.riderId).fatigueAfterStage}))
 require(unique(supplyInputs,x=>x.teamId)&&supplyInputs.length===teams.length&&supplyInputs.every(x=>teams.includes(x.teamId)&&x.stageId===stageId),'complete team supply receipts required')
 const resources=[],supplies=[]
 const resource=(kind,teamId,target,before,after)=>resources.push({key:[kind,teamId,target].join(':'),kind,teamId,target,before,after})
 for(const x of supplyInputs){
  require(x.plan?.riderRows.every(r=>roster.get(r.riderId)?.teamId===x.teamId),'supply plan roster mismatch')
  const requirements=reviewPlannedSupplies(x.plan).requirements
  const v=reviewSupplyUsage({...x,requirements})
  supplies.push(v)
  for(const before of x.stock){const after=v.consumableStock.find(s=>s.supplyKey===before.supplyKey);resource('consumable',x.teamId,before.supplyKey,{quantity:before.quantity},{quantity:after.quantity})}
  for(const before of x.units){const after=v.units.find(s=>s.unitId===before.unitId);resource('durable',x.teamId,before.unitId,{supplyKey:before.supplyKey,usesRemaining:before.usesRemaining,status:before.status},{supplyKey:after.supplyKey,usesRemaining:after.usesRemaining,status:after.status})}
 }
 require(equipmentInputs?.stageId===stageId&&equipmentInputs.runId===runId&&equipmentInputs.distanceKm===input.distanceKm&&equipmentInputs.canonicalEquipmentWearPresent===false&&equipmentInputs.items.every(x=>teams.includes(x.teamId)),'synthetic fallback equipment scope required')
 const wear=reviewEquipmentWear(equipmentInputs)
 for(const x of wear.rows){const before=equipmentInputs.items.find(i=>i.itemId===x.itemId);resource('equipment',x.teamId,x.itemId,{condition:before.conditionBefore,distance:before.totalDistanceKm,raceDays:before.totalRaceDays},{condition:x.conditionAfter,distance:x.totalDistanceKm,raceDays:x.totalRaceDays})}
 require(Array.isArray(healthInputs)&&unique(healthInputs,x=>x.candidate.riderId+':'+x.candidate.incidentId),'duplicate health candidate')
 const health=healthInputs.map(x=>{require(x.stageId===stageId&&x.runId===runId&&roster.get(x.candidate.riderId)?.teamId===x.candidate.teamId,'health scope mismatch');return {riderId:x.candidate.riderId,teamId:x.candidate.teamId,incidentId:x.candidate.incidentId,disposition:reviewHealthCandidate(x)}})
 require(unique(resources,x=>x.key),'duplicate resource key')
 require(unique(supplies.flatMap(x=>x.postings),x=>x.eventId),'duplicate stage supply event')
 const settlement=planWithOriginalPolicy({policyText,category,fixture:{provenance,raceId,stageId,runId,format:'one_day',worldChampionship:false,scheduledStages:[{stageId,stageNumber:1,weatherCancelled:false}],results,clubs,youngRiderIds,prizeFundCash,coverage:{synchronizedResults:true,youth:true},lifecycle}})
 const core={...settlement.plan,fixtureTaxRateBps:settlement.fixtureTaxRateBps}
 const evidence={source:scoring.source,pointResults:scoring.pointResults,results,fatigue,supplies,wear,health,policySha256:settlement.policySha256,category,settlements:settlement.settlements}
 return {version:'042_integrated_synthetic_v1',provenance,raceId,stageId,runId,official:false,hostedWriteAllowed:false,accountingAllowed:false,core,resources:resources.sort((a,b)=>cmp(a.key,b.key)),evidence,syntheticEvidenceSha256:sha(evidence),blockers:['039_full_engine_acceptance_unconfirmed','synthetic_finish_and_crossing_receipts','original_base_fatigue_not_verified','canonical_supply_and_wear_writers_missing','health_catalogue_and_actual_incident_generation_missing','official_lifecycle_and_authority_missing']}
}
