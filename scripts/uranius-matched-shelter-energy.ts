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





import {calculateRiderEnergyCost} from '../src/race-engine/simulation/energyCost'
import {calculateGroupShelter} from '../src/race-engine/simulation/groupShelter'

const base=buildInput(86,'early')
const selectedId='sustain-rider-001'
const selected=base.riders.find(r=>r.riderId===selectedId)!
const attributes=selected.attributes
const gradients=[0,2,8] as const
const speeds=[38,42,46] as const
const samples=gradients.flatMap(gradient=>speeds.map(speed=>{
 const physicalInput={
  currentEnergy:90,speedKmh:speed,baseSpeedKmh:42,
  gradientPercent:gradient,tickSeconds:30,
  stamina:attributes.stamina,resistance:attributes.resistance,
  recovery:attributes.recovery,
 }
 const canonical=calculateRiderEnergyCost(physicalInput)
 const soloShelter=calculateGroupShelter({
  groupType:'breakaway',groupSize:1,gradientPercent:gradient})
 const pelotonShelter=calculateGroupShelter({
  groupType:'peloton',groupSize:128,gradientPercent:gradient})
 const soloCost=canonical.energyCost*(1-soloShelter.shelterBonus/100)
 const pelotonCost=canonical.energyCost*(1-pelotonShelter.shelterBonus/100)
 return {gradient,speed,canonicalCost:canonical.energyCost,
  soloShelterPercent:soloShelter.shelterBonus,
  pelotonShelterPercent:pelotonShelter.shelterBonus,
  soloEnergyWithShelter:soloCost,pelotonEnergyWithShelter:pelotonCost,
  costPremiumPercent:pelotonCost>0?100*(soloCost/pelotonCost-1):null,
  samePhysicalInputs:physicalInput}
}))
function race(enabled:boolean){
 const state=createInitialState(base)
 const actual=runCalibratedTerrainSeparationStage({
  ...state,groupShelterEnergyEnabled:enabled,
 },{
  experimentalPhysicalAttackLaunch:true,
  experimentalPreserveBirthTickDroppedGroups:true,
  experimentalPreserveRecedingDroppedGroups:true,
  experimentalPreserveTrailingAttackGroups:true,
  experimentalPreserveSeparatingBreakaways:true,
 })
 const chosen=actual.finalState.riders[selectedId]
 const finish=Object.values(actual.finalState.riders)
 const all=actual.ticks.flatMap(t=>t.appliedEnergy.applications)
 const chosenApps=all.filter(a=>a.riderId===selectedId)
 const soloApps=chosenApps.filter(a=>a.groupId!=='peloton_main')
 const pelotonApps=all.filter(a=>a.groupId==='peloton_main')
 const sum=(a:typeof all,metric:(x:typeof all[number])=>number)=>a.reduce((n,x)=>n+metric(x),0)
 const cost=(a:typeof all)=>sum(a,a=>a.energyCost)
 const shelteredSaved=(a:typeof all)=>sum(a,a=>a.shelterEnergySaved??0)
 const choseStart=actual.initialState.riders[selectedId].energy
 const sortedTimes=finish.map(r=>r.finishTimeSeconds??0).sort((a,b)=>a-b)
 return {
  mode:enabled?'shelter-on':'shelter-off',completed:actual.completed,
  finishers:finish.filter(r=>r.stageStatus==='finished').length,
  selectedPosition:chosen.finishPosition,
  selectedFinishSeconds:chosen.finishTimeSeconds,
  wholeFieldFinishSpreadSeconds:sortedTimes.at(-1)!-sortedTimes[0],
  elapsedTicks:actual.ticks.length,
  soloTicks:soloApps.length,
  selectedInitialEnergy:choseStart,selectedFinalEnergy:chosen.energy,
  selectedEnergySpent:choseStart-chosen.energy,
  selectedAppliedEnergyLedger:cost(chosenApps),
  selectedEnergyResidual:choseStart-chosen.energy-cost(chosenApps),
  soloEnergySpent:cost(soloApps),soloEnergySaved:shelteredSaved(soloApps),
  pelotonEnergySaved:shelteredSaved(pelotonApps),
  pelotonEnergySpent:cost(pelotonApps),
  chargedSoloShelterBonusNonzero:soloApps.some(a=>(a.shelterBonus??0)>0),
  chargedPelotonShelterBonusNonzero:pelotonApps.some(a=>(a.shelterBonus??0)>0),
  hasArtificialSurcharge:all.some(a=>(a.experimentalPullerEnergySurcharge??0)>0),
  selectedAttributes:{stamina:attributes.stamina,resistance:attributes.resistance,recovery:attributes.recovery},
 }
}
const disabled=race(false)
const enabled=race(true)
const checks={
 pairedIdenticalPhysicalInput:samples.length===9&&samples.every(x=>
  x.soloShelterPercent===0&&x.canonicalCost>0&&x.pelotonEnergyWithShelter<x.soloEnergyWithShelter),
 uphillShelterReduced:samples.filter(x=>x.gradient===8).every((x,i)=>
  x.pelotonShelterPercent<samples.filter(y=>y.gradient===0)[i].pelotonShelterPercent),
 bothActualRacesComplete:[disabled,enabled].every(x=>x.completed&&x.finishers===128),
 soloHasNoShelter:[disabled,enabled].every(x=>!x.chargedSoloShelterBonusNonzero&&x.soloEnergySaved===0),
 actualPelotonShelterSaved:enabled.pelotonEnergySaved>0&&
  enabled.chargedPelotonShelterBonusNonzero&&!disabled.chargedPelotonShelterBonusNonzero&&disabled.pelotonEnergySaved===0,
 energyConservation:[disabled,enabled].every(x=>Math.abs(x.selectedEnergyResidual)<1e-4),
 noSyntheticEffort:[disabled,enabled].every(x=>!x.hasArtificialSurcharge),
}
process.stdout.write(JSON.stringify({
 reportVersion:'uranius-matched-shelter-energy-v1',
 checks,samples,races:[disabled,enabled],
 caution:'Matched samples share attributes, speed, base speed, gradient and duration. Full-race toggles compare existing shelter option, not new physics; individual race speeds and times may differ.'
},null,2)+'\n')
