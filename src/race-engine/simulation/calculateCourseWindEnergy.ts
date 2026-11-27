// 043BD offline workload primitive. Uses canonical one-second gross cost
// scaled by exact slice duration; no intermediate energy cap or rounding.
import {calculateRiderEnergyCost,type RiderEnergyCostInput} from './energyCost'
import type {WindTickSlice} from './integrateCourseWindTick'
type RiderInput=Omit<RiderEnergyCostInput,'speedKmh'|'tickSeconds'>
export function calculateCourseWindEnergy(
 rider:RiderInput,slices:readonly WindTickSlice[],supplyMultiplier:number,
){
 if(!Number.isFinite(supplyMultiplier)||supplyMultiplier<.9||supplyMultiplier>1)
  throw Error('invalid wind energy supply multiplier')
 if(!Number.isFinite(rider.currentEnergy)||rider.currentEnergy<0||rider.currentEnergy>100||!slices.length)
  throw Error('invalid wind energy reserve or empty workload')
 const rows=slices.map((s,i)=>{
  if(![s.fromKm,s.toKm,s.seconds,s.speedKmh,s.energyMultiplier].every(Number.isFinite)||
   s.fromKm<0||s.toKm<s.fromKm||s.seconds<=0||s.speedKmh<0||
   s.energyMultiplier<.895||s.energyMultiplier>1.75||
   (i>0&&s.fromKm!==slices[i-1].toKm)||
   Math.abs(s.toKm-s.fromKm-s.speedKmh*s.seconds/3600)>1e-9)
   throw Error('invalid wind workload slice')
  const canonical=calculateRiderEnergyCost({...rider,speedKmh:s.speedKmh,tickSeconds:1})
  const grossCost=canonical.grossEnergyCost*s.seconds
  return {...s,grossCost,efficiencyMultiplier:canonical.efficiencyMultiplier,
   uncappedCost:grossCost*canonical.efficiencyMultiplier*s.energyMultiplier*supplyMultiplier}
 })
 const uncappedCost=rows.reduce((n,s)=>n+s.uncappedCost,0)
 const nextEnergy=Math.max(0,rider.currentEnergy-uncappedCost)
 return {rows,uncappedCost,nextEnergy,energyCost:rider.currentEnergy-nextEnergy,
  elapsedSeconds:rows.reduce((n,s)=>n+s.seconds,0)}
}
