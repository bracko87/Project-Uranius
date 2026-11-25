// Offline-only 128-rider funded-chase proof; fail closed.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-funded-leadership-e2e.mjs [--out funded-leadership-e2e-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-funded-leadership-'))
try{
 const entry=fileURLToPath(new URL('uranius-funded-leadership-e2e.ts',import.meta.url))
 const bundled=join(dir,'funded-leadership.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:900000,
  maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Funded-chase execution failed: '+(p.stderr||p.stdout).slice(0,4000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-funded-peloton-leadership-e2e-v1'||
   Object.values(report.checks).some(x=>x!==true))
   throw Error('Funded chase proof FAILED: '+JSON.stringify(report.checks)+'\n'+
    JSON.stringify(report.cases).slice(0,10000))
 console.log('URANIUS FUNDED PELOTON LEADERSHIP — 3 MATCHED 128-RIDER RACES')
 for(const c of report.cases)
  console.log('LEADERSHIP CASE '+c.mode+' | '+JSON.stringify(c))
 console.log('ALL E2E CHECKS '+JSON.stringify(report.checks))
 console.log('Sporting release still NO GO. Experiment remains default OFF.')
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
