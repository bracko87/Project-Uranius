// Offline lifecycle probe: a weaker escape vs a stronger escape.
// No forced catch or artificial protection; record actual reabsorption.
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {createBreakawayGroup} from '../src/race-engine/simulation/createBreakawayGroup'
import {simulateIntegratedTerrainSeparationTick} from '../src/race-engine/simulation/runIntegratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const chaseActor=syntheticTenRiderStage.riders[0]
const escapeActor=syntheticTenRiderStage.riders[5]
const order={orderId:'lifecycle-chase',type:'chase' as const,status:'scheduled' as const,
 teamId:chaseActor.teamId,riderId:chaseActor.riderId,
 priority:1,eligibleFromKm:0,eligibleUntilKm:24,
 targetRiderId:null,maximumFollowers:null,metadata:{}}
type EscapeAbility='weaker'|'stronger'
function makeInput(ability:EscapeAbility):StageInput{
 return {...syntheticTenRiderStage,stageId:'chase-lifecycle-'+ability,
  stageName:'Fictional 24km flat chase '+ability,distanceKm:24,
  seed:'chase-lifecycle-'+ability,
  profilePoints:[0,6,12,18,24].map(kilometre=>({kilometre,elevationMetres:100})),
  orders:[order],riders:syntheticTenRiderStage.riders.map(r=>{
   const escape=r.riderId===escapeActor.riderId
   return {...r,attributes:{...r.attributes,
    ...(escape?{flat:ability==='weaker'?40:99,stamina:ability==='weaker'?55:95,
     resistance:ability==='weaker'?55:95,teamwork:ability==='weaker'?45:95}:{}),
    timeTrial:72,raceIq:70}}
  })}
}
function prepare(input:StageInput,initialGapSeconds:number){
 const initial=createInitialState(input)
 const pelotons=Object.values(initial.groups).filter(g=>g.active&&g.groupType==='peloton')
 if(pelotons.length!==1)throw Error('Exactly one initial active peloton required')
 const separated=createBreakawayGroup({state:initial,sourceGroupId:pelotons[0].groupId,
  riderIds:[escapeActor.riderId],speedKmh:38,initialGapSeconds})
 return {state:separated.state,breakawayId:separated.breakawayGroupId,
  pelotonId:pelotons[0].groupId}
}
function simulate(ability:EscapeAbility,enabled:boolean){
 const input=makeInput(ability)
 const start=prepare(input,ability==='weaker'?30:90)
 let state=start.state
 let firstCatchTick:number|null=null
 let physicalCatchEvidence:boolean|null=null
 let previousGapKm:number|null=null
 let minimumPositiveGapKm=Infinity
 let maximumGapKm=-Infinity
 const trace:Array<{second:number,breakawayGapKm:number|null,
  pelotonSpeedKmh:number|null,escapeSpeedKmh:number|null,
  chasedRiderEnergy:number,escapeEnergy:number,activeBreakaway:boolean,
  reabsorbed:boolean,groupCount:number,riderCount:number}>=[]
 for(let i=0;i<36&&!state.completed;i++){
  const tick=simulateIntegratedTerrainSeparationTick(state,{experimentalChaseOrdersEnabled:enabled})
  const beforeCatch=tick.reconciledBreakaways.previousState.groups[start.breakawayId]
  const pelotonBeforeCatch=tick.reconciledBreakaways.previousState.groups[start.pelotonId]
  const wasCaught=tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(start.breakawayId)
  if(wasCaught&&firstCatchTick===null){
   firstCatchTick=i+1
   physicalCatchEvidence=!!beforeCatch&&!!pelotonBeforeCatch&&
    (beforeCatch.distanceKm<=pelotonBeforeCatch.distanceKm||
     (beforeCatch.gapFromLeaderSeconds-pelotonBeforeCatch.gapFromLeaderSeconds)<5)
  }
  const activeBreakaway=!!tick.state.groups[start.breakawayId]?.active
  const physicalGap=activeBreakaway&&beforeCatch&&pelotonBeforeCatch
   ?beforeCatch.distanceKm-pelotonBeforeCatch.distanceKm:null
  if(physicalGap!==null){
   minimumPositiveGapKm=Math.min(minimumPositiveGapKm,physicalGap)
   maximumGapKm=Math.max(maximumGapKm,physicalGap)
  }
  const p=tick.movement.movement.proposals.find(p=>p.groupId===start.pelotonId)
  const b=tick.movement.movement.proposals.find(p=>p.groupId===start.breakawayId)
  trace.push({second:tick.state.raceSecond,
   breakawayGapKm:physicalGap,
   pelotonSpeedKmh:p?.appliedSpeedKmh??null,escapeSpeedKmh:b?.appliedSpeedKmh??null,
   chasedRiderEnergy:tick.state.riders[chaseActor.riderId].energy,
   escapeEnergy:tick.state.riders[escapeActor.riderId].energy,
   activeBreakaway,reabsorbed:wasCaught,
   groupCount:Object.values(tick.state.groups).filter(g=>g.active).length,
   riderCount:Object.keys(tick.state.riders).length})
  if(previousGapKm!==null&&physicalGap!==null&&physicalGap<previousGapKm-1e-9){
   // This is a real distance change, not a fabricated gap adjustment.
  }
  previousGapKm=physicalGap
  state=tick.state
 }
 const finalPeloton=state.groups[start.pelotonId]
 return {ability,enabled,
  ticks:trace.length,completed:state.completed,orderStatus:state.orders[order.orderId].status,
  firstCatchTick,physicalCatchEvidence,
  breakawayStillActive:!!state.groups[start.breakawayId]?.active,
  escapeNowInPeloton:state.riders[escapeActor.riderId].currentGroupId===start.pelotonId,
  firstGapKm:38*(ability==='weaker'?30:90)/3600,
  minimumPositiveGapKm:Number.isFinite(minimumPositiveGapKm)?minimumPositiveGapKm:null,
  maximumGapKm:Number.isFinite(maximumGapKm)?maximumGapKm:null,
  lastActiveGapKm:[...trace].reverse().find(t=>t.breakawayGapKm!==null)?.breakawayGapKm??null,
  actorEnergy:state.riders[chaseActor.riderId].energy,
  escapeEnergy:state.riders[escapeActor.riderId].energy,
  ridersConserved:trace.every(t=>t.riderCount===input.riders.length),
  groupIntegrity:trace.every(t=>t.groupCount>=1),
  escapedFinished:state.riders[escapeActor.riderId].stageStatus==='finished',
  pelotonActive:!!finalPeloton?.active,
  sample:trace.filter((_,i)=>i===0||(i+1)%6===0||trace[i].reabsorbed)}
}
const results=[simulate('weaker',false),simulate('weaker',true),
 simulate('stronger',false),simulate('stronger',true)]
