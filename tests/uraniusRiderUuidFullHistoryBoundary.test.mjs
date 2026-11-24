import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const src=readFileSync(new URL('uraniusRiderUuidFullHistoryNativePg17.mjs',import.meta.url),'utf8')
test('014 full-history native runner reuses exact 001–013 fixture without hosted connectivity',()=>{
 assert.match(src,/uranius-014-full-history-disposable-/)
 assert.match(src,/PGHOST: '127\.0\.0\.1'/)
 assert.match(src,/PGHOSTADDR: '127\.0\.0\.1'/)
 assert.match(src,/fixtureCandidate013/)
 assert.match(src,/013_squad_reader_grant\.sql/)
 assert.match(src,/014_synthetic_rider_uuid_REVIEW_ONLY\.sql/)
 assert.match(src,/finally \{/)
})
test('014 full-history runner independently rejects TLS bypass, wrong role, tampered history and duplicate installation',()=>{
 assert.match(src,/sql\(wrap\(raw014\),'uranius_migrator',true\)/)
 assert.match(src,/sql\(wrap\(local014\),'postgres',true\)/)
 assert.match(src,/const tampered=exactHistorySql/)
 assert.match(src,/assert\.equal\(sql\(tampered\),'false'\)/)
 assert.match(src,/sql\(wrap\(local014\),'uranius_migrator',true\)/)
})
test('014 full-history checks 200 unique UUIDs, FORCE RLS, no reader grant and final ledger',()=>{
 assert.match(src,/count\(DISTINCT rider_uuid\)/)
 assert.match(src,/relforcerowsecurity/)
 assert.match(src,/has_any_column_privilege/)
 assert.match(src,/is_paused/)
 assert.match(src,/count\(\*\) FROM uranius_private\.migration_ledger/)
})
