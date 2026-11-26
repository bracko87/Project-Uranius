// 043E: source-aligned point/profile reconciliation for explicit local review data.
// Original buildProductionRaceInput.ts pinned blob f520ab08d05dc406918d34295d02ca6ef1f53cb2.
// No default score invention, point creation, official authority, or database access.
import {carryoverDigest} from './uranius-multistage-carryover-review.mjs'
const req=(x,m)=>{if(!x)throw Error('043E markers: '+m)}
const P='synthetic_review_fixture'
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x)
const int=x=>Number.isSafeInteger(x)&&x>=0&&x<=2147483647
const cmp=(a,b)=>a<b?-1:a>b?1:0
const sort=(a,b)=>a.km-b.km||a.sortOrder-b.sortOrder||cmp(a.pointId,b.pointId)
const str=x=>typeof x==='string'&&x.trim()?x.trim():null
const timingTypes=['time_check','time_split','timing_gate','timing_check','time_checkpoint']
const timingLabel=/^(?:(?:intermediate|mid[ -]?course)\s+)?(?:time[ -]?(?:check|split|checkpoint)|timing[ -]?(?:gate|check|split|point))$/i
const isTiming=x=>timingTypes.includes(String(x.type??x.point_type??'').trim().toLowerCase())||timingTypes.includes(String(x.points??'').trim().toLowerCase())||[x.label,x.title,x.name].some(s=>typeof s==='string'&&timingLabel.test(s.trim()))
const family=t=>['INTERMEDIATE_SPRINT','BONUS_SPRINT'].includes(t)?'sprint':t==='KOM'?'kom':null
function type(x){
 const raw=String(x??'').trim().toUpperCase()
 if(['START','INTERMEDIATE_SPRINT','BONUS_SPRINT','KOM','FINISH','TIME_CHECK','TIME_SPLIT','TIMING_GATE','TIMING_CHECK','TIME_CHECKPOINT'].includes(raw))return raw
 if(['SPRINT','INTERMEDIATE','INTERMEDIATE SPRINT'].includes(raw))return 'INTERMEDIATE_SPRINT'
 if(['BONUS','BONUS SPRINT'].includes(raw))return 'BONUS_SPRINT'
 if(['CLIMB','MOUNTAIN_CLIMB','MOUNTAIN CLIMB'].includes(raw))return 'KOM'
 return null
}
function category(x){const v=String(x??'').trim().toUpperCase().replace(/^CAT(?:EGORY)?\s*/i,'');req(['HC','1','2','3','4'].includes(v),'explicit valid KOM category required');return v}
function number(x){req((typeof x==='number'||typeof x==='string'&&x.trim()!=='')&&Number.isFinite(Number(x)),'invalid marker distance');return Number(x)}
function interior(x,d){const n=number(x);req(n>0&&n<d,'competition marker outside stage interior');return n}
export function reconcileCanonicalMarkerReview(p){
 req(p?.provenance===P&&p.completeCanonicalEvidence===true&&uuid(p.stageId)&&typeof p.distanceKm==='number'&&Number.isFinite(p.distanceKm)&&p.distanceKm>0,'complete explicit stage evidence required')
 const {stageId,distanceKm:d,profile,canonicalRows}=p
 req(['road_race','individual_time_trial','team_time_trial','prologue'].includes(p.stageFormat),'unsupported stage format')
 req(profile&&['intermediate_sprints','mountain_climbs','route_markers'].every(k=>Array.isArray(profile[k]))&&Array.isArray(canonicalRows)&&canonicalRows.length>0,'explicit profile and canonical arrays required')
 const ids=new Set()
 const points=canonicalRows.map(row=>{
  const t=type(row.point_type);req(t&&uuid(row.id)&&row.stage_id===stageId&&!ids.has(row.id),'invalid or duplicate canonical point identity');ids.add(row.id)
  req(Array.isArray(row.points_scheme)&&Array.isArray(row.time_bonus_seconds)&&[...row.points_scheme,...row.time_bonus_seconds].every(int)&&int(row.sort_order)&&typeof row.is_finish_point==='boolean','explicit canonical schemes and flags required')
  const km=number(row.km_from_start),nonScore=t==='START'||timingTypes.includes(t.toLowerCase())
  req(row.is_finish_point===(t==='FINISH'),'finish flag mismatch')
  if(t==='START')req(km===0,'invalid start')
  else if(t==='FINISH')req(km===d,'invalid finish')
  else interior(km,d)
  if(nonScore)req(row.points_scheme.length===0&&row.time_bonus_seconds.length===0,'non-scoring checkpoint has awards')
  if(family(t))req(!isTiming(row),'canonical competition is a timing checkpoint')
  if(p.stageFormat!=='road_race')req(row.time_bonus_seconds.length===0&&!family(t),'time trial competition/bonus outside review scope')
  return {pointId:row.id,type:t,km,name:str(row.name),komCategory:t==='KOM'?category(row.kom_category):null,pointsScheme:[...row.points_scheme],timeBonusSeconds:[...row.time_bonus_seconds],sortOrder:row.sort_order,source:'canonical_scoring_row',canonicalKm:km}
 }).sort(sort)
 req(points.filter(x=>x.type==='FINISH').length===1&&points.filter(x=>x.type==='START').length<=1,'invalid start/finish coverage')
 const markers=[],excluded=[]
 const add=(row,index,f,source)=>{
  req(row&&typeof row==='object'&&!Array.isArray(row),'malformed profile marker')
  if(isTiming(row)){excluded.push({source,index,reason:'non_scoring_timing_checkpoint'});return}
  const km=interior(row.km??row.kilometer??row.km_from_start??row.distance_km,d)
  markers.push({family:f,km,name:str(row.name??row.label??row.title),komCategory:f==='kom'?category(row.category??row.kom_category):null,source,index})
 }
 const explicit=profile.intermediate_sprints.length>0||profile.mountain_climbs.length>0
 if(explicit){
  profile.intermediate_sprints.forEach((row,i)=>add(row,i,'sprint','profile_intermediate_sprints'))
  profile.mountain_climbs.forEach((row,i)=>add(row,i,'kom','profile_mountain_climbs'))
 }else profile.route_markers.forEach((row,i)=>{
  req(row&&typeof row==='object'&&!Array.isArray(row),'malformed route marker')
  const raw=String(row.type??row.point_type??'').trim().toLowerCase()
  if(isTiming(row)){excluded.push({source:'profile_route_markers',index:i,reason:'non_scoring_timing_checkpoint'});return}
  const f=/kom|climb|mountain/.test(raw)?'kom':raw.includes('sprint')?'sprint':null
  if(f)add(row,i,f,'profile_route_markers')
 })
 markers.sort((a,b)=>a.km-b.km||a.index-b.index)
 const reconcile=explicit||markers.length>0
 if(reconcile){
  for(const f of ['sprint','kom']){
   const rows=points.filter(x=>family(x.type)===f),physical=markers.filter(x=>x.family===f)
   req(rows.length===physical.length,'canonical/profile '+f+' count mismatch')
   for(let i=0;i<rows.length;i++){const x=rows[i],m=physical[i];x.km=m.km;x.name=m.name??x.name;x.komCategory=m.komCategory??x.komCategory;x.source=m.source}
  }
 }else if(excluded.length>0)req(!points.some(x=>family(x.type)),'timing-only profile cannot establish competition geometry')
 const ordered=points.sort(sort).map((x,i)=>({...x,sortOrder:i}))
 const scoringPoints=ordered.map(({pointId,type,km,pointsScheme,timeBonusSeconds})=>({pointId,type,km,pointsScheme,timeBonusSeconds}))
 const traceMarkers=scoringPoints.filter(x=>family(x.type)).map(({pointId,type,km})=>({pointId,type,km}))
 const receipt={version:'043E_canonical_marker_review_v1',provenance:P,stageId,distanceKm:d,stageFormat:p.stageFormat,sourceMode:reconcile?(explicit?'explicit_profile':'route_marker_fallback'):'canonical_only',points:ordered,scoringPoints,traceMarkers,excludedTimingMarkers:excluded,official:false,hostedWriteAllowed:false,accountingAllowed:false,authoritativeSourceVerified:false}
 return {receipt,sha256:carryoverDigest(receipt)}
}
