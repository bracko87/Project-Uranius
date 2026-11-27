import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewSequentialIncidentFeedback} from '../scripts/uranius-sequential-incident-feedback-review.mjs'
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
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-043y-'))
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const run=(entry,p,allowFailure=false)=>{const c=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(p),encoding:'utf8',timeout:180000,maxBuffer:48*1024*1024,windowsHide:true});if(c.error)throw c.error;if(!allowFailure)assert.equal(c.status,0,c.stderr);return c}
try{
 const engine=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-incident-replay-engine-review.ts')],outfile:engine,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 // Every candidate uses real base-engine frames. No fabricated incidents or rejoin witnesses.
 // Set explicit protection for one leader per team, retaining frozen plans for every run.
 for(const p of context.plans){
  const n=roster.findIndex(r=>r.riderId===p.riderId)
  p.stageRole=n%12===0?'team_leader_gc':'domestique'
  p.commands=Object.fromEntries(['phase1','phase2','phase3','phase4'].map(k=>[k,n%12===0?'hold':'protect_leader']))
 }
 const repeat=new Map(),rescue=new Map(),refusals={}
 const limit=48
 for(let i=0;i<limit&&(!repeat.size||!rescue.size);i++){
  const seed='043Y-engine-'+i
  const result=JSON.parse(run(engine,packet({...input,seed})).stdout)
  if(!result.review.trace.incidents.length)continue
  const args={engine:result,expectedEvidenceSha256:result.evidenceSha256,context}
  let out
  try{out=reviewSequentialIncidentFeedback(args)}catch(e){
   if(!/new prefix changed prior observed feedback|confirmed rejoin changed|repeat incident before rejoin|overlapping incident\/rescue episode/.test(String(e)))throw e
   refusals[e.message]=(refusals[e.message]??0)+1;continue
  }
  if(!out.chase)continue
  const episodes=out.chase.episodes
  const incidents=out.chase.incidents
  for(const ep of episodes.filter(e=>e.episodeKind==='incident_rider'&&e.actualRejoinKm!==null)){
   const first=incidents.find(e=>e.incidentId===ep.incidentId)
   const later=incidents.find(e=>e.raceSecond>=first.raceSecond+900&&e.kmFromStart>ep.actualRejoinKm&&e.riderConsequences.some(r=>r.riderId===ep.riderId))
   if(!later)continue
   const witness=out.feedbackAudit.find(f=>f.raceSecond<later.raceSecond&&f.rejoins.some(r=>r.incidentId===ep.incidentId&&r.riderId===ep.riderId))
   const applied=out.feedbackAudit.find(f=>f.adjustments.some(a=>a.riderId===ep.riderId&&a.incidentIds.includes(first.incidentId)&&a.incidentIds.includes(later.incidentId)))
   if(witness&&applied)repeat.set(seed,{args,out,riderId:ep.riderId})
  }
  for(const event of out.chase.teamRescueEvents){
   const helper=event.helperRiderIds.find(id=>episodes.some(e=>e.riderId===id&&e.incidentId===event.incidentId&&e.episodeKind==='team_rescue_helper'))
   if(!helper)continue
   const active=out.feedbackAudit.find(f=>f.excludedRiderIds.includes(helper)&&f.adjustments.some(a=>a.riderId===helper&&a.episodeKeys.includes(event.incidentId+':'+helper)))
   if(active)rescue.set(seed,{args,out,helper})
  }
  console.log('INFO 043Y '+seed+' incidents='+incidents.length+' rescue='+out.chase.teamRescueEvents.length+' repeatWitness='+repeat.size+' rescueWitness='+rescue.size)
 }
 console.log('INFO 043Y bounded refusals '+JSON.stringify(refusals))
 for(const [kind,found] of [['repeat',repeat],['rescue',rescue]]){
  if(!found.size){console.log('OPEN 043Y no '+kind+' witness in bounded search');continue}
  const [seed,{args,out}]=found.entries().next().value
  assert.deepEqual(reviewSequentialIncidentFeedback(args),out)
  assert.equal(out.feedbackSha256,carryoverDigest(out.feedbackAudit))
  for(const f of out.feedbackAudit){
   const gate=out.trace.audit.find(x=>x.raceSecond===f.raceSecond)
   for(const id of f.excludedRiderIds)assert.ok(!(gate.eligibleRiderIds??[]).includes(id))
  }
  for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','physicalEngineFeedbackApplied','finalClassificationVerified','healthWritesPerformed'])assert.equal(out[k],false)
  pass('043Y actual-engine sourced '+kind+' witness '+seed+' '+out.feedbackSha256)
 }
 if(checks!==2){console.log('OPEN 043Y '+checks+'/2 witnesses; no hosted connection');process.exitCode=1}
 else console.log('PASS 2/2 actual-engine sourced scenario checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
