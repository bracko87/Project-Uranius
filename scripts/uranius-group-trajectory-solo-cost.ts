// OFFLINE 120km 128-rider rider-strength gradient experiment.
// Fixed seed and course; compare no-order baseline to early/late live attack,
// with only the nominated rider's physical attributes varied. No forced gap.
import {createHash} from 'node:crypto'
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




const elevations=[100,150,950,1750,2000,1900,1800,2600,3500,3550,3100,2800,2500]
const source=buildInput(86,'baseline')
const mountainInput:StageInput={
 ...source,stageId:source.stageId+'-group-trajectory',
 profilePoints:elevations.map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
}
const mountain=runCalibratedTerrainSeparationStage(createInitialState(mountainInput),{
 experimentalPreserveBirthTickDroppedGroups:true,
 experimentalPreserveRecedingDroppedGroups:true,
})
const drops=mountain.ticks.flatMap(t=>t.transitions.filter(x=>x.sourceGroupId==='peloton_main')
 .map(x=>({second:t.state.raceSecond,groupId:x.targetGroupId,
 riders:x.movedRiderIds,kind:x.transitionKind,km:x.kilometre})))
const grouped=Array.from(new Set(drops.map(d=>d.groupId))).map(groupId=>{
 const created=drops.filter(d=>d.groupId===groupId)
 const ticks=mountain.ticks.map(t=>{
  const g=t.state.groups[groupId]
  const p=t.state.groups['peloton_main']
  if(!g||!p||g.riderIds.length===0&&g.active===false)return null
  return {second:t.state.raceSecond,active:g.active,type:g.groupType,
   riders:g.riderIds.length, signedGapKm:p.distanceKm-g.distanceKm,
   signedGapSeconds:(p.distanceKm-g.distanceKm)/Math.max(0.001,p.speedKmh)*3600}
 }).filter((x):x is NonNullable<typeof x>=>x!==null)
 const terminal=mountain.finalState.groups[groupId]
 return {groupId,creationCount:created.length,
  createdRiders:created.flatMap(x=>x.riders).length,first:created[0],
  ticksObserved:ticks.length,lastObserved:ticks.at(-1)??null,
  maxBehindKm:Math.max(0,...ticks.map(t=>t.signedGapKm)),
  maxAheadKm:Math.max(0,...ticks.map(t=>-t.signedGapKm)),
  terminalActive:terminal?.active??false,
  terminalRiders:terminal?.riderIds.length??0,
  everBehind:ticks.some(t=>t.signedGapKm>0),
  reabsorbed:mountain.ticks.some(t=>t.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(groupId)),
  reclassified:mountain.ticks.some(t=>t.reconciledBreakaways.reclassifiedDroppedGroupIds.includes(groupId)),
  finalFinishes:created.flatMap(x=>x.riders).map(id=>({
   id,rank:mountain.finalState.riders[id].finishPosition,
   time:mountain.finalState.riders[id].finishTimeSeconds})).slice(0,6)}
})
const baseRolling=buildInput(86,'early')
const selected='sustain-rider-001'
const leaderNames=['sustain-rider-009','sustain-rider-010']
const earlyAttack=runCalibratedTerrainSeparationStage(createInitialState(baseRolling),{
 experimentalPhysicalAttackLaunch:true,
 experimentalPreserveBirthTickDroppedGroups:true,
 experimentalPreserveRecedingDroppedGroups:true,
 experimentalPreserveTrailingAttackGroups:true,
 experimentalPreserveSeparatingBreakaways:true,
})
function riderEnergyDetails(race:typeof earlyAttack,id:string){
 const applications=race.ticks.flatMap(t=>t.appliedEnergy.applications.filter(a=>a.riderId===id)
  .map(a=>({second:t.state.raceSecond,groupId:a.groupId,groupType:t.movement.movement.proposals.find(p=>p.groupId===a.groupId)?.groupType,
   appliedSpeedKmh:a.appliedSpeedKmh,cost:a.energyCost,gradient:a.gradientPercent,
   surcharge:a.experimentalPullerEnergySurcharge??0})))
 const initial=race.initialState.riders[id].energy
 const final=race.finalState.riders[id].energy
 const solo=applications.filter(a=>a.groupType==='breakaway')
 const peloton=applications.filter(a=>a.groupType==='peloton')
 const sum=(a:typeof applications)=>a.reduce((n,x)=>n+x.cost,0)
 const mean=(a:typeof applications)=>a.length?sum(a)/a.length:null
 return {id,initial,final,totalSpent:initial-final,ledgerSum:sum(applications),
  ledgerError:initial-final-sum(applications),totalTicks:applications.length,
  soloTicks:solo.length,pelotonTicks:peloton.length,
  soloEnergySpent:sum(solo),pelotonEnergySpent:sum(peloton),
  meanSoloCostPerTick:mean(solo),meanPelotonCostPerTick:mean(peloton),
  meanSoloSpeed:solo.length?solo.reduce((n,x)=>n+x.appliedSpeedKmh,0)/solo.length:null,
  meanPelotonSpeed:peloton.length?peloton.reduce((n,x)=>n+x.appliedSpeedKmh,0)/peloton.length:null,
  finishedRank:race.finalState.riders[id].finishPosition}
}
const soloRider=riderEnergyDetails(earlyAttack,selected)
const pelotonComparators=leaderNames.map(id=>riderEnergyDetails(earlyAttack,id))
const checks={
 mountainCompleted:mountain.completed&&Object.values(mountain.finalState.riders).every(r=>r.stageStatus==='finished'),
 soloCompleted:earlyAttack.completed&&Object.values(earlyAttack.finalState.riders).every(r=>r.stageStatus==='finished'),
 dropEventsGrounded:drops.length>0&&drops.reduce((n,d)=>n+d.riders.length,0)===33,
 realGroupTrace:grouped.length>0&&grouped.every(g=>g.ticksObserved>0),
 physicalGapFinite:grouped.every(g=>Number.isFinite(g.maxBehindKm)&&Number.isFinite(g.maxAheadKm)),
 soloEnergyLedger:[soloRider,...pelotonComparators].every(r=>Math.abs(r.ledgerError)<1e-4),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-group-trajectory-solo-cost-v1',
 checks,mountain:{completed:mountain.completed,transitionCount:drops.length,
 droppedRiders:drops.reduce((n,d)=>n+d.riders.length,0),groupCount:grouped.length,
 groupTrajectories:grouped,finishPelotonCount:mountain.finalState.groups['peloton_main']?.riderIds.length??0},
 solo:{completed:earlyAttack.completed,rider:soloRider,pelotonComparators,
  winningMarginSeconds:Math.max(...Object.values(earlyAttack.finalState.riders).map(r=>r.finishTimeSeconds??0))-
   Math.min(...Object.values(earlyAttack.finalState.riders).map(r=>r.finishTimeSeconds??0))},
 note:'Observation only. Group gaps and energy are measured from real tick states; no calibrated policy changed.'
},null,2)+'\n')
