/**
 * 039 opt-in review only. Observe actual pre-reconciliation group movement,
 * not replay snapshots or post-merge position jumps. Within a group the engine
 * has no individual wheel position: simultaneous crossings use an explicit
 * sporting tie policy, not invented time gaps. Default runners unchanged.
 */
import type { StageInput } from '../domain/StageInput'
import type { SimulationState } from '../domain/SimulationState'
import type { MultiGroupMovementResult } from './multiGroupMovement'
import { createInitialState } from './createInitialState'
import { runMultiGroupStage } from './runMultiGroupStage'
import { createMultiGroupSimulationOutput } from './createMultiGroupSimulationOutput'

export interface CompetitionMarker {
 readonly pointId:string
 readonly type:'INTERMEDIATE_SPRINT'|'BONUS_SPRINT'|'KOM'
 readonly km:number
}
export interface CrossingTick {
 readonly previousState:SimulationState
 readonly movement:MultiGroupMovementResult
 readonly appliedMovement:{readonly state:SimulationState}
}
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0
const require=(condition:unknown,message:string)=>{if(!condition)throw Error('039: '+message)}
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
export function validateCompetitionMarkers(markers:readonly CompetitionMarker[],distance:number){
 require(Array.isArray(markers)&&markers.length>0&&markers.length<=128,'invalid marker count')
 require(Number.isFinite(distance)&&distance>0,'invalid distance')
 require(new Set(markers.map(x=>x.pointId)).size===markers.length,'duplicate point ID')
 for(const m of markers)require(uuid.test(m.pointId)&&['INTERMEDIATE_SPRINT','BONUS_SPRINT','KOM'].includes(m.type)&&Number.isFinite(m.km)&&m.km>0&&m.km<distance,'invalid scoring marker')
 return [...markers].sort((a,b)=>a.km-b.km||cmp(a.pointId,b.pointId))
}
interface Crossing {
 riderId:string
 teamId:string
 groupId:string
 tickStartSeconds:number
 crossingTimeSeconds:number
 priorKm:number
 movedKm:number
 speedKmh:number
 primarySkill:number
 acceleration:number
 energyBeforeTick:number
}
export function collectCompetitionCrossings(input:StageInput,markers:readonly CompetitionMarker[],ticks:readonly CrossingTick[]){
 const sorted=validateCompetitionMarkers(markers,input.distanceKm)
 const roster=new Map(input.riders.map(r=>[r.riderId,r]))
 require(roster.size===input.riders.length,'duplicate rider')
 const seen=new Map(sorted.map(m=>[m.pointId,new Map<string,Crossing>()]))
 let expectedSecond=0
 for(const tick of ticks){
  const before=tick.previousState,after=tick.appliedMovement.state,move=tick.movement
  require(before.stageId===input.stageId&&after.stageId===input.stageId&&before.raceSecond===expectedSecond&&move.tickSeconds===input.settings.tickSeconds&&after.raceSecond===before.raceSecond+move.tickSeconds,'noncontiguous movement trace')
  expectedSecond=after.raceSecond
  const moved=new Set<string>()
  for(const p of move.proposals){
   require(Number.isFinite(p.previousDistanceKm)&&Number.isFinite(p.nextDistanceKm)&&p.previousDistanceKm>=0&&p.nextDistanceKm>=p.previousDistanceKm&&p.nextDistanceKm<=input.distanceKm&&Number.isFinite(p.appliedSpeedKmh)&&p.appliedSpeedKmh>0,'invalid movement proposal')
   const projected=p.previousDistanceKm+p.appliedSpeedKmh*move.tickSeconds/3600
   require(Math.abs(p.nextDistanceKm-Math.min(input.distanceKm,projected))<1e-7,'movement speed/distance mismatch')
   for(const id of p.riderIds){
    const r=before.riders[id],a=after.riders[id],source=roster.get(id)
    require(r&&a&&source&&r.teamId===source.teamId&&a.teamId===source.teamId&&r.stageStatus==='racing'&&a.stageStatus==='racing'&&a.currentGroupId===p.groupId&&Math.abs(a.distanceKm-p.nextDistanceKm)<1e-7&&!moved.has(id),'invalid movement membership')
    moved.add(id)
    for(const m of sorted){
     const crossings=seen.get(m.pointId)!
     if(crossings.has(id))continue
     // A tactical/reconciliation position jump is not a measured crossing.
     // Fail closed if it skips an as-yet-unrecorded marker.
     require(p.previousDistanceKm<m.km,'unobserved marker crossing before movement')
     if(p.nextDistanceKm<m.km)continue
     const seconds=before.raceSecond+(m.km-p.previousDistanceKm)*3600/p.appliedSpeedKmh
     require(seconds>=before.raceSecond&&seconds<=after.raceSecond+1e-7,'crossing outside tick')
     const primary=m.type==='KOM'?r.attributes.climbing:r.attributes.sprint
     require(typeof primary==='number'&&Number.isFinite(primary)&&Number.isFinite(r.attributes.acceleration)&&Number.isFinite(r.energy),'missing tie-break skill')
     crossings.set(id,{riderId:id,teamId:r.teamId,groupId:p.groupId,tickStartSeconds:before.raceSecond,crossingTimeSeconds:Number(seconds.toFixed(6)),priorKm:p.previousDistanceKm,movedKm:p.nextDistanceKm,speedKmh:p.appliedSpeedKmh,primarySkill:primary!,acceleration:r.attributes.acceleration,energyBeforeTick:r.energy})
    }
   }
  }
 }
 return sorted.map(m=>{
  const crossings=[...seen.get(m.pointId)!.values()].sort((a,b)=>a.crossingTimeSeconds-b.crossingTimeSeconds||b.primarySkill-a.primarySkill||b.acceleration-a.acceleration||b.energyBeforeTick-a.energyBeforeTick||cmp(a.riderId,b.riderId))
  require(crossings.length===roster.size,'incomplete marker crossing field; withdrawals not supported in this review')
  return {...m,crossings:crossings.map((c,i)=>({...c,rank:i+1,simultaneous:crossings.some((v,j)=>j!==i&&v.crossingTimeSeconds===c.crossingTimeSeconds)}))}
 })
}
export function runCompetitionCrossingReview(input:StageInput,markers:readonly CompetitionMarker[]){
 require(input.stageFormat==='road_race'&&input.orders.length===0,'only no-command road races')
 validateCompetitionMarkers(markers,input.distanceKm)
 const stage=runMultiGroupStage(createInitialState(input))
 require(Object.values(stage.finalState.riders).every(r=>r.stageStatus==='finished'),'withdrawals not supported')
 const competitions=collectCompetitionCrossings(input,markers,stage.ticks)
 return {version:'039_competition_crossing_review_v1',raceId:input.raceId,stageId:input.stageId,seed:input.seed,engineMode:'existing_v1',timingRule:'linear_group_movement_microseconds_v1',tieRule:'primary_sprint_or_climbing_acceleration_pre_tick_energy_rider_id_v1',official:false,hostedWriteAllowed:false,output:createMultiGroupSimulationOutput(stage),competitions}
}
