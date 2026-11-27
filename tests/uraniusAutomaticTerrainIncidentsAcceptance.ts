import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {captureAutomaticOverlappingFinishPrefix} from '../scripts/uranius-automatic-overlapping-incident-review'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {startMultiRiderIncident,multiRiderIncidentTick} from '../scripts/uranius-multi-rider-incident-motion-review'
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





const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?74:100,lastUsedDate:null})))
const supports=teams.map(t=>({teamId:t,resourceId:t+'-support',mechanicalRisk:.95,mechanicalTimeLoss:.9}))
const assets=supports.map(s=>({resourceType:'asset',resourceId:s.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const stock={resourceType:'supply',resourceId:'nutrition',teamId:teams[0],quantity:24,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}
const resources=[...components,...assets,stock]
const requests=[...components.map(r=>({resourceType:r.resourceType,resourceId:r.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),...assets.map(r=>({resourceType:r.resourceType,resourceId:r.resourceId,selectedQuantity:0,selectedStageUses:1,conditionLossPerRaceDay:0})),{resourceType:'supply',resourceId:'nutrition',selectedQuantity:24,selectedStageUses:0,conditionLossPerRaceDay:0}]
const mechanical={provenance:P,stageId,date:source.date,resources,requests,setups,supports}
const energy={provenance:P,stageId,resources,requests,mode:'archived_consumable_fallback_v1',supplies:[{resourceId:'nutrition',teamId:teams[0],supplyKey:'nutrition_packs'}]}
const route=(profile,seed)=>{
 const distanceKm=200,amplitude=profile==='mountain'?800:300
 return {...input,seed,stageName:'043AS '+profile,distanceKm,settings:{...input.settings,minimumSpeedKmh:36,maximumSpeedKmh:44},
  profilePoints:Array.from({length:21},(_,i)=>({kilometre:i*10,elevationMetres:100+(i%2)*amplitude}))}
}
const argsForTerrain=(profile,seed)=>{
 const ctx={...context,terrainType:profile,flatSprint:false}
 const ep={provenance:P,stageId,terrainProfile:profile,rows:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentStagePerformancePct:5}))}
 return {input:route(profile,seed),source,expectedSourceSha256:carryoverDigest(source),context:ctx,expectedContextSha256:carryoverDigest(ctx),terrainCapability:true,resourceMechanicalEvidence:mechanical,expectedResourceMechanicalSha256:carryoverDigest(mechanical),resourceEnergyEvidence:energy,expectedResourceEnergySha256:carryoverDigest(energy),equipmentPerformanceEvidence:ep,expectedEquipmentPerformanceSha256:carryoverDigest(ep)}
}
const complete=prefix=>{
 assert.equal(prefix.trace.stopReason,'pre_finish_boundary')
 assert.equal(prefix.finishPrefix.handled,prefix.trace.incidents.length)
 const p=prefix.finishPrefix,target=p.targetId??Object.values(prefix.finalState.groups).find(g=>g.active&&g.groupType==='peloton').groupId
 return finishPhysicalIncidentStage(prefix.finalState,p.episodes,target,1440,Object.fromEntries(prefix.resourceEnergy.rows.map(r=>[r.riderId,r.roadEnergyMultiplier])),prefix.equipmentPerformance.adjustments,true)
}
let measuredCandidates=0,descendingCandidates=0,applications=0,repairTicks=0,chaseTicks=0,savedTicks=0
const results=[]
for(const profile of ['hilly','mountain']){
 // Fixed seed, same 24-rider roster; no candidate injection.
 const args=argsForTerrain(profile,'043Y-engine-4')
 assert.equal(calculateStageProfileCategory(args.input).category,profile)
 const prefix=captureAutomaticOverlappingFinishPrefix(args)
 assert.equal(prefix.trace.measuredTerrainUsed,true);assert.equal(prefix.terrainCapability,true)
 assert.ok(prefix.observations.some(o=>o.tick.gradientPercent>0)&&prefix.observations.some(o=>o.tick.gradientPercent<0))
 for(const o of prefix.observations){
  for(const g of o.measuredGroups){
   assert.equal(g.gradientPercent,getStageTerrainSample(args.input,g.distanceKm).gradientPercent)
   assert.ok(g.speedKmh>=0&&g.speedKmh<=44+1e-8)
  }
  for(const p of o.movementProposals){
   assert.equal(p.gradientPercent,getStageTerrainSample(args.input,p.previousDistanceKm).gradientPercent)
   assert.ok(p.nextDistanceKm>=p.previousDistanceKm&&p.nextDistanceKm<=200)
   const ep=o.activeEpisodes.find(e=>e.groupId===p.groupId)
   if(ep&&o.raceSecond-30<ep.repairUntil){assert.equal(p.distanceAdvancedKm,0);repairTicks++}
   if(ep&&o.raceSecond-30>=ep.repairUntil&&p.distanceAdvancedKm>0)chaseTicks++
  }
 }
 assert.ok(prefix.trace.incidents.length>0&&prefix.applications.length>0)
 for(const cp of prefix.selectedCheckpoints){
  const o=prefix.observations.find(x=>x.raceSecond===cp.evidence.raceSecond)
  for(const c of cp.evidence.candidates){
   const g=o.measuredGroups.find(m=>m.displayCode===c.displayCode)
   assert.equal(c.probabilityInput.currentSpeedKmh,g.speedKmh)
   assert.equal(c.probabilityInput.gradientPercent,g.gradientPercent)
   const risk=reviewHistoricalIncidentProbability(c.probabilityInput)
   if(c.probabilityInput.incidentKind!=='exhaustion'&&g.gradientPercent<0){
    assert.ok(risk.descentMultiplier>1);descendingCandidates++
   }
   if(c.probabilityInput.incidentKind==='technical_incident'){
    assert.equal(risk.equipmentConditionMultiplier,1.15);assert.equal(risk.mechanicalSupportMultiplier,.95)
   }
   measuredCandidates++
  }
 }
 for(const a of prefix.applications){
  assert.ok(prefix.trace.incidents.some(e=>e.incident.incidentId===a.incidentId))
  assert.ok(a.afterEnergy<=a.beforeEnergy)
 }
 applications+=prefix.applications.length
 const finish=complete(prefix)
 assert.ok(finish.state.completed);assert.equal(finish.classification.length,roster.length)
 assert.equal(finish.classificationSha256,carryoverDigest(finish.classification))
 assert.ok(finish.classification.some(r=>r.status==='finished'))
 for(const t of finish.ticks)for(const p of t.movement.proposals){
  assert.equal(p.gradientPercent,getStageTerrainSample(args.input,p.previousDistanceKm).gradientPercent)
  assert.ok(p.nextDistanceKm>=p.previousDistanceKm&&p.nextDistanceKm<=200)
 }
 const audit=[...prefix.energyAudit,...finish.ticks.flatMap(t=>t.energy.map(a=>({previousEnergy:a.previousEnergy,nextEnergy:a.nextEnergy,neutralCost:a.result.grossEnergyCost*a.result.efficiencyMultiplier,multiplier:prefix.resourceEnergy.rows.find(r=>r.riderId===a.riderId).roadEnergyMultiplier})))]
 for(const a of audit){
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.neutralCost*a.multiplier))<1e-9)
  if(a.multiplier<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.neutralCost)+1e-9)savedTicks++
 }
 console.log('INFO 043AS '+profile+' incidents='+prefix.trace.incidents.length+' finishers='+finish.classification.filter(r=>r.status==='finished').length+' winnerSeconds='+finish.classification[0].elapsedSeconds)
 results.push({args,prefix,finish})
}
assert.ok(measuredCandidates>0&&descendingCandidates>0&&applications>0&&savedTicks>0)
console.log('PASS 043AS actual hilly/mountain automatic checkpoint speed and gradient, weather/equipment risk; measuredCandidates='+measuredCandidates+' descendingCandidates='+descendingCandidates)
assert.ok(repairTicks>0&&chaseTicks>0)
console.log('PASS 043AS physical incident application, terrain repair/chase and terminal finish; applications='+applications+' repairTicks='+repairTicks+' chaseTicks='+chaseTicks+' savedTicks='+savedTicks)
// Controlled same-stage repair checks ensure the local-gradient chase path
// really advances a separated rider, and never teleports it to a helper.
const short={...route('mountain','043AS-controlled'),distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:10,elevationMetres:900},{kilometre:20,elevationMetres:100}]}
const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:short})
const state=createInitialState(bound.input),affected=roster[0].riderId,helper=roster[1].riderId
const batch=startMultiRiderIncident(state,[{riderId:affected,helper,repairSeconds:60,energyLossPoints:2,statusImpact:'finished'}])
const one=multiRiderIncidentTick(batch.state,batch.episodes,batch.targetId,undefined,undefined,true)
assert.equal(one.state.riders[affected].distanceKm,0)
const two=multiRiderIncidentTick(one.state,one.episodes,batch.targetId,undefined,undefined,true)
assert.equal(two.state.riders[affected].distanceKm,0)
const three=multiRiderIncidentTick(two.state,two.episodes,batch.targetId,undefined,undefined,true)
assert.ok(three.state.riders[affected].distanceKm>0)
assert.ok(three.state.riders[affected].distanceKm<=two.state.riders[helper].distanceKm+1e-9)
const physical=finishPhysicalIncidentStage(three.state,three.episodes,batch.targetId,1440,undefined,undefined,true)
assert.ok(physical.state.completed&&physical.classification.length===24)
const contactTicks=[one,two,three,...physical.ticks]
const pickup=contactTicks.find(t=>t.pickups.includes(affected)),rejoin=contactTicks.find(t=>t.rejoins.includes(affected))
assert.ok(pickup&&rejoin&&pickup.state.raceSecond<=rejoin.state.raceSecond)
assert.equal(pickup.state.riders[affected].currentGroupId,pickup.state.riders[helper].currentGroupId)
assert.ok(Math.abs(pickup.state.riders[affected].distanceKm-pickup.state.riders[helper].distanceKm)<1e-8)
assert.equal(rejoin.state.riders[affected].currentGroupId,batch.targetId)
console.log('PASS 043AS controlled uphill repair duration, actual helper pickup/rejoin and full terminal completion')
const last=results.at(-1),replay=captureAutomaticOverlappingFinishPrefix(last.args)
assert.deepEqual(replay,last.prefix)
assert.deepEqual(complete(replay),last.finish)
const flatArgs={...argsFor('043AS-flat-parity'),input:{...input,seed:'043AS-flat-parity',distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:20,elevationMetres:100}]}}
assert.deepEqual(captureAutomaticOverlappingFinishPrefix(flatArgs),captureAutomaticOverlappingFinishPrefix({...flatArgs,terrainCapability:false}))
const bad={...last.args,context:{...last.args.context,terrainType:'flat'}}
assert.throws(()=>captureAutomaticOverlappingFinishPrefix({...bad,expectedContextSha256:carryoverDigest(bad.context)}),/nonflat terrain context mismatch/)
assert.throws(()=>captureAutomaticOverlappingFinishPrefix({...last.args,terrainCapability:false}),/bounded flat/)
for(const x of results)for(const o of [x.prefix,x.finish])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(o[k],false)
console.log('PASS 043AS deterministic terrain replay, flat default parity, opt-in mismatch and authority guards')
console.log('PASS 4/4 automatic terrain incident checks; no hosted connection')
