// Offline-only focused geometry regression: compile to disposable local bundle.
import {build} from 'esbuild'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
const dir=mkdtempSync(join(tmpdir(),'uranius-reconcile-poc-'))
try{
 const source=fileURLToPath(new URL('uranius-receding-catch-regression.ts',import.meta.url))
 const out=join(dir,'reconcile.mjs')
 await build({entryPoints:[source],outfile:out,bundle:true,platform:'node',format:'esm',target:'node20',logLevel:'warning'})
 const child=spawnSync(process.execPath,[out],{encoding:'utf8',timeout:30000,windowsHide:true,
  env:{PATH:process.env.PATH||'',SYSTEMROOT:process.env.SYSTEMROOT||'',WINDIR:process.env.WINDIR||'',
   TEMP:process.env.TEMP||tmpdir(),TMP:process.env.TMP||tmpdir()}})
 if(child.error)throw child.error
 if(child.stdout)process.stdout.write(child.stdout)
 if(child.stderr)process.stderr.write(child.stderr)
 if(child.status!==0)process.exitCode=child.status||2
}finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:250})}
