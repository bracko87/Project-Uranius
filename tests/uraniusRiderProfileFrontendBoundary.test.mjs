import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const ui=readFileSync(new URL('../database/synthetic-world/hosted-smoke-client.tsx',import.meta.url),'utf8')
const schema=readFileSync(new URL('../src/features/squad/types.ts',import.meta.url),'utf8')
test('read-only rider profile is selected only from owner-scoped authenticated roster',()=>{
 assert.match(ui,/const rider = data\.riders\.find\(row => row\.syntheticRiderId === selectedRiderId\)/)
 assert.match(ui,/data-select-rider=\{r\.syntheticRiderId\}/)
 assert.match(ui,/data-rider-profile/)
 assert.match(ui,/onClick=\{\(\) => setSelectedRiderId\(null\)\}/)
 assert.doesNotMatch(ui,/request\('rider','POST'\)/)
})
test('UI explicitly separates integer synthetic rider ID from original UUID and missing contract',()=>{
 assert.match(ui,/not an original rider UUID/)
 assert.match(ui,/No values have been inferred/)
 assert.match(ui,/No training, transfers, health actions or contract changes/)
 assert.match(schema,/rider_id: string/)
 assert.match(schema,/birth_date: string/)
 assert.match(schema,/role: RiderRole/)
})
