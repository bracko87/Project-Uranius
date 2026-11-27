// 043AE offline sporting projection; no official rule or publication authority.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import type {finishPhysicalIncidentStage} from './uranius-physical-incident-finish-review'
type Finish=ReturnType<typeof finishPhysicalIncidentStage>
type Policy={provenance:'synthetic_review_fixture',groupGapSeconds:number,timeLimitPercent:number,sprintZoneKm:number,flatFinish:boolean}
type Incident={incidentId:string,riderId:string,kind:'group_crash'|'individual_crash'|'technical_incident'|'exhaustion',km:number,sourceGroupRiderIds:string[],affectedRiderIds:string[]}
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AE: '+m)}
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
const round=(x:number)=>Number(x.toFixed(9))
export function reviewSportingClassification({finish,policy,incidents,expectedPolicySha256,expectedIncidentsSha256}:{finish:Finish,policy:Policy,incidents:Incident[],expectedPolicySha256:string,expectedIncidentsSha256:string}){
 req(policy.provenance==='synthetic_review_fixture'&&carryoverDigest(policy)===expectedPolicySha256&&carryoverDigest(incidents)===expectedIncidentsSha256,'frozen explicit policy and incidents required')
 req(num(policy.groupGapSeconds,0.001,10)&&num(policy.timeLimitPercent,0,100)&&num(policy.sprintZoneKm,0,5)&&typeof policy.flatFinish==='boolean','invalid policy')
 req(finish.state.completed&&finish.official===false&&carryoverDigest(finish.classification)===finish.classificationSha256,'verified physical result required')
 const distance=finish.state.stageDistanceKm,physical=finish.classification
 const byId=new Map(physical.map(r=>[r.riderId,r]))
 req(byId.size===Object.keys(finish.state.riders).length&&byId.size===physical.length,'unique complete physical coverage required')
 const racers=physical.filter(r=>r.status==='finished')
 req(racers.length>0&&racers.every((r,i)=>r.rank===i+1&&num(r.elapsedSeconds,0,86400)&&(!i||r.elapsedSeconds!>=racers[i-1].elapsedSeconds!)),'invalid physical ranks')
 const winner=racers[0].elapsedSeconds!
 const winnerSporting=Math.floor(winner),limitSeconds=Math.floor(winnerSporting*(1+policy.timeLimitPercent/100)+1e-9)
 const unique=new Set<string>()
 for(const e of incidents){
  const key=e.incidentId+'|'+e.riderId
  req(typeof e.incidentId==='string'&&e.incidentId.length>0&&!unique.has(key)&&byId.has(e.riderId)&&num(e.km,0,distance)&&['group_crash','individual_crash','technical_incident','exhaustion'].includes(e.kind),'invalid incident witness')
  req(Array.isArray(e.sourceGroupRiderIds)&&new Set(e.sourceGroupRiderIds).size===e.sourceGroupRiderIds.length&&e.sourceGroupRiderIds.every(id=>byId.has(id))&&Array.isArray(e.affectedRiderIds)&&new Set(e.affectedRiderIds).size===e.affectedRiderIds.length&&e.affectedRiderIds.includes(e.riderId)&&e.affectedRiderIds.every(id=>e.sourceGroupRiderIds.includes(id)),'invalid source group')
  unique.add(key)
 }
 const crossingById=new Map<string,any>(),energyById=new Map<string,any>()
 for(const t of finish.ticks)for(const c of t.crossings){
  req(!crossingById.has(c.riderId),'duplicate crossing')
  crossingById.set(c.riderId,c)
  const e=t.energy.find(x=>x.riderId===c.riderId)
  req(e&&num(c.crossingFraction,0,1)&&e.previousEnergy>=0&&e.nextEnergy===finish.state.riders[c.riderId].energy,'missing crossing energy')
  // Neutral energy formula is duration-linear and uncapped before subtraction.
  // Refuse alternate runtime modifiers instead of scaling a capped ledger.
  req(!t.state.weatherPerformanceEffectsEnabled&&!t.state.groupShelterEnergyEnabled&&!t.state.experimentalAbsoluteSpeedEffortEnabled&&e.runtimeFatigueGain===undefined&&!(e.experimentalPullerEnergySurcharge??0),'unsupported energy modifier')
  const fullCost=e.result.grossEnergyCost*e.result.efficiencyMultiplier
  const fraction=c.crossingFraction!
  const corrected=round(Math.max(0,e.previousEnergy-fullCost*fraction))
  energyById.set(c.riderId,{crossingFraction:fraction,previousEnergy:e.previousEnergy,fullTickEnergy:e.nextEnergy,partialTickEnergy:corrected,partialTickCost:round(Math.min(e.previousEnergy,fullCost*fraction))})
 }
 const groupTimes=new Map<string,number>()
 let groupStart=winner,last=winner
 for(const r of racers){
  req(crossingById.get(r.riderId)?.finishTimeSeconds===r.elapsedSeconds,'physical crossing mismatch')
  if(round(r.elapsedSeconds!-last)>=policy.groupGapSeconds)groupStart=r.elapsedSeconds!
  groupTimes.set(r.riderId,Math.floor(groupStart));last=r.elapsedSeconds!
 }
 let rank=0
 const rows=physical.map(r=>{
  const actual=finish.state.riders[r.riderId]
  req(actual.teamId===r.teamId&&actual.stageStatus===r.status,'terminal identity mismatch')
  if(r.status==='dnf')return {riderId:r.riderId,teamId:r.teamId,status:'dnf',physicalRank:null,physicalElapsedSeconds:null,sportingRank:null,sportingElapsedSeconds:null,sportingGapSeconds:null,protectionIncidentId:null,energy: null}
  const grouped=groupTimes.get(r.riderId)!
  let time=grouped,protectionIncidentId:string|null=null
  for(const e of incidents.filter(e=>e.riderId===r.riderId)){
   if(!policy.flatFinish||policy.sprintZoneKm===0||distance-e.km>policy.sprintZoneKm+1e-9||e.kind==='exhaustion')continue
   // Explicit synthetic source-group policy: earliest physically finishing
   // unaffected member supplies the group time; no inferred reference.
   const refs=e.sourceGroupRiderIds.filter(id=>!e.affectedRiderIds.includes(id)&&groupTimes.has(id))
   if(!refs.length)continue
   const reference=Math.min(...refs.map(id=>groupTimes.get(id)!))
   if(reference<time){time=reference;protectionIncidentId=e.incidentId}
  }
  // Review policy applies time limit after group/protection adjustments.
  // Physical rank and elapsed are immutable even for sporting OTL.
  const otl=time>limitSeconds
  return {riderId:r.riderId,teamId:r.teamId,status:otl?'otl':'finished',physicalRank:r.rank,physicalElapsedSeconds:r.elapsedSeconds,sportingRank:otl?null:++rank,sportingElapsedSeconds:otl?null:time,sportingGapSeconds:otl?null:time-winnerSporting,groupedElapsedSeconds:grouped,adjustedTimeBeforeLimit:time,protectionIncidentId,energy:energyById.get(r.riderId)}
 })
 return {version:'043AE_sporting_classification_review_v1',physicalClassificationSha256:finish.classificationSha256,policySha256:expectedPolicySha256,incidentEvidenceSha256:expectedIncidentsSha256,winnerSportingSeconds:winnerSporting,timeLimitSeconds:limitSeconds,rows,rowsSha256:carryoverDigest(rows),physicalStateUnchanged:true,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,finalClassificationVerified:false}
}
