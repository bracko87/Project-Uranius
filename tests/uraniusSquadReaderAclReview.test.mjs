import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const sql=readFileSync(new URL('../database/reconstruction/squad/013_squad_reader_acl_DISPOSABLE_REVIEW_ONLY.sql',import.meta.url),'utf8')
const body=sql.replace(/^\s*--[^\r\n]*/gm,'')
test('rehearsal remains transaction-scoped and cannot persist new grants',()=>{
 assert.match(body,/^\s*BEGIN;/)
 assert.match(body,/ROLLBACK;\s*$/)
 assert.doesNotMatch(body,/\bCOMMIT\s*;/i)
 assert.doesNotMatch(body,/\b(?:CREATE\s+ROLE|CREATE\s+POLICY|ALTER\s+POLICY|SECURITY\s+DEFINER)\b/i)
})
test('approved original 010 fingerprint and full ten-ledger preflight guarded',()=>{
 assert.match(body,/current_user <> 'uranius_migrator'/)
 assert.match(body,/session_user <> current_user/)
 assert.match(body,/migration_ledger\) <> 10/)
 assert.match(body,/010_overview_race_reader\.sql/)
 assert.match(body,/56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af/)
})
test('only six missing existing rider columns are granted to dedicated reader',()=>{
 assert.match(body,/GRANT SELECT \(team_id,label,flat,climbing,stamina,resistance\)\s+ON uranius_catalog\.riders TO uranius_smoke_reader;/)
 assert.equal((body.match(/\bGRANT\b/g)||[]).length,1)
 assert.doesNotMatch(body,/GRANT SELECT ON uranius_catalog\.riders/i)
 assert.doesNotMatch(body,/\bGRANT\b[^;]*\b(?:anon|authenticated|PUBLIC)\b/i)
})
test('postflight denies mutation, full-table read, anonymous read and private schema',()=>{
 assert.match(body,/has_table_privilege\('uranius_smoke_reader','uranius_catalog\.riders','UPDATE'\)/)
 for(const verb of ['INSERT','DELETE','SELECT'])
  assert.match(body,new RegExp("has_table_privilege\\('uranius_smoke_reader','uranius_catalog\\.riders','"+verb+"'\\)"))
 assert.match(body,/has_table_privilege\('anon','uranius_catalog\.riders','SELECT'\)/)
 assert.match(body,/has_schema_privilege\('uranius_smoke_reader','uranius_private','USAGE'\)/)
})
