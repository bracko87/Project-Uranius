import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewIndividualEquipmentWear} from '../scripts/uranius-individual-equipment-wear-review'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {simulateMultiGroupTick} from '../src/race-engine/simulation/simulateMultiGroupTick'
import {startMultiRiderIncident} from '../scripts/uranius-multi-rider-incident-motion-review'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
import {originalPhase9ResourceReview} from '../scripts/uranius-original-engine-effects-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}
const context={terrainType:'flat',weatherCondition:'rain',precipitationMm:1,rainProbabilityPct:90,weatherMultiplier:2.5,severeWeather:true,flatSprint:true,plans:roster.map(r=>({riderId:r.riderId,stageRole:'domestique',commands:{phase1:'hold',phase2:'hold',phase3:'hold',phase4:'hold'}})),gcStandings:[]}

for(const p of context.plans){
 const n=roster.findIndex(r=>r.riderId===p.riderId)
 p.stageRole=n%12===0?'team_leader_gc':'domestique'
 p.commands=Object.fromEntries(['phase1','phase2','phase3','phase4'].map(k=>[k,n%12===0?'hold':'protect_leader']))
}
const argsFor=seed=>({input:{...input,seed},source,context,expectedSourceSha256:carryoverDigest(source),expectedContextSha256:carryoverDigest(context)})




const base=argsFor('043Y-engine-4')
const args={...base,input:{...base.input,stageName:'043AC long-wet',distanceKm:200,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:200,elevationMetres:50}],settings:{...base.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:40}}}
const nextStage=id(102)
const continuity={provenance:P,schedule:[{stageId,stageNumber:1,date:source.date,weatherCancelled:false},{stageId:nextStage,stageNumber:2,date:'2000-01-04',weatherCancelled:false}],nextRunId:id(202),
 resources:[{resourceType:'equipment',resourceId:'review-equipment',teamId:teams[0],quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:100,lastUsedDate:null}],
 recovery:roster.map((r,i)=>({riderId:r.riderId,travelDelta:i%2,activityLoad:0,consecutiveHeavyDays:0,activityBonus:i%3,doctorBonus:1,clubType:'main',residentialCampusActive:false})),
 nextModifierRows:source.modifierRows.map(m=>({...m,stage_id:nextStage,preparation_applied:false,health_incident_risk_multiplier:1}))}
const policy={provenance:P,groupGapSeconds:0.001,timeLimitPercent:0,sprintZoneKm:0,flatFinish:true}
const packet={args,policy,continuity,expectedContinuitySha256:carryoverDigest(continuity)}


const thirdStage=id(103)
const resourceRequests=[
 {resourceType:'equipment',resourceId:'review-equipment',selectedQuantity:0,selectedStageUses:1,conditionLossPerRaceDay:.35},
 {resourceType:'supply',resourceId:'review-supply',selectedQuantity:2,selectedStageUses:0,conditionLossPerRaceDay:0}
]
const initialResources=[
 {resourceType:'equipment',resourceId:'review-equipment',teamId:teams[0],quantity:null,stageUsesRemaining:5,maxStageUses:5,condition:100,lastUsedDate:null},
 {resourceType:'supply',resourceId:'review-supply',teamId:teams[0],quantity:10,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}
]
const days=ds=>ds.flatMap(date=>continuity.recovery.map(r=>({...r,date})))
const prep=stage=>continuity.nextModifierRows.map(m=>({...m,stage_id:stage}))
const tourPacket={provenance:P,firstSource:source,initialResources,stages:[
 {input:args.input,runId,date:source.date,difficultyCategory:1,weatherCancelled:false,context,policy,recovery:[],modifierRows:source.modifierRows,resourceRequests},
 {input:{...input,stageId:nextStage,stageName:'043AG stage two',seed:'043AG-stage-two-4'},runId:id(202),date:'2000-01-04',difficultyCategory:1,weatherCancelled:false,context,policy:{...policy,timeLimitPercent:100},recovery:days(['2000-01-04']),modifierRows:prep(nextStage),resourceRequests},
 {input:{...input,stageId:thirdStage,stageName:'043AH stage three',seed:'043AH-stage-three-4',distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}]},runId:id(203),date:'2000-01-06',difficultyCategory:1,weatherCancelled:false,context,policy:{...policy,timeLimitPercent:100},recovery:days(['2000-01-05','2000-01-06']),modifierRows:prep(thirdStage),resourceRequests}
]}

