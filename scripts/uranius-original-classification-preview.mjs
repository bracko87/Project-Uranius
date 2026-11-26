/** Read-only source-aligned review projection of original ProPeloton canonical point totals and cumulative classifications. Not an official writer. Source: reference/database/20260929184629_baseline_04_sql_dump_121_240.sql.txt, lines 7732–7882, 7975–8484. */
export function projectOriginalClassifications({raceId,stages,results,pointRows,youngRiderIds,coverage}){
 const require=(ok,message)=>{if(!ok)throw Error(message)}
 const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
 const integer=x=>Number.isSafeInteger(x)&&x>=0
 const cmp=(a,b)=>a<b?-1:a>b?1:0
 const sum=xs=>{const n=xs.reduce((a,b)=>a+b,0);require(Number.isSafeInteger(n),'Integer overflow');return n}
 require(uuid(raceId)&&Array.isArray(stages)&&stages.length>0&&Array.isArray(results)&&Array.isArray(pointRows)&&Array.isArray(youngRiderIds),'Invalid projection packet')
 require(coverage&&['complete','missing'].includes(coverage.points)&&['complete','missing'].includes(coverage.penalties)&&['complete','missing'].includes(coverage.young),'Explicit coverage required')
 const ordered=[...stages].sort((a,b)=>a.stageNumber-b.stageNumber)
 require(ordered.every((s,i)=>uuid(s.stageId)&&s.stageNumber===i+1&&s.raceId===raceId)&&new Set(ordered.map(s=>s.stageId)).size===ordered.length,'Stages must be unique contiguous completed prefix')
 const scope=new Map(ordered.map(s=>[s.stageId,s.stageNumber]))
 const rows=new Map(),byRider=new Map(),byStage=new Map(ordered.map(s=>[s.stageId,[]]))
 for(const x of results){
  require(x.raceId===raceId&&scope.has(x.stageId)&&uuid(x.riderId)&&uuid(x.teamId)&&typeof x.riderName==='string'&&x.riderName.length>0&&typeof x.teamName==='string'&&x.teamName.length>0,'Invalid stage result identity')
  require(['finished','dnf','dns'].includes(x.status)&&integer(x.penaltySeconds),'Invalid status or penalty')
  if(x.status==='finished')require(integer(x.elapsedSeconds)&&x.elapsedSeconds>0&&integer(x.rank)&&x.rank>0,'Invalid finished result')
  else require(x.elapsedSeconds===null&&x.rank===null,'Withdrawn result must not be classified')
  const key=x.stageId+':'+x.riderId;require(!rows.has(key),'Duplicate stage result');rows.set(key,x)
  byStage.get(x.stageId).push(x)
  if(!byRider.has(x.riderId))byRider.set(x.riderId,[])
  byRider.get(x.riderId).push(x)
 }
 for(const stage of ordered){
  const list=byStage.get(stage.stageId)
  const finished=list.filter(x=>x.status==='finished').map(x=>x.rank).sort((a,b)=>a-b)
  require(finished.length>0&&finished.every((n,i)=>n===i+1),'Missing or invalid stage ranks')
 }
 const points=new Map(),stageBonus=new Map(),seen=new Set()
 for(const p of pointRows){
  require(p.raceId===raceId&&scope.has(p.stageId)&&uuid(p.pointId)&&uuid(p.riderId)&&integer(p.pointsAwarded)&&integer(p.bonusSecondsAwarded)&&typeof p.pointType==='string','Invalid point row')
  require(rows.has(p.stageId+':'+p.riderId),'Point row has no corresponding stage result')
  const key=p.stageId+':'+p.pointId+':'+p.riderId;require(!seen.has(key),'Duplicate point result');seen.add(key)
  const type=p.pointType.trim().toUpperCase()
  const v=points.get(p.riderId)??{points:0,mountain:0,bonus:0}
  if(['FINISH','INTERMEDIATE_SPRINT','BONUS_SPRINT','SPRINT'].includes(type))v.points=sum([v.points,p.pointsAwarded])
  if(['KOM','MOUNTAIN','MOUNTAIN_SPRINT','CLIMB'].includes(type))v.mountain=sum([v.mountain,p.pointsAwarded])
  v.bonus=sum([v.bonus,p.bonusSecondsAwarded]);points.set(p.riderId,v)
  const bkey=p.stageId+':'+p.riderId;stageBonus.set(bkey,sum([stageBonus.get(bkey)??0,p.bonusSecondsAwarded]))
 }
 require(youngRiderIds.every(uuid)&&new Set(youngRiderIds).size===youngRiderIds.length,'Invalid young rider list')
 require(coverage.points==='complete'||pointRows.length===0,'Partial point coverage is ambiguous')
 require(coverage.penalties==='complete'||results.every(x=>x.penaltySeconds===0),'Missing penalties cannot contain speculative values')
 require(coverage.young==='complete'||youngRiderIds.length===0,'Partial youth coverage is ambiguous')
 const general=[]
 for(const [riderId,rs] of byRider){
  const finished=rs.filter(x=>x.status==='finished')
  if(finished.length!==ordered.length)continue
  const last=[...finished].sort((a,b)=>scope.get(b.stageId)-scope.get(a.stageId))[0]
  const pts=points.get(riderId)??{points:0,mountain:0,bonus:0}
  general.push({riderId,teamId:last.teamId,displayName:last.riderName,teamName:last.teamName,totalTimeSeconds:Math.max(0,sum(finished.map(x=>sum([x.elapsedSeconds,x.penaltySeconds])))-pts.bonus),rankSum:sum(finished.map(x=>x.rank)),points:pts.points,mountain:pts.mountain})
 }
 general.sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||a.rankSum-b.rankSum||cmp(a.riderId,b.riderId))
 const rankedTime=xs=>xs.map((x,i)=>({...x,rank:i+1,gapSeconds:x.totalTimeSeconds-xs[0].totalTimeSeconds}))
 const rankedPoints=(key)=>general.filter(x=>x[key]>0).sort((a,b)=>b[key]-a[key]||cmp(a.riderId,b.riderId)).map((x,i)=>({riderId:x.riderId,teamId:x.teamId,displayName:x.displayName,teamName:x.teamName,rank:i+1,points:x[key]}))
 const teams=new Map()
 for(const stage of ordered){
  const candidates=new Map()
  for(const x of byStage.get(stage.stageId).filter(x=>x.status==='finished')){
   const time=Math.max(0,sum([x.elapsedSeconds,x.penaltySeconds])-(stageBonus.get(x.stageId+':'+x.riderId)??0))
   if(!candidates.has(x.teamId))candidates.set(x.teamId,[])
   candidates.get(x.teamId).push({...x,adjusted:time})
  }
  for(const [teamId,rs] of candidates){
   if(rs.length<3)continue
   rs.sort((a,b)=>a.adjusted-b.adjusted||a.rank-b.rank||cmp(a.riderId,b.riderId))
   const t=teams.get(teamId)??{teamId,teamName:rs[0].teamName,totalTimeSeconds:0,count:0}
   t.teamName=rs[0].teamName;t.totalTimeSeconds=sum([t.totalTimeSeconds,sum(rs.slice(0,3).map(x=>x.adjusted))]);t.count++;teams.set(teamId,t)
  }
 }
 const team=rankedTime([...teams.values()].filter(x=>x.count===ordered.length).sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||cmp(a.teamId,b.teamId)))
 const blockers=['official_finalization_and_reward_writers_not_verified']
 for(const key of ['points','penalties','young'])if(coverage[key]!=='complete')blockers.push(key+'_source_missing')
 return {raceId,throughStageNumber:ordered.length,official:false,writeAllowed:false,accountingAllowed:false,coverage:{...coverage},blockers,
  general:rankedTime(general),points:coverage.points==='complete'?rankedPoints('points'):null,mountain:coverage.points==='complete'?rankedPoints('mountain'):null,
  young:coverage.young==='complete'?rankedTime(general.filter(x=>youngRiderIds.includes(x.riderId))):null,team}
}
