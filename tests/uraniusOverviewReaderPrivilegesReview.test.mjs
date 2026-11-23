import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const sql=readFileSync(new URL('../database/reconstruction/overview/012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql',import.meta.url),'utf8')
const statements=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
test('review-only permissions cannot persist',()=>{
  assert.match(sql,/^-- Uranius 012: REVIEW_ONLY_NOT_APPROVED/)
  assert.match(sql,/BEGIN;[\s\S]*ROLLBACK;\s*$/)
  assert.doesNotMatch(statements,/\bCOMMIT\s*;/)
})
test('world-day cards are globally visible to restricted server reader only',()=>{
  for(const table of ['races','race_stages']){
    assert.match(sql,new RegExp('CREATE POLICY uranius_'+table+'_reader ON uranius_game\\.'+table))
  }
  assert.doesNotMatch(statements,/TO\s+(?:anon|authenticated|PUBLIC)\s+USING\s*\(true\)/i)
})
test('private entry and preparation RLS is tied to server verified manager resolver',()=>{
  for(const table of ['race_team_entries','race_preparations']){
    assert.match(sql,new RegExp('CREATE POLICY uranius_'+(table==='race_team_entries'?'entries':'preparations')+'_owner ON uranius_game\\.'+table))
  }
  const ownerPredicates=statements.match(/club_id = \(SELECT uranius_game\.get_my_club_id\(\)\)/g)||[]
  assert.equal(ownerPredicates.length,2)
  assert.doesNotMatch(statements,/p_club_id|SECURITY DEFINER/i)
})
test('read-only grants are column-scoped, with no writes or browser roles',()=>{
  assert.equal((statements.match(/GRANT SELECT \(/g)||[]).length,4)
  assert.doesNotMatch(statements,/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)/i)
  assert.doesNotMatch(statements,/GRANT[\s\S]*?\bTO\s+(?:anon|authenticated|PUBLIC)\b/i)
  assert.match(statements,/GRANT SELECT \(id, race_id, club_id, status, startlist_status, updated_at\)/)
})
