// Offline-only multi-rider batch motion. One selected incident at a time.
import type {SimulationState} from '../src/race-engine/domain/SimulationState'
import type {GroupState} from '../src/race-engine/domain/GroupState'
import type {RiderState} from '../src/race-engine/domain/RiderState'
import {calculateMultiGroupMovement} from '../src/race-engine/simulation/multiGroupMovement'
import {applyMultiGroupMovement} from '../src/race-engine/simulation/applyMultiGroupMovement'
import {applyMultiGroupEnergy} from '../src/race-engine/simulation/applyMultiGroupEnergy'
import {validateSimulationState} from '../src/race-engine/validation/validateSimulationState'
import {applyReviewEnergyMultiplier,type EnergyMultipliers} from './uranius-resource-energy-review'
type Row={riderId:string,helper:string|null,statusImpact:'finished'|'dnf',repairSeconds:number,energyLossPoints:number}
type Episode={affected:string,helper:string|null,groupId:string,helperGroupId:string|null,targetId:string,repairUntil:number,phase:'repair'|'chase'|'joined'}
const req=(x:unknown,m:string)=>{if(!x)throw Error('043AB: '+m)}
export function startMultiRiderIncident(state:SimulationState,rows:readonly Row[]){
 return startBatch(state,rows,[])
}
// 043AC: explicit opt-in admission. Existing 043AB entry point still refuses overlap.
export function extendMultiRiderIncident(state:SimulationState,rows:readonly Row[],prior:readonly Episode[]){
 return startBatch(state,rows,prior)
}
function startBatch(state:SimulationState,rows:readonly Row[],prior:readonly Episode[]){
 const active=Object.values(state.groups).filter(g=>g.active),pelotons=active.filter(g=>g.groupType==='peloton'),target=pelotons[0]
 const pending=prior.filter(e=>e.phase!=='joined')
 const tracked=pending.flatMap(e=>[e.groupId,...(e.helperGroupId?[e.helperGroupId]:[])])
 req(!state.completed&&state.input.orders.length===0&&pelotons.length===1&&active.length===tracked.length+1&&new Set(tracked).size===tracked.length&&pending.every(e=>e.targetId===target.groupId)&&tracked.every(id=>active.some(g=>g.groupId===id&&g.groupType==='chase')),'single peloton source required; untracked active group')
 for(const ep of pending){
  req(state.riders[ep.affected]?.currentGroupId===ep.groupId&&state.riders[ep.affected]?.stageStatus==='racing','invalid prior affected rider')
  if(ep.helper)req(state.riders[ep.helper]?.stageStatus==='racing'&&state.riders[ep.helper]?.currentGroupId===(ep.helperGroupId??ep.groupId),'invalid prior helper')
 }
 req(rows.length>0&&rows.length<=6&&new Set(rows.map(r=>r.riderId)).size===rows.length,'unique bounded incident riders required')
 const affected=new Set(rows.map(r=>r.riderId)),helpers=new Set<string>()
 for(const row of rows){
  const rider=state.riders[row.riderId]
  req(rider?.stageStatus==='racing'&&rider.currentGroupId===target.groupId,'affected rider not in source')
  req(Number.isFinite(row.energyLossPoints)&&row.energyLossPoints>=0&&['finished','dnf'].includes(row.statusImpact),'invalid consequence')
  req(Number.isInteger(row.repairSeconds)&&row.repairSeconds%state.input.settings.tickSeconds===0&&(row.statusImpact==='dnf'?row.repairSeconds===0:row.repairSeconds>0),'invalid repair')
  if(row.helper){
   const h=state.riders[row.helper]
   req(row.statusImpact==='finished'&&!affected.has(row.helper)&&!helpers.has(row.helper)&&h?.stageStatus==='racing'&&h.currentGroupId===target.groupId&&h.teamId===rider.teamId,'invalid or reserved helper')
   helpers.add(row.helper)
  }
 }
 req(target.riderIds.length>affected.size+helpers.size,'empty target')
 const groups:Record<string,GroupState>={...state.groups,[target.groupId]:{...target,riderIds:target.riderIds.filter(id=>!affected.has(id)&&!helpers.has(id))}}
 const riders:Record<string,RiderState>={...state.riders},pressure={...state.separationPressureSecondsByRiderId},episodes:Episode[]=[...prior]
 const makeGroup=(id:string,riderId:string,terminal=false)=>{
  req(!groups[id],'duplicate incident group')
  groups[id]={...target,groupId:id,groupType:terminal?'dropped':'chase',active:!terminal,riderIds:[riderId],speedKmh:terminal?0:target.speedKmh,createdAtRaceSecond:state.raceSecond,createdAtKm:target.distanceKm}
  riders[riderId]={...riders[riderId],currentGroupId:id,...(terminal?{stageStatus:'dnf' as const,speedKmh:0}:{})}
  pressure[riderId]=0
 }
 for(const row of [...rows].sort((a,b)=>a.riderId.localeCompare(b.riderId))){
  const id=row.riderId,terminal=row.statusImpact==='dnf'
  const groupId=terminal?'review_dnf_'+id:'review_incident_'+state.raceSecond+'_'+id
  makeGroup(groupId,id,terminal)
  riders[id]={...riders[id],energy:Math.max(0,riders[id].energy-row.energyLossPoints)}
  if(terminal)continue
  const helperGroupId=row.helper?'review_helper_'+state.raceSecond+'_'+row.helper:null
  if(row.helper&&helperGroupId)makeGroup(helperGroupId,row.helper)
  episodes.push({affected:id,helper:row.helper,groupId,helperGroupId,targetId:target.groupId,repairUntil:state.raceSecond+row.repairSeconds,phase:'repair'})
 }
 const next={...state,groups,riders,separationPressureSecondsByRiderId:pressure}
 validateSimulationState(next)
 return {state:next,episodes,targetId:target.groupId}
}
export function multiRiderIncidentTick(state:SimulationState,episodes:readonly Episode[],targetId:string,multipliers?:EnergyMultipliers,capabilityAdjustments?:Readonly<Record<string,number>>){
 req(!state.completed&&state.currentKm<state.stageDistanceKm,'pre-finish scope')
 const base=calculateMultiGroupMovement(state,capabilityAdjustments),dt=base.tickSeconds/3600
 const target=base.proposals.find(p=>p.groupId===targetId)
 req(target,'target missing')
 const active=episodes.filter(e=>e.phase!=='joined')
 const ids=active.flatMap(e=>[e.groupId,...(e.helperGroupId?[e.helperGroupId]:[])])
 req(new Set(ids).size===ids.length&&active.every(e=>e.targetId===targetId)&&base.proposals.every(p=>p.groupId===targetId||ids.includes(p.groupId))&&ids.every(id=>base.proposals.some(p=>p.groupId===id)),'untracked active group')
 const proposals=base.proposals.map(p=>{
  const ep=active.find(e=>e.groupId===p.groupId||e.helperGroupId===p.groupId)
  let next=p.nextDistanceKm
  if(ep){
   const repair=state.raceSecond<ep.repairUntil
   const speed=p.groupId===ep.groupId?(repair?0:Math.min(state.input.settings.maximumSpeedKmh,Math.max(p.appliedSpeedKmh,target!.appliedSpeedKmh+8))):(repair?target!.appliedSpeedKmh*.25:0)
   next=Math.min(target!.nextDistanceKm,p.previousDistanceKm+speed*dt)
   if(!repair&&p.groupId===ep.groupId&&ep.helperGroupId)next=Math.min(next,state.groups[ep.helperGroupId].distanceKm)
  }
  req(next>=p.previousDistanceKm-1e-10,'backward movement')
  return {...p,nextDistanceKm:next,distanceAdvancedKm:next-p.previousDistanceKm,appliedSpeedKmh:(next-p.previousDistanceKm)/dt,gapFromLeaderSeconds:Math.max(0,target!.nextDistanceKm-next)*3600/Math.max(1,target!.appliedSpeedKmh)}
 })
 req(proposals.every(p=>p.nextDistanceKm<state.stageDistanceKm),'finish outside bounded experiment')
 const movement={...base,leaderGroupId:targetId,leaderDistanceKm:target!.nextDistanceKm,proposals}
 const moved=applyMultiGroupMovement({state,movement}).state
 const energy=applyReviewEnergyMultiplier(applyMultiGroupEnergy({state:moved,movement}),multipliers)
 let next=energy.state
 const pickups:string[]=[],rejoins:string[]=[]
 const merge=(fromId:string,toId:string)=>{
  const from=next.groups[fromId],to=next.groups[toId]
  req(from.active&&to.active&&Math.abs(from.distanceKm-to.distanceKm)<1e-8,'physical contact required')
  const riders={...next.riders}
  for(const id of from.riderIds)riders[id]={...riders[id],currentGroupId:toId,distanceKm:to.distanceKm,speedKmh:to.speedKmh}
  next={...next,riders,groups:{...next.groups,[fromId]:{...from,active:false,riderIds:[]},[toId]:{...to,riderIds:[...to.riderIds,...from.riderIds].sort()}}}
 }
 const updated=episodes.map(e=>{
  const ep={...e}
  if(ep.phase==='joined'||state.raceSecond<ep.repairUntil)return ep
  ep.phase='chase'
  if(ep.helperGroupId&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[ep.helperGroupId].distanceKm)<1e-8){
   merge(ep.helperGroupId,ep.groupId);ep.helperGroupId=null;pickups.push(ep.affected)
  }
  if(!ep.helperGroupId&&Math.abs(next.groups[ep.groupId].distanceKm-next.groups[targetId].distanceKm)<1e-8){
   merge(ep.groupId,targetId);ep.phase='joined';rejoins.push(ep.affected)
  }
  return ep
 })
 validateSimulationState(next)
 return {state:next,episodes:updated,pickups,rejoins,energy:energy.applications,movement,official:false,hostedWriteAllowed:false,finalClassificationVerified:false}
}
