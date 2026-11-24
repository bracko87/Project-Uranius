// Focused OFFLINE reconciliation regression: no full-stage simulation.
// Deliberately synthetic state, no network, production, or persistence.
import assert from 'node:assert/strict'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {reconcileBreakawayGroups} from '../src/race-engine/simulation/reconcileBreakawayGroups'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'

function fixture(variant:'receding'|'closing'|'same_position'){
 const base=createInitialState(syntheticTenRiderStage)
 const peloton=base.groups.peloton_main
 const droppedIds=peloton.riderIds.slice(-2)
 const keptIds=peloton.riderIds.slice(0,-2)
 const pelotonKm=5
 const groupKm=variant==='same_position'?5:variant==='closing'?4.997:4.96
 const groupSpeed=variant==='closing'?42:variant==='same_position'?30:30
 const pelotonSpeed=35
 // Consistent gap estimate at peloton speed; inside 5s only in closing/collocated case.
 const gapSeconds=(pelotonKm-groupKm)*3600/pelotonSpeed
 return {...base,raceSecond:300,currentKm:5,
  groups:{...base.groups,
   peloton_main:{...peloton,riderIds:keptIds,distanceKm:pelotonKm,
    speedKmh:pelotonSpeed,gapFromLeaderSeconds:0},
   dropped_1:{groupId:'dropped_1',groupType:'dropped' as const,
    riderIds:droppedIds,distanceKm:groupKm,speedKmh:groupSpeed,
    gapFromLeaderSeconds:gapSeconds,createdAtRaceSecond:270,createdAtKm:4.9,active:true}},
  riders:Object.fromEntries(Object.entries(base.riders).map(([id,rider])=>{
   const dropped=droppedIds.includes(id)
   return [id,{...rider,currentGroupId:dropped?'dropped_1':'peloton_main',
    distanceKm:dropped?groupKm:pelotonKm,speedKmh:dropped?groupSpeed:pelotonSpeed}]
  }))}
}
function verify(){
 const receding=fixture('receding')
 const original=reconcileBreakawayGroups(receding)
 const protectedRun=reconcileBreakawayGroups(receding,{experimentalPreserveRecedingDroppedGroups:true})
 assert.deepEqual(original.reabsorbedBreakawayGroupIds,['dropped_1'])
 assert.deepEqual(protectedRun.reabsorbedBreakawayGroupIds,[])
 assert.equal(protectedRun.state.groups.dropped_1.active,true)
 assert.equal(protectedRun.state.groups.dropped_1.riderIds.length,2)
 assert.equal(protectedRun.state.groups.peloton_main.riderIds.length,8)
 // Faster dropped riders physically closing a short gap must still merge.
 const closing=reconcileBreakawayGroups(fixture('closing'),{experimentalPreserveRecedingDroppedGroups:true})
 assert.deepEqual(closing.reabsorbedBreakawayGroupIds,['dropped_1'])
 assert.equal(closing.state.groups.dropped_1.active,false)
 assert.equal(closing.state.groups.peloton_main.riderIds.length,10)
 // A group already collocated is caught; safeguard is not permanent immunity.
 const same=reconcileBreakawayGroups(fixture('same_position'),{experimentalPreserveRecedingDroppedGroups:true})
 assert.deepEqual(same.reabsorbedBreakawayGroupIds,['dropped_1'])
 assert.deepEqual(receding.groups.peloton_main.riderIds.length,8)
 console.log('PASS: default unchanged, slower trailing group preserved, faster closing group caught, collocated group caught, roster conserved')
}
verify()
