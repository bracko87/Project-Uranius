import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-long-mixed-tactics-poc.mjs [--out long-mixed-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-long-mixed-'))
try{
 const entry=fileURLToPath(new URL('uranius-long-mixed-tactics-poc.ts',import.meta.url))
 const out=join(dir,'long-mixed.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:900000,
  maxBuffer:9000000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',
   WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),
   TMP:process.env.TMP||tmpdir()}})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Long mixed offline execution failed: '+(p.stderr||p.stdout||'unknown').slice(0,3000))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-long-mixed-tactics-v1'||
  Object.values(report.checks).some(value=>value!==true))
  throw Error('Long mixed tactical integrity failed: '+JSON.stringify(report.checks))
 console.log('URANIUS LONG MIXED TACTICS — 120KM 128 RIDERS OFFLINE')
 for(const r of [report.control,report.experiment])
  console.log([r.enabled?'ALL-TACTICS':'CONTROL','finishers '+r.finishers,
   'ticks '+r.ticks,'groups '+r.peakActiveGroupCount,
   'attackEvents '+r.attackCount,'chaseEligibleTicks '+r.eligibleChaseTicks,
   'orders '+r.ordersExecuted.join(','),
   'sprinterRank '+r.sprinterRank,'pursuerEnergy '+r.pursuerEnergy,
   'pursuerFinishSeconds '+r.pursuerFinishSeconds,
   'pursuerMovementCost '+r.pursuerMovementCost,
   'hash '+r.hash].join(' | '))
 console.log('CHECKS '+JSON.stringify(report.checks))
 console.log('OBSERVED '+JSON.stringify(report.observations))
 for(const r of [report.control,report.experiment]){
  console.log('LONG CHASE DURATION '+(r.enabled?'EXPERIMENT':'CONTROL')+' | '+JSON.stringify({
   eligibleTicks:r.eligibleChaseTicks,actualBoostTicks:r.actualChaseBoostTicks,
   boostedAfterOrderWindow:r.actualChaseBoostTicksAfterExpiry,
   first:r.firstChaseBoost,last:r.lastChaseBoost}))
  console.log('SPRINT FINISH CONTEXT '+(r.enabled?'EXPERIMENT':'CONTROL')+' | '+JSON.stringify({
   rank:r.sprinterRank,finishGroupSize:r.sprinterFinishGroupSize,
   placeInsideGroup:r.sprinterWithinGroupPosition,
   attributes:r.sprinterStrength}))
 }

 if(args.length){
  const target=resolve(args[1])
  writeFileSync(target,JSON.stringify(report,null,2)+'\n',{mode:0o600})
  console.log('Saved: '+target)
 }
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
