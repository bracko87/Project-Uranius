import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewRecoveryPoints as recovery,reviewOfficialRaceNight as night,reviewDelayedStageSeed as delayed,reviewBreakawayDebt as debt,reviewPostStageAdjustment as post} from '../scripts/uranius-original-fatigue-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const base={recovery:75,morale:75,activityBonus:0,doctorBonus:0,clubType:'main',residentialCampusActive:false}
const receipt={provenance:'synthetic_review_fixture',raceId:id(1),stageId:id(3),previousStageId:id(2),previousAuthorityVerified:true,dailyCoverageVerified:true,stageDate:'2000-01-04',previousStageDate:'2000-01-03',dailyReceiptDate:'2000-01-04',dailyReceiptAt:'2026-11-26T09:00:00Z',previousPublishedAt:'2026-11-26T10:00:00Z',previousCompletedAt:'2026-11-26T08:00:00Z',laterDailyReceipt:false,riders:[{...base,riderId:id(10),currentFatigue:20,currentStamina:91,previousStageFatigue:60,previousStatus:'finished',travelDelta:2}]}
const segment=(fromKm,toKm)=>({fromKm,toKm,physicalEscapeVerified:true})
const p={provenance:'synthetic_review_fixture',baseFatigueEvidence:'explicit_synthetic_baseline',riderId:id(10),status:'finished',fatigueBefore:25,grossFatigueGain:20,existingBreakawayDebt:0,multiplier:1,recoveryBonus:2,intrinsicDailyRecovery:9,distanceKm:150,segments:[segment(0,100)]}
test('original intrinsic recovery, morale boundaries, staff and developing campus',()=>{
 assert.equal(recovery(base),9);assert.equal(recovery({...base,morale:80}),10);assert.equal(recovery({...base,morale:39}),8)
 assert.equal(recovery({...base,doctorBonus:2,activityBonus:1,clubType:'developing',residentialCampusActive:true}),13)
 assert.equal(recovery({...base,recovery:0,morale:0}),3)
})
test('ordinary race night suppresses already applied race load and heavy-day fatigue bonus',()=>{
 const x=night({...base,provenance:'synthetic_review_fixture',previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:60,travelDelta:2,activityLoad:18,consecutiveHeavyDays:3})
 assert.equal(x.fatigue,53);assert.equal(x.heavyDays,4);assert.equal(x.directRaceLoadApplied,0);assert.equal(x.heavyFatigueBonusApplied,0)
})
test('ordinary night clamps before travel; delayed reconstruction clamps after travel',()=>{
 const x=night({...base,provenance:'synthetic_review_fixture',previousStageFatigueApplied:true,dailyRecoveryReceiptVerified:true,fatigueAfterStage:3,travelDelta:4,activityLoad:0,consecutiveHeavyDays:2})
 assert.equal(x.fatigue,4);assert.equal(x.heavyDays,0)
 assert.equal(delayed({...receipt,riders:[{...receipt.riders[0],previousStageFatigue:3,travelDelta:4}]}).rows[0].fatigue,0)
})
test('late stage restores prior stage fatigue and adjusts start stamina, not remaining energy',()=>{
 const x=delayed(receipt);assert.equal(x.rows[0].fatigue,53);assert.equal(x.rows[0].startStamina,76.15);assert.equal(x.official,false)
})
test('same day or correctly ordered recovery never repeated; later receipt corrected',()=>{
 assert.equal(delayed({...receipt,stageDate:receipt.previousStageDate}).reason,'same_day_no_overnight')
 const correct={...receipt,previousPublishedAt:'2026-11-26T08:30:00Z'}
 assert.equal(delayed(correct).rows[0].fatigue,20)
 assert.equal(delayed({...correct,laterDailyReceipt:true}).rows[0].fatigue,53)
})
test('missing receipt, invalid chronology, multi-day delayed gap, duplicate rider refused',()=>{
 for(const bad of [{...receipt,dailyCoverageVerified:false},{...receipt,previousAuthorityVerified:false},{...receipt,stageDate:'2000-01-05',dailyReceiptDate:'2000-01-05'},{...receipt,stageDate:'2000-01-02'},{...receipt,dailyReceiptAt:null},{...receipt,riders:[...receipt.riders,...receipt.riders]}])assert.throws(()=>delayed(bad))
})
test('breakaway progressive 20/50/100 km debt and overlapping segments counted once',()=>{
 for(const [km,n] of [[20,0],[50,4.5],[100,18.5],[120,27.5]])assert.equal(debt(150,[segment(0,km)]).debt,n)
 assert.deepEqual(debt(150,[segment(0,60),segment(40,100)]),{km:100,debt:18.5})
 assert.throws(()=>debt(150,[{...segment(0,50),physicalEscapeVerified:false}]))
})
test('post-stage fatigue replaces previous debt instead of doubling, caps and estimates recovery',()=>{
 const x=post(p);assert.equal(x.fatigueAfterStage,61.5);assert.equal(x.appliedFatigueGain,36.5);assert.equal(x.estimatedDaysToPreStageFatigue,5)
 assert.equal(post({...p,grossFatigueGain:x.grossFatigueGain,existingBreakawayDebt:x.breakawayDebt}).fatigueAfterStage,x.fatigueAfterStage)
 assert.equal(post({...p,fatigueBefore:90}).fatigueAfterStage,100)
 assert.equal(post({...p,status:'dnf'}).writeEligible,true);assert.equal(post({...p,status:'otl'}).writeEligible,true)
})
test('DNS no fatigue write; unsupported base or unverified provenance refuses',()=>{
 assert.equal(post({...p,status:'dns',grossFatigueGain:0,segments:[]}).fatigueAfterStage,null)
 for(const bad of [{...p,status:'dns'},{...p,baseFatigueEvidence:'engine_energy_proxy'},{...p,provenance:'official'},{...p,intrinsicDailyRecovery:0}])assert.throws(()=>post(bad))
})
