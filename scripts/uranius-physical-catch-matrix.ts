// Offline sporting acceptance candidate: no database or canonical physics changes.
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

import {reconcileBreakawayGroups} from '../src/race-engine/simulation/reconcileBreakawayGroups'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import type {SimulationState} from '../src/race-engine/domain/SimulationState'

const options={
 experimentalPhysicalAttackLaunch:true,
 experimentalPreserveBirthTickDroppedGroups:true,
 experimentalPreserveRecedingDroppedGroups:true,
 experimentalPreserveTrailingAttackGroups:true,
 experimentalPreserveSeparatingBreakaways:true,
 experimentalCapabilityBasedLeadershipEnabled:true,
}
const attacker='sustain-rider-001'
const catchOptions={experimentalRequirePhysicalBreakawayCatch:true,
 experimentalPreserveSeparatingBreakaways:true,experimentalPreserveTrailingAttackGroups:true}

// Controlled post-movement boundary: 10 real fixture riders, no invented race outcomes.
function boundary(gapMetres:number,physical:boolean){
 const initial=createInitialState(syntheticTenRiderStage)
 const original=initial.groups.peloton_main
 const id=original.riderIds[0], distance=4+gapMetres/1000
 const peloton={...original,distanceKm:4,speedKmh:44,
  gapFromLeaderSeconds:Math.max(0,gapMetres/1000/44*3600),
  riderIds:original.riderIds.filter(x=>x!==id)}
 const breakaway={...original,groupId:'breakaway_1',groupType:'breakaway' as const,
  distanceKm:distance,speedKmh:40,gapFromLeaderSeconds:Math.max(0,-gapMetres/1000/44*3600),
  createdAtRaceSecond:30,createdAtKm:1,riderIds:[id]}
 const state:SimulationState={...initial,raceSecond:360,currentKm:Math.max(4,distance),
  nextBreakawayNumber:2,groups:{peloton_main:peloton,breakaway_1:breakaway},
  riders:Object.fromEntries(Object.entries(initial.riders).map(([key,rider])=>[key,{
   ...rider,currentGroupId:key===id?'breakaway_1':'peloton_main',
   distanceKm:key===id?distance:4,speedKmh:key===id?40:44}]))}
 validateSimulationState(state)
 const before=JSON.stringify(state)
 const result=reconcileBreakawayGroups(state,{...catchOptions,experimentalRequirePhysicalBreakawayCatch:physical})
 validateSimulationState(result.state)
 const caught=result.reabsorbedBreakawayGroupIds.includes('breakaway_1')
 const correctMembership=caught
  ? !result.state.groups.breakaway_1.active&&result.state.groups.breakaway_1.riderIds.length===0&&
   result.state.groups.peloton_main.riderIds.length===10&&result.state.riders[id].currentGroupId==='peloton_main'&&
   result.state.riders[id].distanceKm===4
  : result.state.groups.breakaway_1.active&&result.state.groups.breakaway_1.riderIds.length===1&&
   result.state.riders[id].currentGroupId==='breakaway_1'&&result.state.riders[id].distanceKm===distance
 return {gapMetres,physical,caught,correctMembership,unchangedInput:JSON.stringify(state)===before,
  energyUnchanged:Object.values(state.riders).every(r=>r.energy===result.state.riders[r.riderId].energy),
  clockUnchanged:state.raceSecond===result.state.raceSecond,
  repeatStable:!reconcileBreakawayGroups(result.state,{...catchOptions,experimentalRequirePhysicalBreakawayCatch:physical}).changed}
}
const boundaries=[boundary(30,false),boundary(30,true),boundary(0.001,true),boundary(0,true),boundary(-30,true)]
const boundaryChecks={
 legacyProximityCatch:boundaries[0].caught,
 positiveDistancePreserved:!boundaries[1].caught&&!boundaries[2].caught,
 equalityAndOvertakeRejoin:boundaries[3].caught&&boundaries[4].caught,
 validMembershipAndIdempotence:boundaries.every(b=>b.correctMembership&&b.unchangedInput&&b.energyUnchanged&&b.clockUnchanged&&b.repeatStable)
}

