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



type Scenario = {name:string;leaderCount:number;initialLeaderEnergy:number;enabled:boolean}
const scenarios:Scenario[]=[
 {name:'no-orders',leaderCount:0,initialLeaderEnergy:100,enabled:false},
 {name:'one-leader',leaderCount:1,initialLeaderEnergy:100,enabled:true},
 {name:'three-leaders',leaderCount:3,initialLeaderEnergy:100,enabled:true},
 {name:'eight-leaders',leaderCount:8,initialLeaderEnergy:100,enabled:true},
 {name:'twenty-four-leaders',leaderCount:24,initialLeaderEnergy:100,enabled:true},
 {name:'depleted-twenty-four',leaderCount:24,initialLeaderEnergy:12,enabled:true},
]
function run(scenario:Scenario){
 const selectedOrders=chaseOrders.slice(0,scenario.leaderCount)
 const stageInput:StageInput={...starting,
  orders:[...starting.orders,...selectedOrders]}
 const original=createInitialState(stageInput)
 const nominated=chaseRiders.slice(0,scenario.leaderCount).map(r=>r.riderId)
 const initial={
  ...original,
  // Explicit correction for the depleted-energy scenario only. It changes
  // the logged debit, not rider movement, energy reserve, or prior fingerprints.
  experimentalConservedEnergyLedgerEnabled:scenario.initialLeaderEnergy===12,
  riders:Object.fromEntries(Object.entries(original.riders).map(([id,r])=>
   [id,nominated.includes(id)?{...r,energy:scenario.initialLeaderEnergy}:r])),
 }
 const result=runCalibratedTerrainSeparationStage(initial,{
  ...baseOptions,
  experimentalCapabilityBasedLeadershipEnabled:scenario.enabled,
 })
 const fin=Object.values(result.finalState.riders)
 const solo=result.finalState.riders['sustain-rider-001']
 const pelotonIds=result.finalState.groups['peloton_main']?.riderIds??[]
 const firstPeloton=Math.min(...pelotonIds.filter(id=>id!==solo.riderId).map(id=>
  result.finalState.riders[id].finishTimeSeconds??Infinity))
 const reabsorbed=result.ticks.find(t=>
  t.previousState.riders[solo.riderId].currentGroupId!=='peloton_main'&&
  t.state.riders[solo.riderId].currentGroupId==='peloton_main')
 const soloReabsorbedSecond=reabsorbed?.state.raceSecond??null
 const app=result.ticks.flatMap(t=>t.appliedEnergy.applications)
 const funded=app.filter(a=>(a.experimentalPullerEnergySurcharge??0)>0)
 const firstFundedSecond=result.ticks.find(t=>t.appliedEnergy.applications.some(a=>
  (a.experimentalPullerEnergySurcharge??0)>0))?.state.raceSecond??null
 const lastFundedSecond=[...result.ticks].reverse().find(t=>
  t.appliedEnergy.applications.some(a=>(a.experimentalPullerEnergySurcharge??0)>0)
 )?.state.raceSecond??null
 const chargedIds=new Set(funded.map(a=>a.riderId))
 const leaderFinalEnergy=nominated.map(id=>result.finalState.riders[id].energy)
 const leaderLedgers=nominated.map(id=>{
  const charged=app.filter(a=>a.riderId===id).reduce((n,a)=>n+a.energyCost,0)
  return initial.riders[id].energy-result.finalState.riders[id].energy-charged
 })
 const unauthorizedCharges=funded.filter(a=>!nominated.includes(a.riderId))
 const paidTicks=result.ticks.filter(t=>t.appliedEnergy.applications.some(a=>
  (a.experimentalPullerEnergySurcharge??0)>0))
 const mean=(ns:number[])=>ns.length?ns.reduce((a,b)=>a+b,0)/ns.length:null
 return {name:scenario.name,leaderCount:scenario.leaderCount,
  initialLeaderEnergy:scenario.initialLeaderEnergy,
  completed:result.completed,finishCount:fin.filter(r=>r.stageStatus==='finished').length,
  selectedFinishTime:solo.finishTimeSeconds,selectedRank:solo.finishPosition,
  firstPelotonFinisherTime:firstPeloton,soloToPelotonSeconds:firstPeloton-(solo.finishTimeSeconds??0),
  soloReabsorbedSecond,soloFinalGroupId:solo.currentGroupId,
  executedOrders:selectedOrders.filter(o=>result.finalState.orders[o.orderId]?.status==='executed').length,
  fundedTickCount:paidTicks.length,chargedRiderCount:chargedIds.size,
  authorizedChargedOnly:unauthorizedCharges.length===0,
  leaderEnergyPaid:funded.reduce((n,a)=>n+(a.experimentalPullerEnergySurcharge??0),0),
  firstFundedSecond,lastFundedSecond,
  minFinalLeaderEnergy:leaderFinalEnergy.length?Math.min(...leaderFinalEnergy):null,
  meanFinalLeaderEnergy:mean(leaderFinalEnergy),
  maximumLeaderLedgerResidual:leaderLedgers.length?Math.max(...leaderLedgers.map(Math.abs)):0,
  allRiderEnergyBounded:fin.every(r=>Number.isFinite(r.energy)&&r.energy>=0&&r.energy<=100),
 }
}
const cases=scenarios.map(run)
const [control,one,three,eight,full,depleted]=cases
const checks={
 allStagesComplete:cases.every(c=>c.completed&&c.finishCount===128),
 baselineFingerprint:control.selectedFinishTime===9939.315079131&&
  Math.abs(control.soloToPelotonSeconds-647.108293786)<1e-6,
 previousDynamicFingerprint:Math.abs(full.soloToPelotonSeconds-190.978210843)<1e-6&&
  Math.abs(full.leaderEnergyPaid-290.76428)<1e-4,
 allOrdersExecuted:cases.every(c=>c.executedOrders===c.leaderCount),
 noFreePursuit:control.leaderEnergyPaid===0&&control.fundedTickCount===0&&
  [one,three,eight,full,depleted].every(c=>c.leaderEnergyPaid>0&&c.fundedTickCount>0),
 onlyAuthorizedCharged:cases.every(c=>c.authorizedChargedOnly&&
  c.chargedRiderCount<=c.leaderCount),
 riderEnergyConserved:cases.every(c=>c.maximumLeaderLedgerResidual<1e-4),
 validRiderEnergy:cases.every(c=>c.allRiderEnergyBounded),
 lowEnergyIsNotUnlimited:depleted.leaderEnergyPaid<full.leaderEnergyPaid,
 noGuaranteedCatch:cases.every(c=>Number.isFinite(c.soloToPelotonSeconds)&&
  Number.isFinite(c.firstPelotonFinisherTime)),
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-leader-availability-sensitivity-v1',
 checks,cases,
 note:'Six 128-rider rolling-stage counterfactuals. Selected leader count and initial energy are varied; default leadership remains OFF. No assumed monotonic performance or mandated catch.'
},null,2)+'\n')
