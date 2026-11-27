import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
import {applySequentialFeedback,reviewSequentialIncidentFeedback} from '../scripts/uranius-sequential-incident-feedback-review.mjs'
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
const root=fileURLToPath(new URL('../',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'uranius-043x-'))
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
const run=(entry,p,allowFailure=false)=>{const c=spawnSync(process.execPath,[entry],{env,input:JSON.stringify(p),encoding:'utf8',timeout:180000,maxBuffer:48*1024*1024,windowsHide:true});if(c.error)throw c.error;if(!allowFailure)assert.equal(c.status,0,c.stderr);return c}
try{
 const a=roster[0].riderId,b=roster[1].riderId,c=roster[2].riderId
 const tick=sec=>({raceSecond:sec,gradientPercent:0,riders:[a,b,c].map(riderId=>({riderId,status:'racing',energy:20,commandIntensity:1})),groups:[{displayCode:'P',aheadOfPeloton:false,riderIds:[a,b,c]}],rejoins:[]})
 const inc=(id,sec,km,riderId,loss,statusImpact='finished')=>({incidentId:id,raceSecond:sec,kmFromStart:km,riderConsequences:[{riderId,statusImpact,energyLossPoints:loss}]})
 const ep=(id,riderId,km,rejoin,energy,kind='incident_rider')=>({episodeKey:id+':'+riderId,incidentId:id,episodeKind:kind,riderId,activationKm:km,actualRejoinKm:rejoin,chaseEnergyCostPoints:energy,finalGapToTargetSeconds:0,samples:[{kmFromStart:km,displayCode:'I1',targetDisplayCode:'P',gapToTargetSeconds:30,cumulativeChaseEnergyCostPoints:0},{kmFromStart:km+1,displayCode:'I1',targetDisplayCode:'P',gapToTargetSeconds:15,cumulativeChaseEnergyCostPoints:energy/2}]})
 const first=inc('i1',300,10,a,3),second=inc('i2',1200,20,a,4),one=ep('i1',a,10,12,2),two=ep('i2',a,20,22,4)
 const helper=ep('i1',b,10.5,12,2,'team_rescue_helper')
 const p={incidents:[first],episodes:[one,helper]},confirmed=new Map()
 const active=applySequentialFeedback({tick:tick(330),kmFromStart:11,prefix:p,confirmed})
 assert.equal(active.tick.riders[0].energy,16);assert.equal(active.tick.riders[1].energy,19.5)
 assert.deepEqual(active.excludedRiderIds,[a,b]);assert.deepEqual(active.tick.groups,[{displayCode:'I1',aheadOfPeloton:false,riderIds:[a,b]},{displayCode:'P',aheadOfPeloton:false,riderIds:[c]}])
 const joined=applySequentialFeedback({tick:tick(360),kmFromStart:12,prefix:p,confirmed})
 assert.equal(joined.tick.riders[0].energy,15);assert.equal(joined.tick.riders[1].energy,18);assert.equal(joined.tick.rejoins.length,1);assert.equal(confirmed.size,2);assert.deepEqual(joined.excludedRiderIds,[])
 pass('043X helper pickup, shared detachment, separate energy and no false incident rejoin witness')
 const both={incidents:[first,second],episodes:[one,helper,two]}
 const repeat=applySequentialFeedback({tick:tick(1230),kmFromStart:21,prefix:both,confirmed})
 assert.equal(repeat.tick.riders[0].energy,9);assert.deepEqual(repeat.adjustments[0].incidentIds,['i1','i2']);assert.deepEqual(repeat.excludedRiderIds,[a])
 const done=applySequentialFeedback({tick:tick(1260),kmFromStart:22,prefix:both,confirmed})
 assert.equal(done.tick.riders[0].energy,7);assert.equal(done.tick.rejoins[0].incidentId,'i2');assert.equal(done.tick.rejoins.length,1)
 assert.throws(()=>applySequentialFeedback({tick:tick(1230),kmFromStart:21,prefix:{...both,incidents:[first,{...second,raceSecond:1199}]},confirmed:new Map()}),/repeat incident before/)
 assert.throws(()=>applySequentialFeedback({tick:tick(1230),kmFromStart:21,prefix:{...both,episodes:[{...one,actualRejoinKm:null},helper,two]},confirmed:new Map()}),/repeat incident before/)
 assert.throws(()=>applySequentialFeedback({tick:tick(300),kmFromStart:10,prefix:p,confirmed:new Map()}),/future incident/)
 const dead={incidents:[first,inc('i2',1200,20,a,0,'dnf')],episodes:[one,helper]}
 assert.equal(applySequentialFeedback({tick:tick(1230),kmFromStart:21,prefix:dead,confirmed}).tick.riders[0].status,'dnf')
 pass('043X repeat incident after recovery and cooldown, accumulated energy, separate confirmations and permanent DNF')
 const engine=join(dir,'engine.mjs')
 await build({entryPoints:[join(root,'scripts/uranius-incident-replay-engine-review.ts')],outfile:engine,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'silent'})
 console.log('INFO 043X actual base engine started')
 let result,out,args
 for(let i=0;i<6;i++){
  result=JSON.parse(run(engine,packet({...input,seed:'043U-engine-'+i})).stdout)
  if(!result.review.trace.incidents.length)continue
  args={engine:result,expectedEvidenceSha256:result.evidenceSha256,context}
  try{out=reviewSequentialIncidentFeedback(args)}catch(e){if(!/new prefix changed prior observed feedback|confirmed rejoin changed|repeat incident before rejoin|overlapping incident\/rescue episode/.test(String(e)))throw e;console.log('INFO bounded scenario refused: '+e.message);continue}
  if(out.trace.incidents.length&&out.feedbackAudit.length)break
 }
 assert.ok(out?.trace.incidents.length&&out.feedbackAudit.length)
 const events=out.trace.incidents,firstEvent=events[0]
 assert.deepEqual(firstEvent,result.review.trace.incidents[0]);assert.equal(out.prefixReceipts.length,events.length)
 for(const f of out.feedbackAudit){
  assert.equal(f.priorIncidentCount,events.filter(e=>e.raceSecond<f.raceSecond).length)
  const gate=out.trace.audit.find(x=>x.raceSecond===f.raceSecond)
  for(const id of f.excludedRiderIds)assert.ok(!(gate.eligibleRiderIds??[]).includes(id))
  for(const row of f.adjustments){
   assert.equal(row.energy,Math.round((Math.max(0,row.baseEnergy-row.initialLoss-row.chaseEnergy)+Number.EPSILON)*1e6)/1e6)
   for(const id of row.incidentIds)assert.ok(events.find(e=>e.incident.incidentId===id).raceSecond<f.raceSecond)
  }
 }
 assert.deepEqual(reviewSequentialIncidentFeedback(args),out);assert.equal(out.feedbackSha256,carryoverDigest(out.feedbackAudit))
 pass('043X actual engine source, sequential prefix feedback and excluded detached riders')
 const bad=structuredClone(result);bad.review.measurements[0].riders[0].energy=1
 assert.throws(()=>reviewSequentialIncidentFeedback({...args,engine:bad}),/digest mismatch/)
 assert.throws(()=>reviewSequentialIncidentFeedback({...args,context:{...context,weatherMultiplier:1}}),/digest mismatch/)
 for(const k of ['official','hostedWriteAllowed','accountingAllowed','authoritativeSourceVerified','physicalEngineFeedbackApplied','finalClassificationVerified','healthWritesPerformed'])assert.equal(out[k],false)
 pass('043X frozen evidence and authority boundary preserved')
 assert.equal(checks,4);console.log('PASS 4/4 sequential incident feedback checks; no hosted connection')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250});console.log('INFO offline bundles cleaned up')}
