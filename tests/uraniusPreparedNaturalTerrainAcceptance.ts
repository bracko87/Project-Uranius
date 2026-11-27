import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewPreparedNaturalTerrain} from '../scripts/uranius-prepared-natural-terrain-review'
import {reviewHistoricalNaturalTerrain} from '../scripts/uranius-historical-natural-terrain-review'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
import {reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
import {calculatePelotonBasePace} from '../src/race-engine/simulation/pelotonPace'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}


const riders=roster.map((r,i)=>({...r,attributes:{...r.attributes,flat:75,climbing:i<6?5:95,stamina:80,resistance:75,recovery:75,raceIq:75,teamwork:75,timeTrial:75}}))
const mountain={...input,riders,seed:'043AT-natural-mountain',distanceKm:40,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:4,elevationMetres:100},{kilometre:14,elevationMetres:1100},{kilometre:24,elevationMetres:100},{kilometre:40,elevationMetres:1380}]}

const context={terrainType:'mountain',weatherCondition:'rain',precipitationMm:1,rainProbabilityPct:90,weatherMultiplier:2.5,severeWeather:true,flatSprint:false}
const route={...mountain,distanceKm:120,profilePoints:[...mountain.profilePoints,{kilometre:50,elevationMetres:580},{kilometre:60,elevationMetres:1380},{kilometre:70,elevationMetres:580},{kilometre:80,elevationMetres:1380},{kilometre:90,elevationMetres:580},{kilometre:100,elevationMetres:1380},{kilometre:110,elevationMetres:580},{kilometre:120,elevationMetres:1380}]}

