// Standalone isolated offline long-stage diagnostic; never writes hosted state.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-long-stage-diagnostic.mjs [--out race-long-stage-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-long-poc-'))
try{
 const entry=fileURLToPath(new URL('uranius-long-stage-diagnostic.ts',import.meta.url))
 const bundled=join(dir,'long-stage.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const run=spawnSync(process.execPath,[bundled],{
  encoding:'utf8',maxBuffer:16e6,timeout:900000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()},
 })
 if(run.error)throw run.error
 if(run.status!==0)throw Error('Offline long-stage run failed: '+(run.stderr||run.stdout||'unknown').slice(0,1600))
 const report=JSON.parse(run.stdout)
 if(report.reportVersion!=='uranius-long-stage-diagnostic-v1'||report.results.length!==8)
  throw Error('Unexpected long-stage report shape')
 console.log('URANIUS LONG-STAGE DIAGNOSTIC — offline synthetic only (NOT sporting approval)')
 for(const p of report.results){
  if(p.error){console.log('ERROR '+p.course+' '+p.seed+' '+p.experiment+': '+p.error);continue}
  console.log([p.course,p.seed,p.experiment,p.fieldSize+' riders',p.distanceKm+'km',
   'finishers '+p.finishers+'/'+p.fieldSize,'groups '+p.maxGroups,
   'gap '+p.finishSpreadSeconds+'s','peakKm '+p.peakGapKm,
   'transitions '+p.transitions,'born '+p.createdTransitions,
   'sameTickCaught '+p.reabsorbedSameTick,'laterCaught '+p.laterReabsorbedGroups,
   'survivedBirth '+p.survivingNewDropTransitions,
   'multiTicks '+p.multiGroupTicks,'positiveGapTicks '+p.positiveGapTicks,
   'peakTickGapKm '+p.peakTickSpatialGapKm,
   'speed '+p.winnerAverageKmh+'km/h',
   'ms '+p.runtimeMs,'technical '+(p.technicalIssues.join(',')||'none'),
   'sporting '+(p.sportingWarnings.join(',')||'none')].join(' | '))
 }
 if(args.length){const target=resolve(args[1]);writeFileSync(target,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved report: '+target)}
 if(report.results.some(p=>p.error||p.technicalIssues.length))process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
