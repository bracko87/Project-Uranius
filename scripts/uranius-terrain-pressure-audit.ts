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


type Row={
 second:number,km:number,gradient:number,pelotonRiders:number,
 comfortable:number,underPressure:number,cannotHold:number,
 eligibleDrop:number,actualDrop:number,pelotonSpeed:number,
 meanCapability:number,groupDemand:number
}
const input=buildInput(86,'baseline')
const stage=runCalibratedTerrainSeparationStage(createInitialState(input))
const rows:Row[]=stage.ticks.map(tick=>{
 const peloton=tick.movement.movement.proposals.find(p=>p.groupType==='peloton')
 const evaluations=tick.pressureEvaluations.filter(e=>e.groupId==='peloton_main')
 return {second:tick.state.raceSecond,km:peloton?.nextDistanceKm??0,
  gradient:peloton?.gradientPercent??0,pelotonSpeed:peloton?.appliedSpeedKmh??0,
  pelotonRiders:peloton?.riderIds.length??0,
  comfortable:evaluations.filter(e=>e.hold.status==='comfortable').length,
  underPressure:evaluations.filter(e=>e.hold.status==='under_pressure').length,
  cannotHold:evaluations.filter(e=>e.hold.status==='cannot_hold').length,
  eligibleDrop:evaluations.filter(e=>e.eligibility.eligibleWindowsSeconds.length>0).length,
  actualDrop:tick.transitions.filter(t=>t.sourceGroupId==='peloton_main').length,
  meanCapability:evaluations.length?evaluations.reduce((sum,e)=>
   sum+e.hold.riderCapabilityScore,0)/evaluations.length:0,
  groupDemand:evaluations[0]?.groupDemandScore??0}
})
const maximum=Math.max(...rows.map(r=>r.cannotHold))
const climbing=rows.filter(r=>r.gradient>=3)
const flat=rows.filter(r=>Math.abs(r.gradient)<1)
const totals={
 evaluatedTicks:rows.length,
 ticksWithCannotHold:rows.filter(r=>r.cannotHold>0).length,
 ticksWithDropEligibility:rows.filter(r=>r.eligibleDrop>0).length,
 actualDropTransitions:rows.reduce((sum,r)=>sum+r.actualDrop,0),
 maxCannotHoldRidersOneTick:maximum,
 climbingTickCount:climbing.length,
 flatTickCount:flat.length,
 climbingPressureTicks:climbing.filter(r=>r.cannotHold>0).length,
 flatPressureTicks:flat.filter(r=>r.cannotHold>0).length,
 greatestPressure:rows.slice().sort((a,b)=>b.cannotHold-a.cannotHold||
   b.underPressure-a.underPressure).slice(0,8),
}
const checks={
 completed:stage.completed&&Object.values(stage.finalState.riders).length===128,
 pressureRecorded:rows.length>0&&rows.every(r=>r.comfortable+r.underPressure+
  r.cannotHold===r.pelotonRiders),
 noInventedTransitions:totals.actualDropTransitions===stage.ticks.reduce((sum,t)=>
  sum+t.transitions.filter(x=>x.sourceGroupId==='peloton_main').length,0),
 validClassification:rows.every(r=>r.cannotHold>=r.eligibleDrop&&
  r.pelotonSpeed>=0&&Number.isFinite(r.groupDemand)),
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-terrain-pressure-audit-v1',
 scenario:'120km rolling, strength 86 no orders, 128 riders',
 checks,totals,rows,
 interpretation:'Diagnostic only: under_pressure does not imply dropped. A sustained cannot_hold window is required before dropping. No forced outcomes.'
},null,2)+'\n')
