// OFFLINE POC ONLY: combine real attack, chase, sprint and lead-out orders.
// Same StageInput and seed for control and full opt-in. No synthetic initial gap.
import {createHash} from 'node:crypto'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createBreakawayGroup} from '../src/race-engine/simulation/createBreakawayGroup'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const sprinter=syntheticTenRiderStage.riders[0]
const leadout=syntheticTenRiderStage.riders[1]
const pursuer=syntheticTenRiderStage.riders[2]
const attacker=syntheticTenRiderStage.riders[5]
const establishedEscape=syntheticTenRiderStage.riders[7]
const stageInput:StageInput={
 ...syntheticTenRiderStage,
 raceId:'offline-mixed-tactics',stageId:'offline-24km-mixed',
 stageName:'Fictional flat 24km mixed-tactics stage',
 distanceKm:24,seed:'mixed-tactics-fixed-seed',
 profilePoints:[0,6,12,18,24].map(kilometre=>({kilometre,elevationMetres:100})),
 riders:syntheticTenRiderStage.riders.map(r=>({
  ...r,attributes:{...r.attributes,timeTrial:72,raceIq:70}
 })),
 orders:[
  {orderId:'mixed-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,
   eligibleFromKm:4,eligibleUntilKm:6,priority:1,
   maximumFollowers:null,targetRiderId:null,metadata:{uraniusLiveCommand:true}},
  {orderId:'mixed-chase',type:'chase',status:'scheduled',
   teamId:pursuer.teamId,riderId:pursuer.riderId,
   eligibleFromKm:4,eligibleUntilKm:6,priority:1,
   maximumFollowers:null,targetRiderId:null,metadata:{}},
  {orderId:'mixed-leadout',type:'leadout',status:'scheduled',
   teamId:leadout.teamId,riderId:leadout.riderId,
   eligibleFromKm:22,eligibleUntilKm:24,priority:1,
   maximumFollowers:null,targetRiderId:sprinter.riderId,metadata:{}},
  {orderId:'mixed-sprint',type:'sprint',status:'scheduled',
   teamId:sprinter.teamId,riderId:sprinter.riderId,
   eligibleFromKm:22,eligibleUntilKm:24,priority:1,
   maximumFollowers:null,targetRiderId:null,metadata:{}},
 ],
}
function createStartingState(withEstablishedBreakaway:boolean){
 const state=createInitialState(stageInput)
 if(!withEstablishedBreakaway)return state
 const pelotons=Object.values(state.groups).filter(g=>g.active&&g.groupType==='peloton')
 if(pelotons.length!==1)throw Error('One initial peloton required')
 // Explicit scenario setup only. The breakaway is already ~90 seconds ahead
 // at the moment our observation begins, as in the prior chase lifecycle POC.
 // NOT evidence that the engine's attack order created a 90-second gap.
 return createBreakawayGroup({state,sourceGroupId:pelotons[0].groupId,
  riderIds:[establishedEscape.riderId],speedKmh:38,initialGapSeconds:90}).state
}
function run(enabled:boolean,withEstablishedBreakaway=false){
 const result=runCalibratedTerrainSeparationStage(createStartingState(withEstablishedBreakaway),{
  experimentalPhysicalAttackLaunch:enabled,
  experimentalChaseOrdersEnabled:enabled,
  experimentalFinishTacticsEnabled:enabled,
 })
 const riders=Object.values(result.finalState.riders)
 const ranks=riders.map(r=>r.finishPosition)
 const orders=Object.values(result.finalState.orders)
 const firstAttack=result.ticks.find(t=>t.appliedOrderEffects.attackEffects.length>0)
 const launch=firstAttack?.appliedOrderEffects.attackEffects[0]
 const separationId=launch?.separation.breakawayGroupId
 const attackMove=firstAttack?.movement.movement.proposals.find(p=>p.groupId===separationId)
 const firstCatch=result.ticks.find(t=>separationId&&t.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(separationId))
 const chaseTicks=result.ticks.filter(t=>{
  const peloton=t.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const breakaway=t.movement.movement.proposals.find(p=>p.groupType==='breakaway')
  return !!peloton&&!!breakaway&&
   t.appliedOrders.state.orders['mixed-chase']?.status==='executed'&&
   t.appliedOrderEffects.state.groups[breakaway.groupId]?.distanceKm>
    t.appliedOrderEffects.state.groups[peloton.groupId]?.distanceKm
 })
 const chaseTimeline=result.ticks.filter(t=>
  t.appliedOrders.state.orders['mixed-chase']?.status==='executed'&&
  t.movement.movement.proposals.some(p=>p.groupType==='breakaway')&&
  t.movement.movement.proposals.some(p=>p.groupType==='peloton'))
  .slice(0,8).map(t=>{
   const peloton=t.movement.movement.proposals.find(p=>p.groupType==='peloton')!
   const breakaway=t.movement.movement.proposals.find(p=>p.groupType==='breakaway')!
   const prePeloton=t.appliedOrderEffects.state.groups[peloton.groupId]
   const preBreakaway=t.appliedOrderEffects.state.groups[breakaway.groupId]
   const preGapKm=prePeloton&&preBreakaway?
    preBreakaway.distanceKm-prePeloton.distanceKm:null
   const preGapSeconds=preGapKm===null?null:
    preGapKm/Math.max(prePeloton.speedKmh,0.000001)*3600
   const chased=t.appliedEnergy.applications.find(a=>a.riderId===pursuer.riderId)
   return {
    raceSecond:t.state.raceSecond,preGapKm,preGapSeconds,
    pelotonSpeedKmh:peloton.appliedSpeedKmh,
    escapeSpeedKmh:breakaway.appliedSpeedKmh,
    pursuitEligibleBeforeMovement:preGapSeconds!==null&&preGapSeconds>=5,
    breakawayActiveAfterTick:!!t.state.groups[breakaway.groupId]?.active,
    chaseRiderEnergyUsedThisTick:chased?.energyCost??null,
   }
  })
 const sprinterResult=result.finalState.riders[sprinter.riderId]
 const leadoutResult=result.finalState.riders[leadout.riderId]
 const pursued=result.finalState.riders[pursuer.riderId]
 const eventTypes=result.events.map(e=>e.eventType)
 const officialTimes=riders.map(r=>r.finishTimeSeconds)
 return {enabled,completed:result.completed,
  totalRiders:riders.length,allFinished:riders.every(r=>r.stageStatus==='finished'),
  uniquePositions:new Set(ranks).size===riders.length&&ranks.every(r=>r!==null),
  allTimesFinite:officialTimes.every(v=>typeof v==='number'&&Number.isFinite(v)),
  executedOrders:orders.filter(o=>o.status==='executed').map(o=>o.orderId).sort(),
  realAttackEvents:eventTypes.filter(e=>e==='ATTACK_STARTED').length,
  launchSpeedKmh:launch?.separation.breakawayGroup.speedKmh??null,
  firstAttackMovementSpeedKmh:attackMove?.appliedSpeedKmh??null,
  caughtAttack:!!firstCatch,
  chaseEligibleMovementTicks:chaseTicks.length,
  chaseTimeline,
  maxActiveGroups:Math.max(...result.ticks.map(t=>
   Object.values(t.state.groups).filter(g=>g.active).length)),
  sprinterRank:sprinterResult.finishPosition,
  sprinterTime:sprinterResult.finishTimeSeconds,
  sprinterEnergy:sprinterResult.energy,
  leadoutEnergy:leadoutResult.energy,pursuerEnergy:pursued.energy,
  classificationHash:createHash('sha256').update(JSON.stringify(riders
   .map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy])
   .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex').slice(0,20),
  orderEvents:eventTypes.filter(e=>e==='ORDER_EXECUTED').length,
 }
}
const off=run(false)
const on=run(true)
const establishedOff=run(false,true)
const establishedOn=run(true,true)
const requiredOrderIds=['mixed-attack','mixed-chase','mixed-leadout','mixed-sprint']
const checks={
 bothRacesCompleted:off.completed&&on.completed,
 allRidersConserved:off.totalRiders===stageInput.riders.length&&on.totalRiders===stageInput.riders.length&&
  off.allFinished&&on.allFinished&&off.uniquePositions&&on.uniquePositions,
 validFinishTimes:off.allTimesFinite&&on.allTimesFinite,
 allFourOrdersExecuted:requiredOrderIds.every(id=>off.executedOrders.includes(id)&&on.executedOrders.includes(id)),
 realAttackInBoth:off.realAttackEvents===1&&on.realAttackEvents===1,
 physicalLaunchApplied:on.launchSpeedKmh!==null&&on.firstAttackMovementSpeedKmh!==null&&
  on.firstAttackMovementSpeedKmh>=on.launchSpeedKmh-1e-9,
}
const establishedPhysicalComparison={
 bothCompleted:establishedOff.completed&&establishedOn.completed,
 bothClassified:establishedOff.allFinished&&establishedOn.allFinished&&
  establishedOff.uniquePositions&&establishedOn.uniquePositions&&
  establishedOff.allTimesFinite&&establishedOn.allTimesFinite,
 allFourOrdersExecuted:requiredOrderIds.every(id=>
  establishedOff.executedOrders.includes(id)&&establishedOn.executedOrders.includes(id)),
 eligibleChaseExists:establishedOn.chaseTimeline.some(t=>t.pursuitEligibleBeforeMovement),
 // This test reports rather than forces a particular catch or sprint outcome.
 totalChaseEligibleTicks:establishedOn.chaseTimeline.filter(t=>t.pursuitEligibleBeforeMovement).length,
}
const matchingEligibleTicks=establishedOn.chaseTimeline.filter(t=>t.pursuitEligibleBeforeMovement)
 .map(onTick=>({on:onTick,off:establishedOff.chaseTimeline.find(
  offTick=>offTick.raceSecond===onTick.raceSecond)}))
 .filter(pair=>pair.off&&pair.off.pursuitEligibleBeforeMovement)
