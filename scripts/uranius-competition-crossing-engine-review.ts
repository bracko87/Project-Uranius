// Offline bundle entry. Separate versioned envelope, unchanged inner legacy output.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {runCompetitionCrossingReview} from '../src/race-engine/simulation/competitionCrossingReview'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
const raw=readFileSync(0,'utf8')
if(Buffer.byteLength(raw)>524288)throw Error('Input too large')
const packet=JSON.parse(raw)
if(packet.provenance!=='synthetic_review_fixture')throw Error('Synthetic review only')
const {input,points,raceFormat}=packet
if(!Array.isArray(points)||!['one_day','stage_race'].includes(raceFormat))throw Error('Missing explicit scheme')
const markers=points.filter((p:any)=>['INTERMEDIATE_SPRINT','BONUS_SPRINT','KOM'].includes(p.type)).map((p:any)=>({pointId:p.pointId,type:p.type,km:p.km}))
const review=runCompetitionCrossingReview(input,markers)
const outputText=JSON.stringify(review.output),inputText=JSON.stringify(input)
if(outputText!==JSON.stringify(runDeterministicRoadRace(input)))throw Error('Legacy output parity mismatch')
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex')
const job={jobId:packet.jobId,stageId:input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:sha(inputText),outputSha256:sha(outputText)}
const receipt={provenance:'synthetic_review_fixture',completePointDefinitions:true,stageId:input.stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,raceFormat,points,crossings:review.competitions.map(p=>({pointId:p.pointId,riderIds:p.crossings.map(x=>x.riderId)}))}
const scored=projectStageScoring({job,receipt})
process.stdout.write(JSON.stringify({version:review.version,timingRule:review.timingRule,tieRule:review.tieRule,source:{inputSha256:job.inputSha256,outputSha256:job.outputSha256,schemeSha256:sha(JSON.stringify(points))},legacyParity:true,competitions:review.competitions,scoring:scored,official:false,hostedWriteAllowed:false}))
