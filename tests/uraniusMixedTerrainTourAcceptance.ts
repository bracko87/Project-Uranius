import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {reviewOfficialRaceNight} from '../scripts/uranius-original-fatigue-review.mjs'
import {calculateStageProfileCategory} from '../src/race-engine/simulation/stageProfileCategory'
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
const terrain=['flat','mountain','hilly','flat','mountain','hilly','flat']
const mixed={...combined,mixedTerrain:true,stages:combined.stages.slice(0,7).map((s,i)=>{
 const type=terrain[i],nonflat=type!=='flat',points=type==='mountain'?mountainPoints:hillyPoints
 return {...s,input:nonflat?{...s.input,stageName:'043AW '+type+' '+(i+1),distanceKm:points.at(-1).kilometre,profilePoints:points}:s.input,
 context:{...s.context,terrainType:type,flatSprint:!nonflat},
 policy:{...s.policy,flatFinish:!nonflat}}
})}
for(const [i,s] of mixed.stages.entries())assert.equal(calculateStageProfileCategory(s.input).category,terrain[i])
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const start=performance.now(),out=run(mixed)
assert.equal(out.mixedTerrain,true)
assert.equal(out.stages.length,7);assert.ok(out.stages.every(s=>s.physicalCompleted))
assert.deepEqual(out.stages.map(s=>s.terrainType),terrain)
assert.deepEqual(out.stages.map(s=>s.physicalRunner),terrain.map(t=>t==='flat'?'accepted_flat':'calibrated_historical_natural'))
assert.ok(out.gc.length>0)
assert.equal(out.finalReceiptSha256,out.stages.at(-1).receiptSha256)
let naturalDrops=0,contacts=0
for(const s of out.stages){
 if(s.terrainType!=='flat'){
  naturalDrops+=s.naturalTransitions.reduce((n,t)=>n+t.movedRiderIds.length,0)
  contacts+=s.contacts.length
  assert.ok(s.contacts.every(c=>Math.abs(c.distanceKm-c.targetDistanceKm)<1e-8))
 }
 assert.equal(s.physicalClassificationSha256,carryoverDigest(s.physicalClassification))
 console.log('INFO 043AW stage='+s.stageNumber+' terrain='+s.terrainType+' starters='+s.initialRiders.length+' GC='+s.receipt.gc.length+' incidents='+s.incidentIds.length)
}
assert.ok(naturalDrops>0,'mixed tour must witness genuine natural separation')
console.log('PASS 043AW seven physical mixed stages and actual natural separation; km='+mixed.stages.reduce((n,s)=>n+s.input.distanceKm,0)+' naturalDrops='+naturalDrops+' contacts='+contacts+' finalGC='+out.gc.length+' elapsedMs='+Math.round(performance.now()-start))
const withdrawn=new Set(),incidents=new Set(),totals=new Map()
let recoveryNights=0,savedTicks=0
for(const [i,s] of out.stages.entries()){
 const prev=out.stages[i-1],r=s.receipt,st=mixed.stages[i]
 assert.equal(s.receiptSha256,carryoverDigest(r))
 assert.equal(r.priorSha256,prev?.receiptSha256??null)
 assert.deepEqual(r.runHistory,mixed.stages.slice(0,i+1).map(x=>x.runId))
 const days=i?(Date.parse(st.date)-Date.parse(mixed.stages[i-1].date))/86400000:0
 assert.equal(s.recoveryReceipts.length,days*roster.length)
 if(i)for(const x of r.riders){
  let fatigue=prev.receipt.riders.find(y=>y.riderId===x.riderId).persistedFatigue
  for(const n of s.recoveryReceipts.filter(n=>n.riderId===x.riderId).sort((a,b)=>a.date.localeCompare(b.date))){
   assert.equal(n.fatigueAfterStage,fatigue)
   fatigue=reviewOfficialRaceNight(n).fatigue;recoveryNights++
  }
  const ready=s.ready.rows.find(y=>y.riderId===x.riderId)
  assert.equal(ready.condition.fatigueBeforeStage,fatigue)
  const initial=s.initialRiders.find(y=>y.riderId===x.riderId)
  if(initial)assert.equal(initial.energy,Math.max(1,100-fatigue*.45))
 }
 for(const x of s.sportingRows){
  if(withdrawn.has(x.riderId)){assert.equal(x.status,'dns');assert.ok(!s.initialRiders.some(y=>y.riderId===x.riderId))}
  if(x.status!=='finished'){withdrawn.add(x.riderId);totals.delete(x.riderId)}
  else totals.set(x.riderId,(totals.get(x.riderId)??0)+x.sportingElapsedSeconds)
 }
 assert.equal(r.gc.length,totals.size)
 for(const g of r.gc){assert.equal(g.totalTimeSeconds,totals.get(g.riderId));assert.ok(!withdrawn.has(g.riderId))}
 assert.ok(r.gc.every((g,j)=>g.rank===j+1&&(!j||g.totalTimeSeconds>=r.gc[j-1].totalTimeSeconds)))
 for(const id of s.incidentIds){assert.ok(!incidents.has(id));incidents.add(id)}
 for(const e of s.physicalEnergyAudit)if(e.multiplier<1&&e.nextEnergy>Math.max(0,e.previousEnergy-e.neutralCost)+1e-9)savedTicks++
}
assert.ok(withdrawn.size>0&&recoveryNights>0&&savedTicks>0)
console.log('PASS 043AW permanent withdrawals, daily recovery, actual energy and cumulative GC; withdrawn='+withdrawn.size+' recoveryNights='+recoveryNights+' savedTicks='+savedTicks)
let protectedComponents=0
for(const [i,s] of out.stages.entries()){
 const r=s.receipt,prev=out.stages[i-1]
 for(const row of r.resources)if(i)assert.deepEqual(row.before,prev.receipt.resources.find(x=>x.after.resourceId===row.before.resourceId).after)
 for(const a of s.resourceEnergy.allocations){
  const l=r.resources.find(x=>x.before.resourceId===a.resourceId),expected=i===1?16:i===2?8:0
  assert.equal(a.usableQuantity,expected);assert.equal(l.after.quantity,l.before.quantity-expected)
  assert.equal(l.effect?.quantityUsed??0,expected)
 }
 const available=i===1||i===2
 for(const a of r.individualEquipmentWear.receipt.wearProtection.assets){
  const l=r.resources.filter(x=>x.before.resourceId===a.resourceId)
  assert.equal(l.length,1);assert.equal(a.available,available)
  assert.equal(l[0].effect?.stageUsesUsed??0,available?1:0)
  assert.equal(l[0].after.stageUsesRemaining,i===0?2:i===1?1:0)
 }
 assert.equal(s.resourceMechanical.supportRows[0].available,available)
 for(const c of r.individualEquipmentWear.receipt.rows){
  const factor=available&&c.before.teamId===teams[0]?.35:1
  assert.ok(Math.abs(c.wearIntensity-factor)<1e-12)
  assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,c.distanceKm/100*c.configuredWear*factor))<=.00000051)
  if(c.distanceKm===0)assert.equal(c.conditionUsed,0)
  if(factor<1&&c.conditionUsed>0)protectedComponents++
  if(i&&prev.receipt.riders.find(x=>x.riderId===c.riderId)?.status!=='finished')assert.equal(c.distanceKm,0)
 }
 const exposure=r.clothingExposure.receipt
 assert.equal(exposure.physicalClassificationSha256,s.physicalClassificationSha256)
 if(i)assert.deepEqual(exposure.history.slice(0,prev.receipt.clothingExposure.receipt.history.length),prev.receipt.clothingExposure.receipt.history)
 assert.ok(exposure.candidates.every(c=>!c.caseCreationVerified&&!c.availabilityChanged))
 const jacket=r.resources.find(x=>x.before.resourceId===units[0].resourceId)
 assert.equal(jacket.after.stageUsesRemaining,0)
 assert.equal(jacket.effect?.stageUsesUsed??0,i===0?1:0)
}
assert.ok(protectedComponents>0)
console.log('PASS 043AW cross-terrain consumable exhaustion, single asset debit, individual mileage wear and exposure history; protectedComponents='+protectedComponents)
const replay=run(mixed)
assert.equal(replay.finalReceiptSha256,out.finalReceiptSha256);assert.equal(replay.gcSha256,out.gcSha256)
assert.deepEqual(replay.stages.map(s=>s.observationSha256),out.stages.map(s=>s.observationSha256))
assert.throws(()=>reviewMultistagePhysicalTour({packet:mixed,expectedPacketSha256:'0'.repeat(64)}),/frozen tour packet/)
for(const z of [out,...out.stages.map(s=>s.receipt)])for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(z[k],false)
console.log('PASS 043AW deterministic mixed tour replay, chained receipts and authority guards')
console.log('PASS 4/4 mixed terrain tour checks; no hosted connection')
