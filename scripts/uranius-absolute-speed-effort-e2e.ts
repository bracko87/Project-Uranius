// OFFLINE 120km 128-rider rider-strength gradient experiment.
// Fixed seed and course; compare no-order baseline to early/late live attack,
// with only the nominated rider's physical attributes varied. No forced gap.
import {createHash} from 'node:crypto'
import {createInitialState} from '../src/race-engine/simulation/createInitialState'
import {runCalibratedTerrainSeparationStage} from '../src/race-engine/simulation/runCalibratedTerrainSeparationStage'
import {syntheticTenRiderStage} from '../src/race-engine/tests/fixtures/syntheticTenRiderStage'
import type {StageInput} from '../src/race-engine/domain/StageInput'

type Strength=76|82|86|90|94
type Timing='baseline'|'early'|'late'
const field=128
function buildInput(strength:Strength,timing:Timing):StageInput{
 const riders=Array.from({length:field},(_,index)=>{
  const base=syntheticTenRiderStage.riders[index%10]
  const team=Math.floor(index/8)+1
  const attributes={...base.attributes,
   flat:48+(index*37+11)%48,climbing:47+(index*29+23)%49,
   sprint:49+(index*13)%46,acceleration:50+(index*17)%40,
   stamina:51+(index*19+7)%43,resistance:50+(index*31)%44,
   recovery:52+(index*23)%40,teamwork:53+(index*7)%39,
   timeTrial:48+(index*11)%47,raceIq:49+(index*41)%45}
  return {...base,riderId:'sustain-rider-'+String(index+1).padStart(3,'0'),
   teamId:'sustain-team-'+String(team).padStart(2,'0'),
   teamName:'Fictional Team '+team,riderName:'Fictional Rider '+(index+1),
   role:index%8===0?'captain' as const:'domestique' as const,
   attributes:index===0
    ?{...attributes,flat:strength,climbing:strength,acceleration:strength,
      stamina:strength,resistance:strength,recovery:strength}:attributes}
 })
 const teams=Array.from({length:field/8},(_,i)=>{
  const roster=riders.slice(i*8,i*8+8)
  return {teamId:roster[0].teamId,teamName:roster[0].teamName,
   captainRiderId:roster[0].riderId,riderIds:roster.map(r=>r.riderId)}
 })
 const attacker=riders[0]
 const attackFrom=timing==='early'?5:70
 return {...syntheticTenRiderStage,
  raceId:'uranius-offline-attack-sustainability',stageId:'rolling-120-'+strength,
  stageName:'Fictional rolling 120km attack sustainability',
  seed:'sustainability-fixed-seed',distanceKm:120,teams,riders,
  profilePoints:[100,130,160,120,320,370,280,340,500,400,260,170,140]
   .map((elevationMetres,index)=>({kilometre:index*10,elevationMetres})),
  orders:timing==='baseline'?[]:[{
   orderId:'sustain-attack',type:'attack',status:'scheduled',
   teamId:attacker.teamId,riderId:attacker.riderId,
   eligibleFromKm:attackFrom,eligibleUntilKm:attackFrom+3,
   priority:1,maximumFollowers:null,targetRiderId:null,
   metadata:{uraniusLiveCommand:true}}],
 }
}






const selectedId='sustain-rider-001'
const input=buildInput(86,'early')
function run(enabled:boolean){
 const initial=createInitialState(input)
 const stage=runCalibratedTerrainSeparationStage({
  ...initial,experimentalAbsoluteSpeedEffortEnabled:enabled,
 },{
  experimentalPhysicalAttackLaunch:true,
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
  experimentalPreserveTrailingAttackGroups:true,
  experimentalPreserveSeparatingBreakaways:true,
 })
 const rider=stage.finalState.riders[selectedId]
 const apps=stage.ticks.flatMap(t=>t.appliedEnergy.applications)
 const solo=apps.filter(a=>a.riderId===selectedId)
 const charges=solo.map(a=>a.experimentalAbsoluteSpeedEnergySurcharge??0)
 const extra=charges.reduce((n,x)=>n+x,0)
 const energySpent=initial.riders[selectedId].energy-rider.energy
 const energyLedger=solo.reduce((n,a)=>n+a.energyCost,0)
 const firstFatigueSecond=stage.ticks.find(t=>
  t.state.riders[selectedId].energy<70)?.state.raceSecond??null
 const finishers=Object.values(stage.finalState.riders)
 const ordered=finishers.map(r=>r.finishTimeSeconds??0).sort((a,b)=>a-b)
 const mainPelotonApps=apps.filter(a=>a.groupId==='peloton_main')
 const pelotonExtra=mainPelotonApps.reduce((n,a)=>
  n+(a.experimentalAbsoluteSpeedEnergySurcharge??0),0)
 return {mode:enabled?'candidate-on':'baseline-off',completed:stage.completed,
  finishCount:finishers.filter(r=>r.stageStatus==='finished').length,
  chosenRank:rider.finishPosition,chosenFinishTime:rider.finishTimeSeconds,
  finishSpreadSeconds:ordered.at(-1)!-ordered[0],
  chosenFinalEnergy:rider.energy,chosenEnergySpent:energySpent,
  chosenEnergyLedgerResidual:energySpent-energyLedger,
  chosenAbsoluteSpeedEnergySurcharge:extra,
  pelotonAbsoluteSpeedSurcharge:pelotonExtra,
  firstFatigueSecond,elapsedTicks:stage.ticks.length}
}
const off=run(false)
const on=run(true)
const checks={
 bothRacesComplete:[off,on].every(r=>r.completed&&r.finishCount===128),
 zeroDefaultCandidateCharge:off.chosenAbsoluteSpeedEnergySurcharge===0&&
  off.pelotonAbsoluteSpeedSurcharge===0,
 candidateActuallyCharges:on.chosenAbsoluteSpeedEnergySurcharge>0&&
  on.pelotonAbsoluteSpeedSurcharge>0,
 baselineFingerprint:off.chosenFinishTime===9939.315079131&&
  Math.abs(off.finishSpreadSeconds-647.108293786)<1e-6,
 conservation:[off,on].every(r=>Math.abs(r.chosenEnergyLedgerResidual)<1e-4),
 candidatePreservesEnergyBounds:[off,on].every(r=>r.chosenFinalEnergy>=0&&
  r.chosenFinalEnergy<=100),
}
process.stdout.write(JSON.stringify({reportVersion:'uranius-absolute-speed-effort-e2e-v1',
 checks,races:[off,on],
 note:'The cubic-speed coefficient is provisional and experimental. No validated real-world watt model; production default unchanged.'
},null,2)+'\n')
