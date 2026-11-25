// Offline regression of independent opt-in and finish-order preservation.
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {reconcileBreakawayGroups} from '../src/race-engine/simulation/reconcileBreakawayGroups'
import {simulateIntegratedTerrainSeparationTick} from '../src/race-engine/simulation/runIntegratedTerrainSeparationStage'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import type {GroupState} from '../src/race-engine/domain/GroupState'

// The older shared micro-fixture predates the full terrain capability schema.
 // Enrich only this test input, leaving shared fixtures and golden hashes intact.
const base={...syntheticTenRiderStage,riders:syntheticTenRiderStage.riders.map(r=>({
 ...r,attributes:{...r.attributes,timeTrial:r.attributes.timeTrial??75,raceIq:r.attributes.raceIq??75}
}))}
const physical={experimentalRequirePhysicalBreakawayCatch:true}
const initial=createInitialState({...base,riders:base.riders.map((r,i)=>i===0
 ?{...r,attributes:{...r.attributes,flat:45,climbing:45,stamina:55,resistance:55,acceleration:55}}
 :r)})
const original=initial.groups.peloton_main
const ids=Object.keys(initial.riders)
const first=ids[0]
function fixture(pelotonKm:number,breakawayKms:number[],clock=360):SimulationState{
 const leaderKm=Math.max(pelotonKm,...breakawayKms)
 const groups:Record<string,GroupState>={}
 groups.peloton_main={...original,distanceKm:pelotonKm,speedKmh:44,
  gapFromLeaderSeconds:(leaderKm-pelotonKm)*3600/44,riderIds:ids.slice(breakawayKms.length)}
 for(let i=0;i<breakawayKms.length;i++){
  const groupId='breakaway_'+(i+1),distanceKm=breakawayKms[i]
  groups[groupId]={...original,groupId,groupType:'breakaway',distanceKm,speedKmh:40,
   gapFromLeaderSeconds:(leaderKm-distanceKm)*3600/44,riderIds:[ids[i]],createdAtRaceSecond:30,createdAtKm:1}
 }
 const riders=Object.fromEntries(Object.values(groups).flatMap(g=>g.riderIds.map(id=>[id,{
  ...initial.riders[id],currentGroupId:g.groupId,distanceKm:g.distanceKm,speedKmh:g.speedKmh}])))
 const state:SimulationState={...initial,raceSecond:clock,currentKm:leaderKm,groups,riders,
  nextBreakawayNumber:breakawayKms.length+1}
 validateSimulationState(state)
 return state
}
function direct(state:SimulationState,opts:Parameters<typeof reconcileBreakawayGroups>[1]){
 const before=JSON.stringify(state)
 const r=reconcileBreakawayGroups(state,opts)
 validateSimulationState(r.state)
 return {reabsorbed:r.reabsorbedBreakawayGroupIds,merged:r.mergedBreakawayGroupIds,
  groups:Object.values(r.state.groups).filter(g=>g.active).map(g=>({id:g.groupId,km:g.distanceKm,members:g.riderIds})),
  unchanged:JSON.stringify(state)===before}
}
const multi=direct(fixture(4,[4.12,4.08,3.8]),{...physical,experimentalPreserveTrailingAttackGroups:true})
const actualCatch=direct(fixture(4,[4.2,3.99]),physical)
const finishMerge=direct(fixture(9.8,[10,9.97]),{...physical,
 experimentalFinishCrossingSecondsByGroupId:{breakaway_1:10}})
const finishBoth=direct(fixture(10,[10,10]),{...physical,
 experimentalFinishCrossingSecondsByGroupId:{breakaway_1:8,peloton_main:19,breakaway_2:25}})
const finishEqual=direct(fixture(10,[10]),{...physical,
 experimentalFinishCrossingSecondsByGroupId:{breakaway_1:15,peloton_main:15}})

// Find the boundary from actual movement, not a forged catch or gap.
// Search is deliberately bounded and every returned trial is a real integrated tick.
let independent:null|{startingGapMetres:number,afterGapMetres:number,omittedCaught:boolean,
 explicitFalseCaught:boolean,trueCaught:boolean,withBirthCaught:boolean,sameLegacy:boolean}=null
