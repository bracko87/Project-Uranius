// Offline release-candidate verification. No install, network, database or deployment.
import {build} from 'esbuild'
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,relative,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const root=fileURLToPath(new URL('../',import.meta.url))
const args=process.argv.slice(2)
if(args.length!==0&&!(args.length===2&&args[0]==='--out'&&args[1]))
 throw Error('Usage: node scripts/run-uranius-final-race-regression.mjs [--out report.json]')
const ref='35b9e7b5e9d997af4cdf7215fae6c414ceaba729'
const paths=['src/race-engine/simulation/reconcileBreakawayGroups.ts',
 'src/race-engine/simulation/runIntegratedTerrainSeparationStage.ts']
const git=(a)=>{const p=spawnSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:12000000,windowsHide:true})
 if(p.error)throw p.error
 if(p.status!==0)throw Error('Git reference validation failed: '+p.stderr)
 return p.stdout}
const dir=mkdtempSync(join(tmpdir(),'uranius-final-race-regression-'))
const report={version:'uranius-final-race-regression-v1',referenceCommit:ref,head:git(['rev-parse','HEAD']).trim(),
 checks:{},golden:[],calibrated:[],integration:null,matrix:null,errors:[]}
const run=(script,params,timeout)=>{
 const p=spawnSync(process.execPath,[script,...params],{cwd:root,encoding:'utf8',timeout,maxBuffer:16000000,windowsHide:true})
 if(p.error)throw p.error
 return p
}
try{
 const changed=git(['diff','--name-only',ref,'--','src/race-engine']).trim().split(/\r?\n/).filter(Boolean).sort()
 if(JSON.stringify(changed)!==JSON.stringify([...paths].sort()))
  throw Error('Reference comparison scope changed: '+JSON.stringify(changed))
 const oldSources=new Map(paths.map(p=>[p,git(['show',ref+':'+p])]))
 // Bundle from current checkout; only the two verified modified engine sources
 // are replaced by exact git-object contents for the reference run.
 const referencePlugin={name:'local-git-reference',setup(b){
  b.onLoad({filter:/\.ts$/},a=>{
   const path=relative(root,a.path).replace(/\\/g,'/')
   if(oldSources.has(path))return {contents:oldSources.get(path),loader:'ts',resolveDir:dirname(a.path)}
  })
 }}
 const regression=async(mode)=>{
  const out=join(dir,mode+'.mjs')
  await build({entryPoints:[join(root,'scripts/uranius-frozen-race-regression.ts')],
   outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning',
   plugins:mode==='reference'?[referencePlugin]:[]})
  const p=run(out,[mode],240000)
  if(p.status!==0)throw Error(mode+' regression failed: '+(p.stderr||p.stdout).slice(0,6000))
  const result=JSON.parse(p.stdout)
  if(result.version!=='uranius-frozen-race-regression-v1'||result.mode!==mode||!Array.isArray(result.calibrated))
   throw Error('Malformed regression report')
  return result
 }
 console.log('PHASE 1/3: five frozen goldens and three calibrated reference comparisons')
 const current=await regression('current')
 const reference=await regression('reference')
 report.golden=current.golden
 const names=['micro-10','flat-24','hilly-48','mountain-96','flat-96']
 report.checks.fiveFrozenGoldens=Array.isArray(current.golden)&&current.golden.length===5&&
  names.every(n=>current.golden.filter(g=>g.name===n&&g.passed===true).length===1)
 report.calibrated=current.calibrated.map(c=>({current:c,reference:reference.calibrated.find(r=>r.name===c.name)}))
 report.checks.calibratedPreChangeParity=report.calibrated.length===3&&reference.calibrated.length===3&&
  names.slice(0,3).every(n=>report.calibrated.some(x=>x.current.name===n&&x.current.rosterOk===true&&
   x.reference?.rosterOk===true&&x.current.hash===x.reference.hash&&x.current.frames===x.reference.frames&&
   x.current.events===x.reference.events))
 for(const x of report.golden)console.log('GOLDEN '+JSON.stringify(x))
 for(const x of report.calibrated)console.log('CALIBRATED '+JSON.stringify(x))
 const runGate=(name,file,timeout)=>{
  const output=join(dir,name+'.json')
  const p=run(join(root,'scripts',file),['--out',output],timeout)
  if(p.status!==0)report.errors.push(name+': '+(p.stderr||p.stdout).slice(0,6000))
  try{return {exitCode:p.status,report:JSON.parse(readFileSync(output,'utf8'))}}
  catch(e){report.errors.push(name+' report unavailable: '+String(e));return {exitCode:p.status,report:null}}
 }
 console.log('PHASE 2/3: final integration and real finish-order checks')
 const integration=runGate('integration','run-uranius-physical-catch-integration.mjs',240000)
 report.integration=integration.report
 const ic=integration.report?.checks
 report.checks.integrationEleven=integration.exitCode===0&&ic&&Object.keys(ic).length===11&&Object.values(ic).every(x=>x===true)
 console.log('INTEGRATION '+JSON.stringify(ic??null))
 console.log('PHASE 3/3: eight full 128-rider candidate/control races after finish fix')
 const matrix=runGate('matrix','run-uranius-physical-catch-matrix.mjs',960000)
 report.matrix=matrix.report
 const mc=matrix.report?.checks
 report.checks.matrixThirteen=matrix.exitCode===0&&mc&&Object.keys(mc).length===13&&Object.values(mc).every(x=>x===true)
 const expected=[['flat-weak-early',126,126],['rolling-strong-late',1,1],['mountain-medium-early',123,1],['mountain-strong-late',1,1]]
 const races=matrix.report?.cases??[]
 report.checks.previousMatrixRankFingerprints=expected.every(([name,oldRank,newRank])=>
  races.some(c=>c.name===name&&c.physical===false&&c.attackerRank===oldRank)&&
  races.some(c=>c.name===name&&c.physical===true&&c.attackerRank===newRank))
 console.log('MATRIX '+JSON.stringify(mc??null))
 for(const c of races)console.log('CANDIDATE '+JSON.stringify({name:c.name,physical:c.physical,rank:c.attackerRank,
  finish:c.attackerFinishTime,catchCount:c.genuineCatches,prematureCatches:c.prematureCatches,finishers:c.finishers}))
}catch(e){report.errors.push(String(e))}
finally{
 if(args.length){const path=resolve(args[1]);writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('Saved: '+path)}
 rmSync(dir,{recursive:true,force:true,maxRetries:6,retryDelay:250})
}
console.log('FINAL CHECKS '+JSON.stringify(report.checks))
if(report.errors.length)console.error(report.errors.join('\n'))
const gates=['fiveFrozenGoldens','calibratedPreChangeParity','integrationEleven','matrixThirteen','previousMatrixRankFingerprints']
if(report.errors.length||gates.some(k=>report.checks[k]!==true))
 throw Error('Final candidate regression NOT PASSED. Inspect evidence. No release approval.')
console.log('PASS — 5/5 final gates. Candidate validated in offline scope; default OFF; sporting release still NO GO.')
