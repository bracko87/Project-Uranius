// Offline pressure telemetry for the calibrated Uranius lane. No rule modifications.
// Uses the calibrated runner's existing per-tick pressure trace, never a DB/worker.
import {createSyntheticFullFieldStage} from '../src/race-engine/tests/fixtures/syntheticFullFieldStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const names=['flat_baseline_24','mountain_baseline_96','mountain_stress_96'] as const
function inputFor(scenario:typeof names[number]):StageInput{
 const terrain=scenario==='flat_baseline_24'?'flat':'mountain'
 const size=scenario==='flat_baseline_24'?24:96
 const base=createSyntheticFullFieldStage(terrain,size)
 // The legacy fixture leaves timeTrial/raceIq optional. Calibrated lane needs both.
 const riders=base.riders.map((r,index)=>{
  const stress=scenario==='mountain_stress_96'&&index%4===0
  return {...r,attributes:{...r.attributes,
    timeTrial:60+(index*13)%35,
    raceIq:62+(index*17)%31,
    // Explicit deliberately weak synthetic riders only for diagnostic sensitivity.
    ...(stress?{flat:38,climbing:25,stamina:40,resistance:35,recovery:40}:{}),
  }}
 })
 const points=scenario==='mountain_stress_96'
  ? [100,1000,300,1300].map((elevationMetres,index)=>({kilometre:index*10,elevationMetres}))
  :base.profilePoints
 return {...base,seed:base.seed+'-pressure-probe-'+scenario,riders,profilePoints:points}
}
function diagnose(scenario:typeof names[number]){
 const input=inputFor(scenario)
 const result=runCalibratedTerrainSeparationStage(createInitialState(input))
 const holds={comfortable:0,under_pressure:0,cannot_hold:0}
 const riderStreaks=new Map<string,number>()
 let minMargin=Infinity,maxDemand=-Infinity,maxSteepGradient=-Infinity
 let maxCannotHoldStreakSeconds=0
 let eligibleWindowEvents=0
 let ridersEverCannotHold=new Set<string>()
 let belowDropMarginEvaluations=0
 const samples:Array<{tick:number,second:number,notHolding:number,eligible:number,minCapabilityMargin:number,maxDemand:number}>=[]
 for(let i=0;i<result.ticks.length;i++){
  const tick=result.ticks[i]
  let cannotHoldCount=0,eligibleCount=0,tickMinMargin=Infinity,tickMaxDemand=-Infinity
  for(const e of tick.pressureEvaluations){
   holds[e.hold.status]++
   minMargin=Math.min(minMargin,e.hold.capabilityMargin)
   tickMinMargin=Math.min(tickMinMargin,e.hold.capabilityMargin)
   maxDemand=Math.max(maxDemand,e.groupDemandScore)
   tickMaxDemand=Math.max(tickMaxDemand,e.groupDemandScore)
   maxSteepGradient=Math.max(maxSteepGradient,e.gradientPercent)
   if(e.hold.capabilityMargin< -8)belowDropMarginEvaluations++
   if(e.hold.status==='cannot_hold'){
    ridersEverCannotHold.add(e.riderId)
    cannotHoldCount++
   }
   const streak=e.eligibility.nextConsecutiveCannotHoldSeconds
   riderStreaks.set(e.riderId,Math.max(riderStreaks.get(e.riderId)??0,streak))
   maxCannotHoldStreakSeconds=Math.max(maxCannotHoldStreakSeconds,streak)
   if(e.eligibility.eligibleWindowsSeconds.includes(120)){eligibleCount++;eligibleWindowEvents++}
  }
  if(i%10===0||eligibleCount>0||tick.transitions.length){
   samples.push({tick:i,second:tick.state.raceSecond,notHolding:cannotHoldCount,eligible:eligibleCount,
    minCapabilityMargin:Number.isFinite(tickMinMargin)?Number(tickMinMargin.toFixed(3)):0,
    maxDemand:Number.isFinite(tickMaxDemand)?Number(tickMaxDemand.toFixed(3)):0})
  }
 }
 const maxGroups=Math.max(0,...result.replaySnapshots.map(s=>Object.values(s.groups).filter(g=>g.active&&g.riderIds.length>0).length))
 const finishTimes=Object.values(result.finalState.riders).map(r=>r.finishTimeSeconds).filter((v):v is number=>v!==null)
 return {scenario,fieldSize:input.riders.length,terrainSegments:input.profilePoints,completed:result.completed,
  tickCount:result.tickCount,holdEvaluations:holds,minCapabilityMargin:Number.isFinite(minMargin)?Number(minMargin.toFixed(3)):null,
  maxGroupDemand:Number.isFinite(maxDemand)?Number(maxDemand.toFixed(3)):null,
  maxObservedGradientPercent:Number.isFinite(maxSteepGradient)?Number(maxSteepGradient.toFixed(3)):null,
  belowDropMarginEvaluations,ridersEverCannotHold:ridersEverCannotHold.size,
  maxCannotHoldStreakSeconds,eligibleWindowEvents,
  transitions:result.transitions.length,
  transitionTypes:result.transitions.reduce((a,t)=>({...a,[t.transitionKind]:(a[t.transitionKind]??0)+1}),{} as Record<string,number>),
  maxActiveGroups:maxGroups,
  finishSpreadSeconds:finishTimes.length?Math.max(...finishTimes)-Math.min(...finishTimes):null,
  sampleCount:samples.length,traceSamples:samples.slice(0,40),
  signal:maxCannotHoldStreakSeconds<120?'NO_SUSTAINED_CANNOT_HOLD':
    eligibleWindowEvents===0?'NO_ELIGIBLE_TRANSITIONS':
    result.transitions.length===0?'ELIGIBLE_BUT_NO_TRANSITION':
    'DROPPED_TRANSITION_OCCURRED',
 }
}
const results=names.map(name=>{
 try{return diagnose(name)}catch(err){return {scenario:name,error:err instanceof Error?err.message:String(err)}}
})
process.stdout.write(JSON.stringify({reportVersion:'uranius-pressure-trace-v1',isolated:true,
 note:'Directly read existing calibrated per-tick pressure evaluations. Stress riders/course are fictional and intentionally extreme. Observations do not validate sporting realism.',
 results},null,2)+'\n')
