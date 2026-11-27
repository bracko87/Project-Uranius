import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
import {reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
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

const expanded=structuredClone(tourPacket)
// Retain accepted first three stages verbatim. Subsequent flat stages use a
// dry, lower-risk explicit context and short distances to exercise lifecycle
// length, not realistic Grand Tour terrain/distance calibration.
const dry={...context,weatherCondition:'clear',precipitationMm:0,rainProbabilityPct:0,weatherMultiplier:.7,severeWeather:false}
for(let n=4;n<=21;n++){
 const prev=expanded.stages[n-2],nextId=id(100+n)
 const gap=n===15?2:1
 const dates=Array.from({length:gap},(_,j)=>new Date(Date.parse(prev.date)+(j+1)*86400000).toISOString().slice(0,10))
 const km=[20,30,40][n%3]
 expanded.stages.push({input:{...input,stageId:nextId,stageName:'043AI endurance stage '+n,seed:'043AI-endurance-'+n,distanceKm:km,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:km,elevationMetres:50}]},runId:id(200+n),date:dates[dates.length-1],difficultyCategory:1,weatherCancelled:false,context:dry,policy:{...policy,timeLimitPercent:100},recovery:days(dates),modifierRows:prep(nextId),resourceRequests})
}

const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?90.1:100,lastUsedDate:null})))
const spare={...components[0],resourceId:'unused-spare'}
const assets=[{resourceId:'van-1',teamId:teams[0],sourceKey:'equipment_van',effects:[30]},{resourceId:'workshop-1',teamId:teams[0],sourceKey:'mobile_workshop',effects:[50]}]
const supports=[{teamId:teams[0],resourceId:'van-1',mechanicalRisk:.95,mechanicalTimeLoss:.9}]
const assetResources=assets.map(a=>({resourceType:'asset',resourceId:a.resourceId,teamId:a.teamId,quantity:null,stageUsesRemaining:2,maxStageUses:2,condition:100,lastUsedDate:null}))
const supplies=['bidons_water_bottles','energy_gels','nutrition_packs'].map(supplyKey=>({resourceId:'stock-'+supplyKey,teamId:teams[0],supplyKey}))
const consumables=supplies.map(s=>({resourceType:'supply',resourceId:s.resourceId,teamId:s.teamId,quantity:24,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}))
const jacketRider=roster[0]
const units=[{resourceId:'rain-jacket-1',teamId:jacketRider.teamId},{resourceId:'rain-jacket-spare',teamId:teams[1]}]
const jackets=units.map((u,i)=>({resourceType:'supply',resourceId:u.resourceId,teamId:u.teamId,quantity:null,stageUsesRemaining:i?25:1,maxStageUses:25,condition:null,lastUsedDate:null}))
const combined={...expanded,individualEquipmentWear:true,mechanicalBinding:{setups,supports},wearProtectionBinding:{assets},energyBinding:{mode:'archived_consumable_fallback_v1',supplies},clothingBinding:{units,medicalCenters:teams.map((teamId,i)=>({teamId,level:i?5:0}))},
 initialResources:[...components,spare,...assetResources,...consumables,...jackets],
 stages:expanded.stages.map((s,i)=>({...s,
  equipmentPerformanceRows:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentStagePerformancePct:i===0?0:5})),
  clothingTemperatureC:i<3?10:20,
  clothingPlans:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,requested:i===0&&r.riderId===jacketRider.riderId,resourceId:i===0&&r.riderId===jacketRider.riderId?units[0].resourceId:null})),
  clothingHashWitnesses:roster.map((r,j)=>({riderId:r.riderId,key:r.riderId+'-'+s.input.stageId+'-weather-illness',signedHashtext:j%2===0?-38:99})),
  resourceRequests:[...[...components,spare].map(c=>({resourceType:'equipment',resourceId:c.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),
   ...assets.map(a=>({resourceType:'asset',resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i>=1&&i<=3?1:0,conditionLossPerRaceDay:0})),
   ...supplies.map(a=>({resourceType:'supply',resourceId:a.resourceId,selectedQuantity:i>=1&&i<=3?16:0,selectedStageUses:0,conditionLossPerRaceDay:0})),
   ...units.map((a,j)=>({resourceType:'supply',resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i===0&&j===0?1:0,conditionLossPerRaceDay:0}))]
 }))}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const start=performance.now(),out=run(combined)
