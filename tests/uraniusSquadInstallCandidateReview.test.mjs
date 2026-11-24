import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const sql=readFileSync(new URL('../database/reconstruction/squad/013_squad_reader_grant_REVIEW_ONLY.sql',import.meta.url),'utf8')
const body=sql.replace(/^\s*--[^\r\n]*/gm,'')
test('013 remains review-only; standalone candidate does not commit or insert ledger',()=>{
 assert.match(sql,/REVIEW_ONLY_NOT_APPROVED/)
 assert.doesNotMatch(body,/\b(?:COMMIT|BEGIN|ROLLBACK)\s*;/i)
 assert.doesNotMatch(body,/\b(?:INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+POLICY|SECURITY\s+DEFINER)\b/i)
})
test('013 requires exact isolated project, TLS, direct restricted migration identity, ten prior ledger entries',()=>{
 for(const required of [
  /uranius\.approved_project_ref/,/sdtsivgtcaoaeoihcwzd/,/pg_stat_ssl/,
  /current_user <> 'uranius_migrator'/,/session_user <> current_user/,
  /migration_ledger\) <> 10/,/010_overview_race_reader\.sql/,
  /56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af/,
  /current_setting\('server_version_num'\)/,/pg_advisory_xact_lock\(410513\)/
 ]) assert.match(body,required)
 const refs=[...body.matchAll(/'0(?:0[1-9]|10)_[a-z_0-9]+\.sql'/g)].map(m=>m[0])
 assert.equal(refs.length,20)
})
test('013 only grants five new non-ownership fields to narrow reader',()=>{
 assert.equal((body.match(/\bGRANT\s+SELECT/g)||[]).length,1)
 assert.match(body,/GRANT SELECT \(label,flat,climbing,stamina,resistance\)\s+ON uranius_catalog\.riders TO uranius_smoke_reader;/)
 assert.doesNotMatch(body,/GRANT SELECT \(team_id/)
 assert.match(body,/has_column_privilege\('uranius_smoke_reader','uranius_catalog\.riders','team_id','SELECT'\)/)
})
test('013 guards original owner RLS, anon absence and unchanged authenticated baseline',()=>{
 assert.match(body,/policyname='riders_read'/)
 assert.match(body,/team_owners/)
 assert.match(body,/request_uid\(\)/)
 assert.match(body,/has_any_column_privilege\('anon','uranius_catalog\.riders','SELECT'\)/)
 assert.match(body,/NOT has_table_privilege\('authenticated','uranius_catalog\.riders','SELECT'\)/)
 for(const action of ['INSERT','UPDATE','DELETE'])
  assert.match(body,new RegExp("has_table_privilege\\('uranius_smoke_reader','uranius_catalog\\.riders','"+action+"'\\)"))
})
