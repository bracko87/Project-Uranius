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
function evaluate(strength:Strength,timing:Timing,shelterEnergy=false){
 const input=buildInput(strength,timing)
 const initial=createInitialState(input)
 const result=runCalibratedTerrainSeparationStage({...initial,
  groupShelterEnergyEnabled:shelterEnergy},{
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
 // Capture the actual pace engine decomposition at launch + first follow-up.
 // Do not use the observed finish outcome to modify any speed calculation.
 const movementPaceAudit=launch?result.ticks.slice(launch.index,launch.index+3).map(tick=>{
  const attackPace=tick.movement.groupDiagnostics.find(
   d=>d.groupId===launch.groupId)?.pace
  const pelotonId=Object.values(tick.appliedOrderEffects.state.groups).find(
   g=>g.active&&g.groupType==='peloton')?.groupId
  const pelotonPace=tick.movement.groupDiagnostics.find(d=>d.groupId===pelotonId)?.pace
  const attackProposal=tick.movement.movement.proposals.find(p=>p.groupId===launch.groupId)
  const pelotonProposal=tick.movement.movement.proposals.find(p=>p.groupId===pelotonId)
  const beforeCatch=tick.reconciledBreakaways.previousState
  const candidate=beforeCatch.groups[launch.groupId]
  const pelotonAtCatch=Object.values(beforeCatch.groups).find(
   g=>g.active&&g.groupType==='peloton')
  const signedDistanceKm=candidate&&pelotonAtCatch?
   candidate.distanceKm-pelotonAtCatch.distanceKm:null
  const catchGapSeconds=candidate&&pelotonAtCatch?
   Math.abs(candidate.gapFromLeaderSeconds-pelotonAtCatch.gapFromLeaderSeconds):null
  const physicalGapAtPelotonSpeedSeconds=signedDistanceKm!==null&&pelotonAtCatch?
   Math.abs(signedDistanceKm)/Math.max(0.000001,pelotonAtCatch.speedKmh)*3600:null
  const withinFiveSecondReportedWindow=catchGapSeconds!==null&&catchGapSeconds<5
  const freshBreakaway=candidate?.active===true&&
   beforeCatch.raceSecond-candidate.createdAtRaceSecond<=input.settings.tickSeconds
  return {second:tick.state.raceSecond,
   activeBeforeCatch:candidate?.active??false,
   signedDistanceKm,
   catchGapSeconds,
   physicalGapAtPelotonSpeedSeconds,
   withinFiveSecondReportedWindow,
   freshBreakaway,
   actuallyCaught:tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(launch.groupId),
   groupActiveAfterCatch:!!tick.reconciledBreakaways.state.groups[launch.groupId]?.active,
   attackRiders:attackPace?.eligibleRiderCount??null,
   pelotonRiders:pelotonPace?.eligibleRiderCount??null,
   attackBaseKmh:attackPace?.currentBaseSpeedKmh??null,
   pelotonBaseKmh:pelotonPace?.currentBaseSpeedKmh??null,
   attackTerrainRatio:attackPace?.terrainAdjustmentMultiplier??null,
   pelotonTerrainRatio:pelotonPace?.terrainAdjustmentMultiplier??null,
   attackAppliedKmh:attackProposal?.appliedSpeedKmh??null,
   pelotonAppliedKmh:pelotonProposal?.appliedSpeedKmh??null,
   attackTerrainGradient:attackProposal?.gradientPercent??null,
   pelotonTerrainGradient:pelotonProposal?.gradientPercent??null,
   attackAverageCapability:attackPace?.averageFlatCapabilityScore??null,
   pelotonAverageCapability:pelotonPace?.averageFlatCapabilityScore??null}
 }):[]
 const positive=trace.filter(t=>(t.gapKm??0)>0.000001)
 const catchTick=trace.find(t=>t.caught)
 const first=trace[0]
 const last=trace.at(-1)
 // Audit actual accounting rather than inferring effort from final energy.
 // Only count ticks where this rider is still racing; a winner legitimately
 // stops expending stage energy earlier than the no-attack peloton.
 const riderEnergyTicks=result.ticks.flatMap(tick=>{
  const applied=tick.appliedEnergy.applications.find(
   item=>item.riderId===input.riders[0].riderId)
  return applied?[{
   second:tick.state.raceSecond,groupId:applied.groupId,
   speedKmh:applied.appliedSpeedKmh,
   gradientPercent:applied.gradientPercent,
   energyCost:applied.energyCost,
   energyCostBeforeShelter:applied.energyCostBeforeShelter??null,
   shelterEnergySaved:applied.shelterEnergySaved??0,
   shelterMultiplier:applied.shelterMultiplier??null,
  }]:[]
 })
 const sum=(values:readonly number[])=>values.reduce((total,value)=>total+value,0)
 const actualEnergyCost=sum(riderEnergyTicks.map(t=>t.energyCost))
 const unshelteredCost=sum(riderEnergyTicks.map(t=>t.energyCostBeforeShelter??t.energyCost))
 const shelterSaved=sum(riderEnergyTicks.map(t=>t.shelterEnergySaved))
 const effortAudit={
  chargedTicks:riderEnergyTicks.length,
  chargedSeconds:riderEnergyTicks.length*input.settings.tickSeconds,
  finalRecordedRaceSeconds:selected.finishTimeSeconds,
  actualEnergyCost,
  initialEnergy:result.initialState.riders[input.riders[0].riderId].energy,
  energyBalanceError:
   result.initialState.riders[input.riders[0].riderId].energy-
   actualEnergyCost-selected.energy,
  energyCostPerKm:actualEnergyCost/input.distanceKm,
  unshelteredCost,shelterSaved,
  shelterEvaluatedTicks:riderEnergyTicks.filter(t=>t.shelterMultiplier!==null).length,
  shelterAppliedTicks:riderEnergyTicks.filter(t=>t.shelterEnergySaved>0).length,
  meanAppliedSpeedKmh:riderEnergyTicks.length?
   sum(riderEnergyTicks.map(t=>t.speedKmh))/riderEnergyTicks.length:null,
  firstThreeTicks:riderEnergyTicks.slice(0,3),
  finalThreeTicks:riderEnergyTicks.slice(-3),
  attackLaunchTick:launch?
   riderEnergyTicks.find(t=>t.second===launch.second)??null:null,
  attackFollowupTick:launch?
   riderEnergyTicks.find(t=>t.second===launch.second+input.settings.tickSeconds)??null:null,
 }
 return {strength,timing,shelterEnergy,completed:result.completed,
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
  effortAudit,
  selectedAttributes:input.riders[0].attributes,
  stageFinishSpreadSeconds:Math.max(...times as number[])-Math.min(...times as number[]),
  digest:createHash('sha256').update(JSON.stringify(
   final.map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex').slice(0,20),
  firstFiveTrace:trace.slice(0,5),
  movementPaceAudit,
 }
}
// 5 plausible-to-elite physical capability bands; 3 matched tactical choices.
// All 127 opponents, route, seed, timing and drafting rules stay identical.
const ratings=[76,82,86,90,94] as const
const scenarios=ratings.flatMap(strength=>
 (['baseline','early','late'] as const).map(timing=>{
  try{return evaluate(strength,timing,true)}
  catch(error){return {strength,timing,error:error instanceof Error?error.message:String(error)}}
 }))
const checks={
 fifteenCompleted:scenarios.length===15&&scenarios.every(s=>
  'completed' in s&&s.completed),
 classificationIntegrity:scenarios.every(s=>
  'all128Finish' in s&&s.all128Finish&&s.positionsUnique&&s.allTimesFinite),
 tenPhysicalAttacks:scenarios.filter(s=>
  'attackEffects' in s&&s.attackEffects===1).length===10,
 fiveNoOrderControls:scenarios.filter(s=>s.timing==='baseline').every(s=>
  'attackEffects' in s&&s.attackEffects===0),
 scheduledOrdersExecuted:scenarios.every(s=>'executed' in s&&s.executed),
 energyAccountingExact:scenarios.every(s=>'effortAudit' in s&&
  Math.abs(s.effortAudit.energyBalanceError)<0.0001),
 draftingEnabled:scenarios.every(s=>'shelterEnergy' in s&&s.shelterEnergy&&
  s.effortAudit.shelterSaved>0),
 catchAuditHasGeometry:scenarios.filter(s=>s.timing!=='baseline').every(s=>
  'movementPaceAudit' in s&&s.movementPaceAudit.length>0&&
  s.movementPaceAudit[0].signedDistanceKm!==null&&
  s.movementPaceAudit[0].catchGapSeconds!==null&&
  s.movementPaceAudit[0].physicalGapAtPelotonSpeedSeconds!==null),
  observedPaceDecomposition:scenarios.filter(s=>s.timing!=='baseline').every(s=>
  'movementPaceAudit' in s&&s.movementPaceAudit.length>=2&&
  s.movementPaceAudit[0].attackBaseKmh!==null&&
  s.movementPaceAudit[0].pelotonBaseKmh!==null&&
  (s.movementPaceAudit[1].attackAppliedKmh!==null||s.caught===true)),

}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-strength-gradient-v1',
 scope:'OFFLINE 5 physical attribute strengths x baseline/early/late; fixed 120km, 128 riders, drafting enabled and real zero-gap orders',
 ratings,scenarios,checks,
 note:'Observational sensitivity, no fabricated attack gap, no win required. Do not infer realism from synthetic field or promote production defaults.'
},null,2)+'\n')
