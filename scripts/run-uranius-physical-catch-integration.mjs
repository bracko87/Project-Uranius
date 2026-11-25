// Offline-only, fail-closed, no database dependencies.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-physical-catch-integration.mjs [--out report.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-physical-catch-integration-'))
try{
 const entry=fileURLToPath(new URL('uranius-physical-catch-integration.ts',import.meta.url))
 const bundled=join(dir,'integration.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled],{encoding:'utf8',timeout:180000,maxBuffer:8000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Integration execution failed: '+(p.stderr||p.stdout).slice(0,6000))
 const report=JSON.parse(p.stdout)
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
 console.log(JSON.stringify(report,null,2))
 const gates=['independentTrueWithoutBirth','omittedAndFalseSame','defaultFullStageUnchanged',
  'cooperativeBreakawaysMerge','distantTrailingAttackPreserved','actualCatchWithoutOtherMerge',
  'unfinishedGroupNotTeleportedToFinish','earlierFinishProtectedLaterCatch','exactFinishTieStillCaught',
  'realEarlierCrossingWins','fixturesImmutable']
 if(report.reportVersion!=='uranius-physical-catch-integration-v1'||!report.checks||
  Object.keys(report.checks).length!==gates.length||gates.some(g=>report.checks[g]!==true))
  throw Error('Physical catch integration NOT PASSED. Inspect report. No release approval.')
 console.log('PASS — '+gates.length+'/'+gates.length+' integration checks. Default OFF. Sporting release still NO GO.')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
