import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {resolvePreparedPhysicalWeather,combinedPreparedWeatherFatigue} from '../scripts/uranius-prepared-physical-weather-review'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:n%2===0?5:95,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
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

const mountainPoints=[{kilometre:0,elevationMetres:100},{kilometre:4,elevationMetres:100},{kilometre:14,elevationMetres:1100},{kilometre:24,elevationMetres:100},{kilometre:40,elevationMetres:1380}]
const hillyPoints=[100,220,100,220,100,100].map((elevationMetres,i)=>({kilometre:i*4,elevationMetres}))
const terrain=['flat','mountain','hilly','flat','mountain','hilly','flat','hilly','mountain','flat','hilly','mountain','flat','mountain','flat','hilly','mountain','hilly','flat','mountain','flat']
const mixed={...combined,mixedTerrain:true,stages:combined.stages.map((s,i)=>{
 const type=terrain[i],nonflat=type!=='flat',points=type==='mountain'?mountainPoints:hillyPoints
 return {...s,input:nonflat?{...s.input,stageName:'043AW '+type+' '+(i+1),distanceKm:points.at(-1).kilometre,profilePoints:points}:s.input,
 context:{...s.context,terrainType:type,flatSprint:!nonflat},
 policy:{...s.policy,flatFinish:!nonflat}}
})}
for(const [i,s] of mixed.stages.entries())assert.equal(calculateStageProfileCategory(s.input).category,terrain[i])

const weather=(condition,temperature,wind,mm)=>({authority:'stage_weather_snapshot',source:P,condition,summary:null,averageTemperatureC:temperature,minimumTemperatureC:temperature,maximumTemperatureC:temperature,windSpeedKmh:wind,precipitationMm:mm,hostCity:null,countryCode:null})
const conditions=[null,weather('rain',20,0,3),weather('heavy_rain',5,35,15),weather('rain',20,40,5),weather('clear',0,0,0),weather('clear',40,0,0),weather('clear',20,0,0),
 weather('drizzle',18,10,1),weather('clear',2,25,0),weather('clear',22,40,0),weather('rain',18,10,4),weather('heavy_rain',4,30,16),weather('clear',35,0,0),weather('clear',0,0,0),weather('clear',20,0,0),weather('rain',12,20,3),weather('heavy_rain',5,35,15),weather('clear',40,0,0),weather('clear',20,35,0),weather('drizzle',8,15,1),weather('clear',20,0,0)]
