// 043F local diagnostic child. No database or authoritative promotion.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import {runCompetitionCrossingReview} from '../src/race-engine/simulation/competitionCrossingReview'
import {runDeterministicRoadRace} from '../src/race-engine/simulation/runDeterministicRoadRace'
import {reconcileCanonicalMarkerReview} from './uranius-canonical-marker-review.mjs'
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043F: '+m)}
const sha=(x:string)=>createHash('sha256').update(x,'utf8').digest('hex')
const uuid=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const raw=readFileSync(0,'utf8')
req(Buffer.byteLength(raw)<=524288,'input too large')
const p=JSON.parse(raw)
req(p?.provenance==='synthetic_review_fixture'&&uuid(p.jobId),'explicit synthetic fixture required')
req(Object.keys(p).sort().join(',')==='expectedInputSha256,expectedMarkerEvidenceSha256,input,jobId,markerEvidence,provenance','unexpected packet fields')
const {input,markerEvidence}=p
const inputText=JSON.stringify(input)
req(sha(inputText)===p.expectedInputSha256,'input digest mismatch')
req(carryoverDigest(markerEvidence)===p.expectedMarkerEvidenceSha256,'marker evidence digest mismatch')
validateStageInput(input)
req(input.stageFormat==='road_race'&&input.orders.length===0,'only no-command road race')
req(markerEvidence.stageId===input.stageId&&markerEvidence.distanceKm===input.distanceKm&&markerEvidence.stageFormat===input.stageFormat,'marker stage scope mismatch')
const {receipt:markers,sha256:markerReceiptSha256}=reconcileCanonicalMarkerReview(markerEvidence)
const trace=markers.traceMarkers.length>0?runCompetitionCrossingReview(input,markers.traceMarkers):null
const output=trace?trace.output:runDeterministicRoadRace(input,{simulationMode:'existing_v1'})
const outputText=JSON.stringify(output)
const job={jobId:p.jobId,stageId:input.stageId,status:'completed',attempt:1,inputText,outputText,inputSha256:sha(inputText),outputSha256:sha(outputText)}
const competitions=trace?.competitions??[]
const receipt={provenance:'synthetic_review_fixture',completePointDefinitions:true,stageId:input.stageId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,points:markers.scoringPoints,crossings:competitions.map(c=>({pointId:c.pointId,riderIds:c.crossings.map(x=>x.riderId)}))}
const stageRace=projectStageScoring({job,receipt:{...receipt,raceFormat:'stage_race'}})
const oneDay=projectStageScoring({job,receipt:{...receipt,raceFormat:'one_day'}})
const evidence={raceId:input.raceId,stageId:input.stageId,jobId:p.jobId,inputSha256:job.inputSha256,outputSha256:job.outputSha256,markerEvidenceSha256:p.expectedMarkerEvidenceSha256,markerReceiptSha256,crossingsSha256:carryoverDigest(competitions),stageRaceSha256:carryoverDigest(stageRace),oneDaySha256:carryoverDigest(oneDay),mode:trace?'physical_crossing_review':'finish_only',tieRule:trace?.tieRule??null}
process.stdout.write(JSON.stringify({version:'043F_canonical_engine_scoring_review_v1',evidence,evidenceSha256:carryoverDigest(evidence),markers,competitions,outputText,stageRace,oneDay,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}))
