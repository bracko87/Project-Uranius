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

type Mode='control'|'orders-off'|'leaders-on'
function run(mode:Mode){
 const race=runCalibratedTerrainSeparationStage(
  createInitialState(mode==='control'?starting:withOrders),{
   ...baseOptions,experimentalFundedPelotonLeadershipEnabled:mode==='leaders-on',
  })
 const groups=race.ticks.map(t=>{
  const peloton=t.previousState.groups['peloton_main']
  const proposal=t.movement.movement.proposals.find(p=>p.groupId==='peloton_main')
  if(!peloton?.active||!proposal)return null
  const members=peloton.riderIds.map(id=>t.previousState.riders[id])
   .filter(r=>r?.stageStatus==='racing')
  if(members.length===0)return null
  const leaders=calculatePelotonPaceLeadership({
   riders:members,
   minimumSpeedKmh:t.previousState.input.settings.minimumSpeedKmh,
   maximumSpeedKmh:t.previousState.input.settings.maximumSpeedKmh,
   raceSecond:t.previousState.raceSecond,
   tickSeconds:t.previousState.input.settings.tickSeconds,
   eligibleOrderedRiderIds:chaseRiders.map(r=>r.riderId),
  })
  const pace=calculatePelotonBasePace({
   riders:members,minimumSpeedKmh:t.previousState.input.settings.minimumSpeedKmh,
   maximumSpeedKmh:t.previousState.input.settings.maximumSpeedKmh,
  })
  const gap=Object.values(t.previousState.groups)
   .filter(g=>g.active&&g.groupType==='breakaway'&&g.distanceKm>peloton.distanceKm)
   .reduce((m,g)=>Math.max(m,g.distanceKm-peloton.distanceKm),0)
  const charged=t.appliedEnergy.applications.filter(a=>
   a.groupId==='peloton_main'&&(a.experimentalPullerEnergySurcharge??0)>0)
  return {second:t.state.raceSecond,km:proposal.nextDistanceKm,
   actualSpeedKmh:proposal.appliedSpeedKmh,
   baseSpeedKmh:pace.baseSpeedKmh,
   groupMeanCapability:pace.averageCapabilityScore,
   qualifiedLeaderCapability:leaders.leaderCapabilityMean,
   qualifiedLeaderPotentialKmh:leaders.potentialLeaderBaseKmh,
   leaderPotentialGainPercent:leaders.potentialGainPercent,
   eligibleLeaders:leaders.designatedRiderIds,
   aheadBreakawayGapKm:gap,chargedLeaders:charged.length,
   paidEnergy:charged.reduce((n,a)=>n+(a.experimentalPullerEnergySurcharge??0),0)}
 }).filter((x):x is NonNullable<typeof x>=>x!==null)
 const finishers=Object.values(race.finalState.riders)
 const pelotonMembers=race.finalState.groups['peloton_main']?.riderIds??[]
 const pelotonFinishers=pelotonMembers.map(id=>race.finalState.riders[id])
 const firstPeloton=pelotonFinishers.reduce((best,r)=>
  !best||(r.finishTimeSeconds??Infinity)<(best.finishTimeSeconds??Infinity)?r:best,
  null as typeof pelotonFinishers[number]|null)
 const selected=race.finalState.riders['sustain-rider-001']
 const paidTicks=groups.filter(g=>g.paidEnergy>0)
 const chasing=groups.filter(g=>g.aheadBreakawayGapKm>0)
 const avg=(values:number[])=>values.length?
  values.reduce((n,x)=>n+x,0)/values.length:null
 const benefit=chasing.map(g=>g.qualifiedLeaderPotentialKmh-g.baseSpeedKmh)
 return {mode,completed:race.completed,finishCount:finishers.filter(r=>r.stageStatus==='finished').length,
  selectedRank:selected.finishPosition,selectedFinishSeconds:selected.finishTimeSeconds,
  firstPelotonFinisherId:firstPeloton?.riderId??null,
  firstPelotonFinishSeconds:firstPeloton?.finishTimeSeconds??null,
  soloToFirstPelotonSeconds:firstPeloton&&selected.finishTimeSeconds!=null&&firstPeloton.finishTimeSeconds!=null?
    firstPeloton.finishTimeSeconds-selected.finishTimeSeconds:null,
  pelotonSize:pelotonMembers.length,executedOrders:chaseOrders.filter(o=>
   race.finalState.orders[o.orderId]?.status==='executed').length,
  totalPaidLeaderEnergy:paidTicks.reduce((n,g)=>n+g.paidEnergy,0),
  paidLeaderTicks:paidTicks.length,breakawayAheadTicks:chasing.length,
  averageWholePelotonCapability:avg(chasing.map(g=>g.groupMeanCapability)),
  averageQualifiedLeaderCapability:avg(chasing.map(g=>g.qualifiedLeaderCapability)),
  meanAuthorizedPotentialGainKmh:avg(benefit),
  meanActualPelotonSpeedKmh:avg(chasing.map(g=>g.actualSpeedKmh)),
  firstChaseTick:chasing[0]??null,
  midChaseTick:chasing[Math.floor(chasing.length/2)]??null,
  lastChaseTick:chasing.at(-1)??null}
}
const cases=[run('control'),run('orders-off'),run('leaders-on')]
const [control,off,on]=cases
const checks={
 allRealRacesComplete:cases.every(c=>c.completed&&c.finishCount===128),
 firstPelotonFinisherFound:cases.every(c=>c.firstPelotonFinisherId!==null&&
  c.soloToFirstPelotonSeconds!==null),
 noOrdersBaselineIdentical:control.selectedFinishSeconds===off.selectedFinishSeconds&&
  control.soloToFirstPelotonSeconds===off.soloToFirstPelotonSeconds,
 authorizedFunded:control.totalPaidLeaderEnergy===0&&off.totalPaidLeaderEnergy===0&&
  on.executedOrders===24&&on.paidLeaderTicks>0&&on.totalPaidLeaderEnergy>0,
 nonzeroAvailableLeaderPace:on.meanAuthorizedPotentialGainKmh!==null&&
  on.meanAuthorizedPotentialGainKmh>0,
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-peloton-front-gap-leadership-v1',
 checks,cases,note:'True solo-to-first-peloton-finisher gap, not whole-field spread. Existing default-off leadership rules only. No new physics.'
},null,2)+'\n')
