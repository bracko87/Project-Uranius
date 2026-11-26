// 040 isolated fatigue review. No DB, engine mutation or official authority.
const req=(x,m)=>{if(!x)throw Error('040: '+m)}
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const bounded=x=>finite(x)&&x>=0&&x<=100
const integer=x=>Number.isSafeInteger(x)
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x))
const round6=x=>Math.round((x+Number.EPSILON)*1e6)/1e6
const pgRound=x=>Math.sign(x)*Math.round(Math.abs(x))
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(x)
const day=x=>{req(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x,'invalid date');return Date.parse(x)/86400000}
const instant=x=>{req(typeof x==='string'&&/Z$/.test(x)&&Number.isFinite(Date.parse(x)),'invalid receipt timestamp');return Date.parse(x)}
export function reviewRecoveryPoints(p){
 req(bounded(p.recovery)&&bounded(p.morale)&&integer(p.activityBonus)&&integer(p.doctorBonus)&&p.activityBonus>=0&&p.doctorBonus>=0&&['main','developing'].includes(p.clubType)&&typeof p.residentialCampusActive==='boolean','complete recovery inputs required')
 const base=Math.max(3,pgRound(4+p.recovery*.07+(p.morale>=80?1:p.morale<40?-1:0)))
 const total=base+p.activityBonus+p.doctorBonus
 req(Number.isSafeInteger(total),'recovery overflow')
 return p.clubType==='developing'&&p.residentialCampusActive?pgRound(total*1.05):total
}
// Different clamp order is intentional: ordinary daily processing clamps before travel;
// delayed-stage reconstruction clamps previous end minus recovery plus travel together.
export function reviewOfficialRaceNight(p){
 req(p.provenance==='synthetic_review_fixture'&&p.previousStageFatigueApplied===true&&p.dailyRecoveryReceiptVerified===true,'synthetic prior fatigue and daily receipt required')
 req(bounded(p.fatigueAfterStage)&&integer(p.travelDelta)&&p.travelDelta>=0&&integer(p.activityLoad)&&p.activityLoad>=0&&integer(p.consecutiveHeavyDays)&&p.consecutiveHeavyDays>=0,'invalid night inputs')
 const recovery=reviewRecoveryPoints(p)
 const heavyDays=p.activityLoad>=13?p.consecutiveHeavyDays+1:0
 const fatigue=clamp(clamp(pgRound(p.fatigueAfterStage-recovery))+p.travelDelta)
 return {recovery,fatigue,heavyDays,activityLoad:p.activityLoad,directRaceLoadApplied:0,heavyFatigueBonusApplied:0,official:false,writeAllowed:false}
}
export function reviewDelayedStageSeed(p){
 req(p.provenance==='synthetic_review_fixture'&&uuid(p.raceId)&&uuid(p.stageId)&&uuid(p.previousStageId)&&p.stageId!==p.previousStageId&&p.previousAuthorityVerified===true&&p.dailyCoverageVerified===true,'synthetic stage authority required')
 const gap=day(p.stageDate)-day(p.previousStageDate)
 req(gap>=0,'reversed stages')
 req(Array.isArray(p.riders)&&p.riders.length>0&&new Set(p.riders.map(r=>r.riderId)).size===p.riders.length,'invalid roster')
 for(const r of p.riders)req(uuid(r.riderId)&&bounded(r.currentFatigue)&&finite(r.currentStamina)&&r.currentStamina>=1&&r.currentStamina<=100&&bounded(r.previousStageFatigue)&&['finished','dnf','otl'].includes(r.previousStatus),'missing prior rider fatigue')
 const unchanged=reason=>({reason,rows:p.riders.map(r=>({riderId:r.riderId,fatigue:r.currentFatigue,startStamina:r.currentStamina})),official:false,writeAllowed:false})
 if(gap===0)return unchanged('same_day_no_overnight')
 req(p.dailyReceiptDate===p.stageDate&&typeof p.laterDailyReceipt==='boolean','night receipt coverage missing')
 const receipt=instant(p.dailyReceiptAt),published=instant(p.previousPublishedAt),completed=instant(p.previousCompletedAt)
 if(Math.max(published,completed)<=receipt&&!p.laterDailyReceipt)return unchanged('correct_night_already_applied')
 req(gap===1,'multi-day delayed reconstruction refused')
 const rows=p.riders.map(r=>{
  req(integer(r.travelDelta)&&r.travelDelta>=0,'explicit travel delta required')
  const recovery=reviewRecoveryPoints(r)
  const fatigue=clamp(pgRound(r.previousStageFatigue)-recovery+r.travelDelta)
  return {riderId:r.riderId,recovery,fatigue,startStamina:clamp(r.currentStamina+(r.currentFatigue-fatigue)*.45,1,100)}
 })
 return {reason:'previous_stage_post_tick_recovery_v1',rows,official:false,writeAllowed:false}
}
export function reviewBreakawayDebt(distanceKm,segments){
 req(finite(distanceKm)&&distanceKm>0&&Array.isArray(segments),'invalid stage distance/exposure')
 const sorted=segments.map(s=>{req(finite(s.fromKm)&&finite(s.toKm)&&s.fromKm>=0&&s.toKm>s.fromKm&&s.toKm<=distanceKm&&s.physicalEscapeVerified===true,'unverified physical exposure');return [s.fromKm,s.toKm]}).sort((a,b)=>a[0]-b[0]||a[1]-b[1])
 let km=0,start=null,end=null
 for(const [a,b] of sorted){if(start===null){start=a;end=b}else if(a<=end){end=Math.max(end,b)}else{km+=end-start;start=a;end=b}}
 if(start!==null)km+=end-start
 km=round6(Math.min(distanceKm,km))
 return {km,debt:round6(clamp(km-20,0,30)*.15+clamp(km-50,0,50)*.28+Math.max(0,km-100)*.45)}
}
export function reviewPostStageAdjustment(p){
 req(p.provenance==='synthetic_review_fixture'&&p.baseFatigueEvidence==='explicit_synthetic_baseline'&&uuid(p.riderId)&&['finished','dnf','otl','dns'].includes(p.status),'explicit synthetic base and rider state required')
 req(bounded(p.fatigueBefore)&&finite(p.grossFatigueGain)&&p.grossFatigueGain>=0&&finite(p.existingBreakawayDebt)&&p.existingBreakawayDebt>=0&&p.existingBreakawayDebt<=p.grossFatigueGain&&finite(p.multiplier)&&p.multiplier>0&&finite(p.recoveryBonus)&&p.recoveryBonus>=0&&finite(p.intrinsicDailyRecovery)&&p.intrinsicDailyRecovery>0,'missing base calculation inputs')
 const exposure=reviewBreakawayDebt(p.distanceKm,p.segments)
 if(p.status==='dns'){req(exposure.km===0&&p.grossFatigueGain===0,'DNS cannot have race load');return {riderId:p.riderId,fatigueAfterStage:null,writeEligible:false,official:false,writeAllowed:false}}
 const gross=p.grossFatigueGain-p.existingBreakawayDebt+exposure.debt
 const adjusted=round6(Math.max(0,gross*p.multiplier-p.recoveryBonus))
 const after=round6(clamp(p.fatigueBefore+adjusted))
 const applied=round6(Math.max(0,after-p.fatigueBefore))
 return {riderId:p.riderId,exposureKm:exposure.km,breakawayDebt:exposure.debt,grossFatigueGain:round6(gross),adjustedFatigueGain:adjusted,fatigueAfterStage:after,appliedFatigueGain:applied,estimatedDaysToPreStageFatigue:Math.ceil(applied/p.intrinsicDailyRecovery),estimatedDaysToFullRecovery:Math.ceil(after/p.intrinsicDailyRecovery),writeEligible:true,official:false,writeAllowed:false,baseFatigueVerified:false}
}
