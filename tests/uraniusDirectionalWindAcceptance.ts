import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewPreparedNaturalTerrain} from '../scripts/uranius-prepared-natural-terrain-review'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {calculateDirectionalWindEffects} from '../src/race-engine/simulation/directionalWindEffects'
import {resolvePreparedPhysicalWeather,combinedPreparedWeatherFatigue} from '../scripts/uranius-prepared-physical-weather-review'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
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
const head=directed(0),tail=directed(180),cross=directed(90),left=directed(270),diagonal=directed(45)
const h=calculateWeatherPerformanceEffects(head),t=calculateWeatherPerformanceEffects(tail),c=calculateWeatherPerformanceEffects(cross)
assert.deepEqual([h.speedMultiplier,h.energyConsumptionMultiplier,h.incidentProbabilityMultiplier],[.925,1.15,1.375])
assert.deepEqual([t.speedMultiplier,t.energyConsumptionMultiplier,t.incidentProbabilityMultiplier],[1.05,.925,1])
assert.deepEqual([c.speedMultiplier,c.energyConsumptionMultiplier,c.incidentProbabilityMultiplier],[.9625,1.075,1.5])
assert.equal(h.directionalWind.headwindKmh,40);assert.equal(t.directionalWind.tailwindKmh,40)
assert.equal(c.directionalWind.lateralFromRightKmh,40);assert.equal(calculateDirectionalWindEffects(left).lateralFromRightKmh,-40)
assert.deepEqual(c.windContribution,calculateWeatherPerformanceEffects(left).windContribution)
assert.deepEqual(calculateDirectionalWindEffects(directed(10,350)).contribution,calculateDirectionalWindEffects(directed(20,0)).contribution)
const d=calculateDirectionalWindEffects(diagonal)
assert.ok(Math.abs(d.headwindKmh-Math.SQRT1_2*40)<1e-6&&Math.abs(d.crosswindKmh-Math.SQRT1_2*40)<1e-6)
assert.deepEqual(calculateWeatherPerformanceEffects(directed(0,0,0)).windContribution,calculateWeatherPerformanceEffects(weather('clear',20,0,0)).windContribution)
const {directionalWind:direction,...scalarHead}=h
assert.deepEqual(scalarHead,calculateWeatherPerformanceEffects(weather('clear',20,40,0)))
let coefficientCases=0
for(let bearing=0;bearing<360;bearing+=30)for(let from=0;from<360;from+=15)for(const speed of [0,15,25,50]){
 const e=calculateWeatherPerformanceEffects(directed(from,bearing,speed,'heavy_rain',45,15)),w=e.directionalWind
 assert.ok(Math.abs(Math.hypot(w.longitudinalFromKmh,w.lateralFromRightKmh)-speed)<.000002)
 assert.ok(e.speedMultiplier>=.75&&e.speedMultiplier<=1.07&&e.energyConsumptionMultiplier>=.895&&e.energyConsumptionMultiplier<=1.75)
 assert.ok(e.incidentProbabilityMultiplier>=1&&e.incidentProbabilityMultiplier<=4&&e.fatigueGainMultiplier>=1&&e.fatigueGainMultiplier<=2)
 coefficientCases++
}
console.log('PASS 043BB meteorological bearing projection, head/tail/cross/diagonal coefficients and nondirectional parity; coefficientCases='+coefficientCases)
const flat={...input,riders,seed:'043BB-flat-matched',distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}],settings:{...input.settings,minimumSpeedKmh:40,maximumSpeedKmh:60}}
const initial=createInitialState(flat),sup=Object.fromEntries(riders.map(r=>[r.riderId,.95]))
const neutralMovement=calculateMultiGroupMovement(initial)
const flatRuns=[]
let flatTicks=0,tailSavings=0
for(const w of [head,tail,cross]){
 const effects=calculateWeatherPerformanceEffects(w),ctx={...context,terrainType:'flat',weatherCondition:'clear',precipitationMm:0,rainProbabilityPct:0,weatherMultiplier:Math.min(2.5,effects.incidentProbabilityMultiplier),severeWeather:false,flatSprint:true}
 const resolved=resolvePreparedPhysicalWeather(flat,ctx,w)
 const state={...initial,input:{...initial.input,weather:w},weatherPerformanceEffectsEnabled:true}
 const movement=calculateMultiGroupMovement(state,undefined,false,true)
 assert.ok(Math.abs(movement.proposals[0].appliedSpeedKmh-Math.min(flat.settings.maximumSpeedKmh,neutralMovement.proposals[0].appliedSpeedKmh*effects.speedMultiplier))<1e-9)
 const finish=finishPhysicalIncidentStage(state,[],'peloton_main',1440,sup,undefined,false,resolved)
 assert.ok(finish.state.completed&&finish.classification.length===24)
 const p={provenance:P,groupGapSeconds:.001,timeLimitPercent:100,sprintZoneKm:0,flatFinish:true}
 const sporting=reviewSportingClassification({finish,policy:p,incidents:[],expectedPolicySha256:carryoverDigest(p),expectedIncidentsSha256:carryoverDigest([])})
 for(const tick of finish.ticks){
  assert.ok(tick.movement.proposals.every(m=>m.appliedSpeedKmh<=flat.settings.maximumSpeedKmh+1e-8))
  for(const a of tick.energy){
   const gross=a.result.grossEnergyCost*a.result.efficiencyMultiplier
   assert.equal(a.experimentalWeatherEnergyMultiplier,resolved.energyMultiplier)
   assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-gross*.95*resolved.energyMultiplier))<1e-9)
   assert.ok(Math.abs(a.energyCost-(a.previousEnergy-a.nextEnergy))<1e-9)
   if(resolved.energyMultiplier<1&&a.nextEnergy>Math.max(0,a.previousEnergy-gross*.95)+1e-9)tailSavings++
   flatTicks++
  }
 }
 for(const row of sporting.rows){
  assert.equal(row.status,'finished')
  assert.equal(row.energy.weatherEnergyMultiplier,resolved.energyMultiplier)
  const tick=finish.ticks.find(k=>k.crossings.some(x=>x.riderId===row.riderId)),crossing=tick.crossings.find(x=>x.riderId===row.riderId),a=tick.energy.find(x=>x.riderId===row.riderId)
  assert.ok(Math.abs(row.energy.partialTickEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*.95*resolved.energyMultiplier*crossing.crossingFraction))<1e-8)
 }
 flatRuns.push({finish,sporting})
 console.log('INFO 043BB flat windFrom='+w.directionalWind.windFromDegrees+' winner='+finish.classification[0].elapsedSeconds+' speedFactor='+effects.speedMultiplier+' energyFactor='+resolved.energyMultiplier)
}
assert.ok(flatRuns[1].finish.classification[0].elapsedSeconds<flatRuns[2].finish.classification[0].elapsedSeconds&&flatRuns[2].finish.classification[0].elapsedSeconds<flatRuns[0].finish.classification[0].elapsedSeconds)
assert.ok(tailSavings>0)
const capInput={...flat,settings:{...flat.settings,minimumSpeedKmh:40,maximumSpeedKmh:40}}
const capState=createInitialState({...capInput,weather:tail})
assert.equal(calculateMultiGroupMovement({...capState,weatherPerformanceEffectsEnabled:true},undefined,false,true).proposals[0].appliedSpeedKmh,40)
console.log('PASS 043BB matched flat physical finish, tailwind benefit and conserved fractional energy; flatTicks='+flatTicks+' tailSavingTicks='+tailSavings)
let naturalTicks=0,measuredCandidates=0
const mountainRuns=[]
for(const [name,w,terrain] of [['head',head,'mountain'],['tail',tail,'mountain'],['cross',cross,'hilly']]){
 const p=scenario(w,terrain),x=run(p),n=x.physical,e=n.physicalWeather
 assert.ok(n.finalState.completed&&n.classification.length===24)
 assert.equal(e.directionalWindApplied,true)
 for(const tick of n.ticks){
  assert.ok(tick.movement.movement.proposals.every(m=>m.appliedSpeedKmh<=p.input.settings.maximumSpeedKmh+1e-8))
  for(const a of tick.appliedEnergy.applications){
   const supply=n.preparation.supply.rows.find(s=>s.riderId===a.riderId)
   assert.equal(a.experimentalWeatherEnergyMultiplier,e.energyMultiplier)
   assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*supply.roadEnergyMultiplier*e.energyMultiplier))<1e-9)
   naturalTicks++
  }
 }
 for(const cp of n.selectedCheckpoints)for(const a of cp.evidence.candidates){
  assert.equal(a.probabilityInput.weatherMultiplier,e.historicalRiskMultiplier);measuredCandidates++
 }
 for(const row of x.receipt.riders){
  const supply=n.preparation.supply.rows.find(s=>s.riderId===row.riderId)
  assert.equal(row.workload.postStageFatigueMultiplier,combinedPreparedWeatherFatigue(supply.postStageFatigueMultiplier,e))
  assert.deepEqual(row.effect,originalPostStageFatigueReview(row.workload))
  const f=row.energyAudit.finishWitness
  if(f)assert.ok(Math.abs(row.energyAudit.correctedEnergy-Math.max(0,f.previousEnergy-f.neutralCost*f.multiplier*f.weatherMultiplier*f.crossingFraction))<1e-8)
 }
 for(const r of x.receipt.resources.filter(r=>r.before.resourceType==='asset'))assert.equal(r.effect?.stageUsesUsed??0,1)
 for(const r of x.receipt.resources.filter(r=>r.before.quantity!==null))assert.equal(r.effect.quantityUsed,8)
 mountainRuns.push({p,x})
 console.log('INFO 043BB '+name+' terrain='+terrain+' winner='+n.classification[0].elapsedSeconds+' incidents='+n.trace.incidents.length)
}
assert.ok(naturalTicks>0)
const scalar=run(scenario(weather('clear',20,40,0),'mountain'))
assert.deepEqual(scalar.physical.classification,mountainRuns[0].x.physical.classification)
assert.equal(scalar.physical.observationsSha256,mountainRuns[0].x.physical.observationsSha256)
console.log('PASS 043BB prepared hilly/mountain directional motion, workload, risk and stock accounting; naturalTicks='+naturalTicks+' candidates='+measuredCandidates)
const replay=run(mountainRuns[1].p)
assert.equal(replay.receiptSha256,mountainRuns[1].x.receiptSha256)
assert.equal(replay.physical.observationsSha256,mountainRuns[1].x.physical.observationsSha256)
assert.throws(()=>calculateDirectionalWindEffects(directed(360)),/invalid synthetic directional/)
assert.throws(()=>calculateDirectionalWindEffects(directed(0,0,51)),/invalid synthetic directional/)
assert.throws(()=>calculateDirectionalWindEffects({...tail,source:'production'}),/invalid synthetic directional/)
const bad=scenario(tail)
assert.throws(()=>run({...bad,context:{...bad.context,weatherMultiplier:2}}),/historical weather factor/)
for(const {x} of mountainRuns)for(const z of [x,x.receipt,x.physical])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
console.log('PASS 043BB deterministic directional replay, invalid bearing/risk and authority guards')
console.log('PASS 4/4 directional wind checks; no hosted connection')
