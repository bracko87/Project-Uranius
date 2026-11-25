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


type Mode='control'|'fixed-3pct'|'dynamic'
function run(mode:Mode){
 const race=runCalibratedTerrainSeparationStage(
  createInitialState(mode==='control'?starting:withOrders),{
   ...baseOptions,
   experimentalFundedPelotonLeadershipEnabled:mode==='fixed-3pct',
   experimentalCapabilityBasedLeadershipEnabled:mode==='dynamic',
  })
 const selected=race.finalState.riders['sustain-rider-001']
 const finishers=Object.values(race.finalState.riders)
 const mainIds=race.finalState.groups['peloton_main']?.riderIds??[]
 const mainFinishTimes=mainIds.map(id=>race.finalState.riders[id].finishTimeSeconds??Infinity)
 const firstPelotonTime=Math.min(...mainFinishTimes)
 const pelotonTicks=race.ticks.flatMap(t=>{
  const proposal=t.movement.movement.proposals.find(p=>p.groupId==='peloton_main')
  if(!proposal)return []
  const ahead=Object.values(t.previousState.groups).some(g=>
   g.active&&g.groupType==='breakaway'&&
   g.distanceKm>(t.previousState.groups['peloton_main']?.distanceKm??Infinity))
  const authorized=t.appliedEnergy.applications.filter(a=>
   a.groupId==='peloton_main'&&(a.experimentalPullerEnergySurcharge??0)>0)
  return [{second:t.state.raceSecond,speed:proposal.appliedSpeedKmh,
   ahead,charged:authorized.length,
   surcharge:authorized.reduce((n,a)=>n+(a.experimentalPullerEnergySurcharge??0),0)}]
 })
 const paid=pelotonTicks.filter(t=>t.surcharge>0)
 const leaderIds=chaseRiders.map(r=>r.riderId)
 const ledgers=leaderIds.map(id=>{
  const cost=race.ticks.flatMap(t=>t.appliedEnergy.applications.filter(a=>a.riderId===id))
   .reduce((n,a)=>n+a.energyCost,0)
  return race.initialState.riders[id].energy-race.finalState.riders[id].energy-cost
 })
 const mean=(a:number[])=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null
 return {mode,completed:race.completed,
  finishCount:finishers.filter(r=>r.stageStatus==='finished').length,
  selectedRank:selected.finishPosition,selectedFinishTime:selected.finishTimeSeconds,
  firstPelotonFinishTime:firstPelotonTime,
  soloToFirstPelotonSeconds:firstPelotonTime-(selected.finishTimeSeconds??0),
  originalPelotonSize:mainIds.length,
  executedChaseOrders:chaseOrders.filter(o=>
   race.finalState.orders[o.orderId]?.status==='executed').length,
  fundedTicks:paid.length,totalPaidLeaderEnergy:paid.reduce((n,t)=>n+t.surcharge,0),
  chargedLeadersMax:Math.max(0,...paid.map(t=>t.charged)),
  meanPelotonSpeedDuringChase:mean(pelotonTicks.filter(t=>t.ahead).map(t=>t.speed)),
  minimumLeaderEnergy:Math.min(...leaderIds.map(id=>race.finalState.riders[id].energy)),
  meanLeaderEnergy:mean(leaderIds.map(id=>race.finalState.riders[id].energy)),
  maximumLeaderLedgerError:Math.max(...ledgers.map(Math.abs)),
  selectedEnergy: selected.energy,
  firstFundedTick:paid[0]??null,midFundedTick:paid[Math.floor(paid.length/2)]??null,
  lastFundedTick:paid.at(-1)??null}
}
const cases=[run('control'),run('fixed-3pct'),run('dynamic')]
const [control,fixed,dynamic]=cases
const checks={
 allRacesComplete:cases.every(c=>c.completed&&c.finishCount===128),
 baselinePreserved:control.selectedFinishTime===9939.315079131&&
  Math.abs(control.soloToFirstPelotonSeconds-647.108293786)<1e-6&&
  control.totalPaidLeaderEnergy===0,
 historicalCappedModelPreserved:Math.abs(fixed.soloToFirstPelotonSeconds-366.917335395)<1e-6&&
  Math.abs(fixed.totalPaidLeaderEnergy-78.318086)<1e-4,
 realOrdersAndFunding:fixed.executedChaseOrders===24&&
  dynamic.executedChaseOrders===24&&fixed.fundedTicks>0&&dynamic.fundedTicks>0,
 moreCapabilityMoreEnergy:dynamic.totalPaidLeaderEnergy>fixed.totalPaidLeaderEnergy&&
  dynamic.meanPelotonSpeedDuringChase!==null&&fixed.meanPelotonSpeedDuringChase!==null&&
  dynamic.meanPelotonSpeedDuringChase>fixed.meanPelotonSpeedDuringChase,
 chargedRidersHaveEnergy:cases.every(c=>c.minimumLeaderEnergy>=0&&c.meanLeaderEnergy!==null),
 leaderEnergyConserved:cases.every(c=>c.maximumLeaderLedgerError<1e-4),
 noForcedVictory:cases.every(c=>c.selectedRank>0&&Number.isFinite(c.soloToFirstPelotonSeconds)),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-capability-funded-leadership-v1',
 checks,cases,note:'Three full offline races; dynamic model is provisional, default OFF, not a validated real-world energy or chase calibration.'
},null,2)+'\n')
