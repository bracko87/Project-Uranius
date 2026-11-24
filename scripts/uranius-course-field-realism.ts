// OFFLINE sporting sensitivity only: profile x ability distribution, no synthetic escape.
// Six genuine 128-rider races; attempt an attack and observe its physical fate.
// No randomness, network, production worker, or changes to canonical defaults.
import {createHash} from 'node:crypto'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

type Profile='flat_120'|'rolling_120'|'mountain_160'|'steep_160'
type Distribution='heterogeneous'|'uniform'
const profiles:{profile:Profile;distance:number;elevations:number[]}[]=[
 {profile:'flat_120',distance:120,elevations:Array(13).fill(120)},
 {profile:'rolling_120',distance:120,
  elevations:[100,130,160,120,320,370,280,340,500,400,260,170,140]},
 {profile:'mountain_160',distance:160,
  elevations:[120,150,180,420,880,1210,920,500,650,1050,1450,1100,640,900,540,280,160]},
 // Two genuinely sustained 12% 10km climbs, separated by valley sections.
 // A challenging fictional diagnostic route, not a historically verified stage.
 {profile:'steep_160',distance:160,
  elevations:[100,100,100,100,1300,1700,1300,300,200,200,200,1400,1800,1200,300,150,150]},
]
const distributions:Distribution[]=['heterogeneous','uniform']
const field=128
function inputFor(course:typeof profiles[number],distribution:Distribution):StageInput{
 const riders=Array.from({length:field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  const varied=distribution==='heterogeneous'
  return {...base,
   riderId:'profile-rider-'+String(index+1).padStart(3,'0'),
   teamId:'profile-team-'+String(team).padStart(2,'0'),
   teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:{...base.attributes,
    flat:varied?48+(index*37+11)%48:74,
    climbing:varied?47+(index*29+23)%49:74,
    sprint:varied?49+(index*13)%46:74,
    acceleration:varied?50+(index*17)%40:74,
    stamina:varied?51+(index*19+7)%43:74,
    resistance:varied?50+(index*31)%44:74,
    recovery:varied?52+(index*23)%40:74,
    teamwork:varied?53+(index*7)%39:74,
    timeTrial:varied?48+(index*11)%47:74,
    raceIq:varied?49+(index*41)%45:74,
   }}
 })
 const teams=Array.from({length:field/8},(_,index)=>{
  const group=riders.slice(index*8,index*8+8)
  return {teamId:group[0].teamId,teamName:group[0].teamName,
   captainRiderId:group[0].riderId,riderIds:group.map(r=>r.riderId)}
 })
 const attacker=riders[8]
 return {...syntheticTenRiderStage,
  raceId:'uranius-offline-course-field-realism',stageId:course.profile+'-'+distribution,
  stageName:'Fictional '+course.profile+' '+distribution,
  distanceKm:course.distance,seed:'course-field-fixed-seed',teams,riders,
  profilePoints:course.elevations.map((elevationMetres,index)=>({
   kilometre:index*10,elevationMetres})),
  orders:[{orderId:'profile-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,priority:1,
   eligibleFromKm:35,eligibleUntilKm:42,
   maximumFollowers:null,targetRiderId:null,metadata:{uraniusLiveCommand:true}}],
 }
}
function run(course:typeof profiles[number],distribution:Distribution){
 const input=inputFor(course,distribution)
 const start=createInitialState(input)
 const result=runCalibratedTerrainSeparationStage(start,{
  experimentalPhysicalAttackLaunch:true,
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
 })
 const final=Object.values(result.finalState.riders)
 const ridersById=new Map(input.riders.map(r=>[r.riderId,r]))
 const ranks=final.map(r=>r.finishPosition)
 const times=final.map(r=>r.finishTimeSeconds).filter(
  (value):value is number=>typeof value==='number'&&Number.isFinite(value))
 const finishers=final.filter(r=>r.finished&&r.finishTimeSeconds!==null).length
 const rosterIds=new Set(final.map(r=>r.riderId))
 const rosterPreserved=rosterIds.size===field&&
  input.riders.every(r=>rosterIds.has(r.riderId))
 const rankValid=finishers===field&&new Set(ranks).size===field&&
  ranks.every(r=>typeof r==='number'&&Number.isInteger(r)&&r>=1&&r<=field)
 const attacks=result.ticks.flatMap((tick,index)=>tick.appliedOrderEffects.attackEffects.map(
  effect=>({index,second:tick.state.raceSecond,
   breakawayGroupId:effect.separation.breakawayGroupId,
   firstAppliedSpeedKmh:tick.movement.movement.proposals.find(
    p=>p.groupId===effect.separation.breakawayGroupId)?.appliedSpeedKmh??null})))
 const attack=attacks[0]
 const attackTrace=attack?result.ticks.slice(attack.index).map(tick=>{
  const group=tick.reconciledBreakaways.previousState.groups[attack.breakawayGroupId]
  const peloton=Object.values(tick.reconciledBreakaways.previousState.groups).find(
   g=>g.active&&g.groupType==='peloton')
  return {second:tick.state.raceSecond,
   gapKm:group&&peloton?group.distanceKm-peloton.distanceKm:null,
   caught:tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(
    attack.breakawayGroupId),
   activeAfter:!!tick.state.groups[attack.breakawayGroupId]?.active}
 }).filter(t=>t.gapKm!==null):[]
 const attackLaunchAudit=attack?result.ticks.slice(attack.index,attack.index+4).map(tick=>{
  const born=tick.appliedOrderEffects.state.groups[attack.breakawayGroupId]
  const pelotonAtLaunch=Object.values(tick.appliedOrderEffects.state.groups).find(
   g=>g.active&&g.groupType==='peloton')
  const attackProposal=tick.movement.movement.proposals.find(
   p=>p.groupId===attack.breakawayGroupId)
  const pelotonProposal=tick.movement.movement.proposals.find(
   p=>p.groupType==='peloton')
  const beforeCatch=tick.reconciledBreakaways.previousState.groups[
   attack.breakawayGroupId]
  const pelotonBeforeCatch=Object.values(tick.reconciledBreakaways.previousState.groups).find(
   g=>g.active&&g.groupType==='peloton')
  const selectedRider=tick.appliedOrderEffects.state.riders[input.riders[8].riderId]
  return {second:tick.state.raceSecond,
   birthSecond:born?.createdAtRaceSecond??null,
   groupActiveBeforeCatch:beforeCatch?.active??null,
   sourceGapKm:born&&pelotonAtLaunch?born.distanceKm-pelotonAtLaunch.distanceKm:null,
   attackerEnergyBeforeMovement:selectedRider?.energy??null,
   attackAppliedSpeedKmh:attackProposal?.appliedSpeedKmh??null,
   pelotonAppliedSpeedKmh:pelotonProposal?.appliedSpeedKmh??null,
   gapBeforeCatchKm:beforeCatch&&pelotonBeforeCatch?
    beforeCatch.distanceKm-pelotonBeforeCatch.distanceKm:null,
   caught:tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(
    attack.breakawayGroupId),
   remainsActive:!!tick.state.groups[attack.breakawayGroupId]?.active}
 }):[]
 const terrainDropAudit=result.ticks.flatMap(tick=>tick.transitions.filter(
  transition=>transition.transitionKind==='created').map(transition=>{
  const dropped=tick.reconciledBreakaways.previousState.groups[transition.targetGroupId]
  const peloton=Object.values(tick.reconciledBreakaways.previousState.groups).find(
   g=>g.active&&g.groupType==='peloton')
  const groupFinal=result.finalState.groups[transition.targetGroupId]
  const movedFinal=transition.movedRiderIds.map(id=>result.finalState.riders[id])
  return {second:tick.state.raceSecond,km:tick.state.currentKm,
   movedRiders:transition.movedRiderIds.length,
   dropGapAtBirthKm:dropped&&peloton?dropped.distanceKm-peloton.distanceKm:null,
   caughtAtBirth:tick.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(
    transition.targetGroupId),
   groupActiveAtFinish:groupFinal?.active??null,
   finalRiderFinishSeconds:movedFinal.map(r=>r?.finishTimeSeconds??null),
   pressureAtPostTick:transition.movedRiderIds.map(
    id=>tick.pressureDurationByRiderId[id]??null)}
 }))
 const catchTick=attackTrace.find(t=>t.caught)
 const positiveGapTicks=attackTrace.filter(t=>(t.gapKm??0)>0.000001).length
 const peakGapKm=attackTrace.length?Math.max(...attackTrace.map(t=>t.gapKm??0)):0
 const terrainGradients=course.elevations.slice(1).map((height,index)=>
  (height-course.elevations[index])/10000*100)
 const pressureSamples=result.ticks.flatMap(t=>t.pressureEvaluations)
 const cannotHoldEvaluations=pressureSamples.filter(p=>p.hold.status==='cannot_hold')
 const maxSeparationPressureSeconds=Math.max(0,...result.ticks.flatMap(
  t=>Object.values(t.pressureDurationByRiderId)))
 const pressureCannotHoldDistinctRiders=new Set(
  cannotHoldEvaluations.map(p=>p.riderId)).size
 const terrainDropsCreated=result.ticks.reduce((sum,t)=>sum+
  t.transitions.filter(tr=>tr.transitionKind==='created').length,0)
 const terrainDropsCaughtSameTick=result.ticks.reduce((sum,t)=>sum+
  t.transitions.filter(tr=>tr.transitionKind==='created'&&
   t.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes(tr.targetGroupId)).length,0)
 const terrainDropsLaterCaught=result.ticks.reduce((sum,t)=>sum+
  t.reconciledBreakaways.reabsorbedBreakawayGroupIds.filter(id=>{
   const group=t.reconciledBreakaways.previousState.groups[id]
   return group?.groupType==='dropped'&&
    group.createdAtRaceSecond<t.state.raceSecond
  }).length,0)
 const riderEnergyRange=[Math.min(...final.map(r=>r.energy)),
  Math.max(...final.map(r=>r.energy))]
 const finishingTimeUniqueCount=new Set(times).size
 const winner=final.find(r=>r.finishPosition===1)
 const winnerInput=winner?ridersById.get(winner.riderId):undefined
 const firstTime=times.length?Math.min(...times):null
 const lastTime=times.length?Math.max(...times):null
 const replayRosterInvalid=result.replaySnapshots.some(snapshot=>{
  const active=Object.values(snapshot.groups).filter(g=>g.active)
  const ids=active.flatMap(g=>g.riderIds)
  return new Set(ids).size!==ids.length||ids.some(id=>!rosterIds.has(id))
 })
 return {profile:course.profile,distribution,fieldSize:field,
  distanceKm:course.distance,completed:result.completed,finishers,
  rosterPreserved,rankValid,allTimesFinite:times.length===field,
  replayRosterValid:!replayRosterInvalid,
  ticks:result.ticks.length,
  profileMaxUphillGradientPercent:Math.max(...terrainGradients),
  profileMaxDownhillGradientPercent:Math.min(...terrainGradients),
  cannotHoldEvaluationCount:cannotHoldEvaluations.length,
  cannotHoldDistinctRiders:pressureCannotHoldDistinctRiders,
  maxSeparationPressureSeconds,
  terrainDropsCreated,terrainDropsCaughtSameTick,terrainDropsLaterCaught,
  finishingTimeUniqueCount,riderEnergyRange,
  attackLaunchAudit,terrainDropAudit,
  attackEvents:attacks.length,
  orderExecuted:result.finalState.orders['profile-attack']?.status==='executed',
  attackSecond:attack?.second??null,
  attackFirstMovementSpeedKmh:attack?.firstAppliedSpeedKmh??null,
  attackPositiveGapTicks:positiveGapTicks,attackPeakGapKm:peakGapKm,
  attackCaught:!!catchTick,attackCatchSecond:catchTick?.second??null,
  attackSurvivesFinish:!!attack&&
   !!result.finalState.groups[attack.breakawayGroupId]?.active,
  activeGroupPeak:Math.max(...result.ticks.map(t=>Object.values(t.state.groups)
   .filter(g=>g.active).length)),
  finishSpreadSeconds:firstTime!==null&&lastTime!==null?lastTime-firstTime:null,
  winnerAverageKmh:firstTime&&firstTime>0?course.distance*3600/firstTime:null,
  winnerAttributes:winnerInput?{
   flat:winnerInput.attributes.flat,climbing:winnerInput.attributes.climbing,
   sprint:winnerInput.attributes.sprint}:null,
  winnerId:winner?.riderId??null,
  classificationHash:createHash('sha256').update(JSON.stringify(
   final.map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex').slice(0,20),
 }
}
const scenarios=profiles.flatMap(profile=>distributions.map(distribution=>{
 try{return run(profile,distribution)}
 catch(error){return {profile:profile.profile,distribution,error:error instanceof Error?
  error.message:String(error)}}
}))
const checks={
 eightScenarios:scenarios.length===8,
 allCompleted:scenarios.every(r=>'completed' in r&&r.completed),
 rostersExact:scenarios.every(r=>'rosterPreserved' in r&&r.rosterPreserved),
 classificationsValid:scenarios.every(r=>'rankValid' in r&&r.rankValid&&
  r.allTimesFinite&&r.replayRosterValid),
 allAttacksReal:scenarios.every(r=>'attackEvents' in r&&r.attackEvents===1&&r.orderExecuted&&
  r.attackFirstMovementSpeedKmh!==null),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-course-field-realism-v1',
 scope:'OFFLINE 4 fictional course profiles x 2 synthetic distributions x 128 riders; no synthetic initial gap',
 scenarios,checks,
 note:'Attack catch and survival are observations, not forced pass criteria. Uniform field is a negative-control distribution, not realistic athlete data. Sporting calibration still NO GO.'},null,2)+'\n')
