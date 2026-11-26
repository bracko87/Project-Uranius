import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpointConsequences} from '../scripts/uranius-historical-incident-consequences-review.mjs'
import {reviewHistoricalClosure,reviewHistoricalSingleIncidentChase} from '../scripts/uranius-historical-autonomous-chase-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const md5=x=>createHash('md5').update(x,'utf8').digest('hex')
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const outputs=[]
for(let i=0;i<400;i++){
 const distanceKm=100,fromKm=(i%99)+.1,toKm=fromKm+.4,gradientPercent=(i%21)-10,ids=Array.from({length:i%6+1},(_,j)=>'r'+j),target=i%3===0?'B1':'P'
 const riders=ids.map((riderId,j)=>({riderId,flat:(i+j*7)%101,climbing:(i*2+j*3)%101,endurance:(i*3+j)%101,resistance:(i*4+j)%101,teamwork:(i*5+j)%101,raceIQ:(i*6+j)%101,fatigueBeforeStage:i%101}))
 const input={stage:{distanceKm,terrainType:i%2?'flat':'mountain',profilePoints:[{km:0,elevationM:10000},{km:100,elevationM:10000+gradientPercent*1000}]},riders}
 const riderReadiness=ids.map(riderId=>({riderId,fatigueBalance:{startEnergy:80}}))
 const baseReplayTimeline={checkpoints:[{raceProgress:{kmFromStart:0},gaps:[{displayCode:target,gapSeconds:300},{displayCode:'P',gapSeconds:300}].filter((x,j,arr)=>arr.findIndex(y=>y.displayCode===x.displayCode)===j),riderStates:ids.map(riderId=>({riderId,energy:80}))},{raceProgress:{kmFromStart:100},gaps:[{displayCode:target,gapSeconds:i%2?0:600},{displayCode:'P',gapSeconds:i%2?0:600}].filter((x,j,arr)=>arr.findIndex(y=>y.displayCode===x.displayCode)===j),riderStates:ids.map(riderId=>({riderId,energy:i%71}))}]}
 outputs.push(reviewHistoricalClosure({input,baseReplayTimeline,riderReadiness,group:{members:ids.map(riderId=>({riderId})),targetDisplayCode:target},fromKm,toKm,flatSprintFinish:i%2===1}))
}
assert.equal(outputs.length,400);assert.equal(md5(JSON.stringify(outputs)),'5b8d7cb04011dfa5c9292b43c4750180')
pass('043S 400 original-source chase closure and energy calculations')
const roster=Array.from({length:8},(_,i)=>({riderId:id(100+i),teamId:id(10+i%2),equipmentConditionPercent:90}))
const candidate=(kind,riders)=>({entityId:kind==='group_crash'?'P:'+riders.map(r=>r.riderId).sort().join(','):riders[0].riderId,displayCode:'P',riders,probabilityInput:{incidentKind:kind,tickSeconds:30,weatherMultiplier:2.5,currentSpeedKmh:80,gradientPercent:-12,groupSize:8,runtimeFatigue:100,resistance:0,raceIq:0,preparationSupportMultiplier:1.4,commandIntensityMultiplier:1.45,raceSituationMultiplier:6,equipmentConditionPercent:kind==='group_crash'?100:90,mechanicalIncidentRiskMultiplier:1},causes:['descending','runtime_fatigue','wet_road','high_speed'],exposureEligibility:'explicit_synthetic_eligible'})
const cp={provenance:'synthetic_review_fixture',raceId:id(1),stageId:id(2),runId:id(3),seed:'043S-0',raceSecond:300,priorIncidentCount:0,candidates:[candidate('group_crash',roster),candidate('individual_crash',[roster[0]]),candidate('technical_incident',[roster[1]])]}
const makeConsequence=(checkpoint,kmFromStart)=>({provenance:'synthetic_review_fixture',checkpoint,expectedCheckpointSha256:carryoverDigest(checkpoint),repairModifiers:roster.map(r=>({riderId:r.riderId,teamId:r.teamId,mechanicalTimeLossMultiplier:1})),stage:{stageFormat:'road_race',distanceKm:100,kmFromStart,flatFinish:true,summitFinish:false,sprintZoneKm:null}})
const select=(kind)=>{
 for(let i=0;i<3000;i++){
  const checkpoint={...cp,seed:'043S-'+i},e=makeConsequence(checkpoint,5)
  const result=reviewHistoricalCheckpointConsequences({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
  if(result.incident?.kind===kind&&result.incident.riderConsequences.filter(r=>r.movedToLaterGroup).length>=(kind==='group_crash'?2:1))return checkpoint
 }
 throw Error('no fixture selected '+kind)
}
const make=(checkpoint,start,strong=true)=>{
 const consequenceEvidence=makeConsequence(checkpoint,start)
 const riders=roster.map(r=>({riderId:r.riderId,teamId:r.teamId,flat:strong?95:25,climbing:strong?95:25,endurance:strong?95:25,resistance:strong?95:25,teamwork:strong?95:25,raceIQ:strong?95:25,fatigueBeforeStage:strong?10:90,startEnergy:80}))
 return {provenance:'synthetic_review_fixture',consequenceEvidence,expectedConsequenceSha256:carryoverDigest(consequenceEvidence),riders,profilePoints:[{km:0,elevationM:100},{km:100,elevationM:100}],terrainType:'flat',timeline:[{km:0,gaps:[{displayCode:'P',gapSeconds:0}],energies:roster.map(r=>({riderId:r.riderId,energy:strong?80:10}))},{km:100,gaps:[{displayCode:'P',gapSeconds:0}],energies:roster.map(r=>({riderId:r.riderId,energy:strong?75:5}))}],teamRescuePolicy:'explicit_no_rescue_eligible_fixture',flatSprintFinish:true}
}
const review=e=>reviewHistoricalSingleIncidentChase({evidence:e,expectedEvidenceSha256:carryoverDigest(e)})
const single=select('technical_incident'),early=make(single,5),late=make(single,95,false),a=review(early),b=review(late)
assert.equal(a.episodes.length,1);assert.equal(b.episodes.length,1)
assert.ok(a.episodes[0].actualRejoinKm>5&&a.episodes[0].actualRejoinKm<100)
assert.equal(a.episodes[0].finalGapToTargetSeconds,0)
assert.equal(a.incident.riderConsequences[0].finalTimePenaltySeconds,0)
assert.equal(a.episodes[0].samples.at(-1).gapToTargetSeconds,5)
assert.ok(a.episodes[0].chaseEnergyCostPoints>0)
assert.equal(b.episodes[0].actualRejoinKm,null);assert.ok(b.episodes[0].finalGapToTargetSeconds>b.incident.timeLossSeconds)
assert.equal(b.incident.riderConsequences[0].finalTimePenaltySeconds,Math.round(b.episodes[0].finalGapToTargetSeconds))
assert.equal(b.episodes[0].samples.at(-1).kmFromStart,100)
assert.deepEqual(review(early),a)
pass('043S early physical rejoin versus late exhausted chase and exact provisional time settlement')
const group=review(make(select('group_crash'),5))
assert.ok(group.episodes.length>=2)
assert.ok(group.episodes.every(e=>e.actualRejoinKm===group.episodes[0].actualRejoinKm&&e.actualRejoinKm!==null))
assert.ok(group.episodes.every(e=>e.chaseEnergyCostPoints>0&&e.finalGapToTargetSeconds===0))
for(const e of [...a.episodes,...b.episodes,...group.episodes]){
 for(let i=1;i<e.samples.length;i++){assert.ok(e.samples[i].kmFromStart>e.samples[i-1].kmFromStart);assert.ok(e.samples[i].kmFromStart-e.samples[i-1].kmFromStart<=.500001);assert.ok(e.samples[i].cumulativeChaseEnergyCostPoints>=e.samples[i-1].cumulativeChaseEnergyCostPoints)}
}
pass('043S multiple riders in one incident share a physical group, monotone half-kilometre trace and chase energy')
assert.throws(()=>reviewHistoricalSingleIncidentChase({evidence:{...early,terrainType:'mountain'},expectedEvidenceSha256:carryoverDigest(early)}),/frozen synthetic/)
assert.throws(()=>review({...early,teamRescuePolicy:'active'}),/team rescue/)
assert.throws(()=>review({...early,riders:early.riders.slice(1)}),/roster mismatch/)
assert.throws(()=>review({...early,timeline:early.timeline.slice(1)}),/complete base timeline/)
assert.throws(()=>review({...early,consequenceEvidence:{...early.consequenceEvidence,stage:{...early.consequenceEvidence.stage,kmFromStart:50}}}),/frozen synthetic consequence/)
for(const k of ['official','hostedWriteAllowed','accountingAllowed','physicalCheckpointVerified','incidentAuthorityVerified','finishTimeVerified','completeChaseModelVerified'])assert.equal(a[k],false)
assert.equal(a.incident.riderConsequences[0].sprintZoneProtectionApplied,null)
pass('043S frozen source, complete timeline, no invented rescue or official result')
assert.equal(checks,4);console.log('PASS 4/4 historical autonomous chase checks; no hosted connection')
