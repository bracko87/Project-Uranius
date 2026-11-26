// Offline-only driver; never selected by hosted worker.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import type {StageInput} from '../src/race-engine/domain/StageInput'
const raw=readFileSync(0,'utf8')
assert.ok(Buffer.byteLength(raw)<=524288)
const input:StageInput=JSON.parse(raw)
validateStageInput(input)
assert.equal(input.stageFormat,'road_race')
assert.equal(input.orders.length,0)
const mode=process.argv[2]
assert.ok(mode==='existing_v1'||mode==='terrain_separation_calibrated_v1')
const initial=createInitialState(input)
for(const r of input.riders){
 assert.equal(initial.riders[r.riderId].energy,r.condition?.startingEnergy??100)
 if(r.condition)assert.deepEqual(initial.riders[r.riderId].startingCondition,r.condition)
}
const output=runDeterministicRoadRace(input,{simulationMode:mode})
process.stdout.write(JSON.stringify(output))
