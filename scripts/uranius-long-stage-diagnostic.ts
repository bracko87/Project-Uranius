// Offline long-stage sporting diagnostic. Fictional fields and routes only.
// No worker, Supabase, hosted clocks, canonical fixtures, or production mutation.
import {performance} from 'node:perf_hooks'
import {createHash} from 'node:crypto'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

type Course='rolling_120'|'mountain_160'
type Experiment='default_off'|'birth_tick_protected'
const courses=[
 {name:'rolling_120' as Course,distance:120,elevations:[100,130,160,120,320,370,280,340,500,400,260,170,140],field:128},
 {name:'mountain_160' as Course,distance:160,elevations:[120,150,180,420,880,1210,920,500,650,1050,1450,1100,640,900,540,280,160],field:160},
]
const seeds=['alpha','beta']
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,20)
const round=(v:number)=>Number(v.toFixed(3))
function makeInput(course:typeof courses[number],seed:string):StageInput{
 const riders=Array.from({length:course.field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  // Rider heterogeneity is deterministic and synthetic; no one is forced to drop.
  const ability=(index*37+11)%48
  const climber=(index*29+23)%49
  const endurance=(index*19+7)%43
  return {...base,riderId:'long-rider-'+String(index+1).padStart(3,'0'),
   teamId:'long-team-'+String(team).padStart(2,'0'),
   riderName:'Synthetic Long Rider '+(index+1),teamName:'Synthetic Long Team '+team,
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:{...base.attributes,flat:48+ability,climbing:47+climber,
    sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
    stamina:51+endurance,resistance:50+(index*31)%44,
    recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
    timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}}
 })
 const teams=Array.from({length:course.field/8},(_,index)=>{
  const roster=riders.slice(index*8,index*8+8)
  return {teamId:roster[0].teamId,teamName:roster[0].teamName,
   captainRiderId:roster[0].riderId,riderIds:roster.map(r=>r.riderId)}
 })
 return {...syntheticTenRiderStage,
  raceId:'uranius-offline-long-stage',stageId:'uranius-'+course.name,
  stageName:'Fictional '+course.name,seed:'uranius-long-poc-'+course.name+'-'+seed,
  distanceKm:course.distance,teams,riders,
  profilePoints:course.elevations.map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
  orders:[]}
}
function run(course:typeof courses[number],seed:string,experiment:Experiment){
 const input=makeInput(course,seed)
 const started=performance.now()
 const result=runCalibratedTerrainSeparationStage(createInitialState(input),{
  experimentalPreserveBirthTickDroppedGroups:experiment==='birth_tick_protected',
 })
 const runtimeMs=round(performance.now()-started)
 const originalIds=new Set(input.riders.map(r=>r.riderId))
 const final=Object.values(result.finalState.riders)
 const finalIds=new Set(final.map(r=>r.riderId))
 const rosterExact=final.length===originalIds.size&&finalIds.size===originalIds.size&&
  [...originalIds].every(id=>finalIds.has(id))
 const finishers=final.filter(r=>r.finished&&r.finishTimeSeconds!==null)
 const ranks=finishers.map(r=>r.finishPosition)
 const classificationsValid=finishers.length===originalIds.size&&
  ranks.every(x=>Number.isInteger(x)&&x!==null&&x>=1&&x<=course.field)&&
  new Set(ranks).size===course.field
 // Measure birth, survival, catches and genuine movement at tick resolution.
 // Group count alone can include a newborn dropped wave at 0km separation.
 let reabsorbedSameTick=0,createdTransitions=0,consolidatedTransitions=0
 let survivingNewDropTransitions=0,laterReabsorbedGroups=0
 let multiGroupTicks=0,positiveGapTicks=0,peakTickSpatialGapKm=0
 let earliestMultiGroupSecond:number|null=null
 let latestMultiGroupSecond:number|null=null
 let earliestPositiveGapSecond:number|null=null
 const reabsorptionSamples:Array<{second:number,groupId:string,ageSeconds:number,gapKm:number}>= []
 for(const tick of result.ticks){
  const before=tick.reconciledBreakaways.previousState
  const after=tick.reconciledBreakaways.state
  const reabsorbed=tick.reconciledBreakaways.reabsorbedBreakawayGroupIds
  for(const transition of tick.transitions){
   if(transition.transitionKind==='created')createdTransitions++
   else consolidatedTransitions++
   if(reabsorbed.includes(transition.targetGroupId))reabsorbedSameTick++
   const active=after.groups[transition.targetGroupId]
   if(active?.active&&active.riderIds.length>0)survivingNewDropTransitions++
  }
  for(const id of reabsorbed){
   const group=before.groups[id]
   const peloton=Object.values(before.groups).find(g=>g.active&&g.groupType==='peloton')
   if(!group)continue
   const age=tick.state.raceSecond-group.createdAtRaceSecond
   if(age>0)laterReabsorbedGroups++
   if(reabsorptionSamples.length<20)reabsorptionSamples.push({
    second:tick.state.raceSecond,groupId:id,ageSeconds:age,
    gapKm:peloton?round(group.distanceKm-peloton.distanceKm):0})
  }
  const groups=Object.values(tick.state.groups).filter(g=>g.active&&g.riderIds.length>0)
  if(groups.length>1){
   multiGroupTicks++
   earliestMultiGroupSecond??=tick.state.raceSecond
   latestMultiGroupSecond=tick.state.raceSecond
   const distances=groups.map(g=>g.distanceKm)
   const gap=Math.max(...distances)-Math.min(...distances)
   peakTickSpatialGapKm=Math.max(peakTickSpatialGapKm,gap)
   if(gap>1e-7){positiveGapTicks++;earliestPositiveGapSecond??=tick.state.raceSecond}
  }
 }
 let replayMembershipErrors=0,maxGroups=0,multiGroupFrames=0,peakGapKm=0
 for(const frame of result.replaySnapshots){
  const active=Object.values(frame.groups).filter(g=>g.active&&g.riderIds.length>0)
  maxGroups=Math.max(maxGroups,active.length)
  if(active.length>1){
   multiGroupFrames++
   const km=active.map(g=>g.distanceKm)
   peakGapKm=Math.max(peakGapKm,Math.max(...km)-Math.min(...km))
  }
  const ids=active.flatMap(g=>g.riderIds)
  if(new Set(ids).size!==ids.length||ids.some(id=>!originalIds.has(id)))replayMembershipErrors++
 }
 const times=finishers.map(r=>r.finishTimeSeconds as number)
 const winnerSeconds=times.length?Math.min(...times):null
 const spread=times.length?Math.max(...times)-Math.min(...times):null
 const winnerAverageKmh=winnerSeconds&&winnerSeconds>0?course.distance*3600/winnerSeconds:null
 const ages=result.transitions.map(t=>t.transitionKind)
 return {course:course.name,seed,experiment,distanceKm:course.distance,fieldSize:course.field,
  profilePoints:input.profilePoints,rosterExact,finishers:finishers.length,
  classificationsValid,replayMembershipErrors,completed:result.completed,
  maxGroups,multiGroupFrames,peakGapKm:round(peakGapKm),
  finishSpreadSeconds:spread===null?null:round(spread),
  winnerAverageKmh:winnerAverageKmh===null?null:round(winnerAverageKmh),
  transitions:result.transitions.length,createdTransitions,consolidatedTransitions,
  reabsorbedSameTick,survivingNewDropTransitions,laterReabsorbedGroups,
  multiGroupTicks,positiveGapTicks,peakTickSpatialGapKm:round(peakTickSpatialGapKm),
  earliestMultiGroupSecond,latestMultiGroupSecond,earliestPositiveGapSecond,
  reabsorptionSamples,
  transitionKinds:ages.reduce((out,k)=>{
   out[k]=(out[k]??0)+1;return out
  },{} as Record<string,number>),runtimeMs,tickCount:result.tickCount,
  finalEnergyRange:[round(Math.min(...final.map(r=>r.energy))),round(Math.max(...final.map(r=>r.energy)))],
  inputDigest:sha(input),classificationDigest:sha(final.map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds])),
  technicalIssues:[...(!result.completed?['INCOMPLETE']:[]),...(!rosterExact?['ROSTER_MISMATCH']:[]),
   ...(!classificationsValid?['INVALID_CLASSIFICATION']:[]),
   ...(replayMembershipErrors?['INVALID_REPLAY_MEMBERSHIP']:[])],
  sportingWarnings:[...(maxGroups<2?['NO_GROUP_SPLIT']:[]),
   ...(spread===0?['ZERO_FINISH_SPREAD']:[]),
   ...(winnerAverageKmh!==null&&(winnerAverageKmh<20||winnerAverageKmh>60)?['REVIEW_WINNER_AVERAGE_SPEED']:[])],
 }
}
const results=[]
for(const course of courses)for(const seed of seeds)for(const experiment of ['default_off','birth_tick_protected'] as const){
 try{results.push(run(course,seed,experiment))}
 catch(e){results.push({course:course.name,seed,experiment,error:e instanceof Error?e.message:String(e)})}
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-long-stage-diagnostic-v1',
 scope:'OFFLINE FICTIONAL POC ONLY — not sporting GO or deployment approval',
 caveat:'Synthetic rider distribution and elevation profiles are exploratory, not historical cycling calibration. Default-off and opt-in use identical inputs per pair; judge gaps, catches and fatigue manually.',
 results},null,2)+'\n')
