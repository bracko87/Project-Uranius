// 043A: offline diagnostic child only. One engine run; both scoring formats.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {runCompetitionCrossingReview} from '../src/race-engine/simulation/competitionCrossingReview'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
const raw=readFileSync(0,'utf8')
if(Buffer.byteLength(raw)>524288)throw Error('043A: input too large')
const packet=JSON.parse(raw)
if(packet.provenance!=='synthetic_review_fixture'||!Array.isArray(packet.points))throw Error('043A: explicit synthetic fixture required')
const {input,points}=packet
const markers=points.filter((p:any)=>['INTERMEDIATE_SPRINT','BONUS_SPRINT','KOM'].includes(p.type)).map((p:any)=>({pointId:p.pointId,type:p.type,km:p.km}))
console.error('INFO 043A engine and physical crossing collector started')
const review=runCompetitionCrossingReview(input,markers)
console.error('INFO 043A engine and physical crossing collector completed')
const outputText=JSON.stringify(review.output),inputText=JSON.stringify(input)
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex')
const job={jobId:packet.jobId,stageId:input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:sha(inputText),outputSha256:sha(outputText)}
const receipt={provenance:'synthetic_review_fixture',completePointDefinitions:true,stageId:input.stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,points,crossings:review.competitions.map(p=>({pointId:p.pointId,riderIds:p.crossings.map(x=>x.riderId)}))}
const stageRace=projectStageScoring({job,receipt:{...receipt,raceFormat:'stage_race'}})
const oneDay=projectStageScoring({job,receipt:{...receipt,raceFormat:'one_day'}})
console.error('INFO 043A both scoring projections completed')
process.stdout.write(JSON.stringify({version:'043A_competition_acceptance_v1',outputText,source:{inputSha256:job.inputSha256,outputSha256:job.outputSha256,schemeSha256:sha(JSON.stringify(points))},timingRule:review.timingRule,tieRule:review.tieRule,competitions:review.competitions,stageRace,oneDay,official:false,hostedWriteAllowed:false}))
