// 043U offline child: run unchanged legacy engine and derive incident review from actual internal tick states.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runMultiGroupStage} from '../src/race-engine/simulation/runMultiGroupStage'
import {createMultiGroupSimulationOutput} from '../src/race-engine/simulation/createMultiGroupSimulationOutput'
import {bindLegacyReadiness} from './uranius-frozen-readiness-review.mjs'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {projectEngineIncidentReplay} from './uranius-engine-incident-replay-review.mjs'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043U: '+m)}
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex')
const raw=readFileSync(0,'utf8')
req(Buffer.byteLength(raw)<=524288,'input too large')
const p=JSON.parse(raw)
req(p?.provenance==='synthetic_review_fixture'&&Object.keys(p).sort().join(',')==='context,expectedContextSha256,expectedInputSha256,expectedSourceSha256,input,provenance,source','unexpected review packet')
req(sha(JSON.stringify(p.input))===p.expectedInputSha256&&carryoverDigest(p.context)===p.expectedContextSha256,'input/context digest mismatch')
const bound=bindLegacyReadiness({source:p.source,expectedSourceSha256:p.expectedSourceSha256,input:p.input})
const input=bound.input
validateStageInput(input)
req(input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===30&&input.settings.replaySnapshotIntervalSeconds===30,'no-command 30s road stage required')
const stage=runMultiGroupStage(createInitialState(input),{maximumTickCount:1440})
const output=createMultiGroupSimulationOutput(stage),outputText=JSON.stringify(output)
const finish=output.finalRiderStates
req(finish.every(r=>r.stageStatus==='finished'&&r.finishTimeSeconds!==null),'all-finisher base engine required')
const winnerTimeSeconds=Math.min(...finish.map(r=>r.finishTimeSeconds as number))
req(winnerTimeSeconds===stage.finalState.raceSecond&&winnerTimeSeconds%30===0,'only common terminal tick supported')
const frames=[stage.initialState,...stage.ticks.map(t=>t.state)].map(s=>({raceSecond:s.raceSecond,actualKm:s.currentKm,riders:Object.values(s.riders).map(r=>({riderId:r.riderId,teamId:r.teamId,energy:r.energy,distanceKm:r.distanceKm,status:r.stageStatus})),groups:Object.values(s.groups).map(g=>({groupId:g.groupId,groupType:g.groupType,active:g.active,riderIds:g.riderIds,distanceKm:g.distanceKm,gapFromLeaderSeconds:g.gapFromLeaderSeconds}))}))
const review=projectEngineIncidentReplay({input,readinessReceipt:bound.receipt,runId:p.source.runId,context:p.context,frames,winnerTimeSeconds})
const evidence={inputSha256:sha(JSON.stringify(input)),sourceSha256:p.expectedSourceSha256,contextSha256:p.expectedContextSha256,readinessSha256:bound.readinessSha256,outputSha256:sha(outputText),reviewSha256:carryoverDigest(review),raceId:input.raceId,stageId:input.stageId,runId:p.source.runId,actualEngineTickCount:stage.tickCount,winnerTimeSeconds}
process.stdout.write(JSON.stringify({version:'043U_actual_engine_incident_review_v1',evidence,evidenceSha256:carryoverDigest(evidence),input,readinessReceipt:bound.receipt,outputText,review,actualEngineOutputUsed:true,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}))
