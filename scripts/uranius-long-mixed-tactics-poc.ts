// Isolated 120 km / 128-rider four-tactics simulation. No hosted execution.
// An explicitly pre-established 90-second escape exercises the chase;
// a SEPARATE attack order must launch physically within the stage.
import {createHash} from 'node:crypto'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createBreakawayGroup} from '../src/race-engine/simulation/createBreakawayGroup'
import {calculateExperimentalChaseMultiplier} from '../src/race-engine/simulation/experimentalChasePace'
import {getStageTerrainSample} from '../src/race-engine/simulation/stageProfile'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const field=128
const riders=Array.from({length:field},(_,index)=>{
 const base=syntheticTenRiderStage.riders[index%10], team=Math.floor(index/8)+1
 return {...base,riderId:'long-mixed-'+String(index+1).padStart(3,'0'),
  teamId:'long-team-'+String(team).padStart(2,'0'),
  teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
  role:index%8===0?'captain' as const:'domestique' as const,
  attributes:{...base.attributes,
   flat:48+(index*37+11)%48,climbing:47+(index*29+23)%49,
   sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
   stamina:51+(index*19+7)%43,resistance:50+(index*31)%44,
   recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
   timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}}
})
const teams=Array.from({length:field/8},(_,index)=>{
 const group=riders.slice(index*8,index*8+8)
 return {teamId:group[0].teamId,teamName:group[0].teamName,
  captainRiderId:group[0].riderId,riderIds:group.map(r=>r.riderId)}
})
const sprinter=riders[0],leadout=riders[1],pursuer=riders[2],attacker=riders[8],establishedEscape=riders[16]
const input:StageInput={...syntheticTenRiderStage,
 raceId:'uranius-long-mixed-offline',stageId:'long-mixed-120',
 stageName:'Fictional 120km rolling four-tactics stage',
 distanceKm:120,seed:'long-mixed-fixed-seed',teams,riders,
 profilePoints:[100,130,160,120,320,370,280,340,500,400,260,170,140].map(
  (elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
 orders:[
  {orderId:'long-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,priority:1,
   eligibleFromKm:35,eligibleUntilKm:42,targetRiderId:null,
   maximumFollowers:null,metadata:{uraniusLiveCommand:true}},
  {orderId:'long-chase',type:'chase',status:'scheduled',
   teamId:pursuer.teamId,riderId:pursuer.riderId,priority:1,
   eligibleFromKm:5,eligibleUntilKm:8,targetRiderId:null,
   maximumFollowers:null,metadata:{}},
  {orderId:'long-leadout',type:'leadout',status:'scheduled',
   teamId:leadout.teamId,riderId:leadout.riderId,priority:1,
   eligibleFromKm:118,eligibleUntilKm:120,targetRiderId:sprinter.riderId,
   maximumFollowers:null,metadata:{}},
  {orderId:'long-sprint',type:'sprint',status:'scheduled',
   teamId:sprinter.teamId,riderId:sprinter.riderId,priority:1,
   eligibleFromKm:118,eligibleUntilKm:120,targetRiderId:null,
   maximumFollowers:null,metadata:{}},
 ]}
function initial(){
 const stage=createInitialState(input)
 const peloton=Object.values(stage.groups).filter(g=>g.active&&g.groupType==='peloton')
 if(peloton.length!==1)throw Error('Exactly one peloton required')
 return createBreakawayGroup({state:stage,sourceGroupId:peloton[0].groupId,
  riderIds:[establishedEscape.riderId],speedKmh:38,initialGapSeconds:90}).state
}
function run(enabled:boolean){
 const stage=runCalibratedTerrainSeparationStage(initial(),{
  experimentalPhysicalAttackLaunch:enabled,
  experimentalChaseOrdersEnabled:enabled,
  experimentalFinishTacticsEnabled:enabled,
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
 })
 const final=Object.values(stage.finalState.riders)
 const ranks=final.map(r=>r.finishPosition)
 const timestamps=final.map(r=>r.finishTimeSeconds)
 const orders=Object.values(stage.finalState.orders)
 const p=stage.finalState.riders[pursuer.riderId]
 const spr=stage.finalState.riders[sprinter.riderId]
 const lead=stage.finalState.riders[leadout.riderId]
 const eligibleChase=stage.ticks.filter(t=>{
  if(t.appliedOrders.state.orders['long-chase']?.status!=='executed')return false
  const peloton=t.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const breaks=t.movement.movement.proposals.filter(p=>p.groupType==='breakaway')
  if(!peloton||breaks.length===0)return false
  const group=t.appliedOrderEffects.state.groups[peloton.groupId]
  const gap=Math.max(...breaks.map(b=>
   (t.appliedOrderEffects.state.groups[b.groupId]?.distanceKm??0)-group.distanceKm))
  return gap>0&&gap/Math.max(group.speedKmh,0.000001)*3600>=5
 })
 const actualChaseTicks=stage.ticks.flatMap(t=>{
  const before=t.appliedOrderEffects.state
  return t.movement.movement.proposals.filter(proposal=>proposal.groupType==='peloton')
   .map(proposal=>{
    const group=before.groups[proposal.groupId]
    if(!group)return null
    const terrain=getStageTerrainSample(before.input,group.distanceKm)
    const multiplier=calculateExperimentalChaseMultiplier(
     before,group,terrain.gradientPercent)
    if(!enabled||multiplier<=1)return null
    const order=before.orders['long-chase']
    const riderEnergyCost=t.appliedEnergy.applications.find(
     a=>a.riderId===pursuer.riderId)?.energyCost??null
    return {second:t.state.raceSecond,km:group.distanceKm,
     multiplier,orderStatus:order?.status??null,
     orderExpiryKm:order?.eligibleUntilKm??null,
     beyondScheduledOrderWindow:group.distanceKm>(order?.eligibleUntilKm??Infinity),
     actualPelotonSpeedKmh:proposal.appliedSpeedKmh,riderEnergyCost}
   }).filter((value):value is NonNullable<typeof value>=>value!==null)
 })
 const finishGroupId=stage.finalState.riders[sprinter.riderId].currentGroupId
 const sprinterFinishGroup=Object.values(stage.finalState.riders)
  .filter(r=>r.currentGroupId===finishGroupId)
 const sprinterWithinGroupPosition=1+sprinterFinishGroup.filter(r=>
  r.finishPosition!==null&&spr.finishPosition!==null&&r.finishPosition<spr.finishPosition).length
 const sprinterStrength={sprint:sprinter.attributes.sprint,
  acceleration:sprinter.attributes.acceleration,energy:spr.energy}
 const movementCosts=stage.ticks.reduce((sum,t)=>sum+
  (t.appliedEnergy.applications.find(a=>a.riderId===pursuer.riderId)?.energyCost??0),0)
 const attackCount=stage.events.filter(e=>e.eventType==='ATTACK_STARTED').length
 return {
  enabled,completed:stage.completed,ticks:stage.ticks.length,
  finishers:final.filter(r=>r.finished&&r.finishTimeSeconds!==null).length,
  positionsUnique:new Set(ranks).size===field&&ranks.every(r=>r!==null),
  allTimesFinite:timestamps.every(t=>typeof t==='number'&&Number.isFinite(t)),
  ordersExecuted:orders.filter(o=>o.status==='executed').map(o=>o.orderId).sort(),
  attackCount,eligibleChaseTicks:eligibleChase.length,
  actualChaseBoostTicks:actualChaseTicks.length,
  actualChaseBoostTicksAfterExpiry:actualChaseTicks.filter(
   t=>t.beyondScheduledOrderWindow).length,
  firstChaseBoost:actualChaseTicks[0]??null,
  lastChaseBoost:actualChaseTicks.at(-1)??null,
  sprinterStrength,sprinterFinishGroupSize:sprinterFinishGroup.length,
  sprinterWithinGroupPosition,

  sprinterRank:spr.finishPosition,sprinterTime:spr.finishTimeSeconds,
  sprinterEnergy:spr.energy,leadoutEnergy:lead.energy,
  pursuerEnergy:p.energy,pursuerFinishSeconds:p.finishTimeSeconds,
  pursuerMovementCost:movementCosts,
  peakActiveGroupCount:Math.max(...stage.ticks.map(t=>
   Object.values(t.state.groups).filter(g=>g.active).length)),
  hash:createHash('sha256').update(JSON.stringify(final
   .map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy])
   .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex').slice(0,20),
 }
}
const control=run(false)
const experiment=run(true)
const expected=['long-attack','long-chase','long-leadout','long-sprint']
const checks={
 bothFinished:control.completed&&experiment.completed&&
  control.finishers===field&&experiment.finishers===field,
 classificationIntegrity:control.positionsUnique&&experiment.positionsUnique&&
  control.allTimesFinite&&experiment.allTimesFinite,
 allFourExecuted:expected.every(id=>
  control.ordersExecuted.includes(id)&&experiment.ordersExecuted.includes(id)),
 physicalAttackEvents:control.attackCount>=1&&experiment.attackCount>=1,
 realChaseOpportunity:experiment.eligibleChaseTicks>=1,
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-long-mixed-tactics-v1',
 scope:'OFFLINE fictional 120km 128 riders, same initial established escape and four tactical orders',
 control,experiment,checks,observations:{
 classificationChanged:control.hash!==experiment.hash,
 sprinterRankDifference:(control.sprinterRank??0)-(experiment.sprinterRank??0),
 pursuerFinalEnergyDifference:control.pursuerEnergy-experiment.pursuerEnergy,
 pursuerMovementCostDifference:control.pursuerMovementCost-experiment.pursuerMovementCost,
 pursuerFinishTimeDifferenceSeconds:
  (control.pursuerFinishSeconds??0)-(experiment.pursuerFinishSeconds??0),
 }},null,2)+'\n')
