// OFFLINE end-to-end test: physical breakaway plus two executed peloton chase orders.
// Three matched 120km, 128-rider runs; never executes against hosted state.
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'
type Strength=76|82|86|90|94
type Timing='baseline'|'early'|'late'
const field=128
function buildInput(strength:Strength,timing:Timing):StageInput{
 const riders=Array.from({length:field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  const attributes={...base.attributes,
   flat:48+(index*37+11)%48,climbing:47+(index*29+23)%49,
   sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
   stamina:51+(index*19+7)%43,resistance:50+(index*31)%44,
   recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
   timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}
  return {...base,riderId:'sustain-rider-'+String(index+1).padStart(3,'0'),
   teamId:'sustain-team-'+String(team).padStart(2,'0'),
   teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:index===0
    ?{...attributes,flat:strength,climbing:strength,acceleration:strength,
      stamina:strength,resistance:strength,recovery:strength}:attributes}
 })
 const teams=Array.from({length:field/8},(_,i)=>{
  const roster=riders.slice(i*8,i*8+8)
  return {teamId:roster[0].teamId,teamName:roster[0].teamName,
   captainRiderId:roster[0].riderId,riderIds:roster.map(r=>r.riderId)}
 })
 const attacker=riders[0]
 const attackFrom=timing==='early'?5:70
 return {...syntheticTenRiderStage,
  raceId:'uranius-offline-attack-sustainability',stageId:'rolling-120-'+strength,
  stageName:'Fictional rolling 120km attack sustainability',
  seed:'sustainability-fixed-seed',distanceKm:120,teams,riders,
  profilePoints:[100,130,160,120,320,370,280,340,500,400,260,170,140]
   .map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
  orders:timing==='baseline'?[]:[{
   orderId:'sustain-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,
   eligibleFromKm:attackFrom,eligibleUntilKm:attackFrom+3,
   priority:1,maximumFollowers:null,targetRiderId:null,
   metadata:{uraniusLiveCommand:true}}],
 }
}


const starting=buildInput(86,'early')
// Candidates are selected from the actual 127-rider peloton attributes,
// not based on synthetic output positions, gaps or finishing results.
const initialPeloton=createInitialState(starting)
const ranked=Object.values(initialPeloton.riders).filter(r=>r.riderId!=='sustain-rider-001')
 .sort((a,b)=>b.attributes.flat-a.attributes.flat||
  b.attributes.stamina-a.attributes.stamina||
  a.riderId.localeCompare(b.riderId))
const chaseRiders=ranked.slice(0,24)
const chaseOrders=chaseRiders.map((r,index)=>({
 orderId:'leader-chase-'+index,type:'chase' as const,status:'scheduled' as const,
 teamId:r.teamId,riderId:r.riderId,
 eligibleFromKm:5,eligibleUntilKm:120,priority:1,
 maximumFollowers:null,targetRiderId:null,
 metadata:{uraniusLiveCommand:true},
}))
const withOrders:StageInput={...starting,orders:[...starting.orders,...chaseOrders]}
const baseOptions={
 experimentalPhysicalAttackLaunch:true,
 experimentalPreserveBirthTickDroppedGroups:true,
 experimentalPreserveRecedingDroppedGroups:true,
 experimentalPreserveTrailingAttackGroups:true,
 experimentalPreserveSeparatingBreakaways:true,
}

import {calculatePelotonPaceLeadership} from '../src/race-engine/simulation/pelotonPaceLeadership'
import {calculatePelotonBasePace} from '../src/race-engine/simulation/pelotonPace'




