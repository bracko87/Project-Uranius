// Offline-only small-stage final sprint and lead-out contrast.
// Both runs execute the same two existing TeamOrder lifecycles. The only
// difference is explicit finishing-tactic opt-in, not rider fitness or route.
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const selected=syntheticTenRiderStage.riders[0]
const helper=syntheticTenRiderStage.riders[1]
const input:StageInput={
 ...syntheticTenRiderStage,
 stageId:'offline-sprint-leadout-poc',
 seed:'fixed-sprint-leadout',
 riders:syntheticTenRiderStage.riders.map(r=>({
  ...r, attributes:{...r.attributes,timeTrial:72,raceIq:70}
 })),
 orders:[
  {orderId:'sprint-a',type:'sprint',status:'scheduled',
   teamId:selected.teamId,riderId:selected.riderId,priority:1,
   eligibleFromKm:8,eligibleUntilKm:10,
   targetRiderId:null,maximumFollowers:null,metadata:{}},
  {orderId:'leadout-a',type:'leadout',status:'scheduled',
   teamId:helper.teamId,riderId:helper.riderId,priority:1,
   eligibleFromKm:8,eligibleUntilKm:10,
   targetRiderId:selected.riderId,maximumFollowers:null,metadata:{}},
 ],
}
function run(enabled:boolean){
 const stage=runCalibratedTerrainSeparationStage(createInitialState(input),{
  experimentalFinishTacticsEnabled:enabled,
 })
 const rider=stage.finalState.riders[selected.riderId]
 const support=stage.finalState.riders[helper.riderId]
 const final=Object.values(stage.finalState.riders)
 const orders=Object.values(stage.finalState.orders)
 const allFinish=final.length===input.riders.length&&final.every(r=>r.finished&&r.finishTimeSeconds!==null)
 const positions=final.map(r=>r.finishPosition)
 return {enabled,completed:stage.completed,allFinish,
  validRanks:new Set(positions).size===input.riders.length&&positions.every(p=>p!==null),
  ordersExecuted:orders.filter(o=>o.status==='executed').map(o=>o.orderId).sort(),
  selectedPosition:rider.finishPosition,selectedTime:rider.finishTimeSeconds,
  selectedEnergy:rider.energy,leadoutEnergy:support.energy,
  firstFive:final.slice().sort((a,b)=>(a.finishPosition??0)-(b.finishPosition??0)).slice(0,5)
   .map(r=>({id:r.riderId,position:r.finishPosition,time:r.finishTimeSeconds})),
 }
}
const off=run(false)
const on=run(true)
process.stdout.write(JSON.stringify({reportVersion:'uranius-finish-tactics-poc-v1',
 scope:'OFFLINE 10km / 10 riders / same orders and seed, only finish-tactics flag differs',
 off,on,comparison:{
  valid:off.completed&&on.completed&&off.allFinish&&on.allFinish&&off.validRanks&&on.validRanks,
  bothOrdersExecuted:off.ordersExecuted.length===2&&on.ordersExecuted.length===2,
  selectedRankImproved:on.selectedPosition!==null&&off.selectedPosition!==null&&on.selectedPosition<off.selectedPosition,
  selectedEnergyCost:off.selectedEnergy-on.selectedEnergy,
  helperEnergyCost:off.leadoutEnergy-on.leadoutEnergy,
  selectedOfficialTimeUnchanged:off.selectedTime===on.selectedTime,
 }},null,2)+'\n')
