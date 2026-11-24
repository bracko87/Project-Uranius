import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const dir=mkdtempSync(join(tmpdir(),'uranius-chase-lifecycle-'))
try{
 const entry=fileURLToPath(new URL('uranius-chase-lifecycle.ts',import.meta.url))
 const out=join(dir,'lifecycle.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',
  target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:120000,maxBuffer:5000000,
  windowsHide:true,env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',
   WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error((child.stderr||child.stdout||'Lifecycle failed').slice(0,3500))
 const data=JSON.parse(child.stdout)
 if(data.reportVersion!=='uranius-chase-lifecycle-v1'||
  Object.values(data.checks).some(x=>x!==true))
  throw Error('Chase lifecycle integrity check failed: '+JSON.stringify(data.checks))
 console.log('URANIUS CHASE LIFECYCLE — OFFLINE')
 for(const r of data.results)console.log([
  r.ability.toUpperCase(),r.enabled?'CHASE':'CONTROL','ticks='+r.ticks,
  'caughtAtTick='+String(r.firstCatchTick),
  'breakawayActive='+r.breakawayStillActive,'lastActiveGapKm='+r.lastActiveGapKm,
  'riderEnergy='+r.actorEnergy,'realCatch='+String(r.physicalCatchEvidence)
 ].join(' | '))
 console.log('Checks '+JSON.stringify(data.checks))
 console.log('Comparison '+JSON.stringify(data.comparison))
 const outPath=process.argv.indexOf('--out')
 if(outPath>=0){
  const target=process.argv[outPath+1]
  if(!target)throw Error('--out requires a file path')
  writeFileSync(target,JSON.stringify(data,null,2)+'\n','utf8')
  console.log('Saved: '+target)
 }
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