assert.equal(out.stages.length,21);assert.ok(out.stages.every(s=>s.physicalCompleted));assert.ok(out.gc.length>0)
assert.equal(out.stages[0].sportingRows.filter(r=>r.status==='otl').length,8)
assert.equal(out.stages[1].initialRiders.length,16)
assert.equal(out.finalReceiptSha256,out.stages.at(-1).receiptSha256)
console.log('PASS 043AQ complete 21-stage combined physical tour; km='+combined.stages.reduce((n,s)=>n+s.input.distanceKm,0)+' finalGC='+out.gc.length+' elapsedMs='+Math.round(performance.now()-start)+' heapMiB='+Math.round(process.memoryUsage().heapUsed/1048576))
let savedTicks=0,paceRows=0,protectedComponents=0,mechanicalCandidates=0,illnessCandidates=0,protectedExposures=0
const incidents=new Set(),withdrawn=new Set()
for(const [i,s] of out.stages.entries()){
 const st=combined.stages[i],receipt=s.receipt,wear=receipt.individualEquipmentWear.receipt,clothing=receipt.clothingExposure.receipt,energy=s.resourceEnergy,mechanical=s.resourceMechanical,pace=s.equipmentPerformance
 assert.equal(s.receiptSha256,carryoverDigest(receipt));assert.equal(receipt.priorSha256,i?out.stages[i-1].receiptSha256:null)
 assert.deepEqual(receipt.runHistory,combined.stages.slice(0,i+1).map(x=>x.runId))
 assert.equal(receipt.individualEquipmentWear.sha256,carryoverDigest(wear));assert.equal(receipt.clothingExposure.sha256,carryoverDigest(clothing))
 assert.equal(wear.physicalClassificationSha256,s.physicalClassificationSha256);assert.equal(clothing.physicalClassificationSha256,s.physicalClassificationSha256)
 assert.equal(wear.mechanicalEvidenceSha256,mechanical.evidenceSha256)
 assert.equal(s.recoveryReceipts.length,i?(Date.parse(st.date)-Date.parse(combined.stages[i-1].date))/86400000*roster.length:0)
 for(const row of receipt.resources){
  if(i)assert.deepEqual(row.before,out.stages[i-1].receipt.resources.find(x=>x.after.resourceId===row.before.resourceId).after)
  if(row.after.condition!==null)assert.ok(row.after.condition>=0&&row.after.condition<=row.before.condition)
  if(row.after.quantity!==null)assert.ok(row.after.quantity>=0&&row.after.quantity<=row.before.quantity)
  if(row.after.stageUsesRemaining!==null)assert.ok(row.after.stageUsesRemaining>=0&&row.after.stageUsesRemaining<=row.before.stageUsesRemaining)
 }
 for(const a of energy.allocations){
  const ledger=receipt.resources.find(r=>r.before.resourceId===a.resourceId)
  const expected=i===0?0:i===1?16:i===2?8:0
  assert.equal(a.usableQuantity,expected);assert.equal(ledger.after.quantity,ledger.before.quantity-expected)
  assert.equal(ledger.effect.quantityUsed,expected)
  assert.equal(ledger.effect.shortageApplied,i===2||i===3)
 }
 const available=i===1||i===2
 for(const a of wear.wearProtection.assets){
  assert.equal(a.available,available)
  const ledger=receipt.resources.find(r=>r.before.resourceId===a.resourceId)
  assert.equal(ledger.effect.stageUsesUsed,available?1:0)
  assert.equal(ledger.after.stageUsesRemaining,i===0?2:i===1?1:0)
 }
 assert.equal(mechanical.supportRows[0].available,available)
 // The van is deliberately shared by two effect channels, not two debits.
 const van=receipt.resources.filter(r=>r.before.resourceId==='van-1')
 assert.equal(van.length,1);assert.equal(van[0].effect.stageUsesUsed,available?1:0)
 for(const c of wear.rows){
  const factor=available&&c.before.teamId===teams[0]?.35:1
  assert.ok(Math.abs(c.wearIntensity-factor)<1e-12)
  assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,c.distanceKm/100*c.configuredWear*factor))<=.00000051)
  assert.deepEqual(receipt.resources.find(r=>r.before.resourceId===c.resourceId).after,c.after)
  if(c.distanceKm===0)assert.equal(c.conditionUsed,0)
  if(factor<1&&c.conditionUsed>0)protectedComponents++
 }
 const unused=wear.rows.find(r=>r.resourceId===spare.resourceId);assert.deepEqual(unused.before,unused.after)
 for(const r of mechanical.rows){
  const conditions=r.components.map(c=>receipt.resources.find(x=>x.before.resourceId===c.resourceId).before.condition)
  assert.equal(r.equipmentConditionPercent,Math.min(...conditions))
  const p=pace.rows.find(x=>x.riderId===r.riderId)
  assert.equal(p.equipmentConditionPercent,r.equipmentConditionPercent)
  if(p.eligible){assert.equal(p.equipmentPerformanceAdjustment,i===0?0:Math.round(p.stageSkillScore*.05*10000)/10000);if(i)paceRows++}
  else assert.ok(!Object.hasOwn(pace.adjustments,r.riderId))
 }
 for(const cp of s.mechanicalCheckpoints)for(const c of cp.evidence.candidates.filter(c=>c.probabilityInput.incidentKind==='technical_incident')){
  const r=mechanical.rows.find(r=>r.riderId===c.entityId)
  assert.equal(c.probabilityInput.equipmentConditionPercent,r.equipmentConditionPercent)
  assert.equal(c.probabilityInput.mechanicalIncidentRiskMultiplier,r.mechanicalRisk)
  assert.ok(reviewHistoricalIncidentProbability(c.probabilityInput).equipmentConditionMultiplier>=1)
  mechanicalCandidates++
 }
 for(const a of s.physicalEnergyAudit){
  const m=energy.rows.find(r=>r.riderId===a.riderId).roadEnergyMultiplier
  assert.equal(a.multiplier,m);assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.neutralCost*m))<1e-9)
  if(m<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.neutralCost)+1e-9)savedTicks++
 }
 for(const f of s.finishEnergyWitness){
  const a=f.energy,r=s.sportingRows.find(r=>r.riderId===f.riderId),m=energy.rows.find(r=>r.riderId===f.riderId).roadEnergyMultiplier
  assert.ok(Math.abs(r.energy.partialTickEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*m*f.crossingFraction))<1e-8)
 }
 for(const r of receipt.riders){
  assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
  assert.equal(r.workload.incidentEnergyLoss,0);assert.equal(r.energyAudit.additionalIncidentDeduction,0)
  if(withdrawn.has(r.riderId)){assert.equal(r.status,'dns');assert.ok(!s.initialRiders.some(x=>x.riderId===r.riderId))}
  if(r.status!=='finished')withdrawn.add(r.riderId)
  const e=energy.rows.find(x=>x.riderId===r.riderId)
  assert.equal(r.workload.postStageFatigueMultiplier,e.postStageFatigueMultiplier)
  assert.equal(r.workload.postStageRecoveryBonusPoints,e.postStageRecoveryBonusPoints)
 }
 for(const id of s.incidentIds){assert.ok(!incidents.has(id));incidents.add(id)}
 const prior=i?out.stages[i-1].receipt.clothingExposure.receipt.history:[]
 assert.deepEqual(clothing.history,[...prior,...clothing.exposures])
 assert.equal(clothing.priorExposuresSha256,carryoverDigest(prior))
 assert.equal(clothing.exposures.length,i<3?s.physicalClassification.filter(r=>r.status==='finished').length:0)
 for(const c of clothing.candidates){
  assert.equal(c.caseCreationVerified,false);assert.equal(c.availabilityChanged,false)
  if(c.eligible)illnessCandidates++
 }
 protectedExposures+=clothing.exposures.filter(x=>x.jacketUsed).length
 for(const u of clothing.allocation.units){
  const ledger=receipt.resources.find(r=>r.before.resourceId===u.resourceId)
  assert.equal(ledger.after.stageUsesRemaining,u.closingUses)
  assert.equal(ledger.after.stageUsesRemaining,u.resourceId===units[0].resourceId?0:25)
 }
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(receipt[k],false)
}
assert.ok(savedTicks>0&&paceRows>0&&protectedComponents>0&&mechanicalCandidates>0&&incidents.size>0&&illnessCandidates>0)
assert.equal(protectedExposures,1)
console.log('PASS 043AQ interacting pace, energy, fatigue, mechanical, clothing and wear evidence; savedTicks='+savedTicks+' paceRows='+paceRows+' protectedComponents='+protectedComponents+' mechanicalCandidates='+mechanicalCandidates+' incidents='+incidents.size+' illnessCandidates='+illnessCandidates)
console.log('PASS 043AQ one shared vehicle debit, consumable partial/exhausted stock, permanent withdrawals and 21-stage receipt continuity')
const shortPacket={...combined,stages:combined.stages.slice(0,3)}
const short=run(shortPacket)
for(const [i,s] of short.stages.entries()){
 const long=out.stages[i]
 assert.deepEqual(s.physicalClassification,long.physicalClassification);assert.deepEqual(s.sportingRows,long.sportingRows)
 assert.equal(s.observationSha256,long.observationSha256)
 assert.deepEqual(s.receipt.resources,long.receipt.resources)
 assert.deepEqual(s.receipt.clothingExposure,long.receipt.clothingExposure)
 assert.deepEqual(s.receipt.individualEquipmentWear,long.receipt.individualEquipmentWear)
}
const neutral=run({...shortPacket,stages:shortPacket.stages.map(s=>({...s,equipmentPerformanceRows:s.equipmentPerformanceRows.map(r=>({...r,equipmentStagePerformancePct:0}))}))})
assert.deepEqual(short.stages[0],neutral.stages[0])
assert.ok(short.stages[1].openingPhysicalObservation.measuredKm>neutral.stages[1].openingPhysicalObservation.measuredKm)
assert.equal(short.stages[1].initialRiders.length,neutral.stages[1].initialRiders.length)
assert.deepEqual(short.stages[1].initialRiders,neutral.stages[1].initialRiders)
const digest=carryoverDigest(out)
assert.equal(carryoverDigest(run(combined)),digest)
assert.throws(()=>reviewMultistagePhysicalTour({packet:combined,expectedPacketSha256:'0'.repeat(64)}),/frozen tour/)
const duplicate=structuredClone(combined);duplicate.stages[20].runId=duplicate.stages[19].runId
assert.throws(()=>run(duplicate),/distinct 3/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AQ matched combined pace response, prefix invariance, deterministic 21-stage replay and authority guards')
console.log('PASS 4/4 combined preparation checks; no hosted connection')
