import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewPreparedNaturalTerrain} from '../scripts/uranius-prepared-natural-terrain-review'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {calculateDirectionalWindEffects,validateCourseBearingSegments,weatherAtCourseKm} from '../src/race-engine/simulation/directionalWindEffects'
import {resolvePreparedPhysicalWeather,combinedPreparedWeatherFatigue} from '../scripts/uranius-prepared-physical-weather-review'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {startMultiRiderIncident,multiRiderIncidentTick} from '../scripts/uranius-multi-rider-incident-motion-review'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
import {reviewSportingClassification} from '../scripts/uranius-sporting-classification-review'
import {originalPostStageFatigueReview} from '../scripts/uranius-original-engine-effects-review.mjs'
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

const weather=(condition,temperature,wind,mm)=>({authority:'stage_weather_snapshot',source:P,condition,summary:null,averageTemperatureC:temperature,minimumTemperatureC:temperature,maximumTemperatureC:temperature,windSpeedKmh:wind,precipitationMm:mm,hostCity:null,countryCode:null})

const hillyPoints=[100,220,100,220,100,100].map((elevationMetres,i)=>({kilometre:i*4,elevationMetres}))
const scenario=(w,terrain='mountain')=>{
 const effect=calculateWeatherPerformanceEffects(w)
 const ctx={...context,terrainType:terrain,weatherCondition:w.condition,precipitationMm:w.precipitationMm,rainProbabilityPct:w.precipitationMm?90:0,weatherMultiplier:Math.min(2.5,effect.incidentProbabilityMultiplier),severeWeather:w.condition==='heavy_rain'}
 return {...packet,input:terrain==='mountain'?{...mountain,seed:'043AY-prepared-weather'}:{...mountain,seed:'043AY-prepared-weather-hilly',distanceKm:20,profilePoints:hillyPoints},context:ctx,physicalWeather:w,preparation:{...packet.preparation,performance:{...performance,terrainProfile:terrain},clothing:{...clothing,weather:{temperatureC:w.averageTemperatureC,rainChancePct:ctx.rainProbabilityPct,precipitationMm:ctx.precipitationMm,condition:ctx.weatherCondition}}}}
}

const directed=(from,bearing=0,wind=40,condition='clear',temperature=20,mm=0)=>({...weather(condition,temperature,wind,mm),directionalWind:{scope:'synthetic_constant_bearing',courseBearingDegrees:bearing,windFromDegrees:from}})

