// 043B: archived original formulas, explicit synthetic inputs only.
const req=(ok,m)=>{if(!ok)throw Error('043B: '+m)}
const provenance='synthetic_review_fixture'
const int=x=>Number.isSafeInteger(x)&&x>=0
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const bounded=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100
const unique=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
const result=x=>({...x,official:false,writeAllowed:false,accountingAllowed:false})
const round2=x=>Math.round((x+1e-10)*100)/100
const day=x=>{req(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x,'invalid game date');return Date.parse(x)/86400000}
const plusDays=(x,n)=>new Date((day(x)+n)*86400000).toISOString().slice(0,10)
const maxDate=(a,b)=>day(a)>=day(b)?a:b
const keys=['bidons_water_bottles','energy_gels','nutrition_packs','race_jersey_complete','rain_jackets']
const durable={race_jersey_complete:10,rain_jackets:25}
function registry(clubs){
 req(unique(clubs,c=>c.clubId)&&clubs.every(c=>uuid(c.clubId)&&['main','developing'].includes(c.type)),'invalid clubs')
 const map=new Map(clubs.map(c=>[c.clubId,c]))
 for(const c of clubs)req(c.type==='main'?c.parentClubId===null:map.get(c.parentClubId)?.type==='main','invalid club parent')
 return map
}
export function medicalSupportReview(p){
 req(p.provenance===provenance&&p.completeStaffEvidence===true,'explicit synthetic staff evidence required')
 const clubs=registry(p.clubs),club=clubs.get(p.clubId)
 req(club&&unique(p.staff,s=>s.staffId),'missing club or duplicate staff')
 const related=new Set([club.clubId])
 const main=club.parentClubId??club.clubId
 related.add(main)
 for(const c of clubs.values())if(c.parentClubId===main)related.add(c.clubId)
 let doctorRecovery=0,doctorRisk=0,physioRecovery=0,physioRisk=0,nutritionRecovery=0,nutritionRisk=0
 const counts={doctors:0,physios:0,nutritionists:0}
 for(const s of p.staff){
  req(uuid(s.staffId)&&clubs.has(s.clubId)&&typeof s.active==='boolean'&&typeof s.roleType==='string'&&typeof s.specialization==='string'&&[s.expertise,s.experience,s.efficiency].every(bounded),'invalid normalized staff snapshot')
  if(!related.has(s.clubId)||!s.active)continue
  const role=(s.roleType+' '+s.specialization).toLowerCase()
  const score=(s.expertise*.55+s.experience*.25+s.efficiency*.20)/100
  if(/doctor|medical/.test(role)){counts.doctors++;doctorRecovery=Math.max(doctorRecovery,round2(score*12));doctorRisk=Math.max(doctorRisk,round2(score*10))}
  else if(/physio|therapist/.test(role)){counts.physios++;physioRecovery=Math.min(9,round2(physioRecovery+round2(score*4.5)));physioRisk=Math.min(5,round2(physioRisk+round2(score*2.5)))}
  else if(/nutrition/.test(role)){counts.nutritionists++;nutritionRecovery=Math.min(5,round2(nutritionRecovery+round2(score*2.5)));nutritionRisk=Math.min(5,round2(nutritionRisk+round2(score*3.5)))}
 }
 const recovery= Math.min(25,round2(doctorRecovery+physioRecovery+nutritionRecovery)),risk=Math.min(20,round2(doctorRisk+physioRisk+nutritionRisk))
 return result({relatedClubIds:[...related].sort(),counts,recoveryDurationReductionPct:recovery,riskReductionPct:risk,dailyRecoveryBonus:recovery===0?0:Math.min(6,Math.max(1,Math.floor(recovery/4))),fatigueFloorReduction:risk===0?0:Math.min(8,Math.max(1,Math.floor(risk/3.5)))})
}
export function medicalCenterReview(level){
 req(int(level),'explicit normalized medical center level required')
 const l=Math.min(5,level)
 return result({level,recoveryReductionPct:l*4,riskReductionPct:l*3,riskMultiplier:round2(1-l*.03),fatigueFloorReduction:l})
}
export function injuryRecoveryReview(p){
 req(p.provenance===provenance&&p.catalogueEvidence==='explicit_synthetic_catalogue_row','catalogue row required; actual catalogue not recovered')
 const c=p.catalogueRow
 req(c&&c.caseCode===p.caseCode&&['injury','sickness'].includes(c.caseType)&&['minor','moderate','major'].includes(p.severity)&&Array.isArray(c.sourceContexts)&&c.sourceContexts.includes('race')&&typeof c.bodyPartRequired==='boolean','invalid race catalogue row')
 req(!c.bodyPartRequired||(typeof p.bodyPart==='string'&&p.bodyPart.trim().length>0),'body part required')
 req(['selectionBlocked','trainingBlocked','developmentBlocked'].every(k=>typeof c[k]==='boolean'),'explicit catalogue restrictions required')
 const range=c.ranges?.[p.severity]
 req(Array.isArray(range)&&range.length===2&&range.every(x=>int(x)&&x<=3650)&&range[0]<=range[1],'invalid recovery range')
 day(p.startedOn)
 const staff=medicalSupportReview(p.staffEvidence)
 req(p.staffEvidence.clubId===p.clubId,'staff club mismatch')
 const center=medicalCenterReview(p.medicalCenterLevel)
 const selectedBaseDays=Math.ceil((range[0]+range[1])/2)
 const totalReductionPct=Math.min(45,round2(staff.recoveryDurationReductionPct+center.recoveryReductionPct))
 // Integer hundredths of percent avoid floating-point rounding at exact day boundaries.
 const finalRecoveryDays=Math.max(1,Math.ceil(selectedBaseDays*(10000-Math.round(totalReductionPct*100))/10000))
 const recoveryUntil=plusDays(p.startedOn,finalRecoveryDays)
 return result({caseCode:c.caseCode,caseType:c.caseType,severity:p.severity,startedOn:p.startedOn,selectedBaseDays,totalReductionPct,finalRecoveryDays,recoveryUntil,staff,center,restrictions:{selectionBlocked:c.selectionBlocked,trainingBlocked:c.trainingBlocked,developmentBlocked:c.developmentBlocked},catalogueVerified:false})
}
export function injuryHandoverReview(p){
 req(p.provenance===provenance&&p.incidentEvidence==='explicit_synthetic_candidate','synthetic incident required')
 const next=injuryRecoveryReview(p.recoveryInput),prior=p.priorCase
 const severity={minor:1,moderate:2,major:3}
 let activeUntil=next.recoveryUntil,recoveryUntil=next.recoveryUntil,restrictions={...next.restrictions}
 if(prior!==null){
  req(prior&&uuid(prior.caseId)&&['active','recovering'].includes(prior.status)&&Object.hasOwn(severity,prior.severity)&&['selectionBlocked','trainingBlocked','developmentBlocked'].every(k=>typeof prior[k]==='boolean'),'invalid prior case')
  req(day(prior.activeUntil)<=day(prior.recoveryUntil),'invalid prior dates')
  if(severity[prior.severity]>severity[next.severity])return result({disposition:'merged_into_stronger_open_case',priorCaseId:prior.caseId,activeUntil:prior.activeUntil,recoveryUntil:prior.recoveryUntil,restrictions:Object.fromEntries(Object.keys(restrictions).map(k=>[k,prior[k]])),availabilityReview:'preserve_existing',recovery:next})
  activeUntil=maxDate(activeUntil,prior.activeUntil);recoveryUntil=maxDate(recoveryUntil,prior.recoveryUntil)
  for(const k of Object.keys(restrictions))restrictions[k]=restrictions[k]||prior[k]
 }
 const minor=next.severity==='minor',nonmajor=next.severity!=='major'
 if(nonmajor)restrictions.selectionBlocked=prior?.selectionBlocked??false
 if(minor){restrictions.trainingBlocked=false;restrictions.developmentBlocked=false}
 return result({disposition:prior?'supersede_open_case_review':'new_case_review',priorCaseId:prior?.caseId??null,activeUntil,recoveryUntil,restrictions,availabilityReview:nonmajor?'not_fully_fit':next.caseType==='sickness'?'sick':'injured',unavailableUntil:nonmajor?null:recoveryUntil,nextStageSelectionBlocked:nonmajor?false:true,recovery:next})
}
// Earlier-stage reservations are not actual consumption. Both teams can draw
// on the same parent resource owner; durable units cannot be reused same day.
export function stageSupplyReservationReview(p){
 req(p.provenance===provenance&&p.completeReservationEvidence===true,'explicit synthetic reservation snapshot required')
 const clubs=registry(p.clubs),owner=t=>{const c=clubs.get(t);req(c,'unknown sporting team');return c.parentClubId??c.clubId}
 const target=p.target,ownerId=owner(target.teamId)
 const time=s=>{req(uuid(s.stageId)&&int(s.hour)&&s.hour<=23&&int(s.minute)&&s.minute<=59,'invalid stage order');return day(s.date)*1440+s.hour*60+s.minute}
 const start=time(target)
 req(unique(p.plans,x=>x.stageId+':'+x.teamId)&&unique(p.stock,x=>x.supplyKey)&&unique(p.units,x=>x.unitId),'duplicate plan or stock')
 const reserved=new Map(keys.map(k=>[k,0]))
 for(const s of p.plans){
  const resourceOwner=owner(s.teamId),ts=time(s)
  req(typeof s.saved==='boolean'&&typeof s.weatherCancelled==='boolean'&&typeof s.authoritative==='boolean'&&typeof s.preparationStatus==='string'&&typeof s.raceStatus==='string'&&unique(s.requirements,x=>x.supplyKey)&&s.requirements.every(x=>keys.includes(x.supplyKey)&&int(x.quantity)),'invalid plan evidence')
  if(s.stageId===target.stageId||resourceOwner!==ownerId||!s.saved||s.weatherCancelled||s.authoritative||!['submitted','locked','sent_to_engine','final','finalized','completed','auto_defaulted'].includes(s.preparationStatus)||!['scheduled','active'].includes(s.raceStatus)||ts>=start)continue
  for(const x of s.requirements){if(Object.hasOwn(durable,x.supplyKey)&&s.date!==target.date)continue;const total=reserved.get(x.supplyKey)+x.quantity;req(int(total),'reservation overflow');reserved.set(x.supplyKey,total)}
 }
 for(const x of p.stock)req(x.ownerId===ownerId&&keys.includes(x.supplyKey)&&!Object.hasOwn(durable,x.supplyKey)&&int(x.quantity),'invalid owner stock')
 for(const u of p.units){req(uuid(u.unitId)&&u.ownerId===ownerId&&Object.hasOwn(durable,u.supplyKey)&&int(u.usesRemaining)&&u.usesRemaining<=durable[u.supplyKey]&&['ready','assigned','worn_out','discarded'].includes(u.status),'invalid durable unit');if(u.lastUsedDate!==null)day(u.lastUsedDate)}
 return result({stageId:target.stageId,teamId:target.teamId,ownerId,rows:keys.map(supplyKey=>{
  const physicalQuantity=Object.hasOwn(durable,supplyKey)?p.units.filter(u=>u.supplyKey===supplyKey&&['ready','assigned'].includes(u.status)&&u.usesRemaining>0&&u.lastUsedDate!==target.date).length:p.stock.find(s=>s.supplyKey===supplyKey)?.quantity??0
  const reservedElsewhere=reserved.get(supplyKey)
  return {supplyKey,physicalQuantity,reservedElsewhere,fixtureAvailable:Math.max(0,physicalQuantity-reservedElsewhere)}
 }),availabilityPolicy:'synthetic_subtraction_original_effective_availability_writer_not_recovered'})
}
