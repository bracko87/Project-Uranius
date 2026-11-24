// Run Uranius's existing TypeScript race engine in a private, OFFLINE Node bundle.
// No DB, network, authentication, service account, or production environment.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const args=process.argv.slice(2)
if(args.length>2 || (args.length && (args[0]!=='--out' || !args[1])))
 throw Error('Usage: node scripts/run-uranius-race-poc.mjs [--out path-to-local-json-report]')
const root=fileURLToPath(new URL('../',import.meta.url))
const scratch=mkdtempSync(join(tmpdir(),'uranius-race-poc-'))
const target=join(scratch,'offline-race-poc.mjs')
try{
 await build({
  entryPoints:[join(root,'scripts','uranius-race-poc-evaluate.ts')],
  outfile:target,bundle:true,platform:'node',format:'esm',
  target:'node20',external:[],logLevel:'warning'
 })
 const {spawnSync}=await import('node:child_process')
 const child=spawnSync(process.execPath,[target],{
  encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
    TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()},
  windowsHide:true
 })
 if(child.error)throw child.error
 if(child.status!==0)throw Error('Offline simulator returned failure: '+(child.stderr||child.stdout||'unknown').slice(0,1300))
 const report=JSON.parse(child.stdout)
 if(report.reportVersion!=='uranius-race-poc-v1'||!Array.isArray(report.scenarios)||
    report.scenarios.length!==6 || !Array.isArray(report.attacks)||report.attacks.length!==2)
  throw Error('Offline race report was incomplete or invalid')
 console.log('URANIUS RACE ENGINE POC — '+report.verdict)
 console.log('Six 30-km fictional runs, including two alternate seeds; two attack comparisons')
 console.log('Technical checks: '+JSON.stringify(report.technicalChecks))
 for(const row of report.scenarios){
  console.log([row.terrain,row.fieldSize+' riders',row.seed,
   row.winnerAverageKmh+' km/h average',row.finishSpreadSeconds+'s spread',
   row.maxActiveGroups+' max groups',row.runtimeMs+'ms',
   'warnings: '+(row.warningFlags.join('; ')||'none')].join(' | '))
 }
 for(const row of report.attacks)console.log('Attack '+row.scenario+': '+row.changeInFinishSeconds+'s finish time improvement, '+row.energyUsedDifference+' energy-use difference; peak '+row.peakGapKm+'km; '+(row.warningFlags.join('; ')||'no diagnostic warning'))
 console.log('Sporting warnings: '+(report.observedWarnings.join('; ')||'none; NOT real-world validated'))
 if(args.length){
  const out=resolve(args[1])
  writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'w',mode:0o600})
  console.log('Local report written to '+out)
 }else console.log('To save JSON: node scripts/run-uranius-race-poc.mjs --out race-poc-local.json')
 if(report.verdict==='TECHNICAL_NO_GO')process.exitCode=2
}finally{rmSync(scratch,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
