// Offline synthetic constant-course model. Bearings clockwise from north;
// meteorological wind FROM direction. This is a bounded gameplay model,
// not aerodynamic power calibration or an echelon/shelter model.
import type {StageWeatherInput} from '../domain/StageInput'
import type {WeatherEffectContribution} from './weatherPerformanceEffects'
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x))
const round=(x:number)=>Number(x.toFixed(6))||0
export function calculateDirectionalWindEffects(weather:StageWeatherInput){
 const d=weather.directionalWind,w=weather.windSpeedKmh
 if(!d||d.scope!=='synthetic_constant_bearing'||weather.source!=='synthetic_review_fixture'||typeof w!=='number'||!Number.isFinite(w)||w<0||w>50||![d.courseBearingDegrees,d.windFromDegrees].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<360))throw Error('invalid synthetic directional wind evidence')
 const relativeFromDegrees=round((d.windFromDegrees-d.courseBearingDegrees+540)%360-180)
 const angle=relativeFromDegrees*Math.PI/180
 const longitudinalFromKmh=round(w*Math.cos(angle)),lateralFromRightKmh=round(w*Math.sin(angle))
 const headwindKmh=Math.max(0,longitudinalFromKmh),tailwindKmh=Math.max(0,-longitudinalFromKmh),crosswindKmh=Math.abs(lateralFromRightKmh)
 const excess=(x:number)=>clamp(x-15,0,35)
 const h=excess(headwindKmh),t=excess(tailwindKmh),c=excess(crosswindKmh)
 const speedMultiplier=round(clamp(1-.003*h+.002*t-.0015*c,.895,1.07))
 const energyConsumptionMultiplier=round(clamp(1+.006*h-.003*t+.003*c,.895,1.21))
 const contribution:WeatherEffectContribution={speedMultiplier,energyConsumptionMultiplier,staminaConsumptionMultiplier:energyConsumptionMultiplier,fatigueGainMultiplier:1,incidentProbabilityMultiplier:round(clamp(1+.015*h+.02*c,1,1.7))}
 return {scope:d.scope,courseBearingDegrees:d.courseBearingDegrees,windFromDegrees:d.windFromDegrees,relativeFromDegrees,longitudinalFromKmh,lateralFromRightKmh,headwindKmh,tailwindKmh,crosswindKmh,contribution}
}
