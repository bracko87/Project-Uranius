import test from 'node:test'
import assert from 'node:assert/strict'
import {medicalSupportReview as staff,medicalCenterReview as center,injuryRecoveryReview as recover,injuryHandoverReview as handover,stageSupplyReservationReview as reserve} from '../scripts/uranius-original-resource-health-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const provenance='synthetic_review_fixture',main=id(1),child=id(2),sibling=id(3),other=id(4)
const clubs=[{clubId:main,type:'main',parentClubId:null},{clubId:child,type:'developing',parentClubId:main},{clubId:sibling,type:'developing',parentClubId:main},{clubId:other,type:'main',parentClubId:null}]
const person=(n,clubId,roleType,score=100,active=true)=>({staffId:id(n),clubId,roleType,specialization:'',expertise:score,experience:score,efficiency:score,active})
const evidence={provenance,completeStaffEvidence:true,clubs,clubId:child,staff:[person(10,main,'doctor'),person(11,child,'doctor',80),person(12,sibling,'physio'),person(13,main,'physio'),person(14,main,'nutritionist'),person(15,child,'nutritionist'),person(16,other,'doctor'),person(17,child,'physio',100,false)]}
const catalogueRow={caseCode:'fixture_strain',caseType:'injury',sourceContexts:['race'],bodyPartRequired:true,ranges:{minor:[2,4],moderate:[10,20],major:[30,40]},selectionBlocked:true,trainingBlocked:true,developmentBlocked:true}
const rec={provenance,catalogueEvidence:'explicit_synthetic_catalogue_row',catalogueRow,caseCode:'fixture_strain',severity:'moderate',bodyPart:'leg',clubId:child,startedOn:'2000-02-25',staffEvidence:evidence,medicalCenterLevel:5}
const prior={caseId:id(30),status:'recovering',severity:'minor',activeUntil:'2000-03-10',recoveryUntil:'2000-03-15',selectionBlocked:false,trainingBlocked:true,developmentBlocked:true}
const h={provenance,incidentEvidence:'explicit_synthetic_candidate',recoveryInput:rec,priorCase:prior}
const target={stageId:id(100),teamId:child,date:'2000-01-05',hour:14,minute:0}
const plan=(n,teamId,date,hour,extra={})=>({stageId:id(n),teamId,date,hour,minute:0,saved:true,weatherCancelled:false,authoritative:false,preparationStatus:'locked',raceStatus:'active',requirements:[{supplyKey:'energy_gels',quantity:3},{supplyKey:'race_jersey_complete',quantity:1}],...extra})
const fixture={provenance,completeReservationEvidence:true,clubs,target,plans:[plan(101,main,'2000-01-04',12),plan(102,sibling,'2000-01-05',12),plan(103,main,'2000-01-05',14),plan(104,main,'2000-01-05',15),plan(105,other,'2000-01-04',12),plan(106,main,'2000-01-04',12,{authoritative:true}),plan(107,main,'2000-01-04',12,{weatherCancelled:true}),plan(108,main,'2000-01-04',12,{saved:false}),plan(109,main,'2000-01-04',12,{preparationStatus:'draft'}),plan(110,main,'2000-01-04',12,{raceStatus:'completed'})],stock:[{ownerId:main,supplyKey:'energy_gels',quantity:10}],units:[{unitId:id(200),ownerId:main,supplyKey:'race_jersey_complete',usesRemaining:10,status:'ready',lastUsedDate:null},{unitId:id(201),ownerId:main,supplyKey:'race_jersey_complete',usesRemaining:5,status:'assigned',lastUsedDate:'2000-01-05'},{unitId:id(202),ownerId:main,supplyKey:'race_jersey_complete',usesRemaining:3,status:'assigned',lastUsedDate:'2000-01-04'},{unitId:id(203),ownerId:main,supplyKey:'race_jersey_complete',usesRemaining:0,status:'worn_out',lastUsedDate:null}]}
test('medical family support, best doctor, cumulative capped specialists and inactive exclusion',()=>{
 const x=staff(evidence);assert.deepEqual(x.relatedClubIds,[main,child,sibling]);assert.deepEqual(x.counts,{doctors:2,physios:2,nutritionists:2});assert.equal(x.recoveryDurationReductionPct,25);assert.equal(x.riskReductionPct,20);assert.equal(x.dailyRecoveryBonus,6);assert.equal(x.fatigueFloorReduction,5)
 assert.deepEqual(staff({...evidence,clubId:main}).counts,x.counts);assert.equal(staff({...evidence,clubId:other}).recoveryDurationReductionPct,12)
})
test('weighted medical skill, empty team, doctor role precedence and strict evidence',()=>{
 const x=staff({...evidence,staff:[{...person(21,child,'medical therapist'),expertise:80,experience:40,efficiency:60}]})
 assert.equal(x.recoveryDurationReductionPct,7.92);assert.equal(x.riskReductionPct,6.6);assert.equal(x.dailyRecoveryBonus,1);assert.equal(x.fatigueFloorReduction,1)
 assert.equal(staff({...evidence,staff:[]}).dailyRecoveryBonus,0);assert.throws(()=>staff({...evidence,completeStaffEvidence:false}));assert.throws(()=>staff({...evidence,staff:[evidence.staff[0],evidence.staff[0]]}))
})
test('medical centre levels and maximum cap',()=>{
 for(let i=0;i<=7;i++){const x=center(i),l=Math.min(5,i);assert.equal(x.recoveryReductionPct,4*l);assert.equal(x.riskReductionPct,3*l);assert.equal(x.fatigueFloorReduction,l);assert.equal(x.riskMultiplier,(100-3*l)/100)}
 assert.throws(()=>center(-1));assert.throws(()=>center(null))
})
test('catalogue midpoint, 45 percent recovery cap, ceiling and leap day',()=>{
 const x=recover(rec);assert.equal(x.selectedBaseDays,15);assert.equal(x.totalReductionPct,45);assert.equal(x.finalRecoveryDays,9);assert.equal(x.recoveryUntil,'2000-03-05');assert.equal(x.catalogueVerified,false)
 const y=recover({...rec,severity:'minor',medicalCenterLevel:0,staffEvidence:{...evidence,staff:[]}});assert.equal(y.finalRecoveryDays,3);assert.equal(y.recoveryUntil,'2000-02-28')
 assert.equal(recover({...rec,catalogueRow:{...catalogueRow,ranges:{...catalogueRow,moderate:[0,0]}}}).finalRecoveryDays,1)
})
test('invalid catalogue row, assignment, source, dates and staff scope refused',()=>{
 for(const bad of [{...rec,catalogueEvidence:'original'},{...rec,bodyPart:null},{...rec,caseCode:'unknown'},{...rec,startedOn:'2000-02-30'},{...rec,catalogueRow:{...catalogueRow,sourceContexts:['training']}},{...rec,staffEvidence:{...evidence,clubId:main}}])assert.throws(()=>recover(bad))
})
test('preserve stronger case; superseding never shortens deadlines; minor/moderate/major handover',()=>{
 const x=handover(h);assert.equal(x.recoveryUntil,'2000-03-15');assert.equal(x.activeUntil,'2000-03-10');assert.equal(x.availabilityReview,'not_fully_fit');assert.equal(x.restrictions.selectionBlocked,false);assert.equal(x.unavailableUntil,null);assert.equal(x.restrictions.trainingBlocked,true)
 const stronger=handover({...h,priorCase:{...prior,severity:'major',selectionBlocked:true}});assert.equal(stronger.disposition,'merged_into_stronger_open_case');assert.equal(stronger.restrictions.selectionBlocked,true)
 const minor=handover({...h,recoveryInput:{...rec,severity:'minor'}});assert.equal(minor.restrictions.trainingBlocked,false);assert.equal(minor.restrictions.developmentBlocked,false)
 const major=handover({...h,recoveryInput:{...rec,severity:'major'},priorCase:null});assert.equal(major.nextStageSelectionBlocked,true);assert.equal(major.availabilityReview,'injured');assert.equal(major.unavailableUntil,major.recoveryUntil)
})
test('parent stock shared; earlier reservations only; same-day durable restrictions',()=>{
 const x=reserve(fixture),g=x.rows.find(r=>r.supplyKey==='energy_gels'),j=x.rows.find(r=>r.supplyKey==='race_jersey_complete')
 assert.equal(x.ownerId,main);assert.deepEqual(g,{supplyKey:'energy_gels',physicalQuantity:10,reservedElsewhere:6,fixtureAvailable:4});assert.deepEqual(j,{supplyKey:'race_jersey_complete',physicalQuantity:2,reservedElsewhere:1,fixtureAvailable:1});assert.equal(x.writeAllowed,false)
 const y=reserve({...fixture,stock:[{...fixture.stock[0],quantity:1}]});assert.equal(y.rows.find(r=>r.supplyKey==='energy_gels').fixtureAvailable,0)
})
test('missing reservation evidence, duplicates, foreign owner and invalid durable counters refused',()=>{
 for(const bad of [{...fixture,completeReservationEvidence:false},{...fixture,plans:[...fixture.plans,fixture.plans[0]]},{...fixture,stock:[{...fixture.stock[0],ownerId:child}]},{...fixture,units:[{...fixture.units[0],usesRemaining:11}]}])assert.throws(()=>reserve(bad))
})
