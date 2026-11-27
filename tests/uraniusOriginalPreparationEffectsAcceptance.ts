import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewRainJacketRequirement,reviewRainJacketExposure,reviewWorkshopConditionFactor,resolveWearProtection} from '../scripts/uranius-original-preparation-effects-review.mjs'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
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

const categories=['frame','wheelset','tires','groupset','helmet','shoes']
const setups=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,components:categories.map(category=>({category,resourceId:r.riderId+'-'+category}))}))
const components=setups.flatMap(s=>s.components.map(c=>({resourceType:'equipment',resourceId:c.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:null,maxStageUses:null,condition:c.category==='tires'?90.1:100,lastUsedDate:null})))
const supports=teams.map(t=>({teamId:t,resourceId:t+'-support',mechanicalRisk:.95,mechanicalTimeLoss:.9}))
const supportAssets=supports.map(s=>({resourceType:'asset',resourceId:s.resourceId,teamId:s.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const expanded={...tourPacket,mechanicalBinding:{setups,supports},initialResources:[...components,...supportAssets],stages:tourPacket.stages.map((s,i)=>({...s,resourceRequests:[...components.map(c=>({resourceType:c.resourceType,resourceId:c.resourceId,selectedQuantity:0,selectedStageUses:0,conditionLossPerRaceDay:.35})),...supportAssets.map(a=>({resourceType:a.resourceType,resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i?1:0,conditionLossPerRaceDay:0}))]}))}


const mild={temperatureC:15,rainChancePct:39,precipitationMm:1.99,condition:'clear'}
assert.equal(reviewRainJacketRequirement(mild).required,false)
for(const weather of [{...mild,temperatureC:14.99},{...mild,rainChancePct:40},{...mild,precipitationMm:2},{...mild,condition:'drizzle'}])assert.equal(reviewRainJacketRequirement(weather).required,true)
assert.equal(reviewRainJacketRequirement({...mild,temperatureC:null,rainChancePct:null,precipitationMm:null}).required,false)
const wet={...mild,temperatureC:10,condition:'rain'}
assert.equal(reviewRainJacketRequirement(wet).reason,'rain and temperature below 15°C')
for(const jacketUsed of [true,false]){
 assert.equal(reviewRainJacketExposure({weather:wet,physicalStatus:'finished',jacketUsed}).illnessRiskScore,jacketUsed?10:60)
 for(const physicalStatus of ['dnf','dns'])assert.equal(reviewRainJacketExposure({weather:wet,physicalStatus,jacketUsed}).illnessRiskScore,null)
 assert.equal(reviewRainJacketExposure({weather:mild,physicalStatus:'finished',jacketUsed}).illnessRiskScore,null)
}
for(const [c,f] of [[100,1],[90,1],[89.99,.95],[75,.95],[74.99,.85],[60,.85],[59.99,.7],[45,.7],[44.99,.5],[30,.5],[29.99,0],[0,0],[null,0]])assert.equal(reviewWorkshopConditionFactor(c),f)
console.log('PASS 043AO archived jacket weather boundaries, exposure scores and workshop condition bands')
const assets=[{resourceId:'van-1',teamId:teams[0],sourceKey:'equipment_van',effects:[-40,10]},{resourceId:'workshop-1',teamId:teams[0],sourceKey:'mobile_workshop',effects:[-60,20]}]
const protectionResources=assets.map(a=>({resourceType:'asset',resourceId:a.resourceId,teamId:a.teamId,quantity:null,stageUsesRemaining:1,maxStageUses:1,condition:100,lastUsedDate:null}))
const unprotected={...expanded,individualEquipmentWear:true,initialResources:[...expanded.initialResources,...protectionResources],stages:expanded.stages.map((s,i)=>({...s,resourceRequests:[...s.resourceRequests,...assets.map(a=>({resourceType:'asset',resourceId:a.resourceId,selectedQuantity:0,selectedStageUses:i===0?0:1,conditionLossPerRaceDay:0}))]}))}
const protectedPacket={...unprotected,wearProtectionBinding:{assets}}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const out=run(protectedPacket)
let protectedComponents=0
for(const [i,s] of out.stages.entries()){
 assert.ok(s.physicalCompleted)
 const w=s.receipt.individualEquipmentWear.receipt,protection=w.wearProtection
 const factor=i===1?.35:1
 for(const a of protection.assets){
  assert.equal(a.available,i===1);assert.equal(a.protectionPct,i===1?(a.sourceKey==='equipment_van'?30:50):0)
  const ledger=s.receipt.resources.find(r=>r.before.resourceId===a.resourceId)
  assert.equal(ledger.after.stageUsesRemaining,i===0?1:0)
  if(i===2)assert.equal(ledger.effect.shortageApplied,true)
 }
 for(const t of protection.teams)assert.ok(Math.abs(t.wearIntensity-(t.teamId===teams[0]?factor:1))<1e-12)
 for(const c of w.rows){
  const f=c.before.teamId===teams[0]?factor:1
  assert.ok(Math.abs(c.wearIntensity-f)<1e-12)
  assert.ok(Math.abs(c.conditionUsed-Math.min(c.before.condition,c.distanceKm/100*c.configuredWear*f))<=.00000051)
  if(f<1&&c.distanceKm>0&&c.conditionUsed>0)protectedComponents++
  const ledger=s.receipt.resources.find(r=>r.before.resourceId===c.resourceId)
  assert.deepEqual(ledger.after,c.after)
 }
 if(i)for(const r of s.receipt.resources)assert.deepEqual(r.before,out.stages[i-1].receipt.resources.find(x=>x.after.resourceId===r.before.resourceId).after)
}
assert.ok(protectedComponents>0)
console.log('PASS 043AO actual component mileage wear uses historical combined protection, expires after stock use; components='+protectedComponents)
const s=out.stages[1],evidence={provenance:P,stageId:s.stageId,date:s.receipt.date,resources:s.receipt.resources.map(r=>r.before),requests:protectedPacket.stages[1].resourceRequests,assets}
const resolve=e=>resolveWearProtection({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:s.ready})
assert.deepEqual(resolve(evidence),s.receipt.individualEquipmentWear.receipt.wearProtection)
const bad=structuredClone(evidence);bad.assets[0].teamId=teams[1]
assert.throws(()=>resolve(bad),/invalid protection asset/)
const used=structuredClone(evidence);used.resources.find(r=>r.resourceId==='van-1').lastUsedDate=evidence.date
assert.equal(resolve(used).assets[0].available,false)
const broken=structuredClone(evidence);broken.resources.find(r=>r.resourceId==='workshop-1').condition=0
assert.equal(resolve(broken).assets[1].available,false)
assert.throws(()=>resolve({...evidence,assets:[...assets,assets[0]]}),/complete unique/)
assert.throws(()=>resolveWearProtection({evidence,expectedEvidenceSha256:'0'.repeat(64),ready:s.ready}),/frozen wear protection/)
console.log('PASS 043AO asset ownership, duplicate assignment, already-used date, unusable condition and digest guards')
const legacy=run(unprotected)
assert.deepEqual(out.stages[0].physicalClassification,legacy.stages[0].physicalClassification)
assert.deepEqual(out.stages[0].receipt.resources,legacy.stages[0].receipt.resources)
assert.deepEqual(out.stages[1].physicalClassification,legacy.stages[1].physicalClassification)
assert.ok(out.stages[1].receipt.individualEquipmentWear.receipt.rows.some(c=>c.before.teamId===teams[0]&&c.distanceKm>0&&c.after.condition>legacy.stages[1].receipt.resources.find(r=>r.before.resourceId===c.resourceId).after.condition))
assert.deepEqual(run(protectedPacket),out)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(out[k],false)
console.log('PASS 043AO default-path parity, improved component condition and deterministic authority guards')
console.log('PASS 4/4 original preparation effects checks; no hosted connection')
