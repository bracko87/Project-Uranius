// OFFLINE evaluation of historical strong/caught attack energy paradox.
// This compares complete-stage totals and time-normalized rates; not a rule change.
import {compareAttacks} from '../demo/race-replay/attackComparison'

const round=(value:number)=>Number(value.toFixed(6))
const cases=['strong','caught'] as const
const results=cases.map(scenario=>{
 const comparison=compareAttacks(scenario)
 const riderId=comparison.selected.id
 const start=comparison.startingEnergy[riderId]
 const base=comparison.baseline.finalRiderStates.find(r=>r.riderId===riderId)
 const attack=comparison.attacked.finalRiderStates.find(r=>r.riderId===riderId)
 if(!base||!attack||base.finishTimeSeconds===null||attack.finishTimeSeconds===null)
  throw Error('Incomplete attack comparison for '+scenario)
 const baselineUsed=start-base.energy
 const attackUsed=start-attack.energy
 const basePerMinute=baselineUsed/(base.finishTimeSeconds/60)
 const attackPerMinute=attackUsed/(attack.finishTimeSeconds/60)
 return {scenario,riderId,historyIdentical:comparison.historyIdentical,
  startingEnergy:round(start),
  baseline:{finishSeconds:base.finishTimeSeconds,finalEnergy:round(base.energy),
   totalEnergyUsed:round(baselineUsed),energyUsedPerMinute:round(basePerMinute),
   energyUsedPerKm:round(baselineUsed/comparison.distanceKm)},
  attacked:{finishSeconds:attack.finishTimeSeconds,finalEnergy:round(attack.energy),
   totalEnergyUsed:round(attackUsed),energyUsedPerMinute:round(attackPerMinute),
   energyUsedPerKm:round(attackUsed/comparison.distanceKm)},
  finishTimeGainedSeconds:round(base.finishTimeSeconds-attack.finishTimeSeconds),
  extraTotalEnergyUsed:round(attackUsed-baselineUsed),
  extraEnergyRatePerMinute:round(attackPerMinute-basePerMinute),
  visiblePeakGapKm:round(Math.max(...comparison.track.map(x=>x.gapKm))),
  interpretation:attack.energy>base.energy?
   'ATTACK_FINISHED_WITH_MORE_ENERGY_CHECK_EFFORT_VS_DURATION':
   'ATTACK_FINISHED_WITH_EQUAL_OR_LESS_ENERGY',
  }
})
process.stdout.write(JSON.stringify({reportVersion:'uranius-attack-energy-audit-v1',
 scope:'OFFLINE existing_v1 scripted attack replay; not sporting approval',
 note:'Final energy totals can be lower after a shorter ride even when energy cost per minute is higher. Review rates, group shelter and attack-specific effort before changing canonical rules.',
 results},null,2)+'\n')