import {calculateFundedPelotonLeadership} from '../src/race-engine/simulation/pelotonLeadershipBudget'
type N=8|24
function run(count:N){
 const selectedOrders=chaseOrders.slice(0,count)
 const stage:StageInput={...starting,orders:[...starting.orders,...selectedOrders]}
 const race=runCalibratedTerrainSeparationStage(createInitialState(stage),{
  ...baseOptions,experimentalCapabilityBasedLeadershipEnabled:true
 })
 const timeline=race.ticks.filter(t=>t.state.raceSecond>=450&&t.state.raceSecond<=600).map(t=>{
  const before=t.previousState
  const afterMovement=t.appliedMovement.state
  const after=t.state
  const peloton=before.groups['peloton_main']
  const pelotonNext=afterMovement.groups['peloton_main']
  const attackBefore=before.groups['breakaway_1']
  const attackMoved=afterMovement.groups['breakaway_1']
  const movementPeloton=t.movement.movement.proposals.find(p=>p.groupId==='peloton_main')
  const movementAttack=t.movement.movement.proposals.find(p=>p.groupId==='breakaway_1')
  const members=peloton.riderIds.map(id=>before.riders[id]).filter(r=>r.stageStatus==='racing')
  const authorized=selectedOrders.filter(o=>
   after.orders[o.orderId]?.status==='executed'&&
   before.currentKm>=o.eligibleFromKm&&before.currentKm<o.eligibleUntilKm)
   .map(o=>o.riderId)
  const leadership=calculateFundedPelotonLeadership({
   riders:members,minimumSpeedKmh:before.input.settings.minimumSpeedKmh,
   maximumSpeedKmh:before.input.settings.maximumSpeedKmh,
   raceSecond:before.raceSecond,tickSeconds:before.input.settings.tickSeconds,
   eligibleOrderedRiderIds:authorized,experimentalCapabilityBasedFunding:true,
  })
  const paid=t.appliedEnergy.applications.filter(a=>
   (a.experimentalPullerEnergySurcharge??0)>0)
  const gapBefore=attackBefore&&peloton?attackBefore.distanceKm-peloton.distanceKm:null
  const gapAfterMove=attackMoved&&pelotonNext?attackMoved.distanceKm-pelotonNext.distanceKm:null
  const transition=t.reconciledBreakaways.reabsorbedBreakawayGroupIds
  return {second:t.state.raceSecond,attackerGroupBefore:before.riders['sustain-rider-001'].currentGroupId,
   attackerGroupAfter:after.riders['sustain-rider-001'].currentGroupId,
   gapBeforeKm:gapBefore,gapAfterMoveKm:gapAfterMove,
   attackSpeedKmh:movementAttack?.appliedSpeedKmh??null,
   pelotonSpeedKmh:movementPeloton?.appliedSpeedKmh??null,
   selectedLeaderIds:leadership.selectedRiderIds,
   potentialGainPercent:leadership.fundedBonusPercent,
   fundedCost:paid.reduce((a,p)=>a+(p.experimentalPullerEnergySurcharge??0),0),
   reabsorbedGroups:transition,
   physicallyCaught:gapAfterMove!==null&&gapAfterMove<=0,
   withinFiveSecondWindow:gapAfterMove!==null&&pelotonNext&&
    gapAfterMove<=pelotonNext.speedKmh*5/3600}
 })
 const selected=race.finalState.riders['sustain-rider-001']
 return {authorizedLeaderCount:count,completed:race.completed,
  finishCount:Object.values(race.finalState.riders).filter(r=>r.stageStatus==='finished').length,
  selectedPosition:selected.finishPosition,selectedGroup:selected.currentGroupId,
  selectedFinishTime:selected.finishTimeSeconds,timeline}
}
const cases=[run(8),run(24)]
const [eight,twentyFour]=cases
const eightCatch=eight.timeline.find(t=>t.reabsorbedGroups.includes('breakaway_1'))
const checks={
 bothComplete:cases.every(c=>c.completed&&c.finishCount===128),
 distinctActualLeaders:cases.some(c=>c.timeline.some(t=>t.selectedLeaderIds.length>0))&&
  JSON.stringify(eight.timeline.map(t=>t.selectedLeaderIds))!==
   JSON.stringify(twentyFour.timeline.map(t=>t.selectedLeaderIds)),
 actualEightCatch:eight.selectedGroup==='peloton_main'&&
  eightCatch?.second===510&&
  (eightCatch.physicallyCaught===true||eightCatch.withinFiveSecondWindow===true),
 noTwentyFourCatch:twentyFour.selectedGroup==='breakaway_1'&&
  twentyFour.timeline.every(t=>t.reabsorbedGroups.length===0),
 paidNotFree:cases.every(c=>c.timeline.some(t=>t.fundedCost>0)),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-early-reabsorption-mechanism-v1',
 checks,cases,
 note:'Actual first 450-600 race seconds, movement positions before reconciliation, selected paid leaders and reabsorbed groups. No engine changes.'
},null,2)+'\n')
