// 043C second slice: exactly two ordinary synthetic stages, all finishers.
import {buildStageCarryover,carryoverDigest} from './uranius-multistage-carryover-review.mjs'
import {projectStageScoring} from './uranius-stage-scoring-review.mjs'
import {loadOriginalPolicy,planWithOriginalPolicy} from './uranius-original-policy-review.mjs'
const P='synthetic_review_fixture'
const req=(x,m)=>{if(!x)throw Error('043C tour: '+m)}
const unique=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
const eq=(a,b)=>carryoverDigest(a)===carryoverDigest(b)
const int=x=>Number.isSafeInteger(x)&&x>=0
const cmp=(a,b)=>a<b?-1:a>b?1:0
// Original 043B workload math rounds energy to six decimal places, while
// existing_v1 legacy engine retains full precision. Keep raw engine identity
// exact for net-energy workloads; compare only the formula's derived values
// at its own precision. No epsilon/tolerance and no changes to scoring rows.
const roundEnergy=x=>Math.round((x+Number.EPSILON)*1e6)/1e6
const boundedEnergy=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100
export function matchTourWorkloadEnergy(workload,effect,startingEnergy,remainingEnergy){
 if(!workload||!effect||![startingEnergy,remainingEnergy].every(boundedEnergy))return false
 if(workload.startEnergy!==startingEnergy||effect.startEnergy!==roundEnergy(startingEnergy))return false
 if(workload.incidentEnergyLoss===0&&workload.additionalPointEnergyCost===0){
  return workload.rawFinishEnergy===remainingEnergy&&remainingEnergy<=startingEnergy&&effect.finishEnergy===roundEnergy(remainingEnergy)
 }
 // Preserve previous strict behavior for explicitly adjusted workload evidence.
 return effect.finishEnergy===remainingEnergy
}
export function buildTourSettlement(p){
 req(p?.provenance===P&&p.completeSyntheticEvidence===true,'explicit fixture required')
 const {policyText,category,carryover,job,scoringReceipt,clubs,youngRiderIds,penalties,prizeFundCash,lifecycle,previousPacket,expectedPreviousPacketDigest}=p
 req(carryover.schedule.length===2,'two-stage fixture only')
 const policy=loadOriginalPolicy(policyText),c=policy.categories.find(x=>x.code===category)
 req(c?.format==='stage_race'&&scoringReceipt.raceFormat==='stage_race','stage race policy required')
 const scoring=projectStageScoring({job,receipt:scoringReceipt}),input=JSON.parse(job.inputText)
 const {receipt,sha256}=buildStageCarryover(carryover),{raceId,stageId,runId,stageNumber}=receipt
 req(scoring.source.raceId===raceId&&scoring.source.stageId===stageId&&scoring.source.jobId===runId&&input.distanceKm===carryover.distanceKm,'job and effects identity mismatch')
 req(receipt.riders.length===scoring.resultRows.length&&unique(penalties,x=>x.riderId)&&penalties.length===receipt.riders.length,'complete rider and penalty evidence required')
 const teams=[...new Set(scoring.resultRows.map(x=>x.teamId))]
 req(teams.length>=c.minTeams&&teams.length<=c.maxTeams&&teams.every(t=>{const n=scoring.resultRows.filter(x=>x.teamId===t).length;return n>=c.minRiders&&n<=c.maxRiders}),'category roster bounds')
 req(unique(clubs,x=>x.clubId)&&teams.every(t=>clubs.some(x=>x.clubId===t))&&unique(youngRiderIds,x=>x)&&youngRiderIds.every(id=>receipt.riders.some(r=>r.riderId===id)),'club or youth roster')
 const stageResults=scoring.resultRows.map(row=>{
  const r=receipt.riders.find(x=>x.riderId===row.riderId),penalty=penalties.find(x=>x.riderId===row.riderId)
  const w=carryover.workloads.find(x=>x.riderId===row.riderId)
  req(r&&r.teamId===row.teamId&&r.status===row.status&&r.seedFatigue===row.startingCondition?.fatigueBeforeStage&&penalty&&int(penalty.seconds),'scoring and workload receipt mismatch: identity, fatigue or penalty for '+row.riderId)
  req(matchTourWorkloadEnergy(w,r.effect,row.startingCondition?.startingEnergy,row.remainingEnergy),'scoring and workload receipt mismatch: energy for '+row.riderId+' (engine start '+row.startingCondition?.startingEnergy+', formula start '+r.effect.startEnergy+', engine finish '+row.remainingEnergy+', formula finish '+r.effect.finishEnergy+')')
  return {...row,penaltySeconds:penalty.seconds,fatigueAfterStage:r.effect.fatigueAfterStage}
 }).sort((a,b)=>a.rank-b.rank)
 let priorResults=[]
 if(stageNumber===1)req(previousPacket===null&&expectedPreviousPacketDigest===null,'unexpected prior packet')
 else{
  req(previousPacket&&carryoverDigest(previousPacket)===expectedPreviousPacketDigest,'prior settlement digest mismatch')
  req(previousPacket.version==='043C_tour_settlement_v1'&&previousPacket.official===false&&previousPacket.hostedWriteAllowed===false&&previousPacket.accountingAllowed===false&&previousPacket.raceId===raceId&&previousPacket.stageNumber===1&&previousPacket.stageId===carryover.schedule[0].stageId&&previousPacket.previousPacket===null,'prior settlement scope mismatch')
  req(previousPacket.carryoverSha256===receipt.priorDigest&&eq(previousPacket.carryover,carryover.previousReceipt),'prior effects receipt mismatch')
  req(previousPacket.policySha256===policy.sha256&&previousPacket.category===category&&previousPacket.prizeFundCash===prizeFundCash&&eq(previousPacket.clubs,[...clubs].sort((a,b)=>cmp(a.clubId,b.clubId)))&&eq(previousPacket.youngRiderIds,[...youngRiderIds].sort()),'prior policy or eligibility changed')
  priorResults=previousPacket.stageResults
 }
 const settlement=planWithOriginalPolicy({policyText,category,fixture:{provenance:P,raceId,stageId,runId,format:'stage_race',worldChampionship:false,scheduledStages:carryover.schedule,results:[...priorResults,...stageResults],clubs,youngRiderIds,prizeFundCash,coverage:{synchronizedResults:true,youth:true},lifecycle}})
 const core={...settlement.plan,fixtureTaxRateBps:settlement.fixtureTaxRateBps}
 if(previousPacket){
  const old=previousPacket.settlements,newOld=settlement.settlements.filter(x=>x.stageId===previousPacket.stageId)
  req(eq(old,newOld),'prior award regeneration changed')
 }
 req(core.fatigue.every(x=>receipt.riders.find(r=>r.riderId===x.riderId)?.persistedFatigue===x.fatigue)&&core.fatigue.length===receipt.riders.length,'fatigue rounding mismatch')
 const packet={version:'043C_tour_settlement_v1',provenance:P,raceId,stageId,runId,stageNumber,policySha256:policy.sha256,category,prizeFundCash,clubs:[...clubs].sort((a,b)=>cmp(a.clubId,b.clubId)),youngRiderIds:[...youngRiderIds].sort(),carryover:receipt,carryoverSha256:sha256,previousPacket,previousPacketDigest:expectedPreviousPacketDigest,source:scoring.source,stageResults,pointResults:scoring.pointResults,core,settlements:settlement.settlements,currentStageOnly:settlement.currentStageOnly,allGenerated:settlement.allGenerated,official:false,hostedWriteAllowed:false,accountingAllowed:false}
 return {packet,sha256:carryoverDigest(packet)}
}
