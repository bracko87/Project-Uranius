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

type Mode='proximity'|'physical'
function run(count:8|24,mode:Mode){
 const orders=chaseOrders.slice(0,count)
 const input:StageInput={...starting,orders:[...starting.orders,...orders]}
 const race=runCalibratedTerrainSeparationStage(createInitialState(input),{
  ...baseOptions,experimentalCapabilityBasedLeadershipEnabled:true,
  experimentalRequirePhysicalBreakawayCatch:mode==='physical',
 })
 const selected=race.finalState.riders['sustain-rider-001']
 const group=race.finalState.groups['peloton_main']
 const reference=Math.min(...group.riderIds.filter(id=>id!==selected.riderId)
  .map(id=>race.finalState.riders[id].finishTimeSeconds??Infinity))
 const snap=race.ticks.filter(t=>t.state.raceSecond>=480&&t.state.raceSecond<=600).map(t=>{
  const before=t.previousState,afterMove=t.appliedMovement.state
  const peloton=before.groups['peloton_main']
  const movePeloton=afterMove.groups['peloton_main']
  const breakaway=afterMove.groups['breakaway_1']
  const riders=peloton.riderIds.map(id=>before.riders[id]).filter(r=>r.stageStatus==='racing')
  const authorized=orders.filter(o=>before.orders[o.orderId]?.status==='executed'&&
   before.currentKm>=o.eligibleFromKm&&before.currentKm<o.eligibleUntilKm).map(o=>o.riderId)
  const funded=calculateFundedPelotonLeadership({
   riders,minimumSpeedKmh:before.input.settings.minimumSpeedKmh,
   maximumSpeedKmh:before.input.settings.maximumSpeedKmh,
   raceSecond:before.raceSecond,tickSeconds:before.input.settings.tickSeconds,
   eligibleOrderedRiderIds:authorized,experimentalCapabilityBasedFunding:true,
   experimentalStableDutyRotation:false,
  })
  const pelotonSpeed=t.movement.movement.proposals.find(p=>p.groupId==='peloton_main')?.appliedSpeedKmh??null
  const breakSpeed=t.movement.movement.proposals.find(p=>p.groupId==='breakaway_1')?.appliedSpeedKmh??null
  return {second:t.state.raceSecond,leaderIds:funded.selectedRiderIds,
   bonusPercent:funded.fundedBonusPercent,
   pelotonSpeedKmh:pelotonSpeed,breakawaySpeedKmh:breakSpeed,
   gapAfterMovementMetres:breakaway&&movePeloton?
    1000*(breakaway.distanceKm-movePeloton.distanceKm):null,
   reabsorbedBreakawayIds:t.reconciledBreakaways.reabsorbedBreakawayGroupIds,
   chargedEnergy:t.appliedEnergy.applications.reduce((n,a)=>
    n+(a.experimentalPullerEnergySurcharge??0),0)}
 })
 const allApplications=race.ticks.flatMap(t=>t.appliedEnergy.applications)
 const paid=allApplications.filter(a=>(a.experimentalPullerEnergySurcharge??0)>0)
 const unauthorizedPaid=paid.filter(a=>!orders.some(o=>o.riderId===a.riderId))
 const ledgers=orders.map(o=>{
  const initial=race.initialState.riders[o.riderId].energy
  const final=race.finalState.riders[o.riderId].energy
  const debits=allApplications.filter(a=>a.riderId===o.riderId).reduce((v,a)=>v+a.energyCost,0)
  return Math.abs(initial-final-debits)
 })
 const caught=race.ticks.find(t=>
  t.previousState.riders[selected.riderId].currentGroupId!=='peloton_main'&&
  t.state.riders[selected.riderId].currentGroupId==='peloton_main')
 return {leaderCount:count,mode,completed:race.completed,
  finishers:Object.values(race.finalState.riders).filter(r=>r.stageStatus==='finished').length,
  rank:selected.finishPosition,soloFinishSeconds:selected.finishTimeSeconds,
  firstPelotonFinishSeconds:reference,
  gapSeconds:reference-(selected.finishTimeSeconds??0),
  catchSecond:caught?.state.raceSecond??null,
  paidEnergy:paid.reduce((n,a)=>n+(a.experimentalPullerEnergySurcharge??0),0),
  fundedTicks:race.ticks.filter(t=>t.appliedEnergy.applications.some(a=>
   (a.experimentalPullerEnergySurcharge??0)>0)).length,
  unauthorizedPaidCount:unauthorizedPaid.length,
  maxLedgerResidual:Math.max(0,...ledgers),trace:snap}
}
const cases=[run(8,'proximity'),run(24,'proximity'),run(8,'physical'),run(24,'physical')]
const [old8,old24,physical8,physical24]=cases
const checks={
 fourFullRaces:cases.every(c=>c.completed&&c.finishers===128),
 oldCaptureFingerprint:old8.catchSecond===510&&old8.rank===126&&
  old8.trace.find(t=>t.second===510)?.reabsorbedBreakawayIds.includes('breakaway_1')===true,
 oldTwentyFourFingerprint:old24.catchSecond===null&&old24.rank===1&&
  Math.abs(old24.gapSeconds-190.978210843)<1e-6,
 noPrematureEightCatch:physical8.catchSecond!==510&&
  physical8.trace.find(t=>t.second===510)?.reabsorbedBreakawayIds.length===0&&
  (physical8.trace.find(t=>t.second===510)?.gapAfterMovementMetres??0)>0,
 noUnauthorizedCharges:cases.every(c=>c.unauthorizedPaidCount===0),
 noOverDebit:cases.every(c=>c.maxLedgerResidual<0.0001),
 physicalChasePaid:[physical8,physical24].every(c=>c.paidEnergy>0&&c.fundedTicks>0),
 physicalRulePreservesTwentyFourEarly:physical24.trace.find(t=>t.second===510)?.
  reabsorbedBreakawayIds.length===0,
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-physical-breakaway-catch-v1',checks,cases,
 note:'Four real 128-rider offline races. Physical catch candidate remains default OFF. Catch outcomes are observed, not forced or required to be monotonic.'
},null,2)+'\n')
