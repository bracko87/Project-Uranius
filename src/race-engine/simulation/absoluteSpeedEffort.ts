/**
 * Offline-only absolute-speed effort candidate. This is a bounded gameplay
 * hypothesis, NOT an empirically calibrated watts / CdA physiology model.
 *
 * Additional energy is based on absolute speed (cubic aerodynamic power
 * proxy), attenuated by group shelter. The accepted relative-speed energy
 * calculation remains unchanged when this optional candidate is disabled.
 */
import type {GroupType} from '../domain/GroupState'
import {calculateGroupShelter} from './groupShelter'
export interface AbsoluteSpeedEffortInput {
 readonly speedKmh:number
 readonly gradientPercent:number
 readonly tickSeconds:number
 readonly groupType:GroupType
 readonly groupSize:number
}
export interface AbsoluteSpeedEffortResult {
 readonly speedKmh:number
 readonly referenceSpeedKmh:number
 readonly cubicSpeedExposure:number
 readonly shelterPercent:number
 readonly addedEnergyCost:number
}
export function calculateAbsoluteSpeedEffort(input:AbsoluteSpeedEffortInput):AbsoluteSpeedEffortResult {
 const {speedKmh,gradientPercent,tickSeconds,groupType,groupSize}=input
 if(!Number.isFinite(speedKmh)||speedKmh<0||speedKmh>150)
  throw Error('calculateAbsoluteSpeedEffort: invalid speed')
 if(!Number.isInteger(tickSeconds)||tickSeconds<=0)
  throw Error('calculateAbsoluteSpeedEffort: invalid tickSeconds')
 const shelter=calculateGroupShelter({groupType,groupSize,gradientPercent})
 // A zero marginal charge at <= 30km/h prevents low-speed uphill exertion
 // from being double-counted by the existing gradient cost.
 const referenceSpeedKmh=30
 const cubicSpeedExposure=Math.max(0,
  Math.pow(speedKmh/referenceSpeedKmh,3)-1)
 // An explicitly provisional 30s coefficient; sensitivity must be measured
 // against final reserves and movement, not treated as validated physiology.
 const unshieldedCost=0.075*(tickSeconds/30)*cubicSpeedExposure
 const addedEnergyCost=unshieldedCost*(1-shelter.shelterBonus/100)
 return {speedKmh,referenceSpeedKmh,cubicSpeedExposure,
  shelterPercent:shelter.shelterBonus,addedEnergyCost}
}