// Keep the accepted opening 200km stage (historical weather risk only) to
// preserve the tested OTL cohort. All twenty subsequent stages have explicit physics.
const weatherTour={...mixed,stages:mixed.stages.map((s,i)=>{
 const w=conditions[i];if(!w)return s
 const effects=calculateWeatherPerformanceEffects(w)
 const input=i===3?{...s.input,distanceKm:90,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:90,elevationMetres:50}]}:s.input
 return {...s,input,physicalWeather:w,clothingTemperatureC:w.averageTemperatureC,context:{...s.context,weatherCondition:w.condition,precipitationMm:w.precipitationMm,rainProbabilityPct:w.precipitationMm?90:0,weatherMultiplier:Math.min(2.5,effects.incidentProbabilityMultiplier),severeWeather:w.condition==='heavy_rain'}}
})}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const start=performance.now(),out=run(weatherTour)
assert.equal(out.stages.length,21);assert.ok(out.stages.every(s=>s.physicalCompleted))
assert.ok(out.gc.length>0)
assert.equal(out.stages[0].sportingRows.filter(r=>r.status==='otl').length,8)
assert.equal(out.stages[1].initialRiders.length,16)
assert.equal(weatherTour.stages.reduce((n,s)=>n+s.input.distanceKm,0),850)
assert.equal((Date.parse(weatherTour.stages.at(-1).date)-Date.parse(weatherTour.stages[0].date))/86400000+1,23)
assert.equal(weatherTour.stages.filter((s,i)=>i&&(Date.parse(s.date)-Date.parse(weatherTour.stages[i-1].date))/86400000===2).length,2)
assert.deepEqual(terrain.reduce((a,t)=>({...a,[t]:(a[t]??0)+1}),{}),{flat:8,mountain:7,hilly:6})
let weatherTicks=0,savedTicks=0,runtimeFatigueTicks=0,weatherCandidates=0,flatCandidates=0,flatWeatherTicks=0,drops=0,lateDrops=0,lateWeatherTicks=0,lateFatigueTicks=0,neutralStages=0
const lateWeatherTerrains=new Set()
for(const [i,s] of out.stages.entries()){
 const stage=weatherTour.stages[i],w=s.physicalWeather
 assert.equal(s.physicalClassificationSha256,carryoverDigest(s.physicalClassification))
 if(s.naturalTransitions){const n=s.naturalTransitions.reduce((n,t)=>n+t.movedRiderIds.length,0);drops+=n;if(i>=7)lateDrops+=n}
 if(!i){assert.equal(w,undefined);continue}
 const expected=resolvePreparedPhysicalWeather(stage.input,stage.context,stage.physicalWeather)
 assert.deepEqual(w,expected)
 assert.deepEqual(s.receipt.physicalWeather,expected)
 assert.equal(s.physicalWeatherApplied,![6,14,20].includes(i))
 if(w.neutral)neutralStages++
 else if(i>=7)lateWeatherTerrains.add(s.terrainType)
 if(!w.neutral){
  const opening=s.openingPhysicalObservation.movementProposals??s.openingPhysicalObservation.movement
  assert.ok(opening.length>0)
  const g=opening.find(p=>p.groupType==='peloton')
  assert.ok(g&&g.appliedSpeedKmh>0)
  // On the flat profile the terrain multiplier is exactly one and base
  // pace is unaffected by the explicit weather modifier.
  if(s.terrainType==='flat')assert.ok(Math.abs(g.appliedSpeedKmh-g.baseSpeedKmh*w.effects.speedMultiplier)<1e-6)
  for(const a of s.physicalEnergyAudit){
   assert.equal(a.weatherMultiplier,w.energyMultiplier)
   const expected=Math.max(0,a.previousEnergy-a.neutralCost*a.multiplier*a.weatherMultiplier)
   assert.ok(Math.abs(a.nextEnergy-expected)<1e-9)
   if(a.runtimeFatigueGain>0){runtimeFatigueTicks++;if(i>=7)lateFatigueTicks++}
   if(a.multiplier<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.neutralCost*w.energyMultiplier)+1e-9)savedTicks++
   weatherTicks++;if(i>=7)lateWeatherTicks++;if(s.terrainType==='flat')flatWeatherTicks++
  }
  for(const cp of s.mechanicalCheckpoints)for(const c of cp.evidence.candidates){
   assert.equal(c.probabilityInput.weatherMultiplier,w.historicalRiskMultiplier)
   weatherCandidates++;if(s.terrainType==='flat')flatCandidates++
  }
  for(const f of s.finishEnergyWitness){
   const a=f.energy,row=s.sportingRows.find(r=>r.riderId===f.riderId)
   assert.equal(a.experimentalWeatherEnergyMultiplier,w.energyMultiplier)
   assert.ok(Math.abs(row.energy.partialTickEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*a.preparationEnergyMultiplier*w.energyMultiplier*f.crossingFraction))<1e-8)
  }
 }
 console.log('INFO 043BA stage='+s.stageNumber+' terrain='+s.terrainType+' speedFactor='+w.effects.speedMultiplier+' energyFactor='+w.energyMultiplier+' fatigueFactor='+w.effects.fatigueGainMultiplier+' incidents='+s.incidentIds.length+' GC='+s.receipt.gc.length)
}
assert.ok(weatherTicks>0&&flatWeatherTicks>0&&savedTicks>0&&runtimeFatigueTicks>0&&weatherCandidates>0&&drops>0&&lateDrops>0&&lateWeatherTicks>0&&lateFatigueTicks>0)
assert.equal(neutralStages,3)
assert.deepEqual([...lateWeatherTerrains].sort(),['flat','hilly','mountain'])
console.log('PASS 043BA 21-stage weather endurance, measured incident risk and conserved nutrition; weatherTicks='+weatherTicks+' flatWeatherTicks='+flatWeatherTicks+' savedTicks='+savedTicks+' runtimeFatigueTicks='+runtimeFatigueTicks+' candidates='+weatherCandidates+' flatCandidates='+flatCandidates+' naturalDrops='+drops+' lateNaturalDrops='+lateDrops+' lateWeatherTicks='+lateWeatherTicks+' lateFatigueTicks='+lateFatigueTicks+' elapsedMs='+Math.round(performance.now()-start))
let recovery=0,protectedComponents=0
const withdrawn=new Set(),totals=new Map(),seen=new Set()
for(const [i,s] of out.stages.entries()){
 const r=s.receipt,prev=out.stages[i-1],w=s.physicalWeather
 assert.equal(s.receiptSha256,carryoverDigest(r));assert.equal(r.priorSha256,prev?.receiptSha256??null)
 for(const row of r.riders){
  const ready=s.ready.rows.find(x=>x.riderId===row.riderId),supply=s.resourceEnergy.rows.find(x=>x.riderId===row.riderId)
  if(row.workload.eligibleToStart){
   const expected=w?combinedPreparedWeatherFatigue(supply.postStageFatigueMultiplier,w):supply.postStageFatigueMultiplier
   assert.equal(row.workload.postStageFatigueMultiplier,expected)
   assert.equal(row.workload.incidentEnergyLoss,0);assert.equal(row.energyAudit.additionalIncidentDeduction,0)
  }
  if(prev){
   let f=prev.receipt.riders.find(x=>x.riderId===row.riderId).persistedFatigue
   for(const n of s.recoveryReceipts.filter(x=>x.riderId===row.riderId).sort((a,b)=>a.date.localeCompare(b.date))){
    assert.equal(n.fatigueAfterStage,f);f=reviewOfficialRaceNight(n).fatigue;recovery++
   }
   assert.equal(ready.condition.fatigueBeforeStage,f)
  }
 }
 for(const row of s.sportingRows){
  if(withdrawn.has(row.riderId))assert.equal(row.status,'dns')
  if(row.status!=='finished'){withdrawn.add(row.riderId);totals.delete(row.riderId)}
  else totals.set(row.riderId,(totals.get(row.riderId)??0)+row.sportingElapsedSeconds)
 }
 assert.equal(r.gc.length,totals.size)
 for(const g of r.gc)assert.equal(g.totalTimeSeconds,totals.get(g.riderId))
 for(const id of s.incidentIds){assert.ok(!seen.has(id));seen.add(id)}
 for(const row of r.resources)if(prev)assert.deepEqual(row.before,prev.receipt.resources.find(x=>x.after.resourceId===row.before.resourceId).after)
 for(const a of s.resourceEnergy.allocations){
  const l=r.resources.find(x=>x.before.resourceId===a.resourceId)
  assert.equal(l.after.quantity,l.before.quantity-a.usableQuantity);assert.equal(l.effect?.quantityUsed??0,a.usableQuantity)
 }
 for(const a of r.individualEquipmentWear.receipt.wearProtection.assets){
  const l=r.resources.filter(x=>x.before.resourceId===a.resourceId)
  assert.equal(l.length,1);assert.equal(l[0].effect?.stageUsesUsed??0,a.available?1:0)
 }
 for(const c of r.individualEquipmentWear.receipt.rows){
  assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,c.distanceKm/100*c.configuredWear*c.wearIntensity))<=.00000051)
  if(c.wearIntensity<1&&c.conditionUsed>0)protectedComponents++
 }
 const exposure=r.clothingExposure.receipt
 assert.equal(exposure.physicalClassificationSha256,s.physicalClassificationSha256)
 if(prev)assert.deepEqual(exposure.history.slice(0,prev.receipt.clothingExposure.receipt.history.length),prev.receipt.clothingExposure.receipt.history)
 assert.ok(exposure.candidates.every(c=>!c.caseCreationVerified&&!c.availabilityChanged))
}
assert.equal(recovery,528);assert.ok(protectedComponents>0)
for(const row of out.stages.at(-1).receipt.resources){
 const origin=out.stages[0].receipt.resources.find(x=>x.before.resourceId===row.before.resourceId).before
 const chain=out.stages.map(s=>s.receipt.resources.find(x=>x.before.resourceId===row.before.resourceId))
 if(origin.condition!==null)assert.ok(Math.abs(origin.condition-row.after.condition-chain.reduce((n,r)=>n+(r.effect?.conditionUsed??0),0))<.000001)
 if(origin.quantity!==null)assert.equal(origin.quantity-row.after.quantity,chain.reduce((n,r)=>n+(r.effect?.quantityUsed??0),0))
 if(origin.stageUsesRemaining!==null)assert.equal(origin.stageUsesRemaining-row.after.stageUsesRemaining,chain.reduce((n,r)=>n+(r.effect?.stageUsesUsed??0),0))
}
for(const s of out.stages.slice(3))for(const r of s.receipt.resources.filter(r=>r.before.resourceType==='asset'||r.before.quantity!==null))assert.deepEqual(r.before,r.after)
const exposureHistory=out.stages.at(-1).receipt.clothingExposure.receipt.history
assert.ok(exposureHistory.some(e=>e.date===weatherTour.stages[19].date))
assert.equal(new Set(exposureHistory.map(e=>e.stageId+':'+e.riderId)).size,exposureHistory.length)
console.log('PASS 043BA weather fatigue, 528 dated recoveries, GC and cumulative resource/exposure conservation; recovery='+recovery+' protectedComponents='+protectedComponents+' finalGC='+out.gc.length+' withdrawn='+withdrawn.size)
const replay=run(weatherTour)
assert.equal(replay.finalReceiptSha256,out.finalReceiptSha256)
assert.deepEqual(replay.stages.map(s=>s.observationSha256),out.stages.map(s=>s.observationSha256))
// Compare the already accepted opening seven stages with a standalone run.
// Schedule-bound receipt digests differ, but physical observations and all
// sporting, rider, resource and exposure outcomes must match exactly.
const prefix=run({...weatherTour,stages:weatherTour.stages.slice(0,7)})
for(const [i,stage] of prefix.stages.entries()){
 const full=out.stages[i]
 assert.deepEqual(full.physicalClassification,stage.physicalClassification)
 assert.deepEqual(full.sportingRows,stage.sportingRows)
 assert.deepEqual(full.receipt.riders,stage.receipt.riders)
 assert.deepEqual(full.receipt.resources,stage.receipt.resources)
 assert.deepEqual(full.receipt.gc,stage.receipt.gc)
 assert.deepEqual(full.receipt.clothingExposure,stage.receipt.clothingExposure)
 assert.equal(full.observationSha256,stage.observationSha256)
}
assert.equal(out.stages[6].receipt.gc.length,16)
console.log('PASS 043BA accepted seven-stage prefix invariance and repeated full-tour deterministic replay')
assert.throws(()=>reviewMultistagePhysicalTour({packet:weatherTour,expectedPacketSha256:'0'.repeat(64)}),/frozen tour packet/)
const bad={...weatherTour,stages:weatherTour.stages.map((s,i)=>i===0?{...s,physicalWeather:weather('clear',20,0,0)}:s)}
assert.throws(()=>run(bad),/physical and historical weather mismatch/)
for(const z of [out,...out.stages.map(s=>s.receipt)])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
console.log('PASS 043BA neutral-stage markers, mismatched weather and authority guards')
console.log('PASS 4/4 weather-enabled Grand Tour checks; no hosted connection')
