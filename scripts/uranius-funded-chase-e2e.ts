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
const chaseOrders=['sustain-rider-009','sustain-rider-010'].map((riderId,index)=>({
 orderId:'funded-chase-'+index,type:'chase' as const,status:'scheduled' as const,
 teamId:'sustain-team-02',riderId,
 eligibleFromKm:5,eligibleUntilKm:120,priority:1,
 maximumFollowers:null,targetRiderId:null,
 metadata:{uraniusLiveCommand:true},
}))
const input:StageInput={...starting,orders:[...starting.orders,...chaseOrders]}
const baseOptions={
 experimentalPhysicalAttackLaunch:true,
 experimentalPreserveBirthTickDroppedGroups:true,
 experimentalPreserveRecedingDroppedGroups:true,
 experimentalPreserveTrailingAttackGroups:true,
 experimentalPreserveSeparatingBreakaways:true,
}
function run(mode:'no-chase-orders'|'flag-off'|'flag-on'){
 const chosen=mode==='no-chase-orders'?starting:input
 const initial=createInitialState(chosen)
 const race=runCalibratedTerrainSeparationStage({...initial,
  groupShelterEnergyEnabled:true},{
  ...baseOptions,experimentalBudgetedPelotonChaseEnabled:mode==='flag-on',
 })
 const riders=Object.values(race.finalState.riders)
 const selected=race.finalState.riders['sustain-rider-001']
 const chaseTicks=race.ticks.map(tick=>{
  const paid=tick.appliedEnergy.applications.filter(a=>
   (a.experimentalPullerEnergySurcharge??0)>0)
  const group=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const all=tick.movement.movement.proposals
  return {second:tick.state.raceSecond,paid,
   pelotonSpeedKmh:group?.appliedSpeedKmh??null,
   breakawaySpeedKmh:all.find(p=>p.groupType==='breakaway')?.appliedSpeedKmh??null,
   surchargeTotal:paid.reduce((sum,a)=>sum+(a.experimentalPullerEnergySurcharge??0),0),
   fundedIds:tick.movement.experimentalPullerEnergyCosts??{},
  }
 })
 const positive=chaseTicks.filter(t=>t.surchargeTotal>0)
 const pullerLedgers=chaseOrders.map(o=>{
  const charges=race.ticks.flatMap(t=>t.appliedEnergy.applications.filter(
   a=>a.riderId===o.riderId).map(a=>a.energyCost))
  const initialEnergy=race.initialState.riders[o.riderId].energy
  const finalEnergy=race.finalState.riders[o.riderId].energy
  return {riderId:o.riderId,charges:charges.reduce((sum,n)=>sum+n,0),
   initialEnergy,finalEnergy,
   balanceError:initialEnergy-charges.reduce((sum,n)=>sum+n,0)-finalEnergy,
   surchargeTotal:positive.reduce((sum,t)=>sum+t.paid.filter(a=>
     a.riderId===o.riderId).reduce((v,a)=>v+(a.experimentalPullerEnergySurcharge??0),0),0)}
 })
 return {mode,completed:race.completed,
  finishCount:riders.filter(r=>r.finished&&Number.isFinite(r.finishTimeSeconds)).length,
  positionsUnique:new Set(riders.map(r=>r.finishPosition)).size===field,
  selectedRank:selected.finishPosition,selectedFinishSeconds:selected.finishTimeSeconds,
  finishSpreadSeconds:Math.max(...riders.map(r=>r.finishTimeSeconds??0))-
    Math.min(...riders.map(r=>r.finishTimeSeconds??0)),
  executedOrders:chaseOrders.map(o=>race.finalState.orders[o.orderId]?.status??null),
  positiveChaseTicks:positive.length,
  firstChaseTick:positive[0]??null,
  lastChaseTick:positive.at(-1)??null,
  totalSurcharge:positive.reduce((sum,t)=>sum+t.surchargeTotal,0),
  allChargesOnlyToPeloton:positive.every(t=>t.paid.every(a=>a.groupId==='peloton_main')),
  pullerLedgers,
  trace:chaseTicks}
}
const cases=[run('no-chase-orders'),run('flag-off'),run('flag-on')]
const [noOrders,off,on]=cases
const sameUnmodifiedResult=noOrders.selectedFinishSeconds===off.selectedFinishSeconds&&
 noOrders.selectedRank===off.selectedRank&&
 noOrders.finishSpreadSeconds===off.finishSpreadSeconds
const checks={
 allComplete:cases.every(c=>c.completed&&c.finishCount===field&&c.positionsUnique),
 defaultUnchanged:sameUnmodifiedResult&&off.positiveChaseTicks===0&&noOrders.positiveChaseTicks===0,
 executedChaseOrders:on.executedOrders.every(s=>s==='executed'),
 realFundedChase:on.positiveChaseTicks>0&&on.totalSurcharge>0,
 onlyPelotonPullersCharged:on.allChargesOnlyToPeloton&&on.pullerLedgers.some(p=>p.surchargeTotal>0),
 exactSelectedRiderLedgers:on.pullerLedgers.every(p=>Math.abs(p.balanceError)<0.0001),
 physicallyHigherPelotonSpeed:on.firstChaseTick!==null&&off.trace.some(t=>
  t.second===on.firstChaseTick.second&&t.pelotonSpeedKmh!==null&&
  on.firstChaseTick.pelotonSpeedKmh>t.pelotonSpeedKmh),
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-funded-peloton-chase-e2e-v1',
 cases:cases.map(({trace,...rest})=>rest),checks,
 note:'No automatic chase. No new rule approved. Same 128-rider rolling stage with live orders and explicit energy charges. Offline only.'
},null,2)+'\n')
