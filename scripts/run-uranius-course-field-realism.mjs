// Strict offline profile x field sporting diagnosis: no hosted writes.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-course-field-realism.mjs [--out course-field-local.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-course-field-'))
try{
 const entry=fileURLToPath(new URL('uranius-course-field-realism.ts',import.meta.url))
 const compiled=join(dir,'course-field.mjs')
 await build({entryPoints:[entry],outfile:compiled,bundle:true,platform:'node',
  format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[compiled],{
  encoding:'utf8',timeout:900000,maxBuffer:16000000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',
   WINDIR:process.env.WINDIR||'',TEMP:process.env.TEMP||tmpdir(),
   TMP:process.env.TMP||tmpdir()}})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Course-field execution error: '+(p.stderr||p.stdout||'unknown').slice(0,2200))
 const report=JSON.parse(p.stdout)
 if(report.reportVersion!=='uranius-course-field-realism-v1'||
  Object.values(report.checks).some(value=>value!==true))
  throw Error('Course-field technical gate failed: '+JSON.stringify(report.checks)+
   '\n'+JSON.stringify(report.scenarios.filter(s=>s.error)))
 console.log('URANIUS COURSE/FIELD REALISM — OFFLINE — EIGHT 128-RIDER RACES')
 for(const r of report.scenarios)console.log([
  r.profile,r.distribution,r.distanceKm+'km',
  'finishers '+r.finishers+'/'+r.fieldSize,'ticks '+r.ticks,
  'winnerKmH '+r.winnerAverageKmh,'spreadSeconds '+r.finishSpreadSeconds,
  'attackEvents '+r.attackEvents,'attackGapTicks '+r.attackPositiveGapTicks,
  'attackPeakGapKm '+r.attackPeakGapKm,'caught '+r.attackCaught,
  'terrainUphillMax '+r.profileMaxUphillGradientPercent+'%',
  'cannotHold '+r.cannotHoldEvaluationCount+
  ' ('+r.cannotHoldDistinctRiders+' riders)',
  'pressureMaxSec '+r.maxSeparationPressureSeconds,
  'terrainDrops '+r.terrainDropsCreated+
  ' sameTickCaught '+r.terrainDropsCaughtSameTick+
  ' laterCaught '+r.terrainDropsLaterCaught,
  'uniqueFinishTimes '+r.finishingTimeUniqueCount,
  'energyRange '+JSON.stringify(r.riderEnergyRange),
  'catchSecond '+r.attackCatchSecond,
  'peakGroups '+r.activeGroupPeak,
  'winnerAttributes '+JSON.stringify(r.winnerAttributes),
  'hash '+r.classificationHash].join(' | '))
 for(const r of report.scenarios.filter(s=>s.profile==='steep_160')){
  console.log('STEEP ATTACK LAUNCH '+r.distribution+' | '+JSON.stringify(r.attackLaunchAudit))
  console.log('STEEP TERRAIN DROP FATE '+r.distribution+' | '+JSON.stringify(r.terrainDropAudit))
 }
 console.log('TRAILING ATTACK PHYSICAL CATCH CONTROL | '+JSON.stringify(
  report.scenarios.find(r=>r.profile==='steep_160'&&r.distribution==='heterogeneous')?.attackLaunchAudit?.[0]))
 console.log('TRAILING ATTACK PHYSICAL CATCH PROTECTED | '+JSON.stringify({
  finishers:report.trailingAttackProtected.finishers,
  finished:report.trailingAttackProtected.completed,
  attackCaught:report.trailingAttackProtected.attackCaught,
  positiveGapTicks:report.trailingAttackProtected.attackPositiveGapTicks,
  attackLaunch:report.trailingAttackProtected.attackLaunchAudit?.slice(0,4),
  finishSpreadSeconds:report.trailingAttackProtected.finishSpreadSeconds,
  distinctTimes:report.trailingAttackProtected.finishingTimeUniqueCount,
 }))
 console.log('TECHNICAL CHECKS '+JSON.stringify(report.checks))
 console.log('SPORTING EVIDENCE IS OBSERVATIONAL; NO GO REMAINS')
 if(args.length){
  const target=resolve(args[1])
  writeFileSync(target,JSON.stringify(report,null,2)+'\n',{mode:0o600})
  console.log('Saved: '+target)
 }
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
