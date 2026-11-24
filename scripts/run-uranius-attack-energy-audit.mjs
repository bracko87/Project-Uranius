import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-attack-energy-audit.mjs [--out race-attack-energy-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-attack-energy-'))
try{
 const source=fileURLToPath(new URL('uranius-attack-energy-audit.ts',import.meta.url))
 const out=join(dir,'audit.mjs')
 await build({entryPoints:[source],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:90000,maxBuffer:8e6,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error('Attack audit failed: '+(child.stderr||child.stdout||'unknown').slice(0,1500))
 const report=JSON.parse(child.stdout)
 if(report.reportVersion!=='uranius-attack-energy-audit-v1'||report.results.length!==2)
  throw Error('Unexpected audit report')
 for(const p of report.results){
  console.log([p.scenario,'finish gain '+p.finishTimeGainedSeconds+'s',
   'extra total energy '+p.extraTotalEnergyUsed,'extra energy/min '+p.extraEnergyRatePerMinute,
   'history preserved '+p.historyIdentical,p.interpretation].join(' | '))
 }
 if(args.length){const target=resolve(args[1]);writeFileSync(target,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+target)}
 if(report.results.some(p=>!p.historyIdentical||!Number.isFinite(p.extraTotalEnergyUsed)||!Number.isFinite(p.extraEnergyRatePerMinute)))process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
