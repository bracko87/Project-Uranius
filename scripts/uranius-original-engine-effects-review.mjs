// 043B: recovered pinned original engine arithmetic, NOT its persistence writer.
import {reviewBreakawayDebt} from './uranius-original-fatigue-review.mjs'
const req=(ok,m)=>{if(!ok)throw Error('043B engine: '+m)}
const provenance='synthetic_review_fixture'
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const nonnegative=x=>finite(x)&&x>=0
const bounded=x=>nonnegative(x)&&x<=100
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[0-9a-f]{4}){3}-[a-f0-9]{12}$/.test(x)
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x))
const round=(x,d=6)=>{const f=10**d,y=Math.round((x+Number.EPSILON)*f)/f;return Object.is(y,-0)?0:y}
const result=x=>({...x,official:false,writeAllowed:false,accountingAllowed:false})
const incidentLoad=t=>{
 const s=t.trim().toLowerCase().replace(/[-\s]+/g,'_')
 if(s.includes('injury'))return 3
 if(s.includes('crash'))return 2.5
 if(s.includes('illness')||s.includes('sick'))return 2
 if(s.includes('abandon')||s.includes('dnf'))return 2
 if(s.includes('mechanical'))return 1
 if(s.includes('puncture'))return .5
 return .75
}
export function originalFatigueIncidentRisk(fatigue){
 req(bounded(fatigue),'bounded fatigue required')
 return round(clamp(1+Math.max(0,fatigue-20)*.015625,1,2.25))
}
export function originalPostStageFatigueReview(p){
 req(p.provenance===provenance&&p.completeWorkloadEvidence===true&&uuid(p.riderId)&&['finished','dnf','otl','dns'].includes(p.status)&&typeof p.eligibleToStart==='boolean','complete synthetic workload receipt required')
 req(p.eligibleToStart===(p.status!=='dns')&&bounded(p.effectiveFatigueBeforeStage)&&bounded(p.startEnergy)&&bounded(p.rawFinishEnergy)&&nonnegative(p.incidentEnergyLoss)&&nonnegative(p.additionalPointEnergyCost)&&finite(p.distanceKm)&&p.distanceKm>0&&Number.isInteger(p.difficultyCategory)&&p.difficultyCategory>=1&&p.difficultyCategory<=5,'invalid workload inputs')
 req(finite(p.postStageFatigueMultiplier)&&p.postStageFatigueMultiplier>=.75&&p.postStageFatigueMultiplier<=1.35&&nonnegative(p.postStageRecoveryBonusPoints)&&p.postStageRecoveryBonusPoints<=8&&bounded(p.recoverySkill)&&bounded(p.morale)&&finite(p.preparationIncidentRiskMultiplier)&&p.preparationIncidentRiskMultiplier>=.7&&p.preparationIncidentRiskMultiplier<=1.4,'explicit normalized readiness/modifiers required')
 req(Array.isArray(p.incidents)&&new Set(p.incidents.map(i=>i.incidentId)).size===p.incidents.length&&p.incidents.every(i=>typeof i.incidentId==='string'&&i.incidentId.length>0&&typeof i.incidentType==='string'&&i.incidentType.trim().length>0),'invalid incident evidence')
 const started=p.eligibleToStart,exposure=reviewBreakawayDebt(p.distanceKm,p.breakawaySegments)
 if(!started)req(p.startEnergy===0&&p.rawFinishEnergy===0&&p.incidentEnergyLoss===0&&p.additionalPointEnergyCost===0&&p.incidents.length===0&&exposure.km===0,'DNS must have no stage load')
 const startEnergy=started?round(p.startEnergy):0
 const finishEnergyBeforePointCosts=started?round(clamp(p.rawFinishEnergy-p.incidentEnergyLoss,0,startEnergy)):0
 const additionalPointEnergyCost=started?round(Math.min(finishEnergyBeforePointCosts,p.additionalPointEnergyCost)):0
 const finishEnergy=started?round(Math.max(0,finishEnergyBeforePointCosts-additionalPointEnergyCost)):0
 const totalEnergySpent=started?round(Math.max(0,startEnergy-finishEnergy)):0
 const energySpentPctOfStart=started&&startEnergy>0?round(totalEnergySpent/startEnergy*100):0
 const breakawayRecoveryDebtLoad=started?exposure.debt:0
 const distanceLoad=started?round(clamp(p.distanceKm/100,0,3)*1.5):0
 const difficultyLoad=started?round(p.difficultyCategory*1.2):0
 const finishStatusLoad=started?({finished:0,otl:1.5,dnf:2.5})[p.status]:0
 const incidentFatigueLoad=started?round(p.incidents.reduce((n,i)=>n+incidentLoad(i.incidentType),0)):0
 const exhaustionDebtLoad=started?round(finishEnergy<5?(5-finishEnergy)*1.4+Math.max(0,energySpentPctOfStart-92)*.08:0):0
 const grossFatigueGain=started?round(totalEnergySpent*.16+distanceLoad+difficultyLoad+finishStatusLoad+incidentFatigueLoad+exhaustionDebtLoad+breakawayRecoveryDebtLoad):0
 const adjustedFatigueGain=started?round(Math.max(0,grossFatigueGain*p.postStageFatigueMultiplier-p.postStageRecoveryBonusPoints)):0
 const effective=round(p.effectiveFatigueBeforeStage),uncapped=effective+adjustedFatigueGain
 const fatigueAfterStage=round(clamp(uncapped,0,100)),appliedFatigueGain=round(Math.max(0,fatigueAfterStage-effective))
 const intrinsicDailyRecoveryPoints=Math.max(3,Math.round(4+p.recoverySkill*.07+(p.morale>=80?1:p.morale<40?-1:0)))
 const risk=f=>round(Math.max(1,originalFatigueIncidentRisk(f)*p.preparationIncidentRiskMultiplier))
 const incidentRiskMultiplierBefore=risk(effective),incidentRiskMultiplierAfter=risk(fatigueAfterStage)
 return result({riderId:p.riderId,status:p.status,startEnergy,finishEnergyBeforePointCosts,additionalPointEnergyCost,finishEnergy,totalEnergySpent,energySpentPctOfStart,breakawayExposureKm:exposure.km,breakawayRecoveryDebtLoad,distanceLoad,difficultyLoad,finishStatusLoad,incidentFatigueLoad,exhaustionDebtLoad,grossFatigueGain,adjustedFatigueGain,fatigueAfterStage,appliedFatigueGain,fatigueClampedAtMaximum:uncapped>100,intrinsicDailyRecoveryPoints,fatigueAfterOneRecoveryDay:round(Math.max(0,fatigueAfterStage-intrinsicDailyRecoveryPoints)),estimatedDaysToPreStageFatigue:Math.ceil(appliedFatigueGain/intrinsicDailyRecoveryPoints),estimatedDaysToFullRecovery:Math.ceil(fatigueAfterStage/intrinsicDailyRecoveryPoints),incidentRiskMultiplierBefore,incidentRiskMultiplierAfter,incidentRiskIncrease:round(incidentRiskMultiplierAfter-incidentRiskMultiplierBefore),writeEligible:started,modelVersion:'universal_post_stage_rider_update_v2_review',authoritativeWorkloadVerified:false})
}
// Phase 9 resource update arithmetic. Missing optional fields map to null or
// historical defaults exactly as in the pinned source; explicit complete
// synthetic snapshot required. These are engine deltas, not database receipts.
export function originalPhase9ResourceReview(p){
 req(p.provenance===provenance&&p.completeResourceEvidence===true&&finite(p.distanceKm)&&p.distanceKm>0&&Array.isArray(p.resources),'complete synthetic resource snapshot required')
 req(new Set(p.resources.map(x=>x.resourceType+':'+x.resourceId)).size===p.resources.length,'duplicate resource')
 const rows=[]
 for(const x of [...p.resources].sort((a,b)=>['equipment','supply','asset'].indexOf(a.resourceType)-['equipment','supply','asset'].indexOf(b.resourceType)||(a.resourceId<b.resourceId?-1:a.resourceId>b.resourceId?1:0))){
  const {resourceType,resourceId,teamId}=x
  req(['equipment','supply','asset'].includes(resourceType)&&typeof resourceId==='string'&&resourceId.length>0&&uuid(teamId),'invalid resource identity')
  for(const k of ['quantity','selectedQuantity','usage','stageUsesRemaining','selectedStageUses','maxStageUses','condition','conditionLossPerRaceDay'])req(x[k]===undefined||finite(x[k]),'invalid resource value '+k)
  const quantityBefore=x.quantity===undefined?null:Math.max(0,x.quantity)
  const requestedUse=x.selectedQuantity!==undefined?Math.max(0,x.selectedQuantity):x.usage!==undefined?Math.max(0,x.usage):resourceType==='supply'?0:null
  const quantityUsed=quantityBefore===null||requestedUse===null?null:Math.min(quantityBefore,requestedUse)
  const quantityAfter=quantityBefore===null||quantityUsed===null?null:round(Math.max(0,quantityBefore-quantityUsed))
  const stageUsesBefore=x.stageUsesRemaining===undefined?null:Math.max(0,x.stageUsesRemaining)
  const requestedStageUses=x.selectedStageUses===undefined?null:Math.max(0,x.selectedStageUses)
  const stageUsesUsed=stageUsesBefore===null||requestedStageUses===null?null:Math.min(stageUsesBefore,requestedStageUses)
  const stageUsesAfter=stageUsesBefore===null||stageUsesUsed===null?null:round(Math.max(0,stageUsesBefore-stageUsesUsed))
  const maxStageUses=x.maxStageUses===undefined?null:Math.max(0,x.maxStageUses)
  const conditionBefore=x.condition===undefined?null:clamp(x.condition,0,100)
  const configuredWear=x.conditionLossPerRaceDay!==undefined?Math.max(0,x.conditionLossPerRaceDay):resourceType==='equipment'?.35:resourceType==='asset'?.25:0
  const calculatedWear=resourceType==='equipment'?Math.max(0,p.distanceKm/100*configuredWear):resourceType==='asset'?clamp(configuredWear*clamp(p.distanceKm/120,.6,1.6),.05,2.5):0
  const conditionUsed=conditionBefore===null?null:round(Math.min(conditionBefore,Math.max(0,calculatedWear)))
  const conditionAfter=conditionBefore===null||conditionUsed===null?null:round(Math.max(0,conditionBefore-conditionUsed))
  rows.push({resourceType,resourceId,teamId,quantityBefore,quantityUsed,quantityAfter,conditionBefore,conditionUsed,conditionAfter,stageUsesBefore,stageUsesUsed,stageUsesAfter,maxStageUses,shortageApplied:(quantityBefore!==null&&requestedUse!==null&&requestedUse>quantityBefore)||(stageUsesBefore!==null&&requestedStageUses!==null&&requestedStageUses>stageUsesBefore)})
 }
 return result({rows,modelVersion:'original_phase9_resource_updates_review',authoritativeResourceEvidenceVerified:false})
}
