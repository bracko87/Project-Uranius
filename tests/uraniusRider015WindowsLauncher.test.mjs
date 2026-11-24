import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const src=readFileSync(new URL('../scripts/run-approved-rider-015-windows.ps1',import.meta.url),'utf8')
test('015 Windows launcher is approval-gated for exact isolated project and manifest',()=>{
 assert.match(src,/NOT approved or executed by default/)
 assert.match(src,/\$ref='sdtsivgtcaoaeoihcwzd'/)
 assert.match(src,/\$expected='f9d835dd58c242d83b7366976810be1eb0525d9e2c401e361ef7b6d66e76ec81'/)
 assert.match(src,/-cne \$expected/)
 assert.match(src,/apply-uranius-rider-015\.mjs/)
 assert.doesNotMatch(src,/okuravitxocyevkexfgi/)
})
test('015 Windows launcher requires offline review, typed approval and private password before apply',()=>{
 const review=src.indexOf('& node $script --review')
 const typed=src.indexOf("Read-Host 'Type APPLY URANIUS 015")
 const password=src.indexOf("Read-Host 'Dedicated Uranius migrator password")
 const apply=src.indexOf('& node $script --apply-approved-015')
 assert.ok(review>=0&&typed>review&&password>typed&&apply>password)
 assert.match(src,/Read-Host 'Dedicated Uranius migrator password \(hidden\)' -AsSecureString/)
 assert.match(src,/ZeroFreeBSTR/)
 assert.match(src,/Remove-Item "Env:\$name"/)
})
test('015 launcher accepts only direct TLS restricted migrator; error stops without retry',()=>{
 assert.match(src,/uranius_migrator:\$encoded@db\.\$ref\.supabase\.co:5432\/postgres\?sslmode=verify-full/)
 assert.match(src,/\$env:URANIUS_DATABASE_CA_FILE/)
 assert.match(src,/STOP; do not retry without checking hosted state/)
 assert.doesNotMatch(src,/postgresql:\/\/postgres:/)
})
