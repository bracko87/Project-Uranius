// Pure engine child: stdin frozen StageInput; stdout exact serialized SimulationOutput.
// No network or database access; no new engine behavior.
import {readFileSync} from 'node:fs'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
const text=readFileSync(0,'utf8')
if(Buffer.byteLength(text)>524288)throw Error('Input too large')
const input=JSON.parse(text)
validateStageInput(input)
if(input.stageFormat!=='road_race'||input.orders.length!==0)throw Error('Only no-command road races in this worker review')
const output=runDeterministicRoadRace(input,{simulationMode:'existing_v1'})
process.stdout.write(JSON.stringify(output))
