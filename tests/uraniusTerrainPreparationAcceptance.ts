import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewTerrainPreparation} from '../scripts/uranius-terrain-preparation-review'
import {historicalRoadSkillScore} from '../scripts/uranius-equipment-performance-review'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {calculatePelotonBasePace} from '../src/race-engine/simulation/pelotonPace'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
import {calculateRiderTerrainCapability} from '../src/race-engine/simulation/riderTerrainCapability'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {reviewHistoricalIncidentProbability} from '../scripts/uranius-historical-incident-probability-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}

const riders=roster.map((r,i)=>({...r,attributes:{...r.attributes,flat:i<12?45:90,climbing:i<12?90:45}}))
const flat={...input,riders,distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:100},{kilometre:20,elevationMetres:100}]}
const hilly={...flat,profilePoints:[100,220,100,220,100,100].map((elevationMetres,i)=>({kilometre:i*4,elevationMetres}))}
const mountain={...flat,profilePoints:[100,500,100,500,100].map((elevationMetres,i)=>({kilometre:i*5,elevationMetres}))}
const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:flat}),state=createInitialState(bound.input)
const a=riders[0].attributes,b=riders[12].attributes
assert.equal(historicalRoadSkillScore(a,'flat'),a.sprint*.3+a.flat*.25+a.stamina*.2+a.resistance*.1+a.raceIq*.1+a.teamwork*.05)
assert.equal(historicalRoadSkillScore(a,'hilly'),a.sprint*.1+a.climbing*.25+a.flat*.2+a.stamina*.2+a.resistance*.15+a.raceIq*.1)
assert.equal(historicalRoadSkillScore(a,'mountain'),a.climbing*.45+a.stamina*.2+a.recovery*.15+a.resistance*.1+a.raceIq*.1)
assert.equal(historicalRoadSkillScore(a,'cobbled'),a.sprint*.1+a.flat*.3+a.stamina*.2+a.resistance*.25+a.raceIq*.15)
assert.ok(historicalRoadSkillScore(a,'mountain')>historicalRoadSkillScore(b,'mountain'))
assert.ok(historicalRoadSkillScore(b,'cobbled')>historicalRoadSkillScore(a,'cobbled'))
assert.equal(calculateStageProfileCategory(hilly).category,'hilly');assert.equal(calculateStageProfileCategory(mountain).category,'mountain')
const pace=(team,gradient)=>calculatePelotonBasePace({riders:Object.values(state.riders).filter(r=>r.teamId===team),minimumSpeedKmh:24,maximumSpeedKmh:72,experimentalTerrainGradientPercent:gradient})
assert.ok(pace(teams[0],8).baseSpeedKmh>pace(teams[1],8).baseSpeedKmh)
assert.ok(pace(teams[0],-8).baseSpeedKmh<pace(teams[1],-8).baseSpeedKmh)
for(const g of [-8,-.001,0,.001,8]){
 const p=pace(teams[0],g)
 for(const c of p.riderContributions){
  const r=state.riders[c.riderId],expected=calculateRiderTerrainCapability({riderId:r.riderId,attributes:r.attributes,currentEnergy:r.energy,gradientPercent:g})
  assert.equal(c.experimentalTerrainRawCapabilityScore,expected.rawCapabilityScore)
  assert.equal(c.capabilityScore,expected.capabilityScore)
 }
}
assert.ok(Math.abs(pace(teams[0],-.001).baseSpeedKmh-pace(teams[0],.001).baseSpeedKmh)<.01)
console.log('PASS 043AR four original road suitability matrices and local gradient-dependent rider capability')
const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=riders.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?74:100,lastUsedDate:null})))
const stock={resourceType:'supply',resourceId:'nutrition',teamId:teams[0],quantity:24,stageUsesRemaining:null,maxStageUses:null,condition:null,lastUsedDate:null}
const resources=[...components,stock]
const requests=[...components.map(r=>({resourceType:r.resourceType,resourceId:r.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),{resourceType:'supply',resourceId:'nutrition',selectedQuantity:24,selectedStageUses:0,conditionLossPerRaceDay:0}]
const mechanicalEvidence={provenance:P,stageId,date:source.date,resources,requests,setups,supports:[]}
const energyEvidence={provenance:P,stageId,resources,requests,mode:'archived_consumable_fallback_v1',supplies:[{resourceId:'nutrition',teamId:teams[0],supplyKey:'nutrition_packs'}]}
const packetFor=(input,terrainProfile,pct)=>({provenance:P,source,input,terrainProfile,mechanicalEvidence,performanceRows:riders.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentStagePerformancePct:pct})),energyEvidence,weatherMultiplier:1})
const run=p=>reviewTerrainPreparation({packet:p,expectedPacketSha256:carryoverDigest(p)})
const results=[]
for(const [profile,route] of [['hilly',hilly],['mountain',mountain]] as const){
 const neutral=run(packetFor(route,profile,0)),positive=run(packetFor(route,profile,10)),negative=run(packetFor(route,profile,-10))
 const secs=x=>x.finish.classification[0].elapsedSeconds
 assert.ok(secs(positive)<secs(neutral)&&secs(neutral)<secs(negative))
 for(const x of [neutral,positive,negative]){
  assert.ok(x.finish.state.completed&&x.finish.classification.length===24)
  assert.ok(x.observations.some(o=>o.gradientPercent>0)&&x.observations.some(o=>o.gradientPercent<0))
  assert.equal(x.observationsSha256,carryoverDigest(x.observations))
  for(const o of x.observations){
   assert.ok(o.speedKmh>0&&o.speedKmh<=72)
   assert.ok(o.gradientPercent>0?o.terrainMultiplier<1:o.gradientPercent<0?o.terrainMultiplier>1:o.terrainMultiplier===1)
   assert.equal(o.risk.descentMultiplier,o.gradientPercent<0?Math.round((1+Math.abs(o.gradientPercent)*.12)*1e6)/1e6:1)
   assert.equal(o.risk.equipmentConditionMultiplier,1.15)
   assert.deepEqual(o.risk,reviewHistoricalIncidentProbability(o.riskInput))
  }
  for(const t of x.finish.ticks)for(const e of t.energy){
   const m=x.energy.rows.find(r=>r.riderId===e.riderId).roadEnergyMultiplier
   assert.ok(Math.abs(e.nextEnergy-Math.max(0,e.previousEnergy-e.result.grossEnergyCost*e.result.efficiencyMultiplier*m))<1e-9)
   assert.equal(e.preparationEnergyMultiplier,m)
  }
  assert.ok(x.finish.ticks.some(t=>t.energy.some(e=>e.result.uphillCost>0)))
  assert.ok(x.finish.ticks.some(t=>t.energy.some(e=>e.result.downhillRelief>0)))
  assert.ok(x.wear.receipt.rows.every(c=>c.distanceKm===20&&Math.abs(c.conditionUsed-.07)<1e-9))
  assert.deepEqual(x.finish.state.input.riders.map(r=>r.attributes),riders.map(r=>r.attributes))
 }
 results.push(positive)
 console.log('INFO 043AR '+profile+' finishSeconds negative/neutral/positive='+secs(negative)+'/'+secs(neutral)+'/'+secs(positive))
}
console.log('PASS 043AR actual hilly and mountain physical completions, mixed gradients, nutrition, wear and measured descent risk')
const cobbled=run(packetFor(flat,'cobbled',10))
assert.equal(cobbled.localTerrainCapability,false);assert.equal(cobbled.surfacePhysicsVerified,false)
assert.ok(cobbled.equipment.rows.every(r=>r.stageSkillScore===historicalRoadSkillScore(riders.find(x=>x.riderId===r.riderId).attributes,'cobbled')))
const neutralFlat=run(packetFor(flat,'flat',0))
const target=Object.values(state.groups).find(g=>g.active).groupId
const m=Object.fromEntries(neutralFlat.energy.rows.map(r=>[r.riderId,r.roadEnergyMultiplier]))
assert.deepEqual(neutralFlat.finish,finishPhysicalIncidentStage(state,[],target,1440,m))
assert.deepEqual(calculateMultiGroupMovement(state),calculateMultiGroupMovement(state,undefined,false))
console.log('PASS 043AR cobbled stage suitability only, exact default flat physical parity and no surface claims')
assert.deepEqual(run(packetFor(mountain,'mountain',10)),results[1])
assert.throws(()=>run(packetFor(mountain,'flat',10)),/terrain suitability profile mismatch/)
assert.throws(()=>run(packetFor(flat,'time_trial',10)),/controlled road terrain scope/)
assert.throws(()=>reviewTerrainPreparation({packet:packetFor(mountain,'mountain',10),expectedPacketSha256:'0'.repeat(64)}),/frozen terrain packet/)
for(const x of [...results,cobbled,neutralFlat])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','surfacePhysicsVerified','automaticIncidentSelectionVerified'])assert.equal(x[k],false)
console.log('PASS 043AR deterministic replay, terrain mismatch, unsupported format and authority guards')
console.log('PASS 4/4 terrain preparation checks; no hosted connection')