const segments=(bounds,bearings)=>bearings.map((courseBearingDegrees,i)=>({fromKm:bounds[i],toKm:bounds[i+1],courseBearingDegrees}))
const course=(bounds,bearings,condition='clear',temperature=20,mm=0)=>({...directed(0,bearings[0],40,condition,temperature,mm),courseBearingSegments:segments(bounds,bearings)})
const flat={...input,riders,seed:'043BC-flat-local-wind',distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}],settings:{...input.settings,minimumSpeedKmh:40,maximumSpeedKmh:60}}
const w=course([0,5,10,15,20],[0,90,180,270])
const local=(weather,km)=>calculateWeatherPerformanceEffects(weather,km)
const risk=(weather)=>Math.min(2.5,Math.max(...weather.courseBearingSegments.map(s=>local(weather,s.fromKm).incidentProbabilityMultiplier)))
const ctx=(weather,terrain='flat')=>({...context,terrainType:terrain,weatherCondition:weather.condition,precipitationMm:weather.precipitationMm,rainProbabilityPct:weather.precipitationMm?90:0,weatherMultiplier:weather.courseBearingSegments?risk(weather):Math.min(2.5,calculateWeatherPerformanceEffects(weather).incidentProbabilityMultiplier),severeWeather:weather.condition==='heavy_rain',flatSprint:terrain==='flat'})
validateStageInput({...flat,weather:w})
assert.deepEqual([0,4.999999,5,9.999999,10,15,20].map(k=>weatherAtCourseKm(w,k).directionalWind.courseBearingDegrees),[0,0,90,90,180,270,270])
assert.deepEqual([0,5,10,15].map(k=>local(w,k).speedMultiplier),[.925,.9625,1.05,.9625])
assert.deepEqual([0,5,10,15].map(k=>local(w,k).energyConsumptionMultiplier),[1.15,1.075,.925,1.075])
assert.equal(risk(w),1.5)
for(const bad of [
 {...w,courseBearingSegments:[]},
 {...w,courseBearingSegments:[{...w.courseBearingSegments[0],fromKm:.01},...w.courseBearingSegments.slice(1)]},
 {...w,courseBearingSegments:[{...w.courseBearingSegments[0],toKm:5.01},...w.courseBearingSegments.slice(1)]},
 {...w,courseBearingSegments:w.courseBearingSegments.slice(0,3)},
 {...w,courseBearingSegments:[{...w.courseBearingSegments[0],courseBearingDegrees:360},...w.courseBearingSegments.slice(1)]},
 {...w,courseBearingSegments:[{...w.courseBearingSegments[0],courseBearingDegrees:180},...w.courseBearingSegments.slice(1)]},
 {...w,directionalWind:undefined}
])assert.throws(()=>validateStageInput({...flat,weather:bad}),/course bearing coverage/)
assert.throws(()=>weatherAtCourseKm(w,20.000001),/invalid local course distance/)
assert.throws(()=>resolvePreparedPhysicalWeather(flat,{...ctx(w),weatherMultiplier:1.375},w),/historical weather factor/)
const neutralOpening=course([0,10,20],[45,180])
const zeroWind={...neutralOpening,windSpeedKmh:0}
assert.equal(resolvePreparedPhysicalWeather(flat,ctx(zeroWind),zeroWind).neutral,true)
console.log('PASS 043BC exact distance boundaries, course coverage, canonical vector factors and weather-risk envelope')
const initial=createInitialState(flat),sup=Object.fromEntries(riders.map(r=>[r.riderId,.95]))
const makeState=weather=>({...initial,input:{...initial.input,weather},weatherPerformanceEffectsEnabled:true})
const finishRun=weather=>finishPhysicalIncidentStage(makeState(weather),[],'peloton_main',1440,sup,undefined,false,resolvePreparedPhysicalWeather(flat,ctx(weather),weather))
const finish=finishRun(w),policy={provenance:P,groupGapSeconds:.001,timeLimitPercent:100,sprintZoneKm:0,flatFinish:true}
const sporting=reviewSportingClassification({finish,policy,incidents:[],expectedPolicySha256:carryoverDigest(policy),expectedIncidentsSha256:carryoverDigest([])})
assert.ok(finish.state.completed&&finish.classification.length===24)
let flatTicks=0,tailTicks=0
const usedBearings=new Set()
for(const tick of finish.ticks){
 for(const m of tick.movement.proposals){
  const effects=local(w,m.previousDistanceKm)
  usedBearings.add(effects.directionalWind.courseBearingDegrees)
  assert.ok(Math.abs(m.appliedSpeedKmh-Math.min(flat.settings.maximumSpeedKmh,m.baseSpeedKmh*effects.speedMultiplier))<1e-8)
 }
 for(const a of tick.energy){
  const m=tick.movement.proposals.find(m=>m.groupId===a.groupId),e=local(w,m.previousDistanceKm)
  assert.equal(a.experimentalWeatherStartKm,m.previousDistanceKm)
  assert.equal(a.experimentalWeatherEnergyMultiplier,e.energyConsumptionMultiplier)
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*.95*e.energyConsumptionMultiplier))<1e-9)
  assert.ok(Math.abs(a.energyCost-(a.previousEnergy-a.nextEnergy))<1e-9)
  if(e.energyConsumptionMultiplier<1)tailTicks++
  flatTicks++
 }
}
assert.deepEqual([...usedBearings].sort((a,b)=>a-b),[0,90,180,270]);assert.ok(tailTicks>0)
for(const row of sporting.rows){
 const tick=finish.ticks.find(k=>k.crossings.some(x=>x.riderId===row.riderId)),crossing=tick.crossings.find(x=>x.riderId===row.riderId),a=tick.energy.find(x=>x.riderId===row.riderId)
 assert.equal(row.status,'finished')
 assert.equal(row.energy.weatherEnergyMultiplier,local(w,a.experimentalWeatherStartKm).energyConsumptionMultiplier)
 assert.ok(Math.abs(row.energy.partialTickEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*.95*a.experimentalWeatherEnergyMultiplier*crossing.crossingFraction))<1e-8)
}
const constant=directed(0),one=course([0,20],[0]),oneFinish=finishRun(one),constantFinish=finishRun(constant)
assert.deepEqual(oneFinish.classification,constantFinish.classification)
assert.deepEqual(oneFinish.ticks.map(t=>t.movement),constantFinish.ticks.map(t=>t.movement))
assert.deepEqual(Object.values(oneFinish.state.riders).map(r=>r.energy),Object.values(constantFinish.state.riders).map(r=>r.energy))
console.log('PASS 043BC complete turning flat course, local energy and fractional finish, constant-bearing parity; flatTicks='+flatTicks+' tailTicks='+tailTicks+' winner='+finish.classification[0].elapsedSeconds)
// Controlled independent groups: stationary repair remains in the headwind
// section while the peloton crosses into lateral wind. No artificial split
// caused by crosswind is claimed.
const splitWeather=course([0,.4,5,10,15,20],[0,90,180,270,0])
const resolved=resolvePreparedPhysicalWeather(flat,ctx(splitWeather),splitWeather)
const started=startMultiRiderIncident(makeState(splitWeather),[{riderId:riders[0].riderId,helper:null,statusImpact:'finished',repairSeconds:120,energyLossPoints:2}])
let state=started.state,episodes=started.episodes,simultaneous=0
for(let i=0;i<6;i++){
 const tick=multiRiderIncidentTick(state,episodes,started.targetId,sup,undefined,false,resolved)
 const distinct=new Set(tick.energy.map(a=>a.experimentalWeatherEnergyMultiplier))
 if(distinct.size>1)simultaneous++
 if(i<4)assert.equal(tick.movement.proposals.find(p=>p.groupId===episodes[0].groupId).distanceAdvancedKm,0)
 for(const a of tick.energy){
  const m=tick.movement.proposals.find(p=>p.groupId===a.groupId)
  assert.equal(a.experimentalWeatherStartKm,m.previousDistanceKm)
  assert.equal(a.experimentalWeatherEnergyMultiplier,local(splitWeather,m.previousDistanceKm).energyConsumptionMultiplier)
 }
 state=tick.state;episodes=tick.episodes
}
assert.ok(simultaneous>0,'different groups must experience different local factors within the same tick')
const terminal=finishPhysicalIncidentStage(state,episodes,started.targetId,1440,sup,undefined,false,resolved)
assert.ok(terminal.state.completed&&terminal.classification.length===24)
for(const tick of terminal.ticks)for(const a of tick.energy)assert.equal(a.experimentalWeatherEnergyMultiplier,local(splitWeather,a.experimentalWeatherStartKm).energyConsumptionMultiplier)
console.log('PASS 043BC simultaneous different group wind conditions, stationary repair and local terminal continuation; simultaneousTicks='+simultaneous)
const mountainWeather=course([0,4,14,24,40,60,80,100,120],[0,90,180,270,0,180,90,180],'heavy_rain',5,15)
const scenarioBase=scenario(mountainWeather,'mountain')
const p={...scenarioBase,input:{...route,seed:'043AU-natural-history-0'},context:ctx(mountainWeather,'mountain')}
const x=run(p),n=x.physical
assert.ok(n.finalState.completed&&n.classification.length===24)
let naturalTicks=0,candidates=0,drops=0
const factors=new Set()
for(const tick of n.ticks){
 for(const a of tick.appliedEnergy.applications){
  const movement=tick.movement.movement.proposals.find(m=>m.groupId===a.groupId)
  const localEffect=local(mountainWeather,movement.previousDistanceKm)
  const supply=n.preparation.supply.rows.find(s=>s.riderId===a.riderId)
  assert.equal(a.experimentalWeatherStartKm,movement.previousDistanceKm)
  assert.equal(a.experimentalWeatherEnergyMultiplier,localEffect.energyConsumptionMultiplier)
  assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*supply.roadEnergyMultiplier*localEffect.energyConsumptionMultiplier))<1e-9)
  factors.add(a.experimentalWeatherEnergyMultiplier);naturalTicks++
 }
 drops+=tick.transitions.reduce((sum,t)=>sum+t.movedRiderIds.length,0)
}
for(const cp of n.selectedCheckpoints){
 const obs=n.observations.find(o=>o.raceSecond===cp.evidence.raceSecond)
 assert.ok(obs)
 for(const c of cp.evidence.candidates){
  const g=obs.measuredGroups.find(g=>g.displayCode===c.displayCode)
  assert.ok(g);assert.equal(c.probabilityInput.weatherMultiplier,Math.min(2.5,local(mountainWeather,g.distanceKm).incidentProbabilityMultiplier))
  candidates++
 }
}
assert.ok(naturalTicks>0&&candidates>0&&drops>0&&factors.size>=3)
for(const row of x.receipt.riders){
 const s=n.preparation.supply.rows.find(a=>a.riderId===row.riderId),f=row.energyAudit.finishWitness
 assert.equal(row.workload.postStageFatigueMultiplier,combinedPreparedWeatherFatigue(s.postStageFatigueMultiplier,n.physicalWeather))
 assert.deepEqual(row.effect,originalPostStageFatigueReview(row.workload))
 if(f){
  assert.equal(f.weatherMultiplier,local(mountainWeather,f.weatherStartKm).energyConsumptionMultiplier)
  assert.ok(Math.abs(row.energyAudit.correctedEnergy-Math.max(0,f.previousEnergy-f.neutralCost*f.multiplier*f.weatherMultiplier*f.crossingFraction))<1e-8)
 }
}
const replay=run(p)
assert.equal(replay.receiptSha256,x.receiptSha256);assert.equal(replay.physical.observationsSha256,n.observationsSha256)
assert.throws(()=>reviewPreparedNaturalTerrain({packet:p,expectedPacketSha256:'0'.repeat(64)}),/frozen prepared/)
for(const z of [x,x.receipt,n])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
console.log('PASS 043BC natural terrain local wind, measured incident risk, finishing workload and deterministic replay; naturalTicks='+naturalTicks+' localFactors='+factors.size+' candidates='+candidates+' naturalDrops='+drops)
console.log('PASS 4/4 changing course bearing checks; no hosted connection')
