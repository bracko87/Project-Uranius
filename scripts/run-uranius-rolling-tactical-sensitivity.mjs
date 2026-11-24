import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-rolling-tactical-sensitivity.mjs [--out tactical-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-tactical-'))
try{
 const entry=fileURLToPath(new URL('uranius-rolling-tactical-sensitivity.ts',import.meta.url))
 const out=join(dir,'tactical.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:240000,maxBuffer:9e6,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Tactical sensitivity failed: '+(p.stderr||p.stdout||'unknown').slice(0,2000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-rolling-tactical-sensitivity-v1'||!report.baseline.valid||!report.attacked.valid)
  throw Error('Tactical scenarios failed classification integrity')
 console.log('URANIUS ROLLING TACTICAL SENSITIVITY — OFFLINE')
 for(const v of [report.baseline,report.attacked]){
  console.log([v.withAttack?'ATTACK':'CONTROL','finishers '+v.finishers,
   'groups '+v.groups,'gapKm '+v.peakGapKm,'spread '+v.finishSpreadSeconds+'s',
   'attackEvents '+v.attackEventCount,'orderEvents '+v.executedOrderCount,
   'riderPos '+v.selectedFinishPosition,'riderFinish '+v.selectedFinishSeconds,
   'riderEnergy '+v.selectedFinalEnergy].join(' | '))
 }
 console.log('Changed outcome '+report.comparison.changedFinalState+' | accepted tactical event '+report.comparison.attackWasExecuted)
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
 if(!report.comparison.attackWasExecuted)process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
