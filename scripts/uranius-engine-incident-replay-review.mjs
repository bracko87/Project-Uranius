// 043U projection of actual engine tick states to historical no-feedback incident review.
// This is deliberately NOT an official engine runner or physical incident reintegration.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalEligibilityTraceWithCheckpoints} from './uranius-historical-incident-eligibility-review.mjs'
import {reviewHistoricalTeamRescue} from './uranius-historical-team-rescue-review.mjs'
const req=(x,m)=>{if(!x)throw Error('043U: '+m)}
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const fields=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...k].sort().join(',')
const round=x=>Math.round((x+Number.EPSILON)*1e6)/1e6
const flags=()=>({official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false,incidentFeedbackApplied:false,finalClassificationVerified:false,healthWritesPerformed:false})
export function projectEngineIncidentReplay(args){return project(args,null)}
export function projectEngineIncidentReplayWithSource(args){
 const source={}
 const review=project(args,source)
 return {review,...source}
}
function project({input,readinessReceipt,runId,context,frames,winnerTimeSeconds},capture){
 req(input.stageFormat==='road_race'&&input.orders.length===0&&input.settings.tickSeconds===30&&input.settings.replaySnapshotIntervalSeconds===30,'no-command 30s road stage required')
 req(fields(context,['terrainType','weatherCondition','precipitationMm','rainProbabilityPct','weatherMultiplier','severeWeather','flatSprint','plans','gcStandings'])&&['flat','hilly','mountain','cobbled'].includes(context.terrainType)&&typeof context.flatSprint==='boolean','explicit supplemental context required')
 req(readinessReceipt.raceId===input.raceId&&readinessReceipt.stageId===input.stageId&&readinessReceipt.runId===runId,'readiness scope mismatch')
 req(Number.isSafeInteger(winnerTimeSeconds)&&winnerTimeSeconds>=90&&winnerTimeSeconds<=43200,'unsupported winner clock')
 const end=Math.floor(winnerTimeSeconds/30)*30,distanceKm=input.distanceKm
 req(Array.isArray(frames)&&frames.length===end/30+1,'complete measured tick grid required')
 const byId=new Map(input.riders.map(r=>[r.riderId,r]))
 const roster=input.riders.map(r=>{
  const ready=readinessReceipt.rows.find(x=>x.riderId===r.riderId),p=ready?.preparation.modifiers
  req(ready?.teamId===r.teamId&&ready.startStatus==='starter'&&ready.condition.availabilityStatus==='fit'&&carryoverDigest(ready.condition)===carryoverDigest(r.condition)&&['flat','climbing','stamina','resistance','teamwork','raceIq'].every(k=>num(r.attributes[k],0,100)),'rider readiness or skill mismatch')
  return {riderId:r.riderId,teamId:r.teamId,eligibleToStart:true,startingEnergy:r.condition.startingEnergy,effectiveFatigue:r.condition.fatigueBeforeStage,resistance:r.attributes.resistance,raceIq:r.attributes.raceIq,riderSupport:p?.incidentRiskMultiplier??1,teamSupport:1,equipmentConditionPercent:p?.equipmentConditionPercent??100,mechanicalRisk:p?.mechanicalIncidentRiskMultiplier??1}
 })
 const profilePoints=input.profilePoints.map(p=>({km:p.kilometre,elevationM:p.elevationMetres}))
 const gradient=km=>{for(let i=1;i<profilePoints.length;i++){const a=profilePoints[i-1],b=profilePoints[i];if(km<=b.km+.000001)return round((b.elevationM-a.elevationM)/Math.max(.001,b.km-a.km)/10)}return 0}
 const ticks=[],timeline=[],measurements=[]
 for(let i=0;i<frames.length;i++){
  const f=frames[i],sec=i*30,km=round(distanceKm*Math.min(1,sec/winnerTimeSeconds))
  req(fields(f,['raceSecond','actualKm','riders','groups'])&&f.raceSecond===sec&&num(f.actualKm,0,distanceKm)&&(!i||f.actualKm>=frames[i-1].actualKm-1e-7)&&Array.isArray(f.riders)&&f.riders.length===roster.length&&new Set(f.riders.map(r=>r.riderId)).size===roster.length,'invalid measured tick')
  const states=f.riders.map(r=>{
   const s=byId.get(r.riderId);req(s&&s.teamId===r.teamId&&num(r.energy,0,100)&&num(r.distanceKm,0,distanceKm)&&['racing','finished'].includes(r.status),'invalid measured rider')
   if(i===0)req(r.energy===s.condition.startingEnergy&&r.distanceKm===0,'initial energy/position mismatch')
   return {riderId:r.riderId,energy:r.energy,status:r.status,displayCode:'P'}
  })
  const racing=states.filter(r=>r.status==='racing').map(r=>r.riderId).sort(),active=f.groups.filter(g=>g.groupType==='peloton'&&g.active===true)
  req(f.groups.every(g=>['peloton','finished'].includes(g.groupType))&&active.length<2&&(!racing.length||active.length===1)&&carryoverDigest((active[0]?.riderIds??[]).slice().sort())===carryoverDigest(racing),'only measured single-peloton base trace supported')
  const gaps=[{displayCode:'P',gapSeconds:active[0]?.gapFromLeaderSeconds??0}]
  req(gaps[0].gapSeconds===0,'unsupported nonleader peloton gap')
  timeline.push({km,gaps,states})
  measurements.push({raceSecond:sec,measuredKm:f.actualKm,historicalKm:km,riders:f.riders,groups:f.groups})
  if(i)ticks.push({raceSecond:sec,gradientPercent:gradient(km),riders:states.map(r=>({riderId:r.riderId,status:r.status,energy:r.energy,commandIntensity:1})),groups:racing.length?[{displayCode:'P',aheadOfPeloton:false,riderIds:racing}]:[],rejoins:[]})
 }
 req(timeline.at(-1).km===distanceKm&&frames.at(-1).actualKm===distanceKm&&frames.at(-1).riders.every(r=>r.status==='finished'),'all-finisher integral terminal grid required')
 const stage={distanceKm,terrainType:context.terrainType,weatherCondition:context.weatherCondition,precipitationMm:context.precipitationMm,rainProbabilityPct:context.rainProbabilityPct}
 const evidence={provenance:'synthetic_review_fixture',raceId:input.raceId,stageId:input.stageId,runId,seed:input.seed,stage,winnerTimeSeconds,weatherMultiplier:context.weatherMultiplier,severeWeather:context.severeWeather,flatSprint:context.flatSprint,roster,ticks}
 const {trace,selectedCheckpoints}=reviewHistoricalEligibilityTraceWithCheckpoints({evidence,expectedEvidenceSha256:carryoverDigest(evidence)})
 const consequences=selectedCheckpoints.map((cp,i)=>{
  const map=new Map(cp.evidence.candidates.flatMap(c=>c.riders).map(r=>[r.riderId,r.teamId]))
  const repairModifiers=[...map].map(([riderId,teamId])=>({riderId,teamId,mechanicalTimeLossMultiplier:readinessReceipt.rows.find(r=>r.riderId===riderId).preparation.modifiers?.mechanicalTimeLossMultiplier??1}))
  const e={provenance:'synthetic_review_fixture',checkpoint:cp.evidence,expectedCheckpointSha256:cp.expectedEvidenceSha256,repairModifiers,stage:{stageFormat:'road_race',distanceKm,kmFromStart:trace.incidents[i].kmFromStart,flatFinish:context.flatSprint,summitFinish:false,sprintZoneKm:null}}
  return {evidence:e,expectedEvidenceSha256:carryoverDigest(e)}
 })
 const riders=input.riders.map(r=>({riderId:r.riderId,teamId:r.teamId,flat:r.attributes.flat,climbing:r.attributes.climbing,endurance:r.attributes.stamina,resistance:r.attributes.resistance,teamwork:r.attributes.teamwork,raceIQ:r.attributes.raceIq,fatigueBeforeStage:r.condition.fatigueBeforeStage,startEnergy:r.condition.startingEnergy}))
 // Original historical progress is time fraction, not measured road distance.
 // Supplemental stage plans and GC are synthetic; no rejoin feedback into occurrence loop.
 const chaseEvidence={provenance:'synthetic_review_fixture',consequences,riders,plans:context.plans,gcStandings:context.gcStandings,profilePoints,terrainType:context.terrainType,timeline,flatSprintFinish:context.flatSprint}
 if(capture){capture.eligibilityEvidence=evidence;capture.chaseEvidence=chaseEvidence}
 const chase=consequences.length?reviewHistoricalTeamRescue({evidence:chaseEvidence,expectedEvidenceSha256:carryoverDigest(chaseEvidence)}):null
 return {version:'043U_engine_incident_replay_review_v1',measurements,trace,consequences,chase,measurementSha256:carryoverDigest(measurements),traceSha256:carryoverDigest(trace),chaseSha256:carryoverDigest(chase),distanceRule:'historical_time_fraction_separate_from_measured_km',occurrenceRule:'no_rejoin_feedback_conservative',...flags()}
}
