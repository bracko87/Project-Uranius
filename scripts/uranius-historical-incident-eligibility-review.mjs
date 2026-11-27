// 043Q: historical Phase10 eligibility gates + complete synthetic 30s trace.
// Source: original runRaceEngine.ts blob 39e35c6ed69563ce82cb663d6c3f9088c61df886.
// Not a physical replay extractor or autonomous chase simulator.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {reviewHistoricalCheckpoint} from './uranius-historical-incident-probability-review.mjs'
const req=(x,m)=>{if(!x)throw Error('043Q: '+m)}
const fields=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...ks].sort().join(',')
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const num=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x))
const round=(x,n=6)=>Math.round((x+Number.EPSILON)*10**n)/10**n
const uniq=(a,f)=>Array.isArray(a)&&new Set(a.map(f)).size===a.length
const wetCodes=['rain','rainy','showers','shower','storm','heavy_rain','sleet','snow']
const rough=['hilly','mountain','cobbled']
const phaseCaps={3:[1,1,0,1],4:[1,1,1,1],5:[1,1,1,2],6:[1,2,1,2],7:[2,2,1,2]}
export function historicalIncidentLimits(stage){
 req(fields(stage,['distanceKm','terrainType','weatherCondition','precipitationMm','rainProbabilityPct'])&&num(stage.distanceKm,1,500)&&['flat',...rough].includes(stage.terrainType)&&typeof stage.weatherCondition==='string'&&num(stage.precipitationMm,0,1000)&&num(stage.rainProbabilityPct,0,100),'explicit historical stage and weather required')
 const weather=wetCodes.includes(stage.weatherCondition.trim().toLowerCase()),adverseWeather=stage.precipitationMm>.1||stage.rainProbabilityPct>=50||weather
 const wetWeather=stage.precipitationMm>.05||stage.rainProbabilityPct>=50||weather
 const maximumIncidents=clamp(3+Number(stage.distanceKm>=140)+Number(stage.distanceKm>=200)+Number(rough.includes(stage.terrainType))+Number(adverseWeather),3,7)
 const maximumCrashes=stage.distanceKm>=190||['mountain','cobbled'].includes(stage.terrainType)||adverseWeather?3:2
 return {maximumIncidents,maximumCrashes,perPhase:[...phaseCaps[maximumIncidents]],adverseWeather,wetWeather}
}
export function historicalPhase(progress){req(num(progress,0,1),'progress');return progress<=.25?1:progress<=.5?2:progress<=.7?3:4}
export function historicalTickGate({raceSecond,progressFraction,distanceKm,incidentCount,phaseCounts,nextGlobalEligibleSecond,limits}){
 req(Number.isSafeInteger(raceSecond)&&raceSecond>=30&&raceSecond%30===0&&num(distanceKm,1,500)&&num(progressFraction,0,1)&&Number.isSafeInteger(incidentCount)&&incidentCount>=0&&Array.isArray(phaseCounts)&&phaseCounts.length===4&&phaseCounts.every(x=>Number.isSafeInteger(x)&&x>=0)&&phaseCounts.reduce((a,b)=>a+b,0)===incidentCount&&Number.isSafeInteger(nextGlobalEligibleSecond)&&nextGlobalEligibleSecond>=0,'invalid tick counters')
 const phase=historicalPhase(progressFraction),kmFromStart=round(distanceKm*progressFraction)
 const reason=incidentCount>=limits.maximumIncidents?'stage_cap':raceSecond<nextGlobalEligibleSecond?'global_cooldown':raceSecond<=60||kmFromStart<=1||distanceKm-kmFromStart<=.5?'stage_boundary':phaseCounts[phase-1]>=limits.perPhase[phase-1]?'phase_cap':null
 return {eligible:reason===null,reason,phase,kmFromStart}
}
export function historicalRiderGate({raceSecond,kmFromStart,nextEligibleSecond,rejoinKm,withdrawn}){
 req(num(raceSecond,0,86400)&&num(kmFromStart,0,500)&&num(nextEligibleSecond,0,86400)&&typeof withdrawn==='boolean'&&(rejoinKm===null||num(rejoinKm,0,500)),'invalid rider gate')
 return !withdrawn&&raceSecond>=nextEligibleSecond&&rejoinKm!==null&&kmFromStart>=rejoinKm-.000001
}
export function historicalDepletionStep({distanceKm,progressFraction,energy,runtimeFatigue,raceSecond,lowSinceSecond}){
 req(num(distanceKm,1,500)&&num(progressFraction,0,1)&&num(energy,0,100)&&num(runtimeFatigue,0,100)&&Number.isSafeInteger(raceSecond)&&raceSecond>=0&&(lowSinceSecond===null||Number.isSafeInteger(lowSinceSecond)&&lowSinceSecond>=0&&lowSinceSecond<=raceSecond),'invalid depletion evidence')
 const severe=distanceKm>=60&&progressFraction>=.35&&progressFraction<.99&&energy<=15&&runtimeFatigue>=83
 const since=severe?(lowSinceSecond??raceSecond):null
 return {lowSinceSecond:since,eligible:since!==null&&raceSecond-since>=240}
}
const flags=()=>({physicalCheckpointVerified:false,completeOccurrenceVerified:false,authoritativeSourceVerified:false,official:false,hostedWriteAllowed:false,accountingAllowed:false})
export function reviewHistoricalEligibilityTrace(packet){
 return evaluateHistoricalEligibilityTrace(packet,null)
}
// 043U: retain only selected source packets; existing 043Q result shape unchanged.
export function reviewHistoricalEligibilityTraceWithCheckpoints(packet){
 const selectedCheckpoints=[]
 const trace=evaluateHistoricalEligibilityTrace(packet,selectedCheckpoints)
 return {trace,selectedCheckpoints}
}
// 043W experimental callback is local review logic, not part of frozen external evidence.
export function reviewHistoricalEligibilityTraceWithFeedback(packet,feedback){
 req(typeof feedback==='function','feedback callback required')
 const selectedCheckpoints=[]
 const trace=evaluateHistoricalEligibilityTrace(packet,selectedCheckpoints,feedback)
 return {trace,selectedCheckpoints}
}
function evaluateHistoricalEligibilityTrace({evidence,expectedEvidenceSha256},selectedCheckpoints,feedback=null){
 req(evidence?.provenance==='synthetic_review_fixture'&&carryoverDigest(evidence)===expectedEvidenceSha256,'frozen synthetic trace required')
 req(fields(evidence,['provenance','raceId','stageId','runId','seed','stage','winnerTimeSeconds','weatherMultiplier','severeWeather','flatSprint','roster','ticks']),'unexpected trace fields')
 const {raceId,stageId,runId,seed,stage,winnerTimeSeconds,weatherMultiplier,severeWeather,flatSprint,roster,ticks}=evidence
 req([raceId,stageId,runId].every(uuid)&&typeof seed==='string'&&seed.length>0&&!seed.includes('|')&&Number.isSafeInteger(winnerTimeSeconds)&&winnerTimeSeconds>=90&&winnerTimeSeconds<=43200&&num(weatherMultiplier,.7,2.5)&&typeof severeWeather==='boolean'&&typeof flatSprint==='boolean','trace scope')
 const limits=historicalIncidentLimits(stage),distanceKm=stage.distanceKm
 req(uniq(roster,r=>r.riderId)&&roster.length>=2&&roster.length<=250&&roster.every(r=>fields(r,['riderId','teamId','eligibleToStart','startingEnergy','effectiveFatigue','resistance','raceIq','riderSupport','teamSupport','equipmentConditionPercent','mechanicalRisk'])&&uuid(r.riderId)&&uuid(r.teamId)&&typeof r.eligibleToStart==='boolean'&&['startingEnergy','effectiveFatigue','resistance','raceIq','equipmentConditionPercent'].every(k=>num(r[k],0,100))&&num(r.riderSupport,.7,1.4)&&num(r.teamSupport,.7,1.4)&&num(r.mechanicalRisk,.78,1.5)),'complete frozen roster required')
 const lastTick=Math.max(30,Math.floor(winnerTimeSeconds/30)*30)
 req(Array.isArray(ticks)&&ticks.length===lastTick/30,'complete 30-second grid required')
 const byId=new Map(roster.map(r=>[r.riderId,r])),state=new Map(roster.map(r=>[r.riderId,{nextEligibleSecond:0,rejoinKm:0,withdrawn:!r.eligibleToStart,lowSinceSecond:null,lastIncidentId:null}]))
 const phaseCounts=[0,0,0,0],incidents=[],audit=[]
 let nextGlobalEligibleSecond=0,crashCount=0
 const baseSpeed=round(distanceKm/Math.max(winnerTimeSeconds/3600,.01))
 for(let i=0;i<ticks.length;i++){
  const raceSecond=(i+1)*30,progressFraction=clamp(raceSecond/winnerTimeSeconds,0,1)
  const tick=feedback?feedback({tick:ticks[i],raceSecond,kmFromStart:round(distanceKm*progressFraction),incidents:incidents.slice(),selectedCheckpoints:selectedCheckpoints.slice()}):ticks[i]
  req(fields(tick,['raceSecond','gradientPercent','riders','groups','rejoins'])&&tick.raceSecond===raceSecond&&num(tick.gradientPercent,-100,100)&&uniq(tick.riders,r=>r.riderId)&&tick.riders.length===roster.length&&tick.riders.every(r=>fields(r,['riderId','status','energy','commandIntensity'])&&byId.has(r.riderId)&&['racing','finished','dnf','dns','otl'].includes(r.status)&&num(r.energy,0,100)&&num(r.commandIntensity,.82,1.45))&&uniq(tick.groups,g=>g.displayCode)&&uniq(tick.rejoins,r=>r.riderId),'invalid checkpoint grid or coverage')
  const obs=new Map(tick.riders.map(r=>[r.riderId,r])),groupFor=new Map()
  for(const g of tick.groups){
   req(fields(g,['displayCode','aheadOfPeloton','riderIds'])&&typeof g.displayCode==='string'&&/^[A-Za-z0-9_-]+$/.test(g.displayCode)&&typeof g.aheadOfPeloton==='boolean'&&uniq(g.riderIds,x=>x)&&g.riderIds.length>0,'invalid checkpoint group')
   for(const id of g.riderIds){req(byId.has(id)&&!groupFor.has(id)&&obs.get(id).status==='racing','invalid physical group coverage');groupFor.set(id,g)}
  }
  req(tick.riders.every(r=>r.status!=='racing'||groupFor.has(r.riderId)),'racing rider missing group')
  const gate=historicalTickGate({raceSecond,progressFraction,distanceKm,incidentCount:incidents.length,phaseCounts,nextGlobalEligibleSecond,limits})
  for(const rejoin of tick.rejoins){
   req(fields(rejoin,['riderId','incidentId','rejoinKm','provenance'])&&rejoin.provenance==='synthetic_rejoin_witness'&&byId.has(rejoin.riderId)&&num(rejoin.rejoinKm,0,distanceKm),'explicit synthetic rejoin required')
   const s=state.get(rejoin.riderId),previous=incidents.find(x=>x.incident.incidentId===rejoin.incidentId)
   req(!s.withdrawn&&s.rejoinKm===null&&s.lastIncidentId===rejoin.incidentId&&previous&&rejoin.rejoinKm>=previous.kmFromStart&&rejoin.rejoinKm<=gate.kmFromStart+.000001&&obs.get(rejoin.riderId).status==='racing','invalid rejoin scope')
   s.rejoinKm=rejoin.rejoinKm
  }
  if(!gate.eligible){audit.push({raceSecond,...gate,candidateCount:0,exhaustionEligible:[],selectedIncidentId:null});continue}
  const eligible=tick.riders.filter(o=>o.status==='racing'&&byId.get(o.riderId).eligibleToStart&&historicalRiderGate({raceSecond,kmFromStart:gate.kmFromStart,...state.get(o.riderId)}))
  const fatigue=o=>{const r=byId.get(o.riderId),start=Math.max(1,r.startingEnergy);return round(clamp(r.effectiveFatigue+Math.max(0,start-o.energy)/start*45,0,100))}
  const support=r=>clamp(r.riderSupport*r.teamSupport,.7,1.4)
  const situation=(kind,g,n)=>{
   const chase=g.displayCode==='P'&&gate.phase===4&&tick.groups.some(x=>x.aheadOfPeloton)
   const sprint=g.displayCode==='P'&&stage.terrainType==='flat'&&flatSprint&&progressFraction>=.9&&n>=12
   const speed=round(clamp(baseSpeed+(tick.gradientPercent< -1?Math.min(22,Math.abs(tick.gradientPercent)*3):0)+(chase?6:0)+(sprint?12:0),20,80))
   const m=(chase?(kind==='group_crash'?2.4:kind==='individual_crash'?1.45:1.2):1)*(sprint?(kind==='group_crash'?4.5:kind==='individual_crash'?1.9:1.15):1)
   return {speed,multiplier:round(clamp(m,.6,6)),chase,sprint}
  }
  const candidates=[],exhaustionEligible=[]
  const add=(kind,os,g,depletion=false)=>{
   const rs=os.map(o=>byId.get(o.riderId)),avg=f=>rs.reduce((sum,r,j)=>sum+f(r,os[j]),0)/rs.length,n=kind==='group_crash'?rs.length:g.riderIds.length
   const runtimeFatigue=round(avg((r,o)=>fatigue(o))),supportValue=kind==='group_crash'?avg(support):round(support(rs[0])),command=avg((r,o)=>o.commandIntensity)
   const condition=kind==='group_crash'?100:rs[0].equipmentConditionPercent,si=situation(kind,g,n),causes=[]
   if(depletion){causes.push('sustained_energy_depletion','runtime_fatigue')}
   else{
    if(limits.wetWeather)causes.push('wet_road');else if(severeWeather)causes.push('severe_weather')
    if(runtimeFatigue>=50)causes.push('runtime_fatigue');if(tick.gradientPercent<=-2)causes.push('descending');if(si.speed>=45)causes.push('high_speed')
    if(kind==='technical_incident'&&condition<90)causes.push('equipment_condition');if(supportValue<.999)causes.push('team_staff_asset_support')
    if(command>1.05)causes.push('high_command_intensity');if(command<.95)causes.push('risk_avoidance')
    if(si.chase)causes.push('peloton_chase');if(si.sprint)causes.push('sprint_congestion')
   }
   const rr=rs.map(r=>({riderId:r.riderId,teamId:r.teamId,equipmentConditionPercent:r.equipmentConditionPercent}))
   candidates.push({entityId:kind==='group_crash'?g.displayCode+':'+rr.map(r=>r.riderId).sort().join(','):rr[0].riderId,displayCode:g.displayCode,riders:rr,probabilityInput:{incidentKind:kind,tickSeconds:30,weatherMultiplier,currentSpeedKmh:depletion?baseSpeed:si.speed,gradientPercent:tick.gradientPercent,groupSize:n,runtimeFatigue,resistance:avg(r=>r.resistance),raceIq:avg(r=>r.raceIq),preparationSupportMultiplier:supportValue,commandIntensityMultiplier:command,raceSituationMultiplier:depletion?(tick.gradientPercent>=3?1.8:stage.terrainType==='mountain'?1.5:stage.terrainType==='cobbled'?1.2:1):si.multiplier,equipmentConditionPercent:condition,mechanicalIncidentRiskMultiplier:kind==='technical_incident'?rs[0].mechanicalRisk:1},causes:causes.sort(),exposureEligibility:'explicit_synthetic_eligible'})
  }
  for(const o of eligible){
   const s=state.get(o.riderId),dep=historicalDepletionStep({distanceKm,progressFraction,energy:o.energy,runtimeFatigue:fatigue(o),raceSecond,lowSinceSecond:s.lowSinceSecond});s.lowSinceSecond=dep.lowSinceSecond
   const g=groupFor.get(o.riderId)
   if(dep.eligible){exhaustionEligible.push(o.riderId);add('exhaustion',[o],g,true)}
   if(crashCount<limits.maximumCrashes)add('individual_crash',[o],g)
   add('technical_incident',[o],g)
  }
  if(crashCount<limits.maximumCrashes)for(const g of tick.groups){const os=g.riderIds.map(id=>eligible.find(o=>o.riderId===id)).filter(Boolean);if(os.length>=6)add('group_crash',os,g)}
  const packet={provenance:'synthetic_review_fixture',raceId,stageId,runId,seed,raceSecond,priorIncidentCount:incidents.length,candidates}
  const selected=reviewHistoricalCheckpoint({evidence:packet,expectedEvidenceSha256:carryoverDigest(packet)}).incident
  if(selected){
   if(selectedCheckpoints)selectedCheckpoints.push({evidence:packet,expectedEvidenceSha256:carryoverDigest(packet)})
   phaseCounts[gate.phase-1]++;if(['individual_crash','group_crash'].includes(selected.kind))crashCount++
   incidents.push({raceSecond,phase:gate.phase,kmFromStart:gate.kmFromStart,incident:selected})
   nextGlobalEligibleSecond=raceSecond+120
   for(const h of selected.handoffs){
    const s=state.get(h.riderId);s.nextEligibleSecond=raceSecond+900;s.withdrawn=h.statusImpact==='dnf';s.lastIncidentId=selected.incidentId
    // All surviving original road crash/technical time-loss ranges exceed 5s
    // even with maximum supported time-loss reduction. No assumed rejoin.
    s.rejoinKm=null
   }
  }
  audit.push({raceSecond,...gate,candidateCount:candidates.length,eligibleRiderIds:eligible.map(r=>r.riderId).sort(),exhaustionEligible:exhaustionEligible.sort(),selectedIncidentId:selected?.incidentId??null})
 }
 return {version:'043Q_historical_eligibility_review_v1',evidenceSha256:expectedEvidenceSha256,limits,phaseCounts,crashCount,incidents,audit,terminalEligibility:roster.map(r=>({riderId:r.riderId,...state.get(r.riderId)})),...flags()}
}
