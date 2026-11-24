// OFFLINE POC ONLY: combine real attack, chase, sprint and lead-out orders.
// Same StageInput and seed for control and full opt-in. No synthetic initial gap.
import {createHash} from 'node:crypto'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const sprinter=syntheticTenRiderStage.riders[0]
const leadout=syntheticTenRiderStage.riders[1]
const pursuer=syntheticTenRiderStage.riders[2]
const attacker=syntheticTenRiderStage.riders[5]
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
function run(enabled:boolean){
 const result=runCalibratedTerrainSeparationStage(createInitialState(stageInput),{
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
process.stdout.write(JSON.stringify({reportVersion:'uranius-mixed-tactics-v1',
 scope:'OFFLINE 24km flat 10-rider same-input A/B, four actual orders',
 off,on,checks,comparison:{
 classificationChanged:off.classificationHash!==on.classificationHash,
 sprintRankDifference:off.sprinterRank!==null&&on.sprinterRank!==null?
  off.sprinterRank-on.sprinterRank:null,
 sprintEnergyDifference:off.sprinterEnergy-on.sprinterEnergy,
 leadoutEnergyDifference:off.leadoutEnergy-on.leadoutEnergy,
 chaseEnergyDifference:off.pursuerEnergy-on.pursuerEnergy,
 chaseHadEligibleMovement:on.chaseEligibleMovementTicks>0,
 catchObserved:on.caughtAttack,
 }},null,2)+'\n')
