// Offline release regression: original goldens plus calibrated default comparison.
import {performance} from 'node:perf_hooks'
import {createCanonicalHashedValue} from '../src/race-engine/simulation/canonicalSerialization'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createSyntheticFullFieldStage} from '../src/race-engine/tests/fixtures/syntheticFullFieldStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

const hash=(value:unknown)=>createCanonicalHashedValue(value).hash
const scenarios=[
 {name:'micro-10',input:syntheticTenRiderStage,expected:'98cdb350835b7fde',frames:32,events:12},
 {name:'flat-24',input:createSyntheticFullFieldStage('flat',24),expected:'a16eeb4aa3fd0bc6',frames:86,events:26},
 {name:'hilly-48',input:createSyntheticFullFieldStage('hilly',48),expected:'7ed8f7c2a7e0d7c6',frames:89,events:50},
 {name:'mountain-96',input:createSyntheticFullFieldStage('mountain',96),expected:'c5152197cecfe4d0',frames:100,events:98},
 {name:'flat-96',input:createSyntheticFullFieldStage('flat',96),expected:'364c8989142147b5',frames:86,events:98},
]
const rosterOk=(input:StageInput,out:ReturnType<typeof runDeterministicRoadRace>)=>
 JSON.stringify(out.finalRiderStates.map(r=>r.riderId).sort())===JSON.stringify(input.riders.map(r=>r.riderId).sort())&&
 out.finalRiderStates.every(r=>r.finished)
const mode=process.argv[2]
if(mode!=='current'&&mode!=='reference')throw Error('Invalid regression mode')
const golden=mode==='current'?scenarios.map(s=>{
 const start=performance.now()
 const out=runDeterministicRoadRace(s.input)
 const milliseconds=Math.round(performance.now()-start)
 const actual=hash(out),bytes=Buffer.byteLength(JSON.stringify(out))
 return {name:s.name,expected:s.expected,actual,milliseconds,bytes,frames:out.snapshots.length,events:out.events.length,
  rosterOk:rosterOk(s.input,out),passed:actual===s.expected&&out.snapshots.length===s.frames&&out.events.length===s.events&&
   rosterOk(s.input,out)&&bytes<=1024*1024&&milliseconds<=20000}
}):[]
// Local enrichment ONLY for calibrated path. The five existing_v1 fixtures remain byte-for-byte unchanged.
const calibrated=scenarios.slice(0,3).map(s=>{
 const input:StageInput={...s.input,riders:s.input.riders.map(r=>({...r,
  attributes:{...r.attributes,timeTrial:r.attributes.timeTrial??75,raceIq:r.attributes.raceIq??75}}))}
 const out=runDeterministicRoadRace(input,{simulationMode:'terrain_separation_calibrated_v1'})
 return {name:s.name,hash:hash(out),rosterOk:rosterOk(input,out),frames:out.snapshots.length,events:out.events.length}
})
process.stdout.write(JSON.stringify({version:'uranius-frozen-race-regression-v1',mode,golden,calibrated})+'\n')
