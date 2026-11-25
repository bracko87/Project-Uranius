// Offline-only six-race leader availability and energy sensitivity; fail closed.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-early-reabsorption-mechanism.mjs [--out early-reabsorption-mechanism-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-early-reabsorption-mechanism-'))
try{
 const entry=fileURLToPath(new URL('uranius-early-reabsorption-mechanism.ts',import.meta.url))
 const bundled=join(dir,'early-reabsorption-mechanism.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:900000,
  maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Early reabsorption mechanism audit execution failed: '+(p.stderr||p.stdout).slice(0,4000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-early-reabsorption-mechanism-v1'||
   !Array.isArray(report.cases)||report.cases.length!==2||
   !report.checks||Object.values(report.checks).some(x=>x!==true))
   throw Error('Early reabsorption mechanism audit FAILED: '+JSON.stringify(report.checks)+'\n'+
    JSON.stringify(report.cases).slice(0,10000))
 console.log('URANIUS EARLY REABSORPTION — 8 VS 24 LEADERS')
 
 for(const r of report.cases)console.log('REAL RACE '+JSON.stringify(r))
 console.log('ALL E2E CHECKS '+JSON.stringify(report.checks))
 console.log('Audit only. Sporting release still NO GO. No production changes.')
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
