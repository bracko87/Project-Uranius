import test from 'node:test'
import assert from 'node:assert/strict'
import {originalPostStageFatigueReview as fatigue,originalFatigueIncidentRisk as risk,originalPhase9ResourceReview as resources} from '../scripts/uranius-original-engine-effects-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const provenance='synthetic_review_fixture'
const base={provenance,completeWorkloadEvidence:true,riderId:id(10),status:'finished',eligibleToStart:true,effectiveFatigueBeforeStage:20,startEnergy:90,rawFinishEnergy:50,incidentEnergyLoss:0,additionalPointEnergyCost:0,distanceKm:120,difficultyCategory:3,postStageFatigueMultiplier:1,postStageRecoveryBonusPoints:2,recoverySkill:75,morale:75,preparationIncidentRiskMultiplier:1,incidents:[],breakawaySegments:[]}
const row=(n,resourceType,values)=>({resourceId:id(n),teamId:id(20),resourceType,...values})
const packet={provenance,completeResourceEvidence:true,distanceKm:120,resources:[row(1,'equipment',{condition:90}),row(2,'equipment',{condition:90,conditionLossPerRaceDay:.6}),row(3,'asset',{condition:90,conditionLossPerRaceDay:.25}),row(4,'supply',{quantity:5,selectedQuantity:8,usage:1}),row(5,'supply',{stageUsesRemaining:1,selectedStageUses:2,maxStageUses:10}),row(6,'supply',{quantity:10})]}
test('base energy, distance and difficulty loads; exact fatigue and recovery',()=>{
 const x=fatigue(base)
 assert.equal(x.totalEnergySpent,40);assert.equal(x.distanceLoad,1.8);assert.equal(x.difficultyLoad,3.6);assert.equal(x.grossFatigueGain,11.8);assert.equal(x.adjustedFatigueGain,9.8);assert.equal(x.fatigueAfterStage,29.8);assert.equal(x.intrinsicDailyRecoveryPoints,9);assert.equal(x.fatigueAfterOneRecoveryDay,20.8);assert.equal(x.estimatedDaysToFullRecovery,4);assert.equal(x.authoritativeWorkloadVerified,false)
})
test('incident and point energy charged in original order; incident/status load precedence',()=>{
 const x=fatigue({...base,status:'dnf',incidentEnergyLoss:10,additionalPointEnergyCost:6,incidents:['injury-crash','crash','sick','dnf','mechanical','puncture','other'].map((incidentType,i)=>({incidentId:String(i),incidentType}))})
 assert.equal(x.finishEnergyBeforePointCosts,40);assert.equal(x.finishEnergy,34);assert.equal(x.totalEnergySpent,56);assert.equal(x.incidentFatigueLoad,11.75);assert.equal(x.finishStatusLoad,2.5);assert.equal(x.grossFatigueGain,28.61)
 assert.equal(fatigue({...base,status:'otl'}).finishStatusLoad,1.5)
})
test('exhaustion debt, tiered breakaway debt, modifiers and capped applied gain',()=>{
 const x=fatigue({...base,effectiveFatigueBeforeStage:80,rawFinishEnergy:0,breakawaySegments:[{fromKm:0,toKm:100,physicalEscapeVerified:true}],postStageFatigueMultiplier:1.2,postStageRecoveryBonusPoints:0})
 assert.equal(x.energySpentPctOfStart,100);assert.equal(x.exhaustionDebtLoad,7.64);assert.equal(x.breakawayRecoveryDebtLoad,18.5);assert.equal(x.grossFatigueGain,45.94);assert.equal(x.adjustedFatigueGain,55.128);assert.equal(x.fatigueAfterStage,100);assert.equal(x.appliedFatigueGain,20);assert.equal(x.fatigueClampedAtMaximum,true)
})
test('DNS preserves effective fatigue without write; risk envelope and modifier floor',()=>{
 const x=fatigue({...base,status:'dns',eligibleToStart:false,startEnergy:0,rawFinishEnergy:0})
 assert.equal(x.fatigueAfterStage,20);assert.equal(x.grossFatigueGain,0);assert.equal(x.writeEligible,false)
 assert.deepEqual([0,20,60,100].map(risk),[1,1,1.625,2.25])
 assert.equal(fatigue({...base,preparationIncidentRiskMultiplier:.7}).incidentRiskMultiplierAfter,1)
 for(const bad of [{...base,completeWorkloadEvidence:false},{...base,difficultyCategory:0},{...base,postStageFatigueMultiplier:2},{...base,status:'dns'},{...base,breakawaySegments:[{fromKm:0,toKm:25,physicalEscapeVerified:false}]},{...base,incidents:[{incidentId:'a',incidentType:'crash'},{incidentId:'a',incidentType:'crash'}]}])assert.throws(()=>fatigue(bad))
})
test('canonical engine resource defaults, selected quantity precedence, shortages and durable uses',()=>{
 const x=resources(packet),by=n=>x.rows.find(r=>r.resourceId===id(n))
 assert.equal(by(1).conditionUsed,.42);assert.equal(by(1).conditionAfter,89.58);assert.equal(by(2).conditionUsed,.72);assert.equal(by(3).conditionUsed,.25)
 assert.equal(by(4).quantityUsed,5);assert.equal(by(4).quantityAfter,0);assert.equal(by(4).shortageApplied,true);assert.equal(by(5).stageUsesUsed,1);assert.equal(by(5).stageUsesAfter,0);assert.equal(by(5).shortageApplied,true);assert.equal(by(6).quantityUsed,0);assert.equal(by(6).quantityAfter,10);assert.equal(by(6).conditionUsed,null)
 assert.equal(x.official,false);assert.equal(x.authoritativeResourceEvidenceVerified,false)
})
test('asset wear distance clamps and min/max, floor at remaining condition, no supply wear',()=>{
 const q={...packet,distanceKm:600,resources:[row(7,'asset',{condition:100,conditionLossPerRaceDay:10}),row(8,'asset',{condition:.03,conditionLossPerRaceDay:0}),row(9,'equipment',{condition:.1}),row(10,'supply',{condition:90,conditionLossPerRaceDay:50})]}
 const x=resources(q),by=n=>x.rows.find(r=>r.resourceId===id(n))
 assert.equal(by(7).conditionUsed,2.5);assert.equal(by(8).conditionUsed,.03);assert.equal(by(9).conditionAfter,0);assert.equal(by(10).conditionUsed,0)
 const y=resources({...q,distanceKm:20,resources:[row(11,'asset',{condition:100,conditionLossPerRaceDay:.25})]})
 assert.equal(y.rows[0].conditionUsed,.15)
})
test('resource input order independent, original usage fallback and malformed evidence refused',()=>{
 assert.deepEqual(resources({...packet,resources:[...packet.resources].reverse()}),resources(packet))
 const x=resources({...packet,resources:[row(12,'supply',{quantity:10,usage:3}),row(13,'equipment',{quantity:5})]})
 assert.equal(x.rows.find(r=>r.resourceId===id(12)).quantityUsed,3);assert.equal(x.rows.find(r=>r.resourceId===id(13)).quantityAfter,null)
 for(const bad of [{...packet,completeResourceEvidence:false},{...packet,resources:[...packet.resources,packet.resources[0]]},{...packet,resources:[row(1,'asset',{condition:NaN})]}])assert.throws(()=>resources(bad))
})
