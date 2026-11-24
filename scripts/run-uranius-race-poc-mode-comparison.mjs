// Offline no-network launcher for the existing_v1 vs calibrated lane comparison.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0 && !(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-race-poc-mode-comparison.mjs [--out report.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-race-lanes-'))
try{
 const source=fileURLToPath(new URL('uranius-race-poc-mode-comparison.ts',import.meta.url))
 const outfile=join(dir,'comparison.mjs')
 await build({entryPoints:[source],outfile,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[outfile],{encoding:'utf8',maxBuffer:8e6,timeout:240000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
    TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error('Race comparison failed: '+(child.stderr||child.stdout||'unknown').slice(0,1600))
 const report=JSON.parse(child.stdout)
 if(report.reportVersion!=='uranius-race-mode-comparison-v1'||report.pairs.length!==5)
  throw Error('Expected five valid paired simulations')
 console.log('URANIUS CONTROLLED ENGINE COMPARISON — '+report.verdict)
 console.log('Identical 30km inputs and seeds in existing_v1 and terrain_separation_calibrated_v1.')
 for(const p of report.pairs){
  if(p.error){console.log('FAILED '+p.terrain+' '+p.fieldSize+' riders: '+p.error);continue}
  console.log([p.terrain,p.fieldSize+' riders',
    'existing '+p.existing.maxActiveGroups+' groups/'+p.existing.finishSpreadSeconds+'s spread',
    'calibrated '+p.calibrated.maxActiveGroups+' groups/'+p.calibrated.finishSpreadSeconds+'s spread',
    'runtime '+p.calibrated.runtimeMilliseconds+'ms',
    'calibrated warnings: '+(p.calibrated.issues.join(',')||'none')].join(' | '))
 }
 if(args.length){const dest=resolve(args[1]);writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved comparison JSON: '+dest)}
 else console.log('Use --out race-lane-comparison-local.json to save the complete results.')
 if(report.verdict==='TECHNICAL_INVESTIGATION_REQUIRED')process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
