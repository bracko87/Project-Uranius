// Isolated, read-only 120km attack sustainability matrix.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-attack-sustainability.mjs [--out attack-sustainability-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-attack-sustain-'))
try{
 const entry=fileURLToPath(new URL('uranius-attack-sustainability.ts',import.meta.url))
 const bundled=join(dir,'attack-sustainability.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:900000,
  maxBuffer:15000000,windowsHide:true,env:{
   PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',
   WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),
   TMP:process.env.TMP||tmpdir(),
  }})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Offline attack-sustainability process failed: '+
  (p.stderr||p.stdout||'unknown').slice(0,2500))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-attack-sustainability-v1'||
  Object.values(report.checks).some(x=>x!==true))
  throw Error('Offline attack-sustainability gate failed: '+JSON.stringify(report.checks)+
   '\n'+JSON.stringify(report.scenarios.filter(s=>s.error)))
 console.log('URANIUS ATTACK SUSTAINABILITY — SIX OFFLINE 120KM/128-RIDER RACES')
 for(const r of report.scenarios){
  console.log([r.strength,r.timing,'finished '+r.all128Finish,
   'orderEffects '+r.attackEffects,'attackSecond '+r.attackSecond,
   'source '+r.initialGroupType,'launchKmh '+r.launchSpeedKmh,
   'firstKmh '+r.firstMovementAttackKmh,
   'secondKmh '+r.secondMovementAttackKmh,
   'pelotonSecondKmh '+r.secondMovementPelotonKmh,
   'positiveTicks '+r.positiveGapTicks,
   'peakLeadKm '+r.peakPositiveGapKm,'caught '+r.caught,
   'catchSecond '+r.catchSecond,
   'selectedRank '+r.selectedRank,'selectedFinishSec '+r.selectedFinishSeconds,
   'selectedEnergy '+r.selectedFinalEnergy,
   'hash '+r.digest].join(' | '))
  if(r.attackEffects)console.log('ATTACK TRACE '+r.strength+' '+r.timing+
   ' | '+JSON.stringify(r.firstFiveTrace))
 }
 console.log('TECHNICAL CHECKS '+JSON.stringify(report.checks))
 for(const strength of ['original','strong']){
  const baseline=report.scenarios.find(s=>s.strength===strength&&s.timing==='baseline')
  for(const timing of ['early','late']){
   const comparison=report.scenarios.find(s=>s.strength===strength&&s.timing===timing)
   console.log('AGAINST NO-ORDER '+strength+' '+timing+' | '+JSON.stringify({
    finishTimeAdvantageSeconds:baseline.selectedFinishSeconds-comparison.selectedFinishSeconds,
    extraEnergySpent:baseline.selectedFinalEnergy-comparison.selectedFinalEnergy,
    rankImprovement:baseline.selectedRank-comparison.selectedRank,
   }))
  }
 }
 if(args.length){
  const path=resolve(args[1])
  writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600})
  console.log('Saved: '+path)
 }
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
