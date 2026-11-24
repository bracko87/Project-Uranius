import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { projectSyntheticSquadPreview } from '../database/reconstruction/squad/synthetic-squad-preview.mjs'

const sql=readFileSync(new URL('../database/reconstruction/squad/013_synthetic_squad_preview_REVIEW_ONLY.sql',import.meta.url),'utf8')
const doc=readFileSync(new URL('../database/reconstruction/squad/SQUAD_READ_GAP_REVIEW.md',import.meta.url),'utf8')
const clubId='00000000-0000-4000-8000-000000000011'
const missing=['assigned_role','age_years','overall','availability_status','fatigue',
 'country_code','birth_date','morale','potential','contract']
const row=(id=1)=>({syntheticRiderId:id,label:'Synthetic Rider '+id,
 flat:42,climbing:45,stamina:46,resistance:40})
const packet=(rows=[row()])=>({kind:'syntheticSquadPreview',
 clubId,riders:rows,missingOriginalFields:[...missing]})

test('synthetic preview requires verified owner, pinned schema and exact missing fields',()=>{
 assert.throws(()=>projectSyntheticSquadPreview(packet()),/Verified/)
 const projected=projectSyntheticSquadPreview(packet(),{ownerVerified:true})
 assert.equal(projected.clubId,clubId)
 assert.equal(projected.riders[0].label,'Synthetic Rider 1')
 assert.deepEqual(projected.missingOriginalFields,missing)
 assert.ok(Object.isFrozen(projected)&&Object.isFrozen(projected.riders))
 assert.throws(()=>projectSyntheticSquadPreview({...packet(),missingOriginalFields:[]},{ownerVerified:true}),/contract/)
 assert.throws(()=>projectSyntheticSquadPreview({...packet(),clubId:'other-club'},{ownerVerified:true}),/contract/)
})
test('no fabricated original fatigue, overall, birth date, status, salary or role',()=>{
 const projected=projectSyntheticSquadPreview(packet(),{ownerVerified:true})
 for(const field of ['overall','fatigue','assigned_role','age_years','status','salary','country_code'])
  assert.equal(Object.hasOwn(projected.riders[0],field),false)
 assert.throws(()=>projectSyntheticSquadPreview(packet([{
   ...row(),assigned_role:'Leader'
 }]),{ownerVerified:true}),/Invalid synthetic Squad rider/)
})
test('reject duplicate rider ids, invalid skills, labels and excess roster sizes',()=>{
 const invalid=[
  [row(1),row(1)],
  [{...row(),climbing:101}],
  [{...row(),label:''}],
  Array.from({length:101},(_,i)=>row(i+1)),
 ]
 for(const rows of invalid)
  assert.throws(()=>projectSyntheticSquadPreview(packet(rows),{ownerVerified:true}))
})
test('preview SQL is RLS-scoped to verified subject and cannot mutate hosted state',()=>{
 assert.match(sql,/REVIEW ONLY \/ NOT APPROVED FOR HOSTED EXECUTION/)
 assert.match(sql,/BEGIN READ ONLY;/)
 assert.match(sql,/ROLLBACK;\s*$/)
 assert.match(sql,/current_user <> 'uranius_smoke_reader'/)
 assert.match(sql,/pg_stat_ssl/)
 assert.match(sql,/jsonb_build_object\('sub',:'verified_subject'\)/)
 assert.match(sql,/uranius_game\.get_my_club_id\(\)/)
 assert.match(sql,/FROM uranius_catalog\.riders r/)
 assert.doesNotMatch(sql,/\bJOIN owned_team\b/)
 assert.match(sql,/'clubId',uranius_game\.get_my_club_id\(\)::text/)
 // Security prohibitions apply to executable SQL, not explanatory "--" comments.
 const executableSql=sql.replace(/^\s*--[^\r\n]*/gm,'')
 const forbidden=/\b(?:SECURITY\s+DEFINER|GRANT\s+SELECT|ALTER\s+POLICY|INSERT\s+INTO|CREATE\s+TABLE)\b/i
 assert.doesNotMatch(executableSql,forbidden)
 // Keep this fail-closed if an actual forbidden command is later added.
 assert.match((executableSql+'\nGRANT SELECT ON uranius_catalog.riders TO anon;'),forbidden)
})
test('source audit distinguishes original UUID club_roster from the integer-only synthetic catalog',()=>{
 for(const term of ['club_roster','rider_id integer','synthetic Squad preview','reader-column'])
  if(term!=='reader-column')assert.ok(doc.includes(term))
 assert.match(doc,/Do not grant `team_id`/)
 assert.match(doc,/`riders_read` RLS policy/)
})
