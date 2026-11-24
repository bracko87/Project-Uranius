import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const code=readFileSync(new URL('uraniusRiderUuidOwnerReadNativePg17.mjs',import.meta.url),'utf8')
test('015 native fixture stays disposable and replays all original 001–014 history',()=>{
 assert.match(code,/uranius-015-owner-read-disposable-/)
 assert.match(code,/PGHOST: '127\.0\.0\.1'/)
 assert.match(code,/PGHOSTADDR: '127\.0\.0\.1'/)
 assert.match(code,/fixtureCandidate013/)
 assert.match(code,/raw014/)
 assert.match(code,/015_rider_uuid_owner_read_REVIEW_ONLY\.sql/)
 assert.match(code,/finally \{/)
})
test('015 native ownership test exercises A/B and unknown JWT with restricted real reader',()=>{
 assert.match(code,/const ownerSelect="count\(\*\) FROM uranius_game\.synthetic_rider_identity"/)
 assert.match(code,/assert\.equal\(readFor\(a,ownerSelect\),'10'\)/)
 assert.match(code,/assert\.equal\(readFor\(b,ownerSelect\),'10'\)/)
 assert.match(code,/assert\.equal\(readFor\(unknown015,ownerSelect\),'0'\)/)
 assert.match(code,/ownerRiderIds\(a\),'1,2,3,4,5,6,7,8,9,10'/)
 assert.match(code,/ownerRiderIds\(b\),'11,12,13,14,15,16,17,18,19,20'/)
 assert.match(code,/count\(DISTINCT rider_uuid\)/)
})
test('015 native tests wrong role, TLS, restricted grants, immutable ledger and duplicate failure',()=>{
 assert.match(code,/sql\(wrap\(sql015\),'uranius_migrator',true\)/)
 assert.match(code,/sql\(wrap\(local015\),'postgres',true\)/)
 assert.match(code,/sql\(wrap\(local015\),'uranius_migrator',true\)/)
 assert.match(code,/SELECT identity_provenance FROM uranius_game/)
 assert.match(code,/SELECT created_at FROM uranius_game/)
 assert.match(code,/UPDATE uranius_game\.synthetic_rider_identity/)
 assert.match(code,/count\(\*\) FROM uranius_private\.migration_ledger/)
})

test('015 zero-owned-rider aggregation uses a nonempty sentinel instead of ambiguous blank psql output',()=>{
 assert.match(code,/coalesce\(string_agg\(rider_id::text,',' ORDER BY rider_id\),'<no-owned-riders>'\)/)
 assert.match(code,/assert\.equal\(ownerRiderIds\(unknown015\),'<no-owned-riders>'\)/)
 assert.doesNotMatch(code,/assert\.equal\(ownerRiderIds\(unknown015\),''\)/)
})
