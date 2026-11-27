import assert from 'node:assert/strict'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {resolveEquipmentPerformanceReview} from '../scripts/uranius-equipment-performance-review'
import {reviewMultistagePhysicalTour} from '../scripts/uranius-multistage-physical-tour-review'
import {bindLegacyReadiness} from '../scripts/uranius-frozen-readiness-review.mjs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {calculatePelotonBasePace} from '../src/race-engine/simulation/pelotonPace'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {finishPhysicalIncidentStage} from '../scripts/uranius-physical-incident-finish-review'
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

const percentages=p=>roster.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentStagePerformancePct:p}))
const dry={...context,weatherCondition:'clear',precipitationMm:0,rainProbabilityPct:0,weatherMultiplier:.7,severeWeather:false}
const neutralPacket={...expanded,stages:expanded.stages.map((s,i)=>i===2?{...s,context:dry,equipmentPerformanceRows:percentages(0)}:s)}
const boostedPacket={...neutralPacket,stages:neutralPacket.stages.map((s,i)=>i===2?{...s,equipmentPerformanceRows:percentages(10)}:s)}
const run=p=>reviewMultistagePhysicalTour({packet:p,expectedPacketSha256:carryoverDigest(p)})
const neutral=run(neutralPacket),boosted=run(boostedPacket)
const n=neutral.stages[2],b=boosted.stages[2]
assert.ok(b.physicalCompleted&&n.physicalCompleted)
assert.deepEqual(boosted.stages.slice(0,2),neutral.stages.slice(0,2))
assert.deepEqual(n.initialRiders,b.initialRiders)
assert.equal(b.equipmentPerformance.rows.length,roster.length)
for(const r of b.equipmentPerformance.rows){
 const a=roster.find(x=>x.riderId===r.riderId).attributes
 const score=a.sprint*.3+a.flat*.25+a.stamina*.2+a.resistance*.1+a.raceIq*.1+a.teamwork*.05
 if(r.eligible){assert.equal(r.stageSkillScore,score);assert.equal(r.equipmentPerformanceAdjustment,Math.round(score*.1*10000)/10000)}
 else{assert.equal(r.equipmentPerformanceAdjustment,0);assert.ok(!Object.hasOwn(b.equipmentPerformance.adjustments,r.riderId))}
}
console.log('PASS 043AL historical flat suitability adjustment, full equipment evidence and DNS exclusion')
assert.ok(b.openingPhysicalObservation.measuredKm>n.openingPhysicalObservation.measuredKm)
assert.ok(b.baselineWinnerTimeSeconds<n.baselineWinnerTimeSeconds)
console.log('PASS 043AL actual tour movement responds to equipment; openingKm='+n.openingPhysicalObservation.measuredKm+' -> '+b.openingPhysicalObservation.measuredKm+' baselineSeconds='+n.baselineWinnerTimeSeconds+' -> '+b.baselineWinnerTimeSeconds)
// Matched controlled physical completion, no automatic incidents or changing seed.
const short={...input,distanceKm:20,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:20,elevationMetres:50}]}
const bound=bindLegacyReadiness({source,expectedSourceSha256:carryoverDigest(source),input:short})
const initial=createInitialState(bound.input)
const group=Object.values(initial.groups).find(g=>g.active).groupId
const evidence={provenance:P,stageId,rows:percentages(10)}
const resolve=e=>resolveEquipmentPerformanceReview({evidence:e,expectedEvidenceSha256:carryoverDigest(e),ready:bound.receipt,input:bound.input,mechanical:boosted.stages[0].resourceMechanical})
const plus=resolve(evidence).adjustments,minus=resolve({...evidence,rows:percentages(-10)}).adjustments,zero=resolve({...evidence,rows:percentages(0)}).adjustments
const original=structuredClone(initial)
const no=finishPhysicalIncidentStage(initial,[],group)
const z=finishPhysicalIncidentStage(initial,[],group,1440,undefined,zero)
const up=finishPhysicalIncidentStage(initial,[],group,1440,undefined,plus)
const down=finishPhysicalIncidentStage(initial,[],group,1440,undefined,minus)
assert.deepEqual(initial,original);assert.deepEqual(no,z)
assert.ok(up.classification[0].elapsedSeconds<no.classification[0].elapsedSeconds&&down.classification[0].elapsedSeconds>no.classification[0].elapsedSeconds)
assert.deepEqual(up.state.input,initial.input);assert.deepEqual(down.state.input,initial.input)
const fixed=createInitialState({...bound.input,settings:{...bound.input.settings,minimumSpeedKmh:40,maximumSpeedKmh:40}})
assert.equal(calculateMultiGroupMovement(fixed,plus).proposals[0].appliedSpeedKmh,40)
console.log('PASS 043AL matched physical finishes, neutral parity, negative/positive capability and speed bounds; seconds='+down.classification[0].elapsedSeconds+'/'+no.classification[0].elapsedSeconds+'/'+up.classification[0].elapsedSeconds)
const bad=structuredClone(evidence);bad.rows[0].equipmentStagePerformancePct=21
assert.throws(()=>resolve(bad),/invalid normalized equipment/)
const missing=structuredClone(evidence);missing.rows.pop()
assert.throws(()=>resolve(missing),/complete unique/)
assert.throws(()=>resolveEquipmentPerformanceReview({evidence,expectedEvidenceSha256:'0'.repeat(64),ready:bound.receipt,input:bound.input,mechanical:boosted.stages[0].resourceMechanical}),/frozen performance/)
assert.throws(()=>calculatePelotonBasePace({riders:Object.values(initial.riders),minimumSpeedKmh:24,maximumSpeedKmh:72,experimentalEquipmentCapabilityAdjustments:{}}),/invalid experimental equipment/)
assert.deepEqual(run(boostedPacket),boosted)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','finalClassificationVerified'])assert.equal(boosted[k],false)
console.log('PASS 043AL deterministic replay, tamper rejection and authority guards')
console.log('PASS 4/4 equipment performance checks; no hosted connection')
