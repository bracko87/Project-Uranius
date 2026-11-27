import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {reviewIncidentAdjustedReplay,reviewProvisionalClassification,reviewProtectedSourceTime,historicalRoadTimeLimit} from '../scripts/uranius-incident-adjusted-replay-review.mjs'
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
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-043v-'))
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const run=(entry,p,allowFailure=false)=>{const c=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(p),encoding:'utf8',timeout:180000,maxBuffer:48*1024*1024,windowsHide:true});if(c.error)throw c.error;if(!allowFailure)assert.equal(c.status,0,c.stderr);return c}
try{
 const engine=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-incident-replay-engine-review.ts')],outfile:engine,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 const baseRows=[{riderId:'a',status:'finished',baseTimeSeconds:100},{riderId:'b',status:'finished',baseTimeSeconds:100},{riderId:'c',status:'finished',baseTimeSeconds:110},{riderId:'d',status:'finished',baseTimeSeconds:110},{riderId:'e',status:'finished',baseTimeSeconds:120}]
 assert.equal(reviewProtectedSourceTime(['a','b','c','d','e'],[],baseRows),100)
 assert.equal(reviewProtectedSourceTime(['a','b','c','d','e'],['a'],baseRows),110)
 assert.equal(reviewProtectedSourceTime(['a'],['a'],baseRows),null)
 for(const [terrain,pct] of Object.entries({flat:18,hilly:20,mountain:25,cobbled:22}))assert.equal(historicalRoadTimeLimit(terrain),pct)
 const row=(id,rank,extra={})=>({riderId:id,baseRank:rank,baseTimeSeconds:1000,dnf:false,timePenaltySeconds:0,finishPerformancePenaltyPoints:0,protectedTimeSeconds:null,...extra})
 const c=reviewProvisionalClassification([row('a',1,{finishPerformancePenaltyPoints:2.5}),row('b',2),row('c',3,{timePenaltySeconds:180}),row('d',4,{timePenaltySeconds:181}),row('e',5,{dnf:true}),row('f',6,{timePenaltySeconds:200,protectedTimeSeconds:1000})],'flat')
 assert.equal(c.cutoffTimeSeconds,1180);assert.equal(c.winnerTieUnresolved,true)
 assert.deepEqual(c.classification.filter(x=>x.status==='finished').map(x=>x.riderId),['a','b','c','f'])
 assert.equal(c.classification.find(x=>x.riderId==='f').physicalTimeSeconds,1200);assert.equal(c.classification.find(x=>x.riderId==='f').provisionalTimeSeconds,1000)
 assert.equal(c.classification.find(x=>x.riderId==='d').status,'otl');assert.equal(c.classification.find(x=>x.riderId==='e').physicalTimeSeconds,null)
 pass('043V historical time limits, protected modal source time, physical order, DNF/OTL and unresolved score ties')
 console.log('INFO 043V actual base engine started')
 let result
 for(let i=0;i<3;i++){result=JSON.parse(run(engine,packet({...input,seed:'043U-engine-'+i})).stdout);if(result.review.trace.incidents.length>0)break}
 assert.ok(result.review.trace.incidents.length>0)
 const args={engine:result,expectedEvidenceSha256:result.evidenceSha256,context},out=reviewIncidentAdjustedReplay(args),base=JSON.parse(result.outputText)
 assert.equal(out.baseOutputSha256,sha(result.outputText));assert.equal(out.replaySha256,carryoverDigest(out.replay))
 assert.equal(out.classificationSha256,carryoverDigest(out.classification))
 assert.equal(out.classification.classification.length,24);assert.equal(out.replay.length,result.review.measurements.length)
 for(const r of out.classification.classification){
  const original=base.finalRiderStates.find(x=>x.riderId===r.riderId)
  assert.equal(r.baseFinishEnergy,original.energy)
  assert.equal(r.adjustedFinishEnergy,Math.round((Math.max(0,original.energy-r.initialEnergyLossPoints-r.chaseEnergyCostPoints)+Number.EPSILON)*1e6)/1e6)
  assert.equal(r.baseTimeSeconds,original.finishTimeSeconds)
  if(r.status==='dnf'){assert.equal(r.rank,null);assert.equal(r.provisionalTimeSeconds,null)}
  else assert.equal(r.physicalTimeSeconds,r.baseTimeSeconds+r.timePenaltySeconds)
 }
 pass('043V actual engine terminal energy and provisional time consequences preserve immutable base result')
 const byId=new Map(out.classification.classification.map(r=>[r.riderId,r]))
 for(const ev of result.review.chase.incidents)for(const r of ev.riderConsequences){
  const row=byId.get(r.riderId)
  assert.equal(row.initialEnergyLossPoints,r.energyLossPoints)
  assert.equal(row.dnf,r.statusImpact==='dnf')
  assert.equal(row.timePenaltySeconds,row.dnf?0:r.finalTimePenaltySeconds)
  const before=out.replay.filter(f=>f.historicalKm<ev.kmFromStart-.000001).at(-1).riders.find(x=>x.riderId===r.riderId)
  const after=out.replay.find(f=>f.historicalKm>=ev.kmFromStart-.000001).riders.find(x=>x.riderId===r.riderId)
  assert.equal(before.initialLoss,0);assert.equal(after.initialLoss,row.initialEnergyLossPoints)
  if(row.dnf)assert.equal(after.status,'dnf')
 }
 for(const ep of result.review.chase.episodes){
  const row=byId.get(ep.riderId)
  assert.equal(row.chaseEnergyCostPoints,ep.chaseEnergyCostPoints)
  if(ep.actualRejoinKm!==null)assert.equal(row.timePenaltySeconds,0)
 }
 for(const f of out.replay)for(const r of f.riders)assert.ok(r.adjustedEnergy>=0&&r.adjustedEnergy<=r.baseEnergy+1e-6)
 assert.deepEqual(reviewIncidentAdjustedReplay(args),out)
 pass('043V chronological diagnostic energy debit, modeled chase/rejoin and withdrawal overlay')
 const tampered=structuredClone(result);tampered.review.measurements[0].riders[0].energy=1
 assert.throws(()=>reviewIncidentAdjustedReplay({...args,engine:tampered}),/digest mismatch/)
 assert.throws(()=>reviewIncidentAdjustedReplay({...args,context:{...context,weatherMultiplier:1}}),/digest mismatch/)
 assert.throws(()=>reviewIncidentAdjustedReplay({...args,engine:{...result,official:true}}),/offline 043U/)
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','incidentFeedbackApplied','finalClassificationVerified','healthWritesPerformed'])assert.equal(out[k],false)
 assert.equal(out.model,'historical_postprocessing_no_physical_feedback')
 pass('043V tampered base evidence and official authority refused; no engine feedback or health writes')
 assert.equal(checks,4);console.log('PASS 4/4 incident adjusted replay checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
