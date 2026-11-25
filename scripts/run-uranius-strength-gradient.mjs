// Offline rider-strength threshold diagnosis. No hosted execution.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-strength-gradient.mjs [--out strength-gradient-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-strength-gradient-'))
try{
 const input=fileURLToPath(new URL('uranius-strength-gradient.ts',import.meta.url))
 const output=join(dir,'gradient.mjs')
 await build({entryPoints:[input],outfile:output,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[output],{encoding:'utf8',timeout:900000,
  maxBuffer:15000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Gradient runner failed: '+(p.stderr||p.stdout||'unknown').slice(0,3000))
 const data=JSON.parse(p.stdout)
 if(data.reportVersion!=='uranius-strength-gradient-v1'||
  Object.values(data.checks).some(value=>value!==true))
  throw Error('Gradient gate failed: '+JSON.stringify(data.checks)+' '+JSON.stringify(
   data.scenarios.filter(s=>s.error)))
 console.log('URANIUS STRENGTH GRADIENT — 15 REAL 120KM/128-RIDER SIMULATIONS')
 for(const r of data.scenarios)
  console.log([r.strength,r.timing,'rank '+r.selectedRank,
   'finishSeconds '+r.selectedFinishSeconds,'energy '+r.selectedFinalEnergy,
   'attackEvents '+r.attackEffects,'positiveTicks '+r.positiveGapTicks,
   'peakGapKm '+r.peakPositiveGapKm,'caught '+r.caught,
   'energyCost '+r.effortAudit.actualEnergyCost,
   'shelterSaved '+r.effortAudit.shelterSaved,
   'finishSpreadSeconds '+r.stageFinishSpreadSeconds,'hash '+r.digest].join(' | '))
 for(const rating of data.ratings){
  const baseline=data.scenarios.find(s=>s.strength===rating&&s.timing==='baseline')
  for(const timing of ['early','late']){
   const trial=data.scenarios.find(s=>s.strength===rating&&s.timing===timing)
   console.log('RIDER STRENGTH DELTA '+rating+' '+timing+' | '+JSON.stringify({
    rankImprovement:baseline.selectedRank-trial.selectedRank,
    timeImprovementSeconds:baseline.selectedFinishSeconds-trial.selectedFinishSeconds,
    extraEnergySpent:baseline.selectedFinalEnergy-trial.selectedFinalEnergy,
    attackSurvived:!trial.caught,
    positiveGapTicks:trial.positiveGapTicks,
    peakGapKm:trial.peakPositiveGapKm,
   }))
  }
 }
 console.log('PACE MODEL THRESHOLD TRACE — FIRST THREE TICKS')
 for(const r of data.scenarios.filter(s=>s.timing!=='baseline'))
  console.log('PACE THRESHOLD '+r.strength+' '+r.timing+' | '+
   JSON.stringify(r.movementPaceAudit))
 console.log('TECHNICAL CHECKS '+JSON.stringify(data.checks))
 console.log('SPORTING CALIBRATION STILL NO GO; comparisons observational')
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(data,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
