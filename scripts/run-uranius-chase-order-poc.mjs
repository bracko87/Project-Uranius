import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const dir=mkdtempSync(join(tmpdir(),'uranius-chase-poc-'))
try{
 const entry=fileURLToPath(new URL('uranius-chase-order-poc.ts',import.meta.url))
 const out=join(dir,'chase-poc.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:120000,maxBuffer:3000000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error((child.stderr||child.stdout||'Chase POC exited unsuccessfully').slice(0,3000))
 const report=JSON.parse(child.stdout)
 if(report.reportVersion!=='uranius-chase-order-poc-v1'||Object.values(report.comparison).some(v=>v!==true))
  throw Error('Chase experimental integrity or physical outcome failed: '+JSON.stringify(report.comparison))
 console.log('URANIUS CHASE POC — OFFLINE')
 for(const result of [report.control,report.experiment])
  console.log([result.enabled?'CHASE':'CONTROL',
   'peloton '+result.pelotonSpeedKmh,'breakaway '+result.breakawaySpeedKmh,
   'gapKm '+result.gapKm,'actorEnergy '+result.actorEnergy,
   'order '+result.orderStatus].join(' | '))
 console.log('Verified: '+Object.entries(report.comparison).map(([k,v])=>k+'='+v).join(' | '))
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
