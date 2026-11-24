// OFFLINE 120km 128-rider attack sustainability experiment.
// Fixed seed and course; compare no-order baseline to early/late live attack,
// with only the nominated rider's physical attributes varied. No forced gap.
import {createHash} from 'node:crypto'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

type Strength='original'|'strong'
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
   attributes:index===0&&strength==='strong'
    ?{...attributes,flat:95,climbing:95,acceleration:95,
      stamina:95,resistance:95,recovery:95}:attributes}
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
function evaluate(strength:Strength,timing:Timing){
 const input=buildInput(strength,timing)
 const result=runCalibratedTerrainSeparationStage(createInitialState(input),{
  experimentalPhysicalAttackLaunch:true,
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
  experimentalPreserveTrailingAttackGroups:true,
 })
 const final=Object.values(result.finalState.riders)
 const selected=final.find(r=>r.riderId===input.riders[0].riderId)!
 const ranks=final.map(r=>r.finishPosition)
 const times=final.map(r=>r.finishTimeSeconds)
 const attackTicks=result.ticks.flatMap((tick,i)=>tick.appliedOrderEffects.attackEffects.map(effect=>({
  index:i,second:tick.state.raceSecond,
  groupId:effect.separation.breakawayGroupId,
  sourceGroupId:effect.separation.sourceGroupId,
  launchSpeedKmh:effect.attackLaunchResult?.launchSpeedKmh??null,
 })))
 const launch=attackTicks[0]
 const trace=launch?result.ticks.slice(launch.index).map(tick=>{
  const before=tick.reconciledBreakaways.previousState
  const group=before.groups[launch.groupId]
  const peloton=Object.values(before.groups).find(g=>g.active&&g.groupType==='peloton')
  const proposal=tick.movement.movement.proposals.find(p=>p.groupId===launch.groupId)
  const pelotonProposal=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
  return {second:tick.state.raceSecond,
   activeBeforeCatch:!!group?.active,
   gapKm:group?.active&&peloton?group.distanceKm-peloton.distanceKm:null,
   attackSpeedKmh:proposal?.appliedSpeedKmh??null,
   pelotonSpeedKmh:pelotonProposal?.appliedSpeedKmh??null,
   caught:tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(launch.groupId),
   activeAfterCatch:!!tick.state.groups[launch.groupId]?.active}
 }).filter(t=>t.activeBeforeCatch):[]
 const positive=trace.filter(t=>(t.gapKm??0)>0.000001)
 const catchTick=trace.find(t=>t.caught)
 const first=trace[0]
 const last=trace.at(-1)
 return {strength,timing,completed:result.completed,
  all128Finish:final.filter(r=>r.finished&&Number.isFinite(r.finishTimeSeconds)).length===field,
  positionsUnique:ranks.every(r=>Number.isInteger(r)&&r!==null&&r>=1&&r<=field)&&new Set(ranks).size===field,
  allTimesFinite:times.every(t=>typeof t==='number'&&Number.isFinite(t)),
  attackEffects:attackTicks.length,
  executed:timing==='baseline'||result.finalState.orders['sustain-attack']?.status==='executed',
  initialGroupType:launch?result.ticks[launch.index].appliedOrderEffects.previousState.groups[launch.sourceGroupId]?.groupType:null,
  attackSecond:launch?.second??null,
  launchSpeedKmh:launch?.launchSpeedKmh??null,
  firstMovementAttackKmh:first?.attackSpeedKmh??null,
  firstMovementPelotonKmh:first?.pelotonSpeedKmh??null,
  secondMovementAttackKmh:trace[1]?.attackSpeedKmh??null,
  secondMovementPelotonKmh:trace[1]?.pelotonSpeedKmh??null,
  firstGapKm:first?.gapKm??null,
  peakPositiveGapKm:positive.length?Math.max(...positive.map(t=>t.gapKm??0)):0,
  positiveGapTicks:positive.length,
  caught:!!catchTick,catchSecond:catchTick?.second??null,
  activeMovementTicks:trace.length,
  finalAttackActive:last?.activeAfterCatch??false,
  selectedRank:selected.finishPosition,
  selectedFinishSeconds:selected.finishTimeSeconds,
  selectedFinalEnergy:selected.energy,
  selectedAttributes:input.riders[0].attributes,
  stageFinishSpreadSeconds:Math.max(...times as number[])-Math.min(...times as number[]),
  digest:createHash('sha256').update(JSON.stringify(
   final.map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex').slice(0,20),
  firstFiveTrace:trace.slice(0,5),
 }
}
const scenarios=(['original','strong'] as const).flatMap(strength=>
 (['baseline','early','late'] as const).map(timing=>{
  try{return evaluate(strength,timing)}
  catch(e){return {strength,timing,error:e instanceof Error?e.message:String(e)}}
 }))
const checks={
 sixComplete:scenarios.length===6&&scenarios.every(s=>'completed' in s&&s.completed),
 classificationIntegrity:scenarios.every(s=>'all128Finish' in s&&s.all128Finish&&
  s.positionsUnique&&s.allTimesFinite),
 fourPhysicalAttacks:scenarios.filter(s=>'attackEffects' in s&&s.attackEffects===1).length===4,
 noFabricatedBaseline:scenarios.filter(s=>s.timing==='baseline').every(s=>
  'attackEffects' in s&&s.attackEffects===0),
 allScheduledOrdersExecuted:scenarios.every(s=>'executed' in s&&s.executed),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-attack-sustainability-v1',
 scope:'OFFLINE deterministic 120km 128 rider no-attack vs early vs late for original and strengthened single rider',
 scenarios,checks,note:'No simulated gap injected, no winning attack required. Performance and energy are observations only; sporting GO withheld.'},null,2)+'\n')
