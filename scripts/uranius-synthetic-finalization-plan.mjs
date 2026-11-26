/** Synthetic-only V1 classification and award projection; 034 metadata contract. No production policy, official publication, database or financial calls. Percentages use thousandths of one percent. Cancellation and individual-only races outside scope. */
export function planSyntheticFinalization(p){
 const req=(ok,m)=>{if(!ok)throw Error(m)}
 const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
 const int=x=>Number.isSafeInteger(x)&&x>=0
 const cmp=(a,b)=>a<b?-1:a>b?1:0
 const unique=(xs,k)=>new Set(xs.map(k)).size===xs.length
 const sum=xs=>{const n=xs.reduce((a,b)=>a+b,0);req(int(n),'integer overflow');return n}
 const rankTime=xs=>xs.map((x,i)=>({...x,rank:i+1,gapSeconds:x.totalTimeSeconds-xs[0].totalTimeSeconds}))
 req(p?.provenance==='synthetic_review_fixture','Only synthetic review input')
 const {raceId,stageId,runId,format,scheduledStages,results,clubs,youngRiderIds,prizeFundCash,buckets,rankingRules,worldChampionship}=p
 req([raceId,stageId,runId].every(uuid)&&['stage_race','one_day'].includes(format)&&typeof worldChampionship==='boolean','Invalid race identity')
 req(Array.isArray(scheduledStages)&&scheduledStages.length>0&&unique(scheduledStages,x=>x.stageId),'Invalid stages')
 const stages=[...scheduledStages].sort((a,b)=>a.stageNumber-b.stageNumber)
 req(stages.every((s,i)=>uuid(s.stageId)&&s.stageNumber===i+1&&s.weatherCancelled===false),'Unknown/cancelled stage refused pending authority reconciliation')
 req(format!=='one_day'||stages.length===1,'One-day stage count')
 const current=stages.find(s=>s.stageId===stageId);req(current,'Stage not in race')
 const prefix=stages.slice(0,current.stageNumber),scope=new Set(prefix.map(s=>s.stageId)),final=current.stageNumber===stages.length
 req(p.coverage?.synchronizedResults===true&&p.coverage?.youth===true&&p.coverage?.policy===true,'Complete explicit fixture coverage required')
 req(p.lifecycle?.state==='replay_live'&&p.lifecycle?.hiddenOutputValidated===true&&p.lifecycle?.priorStagesAuthoritative===true&&p.lifecycle?.dailyRecoveryVerified===true,'Lifecycle not ready')
 const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/Z$/.test(x)?Date.parse(x):NaN
 req(date(p.lifecycle.gameNow)>=date(p.lifecycle.stageStartGameAt)+1800000&&date(p.lifecycle.realNow)>=date(p.lifecycle.replayClosesAtReal),'Replay or reveal window not closed')
 req(Array.isArray(clubs)&&unique(clubs,x=>x.clubId)&&clubs.every(c=>uuid(c.clubId)&&['main','developing'].includes(c.type)),'Invalid club registry')
 const byClub=new Map(clubs.map(c=>[c.clubId,c]))
 for(const c of clubs)req(c.type==='developing'?byClub.get(c.parentClubId)?.type==='main':c.parentClubId===null,'Invalid parent club')
 req(Array.isArray(youngRiderIds)&&unique(youngRiderIds,x=>x)&&youngRiderIds.every(uuid),'Invalid youth eligibility')
 req(Array.isArray(results)&&unique(results,x=>x.stageId+':'+x.riderId),'Duplicate result')
 const byStage=new Map(prefix.map(s=>[s.stageId,[]])),byRider=new Map()
 for(const x of results){
  req(scope.has(x.stageId)&&uuid(x.riderId)&&byClub.has(x.teamId)&&['finished','dnf','dns','otl'].includes(x.status),'Invalid result identity/status')
  req([x.bonusSeconds,x.penaltySeconds,x.finishPoints,x.sprintPoints,x.mountainPoints].every(int),'Synchronized result fields required')
  if(x.status==='finished')req(int(x.rank)&&x.rank>0&&int(x.elapsedSeconds)&&x.elapsedSeconds>0,'Invalid finisher')
  else req(x.rank===null&&x.elapsedSeconds===null,'Withdrawal rank/time refused')
  req(x.status==='dns'?x.fatigueAfterStage===null:typeof x.fatigueAfterStage==='number'&&Number.isFinite(x.fatigueAfterStage),'Authoritative fatigue required')
  byStage.get(x.stageId).push(x)
  if(!byRider.has(x.riderId))byRider.set(x.riderId,[])
  byRider.get(x.riderId).push(x)
 }
 for(const s of prefix){const ranks=byStage.get(s.stageId).filter(x=>x.status==='finished').map(x=>x.rank).sort((a,b)=>a-b);req(ranks.length&&ranks.every((x,i)=>x===i+1),'Noncontiguous or missing finishers')}
 const adj=x=>Math.max(0,sum([x.elapsedSeconds,x.penaltySeconds])-x.bonusSeconds)
 const general=[]
 for(const [riderId,rs] of byRider){const f=rs.filter(x=>x.status==='finished');if(f.length!==prefix.length)continue
  req(new Set(f.map(x=>x.teamId)).size===1,'Team change unsupported')
  general.push({riderId,teamId:f[0].teamId,totalTimeSeconds:sum(f.map(adj)),rankSum:sum(f.map(x=>x.rank)),points:sum(f.map(x=>sum([x.finishPoints,x.sprintPoints]))),mountain:sum(f.map(x=>x.mountainPoints))})
 }
 general.sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||a.rankSum-b.rankSum||cmp(a.riderId,b.riderId))
 const teams=[]
 for(const c of clubs){const stagesTimes=prefix.map(s=>byStage.get(s.stageId).filter(x=>x.status==='finished'&&x.teamId===c.clubId).sort((a,b)=>adj(a)-adj(b)||a.rank-b.rank||cmp(a.riderId,b.riderId)).slice(0,3));if(stagesTimes.every(x=>x.length===3))teams.push({riderId:null,teamId:c.clubId,totalTimeSeconds:sum(stagesTimes.flatMap(x=>x.map(adj)))})}
 teams.sort((a,b)=>a.totalTimeSeconds-b.totalTimeSeconds||cmp(a.teamId,b.teamId))
 const pointRank=k=>general.filter(x=>x[k]>0).sort((a,b)=>b[k]-a[k]||cmp(a.riderId,b.riderId)).map((x,i)=>({...x,points:x[k],rank:i+1}))
 const classifications={general:rankTime(general),points:pointRank('points'),mountain:pointRank('mountain'),young:rankTime(general.filter(x=>youngRiderIds.includes(x.riderId))),team:rankTime(teams)}
 req(int(prizeFundCash)&&Array.isArray(buckets)&&Array.isArray(rankingRules),'Explicit fixture policy required')
 const bucketKeys=format==='stage_race'?['stage_finish','final_gc','final_points','final_mountain','final_young','final_team']:['oneday_finish','oneday_team']
 const sources=format==='stage_race'?['stage_finish','leader_day','final_gc']:['oneday_finish']
 req(unique(buckets,x=>x.key)&&buckets.every(b=>bucketKeys.includes(b.key)&&int(b.shareMilliPercent)&&b.shareMilliPercent<=100000&&Array.isArray(b.rankMilliPercent)&&b.rankMilliPercent.length>0&&b.rankMilliPercent.every(x=>int(x)&&x<=100000)&&sum(b.rankMilliPercent)<=100000)&&sum(buckets.map(b=>b.shareMilliPercent))<=100000,'Invalid bucket schedule')
 req(unique(rankingRules,x=>x.source+':'+x.rank)&&rankingRules.every(x=>sources.includes(x.source)&&int(x.rank)&&x.rank>0&&int(x.points)&&x.points<=2147483647),'Invalid ranking scale')
 const cash=[],ranking=[]
 function award(key,sourceStage,row,divisor){
  const b=buckets.find(x=>x.key===key);if(!b||row.rank>b.rankMilliPercent.length)return
  const den=100000n*100000n*BigInt(divisor),num=BigInt(prizeFundCash)*BigInt(b.shareMilliPercent)*BigInt(b.rankMilliPercent[row.rank-1])
  const grossCash=Number((num+den/2n)/den);req(int(grossCash),'Cash overflow')
  const riderId=row.riderId??null,club=byClub.get(row.teamId)
  cash.push({raceId,stageId:sourceStage,bucket:key,rank:row.rank,riderId,teamId:row.teamId,paymentClubId:club.type==='developing'?club.parentClubId:club.clubId,grossCash,sourceKey:[raceId,sourceStage,key,row.rank,row.teamId,riderId??'team'].join(':')})
 }
 function rankAward(source,row){const rule=rankingRules.find(x=>x.source===source&&x.rank===row.rank);if(!rule)return
  ranking.push({raceId,stageId,source,rank:row.rank,riderId:row.riderId,teamId:row.teamId,riderPoints:rule.points,teamPoints:rule.points,sourceKey:[raceId,stageId,source,row.rank,row.teamId,row.riderId].join(':')})}
 if(!worldChampionship){
  const finish=byStage.get(stageId).filter(x=>x.status==='finished')
  if(format==='stage_race'){
   for(const s of final?prefix:[current])for(const x of byStage.get(s.stageId).filter(x=>x.status==='finished'))award('stage_finish',s.stageId,x,stages.length)
   for(const x of finish)rankAward('stage_finish',x)
   if(classifications.general.length)rankAward('leader_day',classifications.general[0])
   if(final){for(const [k,rows] of Object.entries(classifications))for(const x of rows)award(k==='general'?'final_gc':'final_'+k,stageId,x,1);for(const x of classifications.general)rankAward('final_gc',x)}
  }else{for(const x of finish){award('oneday_finish',stageId,x,1);rankAward('oneday_finish',x)}for(const x of classifications.team)award('oneday_team',stageId,x,1)}
 }
 req(unique(cash,x=>x.sourceKey)&&unique(ranking,x=>x.sourceKey),'Duplicate award source')
 cash.sort((a,b)=>cmp(a.sourceKey,b.sourceKey));ranking.sort((a,b)=>cmp(a.sourceKey,b.sourceKey))
 const fatigue=byStage.get(stageId).filter(x=>x.status!=='dns').map(x=>({riderId:x.riderId,fatigue:Math.max(0,Math.min(100,Math.round(x.fatigueAfterStage)))})).sort((a,b)=>cmp(a.riderId,b.riderId))
 return {version:'035_synthetic_finalization_v1',raceId,stageId,runId,final,worldChampionship,classifications,cash,ranking,fatigue,official:false,hostedWriteAllowed:false}
}
