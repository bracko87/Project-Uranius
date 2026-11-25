/**
 * Offline POC: explicit, effort-funded peloton chase proposal.
 * Pure calculation. Wired only to an explicit OFF-by-default experimental
 * branch of the offline calibrated stage; never to canonical production.
 * Only executed chase orders nominate pullers. No automatic catch or gap.
 */
export interface ChasePuller {
 readonly riderId:string
 readonly teamId:string
 readonly teamwork:number
 readonly stamina:number
 readonly currentEnergy:number
 readonly raceStatus:'racing'|'finished'|'abandoned'
}
export interface ChaseOrder {
 readonly riderId:string
 readonly teamId:string
 readonly executed:boolean
 readonly currentKm:number
 readonly eligibleFromKm:number
 readonly eligibleUntilKm:number
}
export interface PelotonChaseEffortInput {
 readonly riders:readonly ChasePuller[]
 readonly orders:readonly ChaseOrder[]
 readonly pelotonSpeedKmh:number
 readonly breakawayDistanceAheadKm:number
 readonly pelotonSpeedLimitKmh:number
 readonly gradientPercent:number
 readonly tickSeconds:number
}
export interface PelotonChaseEffortResult {
 readonly eligiblePullerIds:readonly string[]
 readonly appliedPullerIds:readonly string[]
 readonly requestedBonusPercent:number
 readonly actualBonusPercent:number
 readonly appliedSpeedKmh:number
 readonly energySurchargeByRiderId:Readonly<Record<string,number>>
 readonly totalEnergySurcharge:number
 readonly reason:'no_gap'|'no_order'|'no_energy'|'active_chase'
}

function requireFinite(value:number,name:string){
 if(!Number.isFinite(value))throw Error('pelotonChaseEffort: '+name+' must be finite')
}
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))
const round=(x:number)=>Number(x.toFixed(6))

export function calculatePelotonChaseEffort(input:PelotonChaseEffortInput):PelotonChaseEffortResult{
 for(const [name,value] of Object.entries({
  pelotonSpeedKmh:input.pelotonSpeedKmh,
  breakawayDistanceAheadKm:input.breakawayDistanceAheadKm,
  pelotonSpeedLimitKmh:input.pelotonSpeedLimitKmh,
  gradientPercent:input.gradientPercent,tickSeconds:input.tickSeconds
 }))requireFinite(value,name)
 if(input.pelotonSpeedKmh<=0||input.pelotonSpeedLimitKmh<input.pelotonSpeedKmh||
  input.tickSeconds<=0||!Number.isInteger(input.tickSeconds)||
  input.gradientPercent<-30||input.gradientPercent>30)
  throw Error('pelotonChaseEffort: invalid physical input')

 const zero=(reason:PelotonChaseEffortResult['reason']):PelotonChaseEffortResult=>({
  eligiblePullerIds:[],appliedPullerIds:[],requestedBonusPercent:0,
  actualBonusPercent:0,appliedSpeedKmh:input.pelotonSpeedKmh,
  energySurchargeByRiderId:{},totalEnergySurcharge:0,reason
 })
 // Five seconds is only a minimum to organize pursuit, NOT a catch command.
 const gapSeconds=input.breakawayDistanceAheadKm/input.pelotonSpeedKmh*3600
 if(gapSeconds<5)return zero('no_gap')
 const orderRiders=new Set(input.orders.filter(order=>
  order.executed&&order.currentKm>=order.eligibleFromKm&&
  order.currentKm<order.eligibleUntilKm
 ).map(order=>order.teamId+':'+order.riderId))
 const eligible=input.riders.filter(r=>r.raceStatus==='racing'&&
  orderRiders.has(r.teamId+':'+r.riderId))
  .slice().sort((a,b)=>b.teamwork-a.teamwork||b.stamina-a.stamina||
   a.riderId.localeCompare(b.riderId))
 if(!eligible.length)return zero('no_order')
 const pullers=eligible.filter(r=>r.currentEnergy>5).slice(0,3)
 if(!pullers.length)return zero('no_energy')
 const avgTeamwork=pullers.reduce((sum,r)=>sum+r.teamwork,0)/pullers.length
 const coordination=clamp((avgTeamwork-40)/60,0,1)
 const uphill=1-0.6*clamp(input.gradientPercent/8,0,1)
 const requestedBonusPercent=3*coordination*uphill*Math.min(1,pullers.length/2)
 // Each rider's effort must be paid out of energy, not free group speed.
 // 0.06 reserve points per rider per minute per 1% chase demand,
 // moderated by stamina; a rider cannot spend below the 5-point safety floor.
 const demanded=round((input.tickSeconds/60)*0.06*requestedBonusPercent)
 const funded=pullers.map(r=>({
  rider:r,desired:round(demanded*(1.15-0.003*r.stamina)),
  available:Math.max(0,r.currentEnergy-5)
 }))
 const affordability=clamp(Math.min(...funded.map(p=>
  p.desired===0?1:p.available/p.desired)),0,1)
 const headroom=clamp((input.pelotonSpeedLimitKmh/input.pelotonSpeedKmh-1)*100,0,3)
 const actualBonusPercent=round(Math.min(requestedBonusPercent*affordability,headroom))
 const payments=Object.fromEntries(funded.map(p=>[
  p.rider.riderId,round(Math.min(p.available,
   p.desired*(requestedBonusPercent?actualBonusPercent/requestedBonusPercent:0)))
 ]))
 return {eligiblePullerIds:eligible.map(r=>r.riderId),
  appliedPullerIds:pullers.map(r=>r.riderId),requestedBonusPercent:round(requestedBonusPercent),
  actualBonusPercent,appliedSpeedKmh:round(input.pelotonSpeedKmh*(1+actualBonusPercent/100)),
  energySurchargeByRiderId:payments,
  totalEnergySurcharge:round(Object.values(payments).reduce((sum,val)=>sum+val,0)),
  reason:'active_chase'}
}
