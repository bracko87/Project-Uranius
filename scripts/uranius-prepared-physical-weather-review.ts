// Offline synthetic review. Existing canonical weather coefficients; no new
// directional wind physics or catalogue effects.
import {calculateWeatherPerformanceEffects} from '../src/race-engine/simulation/weatherPerformanceEffects'
import {validateStageInput} from '../src/race-engine/validation/validateStageInput'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import {applyReviewEnergyMultiplier} from './uranius-resource-energy-review'
import type {StageInput,StageWeatherInput} from '../src/race-engine/domain/StageInput'
import type {ApplyMultiGroupEnergyResult} from '../src/race-engine/simulation/applyMultiGroupEnergy'
import type {EnergyMultipliers} from './uranius-resource-energy-review'
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AY: '+m)}
export function resolvePreparedPhysicalWeather(input:StageInput,context:any,weather:StageWeatherInput){
 req(input.weather===undefined&&weather?.source==='synthetic_review_fixture'&&weather.authority==='stage_weather_snapshot','explicit synthetic physical weather required')
 req(typeof weather.condition==='string'&&['clear','drizzle','rain','heavy_rain'].includes(weather.condition)&&weather.condition===context.weatherCondition&&weather.precipitationMm===context.precipitationMm,'physical and historical weather mismatch')
 req(typeof weather.averageTemperatureC==='number'&&Number.isFinite(weather.averageTemperatureC)&&weather.averageTemperatureC>=-10&&weather.averageTemperatureC<=45&&typeof weather.windSpeedKmh==='number'&&Number.isFinite(weather.windSpeedKmh)&&weather.windSpeedKmh>=0&&weather.windSpeedKmh<=50&&typeof weather.precipitationMm==='number'&&Number.isFinite(weather.precipitationMm)&&weather.precipitationMm>=0&&weather.precipitationMm<=100,'bounded explicit weather inputs required')
 validateStageInput({...input,weather})
 const effects=calculateWeatherPerformanceEffects(weather)
 // The historical adapter has an explicit .7–2.5 weather-factor contract.
 // Replace that factor, never multiply a second weather risk factor into it.
 const historicalRiskMultiplier=Math.min(2.5,effects.incidentProbabilityMultiplier)
 req(context.weatherMultiplier===historicalRiskMultiplier,'historical weather factor must match canonical capped risk')
 const energyMultiplier=Math.max(effects.energyConsumptionMultiplier,effects.staminaConsumptionMultiplier)
 const neutral=effects.speedMultiplier===1&&energyMultiplier===1&&effects.fatigueGainMultiplier===1&&historicalRiskMultiplier===1
 return {weather,effects,energyMultiplier,historicalRiskMultiplier,neutral,directionalWindVerified:false,official:false}
}
export function applyPreparedWeatherEnergy(result:ApplyMultiGroupEnergyResult,multipliers:EnergyMultipliers,weather:ReturnType<typeof resolvePreparedPhysicalWeather>,stateOverride?:SimulationState){
 const state=stateOverride??result.state
 req(state.weatherPerformanceEffectsEnabled===true&&!weather.neutral&&!state.groupShelterEnergyEnabled&&!state.experimentalAbsoluteSpeedEffortEnabled,'unsupported combined weather energy state')
 const riders={...state.riders}
 const applications=result.applications.map(a=>{
  const supply=multipliers[a.riderId]
  req(Number.isFinite(supply)&&supply>=.9&&supply<=1&&!(a.experimentalPullerEnergySurcharge??0)&&riders[a.riderId].energy===a.nextEnergy,'invalid combined energy evidence')
  const gross=a.result.grossEnergyCost*a.result.efficiencyMultiplier
  const uncappedCost=gross*weather.energyMultiplier*supply
  const nextEnergy=Math.max(0,a.previousEnergy-uncappedCost),energyCost=a.previousEnergy-nextEnergy
  riders[a.riderId]={...riders[a.riderId],energy:nextEnergy}
  // Preserve native weather fatigue metadata as a diagnostic; do not add it
  // again to the recovered post-stage fatigue calculation.
  return {...a,nextEnergy,energyCost,result:{...a.result,nextEnergy,energyCost},preparationEnergyMultiplier:supply,experimentalWeatherEnergyMultiplier:weather.energyMultiplier}
 })
 const next={...state,riders};validateSimulationState(next)
 return {...result,state:next,applications}
}
export type PreparedWeather=ReturnType<typeof resolvePreparedPhysicalWeather>
export function applyOptionalPreparedWeatherEnergy(result:ApplyMultiGroupEnergyResult,multipliers?:EnergyMultipliers,weather?:PreparedWeather,stateOverride?:SimulationState){
 if(weather&&!weather.neutral){req(multipliers,'explicit combined supply multipliers required');return applyPreparedWeatherEnergy(result,multipliers!,weather,stateOverride)}
 return applyReviewEnergyMultiplier(result,multipliers,stateOverride)
}
export function combinedPreparedWeatherFatigue(supply:number,weather:ReturnType<typeof resolvePreparedPhysicalWeather>){
 req(Number.isFinite(supply)&&supply>=.9&&supply<=1.15,'invalid supply fatigue multiplier')
 // Recovered workload contract bounds the combined modifier to .75–1.35.
 return Math.min(1.35,Math.max(.75,supply*weather.effects.fatigueGainMultiplier))
}
