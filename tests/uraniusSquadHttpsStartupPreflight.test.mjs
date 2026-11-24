import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const src=readFileSync(new URL('../scripts/run-uranius-hosted-smoke.mjs',import.meta.url),'utf8')
const launcher=readFileSync(new URL('../scripts/run-approved-overview-https-windows.ps1',import.meta.url),'utf8')
test('local HTTPS preflight verifies assets and bundles before any secrets',()=>{
 assert.match(src,/--offline-preflight/)
 assert.match(src,/startupStage = 'local-css-processing'/)
 assert.match(src,/startupStage = 'local-react-bundle'/)
 assert.match(src,/PASS local HTTPS Squad startup preflight/)
 assert.ok(src.indexOf("if (process.argv[2] === '--offline-preflight') return") <
  src.indexOf("privatePrompt('Uranius smoke-reader password')"))
})
test('start failures expose limited stage names but not raw credential errors',()=>{
 assert.match(src,/startupStage = 'private-credential-input'/)
 assert.match(src,/startupStage = 'local-https-listener'/)
 assert.match(src,/startup failed at stage: ' \+ startupStage/)
 assert.doesNotMatch(src,/console\.error\(error\.stack\)/)
})
test('Windows HTTPS launcher stops at offline preflight before password prompts',()=>{
 const pre=launcher.indexOf('& node $runner --offline-preflight')
 const live=launcher.indexOf('& node $runner --reviewed-hosted-smoke')
 assert.ok(pre>0 && live>pre)
 assert.match(launcher,/No passwords requested/)
})
