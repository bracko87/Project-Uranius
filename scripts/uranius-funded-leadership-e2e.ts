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
function run(mode:'control'|'orders-off'|'leaders-on'){
 const input=mode==='control'?starting:withOrders
 const race=runCalibratedTerrainSeparationStage(createInitialState(input),{
  ...baseOptions,experimentalFundedPelotonLeadershipEnabled:mode==='leaders-on'
 })
 const ticks=race.ticks.map(tick=>{
  const proposal=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const extras=tick.appliedEnergy.applications.filter(a=>
   (a.experimentalPullerEnergySurcharge??0)>0)
  return {second:tick.state.raceSecond,
   pelotonSpeedKmh:proposal?.appliedSpeedKmh??null,
   extras:extras.map(a=>({riderId:a.riderId,groupId:a.groupId,
    previousEnergy:a.previousEnergy,nextEnergy:a.nextEnergy,
    energyCost:a.energyCost,surcharge:a.experimentalPullerEnergySurcharge})),
   surcharge:extras.reduce((sum,a)=>sum+(a.experimentalPullerEnergySurcharge??0),0)}
 })
 const funded=ticks.filter(t=>t.surcharge>0)
 const finishers=Object.values(race.finalState.riders)
 const ledgers=chaseRiders.map(r=>{
  const apps=race.ticks.flatMap(t=>t.appliedEnergy.applications.filter(a=>a.riderId===r.riderId))
  const spent=apps.reduce((sum,a)=>sum+a.energyCost,0)
  const initialEnergy=race.initialState.riders[r.riderId].energy
  const finalEnergy=race.finalState.riders[r.riderId].energy
  return {riderId:r.riderId,spent,initialEnergy,finalEnergy,
   residual:initialEnergy-spent-finalEnergy,
   fundedCharge:apps.reduce((sum,a)=>sum+(a.experimentalPullerEnergySurcharge??0),0)}
 })
 return {mode,completed:race.completed,
  finishCount:finishers.filter(r=>Number.isFinite(r.finishTimeSeconds)&&r.stageStatus==='finished').length,
  uniqueFinishPositions:new Set(finishers.map(r=>r.finishPosition)).size===field,
  selectedRank:race.finalState.riders['sustain-rider-001'].finishPosition,
  selectedFinishSeconds:race.finalState.riders['sustain-rider-001'].finishTimeSeconds,
  finishSpreadSeconds:Math.max(...finishers.map(r=>r.finishTimeSeconds??0))-
   Math.min(...finishers.map(r=>r.finishTimeSeconds??0)),
  executedOrders:chaseOrders.filter(o=>race.finalState.orders[o.orderId]?.status==='executed').length,
  fundedTicks:funded.length,totalExtraEnergy:funded.reduce((sum,t)=>sum+t.surcharge,0),
  firstFunded:funded[0]??null,lastFunded:funded.at(-1)??null,
  chargesOnlyToActualPeloton:funded.every(t=>t.extras.every(a=>a.groupId==='peloton_main')),
  ledgerErrors:ledgers.map(l=>l.residual),
  chargedRiderCount:ledgers.filter(l=>l.fundedCharge>0).length,
  trace:ticks}
}
const cases=[run('control'),run('orders-off'),run('leaders-on')]
const [control,off,on]=cases
const compared=on.firstFunded&&off.trace.find(t=>t.second===on.firstFunded.second)
const checks={
 completed:cases.every(c=>c.completed&&c.finishCount===field&&c.uniqueFinishPositions),
 defaultOffPreserved:control.selectedRank===off.selectedRank&&
  control.selectedFinishSeconds===off.selectedFinishSeconds&&
  control.finishSpreadSeconds===off.finishSpreadSeconds&&
  control.fundedTicks===0&&off.fundedTicks===0,
 actualExecutedOrders:on.executedOrders===chaseOrders.length,
 fundedLeadersReallyMoved:on.fundedTicks>0&&on.totalExtraEnergy>0&&
  !!compared&&on.firstFunded.pelotonSpeedKmh>compared.pelotonSpeedKmh,
 onlyAuthorizedRidersCharged:on.chargesOnlyToActualPeloton&&
  on.chargedRiderCount>0&&on.trace.every(t=>t.extras.every(a=>
   chaseRiders.some(r=>r.riderId===a.riderId))),
 conservation:on.ledgerErrors.every(error=>Math.abs(error)<0.0001),
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-funded-peloton-leadership-e2e-v1',
 orderedRiderCount:chaseOrders.length,
 checks,cases:cases.map(({trace,ledgerErrors,...other})=>({
  ...other,maximumLedgerError:Math.max(...ledgerErrors.map(Math.abs))
 })),
 note:'Default off. No synthetic gaps. Solo winner not forced. Offline only.'
},null,2)+'\n')