const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=riders.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?74:100,lastUsedDate:null})))
const spare={...components[0],resourceId:'spare'}
const assets=[{resourceId:'van',teamId:teams[0],sourceKey:'equipment_van',effects:[30]},{resourceId:'workshop',teamId:teams[0],sourceKey:'mobile_workshop',effects:[50]}]
const supports=[{teamId:teams[0],resourceId:'van',mechanicalRisk:.95,mechanicalTimeLoss:.9}]
const assetResources=assets.map(a=>({resourceType:'asset',resourceId:a.resourceId,teamId:a.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const supplies=['bidons_water_bottles','energy_gels','nutrition_packs'].map(supplyKey=>({resourceId:supplyKey,teamId:teams[0],supplyKey}))
const consumables=supplies.map(s=>({resourceType:'supply',resourceId:s.resourceId,teamId:s.teamId,quantity:8,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}))
const units=[{resourceId:'jacket',teamId:teams[0]},{resourceId:'jacket-spare',teamId:teams[1]}]
const jackets=units.map((u,i)=>({resourceType:'supply',resourceId:u.resourceId,teamId:u.teamId,quantity:null,stageUsesRemaining:i?25:1,maxStageUses:25,condition:null,lastUsedDate:null}))
const resources=[...components,spare,...assetResources,...consumables,...jackets]
const requests=resources.map(r=>({resourceType:r.resourceType,resourceId:r.resourceId,selectedQuantity:r.quantity===null?0:16,selectedStageUses:r.resourceType==='asset'||r.resourceId==='jacket'?1:0,conditionLossPerRaceDay:r.resourceType==='equipment'?.35:r.resourceType==='asset'?.25:0}))
const opening={provenance:P,stageId,date:source.date,resources,requests}
const mechanical={...opening,setups,supports}
const energy={...opening,mode:'archived_consumable_fallback_v1',supplies}
const protection={...opening,assets}
const clothing={...opening,units,plans:riders.map((r,i)=>({riderId:r.riderId,teamId:r.teamId,requested:i===0,resourceId:i===0?'jacket':null})),weather:{temperatureC:10,rainChancePct:context.rainProbabilityPct,precipitationMm:context.precipitationMm,condition:context.weatherCondition},medicalCenters:teams.map((teamId,i)=>({teamId,level:i?5:0})),hashWitnesses:riders.map(r=>({riderId:r.riderId,key:r.riderId+'-'+stageId+'-weather-illness',signedHashtext:0}))}
const priorExposures=riders.map(r=>({riderId:r.riderId,teamId:r.teamId,stageId:id(99),runId:id(199),date:'2000-01-02',required:true,jacketUsed:false,illnessRiskScore:60}))
const performance={provenance:P,stageId,terrainProfile:'mountain',rows:riders.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentStagePerformancePct:5}))}
const packet={provenance:P,input:{...route,seed:'043AU-natural-history-0'},source,context,difficultyCategory:5,preparation:{mechanical,performance,energy,protection,clothing,priorExposures}}
const run=p=>reviewPreparedNaturalTerrain({packet:p,expectedPacketSha256:carryoverDigest(p)})
const x=run(packet),p=x.physical,receipt=x.receipt,prep=p.preparation
assert.ok(p.finalState.completed&&p.classification.length===24)
assert.equal(x.receiptSha256,carryoverDigest(receipt))
assert.ok(p.observations.some(o=>o.transitions.length>0),'natural drops required')
assert.ok(p.applications.length>0)
let pressureRows=0,savedTicks=0,measured=0,protectedWear=0
for(const t of p.ticks){
 for(const a of t.appliedEnergy.applications){
  const m=prep.supply.rows.find(r=>r.riderId===a.riderId).roadEnergyMultiplier
  assert.equal(a.preparationEnergyMultiplier,m)
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*m))<1e-9)
  if(m<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier)+1e-9)savedTicks++
 }
 for(const e of t.pressureEvaluations){
  const base=e.steepGradientSeverity?.adjustedCapabilityScore??e.terrainCapability.capabilityScore
  const adj=prep.equipment.adjustments[e.riderId]
  assert.ok(Math.abs(e.effectiveCapabilityScore-Math.min(100,Math.min(100,Math.max(0,base+adj*e.terrainCapability.fatigueMultiplier))+e.shelterBonus))<1e-9)
  pressureRows++
 }
}
const first=p.ticks[0],group=first.previousState.groups.peloton_main
const expected=calculatePelotonBasePace({riders:group.riderIds.map(id=>first.previousState.riders[id]),minimumSpeedKmh:packet.input.settings.minimumSpeedKmh,maximumSpeedKmh:packet.input.settings.maximumSpeedKmh,experimentalEquipmentCapabilityAdjustments:prep.equipment.adjustments})
assert.equal(first.movement.groupDiagnostics[0].pace.currentBaseSpeedKmh,expected.baseSpeedKmh)
assert.ok(savedTicks>0&&pressureRows>0)
console.log('PASS 043AV calibrated prepared movement and pressure, natural separation and actual tick energy; pressureRows='+pressureRows+' savedTicks='+savedTicks)
for(const cp of p.selectedCheckpoints)for(const c of cp.evidence.candidates.filter(c=>c.probabilityInput.incidentKind==='technical_incident')){
 const m=prep.mechanical.rows.find(r=>r.riderId===c.entityId),risk=reviewHistoricalIncidentProbability(c.probabilityInput)
 assert.equal(c.probabilityInput.equipmentConditionPercent,m.equipmentConditionPercent)
 assert.equal(risk.equipmentConditionMultiplier,1.15)
 assert.equal(c.probabilityInput.mechanicalIncidentRiskMultiplier,m.mechanicalRisk)
 measured++
}
assert.ok(measured>0)
for(const a of prep.supply.allocations){
 const l=receipt.resources.find(r=>r.before.resourceId===a.resourceId)
 assert.equal(a.usableQuantity,8);assert.equal(l.after.quantity,0);assert.equal(l.effect.quantityUsed,8)
}
for(const a of assets){
 const l=receipt.resources.filter(r=>r.before.resourceId===a.resourceId)
 assert.equal(l.length,1);assert.equal(l[0].effect.stageUsesUsed,1);assert.equal(l[0].after.stageUsesRemaining,0)
}
for(const c of receipt.individualWear.receipt.rows){
 const factor=c.before.teamId===teams[0]?.35:1
 assert.ok(Math.abs(c.wearIntensity-factor)<1e-12)
 assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,c.distanceKm/100*c.configuredWear*factor))<=.00000051)
 assert.deepEqual(receipt.resources.find(r=>r.before.resourceId===c.resourceId).after,c.after)
 if(c.distanceKm>0&&factor<1)protectedWear++
}
assert.ok(protectedWear>0)
assert.deepEqual(receipt.resources.find(r=>r.before.resourceId==='spare').after,spare)
const jacket=receipt.resources.find(r=>r.before.resourceId==='jacket'),unused=receipt.resources.find(r=>r.before.resourceId==='jacket-spare')
assert.equal(jacket.after.stageUsesRemaining,0);assert.deepEqual(unused.before,unused.after)
assert.equal(receipt.clothingExposure.receipt.exposures.length,p.classification.filter(r=>r.status==='finished').length)
assert.ok(receipt.clothingExposure.receipt.candidates.every(c=>c.eligible&&!c.caseCreationVerified&&!c.availabilityChanged))
console.log('PASS 043AV mechanical candidates, one shared asset debit, partial consumables, individual wear and clothing allocation; measured='+measured+' protectedWear='+protectedWear)
for(const r of receipt.riders){
 assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
 assert.equal(r.workload.incidentEnergyLoss,0);assert.equal(r.energyAudit.additionalIncidentDeduction,0)
 if(r.energyAudit.finishWitness){
  const f=r.energyAudit.finishWitness
  assert.ok(Math.abs(r.workload.rawFinishEnergy-Math.max(0,f.previousEnergy-f.neutralCost*f.multiplier*f.crossingFraction))<1e-9)
 }
 assert.equal(r.workload.postStageFatigueMultiplier,prep.supply.rows.find(x=>x.riderId===r.riderId).postStageFatigueMultiplier)
 assert.equal(r.workload.postStageRecoveryBonusPoints,prep.supply.rows.find(x=>x.riderId===r.riderId).postStageRecoveryBonusPoints)
}
console.log('PASS 043AV fractional finishing workload, original fatigue and recovery, no duplicate incident energy debit')
const replay=run(packet)
assert.equal(replay.receiptSha256,x.receiptSha256)
assert.deepEqual(replay.physical.classification,p.classification)
assert.equal(replay.physical.observationsSha256,p.observationsSha256)
const bad=structuredClone(packet);bad.preparation.energy=structuredClone(bad.preparation.energy);bad.preparation.energy.resources[0].condition=50
assert.throws(()=>run(bad),/opening ledger mismatch/)
assert.throws(()=>reviewPreparedNaturalTerrain({packet,expectedPacketSha256:'0'.repeat(64)}),/frozen prepared/)
for(const z of [x,receipt,p])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
assert.equal(receipt.weatherMovementVerified,false)
console.log('PASS 043AV deterministic prepared replay, ledger mismatch and authority guards')
console.log('PASS 4/4 prepared natural terrain checks; no hosted connection')