const weakerOff=results[0],weakerOn=results[1],strongerOff=results[2],strongerOn=results[3]
const checks={
 allRidersConserved:results.every(r=>r.ridersConserved&&r.groupIntegrity),
 realExecutedOrders:results.every(r=>r.orderStatus==='executed'),
 noFabricatedCatch:results.every(r=>r.firstCatchTick===null||
  r.physicalCatchEvidence===true&&r.escapeNowInPeloton),
 sameScenarioTickHorizon:weakerOff.ticks===weakerOn.ticks&&
  strongerOff.ticks===strongerOn.ticks,
 validRecordedGaps:results.every(r=>r.firstGapKm>0&&r.maximumGapKm!==null),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-chase-lifecycle-v1',
 note:'Outcomes are observed, not asserted: a weak rider may escape or be caught based on physical pace.',
 results,checks,comparison:{
 weakerCatchTickOff:weakerOff.firstCatchTick,weakerCatchTickOn:weakerOn.firstCatchTick,
 strongerSurvivesOff:strongerOff.breakawayStillActive,
 strongerSurvivesOn:strongerOn.breakawayStillActive,
 weakerEnergyDifference:weakerOff.actorEnergy-weakerOn.actorEnergy,
 strongerEnergyDifference:strongerOff.actorEnergy-strongerOn.actorEnergy,
 }},null,2)+'\n')
