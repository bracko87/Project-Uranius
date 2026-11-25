// Offline-only 128-rider mountain terrain audit; fail closed.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-mountain-terrain-audit.mjs [--out mountain-terrain-audit-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-mountain-terrain-audit-'))
try{
 const entry=fileURLToPath(new URL('uranius-mountain-terrain-audit.ts',import.meta.url))
 const bundled=join(dir,'mountain-terrain-audit.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:900000,
  maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Mountain terrain audit execution failed: '+(p.stderr||p.stdout).slice(0,4000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-mountain-terrain-audit-v1'||
   Object.values(report.checks).some(x=>x!==true))
   throw Error('Mountain terrain audit FAILED: '+JSON.stringify(report.checks)+'\n'+
    JSON.stringify(report.scenarios).slice(0,10000))
 console.log('URANIUS MOUNTAIN VS ROLLING TERRAIN AUDIT — 2 NO-ORDER 128-RIDER RACES')
 for(const s of report.scenarios)console.log('TERRAIN SCENARIO '+s.route+' | '+JSON.stringify(s))
 console.log('ALL E2E CHECKS '+JSON.stringify(report.checks))
 console.log('Audit only. Sporting release still NO GO. No production changes.')
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
