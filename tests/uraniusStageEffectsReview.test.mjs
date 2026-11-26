import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewPlannedSupplies as plan,reviewSupplyUsage as usage,reviewEquipmentWear as wear,assetConditionFactor as factor,reviewAssetModifiers as modifiers,reviewHealthCandidate as health,healthRoll,durableMaxUses} from '../scripts/uranius-stage-effects-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const stageId=id(2),runId=id(3),teamId=id(4),riderId=id(5),provenance='synthetic_review_fixture'
const requirements=[{supplyKey:'energy_gels',quantity:4},{supplyKey:'race_jersey_complete',quantity:2},{supplyKey:'rain_jackets',quantity:1}]
const stock=[{teamId,supplyKey:'energy_gels',quantity:9}]
const units=[{unitId:id(10),teamId,supplyKey:'race_jersey_complete',usesRemaining:1,status:'assigned'},{unitId:id(11),teamId,supplyKey:'rain_jackets',usesRemaining:25,status:'ready'}]
const events=[{eventId:id(20),stageId,teamId,supplyKey:'energy_gels',quantity:3},{eventId:id(21),stageId,teamId,supplyKey:'race_jersey_complete',quantity:1,unitId:id(10)},{eventId:id(22),stageId,teamId,supplyKey:'rain_jackets',quantity:1,unitId:id(11)}]
const u={provenance,stageId,teamId,completeUsageEvidence:true,requirements,stock,units,usage:events}
const w={provenance,stageId,runId,distanceKm:120,completeManifest:true,canonicalEquipmentWearPresent:false,items:[{itemId:id(31),teamId,isAI:false,conditionBefore:90,totalDistanceKm:200,totalRaceDays:2},{itemId:id(32),teamId,isAI:false,conditionBefore:.2,totalDistanceKm:0,totalRaceDays:0},{itemId:id(33),teamId,isAI:true,conditionBefore:90,totalDistanceKm:0,totalRaceDays:0}]}
const h={provenance,stageId,runId,candidate:{riderId,teamId,incidentId:'incident-1',caseCode:'minor_strain',severity:'minor',riskMultiplier:1},priorCase:null,appliedKeys:[]}
test('explicit plan overrides direct rider totals per key, including explicit zero',()=>{
 const x=plan({explicitRows:[{supplyKey:'energy_gels',quantity:0},{supplyKey:'energy_gels',quantity:0}],riderRows:[{riderId,quantities:{energy_gels:4,bidons_water_bottles:2,race_jersey_complete:1}}]})
 assert.deepEqual(x.requirements,[{supplyKey:'bidons_water_bottles',quantity:2,source:'rider_plan'},{supplyKey:'energy_gels',quantity:0,source:'explicit_plan'},{supplyKey:'race_jersey_complete',quantity:1,source:'rider_plan'}])
 assert.equal(x.official,false)
})
test('explicit usage decrements consumables and durable units, without mutating input',()=>{
 const before=JSON.stringify(u),x=usage(u)
 assert.equal(x.consumableStock[0].quantity,6);assert.equal(x.units[0].usesRemaining,0);assert.equal(x.units[0].status,'worn_out');assert.equal(x.units[1].usesRemaining,24)
 assert.deepEqual(durableMaxUses,{race_jersey_complete:10,rain_jackets:25});assert.equal(JSON.stringify(u),before);assert.equal(x.writeAllowed,false)
 assert.equal(usage({...u,usage:[]}).consumableStock[0].quantity,9)
})
test('missing actual receipt, duplicate event/unit, excessive use, foreign stock and exhausted unit refused',()=>{
 for(const bad of [{...u,completeUsageEvidence:false},{...u,usage:[...events,events[0]]},{...u,usage:[...events,{...events[1],eventId:id(23)}]},{...u,usage:[{...events[0],quantity:5}]},{...u,stock:[{...stock[0],teamId:id(99)}]},{...u,units:[{...units[0],usesRemaining:0},units[1]]},{...u,stock:[{...stock[0],quantity:2}]}])assert.throws(()=>usage(bad))
})
test('historical fallback wear uses distance, user equipment only, condition floor and counters',()=>{
 const x=wear(w);assert.equal(x.rows.length,2);assert.equal(x.rows[0].requestedLoss,.42);assert.equal(x.rows[0].conditionAfter,89.58);assert.equal(x.rows[0].totalDistanceKm,320);assert.equal(x.rows[0].totalRaceDays,3);assert.equal(x.rows[1].conditionAfter,0)
 assert.equal(wear({...w,canonicalEquipmentWearPresent:true}).rows.length,0)
 assert.throws(()=>wear({...w,completeManifest:false}));assert.throws(()=>wear({...w,items:[...w.items,w.items[0]]}))
})
test('asset condition thresholds and capped maximum snapshot effects',()=>{
 assert.deepEqual([100,90,89,75,74,60,59,45,44,30,29,0].map(factor),[1,1,.95,.95,.85,.85,.7,.7,.5,.5,0,0])
 const x=modifiers({vanEffects:[-15,35],workshopEffects:[20,-60]});assert.equal(x.equipmentProtectionPct,30);assert.equal(x.fieldRecoveryPct,50)
})
test('deterministic original hash roll and injury aliases, selectable minor and moderate',()=>{
 assert.equal(healthRoll('abc'),.562887)
 const x=health(h);assert.equal(x.caseCode,'muscle_strain');assert.equal(x.selectionBlockedByNewSeverity,false);assert.equal(x.availabilityReview,'not_fully_fit');assert.equal(x.recoveryUntil,null)
 assert.equal(health({...h,candidate:{...h.candidate,severity:'moderate',caseCode:'dehydration'}}).caseCode,'heat_exhaustion')
 assert.equal(health({...h,candidate:{...h.candidate,severity:'major'}}).selectionBlockedByNewSeverity,true)
})
test('health replay no duplicate, stronger existing case preserved, equal or stronger new case supersedes',()=>{
 const x=health(h);assert.equal(health({...h,appliedKeys:[x.key]}).status,'already_applied')
 const prior={caseId:id(40),riderId,severity:'major',status:'active'}
 assert.equal(health({...h,priorCase:prior}).status,'merged_into_stronger_open_case')
 const next=health({...h,priorCase:{...prior,severity:'minor'}});assert.equal(next.status,'supersede_open_case_review');assert.equal(next.requiresCatalogue,true)
})
test('health protection uses bounded deterministic roll; invalid evidence rejected',()=>{
 let found=false
 for(let i=0;i<100;i++){const x=health({...h,candidate:{...h.candidate,incidentId:'trial-'+i,riskMultiplier:.2}});assert.equal(x.multiplier,.78);if(x.status==='health_consequence_prevented_by_preparation'){found=true;assert.ok(x.roll>=.78);break}}
 assert.ok(found)
 for(const bad of [{...h,provenance:'official'},{...h,candidate:{...h.candidate,severity:'unknown'}},{...h,candidate:{...h.candidate,riskMultiplier:null}},{...h,priorCase:{caseId:id(40),riderId:id(99),severity:'minor',status:'active'}}])assert.throws(()=>health(bad))
})
