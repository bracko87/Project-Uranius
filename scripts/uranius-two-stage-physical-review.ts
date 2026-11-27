// Offline two-stage experiment. Existing 043AF receipts are retained unchanged.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {bindMixedStageReadiness} from './uranius-frozen-readiness-review.mjs'
import {reviewPhysicalStageContinuity} from './uranius-physical-stage-continuity-review'
import {captureMixedStageFinishPrefix} from './uranius-automatic-overlapping-incident-review'
import {finishPhysicalIncidentStage} from './uranius-physical-incident-finish-review'
import {reviewSportingClassification} from './uranius-sporting-classification-review'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AG: '+m)}
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false})
export function reviewTwoStagePhysical({firstPacket,second,expectedSecondSha256}:any){
 req(second?.provenance==='synthetic_review_fixture'&&carryoverDigest(second)===expectedSecondSha256,'frozen second stage required')
 const first=reviewPhysicalStageContinuity(firstPacket)
 const {nextSource:source,nextReadiness}=first
 const {input,context,policy}=second
 req(input?.stageId===source.stageId&&input.raceId===source.raceId&&input.seed!==firstPacket.args.input.seed,'distinct second-stage scope and seed required')
 // Original rider identity, attributes and team membership cannot drift between stages.
 req(carryoverDigest(input.riders)===carryoverDigest(firstPacket.args.input.riders)&&carryoverDigest(input.teams)===carryoverDigest(firstPacket.args.input.teams),'original roster or team mismatch')
 const expectedSourceSha256=carryoverDigest(source)
 const bound=bindMixedStageReadiness({source,expectedSourceSha256,input})
 req(bound.readinessSha256===nextReadiness.sha256,'readiness chain mismatch')
 validateStageInput(bound.input)
 const initial=createInitialState(bound.input)
 const starters=bound.receipt.rows.filter(r=>r.startStatus==='starter')
 const starterIds=new Set(starters.map(r=>r.riderId))
 const excluded=bound.receipt.rows.filter(r=>r.startStatus==='dns').map(r=>({riderId:r.riderId,teamId:r.teamId,priorStatus:r.priorStatus,availabilityStatus:r.condition.availabilityStatus,status:'dns'}))
 for(const r of starters)req(initial.riders[r.riderId].energy===r.condition.startingEnergy&&carryoverDigest(initial.riders[r.riderId].startingCondition)===carryoverDigest(r.condition),'starting condition mismatch')
 req(Object.keys(initial.riders).length===starters.length&&excluded.every(r=>!initial.riders[r.riderId]),'excluded rider admitted')
 req(Array.isArray(context.plans)&&context.plans.length===bound.receipt.rows.length&&new Set(context.plans.map(p=>p.riderId)).size===context.plans.length&&bound.receipt.rows.every(r=>context.plans.some(p=>p.riderId===r.riderId)),'complete original plans required')
 const priorStanding=first.sporting.rows.filter(r=>r.status==='finished').slice().sort((a,b)=>a.sportingElapsedSeconds-b.sportingElapsedSeconds||a.sportingRank-b.sportingRank||a.riderId.localeCompare(b.riderId))
 const gcStandings=priorStanding.map((r,i)=>({riderId:r.riderId,rank:i+1})).filter(r=>starterIds.has(r.riderId))
 const plans=context.plans.filter(p=>starterIds.has(p.riderId))
 const effectiveContext={...context,plans,gcStandings}
 const prefix=captureMixedStageFinishPrefix({input,source,context:effectiveContext,expectedSourceSha256,expectedContextSha256:carryoverDigest(effectiveContext)})
 const p=prefix.finishPrefix!
 req(prefix.trace.stopReason==='pre_finish_boundary'&&p.handled===prefix.trace.incidents.length,'second stage must reach fully applied finish prefix')
 const targetId=p.targetId??Object.values(prefix.finalState.groups).find((g:any)=>g.active&&g.groupType==='peloton')?.groupId
 req(targetId,'missing second-stage target')
 const finish=finishPhysicalIncidentStage(prefix.finalState,p.episodes,targetId)
 const evidence=prefix.trace.incidents.flatMap(e=>{
  const obs=prefix.observations.find(o=>o.raceSecond===e.raceSecond),group=obs?.tick.groups.find(g=>g.displayCode==='P')
  req(group,'second-stage incident source missing')
  return e.incident.affectedRiderIds.map(riderId=>({incidentId:e.incident.incidentId,riderId,kind:e.incident.kind,km:e.kmFromStart,sourceGroupRiderIds:group.riderIds,affectedRiderIds:e.incident.affectedRiderIds}))
 })
 const sporting=reviewSportingClassification({finish,policy,incidents:evidence,expectedPolicySha256:carryoverDigest(policy),expectedIncidentsSha256:carryoverDigest(evidence)})
 req(sporting.rows.length===starters.length&&sporting.rows.every(r=>starterIds.has(r.riderId)),'second-stage coverage')
 const priorIncidentIds=new Set(first.auto.prefix.applications.map(a=>a.incidentId))
 req(prefix.applications.every(a=>starterIds.has(a.riderId)&&!priorIncidentIds.has(a.incidentId)),'prior incident replay or excluded rider')
 const stage2Rows=[...sporting.rows,...excluded.map(r=>({riderId:r.riderId,teamId:r.teamId,status:'dns',physicalRank:null,physicalElapsedSeconds:null,sportingRank:null,sportingElapsedSeconds:null,sportingGapSeconds:null,protectionIncidentId:null,energy:null}))]
 const gc=first.sporting.rows.filter(r=>r.status==='finished').flatMap(a=>{
  const b=sporting.rows.find(r=>r.riderId===a.riderId&&r.status==='finished')
  if(!b)return []
  return [{riderId:a.riderId,teamId:a.teamId,stage1Seconds:a.sportingElapsedSeconds!,stage2Seconds:b.sportingElapsedSeconds!,totalTimeSeconds:a.sportingElapsedSeconds!+b.sportingElapsedSeconds!,rankSum:a.sportingRank!+b.sportingRank!}]
 }).sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||a.rankSum-b.rankSum||a.riderId.localeCompare(b.riderId)).map((r,i,rows)=>({...r,rank:i+1,gapSeconds:r.totalTimeSeconds-rows[0].totalTimeSeconds}))
 req(gc.length>0&&new Set(gc.map(r=>r.riderId)).size===gc.length,'empty or duplicate cumulative classification')
 return {version:'043AG_two_stage_physical_review_v1',first,second:{initial,excluded,readinessSha256:bound.readinessSha256,context:effectiveContext,prefix,finish,sporting,rows:stage2Rows},gc,gcSha256:carryoverDigest(gc),secondEvidenceSha256:expectedSecondSha256,...flags()}
}
