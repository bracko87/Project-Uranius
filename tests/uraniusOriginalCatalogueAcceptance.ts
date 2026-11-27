import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewOriginalEquipmentPreview,reviewOriginalConsumableFallback,archivedStarterDefinitions} from '../scripts/uranius-original-catalogue-review.mjs'
import {resolveResourceEnergyReview} from '../scripts/uranius-resource-energy-review'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
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


const keys=['flat_bonus_pct','hilly_bonus_pct','mountain_bonus_pct','cobble_bonus_pct','time_trial_bonus_pct','sprint_bonus_pct','fatigue_reduction_pct']
assert.equal(archivedStarterDefinitions.length,6);assert.ok(archivedStarterDefinitions.every(x=>x.requiredCount===10))
const weights=archivedStarterDefinitions.map((x,i)=>({category:x.category,weight:[.3,.25,.15,.15,.1,.05][i]}))
const catalogue=archivedStarterDefinitions.map((x,i)=>({catalogItemId:id(3000+i),category:x.category,kind:'durable',active:true,effects:{flat_bonus_pct:i+1,mountain_bonus_pct:-10,hilly_bonus_pct:10,time_trial_bonus_pct:2,cobble_bonus_pct:1,fatigue_reduction_pct:3}}))
const selection=catalogue.map(x=>({category:x.category,catalogItemId:x.catalogItemId}))
const preview={provenance:P,weights,allowedKeys:keys,catalogue,selection,terrain:'flat'}
const flat=reviewOriginalEquipmentPreview(preview)
assert.equal(flat.stageUiBonusPct,2.65);assert.equal(flat.rawWeightedBonuses.hilly_bonus_pct,10);assert.equal(flat.weightedBonuses.hilly_bonus_pct,4)
assert.equal(reviewOriginalEquipmentPreview({...preview,terrain:'mountain'}).stageUiBonusPct,-4)
assert.equal(reviewOriginalEquipmentPreview({...preview,terrain:'cobbled'}).stageUiBonusPct,1)
assert.equal(reviewOriginalEquipmentPreview({...preview,terrain:'time_trial'}).stageUiBonusPct,2)
assert.equal(flat.weightedBonuses.sprint_bonus_pct,0)
assert.equal(flat.authoritativeCatalogueVerified,false);assert.equal(flat.conditionScalingVerified,false)
assert.throws(()=>reviewOriginalEquipmentPreview({...preview,selection:selection.slice(1)}),/complete catalogue selection/)
assert.throws(()=>reviewOriginalEquipmentPreview({...preview,catalogue:catalogue.map((x,i)=>i?x:{...x,active:false})}),/missing active matching/)
console.log('PASS 043AN archived starter identities, weighted equipment preview, terrain keys and caps')
const supplies=['bidons_water_bottles','energy_gels','nutrition_packs'].map(supplyKey=>({resourceId:'review-'+supplyKey,teamId:teams[0],supplyKey}))
const resourceRows=supplies.map(s=>({resourceType:'supply',resourceId:s.resourceId,teamId:s.teamId,quantity:8,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}))
const expanded={...tourPacket,energyBinding:{mode:'archived_consumable_fallback_v1',supplies},initialResources:[tourPacket.initialResources[0],...resourceRows],stages:tourPacket.stages.map((s,i)=>({...s,resourceRequests:[s.resourceRequests[0],...supplies.map(x=>({resourceType:'supply',resourceId:x.resourceId,selectedQuantity:i===0?0:16,selectedStageUses:0,conditionLossPerRaceDay:0}))]}))}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const out=run(expanded)
assert.ok(out.stages.every(s=>s.physicalCompleted))
let savedTicks=0
for(const [i,s] of out.stages.entries()){
 const count=s.initialRiders.filter(r=>roster.find(x=>x.riderId===r.riderId).teamId===teams[0]).length
 assert.ok(count>0)
 for(const a of s.resourceEnergy.allocations){
  assert.equal(a.riderCount,count);assert.equal(a.usableQuantity,i===1?8:0);assert.equal(a.usableRatio,i===1?.5:0)
  assert.deepEqual(a.standardized,reviewOriginalConsumableFallback({supplyKey:a.supplyKey,planned:i===0?0:16,stock:i===2?0:8,riderCount:count}).standardized)
  const ledger=s.receipt.resources.find(x=>x.before.resourceId===a.resourceId)
  assert.equal(ledger.after.quantity,i===0?8:0);assert.equal(ledger.effect.shortageApplied,i!==0)
 }
 for(const r of s.resourceEnergy.rows){
  const active=r.teamId===teams[0]
  const expectedEnergy=active&&i===1?Math.max(.9,Math.round((1-5.1*8/count/100)*1e6)/1e6):1
  const expectedFatigue=active&&i!==0?Math.round((1+(3-(i===1?.6*8/count:0))/100)*1e6)/1e6:1
  assert.ok(Math.abs(r.roadEnergyMultiplier-expectedEnergy)<1e-6)
  assert.ok(Math.abs(r.postStageFatigueMultiplier-expectedFatigue)<1e-6)
  assert.equal(r.postStageRecoveryBonusPoints,active&&i===1?Math.round(1.5*8/count*1e6)/1e6:0)
 }
 for(const a of s.physicalEnergyAudit){
  const r=s.resourceEnergy.rows.find(r=>r.riderId===a.riderId)
  assert.equal(a.multiplier,r.roadEnergyMultiplier)
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.neutralCost*a.multiplier))<1e-9)
  if(a.multiplier<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.neutralCost)+1e-9)savedTicks++
 }
 for(const r of s.receipt.riders)assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
}
assert.ok(savedTicks>0)
console.log('PASS 043AN original water, gel and nutrition fallback effects reach physical ticks; savedTicks='+savedTicks)
const two=out.stages[1],evidence={provenance:P,stageId:two.stageId,mode:'archived_consumable_fallback_v1',resources:two.receipt.resources.map(r=>r.before),requests:expanded.stages[1].resourceRequests,supplies}
const resolve=e=>resolveResourceEnergyReview({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:two.ready})
assert.deepEqual(resolve(evidence),two.resourceEnergy)
assert.equal(reviewOriginalConsumableFallback({supplyKey:'energy_gels',planned:16,stock:8,riderCount:8}).supplySupportPoints,.75)
const zero=structuredClone(evidence);zero.resources.filter(r=>r.resourceType==='supply').forEach(r=>r.quantity=0)
const exhausted=resolve(zero)
assert.ok(exhausted.rows.filter(r=>r.teamId===teams[0]).every(r=>r.roadEnergyMultiplier===1&&r.postStageFatigueMultiplier===1.03&&r.postStageRecoveryBonusPoints===0))
assert.throws(()=>resolve({...evidence,supplies:[...supplies,{...supplies[0],resourceId:'duplicate'}]}),/duplicate team supply key/)
assert.throws(()=>resolve({...evidence,supplies:supplies.map(s=>({...s,standardized:{}}))}),/explicit fallback identity/)
console.log('PASS 043AN partial allocation, zero-stock shortage maximum and duplicate/custom input rejection')
assert.deepEqual(run(expanded),out)
const legacy=run(tourPacket)
assert.deepEqual(out.stages[0].physicalClassification,legacy.stages[0].physicalClassification)
assert.deepEqual(out.stages[0].sportingRows,legacy.stages[0].sportingRows)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AN deterministic replay, neutral first-stage parity and authority guards')
console.log('PASS 4/4 original catalogue checks; no hosted connection')
