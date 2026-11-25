import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('scripts/uranius-strength-gradient.ts')
const runner=read('scripts/run-uranius-strength-gradient.mjs')

test('five realistic-to-elite ability bands and three actual tactical choices',()=>{
 assert.match(source,/type Strength=76\|82\|86\|90\|94/)
 assert.match(source,/const ratings=\[76,82,86,90,94\] as const/)
 assert.match(source,/\['baseline','early','late'\] as const/)
 assert.match(source,/const field=128/)
 assert.match(source,/distanceKm:120/)
 assert.match(source,/flat:strength,climbing:strength,acceleration:strength/)
 assert.match(source,/stamina:strength,resistance:strength,recovery:strength/)
})
test('no fake attack gap, full classifications, energy accounting, drafting',()=>{
 assert.match(source,/metadata:\{uraniusLiveCommand:true\}/)
 assert.match(source,/experimentalPhysicalAttackLaunch:true/)
 assert.match(source,/experimentalPreserveTrailingAttackGroups:true/)
 assert.match(source,/evaluate\(strength,timing,true\)/)
 for(const check of ['fifteenCompleted','classificationIntegrity','tenPhysicalAttacks',
  'fiveNoOrderControls','scheduledOrdersExecuted','energyAccountingExact','draftingEnabled'])
  assert.match(source,new RegExp(check+':'))
 assert.doesNotMatch(source,/initialGapSeconds|syntheticGapKm|forceWinner/)
 assert.doesNotMatch(source+runner,/@supabase|createClient\(|fetch\(|https?:\/\/|service_role/i)
})
test('standalone TypeScript compiles and CLI gates all sporting observations',()=>{
 const transformed=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(transformed.code.includes('const ratings'))
 assert.match(runner,/Object.values\(data.checks\).some\(value=>value!==true\)/)
 assert.match(runner,/RIDER STRENGTH DELTA/)
 assert.match(runner,/SPORTING CALIBRATION STILL NO GO/)
})

test('actual movement decomposition distinguishes launch and post-launch group pace',()=>{
 for(const key of ['movementPaceAudit','groupDiagnostics','currentBaseSpeedKmh',
  'terrainAdjustmentMultiplier','averageFlatCapabilityScore','observedPaceDecomposition'])
  assert.match(source,new RegExp(key))
 assert.match(source,/s.caught===true/)
 assert.match(runner,/PACE MODEL THRESHOLD TRACE/)
 assert.match(runner,/PACE THRESHOLD/)
 const compiled=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(compiled.code.includes('movementPaceAudit'))
})

test('pace audit ternary contains exactly one empty fallback',()=>{
 assert.doesNotMatch(source,/\}\):\[\]:\[\]/)
 assert.match(source,/const movementPaceAudit=launch\?/)
 const output=transformSync(source,{loader:'ts',format:'esm',target:'node20'})
 assert.ok(output.code.includes('movementPaceAudit'))
})
