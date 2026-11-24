// Offline-only direct one-tick pursuit probe, no hosted engine or DB.
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createBreakawayGroup} from '../src/race-engine/simulation/createBreakawayGroup'
import {simulateIntegratedTerrainSeparationTick} from '../src/race-engine/simulation/runIntegratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'
const actor=syntheticTenRiderStage.riders[0]
const escape=syntheticTenRiderStage.riders[5]
const order={orderId:'pursuit-1',teamId:actor.teamId,riderId:actor.riderId,
 type:'chase' as const,status:'scheduled' as const,eligibleFromKm:0,
 eligibleUntilKm:10,priority:1,targetRiderId:null,maximumFollowers:null,
 metadata:{}}
const input:StageInput={...syntheticTenRiderStage,seed:'chase-one-tick-same-seed',
 orders:[order],riders:syntheticTenRiderStage.riders.map(r=>({
 ...r,attributes:{...r.attributes,timeTrial:72,raceIq:70}}))}
function createPhysicalBreakaway(stageInput:StageInput){
 const initial=createInitialState(stageInput)
 const pelotons=Object.values(initial.groups).filter(g=>g.active&&g.groupType==='peloton')
 if(pelotons.length!==1)throw Error('Expected exactly one initial active peloton')
 return createBreakawayGroup({
  state:initial,sourceGroupId:pelotons[0].groupId,
  riderIds:[escape.riderId],speedKmh:38,initialGapSeconds:30,
 }).state
}
const baseline=createPhysicalBreakaway(input)
function run(enabled:boolean,state=baseline){
 const tick=simulateIntegratedTerrainSeparationTick(state,{
  experimentalChaseOrdersEnabled:enabled,
 })
 const peloton=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
 const breakaway=tick.movement.movement.proposals.find(p=>p.groupType==='breakaway')
 if(!peloton||!breakaway)throw Error('Both physical movement proposals are required')
 const gapKm=breakaway.nextDistanceKm-peloton.nextDistanceKm
 const energy=tick.appliedEnergy.state.riders[actor.riderId].energy
 return {enabled,orderStatus:tick.state.orders[order.orderId].status,
  pelotonSpeedKmh:peloton.appliedSpeedKmh,
  breakawaySpeedKmh:breakaway.appliedSpeedKmh,gapKm,actorEnergy:energy,
  rosterConserved:Object.values(tick.state.riders).length===input.riders.length,
  breakawayStillActive:!!tick.state.groups.breakaway_1?.active}
}
const control=run(false)
const experiment=run(true)
const noOrderBreakaway=createPhysicalBreakaway({...input,orders:[]})
const noOrder=simulateIntegratedTerrainSeparationTick(noOrderBreakaway,{
 experimentalChaseOrdersEnabled:true,
})
const noOrderPace=noOrder.movement.movement.proposals.find(p=>p.groupType==='peloton')
const comparison={
 bothExecuted:control.orderStatus==='executed'&&experiment.orderStatus==='executed',
 speedImproved:experiment.pelotonSpeedKmh>control.pelotonSpeedKmh,
 gapReduced:experiment.gapKm<control.gapKm,
 moreEnergyConsumed:experiment.actorEnergy<control.actorEnergy,
 noOrderNeutral:noOrderPace?.appliedSpeedKmh===control.pelotonSpeedKmh,
 unforcedCatch:experiment.breakawayStillActive&&control.breakawayStillActive,
 rosterConserved:control.rosterConserved&&experiment.rosterConserved,
}
// Continue the SAME initial state over eight actual movement/energy ticks.
// This is long enough to test persistence but is not a claim of full-stage balance.
function runRepeated(enabled:boolean, startingState=baseline, steps=8){
 let state=startingState
 const samples:Array<{
  second:number,physicalGapKm:number|null,pelotonSpeedKmh:number|null,
  breakawaySpeedKmh:number|null,actorEnergy:number,orderStatus:string|null,
  groups:number,riders:number
 }>=[]
 for(let index=0;index<steps&&!state.completed;index++){
  const tick=simulateIntegratedTerrainSeparationTick(state,{
   experimentalChaseOrdersEnabled:enabled,
  })
  const peloton=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const breakaway=tick.movement.movement.proposals.find(p=>p.groupType==='breakaway')
  const currentPeloton=Object.values(tick.state.groups).find(g=>g.active&&g.groupType==='peloton')
  const currentBreakaway=Object.values(tick.state.groups).find(g=>g.active&&g.groupType==='breakaway')
  samples.push({second:tick.state.raceSecond,
   physicalGapKm:currentPeloton&&currentBreakaway
    ?currentBreakaway.distanceKm-currentPeloton.distanceKm:null,
   pelotonSpeedKmh:peloton?.appliedSpeedKmh??null,
   breakawaySpeedKmh:breakaway?.appliedSpeedKmh??null,
   actorEnergy:tick.state.riders[actor.riderId].energy,
   orderStatus:tick.state.orders[order.orderId]?.status??null,
   groups:Object.values(tick.state.groups).filter(g=>g.active).length,
   riders:Object.keys(tick.state.riders).length,
  })
  state=tick.state
 }
 return {enabled,samples,completed:state.completed,finalActorEnergy:state.riders[actor.riderId].energy,
  finalGapKm:samples.at(-1)?.physicalGapKm??null}
}
const repeatedControl=runRepeated(false)
const repeatedChase=runRepeated(true)
const repeatedNoOrder=runRepeated(true,noOrderBreakaway)
const sameSamples=repeatedControl.samples.length===8&&
 repeatedChase.samples.length===8&&repeatedNoOrder.samples.length===8
const physicalGapsPresent=sameSamples&&repeatedControl.samples.every((sample,index)=>
 sample.physicalGapKm!==null&&sample.physicalGapKm>0&&
 (repeatedChase.samples[index]?.physicalGapKm??-1)>0)
const repeatedComparison={
 sameTickCount:sameSamples,
 physicalGapsPresent,
 allRidersConserved:[repeatedControl,repeatedChase,repeatedNoOrder].every(run=>
  run.samples.every(sample=>sample.riders===input.riders.length)),
 chaseOrderRemainsExecuted:repeatedChase.samples.every(sample=>sample.orderStatus==='executed'),
 sustainedGapReduction:physicalGapsPresent&&
  repeatedChase.finalGapKm!==null&&repeatedControl.finalGapKm!==null&&
  repeatedChase.finalGapKm<repeatedControl.finalGapKm,
 sustainedEnergyCost:repeatedChase.finalActorEnergy<repeatedControl.finalActorEnergy,
 noOrderNeutralEveryTick:sameSamples&&repeatedNoOrder.samples.every((sample,index)=>
  sample.pelotonSpeedKmh===repeatedControl.samples[index].pelotonSpeedKmh&&
  sample.physicalGapKm===repeatedControl.samples[index].physicalGapKm),
}

process.stdout.write(JSON.stringify({reportVersion:'uranius-chase-order-poc-v1',
 scope:'offline same-seed single-tick, real pre-existing gap, order OFF/ON',
 control,experiment,comparison,repeatedControl,repeatedChase,repeatedNoOrder,repeatedComparison},null,2)+'\n')
