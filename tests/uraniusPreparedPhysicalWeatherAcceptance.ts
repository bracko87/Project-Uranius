import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewPreparedNaturalTerrain} from '../scripts/uranius-prepared-natural-terrain-review'
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {resolvePreparedPhysicalWeather,applyPreparedWeatherEnergy,combinedPreparedWeatherFatigue} from '../scripts/uranius-prepared-physical-weather-review'
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
const cases=[['dry',weather('clear',20,0,0)],['rain',weather('rain',20,0,3)],['severe',weather('heavy_rain',5,35,15)],['heat',weather('clear',40,0,0)]]
const hillyPoints=[100,220,100,220,100,100].map((elevationMetres,i)=>({kilometre:i*4,elevationMetres}))
const scenario=(w,terrain='mountain')=>{
 const effect=calculateWeatherPerformanceEffects(w)
 const ctx={...context,terrainType:terrain,weatherCondition:w.condition,precipitationMm:w.precipitationMm,rainProbabilityPct:w.precipitationMm?90:0,weatherMultiplier:Math.min(2.5,effect.incidentProbabilityMultiplier),severeWeather:w.condition==='heavy_rain'}
 return {...packet,input:terrain==='mountain'?{...mountain,seed:'043AY-prepared-weather'}:{...mountain,seed:'043AY-prepared-weather-hilly',distanceKm:20,profilePoints:hillyPoints},context:ctx,physicalWeather:w,preparation:{...packet.preparation,performance:{...performance,terrainProfile:terrain},clothing:{...clothing,weather:{temperatureC:w.averageTemperatureC,rainChancePct:ctx.rainProbabilityPct,precipitationMm:ctx.precipitationMm,condition:ctx.weatherCondition}}}}
}
const dry=scenario(cases[0][1]),neutral=run(dry)
const {physicalWeather:ignored,...old}=dry,legacy=run(old)
assert.deepEqual(neutral.physical.classification,legacy.physical.classification)
assert.equal(neutral.physical.observationsSha256,legacy.physical.observationsSha256)
assert.deepEqual(neutral.receipt.resources,legacy.receipt.resources)
assert.equal(neutral.physical.physicalWeather.neutral,true)
const rain=calculateWeatherPerformanceEffects(cases[1][1])
assert.equal(rain.speedMultiplier,.97);assert.equal(rain.energyConsumptionMultiplier,1.05);assert.equal(rain.incidentProbabilityMultiplier,1.25)
const severe=calculateWeatherPerformanceEffects(cases[2][1])
assert.ok(severe.speedMultiplier<rain.speedMultiplier&&severe.energyConsumptionMultiplier>rain.energyConsumptionMultiplier)
const heat=calculateWeatherPerformanceEffects(cases[3][1])
assert.equal(heat.speedMultiplier,.98);assert.equal(heat.energyConsumptionMultiplier,1.2);assert.equal(heat.fatigueGainMultiplier,1.3)
console.log('PASS 043AY canonical rain, strong-wind, cold and heat coefficients, exact dry physical parity')
let ticks=0,weatherFatigue=0,saved=0,cap=0,measuredCandidates=0,descents=0
const results=[]
for(const [name,w] of cases.slice(1)){
 const candidate=scenario(w,name==='heat'?'hilly':'mountain')
 const p=name==='severe'?{...candidate,input:{...route,seed:'043AU-natural-history-0'}}:candidate
 const x=run(p),physical=x.physical,e=physical.physicalWeather
 assert.ok(physical.finalState.completed&&physical.classification.length===24)
 assert.equal(e.historicalRiskMultiplier,p.context.weatherMultiplier)
 const first=physical.ticks[0].movement
 assert.ok(Math.abs(first.movement.proposals[0].appliedSpeedKmh-first.groupDiagnostics[0].pace.appliedSpeedKmh*e.effects.speedMultiplier)<1e-6)
 for(const t of physical.ticks){
  for(const a of t.appliedEnergy.applications){
   const supply=physical.preparation.supply.rows.find(r=>r.riderId===a.riderId).roadEnergyMultiplier
   const cost=a.result.grossEnergyCost*a.result.efficiencyMultiplier*e.energyMultiplier*supply
   assert.ok(Math.abs(a.nextEnergy-Math.max(0,a.previousEnergy-cost))<1e-9)
   assert.ok(Math.abs(a.energyCost-(a.previousEnergy-a.nextEnergy))<1e-9)
   assert.equal(a.preparationEnergyMultiplier,supply)
   assert.equal(a.experimentalWeatherEnergyMultiplier,e.energyMultiplier)
   if(a.runtimeFatigueGain>0)weatherFatigue++
   if(cost>a.previousEnergy)cap++
   if(supply<1&&a.nextEnergy>Math.max(0,a.previousEnergy-a.result.grossEnergyCost*a.result.efficiencyMultiplier*e.energyMultiplier)+1e-9)saved++
   ticks++
  }
  for(const m of t.movement.movement.proposals)if(m.gradientPercent<0)descents++
 }
 for(const cp of physical.selectedCheckpoints)for(const c of cp.evidence.candidates){
  assert.equal(c.probabilityInput.weatherMultiplier,e.historicalRiskMultiplier);measuredCandidates++
 }
 for(const r of x.receipt.riders){
  const s=physical.preparation.supply.rows.find(a=>a.riderId===r.riderId)
  assert.equal(r.workload.postStageFatigueMultiplier,combinedPreparedWeatherFatigue(s.postStageFatigueMultiplier,e))
  assert.deepEqual(r.effect,originalPostStageFatigueReview(r.workload))
  assert.equal(r.workload.incidentEnergyLoss,0)
  const f=r.energyAudit.finishWitness
  if(f)assert.ok(Math.abs(r.energyAudit.correctedEnergy-Math.max(0,f.previousEnergy-f.neutralCost*f.multiplier*f.weatherMultiplier*f.crossingFraction))<1e-9)
 }
 for(const r of x.receipt.resources.filter(r=>r.before.resourceType==='asset'))assert.equal(r.effect?.stageUsesUsed??0,1)
 for(const r of x.receipt.resources.filter(r=>r.before.quantity!==null))assert.equal(r.effect.quantityUsed,8)
 assert.equal(x.receipt.physicalWeatherApplied,true)
 assert.equal(x.receipt.physicalWeather.directionalWindVerified,false)
 console.log('INFO 043AY '+name+' speedFactor='+e.effects.speedMultiplier+' energyFactor='+e.energyMultiplier+' fatigueFactor='+e.effects.fatigueGainMultiplier+' incidents='+physical.trace.incidents.length+' finishers='+physical.classification.filter(r=>r.status==='finished').length)
 results.push({p,x})
}
assert.ok(ticks>0&&weatherFatigue>0&&saved>0&&descents>0)
// Controlled exhaustion boundary from a real weather tick: the combined
// cost must be capped after multiplying the uncapped gross, not before.
const t=results[0].x.physical.ticks[0].appliedEnergy,a=t.applications[0]
const small=Math.min(.000001,a.result.grossEnergyCost*a.result.efficiencyMultiplier/10)
assert.ok(small>0)
const boundary={...t,applications:[{...a,previousEnergy:small,nextEnergy:0}],state:{...t.state,riders:{...t.state.riders,[a.riderId]:{...t.state.riders[a.riderId],energy:0}}}}
const checked=applyPreparedWeatherEnergy(boundary,{[a.riderId]:.9},results[0].x.physical.physicalWeather)
assert.equal(checked.applications[0].nextEnergy,0);assert.equal(checked.applications[0].energyCost,small)
console.log('PASS 043AY actual prepared weather motion, capped energy and nutrition; ticks='+ticks+' savedTicks='+saved+' capTicks='+cap+' weatherFatigueTicks='+weatherFatigue+' descentProposals='+descents)
assert.ok(measuredCandidates>0,'actual selected historical checkpoints required')
console.log('PASS 043AY one historical weather risk factor, fractional finish workload, fatigue and single resource accounting; measuredCandidates='+measuredCandidates)
const replay=run(results[1].p)
assert.equal(replay.receiptSha256,results[1].x.receiptSha256)
assert.equal(replay.physical.observationsSha256,results[1].x.physical.observationsSha256)
assert.throws(()=>run({...dry,context:{...dry.context,weatherMultiplier:2}}),/historical weather factor/)
assert.throws(()=>run({...dry,physicalWeather:{...dry.physicalWeather,averageTemperatureC:21}}),/temperature mismatch/)
assert.throws(()=>resolvePreparedPhysicalWeather(dry.input,dry.context,{...dry.physicalWeather,windSpeedKmh:51}),/bounded explicit/)
assert.throws(()=>reviewPreparedNaturalTerrain({packet:dry,expectedPacketSha256:'0'.repeat(64)}),/frozen prepared/)
for(const {x} of results)for(const z of [x,x.receipt,x.physical])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
console.log('PASS 043AY deterministic replay, inconsistent weather evidence and authority guards')
console.log('PASS 4/4 prepared physical weather checks; no hosted connection')
