import assert from 'node:assert/strict'
import {test} from 'node:test'
import {build} from 'esbuild'
import {fileURLToPath} from 'node:url'
const root=new URL('../',import.meta.url)
test('real HTTPS Squad client compiles and bundles with original Login page',async()=>{
 const output=await build({
  absWorkingDir:fileURLToPath(root),
  entryPoints:[fileURLToPath(new URL('database/synthetic-world/hosted-smoke-client.tsx',root))],
  bundle:true,write:false,platform:'browser',logLevel:'silent',
  plugins:[{name:'uranius-local-auth',setup(api){
   api.onResolve({filter:/(?:lib\/supabase|^\.\/supabase)$/},()=>({
    path:fileURLToPath(new URL('database/synthetic-world/login-db-transport.ts',root))
   }))
  }}]
 })
 assert.ok(output.outputFiles[0].contents.length>0)
 const js=output.outputFiles[0].text
 assert.match(js,/Squad data is unavailable/)
 assert.match(js,/syntheticSquadPreview/)
 assert.match(js,/Climbing/)
 assert.match(js,/Race Results & Replay/)
 assert.match(js,/Recorded race replay/)
 assert.match(js,/Final classification/)
})
