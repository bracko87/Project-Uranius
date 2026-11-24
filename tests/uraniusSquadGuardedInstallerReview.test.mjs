import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const installer=readFileSync(new URL('../scripts/apply-uranius-squad.mjs',import.meta.url),'utf8')
const launcher=readFileSync(new URL('../scripts/run-approved-squad-windows.ps1',import.meta.url),'utf8')
const hash='ab63e7949889a49bd33fb584885f4911df6b027eb20d3aed3be43e77f0ccaa7a'
test('frozen installer checks exact manifest and candidate digests before database access',()=>{
 assert.match(installer,/approvedManifestHash='/)
 assert.match(installer,new RegExp(hash))
 assert.match(installer,/hash\(bytes\)!==candidateHash/)
 assert.match(installer,/manifestHash!==approvedManifestHash/)
 assert.match(installer,/assertSandboxTarget\('migrate',env\)/)
 assert.match(installer,/if\(digest!==approvedManifestHash\)/)
})
test('installer requires direct role, verify-full TLS and atomic guarded transaction',()=>{
 assert.match(installer,/PGUSER:'uranius_migrator'/)
 assert.match(installer,/PGSSLMODE:'verify-full'/)
 assert.match(installer,/transaction:true/)
 assert.match(installer,/INSERT INTO uranius_private\.migration_ledger/)
 assert.match(installer,/count\(\*\) FROM uranius_private\.migration_ledger\)<>11/)
 assert.match(installer,/has_column_privilege\('uranius_smoke_reader','uranius_catalog\.riders','team_id','SELECT'\)/)
 assert.match(installer,/--apply-reviewed-squad/)
})
test('Windows launcher demands exact SHA and manual confirmation before private credential',()=>{
 assert.match(launcher,new RegExp(hash))
 assert.match(launcher,/\$ApprovedManifestSha256 -cne \$expected/)
 assert.match(launcher,/Read-Host 'Type APPLY URANIUS 013/)
 assert.match(launcher,/-cne 'APPLY URANIUS 013'/)
 assert.match(launcher,/Read-Host 'Dedicated Uranius migrator password' -AsSecureString/)
 assert.match(launcher,/ZeroFreeBSTR/)
})