const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?90.1:100,lastUsedDate:null})))
const supports=teams.map(t=>({teamId:t,resourceId:t+'-support',mechanicalRisk:.95,mechanicalTimeLoss:.9}))
const supportAssets=supports.map(s=>({resourceType:'asset',resourceId:s.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const expanded={...tourPacket,mechanicalBinding:{setups,supports},initialResources:[...components,...supportAssets],stages:tourPacket.stages.map((s,i)=>({...s,resourceRequests:[...components.map(c=>({resourceType:c.resourceType,resourceId:c.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),...supportAssets.map(a=>({resourceType:a.resourceType,resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i?1:0,conditionLossPerRaceDay:0}))]}))}

const spare={resourceType:'equipment',resourceId:'unused-spare',teamId:teams[0],quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:63,lastUsedDate:null}
const spareRequest={resourceType:'equipment',resourceId:spare.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35}
const mileagePacket={...expanded,individualEquipmentWear:true,initialResources:[...expanded.initialResources,spare],stages:expanded.stages.map(s=>({...s,resourceRequests:[...s.resourceRequests,spareRequest]}))}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const out=run(mileagePacket)
assert.equal(out.stages.length,3)
let full=0,otl=0,dns=0
for(const [i,s] of out.stages.entries()){
 const wear=s.receipt.individualEquipmentWear,receipt=wear.receipt
 assert.equal(wear.sha256,carryoverDigest(receipt))
 assert.equal(receipt.mileageSha256,carryoverDigest(receipt.mileage))
 assert.equal(receipt.physicalClassificationSha256,s.physicalClassificationSha256)
 assert.equal(receipt.mechanicalEvidenceSha256,s.resourceMechanical.evidenceSha256)
 assert.equal(receipt.runId,mileagePacket.stages[i].runId)
 assert.equal(receipt.mileage.length,roster.length)
 assert.equal(receipt.rows.length,roster.length*6+1)
 for(const m of receipt.mileage){
  const sport=s.sportingRows.find(x=>x.riderId===m.riderId),physical=s.physicalClassification.find(x=>x.riderId===m.riderId)
  assert.equal(m.status,sport.status)
  if(sport.status==='finished'||sport.status==='otl'){assert.equal(m.distanceKm,mileagePacket.stages[i].input.distanceKm);assert.equal(physical.status,'finished');full++;if(sport.status==='otl')otl++}
  if(sport.status==='dns'){assert.equal(m.distanceKm,0);assert.equal(physical,undefined);dns++}
  const equipment=receipt.rows.filter(x=>x.riderId===m.riderId)
  assert.equal(equipment.length,6);assert.equal(new Set(equipment.map(x=>x.category)).size,6)
  for(const c of equipment){
   assert.equal(c.distanceKm,m.distanceKm)
   assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,m.distanceKm/100*c.configuredWear))<=.00000051)
   assert.ok(Math.abs(c.after.condition-(c.before.condition-c.conditionUsed))<=.00000051)
   assert.ok(c.after.condition>=0&&c.after.condition<=c.before.condition)
   const ledger=s.receipt.resources.find(x=>x.before.resourceId===c.resourceId)
   assert.deepEqual(ledger,{before:c.before,after:c.after,effect:c.effect})
   if(m.distanceKm===0){assert.deepEqual(c.before,c.after);assert.equal(c.effect,null)}
  }
 }
 const unused=receipt.rows.find(r=>r.resourceId===spare.resourceId)
 assert.equal(unused.riderId,null);assert.equal(unused.distanceKm,0);assert.equal(unused.conditionUsed,0);assert.deepEqual(unused.before,unused.after)
}
assert.ok(full>0&&otl===8&&dns>=16,'actual finish/OTL/DNS witnesses required')
console.log('PASS 043AM six components use actual tour mileage, OTL full distance, DNS and unassigned zero wear; full='+full+' otl='+otl+' dns='+dns)
// Controlled physical DNF from the accepted 043AD style experiment. Use a
// complete genuine terminal state, not caller-supplied mileage.
const short={...input,distanceKm:3,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:3,elevationMetres:50}]}
const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:short})
let state=createInitialState(bound.input)
while(state.currentKm<2.35)state=simulateMultiGroupTick(state).state
assert.ok(!state.completed&&state.currentKm<3)
const d=roster[3].riderId
const batch=startMultiRiderIncident(state,[{riderId:d,helper:null,statusImpact:'dnf',repairSeconds:0,energyLossPoints:7}])
const finish=finishPhysicalIncidentStage(batch.state,batch.episodes,batch.targetId)
const mechanicalEvidence={provenance:P,stageId,date:source.date,resources:mileagePacket.initialResources,requests:mileagePacket.stages[0].resourceRequests,setups,supports}
const request={finish,ready:bound.receipt,mechanicalEvidence,expectedMechanicalSha256:carryoverDigest(mechanicalEvidence),sportingRows:finish.classification}
const before=structuredClone(request)
const controlled=reviewIndividualEquipmentWear(request)
assert.deepEqual(request,before)
const dnf=controlled.receipt.mileage.find(r=>r.riderId===d)
assert.equal(dnf.status,'dnf');assert.equal(dnf.distanceKm,batch.state.riders[d].distanceKm);assert.ok(dnf.distanceKm>0&&dnf.distanceKm<3)
for(const c of controlled.receipt.rows.filter(r=>r.riderId===d)){
 const old=originalPhase9ResourceReview({provenance:P,completeResourceEvidence:true,distanceKm:3,resources:[{resourceType:'equipment',resourceId:c.resourceId,teamId:c.before.teamId,condition:c.before.condition,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:c.configuredWear}]}).rows[0]
 assert.ok(c.conditionUsed>0&&c.conditionUsed<old.conditionUsed)
}
console.log('PASS 043AM actual mid-stage DNF uses partial terminal distance; distanceKm='+dnf.distanceKm)
const {individualEquipmentWear:ignored,...legacyPacket}=mileagePacket
const legacy=run(legacyPacket)
for(const [i,s] of out.stages.entries()){
 if(i)for(const row of s.receipt.resources)assert.deepEqual(row.before,out.stages[i-1].receipt.resources.find(x=>x.after.resourceId===row.before.resourceId).after)
 for(const m of s.resourceMechanical.rows){
  const components=m.components.map(c=>s.receipt.resources.find(x=>x.before.resourceId===c.resourceId).before.condition)
  assert.equal(m.equipmentConditionPercent,Math.min(...components))
 }
 const a=s.receipt.resources.filter(r=>r.before.resourceType!=='equipment'),b=legacy.stages[i].receipt.resources.filter(r=>r.before.resourceType!=='equipment')
 assert.deepEqual(a,b)
}
assert.equal(out.stages[2].recoveryReceipts.length,48)
const withdrawn=out.stages[0].receipt.individualEquipmentWear.receipt.mileage.filter(r=>r.status==='otl').map(r=>r.riderId)
for(const id of withdrawn)for(const c of out.stages[2].receipt.individualEquipmentWear.receipt.rows.filter(r=>r.riderId===id)){
 const first=out.stages[0].receipt.resources.find(x=>x.before.resourceId===c.resourceId)
 assert.deepEqual(c.after,first.after)
}
assert.deepEqual(out.stages[0].physicalClassification,legacy.stages[0].physicalClassification)
console.log('PASS 043AM exact ledger carryover, rest-day neutrality, no duplicate component debit and unchanged support resources')
assert.deepEqual(reviewIndividualEquipmentWear(request),controlled)
assert.throws(()=>reviewIndividualEquipmentWear({...request,expectedMechanicalSha256:'0'.repeat(64)}),/frozen stage resource/)
// Preserve the physical classification digest: structuredClone(request) alone
// preserves the shared classification/sportingRows reference in this fixture.
const bad={...request,sportingRows:structuredClone(request.sportingRows)}
bad.sportingRows.find(r=>r.riderId===d).status='finished'
assert.equal(carryoverDigest(bad.finish.classification),request.finish.classificationSha256)
assert.throws(()=>reviewIndividualEquipmentWear(bad),/sporting and physical status/)
// Independently exercise the earlier physical digest guard.
const badPhysical=structuredClone(request)
badPhysical.finish.classification.find(r=>r.riderId===d).status='finished'
assert.throws(()=>reviewIndividualEquipmentWear(badPhysical),/complete scoped physical finish required/)
assert.deepEqual(request,before)
const duplicate=structuredClone(mileagePacket);duplicate.stages[2].runId=duplicate.stages[1].runId
assert.throws(()=>run(duplicate),/distinct 3/)
assert.deepEqual(run(mileagePacket),out)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AM deterministic replay, invalid terminal evidence and duplicate run rejection')
console.log('PASS 4/4 individual equipment wear checks; no hosted connection')