const physicalChaseEvidence={
 pairedEligibleTicks:matchingEligibleTicks.length,
 positiveAppliedSpeedDifference:matchingEligibleTicks.some(
  pair=>pair.on.pelotonSpeedKmh>(pair.off?.pelotonSpeedKmh??Infinity)),
 positiveTickEnergyDifference:matchingEligibleTicks.some(
  pair=>pair.on.chaseRiderEnergyUsedThisTick>(pair.off?.chaseRiderEnergyUsedThisTick??Infinity)),
 pursuerFinalEnergyDifference:establishedOff.pursuerEnergy-establishedOn.pursuerEnergy,
}

process.stdout.write(JSON.stringify({reportVersion:'uranius-mixed-tactics-v1',
 scope:'OFFLINE 24km flat 10-rider same-input A/B, four actual orders',
 off,on,establishedOff,establishedOn,establishedPhysicalComparison,physicalChaseEvidence,checks,comparison:{
 classificationChanged:off.classificationHash!==on.classificationHash,
 sprintRankDifference:off.sprinterRank!==null&&on.sprinterRank!==null?
  off.sprinterRank-on.sprinterRank:null,
 sprintEnergyDifference:off.sprinterEnergy-on.sprinterEnergy,
 leadoutEnergyDifference:off.leadoutEnergy-on.leadoutEnergy,
 chaseEnergyDifference:off.pursuerEnergy-on.pursuerEnergy,
 chaseHadEligibleMovement:on.chaseEligibleMovementTicks>0,
 chaseHadPhysicalEligibility:on.chaseTimeline.some(t=>t.pursuitEligibleBeforeMovement),
 catchObserved:on.caughtAttack,
 }},null,2)+'\n')
