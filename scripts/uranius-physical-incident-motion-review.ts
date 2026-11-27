// Offline controlled physical-motion experiment; no production runner or writer.
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {applyMultiGroupMovement} from '../src/race-engine/simulation/applyMultiGroupMovement'
import {applyMultiGroupEnergy} from '../src/race-engine/simulation/applyMultiGroupEnergy'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
type Episode={affected:string,helper:string|null,groupId:string,helperGroupId:string|null,targetId:string,repairUntil:number,phase:'repair'|'chase'|'joined'}
const req=(x:unknown,m:string)=>{if(!x)throw Error('043Z: '+m)}
export function startPhysicalIncident(state:SimulationState,affected:string,helper:string|null,repairSeconds:number,energyLoss:number){
 const r=state.riders[affected],target=state.groups[r?.currentGroupId]
 req(!state.completed&&r?.stageStatus==='racing'&&target?.active&&target.groupType==='peloton','racing peloton rider required')
 req(state.input.orders.length===0&&Object.values(state.groups).filter(g=>g.active).length===1,'bounded single-peloton no-command scope')
 req(Number.isFinite(energyLoss)&&energyLoss>=0&&Number.isInteger(repairSeconds)&&repairSeconds>0&&repairSeconds%state.input.settings.tickSeconds===0,'invalid repair/energy')
 req(!helper||(helper!==affected&&state.riders[helper]?.teamId===r.teamId&&state.riders[helper]?.currentGroupId===target.groupId&&state.riders[helper]?.stageStatus==='racing'),'invalid helper')
 req(target.riderIds.length>(helper?2:1),'empty target')
 const groupId='review_incident_'+state.raceSecond+'_'+affected,helperGroupId=helper?'review_helper_'+state.raceSecond+'_'+helper:null
 req(!state.groups[groupId]&&(!helperGroupId||!state.groups[helperGroupId]),'duplicate episode')
 const groups={...state.groups,[target.groupId]:{...target,riderIds:target.riderIds.filter(id=>id!==affected&&id!==helper)},[groupId]:{...target,groupId,groupType:'chase' as const,riderIds:[affected],createdAtRaceSecond:state.raceSecond,createdAtKm:r.distanceKm}}
 const riders={...state.riders,[affected]:{...r,currentGroupId:groupId,energy:Math.max(0,r.energy-energyLoss)}}
 if(helper&&helperGroupId){groups[helperGroupId]={...target,groupId:helperGroupId,groupType:'chase',riderIds:[helper],createdAtRaceSecond:state.raceSecond,createdAtKm:r.distanceKm};riders[helper]={...riders[helper],currentGroupId:helperGroupId}}
 const next={...state,groups,riders}
 validateSimulationState(next)
 const episode:Episode={affected,helper,groupId,helperGroupId,targetId:target.groupId,repairUntil:state.raceSecond+repairSeconds,phase:'repair'}
 return {state:next,episode}
}
export function physicalIncidentTick(state:SimulationState,episode:Episode){
 req(!state.completed&&state.currentKm<state.stageDistanceKm,'pre-finish scope')
 const base=calculateMultiGroupMovement(state),dt=base.tickSeconds/3600
 const target=base.proposals.find(p=>p.groupId===episode.targetId)
 req(target,'target missing')
 const repair=state.raceSecond<episode.repairUntil
 const incident=base.proposals.find(p=>p.groupId===episode.groupId)
 const helper=base.proposals.find(p=>p.groupId===episode.helperGroupId)
 req(episode.phase==='joined'||incident,'incident group missing')
 const proposals=base.proposals.map(p=>{
  let next=p.nextDistanceKm,speed=p.appliedSpeedKmh
  if(episode.phase!=='joined'&&p.groupId===episode.groupId){
   // Explicit experimental chase calibration, not historical parity.
   speed=repair?0:Math.min(state.input.settings.maximumSpeedKmh,Math.max(p.appliedSpeedKmh,target!.appliedSpeedKmh+8))
   next=Math.min(target!.nextDistanceKm,p.previousDistanceKm+speed*dt)
  }
  if(helper&&p.groupId===helper.groupId&&episode.phase!=='joined'){
   // Helper waits on the road; affected rider must physically reach it.
   speed=repair?target!.appliedSpeedKmh*.25:0
   next=Math.min(target!.nextDistanceKm,p.previousDistanceKm+speed*dt)
  }
  if(incident&&helper&&p.groupId===incident.groupId&&!repair)next=Math.min(next,helper.previousDistanceKm)
  speed=(next-p.previousDistanceKm)/dt
  return {...p,nextDistanceKm:next,distanceAdvancedKm:next-p.previousDistanceKm,appliedSpeedKmh:speed,gapFromLeaderSeconds:Math.max(0,target!.nextDistanceKm-next)*3600/Math.max(1,target!.appliedSpeedKmh)}
 })
 req(proposals.every(p=>p.nextDistanceKm<state.stageDistanceKm),'finish outside bounded experiment')
 const movement={...base,leaderGroupId:target!.groupId,leaderDistanceKm:target!.nextDistanceKm,proposals}
 const moved=applyMultiGroupMovement({state,movement}).state
 const energy=applyMultiGroupEnergy({state:moved,movement})
 let next=energy.state,ep={...episode},pickup=false,rejoin=false
 const merge=(fromId:string,toId:string)=>{
  const from=next.groups[fromId],to=next.groups[toId]
  req(from.active&&to.active&&Math.abs(from.distanceKm-to.distanceKm)<1e-8,'physical contact required')
  const riders={...next.riders}
  for(const id of from.riderIds)riders[id]={...riders[id],currentGroupId:toId,distanceKm:to.distanceKm,speedKmh:to.speedKmh}
  next={...next,riders,groups:{...next.groups,[fromId]:{...from,active:false,riderIds:[]},[toId]:{...to,riderIds:[...to.riderIds,...from.riderIds].sort()}}}
 }
 if(ep.phase!=='joined'){
  if(!repair)ep.phase='chase'
  if(ep.helperGroupId&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[ep.helperGroupId].distanceKm)<1e-8&&!repair){
   merge(ep.helperGroupId,ep.groupId);ep.helperGroupId=null;pickup=true
  }
  if(!repair&&!ep.helperGroupId&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[ep.targetId].distanceKm)<1e-8){
   merge(ep.groupId,ep.targetId);ep.phase='joined';rejoin=true
  }
 }
 validateSimulationState(next)
 return {state:next,episode:ep,pickup,rejoin,energy:energy.applications,movement,official:false,hostedWriteAllowed:false,finalClassificationVerified:false}
}
export function withdrawPhysicalRider(state:SimulationState,id:string){
 const r=state.riders[id],g=state.groups[r?.currentGroupId]
 req(r?.stageStatus==='racing'&&g?.active&&g.riderIds.length>1,'bounded withdrawal requires remaining group')
 const groupId='review_dnf_'+id
 req(!state.groups[groupId],'duplicate withdrawal')
 const next:SimulationState={...state,riders:{...state.riders,[id]:{...r,currentGroupId:groupId,stageStatus:'dnf',speedKmh:0}},groups:{...state.groups,[g.groupId]:{...g,riderIds:g.riderIds.filter(x=>x!==id)},[groupId]:{...g,groupId,groupType:'dropped',active:false,riderIds:[id],distanceKm:r.distanceKm,speedKmh:0,createdAtRaceSecond:state.raceSecond,createdAtKm:r.distanceKm}}}
 validateSimulationState(next)
 return next
}
