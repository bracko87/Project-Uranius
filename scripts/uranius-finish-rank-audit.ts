// OFFLINE 120km 128-rider rider-strength gradient experiment.
// Fixed seed and course; compare no-order baseline to early/late live attack,
// with only the nominated rider's physical attributes varied. No forced gap.
import {createHash} from 'node:crypto'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

type Strength=76|82|86|90|94
type Timing='baseline'|'early'|'late'
const field=128
function buildInput(strength:Strength,timing:Timing):StageInput{
 const riders=Array.from({length:field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  const attributes={...base.attributes,
   flat:48+(index*37+11)%48,climbing:47+(index*29+23)%49,
   sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
   stamina:51+(index*19+7)%43,resistance:50+(index*31)%44,
   recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
   timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}
  return {...base,riderId:'sustain-rider-'+String(index+1).padStart(3,'0'),
   teamId:'sustain-team-'+String(team).padStart(2,'0'),
   teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:index===0
    ?{...attributes,flat:strength,climbing:strength,acceleration:strength,
      stamina:strength,resistance:strength,recovery:strength}:attributes}
 })
 const teams=Array.from({length:field/8},(_,i)=>{
  const roster=riders.slice(i*8,i*8+8)
  return {teamId:roster[0].teamId,teamName:roster[0].teamName,
   captainRiderId:roster[0].riderId,riderIds:roster.map(r=>r.riderId)}
 })
 const attacker=riders[0]
 const attackFrom=timing==='early'?5:70
 return {...syntheticTenRiderStage,
  raceId:'uranius-offline-attack-sustainability',stageId:'rolling-120-'+strength,
  stageName:'Fictional rolling 120km attack sustainability',
  seed:'sustainability-fixed-seed',distanceKm:120,teams,riders,
  profilePoints:[100,130,160,120,320,370,280,340,500,400,260,170,140]
   .map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
  orders:timing==='baseline'?[]:[{
   orderId:'sustain-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,
   eligibleFromKm:attackFrom,eligibleUntilKm:attackFrom+3,
   priority:1,maximumFollowers:null,targetRiderId:null,
   metadata:{uraniusLiveCommand:true}}],
 }
}

type AuditRow={
 riderId:string,position:number,time:number,sprint:number,
 acceleration:number,energy:number,groupId:string
}
function audit(strength:Strength){
 const input=buildInput(strength,'baseline')
 const initial=createInitialState(input)
 const race=runCalibratedTerrainSeparationStage(initial)
 const rows:AuditRow[]=Object.values(race.finalState.riders).map(r=>({
  riderId:r.riderId,position:r.finishPosition!,
  time:r.finishTimeSeconds!,sprint:r.attributes.sprint,
  acceleration:r.attributes.acceleration,energy:r.energy,
  groupId:r.currentGroupId,
 })).sort((a,b)=>a.position-b.position)
 const selected=rows.find(r=>r.riderId==='sustain-rider-001')!
 const finishGroups=new Map<string,AuditRow[]>()
 for(const row of rows){
  const entries=finishGroups.get(row.groupId)??[]
  entries.push(row)
  finishGroups.set(row.groupId,entries)
 }
 const groupChecks=Array.from(finishGroups.entries()).map(([groupId,riders])=>{
  const sameTime=riders.every(r=>r.time===riders[0].time)
  const sprintRanking=riders.slice().sort((a,b)=>
   b.sprint-a.sprint||b.acceleration-a.acceleration||
   b.energy-a.energy||a.riderId.localeCompare(b.riderId))
  const actual=riders.slice().sort((a,b)=>a.position-b.position)
  return {groupId,count:riders.length,sameTime,
   actualOrderMatchesSprintRanking:sprintRanking.every((r,i)=>r.riderId===actual[i].riderId),
   distinctFinishTimes:new Set(riders.map(r=>r.time)).size}
 })
 const sortedGlobal=rows.slice().sort((a,b)=>a.time-b.time||b.sprint-a.sprint||
  b.acceleration-a.acceleration||b.energy-a.energy||a.riderId.localeCompare(b.riderId))
 return {strength,completed:race.completed,fieldSize:rows.length,
  selected,selectedSprintRank:1+rows.filter(r=>
   r.sprint>selected.sprint||
   (r.sprint===selected.sprint&&r.acceleration>selected.acceleration)||
   (r.sprint===selected.sprint&&r.acceleration===selected.acceleration&&r.energy>selected.energy)||
   (r.sprint===selected.sprint&&r.acceleration===selected.acceleration&&
    r.energy===selected.energy&&r.riderId.localeCompare(selected.riderId)<0)).length,
  topFive:rows.slice(0,5),lastFive:rows.slice(-5),
  distinctGlobalFinishTimes:new Set(rows.map(r=>r.time)).size,
  allGroupChecks:groupChecks,
  globalFinishOrderMatchesComparator:sortedGlobal.every((r,i)=>r.riderId===rows[i].riderId),
  winnerTime:rows[0].time,
  selectedAttributes:input.riders[0].attributes,
 }
}
const first=audit(76)
const second=audit(94)
const checks={
 bothComplete:first.completed&&second.completed&&first.fieldSize===field&&second.fieldSize===field,
 groupTimeEquality:first.allGroupChecks.every(g=>g.sameTime)&&second.allGroupChecks.every(g=>g.sameTime),
 groupRankComparator:first.allGroupChecks.every(g=>g.actualOrderMatchesSprintRanking)&&
  second.allGroupChecks.every(g=>g.actualOrderMatchesSprintRanking),
 globalRankComparator:first.globalFinishOrderMatchesComparator&&second.globalFinishOrderMatchesComparator,
 deliberateSprintUnchanged:first.selectedAttributes.sprint===second.selectedAttributes.sprint,
 deliberatelyChangedPhysicalStrength:first.selectedAttributes.flat!==second.selectedAttributes.flat,
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-finish-rank-audit-v1',
 checks,scenarios:[first,second],
 interpretation:'Equal group crossing times are physically correct under shared-group movement. Sprint and acceleration are rank tie breakers; flat/climbing/stamina are not direct final sprint values. Audit only; no changed physics.'
},null,2)+'\n')
