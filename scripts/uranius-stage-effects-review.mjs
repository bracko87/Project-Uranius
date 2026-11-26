// 041 pure, synthetic review; no game writes or official authority.
import {createHash} from 'node:crypto'
const req=(x,m)=>{if(!x)throw Error('041: '+m)}
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(x)
const n=x=>Number.isSafeInteger(x)&&x>=0
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0
const bounded=x=>num(x)&&x<=100
const round=x=>Math.round((x+Number.EPSILON)*1e6)/1e6
const keys=['bidons_water_bottles','energy_gels','nutrition_packs','race_jersey_complete','rain_jackets']
export const durableMaxUses=Object.freeze({race_jersey_complete:10,rain_jackets:25})
const unique=(xs,key)=>Array.isArray(xs)&&new Set(xs.map(key)).size===xs.length
const review=x=>({...x,official:false,writeAllowed:false,accountingAllowed:false})
export function reviewPlannedSupplies({explicitRows,riderRows}){
 req(Array.isArray(explicitRows)&&unique(riderRows,r=>r.riderId),'missing plan or duplicate rider')
 const explicit=new Map(),direct=new Map()
 const add=(m,k,q)=>{req(keys.includes(k)&&n(q),'invalid supply quantity');const total=(m.get(k)??0)+q;req(n(total),'quantity overflow');m.set(k,total)}
 for(const row of explicitRows)add(explicit,row.supplyKey,row.quantity)
 for(const row of riderRows){
  req(uuid(row.riderId)&&row.quantities&&Object.keys(row.quantities).every(k=>keys.includes(k)),'invalid rider supply plan')
  for(const [k,q] of Object.entries(row.quantities)){
   req(n(q)&&(!Object.hasOwn(durableMaxUses,k)||q<=1),'invalid normalized rider supply quantity')
   if(q>0)add(direct,k,q)
  }
 }
 return review({requirements:keys.filter(k=>explicit.has(k)||direct.has(k)).map(k=>({supplyKey:k,quantity:explicit.has(k)?explicit.get(k):direct.get(k),source:explicit.has(k)?'explicit_plan':'rider_plan'}))})
}
// Fixture consumption requires explicit actual-usage evidence; planned amount is not usage.
export function reviewSupplyUsage({provenance,stageId,teamId,completeUsageEvidence,requirements,stock,units,usage}){
 req(provenance==='synthetic_review_fixture'&&uuid(stageId)&&uuid(teamId)&&completeUsageEvidence===true,'complete synthetic usage receipt required')
 req(unique(requirements,x=>x.supplyKey)&&unique(stock,x=>x.supplyKey)&&unique(units,x=>x.unitId)&&unique(usage,x=>x.eventId),'duplicate supply row or event')
 const planned=new Map(requirements.map(x=>{req(keys.includes(x.supplyKey)&&n(x.quantity),'invalid requirement');return [x.supplyKey,x.quantity]}))
 const inventory=new Map(stock.map(x=>{req(x.teamId===teamId&&keys.includes(x.supplyKey)&&!Object.hasOwn(durableMaxUses,x.supplyKey)&&n(x.quantity),'invalid consumable stock');return [x.supplyKey,x.quantity]}))
 const durable=new Map(units.map(x=>{req(uuid(x.unitId)&&x.teamId===teamId&&Object.hasOwn(durableMaxUses,x.supplyKey)&&n(x.usesRemaining)&&x.usesRemaining<=durableMaxUses[x.supplyKey]&&['ready','assigned','worn_out','discarded'].includes(x.status),'invalid durable unit');return [x.unitId,{...x}]}))
 const totals=new Map(),usedUnits=new Set(),postings=[]
 for(const e of [...usage].sort((a,b)=>a.eventId<b.eventId?-1:a.eventId>b.eventId?1:0)){
  req(uuid(e.eventId)&&e.stageId===stageId&&e.teamId===teamId&&keys.includes(e.supplyKey)&&n(e.quantity)&&e.quantity>0,'invalid usage event')
  const k=e.supplyKey,total=(totals.get(k)??0)+e.quantity
  req(n(total)&&total<=(planned.get(k)??0),'usage exceeds plan')
  totals.set(k,total)
  if(Object.hasOwn(durableMaxUses,k)){
   const u=durable.get(e.unitId)
   req(e.quantity===1&&u&&u.supplyKey===k&&['ready','assigned'].includes(u.status)&&u.usesRemaining>0&&!usedUnits.has(e.unitId),'unavailable or repeated durable unit')
   usedUnits.add(e.unitId);const before=u.usesRemaining;u.usesRemaining--
   if(u.usesRemaining===0)u.status='worn_out'
   postings.push({eventId:e.eventId,supplyKey:k,unitId:e.unitId,before,after:u.usesRemaining,status:u.status})
  }else{
   req(e.unitId==null&&inventory.has(k)&&inventory.get(k)>=e.quantity,'insufficient consumable stock')
   const before=inventory.get(k);inventory.set(k,before-e.quantity)
   postings.push({eventId:e.eventId,supplyKey:k,before,after:before-e.quantity})
  }
 }
 return review({stageId,teamId,postings,consumableStock:[...inventory].map(([supplyKey,quantity])=>({teamId,supplyKey,quantity})),units:[...durable.values()],consumptionPolicy:'synthetic_explicit_usage_not_verified_original_writer'})
}
export function assetConditionFactor(condition){
 req(bounded(condition),'invalid condition')
 return condition>=90?1:condition>=75?.95:condition>=60?.85:condition>=45?.7:condition>=30?.5:0
}
export function reviewAssetModifiers({vanEffects,workshopEffects}){
 req(Array.isArray(vanEffects)&&Array.isArray(workshopEffects)&&[...vanEffects,...workshopEffects].every(x=>typeof x==='number'&&Number.isFinite(x)),'explicit asset effect values required')
 return review({equipmentProtectionPct:Math.min(30,Math.max(0,...vanEffects.map(Math.abs))),fieldRecoveryPct:Math.min(50,Math.max(0,...workshopEffects.map(Math.abs)))})
}
// Historical fallback is run-wide, user-equipment only. Never supplement partial canonical wear.
export function reviewEquipmentWear({provenance,runId,stageId,distanceKm,completeManifest,canonicalEquipmentWearPresent,items}){
 req(provenance==='synthetic_review_fixture'&&uuid(runId)&&uuid(stageId)&&num(distanceKm)&&distanceKm>0&&completeManifest===true&&typeof canonicalEquipmentWearPresent==='boolean','complete synthetic wear manifest required')
 req(unique(items,x=>x.itemId),'duplicate equipment item')
 const rows=[]
 for(const x of items){
  req(uuid(x.itemId)&&uuid(x.teamId)&&typeof x.isAI==='boolean'&&bounded(x.conditionBefore)&&num(x.totalDistanceKm)&&n(x.totalRaceDays),'invalid equipment snapshot')
  if(canonicalEquipmentWearPresent||x.isAI)continue
  const loss=round(distanceKm/100*.35)
  rows.push({key:[runId,'equipment','club_equipment_inventory',x.itemId].join(':'),itemId:x.itemId,teamId:x.teamId,conditionBefore:x.conditionBefore,requestedLoss:loss,conditionAfter:round(Math.max(0,x.conditionBefore-loss)),totalDistanceKm:round(x.totalDistanceKm+distanceKm),totalRaceDays:x.totalRaceDays+1})
 }
 return review({runId,stageId,mode:canonicalEquipmentWearPresent?'canonical_present_no_fallback':'historical_user_equipment_fallback',rows})
}
const aliases={minor_strain:'muscle_strain',viral_illness:'respiratory_infection',viral_infection:'respiratory_infection',illness:'flu',dehydration:'heat_exhaustion'}
const severity={minor:1,moderate:2,major:3}
const normalize=x=>{req(typeof x==='string'&&x.trim().length>0,'case code missing');const k=x.trim().toLowerCase();return aliases[k]??k}
export function healthRoll(seed){
 req(typeof seed==='string'&&seed.length>0,'seed required')
 const i=parseInt(createHash('md5').update(seed,'utf8').digest('hex').slice(0,12),16)
 return round(i/281474976710655)
}
export function reviewHealthCandidate({provenance,runId,stageId,candidate,priorCase,appliedKeys}){
 req(provenance==='synthetic_review_fixture'&&uuid(runId)&&uuid(stageId)&&candidate&&uuid(candidate.riderId)&&uuid(candidate.teamId)&&typeof candidate.incidentId==='string'&&candidate.incidentId.length>0&&Object.hasOwn(severity,candidate.severity)&&num(candidate.riskMultiplier),'invalid synthetic health evidence')
 req(Array.isArray(appliedKeys)&&new Set(appliedKeys).size===appliedKeys.length,'invalid incident receipts')
 const code=normalize(candidate.caseCode)
 const key=JSON.stringify([stageId,candidate.riderId,candidate.incidentId])
 if(appliedKeys.includes(key))return review({key,status:'already_applied',caseCode:code})
 const multiplier=Math.max(.78,Math.min(1,candidate.riskMultiplier)),roll=healthRoll([runId,candidate.riderId,candidate.incidentId,'health_consequence'].join(':'))
 if(priorCase!==null)req(priorCase&&uuid(priorCase.caseId)&&priorCase.riderId===candidate.riderId&&['active','recovering'].includes(priorCase.status)&&Object.hasOwn(severity,priorCase.severity),'invalid prior case')
 if(multiplier<1&&roll>=multiplier)return review({key,status:'health_consequence_prevented_by_preparation',caseCode:code,multiplier,roll})
 if(priorCase&&severity[priorCase.severity]>severity[candidate.severity])return review({key,status:'merged_into_stronger_open_case',caseId:priorCase.caseId,caseCode:code,multiplier,roll})
 return review({key,status:priorCase?'supersede_open_case_review':'new_case_review',caseCode:code,severity:candidate.severity,multiplier,roll,priorCaseId:priorCase?.caseId??null,selectionBlockedByNewSeverity:candidate.severity==='major',availabilityReview:candidate.severity==='major'?'requires_catalogue_handoff':'not_fully_fit',recoveryUntil:null,requiresCatalogue:true})
}
