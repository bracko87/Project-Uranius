import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {projectEngineIncidentReplay} from '../scripts/uranius-engine-incident-replay-review.mjs'
import {reviewHistoricalCheckpointConsequences} from '../scripts/uranius-historical-incident-consequences-review.mjs'
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
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-043u-'))
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const run=(entry,p,allowFailure=false)=>{const c=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(p),encoding:'utf8',timeout:180000,maxBuffer:48*1024*1024,windowsHide:true});if(c.error)throw c.error;if(!allowFailure)assert.equal(c.status,0,c.stderr);return c}
try{
 const engine=join(dir,'engine.mjs'),legacy=join(dir,'legacy.mjs')
 for(const [entry,outfile] of [['scripts/uranius-incident-replay-engine-review.ts',engine],['scripts/uranius-race-job-engine.ts',legacy]])await build({entryPoints:[join(root,entry)],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 console.log('INFO 043U actual base engine started')
 let result,chosen
 // A quiet stage is legal; bounded seeds ensure the acceptance fixture exercises incidents.
 for(let i=0;i<3;i++){chosen=packet({...input,seed:'043U-engine-'+i});result=JSON.parse(run(engine,chosen).stdout);if(result.review.trace.incidents.length>0)break}
 assert.ok(result.review.trace.incidents.length>0,'fixture did not exercise historical incident')
 const base=JSON.parse(result.outputText),review=result.review,measurements=review.measurements
 assert.equal(run(legacy,result.input).stdout,result.outputText)
 assert.equal(result.evidence.outputSha256,sha(result.outputText));assert.equal(result.evidence.inputSha256,sha(JSON.stringify(result.input)))
 assert.equal(result.evidenceSha256,carryoverDigest(result.evidence));assert.equal(result.evidence.reviewSha256,carryoverDigest(review))
 pass('043U actual engine internal tick execution preserves independent legacy output bytes')
 assert.equal(measurements.length,result.evidence.actualEngineTickCount+1);assert.equal(measurements[0].raceSecond,0);assert.equal(measurements.at(-1).measuredKm,distanceKm)
 assert.equal(measurements.at(-1).raceSecond,result.evidence.winnerTimeSeconds)
 for(const m of measurements){
  const snap=base.snapshots.find(s=>s.raceSecond===m.raceSecond);assert.ok(snap);assert.equal(m.measuredKm,snap.km)
  assert.deepEqual(m.groups.map(g=>g.groupId).sort(),snap.groups.map(g=>g.groupId).sort())
  assert.equal(m.riders.length,24)
 }
 for(const r of base.finalRiderStates){const m=measurements.at(-1).riders.find(x=>x.riderId===r.riderId);assert.equal(m.energy,r.energy);assert.equal(m.distanceKm,r.distanceKm);assert.equal(m.status,r.stageStatus)}
 assert.equal(review.measurementSha256,carryoverDigest(measurements))
 pass('043U measured per-rider energy and group membership from actual engine states, terminal energy and snapshot cross-check')
 assert.equal(review.trace.incidents.length,review.consequences.length);assert.ok(review.chase)
 assert.equal(review.chase.incidents.length,review.consequences.length)
 for(let i=0;i<review.consequences.length;i++){
  const x=review.consequences[i],inc=reviewHistoricalCheckpointConsequences(x).incident,ev=review.trace.incidents[i]
  assert.equal(inc.incidentId,ev.incident.incidentId);assert.equal(inc.hash,ev.incident.hash)
  assert.equal(review.chase.incidents[i].incidentId,inc.incidentId)
  const m=measurements.find(x=>x.raceSecond===ev.raceSecond)
  for(const id of inc.affectedRiderIds)assert.equal(m.riders.find(r=>r.riderId===id).status,'racing')
 }
 assert.ok(review.trace.incidents.length<=review.trace.limits.maximumIncidents)
 assert.equal(review.chaseSha256,carryoverDigest(review.chase))
 pass('043U actual replay observations drive historical occurrence, initial consequences, chase and rescue review')
 const frames=measurements.map(m=>({raceSecond:m.raceSecond,actualKm:m.measuredKm,riders:m.riders,groups:m.groups}))
 const args={input:result.input,readinessReceipt:result.readinessReceipt,runId,context,frames,winnerTimeSeconds:result.evidence.winnerTimeSeconds}
 assert.deepEqual(projectEngineIncidentReplay(args),review)
 assert.throws(()=>projectEngineIncidentReplay({...args,frames:frames.slice(1)}),/complete measured tick grid/)
 const bad=structuredClone(frames);bad[0].riders[0].energy=1;assert.throws(()=>projectEngineIncidentReplay({...args,frames:bad}),/initial energy/)
 const injected=run(engine,{...chosen,frames},true);assert.notEqual(injected.status,0);assert.match(injected.stderr,/unexpected review packet/)
 const stale=run(engine,{...chosen,context:{...context,weatherMultiplier:1}},true);assert.notEqual(stale.status,0);assert.match(stale.stderr,/input\/context digest mismatch/)
 pass('043U deterministic re-projection, incomplete/altered ticks and injected caller output rejected')
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','incidentFeedbackApplied','finalClassificationVerified','healthWritesPerformed'])assert.equal(review[k],false)
 assert.equal(result.actualEngineOutputUsed,true);assert.equal(result.official,false);assert.equal(review.occurrenceRule,'no_rejoin_feedback_conservative')
 assert.equal(review.distanceRule,'historical_time_fraction_separate_from_measured_km')
 pass('043U actual base engine evidence does not authorize official incident feedback or final classification')
 assert.equal(checks,5);console.log('PASS 5/5 actual engine incident replay checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
