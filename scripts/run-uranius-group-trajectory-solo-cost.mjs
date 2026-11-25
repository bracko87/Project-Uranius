// Offline-only 128-rider mountain group / solo energy audit; fail closed.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-group-trajectory-solo-cost.mjs [--out group-trajectory-solo-cost-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-group-trajectory-solo-cost-'))
try{
 const entry=fileURLToPath(new URL('uranius-group-trajectory-solo-cost.ts',import.meta.url))
 const bundled=join(dir,'group-trajectory-solo-cost.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:900000,
  maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Group trajectory and solo energy audit execution failed: '+(p.stderr||p.stdout).slice(0,4000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-group-trajectory-solo-cost-v1'||
   Object.values(report.checks).some(x=>x!==true))
   throw Error('Group trajectory and solo energy audit FAILED: '+JSON.stringify(report.checks)+'\n'+
    JSON.stringify({mountain:report.mountain,solo:report.solo}).slice(0,10000))
 console.log('URANIUS GROUP TRAJECTORY AND SOLO ENERGY AUDIT — 2 RACES')
 console.log('MOUNTAIN DROPPED GROUPS '+JSON.stringify(report.mountain))
 console.log('SOLO ENERGY '+JSON.stringify(report.solo))
 console.log('ALL E2E CHECKS '+JSON.stringify(report.checks))
 console.log('Audit only. Sporting release still NO GO. No production changes.')
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
