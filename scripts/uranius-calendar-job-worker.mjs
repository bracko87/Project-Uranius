// V2 calendar worker. Reuses the native-tested claim and lease machinery.
// Existing frozen 025/026 execution sources remain unchanged.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {claimSql,completeSql,digest,expireExhaustedSql} from './uranius-race-job-worker.mjs'
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const id=x=>{assert.ok(typeof x==='string'&&uuid.test(x));return "'"+x+"'::uuid"}
const encode=x=>"convert_from(decode('"+Buffer.from(x,'utf8').toString('hex')+"','hex'),'UTF8')"
export function validateNovelOutput(input,output){
 assert.ok(typeof output==='string'&&Buffer.byteLength(output,'utf8')<=4194304)
 const o=JSON.parse(output)
 assert.equal(o.raceId,input.raceId);assert.equal(o.stageId,input.stageId);assert.equal(o.seed,input.seed)
 assert.equal(o.engineVersion,'race_engine_ts_v1');assert.equal(o.simulationMode,'deterministic_road_race_v1')
 assert.ok(Array.isArray(o.finalRiderStates)&&Array.isArray(o.snapshots)&&o.snapshots.length>=2&&Array.isArray(o.events))
 assert.deepEqual(o.finalRiderStates.map(x=>x.riderId+':'+x.teamId).sort(),input.riders.map(x=>x.riderId+':'+x.teamId).sort())
 return o
}
export async function executeCalendarJob({query,simulate,token=randomUUID()}){
 await query(expireExhaustedSql)
 const claim=claimSql(token).replace('j.attempt,j.lease_token','j.attempt,j.lease_token,j.job_kind,j.calendar_date')
 const job=JSON.parse(await query(claim))
 if(job===null)return {status:'idle'}
 assert.equal(job.lease_token,token);assert.equal(digest(job.input_text),job.input_sha256)
 const input=JSON.parse(job.input_text);assert.equal(input.stageId,job.stage_id)
 let output,finish
 if(job.job_kind==='verified_repeat'){
  output=await simulate(job.input_text);finish=completeSql(job,output)
 }else{
  assert.equal(job.job_kind,'calendar_review');assert.equal(job.expected_output_sha256,null)
  assert.equal(input.seed,'uranius-calendar-v1:'+job.stage_id+':'+job.calendar_date)
  const first=await simulate(job.input_text),second=await simulate(job.input_text)
  validateNovelOutput(input,first);validateNovelOutput(input,second)
  assert.equal(first,second,'Independent deterministic executions disagree')
  output=first
  finish=`WITH completed AS (UPDATE uranius_jobs.race_jobs SET status='completed',lease_token=NULL,lease_until=NULL,
    output_text=${encode(output)},output_sha256='${digest(output)}',completed_at=clock_timestamp()
    WHERE job_id=${id(job.job_id)} AND lease_token=${id(token)} AND status='running' AND lease_until>clock_timestamp()
    AND job_kind='calendar_review' AND expected_output_sha256 IS NULL RETURNING job_id)
    SELECT count(*) FROM completed;`
 }
 if(Number(await query(finish))!==1)return {status:'lease-lost'}
 return {status:'completed',jobId:job.job_id,attempt:job.attempt,outputSha256:digest(output)}
}
