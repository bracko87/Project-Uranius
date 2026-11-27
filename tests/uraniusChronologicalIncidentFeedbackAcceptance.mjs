import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {applyPriorIncidentFeedback,reviewChronologicalIncidentFeedback} from '../scripts/uranius-chronological-incident-feedback-review.mjs'
import {historicalRiderGate} from '../scripts/uranius-historical-incident-eligibility-review.mjs'
assert.deepEqual(process.argv.slice(2),['--offline-only'])
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),P='synthetic_review_fixture',raceId=id(100),stageId=id(101),runId=id(201),teams=[id(11),id(12)],distanceKm=90
const roster=Array.from({length:24},(_,n)=>({riderId:id(1000+n),teamId:teams[n<12?0:1],riderName:'Review rider '+n,teamName:n<12?'A':'B',role:n%12===0?'captain':'domestique',attributes:{flat:65,climbing:65,sprint:70,acceleration:72,stamina:80,resistance:30,recovery:75,teamwork:75,timeTrial:75,raceIq:30}}))
const scope=r=>({race_id:raceId,stage_id:stageId,rider_id:r.riderId,team_id:r.teamId})
const source={provenance:P,completeSyntheticEvidence:true,raceId,stageId,runId,date:'2000-01-03',stageNumber:1,difficultyCategory:1,participants:roster.map(r=>({...scope(r),accepted:true,selected:true,selection_blocked:false})),riderRows:roster.map(r=>({...scope(r),fatigue_before_stage:70,fatigue:70,start_stamina:68.5,morale:50,recovery:r.attributes.recovery,availability_status:'fit'})),modifierRows:roster.map(r=>({...scope(r),preparation_applied:true,equipment_selected:false,in_stage_energy_cost_multiplier:1,post_stage_fatigue_multiplier:1,equipment_fatigue_reduction_pct:0,post_stage_recovery_bonus_points:0,non_neutral_command_capability_bonus:0,equipment_engine_stage_bonus_pct:0,supply_stage_performance_pct:0,health_incident_risk_multiplier:1.4,mechanical_incident_risk_multiplier:1,mechanical_time_loss_multiplier:1,equipment_condition_factor:1})),prior:null,expectedPriorSha256:null,recoveryReceipts:[]}
const input={raceId,stageId,stageName:'043U actual engine incident review',stageFormat:'road_race',distanceKm,seed:'043U-engine-0',settings:{tickSeconds:30,replaySnapshotIntervalSeconds:30,maximumBreakawaySize:8,minimumSpeedKmh:24,maximumSpeedKmh:72},teams:teams.map(t=>{const rr=roster.filter(x=>x.teamId===t);return {teamId:t,teamName:rr[0].teamName,captainRiderId:rr[0].riderId,riderIds:rr.map(x=>x.riderId)}}),riders:roster,profilePoints:[{kilometre:0,elevationMetres:50},{kilometre:distanceKm,elevationMetres:50}],orders:[]}
const context={terrainType:'flat',weatherCondition:'rain',precipitationMm:1,rainProbabilityPct:90,weatherMultiplier:2.5,severeWeather:true,flatSprint:true,plans:roster.map(r=>({riderId:r.riderId,stageRole:'domestique',commands:{phase1:'hold',phase2:'hold',phase3:'hold',phase4:'hold'}})),gcStandings:[]}
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex')
const packet=inp=>({provenance:P,input:inp,source,context,expectedInputSha256:sha(JSON.stringify(inp)),expectedSourceSha256:carryoverDigest(source),expectedContextSha256:carryoverDigest(context)})
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP'].includes(k.toUpperCase())))
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-043w-'))
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const run=(entry,p,allowFailure=false)=>{const c=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(p),encoding:'utf8',timeout:180000,maxBuffer:48*1024*1024,windowsHide:true});if(c.error)throw c.error;if(!allowFailure)assert.equal(c.status,0,c.stderr);return c}
try{
 const a=roster[0].riderId,b=roster[1].riderId,c=roster[2].riderId
 const makeTick=sec=>({raceSecond:sec,gradientPercent:0,riders:[a,b,c].map(riderId=>({riderId,status:'racing',energy:20,commandIntensity:1})),groups:[{displayCode:'P',aheadOfPeloton:false,riderIds:[a,b,c]}],rejoins:[]})
 const prefix={incidents:[{incidentId:'i1',raceSecond:300,kmFromStart:10,riderConsequences:[{riderId:a,statusImpact:'finished',energyLossPoints:3},{riderId:b,statusImpact:'dnf',energyLossPoints:2}]}],episodes:[{episodeKey:'i1:'+a,episodeKind:'incident_rider',riderId:a,activationKm:10,actualRejoinKm:12,chaseEnergyCostPoints:2,finalGapToTargetSeconds:0,samples:[{kmFromStart:10,displayCode:'I1',targetDisplayCode:'P',gapToTargetSeconds:30,cumulativeChaseEnergyCostPoints:0},{kmFromStart:11,displayCode:'I1',targetDisplayCode:'P',gapToTargetSeconds:15,cumulativeChaseEnergyCostPoints:1}]}]}
 const confirmed=new Map()
 assert.throws(()=>applyPriorIncidentFeedback({tick:makeTick(300),kmFromStart:10,prefix,confirmed}),/future incident/)
 const detached=applyPriorIncidentFeedback({tick:makeTick(330),kmFromStart:10.5,prefix,confirmed})
 assert.equal(detached.tick.riders[0].energy,16.5);assert.equal(detached.tick.riders[1].status,'dnf');assert.equal(detached.tick.riders[2].energy,20)
 assert.deepEqual(detached.tick.groups,[{displayCode:'I1',aheadOfPeloton:false,riderIds:[a]},{displayCode:'P',aheadOfPeloton:false,riderIds:[c]}]);assert.equal(detached.tick.rejoins.length,0)
 pass('043W only prior incidents affect energy, modeled separation and permanent withdrawal')
 const joined=applyPriorIncidentFeedback({tick:makeTick(360),kmFromStart:12,prefix,confirmed})
 assert.equal(joined.tick.riders[0].energy,15);assert.equal(joined.tick.rejoins.length,1);assert.equal(joined.tick.rejoins[0].rejoinKm,12)
 assert.deepEqual(joined.tick.groups,[{displayCode:'P',aheadOfPeloton:false,riderIds:[a,c]}])
 assert.equal(applyPriorIncidentFeedback({tick:makeTick(390),kmFromStart:13,prefix,confirmed}).tick.rejoins.length,0)
 const gate={raceSecond:1199,kmFromStart:20,nextEligibleSecond:1200,rejoinKm:12,withdrawn:false}
 assert.equal(historicalRiderGate(gate),false);assert.equal(historicalRiderGate({...gate,raceSecond:1200}),true);assert.equal(historicalRiderGate({...gate,raceSecond:1200,withdrawn:true}),false)
 const changed=structuredClone(prefix);changed.episodes[0].actualRejoinKm=13
 assert.throws(()=>applyPriorIncidentFeedback({tick:makeTick(420),kmFromStart:14,prefix:changed,confirmed}),/confirmed rejoin changed/)
 pass('043W modeled crossing emits one rejoin witness, cooldown remains mandatory and prior confirmation cannot change')
 const engine=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-incident-replay-engine-review.ts')],outfile:engine,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 console.log('INFO 043W actual base engine started')
 let result,out,args
 for(let i=0;i<6;i++){
  result=JSON.parse(run(engine,packet({...input,seed:'043U-engine-'+i})).stdout)
  if(!result.review.trace.incidents.length)continue
  args={engine:result,expectedEvidenceSha256:result.evidenceSha256,context}
  try{out=reviewChronologicalIncidentFeedback(args)}catch(e){if(!/repeat incident selected|confirmed rejoin changed/.test(String(e)))throw e;console.log('INFO bounded scenario refused: '+e.message);continue}
  if(out.trace.incidents.length&&out.feedbackAudit.length)break
 }
 assert.ok(out?.trace.incidents.length&&out.feedbackAudit.length)
 const events=out.trace.incidents,first=events[0],base=result.review
 assert.deepEqual(first,base.trace.incidents[0])
 assert.deepEqual(out.trace.audit.filter(x=>x.raceSecond<=first.raceSecond),base.trace.audit.filter(x=>x.raceSecond<=first.raceSecond))
 assert.equal(out.prefixReceipts.length,events.length)
 for(const p of out.prefixReceipts){assert.deepEqual(p.incidentIds,events.filter(e=>e.raceSecond<p.asOfRaceSecond).map(e=>e.incident.incidentId))}
 for(const f of out.feedbackAudit){
  assert.equal(f.priorIncidentCount,events.filter(e=>e.raceSecond<f.raceSecond).length)
  for(const a of f.adjustments){
   const ev=events.find(e=>e.incident.incidentId===a.incidentId)
   assert.ok(ev.raceSecond<f.raceSecond)
   assert.equal(a.energy,Math.round((Math.max(0,a.baseEnergy-a.initialLoss-a.chaseEnergy)+Number.EPSILON)*1e6)/1e6)
   const gate=out.trace.audit.find(x=>x.raceSecond===f.raceSecond)
   if(a.status==='dnf'||a.displayCode!=='P'||f.raceSecond<ev.raceSecond+900)assert.ok(!(gate.eligibleRiderIds??[]).includes(a.riderId))
  }
 }
 assert.equal(out.feedbackSha256,carryoverDigest(out.feedbackAudit));assert.equal(out.traceSha256,carryoverDigest(out.trace))
 for(let i=0;i<events.length;i++){
  const cp=out.selectedCheckpoints[i].evidence,ev=events[i]
  assert.equal(cp.raceSecond,ev.raceSecond)
  const applied=out.feedbackAudit.find(x=>x.raceSecond===cp.raceSecond)
  if(applied)for(const cand of cp.candidates.filter(c=>c.probabilityInput.incidentKind!=='group_crash')){
   const id=cand.riders[0].riderId,a=applied.adjustments.find(x=>x.riderId===id)
   if(a){
    const start=result.input.riders.find(r=>r.riderId===id).condition
    const fatigue=Math.round((Math.min(100,start.fatigueBeforeStage+Math.max(0,Math.max(1,start.startingEnergy)-a.energy)/Math.max(1,start.startingEnergy)*45)+Number.EPSILON)*1e6)/1e6
    assert.equal(cand.probabilityInput.runtimeFatigue,fatigue)
   }
  }
 }
 assert.ok(events.length<=out.trace.limits.maximumIncidents)
 assert.deepEqual(reviewChronologicalIncidentFeedback(args),out)
 pass('043W actual base-engine observations causally feed later candidate eligibility and fatigue, immutable earlier decisions and deterministic prefix receipts')
 const bad=structuredClone(result);bad.review.measurements[0].riders[0].energy=1
 assert.throws(()=>reviewChronologicalIncidentFeedback({...args,engine:bad}),/digest mismatch/)
 assert.throws(()=>reviewChronologicalIncidentFeedback({...args,context:{...context,weatherMultiplier:1}}),/digest mismatch/)
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','physicalEngineFeedbackApplied','finalClassificationVerified','healthWritesPerformed'])assert.equal(out[k],false)
 assert.equal(out.candidateFeedbackApplied,true)
 pass('043W evidence mutation rejected and physical engine/official authority remains disabled')
 assert.equal(checks,4);console.log('PASS 4/4 chronological incident feedback checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
