import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const dir=mkdtempSync(join(tmpdir(),'uranius-mixed-tactics-'))
try{
 const entry=fileURLToPath(new URL('uranius-mixed-tactics-integration.ts',import.meta.url))
 const out=join(dir,'mixed.mjs')
 await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',
  target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:120000,
  maxBuffer:5000000,windowsHide:true,env:{PATH:process.env.PATH||'',
  SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
  TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.status!==0)throw Error((child.stderr||child.stdout||'Mixed POC failed').slice(0,4000))
 const report=JSON.parse(child.stdout)
 if(report.reportVersion!=='uranius-mixed-tactics-v1'||
  Object.values(report.checks).some(x=>x!==true))
  throw Error('Combined tactic correctness failed: '+JSON.stringify(report.checks))
 console.log('URANIUS MIXED TACTICS — OFFLINE')
 for(const r of [report.off,report.on])console.log(
  [r.enabled?'ALL-TACTICS':'DEFAULT-OFF','finishers '+r.totalRiders,
  'executed '+r.executedOrders.join(','),
  'attackEvents '+r.realAttackEvents,'chaseEligibleTicks '+r.chaseEligibleMovementTicks,
  'groups '+r.maxActiveGroups,'sprintRank '+r.sprinterRank,
  'sprintEnergy '+r.sprinterEnergy,'leadoutEnergy '+r.leadoutEnergy,
  'pursuerEnergy '+r.pursuerEnergy,'caught '+r.caughtAttack].join(' | '))
 console.log('Checks: '+JSON.stringify(report.checks))
 console.log('Observed (not assumed): '+JSON.stringify(report.comparison))
 console.log('ESTABLISHED BREAKAWAY '+JSON.stringify(report.establishedPhysicalComparison))
 console.log('PHYSICAL CHASE EVIDENCE '+JSON.stringify(report.physicalChaseEvidence))
 for(const [label,scenario] of [['ESTABLISHED CONTROL',report.establishedOff],['ESTABLISHED ALL-TACTICS',report.establishedOn]]){
  console.log(label+' | '+JSON.stringify({
   allFinished:scenario.allFinished,orders:scenario.executedOrders,
   chaseTraceCount:scenario.chaseTimeline.length,
   pursuerFinalEnergy:scenario.pursuerEnergy,sprintRank:scenario.sprinterRank,
  }))
  for(const tick of scenario.chaseTimeline.slice(0,4))
   console.log('ESTABLISHED CHASE PHYSICS '+label+' | '+JSON.stringify(tick))
 }
 if(!report.establishedPhysicalComparison||
  ['bothCompleted','bothClassified','allFourOrdersExecuted','eligibleChaseExists']
   .some(key=>report.establishedPhysicalComparison[key]!==true))
  throw Error('Established-breakaway integration gate failed: '+JSON.stringify(report.establishedPhysicalComparison))

 for(const [label,scenario] of [['CONTROL',report.off],['ALL-TACTICS',report.on]]){
  for(const step of scenario.chaseTimeline||[])
   console.log('CHASE PHYSICS '+label+' | '+JSON.stringify(step))
 }

 const i=process.argv.indexOf('--out')
 if(i>=0){
  const target=process.argv[i+1]
  if(!target)throw Error('--out requires filename')
  writeFileSync(target,JSON.stringify(report,null,2)+'\n','utf8')
  console.log('Saved: '+target)
 }
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
