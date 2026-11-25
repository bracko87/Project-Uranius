// Offline-only: bundle the real engine; preserve failed evidence before exiting nonzero.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const args=process.argv.slice(2)
const boundaryOnly=args[0]==='--boundary-only'
if(boundaryOnly)args.shift()
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-physical-catch-matrix.mjs [--boundary-only] [--out report.json]')
const dir=mkdtempSync(join(tmpdir(),'uranius-physical-catch-matrix-'))
try{
 const entry=fileURLToPath(new URL('uranius-physical-catch-matrix.ts',import.meta.url))
 const bundled=join(dir,'physical-catch-matrix.mjs')
 await build({entryPoints:[entry],outfile:bundled,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const p=spawnSync(process.execPath,[bundled,...(boundaryOnly?['--boundary-only']:[])],{
  encoding:'utf8',timeout:900000,maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Matrix execution failed: '+(p.stderr||p.stdout).slice(0,6000))
 const report=JSON.parse(p.stdout)
 const names=['legacyProximityCatch','positiveDistancePreserved','equalityAndOvertakeRejoin','validMembershipAndIdempotence',
  ...(!boundaryOnly?['allEightRacesComplete','allAttacksActuallyLaunch','paidAuthorizedChase','leaderLedgerConservation',
   'noPrematurePhysicalCatch','actualNonFinishPhysicalCrossingObserved','noStrandedCrossedGroups',
   'catchesHaveValidMembership','physicalPreservationObserved']:[])]
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
 for(const b of report.boundaries??[])console.log('BOUNDARY '+JSON.stringify(b))
 for(const c of report.cases??[])console.log('REAL RACE '+JSON.stringify(c))
 console.log('ALL CHECKS '+JSON.stringify(report.checks))
 const expectedScenarios=['flat-weak-early','rolling-strong-late','mountain-medium-early','mountain-strong-late']
 const validCases=Array.isArray(report.cases)&&report.cases.length===(boundaryOnly?0:8)&&
  (boundaryOnly||expectedScenarios.every(name=>[true,false].every(physical=>report.cases.filter(c=>c.name===name&&c.physical===physical).length===1)))
 if(report.reportVersion!=='uranius-physical-catch-matrix-v1'||report.boundaryOnly!==boundaryOnly||
  !Array.isArray(report.boundaries)||report.boundaries.length!==5||!validCases||
  !report.checks||Object.keys(report.checks).length!==names.length||names.some(n=>report.checks[n]!==true))
  throw Error('Physical catch validation NOT PASSED; inspect saved evidence and ALL CHECKS. No release approval.')
 console.log('PASS — '+names.length+'/'+names.length+' checks. Experimental rule remains default OFF. Sporting release still NO GO.')
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})}
