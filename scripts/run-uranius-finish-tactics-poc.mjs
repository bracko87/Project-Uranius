import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const dir=mkdtempSync(join(tmpdir(),'uranius-finish-tactics-'))
try{
 const entry=fileURLToPath(new URL('uranius-finish-tactics-poc.ts',import.meta.url))
 const out=join(dir,'finish-tactics.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:120000,maxBuffer:3000000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error('Finish tactics POC failed: '+(child.stderr||child.stdout||'unknown').slice(0,3000))
 const data=JSON.parse(child.stdout)
 if(data.reportVersion!=='uranius-finish-tactics-poc-v1'||!data.comparison.valid||
    !data.comparison.bothOrdersExecuted)throw Error('Finished state or order integrity failed: '+JSON.stringify(data.comparison))
 console.log('URANIUS FINISH TACTICS — OFFLINE 10 RIDERS')
 for(const p of [data.off,data.on])console.log([
  p.enabled?'OPT-IN':'DEFAULT-OFF','rank '+p.selectedPosition,'time '+p.selectedTime,
  'sprinterEnergy '+p.selectedEnergy,'leadoutEnergy '+p.leadoutEnergy,
  'executed '+p.ordersExecuted.join(',')].join(' | '))
 console.log('COMPARISON '+JSON.stringify(data.comparison))
 if(!data.comparison.selectedRankImproved||data.comparison.selectedEnergyCost<=0||
    data.comparison.helperEnergyCost<=0||!data.comparison.selectedOfficialTimeUnchanged)
   process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
