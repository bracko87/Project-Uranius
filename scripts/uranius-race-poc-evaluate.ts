// Uranius Race Engine Proof-of-Concept: OFFLINE ONLY.
// Run compiled via scripts/run-uranius-race-poc.mjs. Does not open DB, API or network.
import {performance} from 'node:perf_hooks'
import {createHash} from 'node:crypto'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import {createSyntheticFullFieldStage} from '../src/race-engine/tests/fixtures/syntheticFullFieldStage'
import {compareAttacks} from '../demo/race-replay/attackComparison'
import type {SimulationOutput} from '../src/race-engine/domain/SimulationOutput'

const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16)
const round=(x:number)=>Math.round(x*1000)/1000
function evaluate(terrain:'flat'|'hilly'|'mountain',fieldSize:24|48|96,seedSuffix:string){
 const template=createSyntheticFullFieldStage(terrain,fieldSize)
 const input={...template,seed:template.seed+'-'+seedSuffix}
 const t=performance.now()
 const output=runDeterministicRoadRace(input)
 const runtimeMs=round(performance.now()-t)
 const repeated=runDeterministicRoadRace(input)
 const repeatedDigest=hash(repeated)
 const digest=hash(output)
 const roster=new Set(input.riders.map(r=>r.riderId))
 const states=output.finalRiderStates
 const finished=states.filter(x=>x.finished && x.finishTimeSeconds!==null)
 const finishTimes=finished.map(x=>x.finishTimeSeconds as number).sort((a,b)=>a-b)
 const winner=finishTimes[0]??null,tail=finishTimes.at(-1)??null
 const winnerKmh=winner && winner>0 ? round(input.distanceKm/(winner/3600)):null
 const finalSpreadSeconds=winner!==null && tail!==null ?round(tail-winner):null
 const identicalFinishTimes=new Set(finishTimes).size
 const groupsPerFrame=output.snapshots.map(frame=>frame.groups.filter(g=>g.active && g.riderIds.length>0).length)
 const topSpeed=Math.max(0,...output.snapshots.flatMap(frame=>frame.groups.filter(g=>g.active).map(g=>g.speedKmh)))
 const minEnergy=Math.min(...states.map(x=>x.energy))
 const maxEnergy=Math.max(...states.map(x=>x.energy))
 const finalRiderIds=states.map(x=>x.riderId)
 const duplicates=finalRiderIds.filter((id,i)=>finalRiderIds.indexOf(id)!==i)
 const warningFlags:string[]=[]
 if(finished.length!==fieldSize || duplicates.length || finalRiderIds.some(id=>!roster.has(id)))
  warningFlags.push('ROSTER_OR_FINISH_INTEGRITY_FAILURE')
 if(digest!==repeatedDigest)warningFlags.push('NONDETERMINISTIC_OUTPUT')
 if(winnerKmh===null || winnerKmh<15 || winnerKmh>65)
  warningFlags.push('UNUSUAL_STAGE_AVERAGE_SPEED_REVIEW')
 if(finalSpreadSeconds===0)warningFlags.push('ALL_RIDERS_SAME_FINISH_TIME_REVIEW')
 if(finalSpreadSeconds!==null && finalSpreadSeconds>7200)warningFlags.push('EXTREME_FINAL_TIME_SPREAD_REVIEW')
 if(Math.max(...groupsPerFrame)<=1)warningFlags.push('NO_GROUP_SEPARATION_REVIEW')
 if(topSpeed>input.settings.maximumSpeedKmh+0.01)warningFlags.push('GROUP_SPEED_ABOVE_CONFIGURED_MAX_REVIEW')
 if(!Number.isFinite(minEnergy)||!Number.isFinite(maxEnergy)||minEnergy<0)warningFlags.push('ENERGY_RANGE_REVIEW')
 return {
  terrain,fieldSize,seed:input.seed,distanceKm:input.distanceKm,engineMode:'existing_v1',
  digest,digestRepeat:repeatedDigest,deterministic:digest===repeatedDigest,
  runtimeMs,outputBytes:Buffer.byteLength(JSON.stringify(output)),
  finishers:finished.length,uniqueFinishTimes:identicalFinishTimes,
  winnerAverageKmh:winnerKmh,finishSpreadSeconds:finalSpreadSeconds,
  maxActiveGroups:Math.max(...groupsPerFrame),maxObservedGroupSpeedKmh:round(topSpeed),
  minFinalEnergy:round(minEnergy),maxFinalEnergy:round(maxEnergy),
  snapshots:output.snapshots.length,events:output.events.length,
  topThree:states.slice(0,3).map(r=>({riderId:r.riderId,position:r.finishPosition,finishTimeSeconds:r.finishTimeSeconds})),
  warningFlags,
 }
}
function attack(scenario:'strong'|'caught'){
 const result=compareAttacks(scenario)
 const riderId=result.selected.id
 const a=result.baseline.finalRiderStates.find(x=>x.riderId===riderId)
 const b=result.attacked.finalRiderStates.find(x=>x.riderId===riderId)
 if(!a || !b)throw Error('No selected rider in attack comparison')
 const energySaved=round(a.energy-b.energy)
 const changedTime=(a.finishTimeSeconds??0)-(b.finishTimeSeconds??0)
 return {
  scenario,riderId,commandSecond:result.commandSecond,
  previousHistoryIdentical:result.historyIdentical,
  baselineFinishSeconds:a.finishTimeSeconds,attackedFinishSeconds:b.finishTimeSeconds,
  changeInFinishSeconds:changedTime,
  baselineFinalEnergy:round(a.energy),attackedFinalEnergy:round(b.energy),
  // Positive energySaved means more energy was used after attack.
  energyUsedDifference:energySaved,
  peakGapKm:round(Math.max(...result.track.map(x=>x.gapKm))),
  visiblySuccessful:result.track.some(x=>x.status==='successful'),
  warningFlags:changedTime<0?['ATTACK_LOST_TIME_REVIEW']:
    changedTime>0 && energySaved<0?['FASTER_ATTACK_WITH_LESS_ENERGY_USED_REVIEW']:[],
 }
}
const scenarios=[
 evaluate('flat',24,'baseline'),
 evaluate('hilly',48,'baseline'),
 evaluate('mountain',96,'baseline'),
 evaluate('flat',96,'baseline'),
 evaluate('flat',96,'alternate-seed'),
 evaluate('mountain',96,'alternate-seed'),
]
const attacks=[attack('strong'),attack('caught')]
const checks={
 allScenariosRepeatable:scenarios.every(x=>x.deterministic),
 allFinishersAndValidRoster:scenarios.every(x=>x.finishers===x.fieldSize && !x.warningFlags.includes('ROSTER_OR_FINISH_INTEGRITY_FAILURE')),
 historyPreservedOnAttack:attacks.every(x=>x.previousHistoryIdentical),
 engineRunsWithoutBackend:true,
}
const concerns=[...new Set([...scenarios.flatMap(x=>x.warningFlags),...attacks.flatMap(x=>x.warningFlags)])]
const report={
 reportVersion:'uranius-race-poc-v1',
 scope:'OFFLINE FICTIONAL TESTS; no Supabase, workers, real players or production',
 evaluatedAtUtc:new Date().toISOString(),
 fixedScenarios:scenarios.length,
 technicalChecks:checks,
 scenarios,attacks,
 observedWarnings:concerns,
 verdict:!Object.values(checks).every(Boolean)?'TECHNICAL_NO_GO':
   concerns.length?'TECHNICAL_GO_SPORTING_IMPROVEMENT_REQUIRED':'TECHNICAL_GO_SPORTING_UNVALIDATED',
 limitation:'30 km fictional stage scenarios, only selected existing_v1 offline lane. No real race benchmark, 120-200 km stage, 150-rider field, TT, stage accounting, hosted job or real UI integration. Warning thresholds are triage heuristics, NOT cycling acceptance standards.'
}
process.stdout.write(JSON.stringify(report,null,2)+'\n')
