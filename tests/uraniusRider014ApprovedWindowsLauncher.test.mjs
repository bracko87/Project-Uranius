import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const src=readFileSync(new URL('../scripts/run-approved-rider-014-windows.ps1',import.meta.url),'utf8')
test('approved 014 Windows launcher restricts project, digest and direct TLS migrator',()=>{
 assert.match(src,/\$ref='sdtsivgtcaoaeoihcwzd'/)
 assert.match(src,/\$expected='620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62'/)
 assert.match(src,/-cne \$expected/)
 assert.match(src,/uranius_migrator:\$encoded@db\.\$ref\.supabase\.co:5432\/postgres\?sslmode=verify-full/)
 assert.match(src,/\$env:URANIUS_DATABASE_CA_FILE/)
 assert.match(src,/apply-uranius-rider-identity\.mjs/)
})
test('private migrator password requested only after offline review and exact local approval',()=>{
 const review=src.indexOf('& node $script --review')
 const prompt=src.indexOf('Read-Host \'Type APPLY URANIUS 014')
 const password=src.indexOf('Read-Host \'Dedicated Uranius migrator password')
 const apply=src.indexOf('& node $script --apply-approved-014')
 assert.ok(review>=0 && prompt>review && password>prompt && apply>password)
 assert.match(src,/Read-Host 'Dedicated Uranius migrator password \(hidden\)' -AsSecureString/)
 assert.match(src,/ZeroFreeBSTR/)
 assert.match(src,/Remove-Item "Env:\$name"/)
})
test('no fallback target or automatic installation, explicit one-shot failure halt',()=>{
 assert.doesNotMatch(src,/okuravitxocyevkexfgi/)
 assert.doesNotMatch(src,/postgresql:\/\/postgres:/)
 assert.match(src,/STOP; do not retry without checking hosted state/)
 assert.match(src,/if \(\$LASTEXITCODE -ne 0\)/)
 assert.match(src,/APPLY URANIUS 014/)
})
