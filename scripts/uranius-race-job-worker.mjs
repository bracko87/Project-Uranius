// Private synthetic execution queue. SQL strings only accept checked UUIDs/digests.
import {createHash,randomUUID} from 'node:crypto'
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const sha=/^[0-9a-f]{64}$/
export const digest=text=>createHash('sha256').update(text,'utf8').digest('hex')
const id=x=>{if(typeof x!=='string'||!uuid.test(x))throw Error('Invalid job identity');return "'"+x+"'::uuid"}
const encode=x=>"convert_from(decode('"+Buffer.from(x,'utf8').toString('hex')+"','hex'),'UTF8')"
export const expireExhaustedSql=`UPDATE uranius_jobs.race_jobs SET status='failed',lease_token=NULL,lease_until=NULL
WHERE status='running' AND attempt=3 AND lease_until<=clock_timestamp();`
export function claimSql(token,seconds=180){
 if(!Number.isInteger(seconds)||seconds<1||seconds>180)throw Error('Invalid lease duration')
 return `WITH candidate AS (
 SELECT job_id FROM uranius_jobs.race_jobs WHERE
 (status='queued' AND due_at<=clock_timestamp()) OR
 (status='running' AND attempt<3 AND lease_until<=clock_timestamp())
 ORDER BY due_at,job_id FOR UPDATE SKIP LOCKED LIMIT 1
 ), claimed AS (
 UPDATE uranius_jobs.race_jobs j SET status='running',attempt=j.attempt+1,
 lease_token=${id(token)},lease_until=clock_timestamp()+interval '${seconds} seconds'
 FROM candidate c WHERE j.job_id=c.job_id
 RETURNING j.job_id,j.stage_id,j.input_text,j.input_sha256,j.expected_output_sha256,j.attempt,j.lease_token
 ) SELECT COALESCE((SELECT to_jsonb(claimed) FROM claimed),'null'::jsonb);`
}
export function completeSql(job,output){
 if(!sha.test(job.input_sha256)||!sha.test(job.expected_output_sha256)||typeof output!=='string'||
 Buffer.byteLength(output,'utf8')>4194304||digest(output)!==job.expected_output_sha256)throw Error('Engine output digest mismatch')
 return `WITH completed AS (
 UPDATE uranius_jobs.race_jobs SET status='completed',lease_token=NULL,lease_until=NULL,
 output_text=${encode(output)},output_sha256='${digest(output)}',completed_at=clock_timestamp()
 WHERE job_id=${id(job.job_id)} AND lease_token=${id(job.lease_token)}
 AND status='running' AND lease_until>clock_timestamp()
 RETURNING job_id
 ) SELECT count(*) FROM completed;`
}
export async function executeOne({query,simulate,leaseSeconds=180,token=randomUUID()}){
 await query(expireExhaustedSql)
 const job=JSON.parse(await query(claimSql(token,leaseSeconds)))
 if(job===null)return {status:'idle'}
 if(job.lease_token!==token||!sha.test(job.input_sha256)||digest(job.input_text)!==job.input_sha256)throw Error('Claimed job input digest mismatch')
 const input=JSON.parse(job.input_text)
 if(input.stageId!==job.stage_id)throw Error('Claimed stage identity mismatch')
 // Failures deliberately retain the lease for restart/reclaim, never publish a result.
 const output=await simulate(job.input_text)
 const count=Number(await query(completeSql(job,output)))
 if(count!==1)return {status:'lease-lost'}
 return {status:'completed',jobId:job.job_id,attempt:job.attempt,outputSha256:digest(output)}
}
