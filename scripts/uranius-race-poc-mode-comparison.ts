// OFFLINE controlled lane comparison: unchanged StageInput in each pair.
// Not a rules change or an activation of any hosted simulation lane.
import {performance} from 'node:perf_hooks'
import {createHash} from 'node:crypto'
import {createSyntheticFullFieldStage} from '../src/race-engine/tests/fixtures/syntheticFullFieldStage'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import type {SimulationOutput} from '../src/race-engine/domain/SimulationOutput'

type Lane='existing_v1'|'terrain_separation_calibrated_v1'
const signature=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16)
const round=(v:number)=>Number(v.toFixed(3))
function examine(terrain:'flat'|'hilly'|'mountain',size:24|48|96,seed:string,lane:Lane){
 const base=createSyntheticFullFieldStage(terrain,size)
 const input={...base,seed:base.seed+'-'+seed}
 const started=performance.now()
 const output=runDeterministicRoadRace(input,{simulationMode:lane})
 const runtimeMilliseconds=round(performance.now()-started)
 const {finalRiderStates:final,snapshots}=output
 const ids=new Set(input.riders.map(x=>x.riderId))
 const actualIds=new Set(final.map(x=>x.riderId))
 const exactRoster=actualIds.size===ids.size&&final.length===ids.size&&[...ids].every(id=>actualIds.has(id))
 const finishers=final.filter(r=>r.finished&&r.finishTimeSeconds!==null)
 const times=finishers.map(r=>r.finishTimeSeconds as number)
 const spread=times.length?Math.max(...times)-Math.min(...times):null
 const groups=snapshots.map(frame=>frame.groups.filter(g=>g.active&&g.riderIds.length>0).length)
 const maxActiveGroups=Math.max(0,...groups)
 const maxGroupSpeed=Math.max(0,...snapshots.flatMap(x=>x.groups.filter(g=>g.active).map(g=>g.speedKmh)))
 const eventTypeCounts:Record<string,number>={}
 for(const event of output.events)eventTypeCounts[event.eventType]=(eventTypeCounts[event.eventType]??0)+1
 const elapsed=round(runtimeMilliseconds)
 const issues:string[]=[]
 if(!exactRoster||finishers.length!==size)issues.push('INCOMPLETE_OR_INVALID_ROSTER')
 if(spread===0)issues.push('ZERO_FINISH_TIME_SPREAD')
 if(maxActiveGroups<2)issues.push('NO_RECORDED_GROUP_SPLIT')
 if(!Number.isFinite(maxGroupSpeed)||maxGroupSpeed>input.settings.maximumSpeedKmh+.01)issues.push('GROUP_SPEED_EXCEEDS_CONFIGURED_MAX')
 const winner=times.length?Math.min(...times):null
 const winnerKmh=winner&&winner>0?round(input.distanceKm*3600/winner):null
 return {terrain,fieldSize:size,seed:input.seed,mode:lane,sha16:signature(output),
  runtimeMilliseconds:elapsed,outputBytes:Buffer.byteLength(JSON.stringify(output)),
  finishers:finishers.length,uniqueFinalRiders:actualIds.size,exactRoster,
  winnerAverageKmh:winnerKmh,finishSpreadSeconds:spread===null?null:round(spread),
  uniqueFinishTimes:new Set(times).size,maxActiveGroups,
  maxObservedGroupSpeedKmh:round(maxGroupSpeed),snapshots:snapshots.length,
  events:output.events.length,eventTypeCounts,issues}
}
const inputs=[
 ['flat',24,'same-seed'],['hilly',48,'same-seed'],['mountain',96,'same-seed'],
 ['flat',96,'same-seed'],['mountain',96,'other-seed'],
] as const
const pairs=[]
for(const [terrain,size,seed] of inputs){
 try {
  const baseline=examine(terrain,size,seed,'existing_v1')
  const calibrated=examine(terrain,size,seed,'terrain_separation_calibrated_v1')
  pairs.push({terrain,fieldSize:size,seed,
   existing:baseline,calibrated,
   groupSeparationImproved:calibrated.maxActiveGroups>baseline.maxActiveGroups,
   finishSpreadImproved:calibrated.finishSpreadSeconds!==null&&
     calibrated.finishSpreadSeconds>(baseline.finishSpreadSeconds??0)})
 }catch(error){
  pairs.push({terrain,fieldSize:size,seed,error:error instanceof Error?error.message:String(error)})
 }
}
const successful=pairs.filter(pair=>!('error' in pair))
const fullyCompleted=successful.length===pairs.length&&successful.every(p=>p.existing.exactRoster&&p.calibrated.exactRoster)
const meaningfulSeparation=successful.some(p=>p.calibrated.maxActiveGroups>=2 || (p.calibrated.finishSpreadSeconds??0)>0)
const verdict=!fullyCompleted?'TECHNICAL_INVESTIGATION_REQUIRED':meaningfulSeparation?'PROMISING_CALIBRATED_LANE_REQUIRES_SPORTING_REVIEW':'BOTH_LANES_LACK_SEPARATION_ON_TEST_FIXTURES'
process.stdout.write(JSON.stringify({reportVersion:'uranius-race-mode-comparison-v1',
 scope:'OFFLINE SYNTHETIC ONLY; no production/hosted activation',
 engines:['existing_v1','terrain_separation_calibrated_v1'],
 verdict,pairs,
 caveat:'Identical fictional 30km rider/route/seed inputs in each pair. A group split or finish spread is necessary but not sufficient for realism; true cycling calibration, larger fields, longer distances and time trials are untested.'},null,2)+'\n')