type Scenario={name:string,profile:'flat'|'rolling'|'mountain',strength:Strength,timing:'early'|'late',leaders:8|24}
const scenarios:Scenario[]=[
 {name:'flat-weak-early',profile:'flat',strength:76,timing:'early',leaders:24},
 {name:'rolling-strong-late',profile:'rolling',strength:94,timing:'late',leaders:8},
 {name:'mountain-medium-early',profile:'mountain',strength:82,timing:'early',leaders:24},
 {name:'mountain-strong-late',profile:'mountain',strength:90,timing:'late',leaders:8},
]
function run(s:Scenario,physical:boolean){
 const base=buildInput(s.strength,s.timing)
 const elevations=s.profile==='flat'?Array(13).fill(100):
  s.profile==='mountain'?[100,120,620,1120,1620,1200,650,450,1050,1750,2300,1700,900]:null
 const inputBase:StageInput={...base,stageId:s.name,stageName:'Offline '+s.name,
  profilePoints:elevations?elevations.map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})):base.profilePoints}
 const ranked=Object.values(createInitialState(inputBase).riders).filter(r=>r.riderId!==attacker)
  .sort((a,b)=>b.attributes.flat-a.attributes.flat||b.attributes.stamina-a.attributes.stamina||a.riderId.localeCompare(b.riderId))
 const orders=ranked.slice(0,s.leaders).map((r,index)=>({
  orderId:'leader-chase-'+index,type:'chase' as const,status:'scheduled' as const,
  teamId:r.teamId,riderId:r.riderId,eligibleFromKm:s.timing==='early'?5:70,
  eligibleUntilKm:120,priority:1,maximumFollowers:null,targetRiderId:null,metadata:{uraniusLiveCommand:true}}))
 const input:StageInput={...inputBase,orders:[...inputBase.orders,...orders]}
 const race=runCalibratedTerrainSeparationStage(createInitialState(input),{
  ...options,experimentalRequirePhysicalBreakawayCatch:physical})
 const authorized=new Set(orders.map(o=>o.riderId))
 const catches=[] as {second:number,id:string,km:number,gapMetres:number,previousGapMetres:number|null,atFinish:boolean,membershipValid:boolean}[]
 let aheadPreservedTicks=0, strandedOverlaps=0, unauthorizedPaid=0, paidEnergy=0, maxLedgerResidual=0
 let launchObserved=false
 const initialEnergy=race.initialState.riders
 const totalDebits:Record<string,number>={}
 for(const t of race.ticks){
  const r=t.reconciledBreakaways, pre=r.previousState, post=r.state
  const p=r.pelotonGroupId?pre.groups[r.pelotonGroupId]:null
  const oldP=r.pelotonGroupId?t.previousState.groups[r.pelotonGroupId]:null
  if(t.appliedOrderEffects.attackEffects.some(e=>e.separation.breakawayGroup.riderIds.includes(attacker)))launchObserved=true
  if(p)for(const g of Object.values(pre.groups)){
   if(!g.active||g.groupType!=='breakaway')continue
   const gap=1000*(g.distanceKm-p.distanceKm)
   const old=t.previousState.groups[g.groupId]
   const previousGap=old?.active&&oldP?.active?1000*(old.distanceKm-oldP.distanceKm):null
   const atFinish=p.distanceKm>=input.distanceKm||g.distanceKm>=input.distanceKm
   if(r.reabsorbedBreakawayGroupIds.includes(g.groupId)){
    catches.push({second:pre.raceSecond,id:g.groupId,km:p.distanceKm,gapMetres:gap,previousGapMetres:previousGap,atFinish,
     membershipValid:!post.groups[g.groupId].active&&post.groups[g.groupId].riderIds.length===0&&
      g.riderIds.every(id=>post.riders[id].currentGroupId===p.groupId&&post.groups[p.groupId].riderIds.includes(id))})
   }else if(gap>0&&post.groups[g.groupId]?.active)aheadPreservedTicks++
   else if(gap<=0&&previousGap!==null&&previousGap>0&&!atFinish&&post.groups[g.groupId]?.active)strandedOverlaps++
  }
  for(const a of t.appliedEnergy.applications){
   totalDebits[a.riderId]=(totalDebits[a.riderId]??0)+a.energyCost
   const surcharge=a.experimentalPullerEnergySurcharge??0
   if(surcharge>0){
    paidEnergy+=surcharge
    if(!authorized.has(a.riderId))unauthorizedPaid++
   }
  }
 }
 const final=Object.values(race.finalState.riders)
 for(const id of authorized)maxLedgerResidual=Math.max(maxLedgerResidual,
  Math.abs(initialEnergy[id].energy-race.finalState.riders[id].energy-(totalDebits[id]??0)))
 const finished=final.filter(r=>r.stageStatus==='finished')
 const ranks=finished.map(r=>r.finishPosition).sort((a,b)=>(a??0)-(b??0))
 validateSimulationState(race.finalState)
 const genuineCatches=catches.filter(c=>c.previousGapMetres!==null&&c.previousGapMetres>0&&c.gapMetres<=0&&!c.atFinish)
 const prematureCatches=catches.filter(c=>c.gapMetres>0)
 return {...s,physical,completed:race.completed,finishers:finished.length,
  validRanks:ranks.every((rank,i)=>rank===i+1)&&finished.every(r=>Number.isFinite(r.finishTimeSeconds)),
  launchObserved,attackerRank:race.finalState.riders[attacker].finishPosition,
  attackerFinishTime:race.finalState.riders[attacker].finishTimeSeconds,
  aheadPreservedTicks,strandedOverlaps,paidEnergy,unauthorizedPaid,maxLedgerResidual,
  genuineCatches:genuineCatches.length,prematureCatches:prematureCatches.length,catches}
}
const boundaryOnly=process.argv.includes('--boundary-only')
const cases=boundaryOnly?[]:scenarios.flatMap(s=>[run(s,false),run(s,true)])
const physicalCases=cases.filter(c=>c.physical)
const checks=boundaryOnly?boundaryChecks:{...boundaryChecks,
 allEightRacesComplete:cases.length===8&&cases.every(c=>c.completed&&c.finishers===128&&c.validRanks),
 allAttacksActuallyLaunch:cases.every(c=>c.launchObserved),
 paidAuthorizedChase:cases.every(c=>c.paidEnergy>0&&c.unauthorizedPaid===0),
 leaderLedgerConservation:cases.every(c=>c.maxLedgerResidual<0.0001),
 noPrematurePhysicalCatch:physicalCases.every(c=>c.prematureCatches===0),
 actualNonFinishPhysicalCrossingObserved:physicalCases.some(c=>c.genuineCatches>0),
 noStrandedCrossedGroups:physicalCases.every(c=>c.strandedOverlaps===0),
 catchesHaveValidMembership:cases.every(c=>c.catches.every(x=>x.membershipValid)),
 physicalPreservationObserved:physicalCases.some(c=>c.aheadPreservedTicks>0),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-physical-catch-matrix-v1',boundaryOnly,boundaries,cases,checks},null,2)+'\n')