for(let metres=5;metres<=250;metres+=5){
 const state=fixture(4,[4+metres/1000])
 const omitted=simulateIntegratedTerrainSeparationTick(state)
 const pre=omitted.reconciledBreakaways.previousState
 const gap=1000*(pre.groups.breakaway_1.distanceKm-pre.groups.peloton_main.distanceKm)
 if(!(gap>0&&omitted.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes('breakaway_1')))continue
 const off=simulateIntegratedTerrainSeparationTick(state,{experimentalRequirePhysicalBreakawayCatch:false})
 const on=simulateIntegratedTerrainSeparationTick(state,physical)
 const onWithBirth=simulateIntegratedTerrainSeparationTick(state,{...physical,experimentalPreserveBirthTickDroppedGroups:true})
 independent={startingGapMetres:metres,afterGapMetres:gap,omittedCaught:true,
  explicitFalseCaught:off.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes('breakaway_1'),
  trueCaught:on.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes('breakaway_1'),
  withBirthCaught:onWithBirth.reconciledBreakaways.reabsorbedBreakawayGroupIds.includes('breakaway_1'),
  sameLegacy:JSON.stringify(omitted.state)===JSON.stringify(off.state)}
 break
}

// Same-tick real movement and finish application. Expected crossing times are
// independently computed from each group's actual speed and pre-tick distance.
const finishState=fixture(9.82,[9.98],900)
const opts={subTickFinishInterpolationEnabled:true}
const oldFinish=simulateIntegratedTerrainSeparationTick(finishState,opts)
const newFinish=simulateIntegratedTerrainSeparationTick(finishState,{...opts,...physical})
const move=newFinish.movement.movement
const expected=(id:string)=>{
 const p=move.proposals.find(p=>p.groupId===id)
 if(!p||p.appliedSpeedKmh<=0)throw Error('Missing finish proposal '+id)
 return finishState.raceSecond+(10-p.previousDistanceKm)*3600/p.appliedSpeedKmh
}
const bTime=expected('breakaway_1'),pTime=expected('peloton_main')
const final=newFinish.state.riders
const finish={expectedBreakaway:bTime,expectedPeloton:pTime,actualBreakaway:final[first].finishTimeSeconds,
 actualPeloton:final[ids[1]].finishTimeSeconds,breakawayRank:final[first].finishPosition,
 oldBreakawayRank:oldFinish.state.riders[first].finishPosition,
 oldBreakawayTime:oldFinish.state.riders[first].finishTimeSeconds,
 reabsorbed:newFinish.reconciledBreakaways.reabsorbedBreakawayGroupIds,
 completed:newFinish.state.completed,finishers:Object.values(final).filter(r=>r.stageStatus==='finished').length}

const defaultStage=runCalibratedTerrainSeparationStage(createInitialState(base))
const offStage=runCalibratedTerrainSeparationStage(createInitialState(base),{experimentalRequirePhysicalBreakawayCatch:false})
const checks={
 independentTrueWithoutBirth:independent!==null&&!independent.trueCaught&&!independent.withBirthCaught,
 omittedAndFalseSame:independent!==null&&independent.explicitFalseCaught&&independent.sameLegacy,
 defaultFullStageUnchanged:defaultStage.completed&&offStage.completed&&defaultStage.deterministicHash===offStage.deterministicHash&&
  JSON.stringify(defaultStage.results)===JSON.stringify(offStage.results),
 cooperativeBreakawaysMerge:multi.merged.includes('breakaway_2')&&multi.groups.some(g=>g.id==='breakaway_1'&&g.members.length===2),
 distantTrailingAttackPreserved:multi.groups.some(g=>g.id==='breakaway_3'&&g.members.length===1&&g.km===3.8)&&multi.reabsorbed.length===0,
 actualCatchWithoutOtherMerge:actualCatch.reabsorbed.includes('breakaway_2')&&!actualCatch.reabsorbed.includes('breakaway_1'),
 unfinishedGroupNotTeleportedToFinish:finishMerge.groups.some(g=>g.id==='breakaway_2'&&g.km===9.97)&&finishMerge.merged.length===0,
 earlierFinishProtectedLaterCatch:!finishBoth.reabsorbed.includes('breakaway_1')&&finishBoth.reabsorbed.includes('breakaway_2'),
 exactFinishTieStillCaught:finishEqual.reabsorbed.includes('breakaway_1'),
 realEarlierCrossingWins:bTime<pTime&&pTime<=finishState.raceSecond+30&&finish.completed&&finish.finishers===10&&
  finish.breakawayRank===1&&Math.abs((finish.actualBreakaway??-1)-bTime)<1e-6&&
  Math.abs((finish.actualPeloton??-1)-pTime)<1e-6&&finish.reabsorbed.length===0,
 fixturesImmutable:[multi,actualCatch,finishMerge,finishBoth,finishEqual].every(r=>r.unchanged),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-physical-catch-integration-v1',checks,independent,multi,actualCatch,finishMerge,finishBoth,finishEqual,finish,
 defaultHash:defaultStage.deterministicHash,explicitFalseHash:offStage.deterministicHash},null,2)+'\n')
