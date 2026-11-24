// Isolated 120km tactical sensitivity probe; uses a real supported attack order.
// Contrast identical inputs except for the order. No forced result or RNG.
import {createHash} from 'node:crypto'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

function makeInput(withAttack:boolean):StageInput{
 const field=128
 const riders=Array.from({length:field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  return {...base,riderId:'tactic-rider-'+String(index+1).padStart(3,'0'),
   teamId:'tactic-team-'+String(team).padStart(2,'0'),
   teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:{...base.attributes,flat:48+(index*37+11)%48,
    climbing:47+(index*29+23)%49,
    sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
    stamina:51+(index*19+7)%43,resistance:50+(index*31)%44,
    recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
    timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}}
 })
 const teams=Array.from({length:field/8},(_,index)=>{
  const group=riders.slice(index*8,index*8+8)
  return {teamId:group[0].teamId,teamName:group[0].teamName,
   captainRiderId:group[0].riderId,riderIds:group.map(r=>r.riderId)}
 })
 const selected=riders[0]
 return {...syntheticTenRiderStage,
  raceId:'uranius-tactical-sensitivity',stageId:'rolling-120-tactical',
  stageName:'Fictional rolling 120km tactical comparison',distanceKm:120,
  seed:'tactical-same-seed',teams,riders,
  profilePoints:[100,130,160,120,320,370,280,340,500,400,260,170,140].map(
   (elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
  orders:withAttack?[{orderId:'offline-attack-1',teamId:selected.teamId,
   riderId:selected.riderId,type:'attack',status:'scheduled',
   eligibleFromKm:35,eligibleUntilKm:42,priority:1,
   // Avoid a synthetic launch gap to observe actual attack movement.
   metadata:{uraniusLiveCommand:true}}]:[]}
}
function summarize(withAttack:boolean){
 const input=makeInput(withAttack)
 const result=runCalibratedTerrainSeparationStage(createInitialState(input),{
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
 })
 const final=Object.values(result.finalState.riders)
 const finishers=final.filter(r=>r.finished&&r.finishTimeSeconds!==null)
 const selected=final.find(r=>r.riderId==='tactic-rider-001')
 const events=result.events.filter(e=>e.eventType==='ORDER_EXECUTED'||e.eventType==='ATTACK_STARTED')
 const activeFrames=result.replaySnapshots.map(s=>Object.values(s.groups).filter(g=>g.active&&g.riderIds.length>0))
 const peakGapKm=Math.max(0,...activeFrames.map(groups=>groups.length>1?
  Math.max(...groups.map(g=>g.distanceKm))-Math.min(...groups.map(g=>g.distanceKm)):0))
 const groups=Math.max(...activeFrames.map(x=>x.length))
 const times=finishers.map(r=>r.finishTimeSeconds as number)
 const ranks=finishers.map(r=>r.finishPosition)
 const valid=finishers.length===input.riders.length&&new Set(ranks).size===input.riders.length&&
  ranks.every(x=>x!==null)&&result.completed
 const hash=createHash('sha256').update(JSON.stringify(
  final.map(r=>[r.riderId,r.finishPosition,r.finishTimeSeconds,r.energy]))).digest('hex').slice(0,20)
 return {withAttack,valid,finishers:finishers.length,groups,peakGapKm:Number(peakGapKm.toFixed(6)),
  finishSpreadSeconds:Math.max(...times)-Math.min(...times),
  selectedFinishPosition:selected?.finishPosition,selectedFinishSeconds:selected?.finishTimeSeconds,
  selectedFinalEnergy:selected?.energy,selectedAttackAttempts:selected?.attackAttempts,
  attackEventCount:events.filter(x=>x.eventType==='ATTACK_STARTED').length,
  executedOrderCount:events.filter(x=>x.eventType==='ORDER_EXECUTED').length,
  eventSamples:events.slice(0,5).map(e=>({type:e.eventType,second:e.raceSecond,km:e.kmMarker})),
  classificationAndEnergyHash:hash}
}
const baseline=summarize(false)
const attacked=summarize(true)
process.stdout.write(JSON.stringify({reportVersion:'uranius-rolling-tactical-sensitivity-v1',
 scope:'OFFLINE 120km 128-rider same-seed tactical A/B, experiment opt-in only',
 baseline,attacked,comparison:{
  attackWasExecuted:attacked.executedOrderCount===1&&attacked.attackEventCount===1,
  changedFinalState:attacked.classificationAndEnergyHash!==baseline.classificationAndEnergyHash,
  changeInSelectedFinishSeconds:(baseline.selectedFinishSeconds??0)-(attacked.selectedFinishSeconds??0),
  changeInSelectedEnergy:(baseline.selectedFinalEnergy??0)-(attacked.selectedFinalEnergy??0)
 },note:'Tactical impact need not guarantee an attack succeeds. A sprint bunch may legitimately share official time; classifications and tactical event evidence matter.'},null,2)+'\n')
