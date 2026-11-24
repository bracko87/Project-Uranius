// Runs per-tick calibrated hold/pressure diagnostics fully offline.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-race-pressure-trace.mjs [--out race-pressure-trace-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-pressure-trace-'))
try{
 const entry=fileURLToPath(new URL('uranius-race-pressure-trace.ts',import.meta.url))
 const out=join(dir,'pressure-trace.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const run=spawnSync(process.execPath,[out],{
  encoding:'utf8',maxBuffer:12e6,timeout:240000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',
   WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),
   TMP:process.env.TMP||tmpdir()},
 })
 if(run.error)throw run.error
 if(run.status!==0)throw Error('Calibrated trace failed: '+(run.stderr||run.stdout||'unknown').slice(0,1400))
 const report=JSON.parse(run.stdout)
 if(report.reportVersion!=='uranius-pressure-trace-v1'||report.results.length!==3)
  throw Error('Unexpected pressure-trace result shape')
 console.log('URANIUS CALIBRATED PRESSURE TRACE — offline, synthetic only')
 for(const p of report.results){
  if(p.error){console.log('ERROR '+p.scenario+' '+p.error);continue}
  console.log([p.scenario,p.fieldSize+' riders',
   'cannotHold '+p.holdEvaluations.cannot_hold,
   'ridersAffected '+p.ridersEverCannotHold,
   'longestPressure '+p.maxCannotHoldStreakSeconds+'s',
   'eligibleEvents '+p.eligibleWindowEvents,
   'transitions '+p.transitions,
   'reabsorbedSameTick '+p.sameTickTransitionReabsorptions,
   'survivingDrops '+p.transitionGroupsSurvivingReconcile,
   'ridersBackInPeloton '+p.transitionRidersBackInPelotonSameTick+'/'+p.totalTransitionRiders,
   'groupsBeforeAfterReconcile '+p.maxActiveGroupsBeforeReconcile+'/'+p.maxActiveGroupsAfterReconcile,
   'groups '+p.maxActiveGroups,
   'finishSpread '+p.finishSpreadSeconds+'s',
   'signal '+p.signal].join(' | '))
 }
 if(args.length){const target=resolve(args[1]);writeFileSync(target,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Report saved: '+target)}
 else console.log('Use --out race-pressure-trace-local.json for full per-tick samples')
 if(report.results.some(p=>p.error))process.exitCode=2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
