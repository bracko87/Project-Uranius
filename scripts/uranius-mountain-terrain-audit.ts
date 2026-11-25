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



/**
 * Offline mountain-stage terrain challenge. No special separation rules,
 * fabricated gaps, forced dropped groups, or altered canonical parameters.
 */
type TickRow={
 second:number,km:number,gradient:number,pelotonSize:number,
 pressureEvaluated:number,comfortable:number,underPressure:number,
 cannotHold:number,sustainedEligible:number,pelotonDropEvents:number,
 pelotonDroppedRiders:number
}
const elevations=[100,150,950,1750,2000,1900,1800,2600,3500,3550,3100,2800,2500]
function evaluate(route:'rolling'|'mountain'){
 const source=buildInput(86,'baseline')
 const profilePoints=route==='mountain'?
  elevations.map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})):
  source.profilePoints
 const input:StageInput={...source,stageId:source.stageId+'-'+route,
  profilePoints}
 const stage=runCalibratedTerrainSeparationStage(createInitialState(input),{
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
 })
 const rows:TickRow[]=stage.ticks.map(tick=>{
  const peloton=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
  const evaluations=tick.pressureEvaluations.filter(e=>e.groupId==='peloton_main')
  const transitions=tick.transitions.filter(t=>t.sourceGroupId==='peloton_main')
  return {second:tick.state.raceSecond,km:peloton?.nextDistanceKm??0,
   gradient:peloton?.gradientPercent??0,pelotonSize:peloton?.riderIds.length??0,
   pressureEvaluated:evaluations.length,
   comfortable:evaluations.filter(e=>e.hold.status==='comfortable').length,
   underPressure:evaluations.filter(e=>e.hold.status==='under_pressure').length,
   cannotHold:evaluations.filter(e=>e.hold.status==='cannot_hold').length,
   sustainedEligible:evaluations.filter(e=>e.eligibility.eligibleWindowsSeconds.length>0).length,
   pelotonDropEvents:transitions.length,
   pelotonDroppedRiders:transitions.reduce((n,t)=>n+t.movedRiderIds.length,0)}
 })
 const prefinish=rows.filter(r=>r.km<input.distanceKm&&r.pelotonSize>0)
 const finishing=rows.filter(r=>r.km>=input.distanceKm&&r.pelotonSize>0)
 const climbs=prefinish.filter(r=>r.gradient>=5)
 const severe=prefinish.filter(r=>r.gradient>=8)
 const actualDropTransitions=stage.ticks.flatMap(t=>t.transitions.filter(x=>
  x.sourceGroupId==='peloton_main'))
 const finalRiders=Object.values(stage.finalState.riders)
 const initialRiders=Object.values(stage.initialState.riders)
 const energyLoss=initialRiders.map(r=>({
  riderId:r.riderId,
  spent:r.energy-stage.finalState.riders[r.riderId].energy,
  initial:r.energy,final:stage.finalState.riders[r.riderId].energy,
 }))
 const totals={
  route,simulationTicks:rows.length,prefinishTicks:prefinish.length,
  finishCrossingTicks:finishing.length,
  minGradient:Math.min(...prefinish.map(r=>r.gradient)),
  maxGradient:Math.max(...prefinish.map(r=>r.gradient)),
  ticksGrade5Plus:climbs.length,ticksGrade8Plus:severe.length,
  maximumUnderPressure:Math.max(...prefinish.map(r=>r.underPressure)),
  maximumCannotHold:Math.max(...prefinish.map(r=>r.cannotHold)),
  cannotHoldTicks:prefinish.filter(r=>r.cannotHold>0).length,
  sustainedEligibilityTicks:prefinish.filter(r=>r.sustainedEligible>0).length,
  actualDropTransitions:actualDropTransitions.length,
  actualDroppedRiderCount:actualDropTransitions.reduce((n,t)=>n+t.movedRiderIds.length,0),
  finalPelotonSize:stage.finalState.groups['peloton_main']?.riderIds.length??null,
  minRemainingEnergy:Math.min(...energyLoss.map(r=>r.final)),
  maxEnergySpent:Math.max(...energyLoss.map(r=>r.spent)),
  meanEnergySpent:energyLoss.reduce((sum,r)=>sum+r.spent,0)/energyLoss.length,
  selectedRiderEnergyLoss:energyLoss.find(r=>r.riderId==='sustain-rider-001')?.spent,
  highPressure:prefinish.slice().sort((a,b)=>b.cannotHold-a.cannotHold||
   b.underPressure-a.underPressure).slice(0,6),
 }
 const checks={
  completed:stage.completed&&finalRiders.length===128&&
   finalRiders.every(r=>r.stageStatus==='finished'),
  pressureComplete:prefinish.length>0&&prefinish.every(r=>
   r.pressureEvaluated===r.pelotonSize&&
   r.comfortable+r.underPressure+r.cannotHold===r.pelotonSize)&&
   finishing.every(r=>r.pressureEvaluated===0),
  observedTransitionsMatch:totals.actualDroppedRiderCount===
   rows.reduce((sum,r)=>sum+r.pelotonDroppedRiders,0),
  genuineClimbs:route==='rolling'||(totals.ticksGrade5Plus>0&&totals.ticksGrade8Plus>0),
  finiteEnergy:energyLoss.every(r=>Number.isFinite(r.spent)&&r.spent>=0&&
   r.final>=0&&r.final<=r.initial),
 }
 return {route,totals,checks}
}
const rolling=evaluate('rolling')
const mountain=evaluate('mountain')
const checks={
 scenariosComplete:rolling.checks.completed&&mountain.checks.completed,
 pressureComplete:rolling.checks.pressureComplete&&mountain.checks.pressureComplete,
 dropsActuallyObserved:rolling.checks.observedTransitionsMatch&&
  mountain.checks.observedTransitionsMatch,
 genuineMountainGradients:mountain.checks.genuineClimbs,
 finiteEnergy:rolling.checks.finiteEnergy&&mountain.checks.finiteEnergy,
 identicalRosterSize:rolling.totals.route==='rolling'&&mountain.totals.route==='mountain',
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-mountain-terrain-audit-v1',
 checks,scenarios:[rolling.totals,mountain.totals],
 note:'No minimum drop count is imposed: zero drops on mountain terrain is a diagnostic finding, not a fabricated failure. Offline only.'
},null,2)+'\n')
