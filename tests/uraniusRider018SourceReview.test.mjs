import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const sql=readFileSync(new URL('../database/reconstruction/squad/018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql',import.meta.url),'utf8')
const original=readFileSync(new URL('../src/features/squad/types.ts',import.meta.url),'utf8')
const bridge=readFileSync(new URL('../database/reconstruction/squad/original-nine-skill-availability.mjs',import.meta.url),'utf8')
const names=['sprint','climbing','time_trial','endurance','flat','recovery','resistance','race_iq','teamwork']
const documented=original.slice(original.indexOf('export type RiderDetails = {'),original.indexOf('export type DevelopingTeamStatus'))
test('018 is explicitly review-only, no hosted installer or approval',()=>{
 assert.match(sql,/NOT APPROVED for hosted execution/)
 assert.match(sql,/NO INSTALLER OR APPROVAL MANIFEST/)
 assert.match(sql,/sdtsivgtcaoaeoihcwzd/)
 assert.match(sql,/current_user <> 'uranius_migrator'/)
 assert.match(sql,/session_user <> current_user/)
 assert.match(sql,/pg_stat_ssl/)
 assert.match(sql,/version='015_rider_uuid_owner_read.sql'/)
 assert.match(sql,/71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e/)
 assert.match(sql,/count\(\*\) FROM uranius_private\.migration_ledger\)<>13/)
 assert.doesNotMatch(sql,/\b(?:COMMIT|ROLLBACK)\s*;/i)
})
test('018 nine nullable skill/provenance pairs have database checks and source names',()=>{
 for(const n of names){
  assert.match(documented,new RegExp('\\b'+n+': number\\b'))
  assert.match(sql,new RegExp('\\b'+n+' smallint CHECK \\('+n+' BETWEEN 0 AND 100\\)'))
  assert.match(sql,new RegExp('\\b'+n+'_source text CHECK'))
  assert.match(sql,new RegExp('CONSTRAINT '+n+'_source_pair CHECK'))
  assert.match(bridge,new RegExp("'"+n+"'"))
 }
 assert.match(sql,/REFERENCES uranius_game\.synthetic_rider_identity\(rider_id\) ON DELETE RESTRICT/)
 assert.match(sql,/approved_synthetic_fixture/)
})
test('018 copies only three observed catalog skills and leaves six unavailable skills NULL',()=>{
 assert.match(sql,/INSERT INTO uranius_game\.synthetic_rider_attributes/)
 assert.match(sql,/\(rider_id,climbing,climbing_source,flat,flat_source,resistance,resistance_source\)/)
 assert.match(sql,/SELECT r\.rider_id,r\.climbing,'isolated_catalog'/)
 assert.match(sql,/r\.flat,'isolated_catalog'/)
 assert.match(sql,/r\.resistance,'isolated_catalog'/)
 assert.doesNotMatch(sql,/SELECT\s+r\.rider_id\s*,\s*r\.stamina/)
 for(const n of ['sprint','time_trial','endurance','recovery','race_iq','teamwork']){
  assert.match(sql,new RegExp(n+"_source IS DISTINCT FROM 'isolated_catalog'"))
  assert.match(sql,new RegExp(n+'_source IS NOT NULL'))
 }
})
test('018 changes only new private table and revokes public/reader rights with FORCE RLS',()=>{
 assert.match(sql,/CREATE TABLE uranius_game\.synthetic_rider_attributes \(/)
 assert.match(sql,/REVOKE ALL ON uranius_game\.synthetic_rider_attributes FROM PUBLIC, anon, authenticated, uranius_smoke_reader/)
 assert.match(sql,/ALTER TABLE uranius_game\.synthetic_rider_attributes ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/ALTER TABLE uranius_game\.synthetic_rider_attributes FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/has_any_column_privilege\('uranius_smoke_reader','uranius_game\.synthetic_rider_attributes','SELECT'\)/)
 const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
 assert.doesNotMatch(executable,/\bCREATE POLICY\b|\bGRANT\s+SELECT\b|\bSECURITY DEFINER\b/i)
 assert.doesNotMatch(executable,/^\s*(?:UPDATE|DELETE\s+FROM|DROP)\b/im)
})
test('018 refuses malformed data, wrong baseline and verifies 200 rows before FORCE RLS',()=>{
 assert.match(sql,/to_regclass\('uranius_game\.synthetic_rider_attributes'\) IS NOT NULL/)
 assert.match(sql,/count\(\*\) FROM uranius_catalog\.riders\)<>200/)
 assert.match(sql,/count\(\*\) FROM uranius_game\.synthetic_rider_attributes\)<>200/)
 assert.match(sql,/IS DISTINCT FROM r\.climbing/)
 assert.match(sql,/IS DISTINCT FROM r\.flat/)
 assert.match(sql,/IS DISTINCT FROM r\.resistance/)
 assert.ok(sql.indexOf('$rider018_data_verify$;')<sql.indexOf('FORCE ROW LEVEL SECURITY'))
 assert.match(sql,/RLS|SECURITY/)
})
test('018 SHA-256 available for future review but does not imply approval',()=>{
 const digest=createHash('sha256').update(sql).digest('hex')
 assert.match(digest,/^[a-f0-9]{64}$/)
 assert.ok(sql.length>5000)
})

test('018 offline reviewer has no install path or database transport',()=>{
 const reviewer=readFileSync(new URL('../scripts/review-uranius-rider-018.mjs',import.meta.url),'utf8')
 assert.match(reviewer,/--review/)
 assert.match(reviewer,/createHash\('sha256'\)/)
 assert.match(reviewer,/NOT APPROVED, NOT INSTALLED/)
 assert.doesNotMatch(reviewer,/\b(?:spawnSync|execFileSync|createConnection|fetch\()\b/)
 assert.doesNotMatch(reviewer,/--apply|--install|execute_sql/)
})

test('018 review manifest freezes candidate and exact prior 001–015 history without approval',()=>{
 const path=new URL('../database/reconstruction/squad/',import.meta.url)
 const manifest=JSON.parse(readFileSync(new URL('018_install_manifest_REVIEW_ONLY.json',path),'utf8'))
 const prior=JSON.parse(readFileSync(new URL('015_install_manifest_REVIEW_ONLY.json',path),'utf8'))
 const expected=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
 assert.equal(manifest.projectRef,'sdtsivgtcaoaeoihcwzd')
 assert.equal(manifest.postgresMajor,17)
 assert.equal(manifest.status,'REVIEW_ONLY_NOT_APPROVED')
 assert.equal(manifest.hostedApplied,false)
 assert.equal(manifest.approvalRequired,true)
 assert.equal(manifest.expectedLedgerEntries,13)
 assert.equal(manifest.candidate.file,'018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql')
 assert.equal(manifest.candidate.ledgerVersion,'018_synthetic_nine_skill_attributes.sql')
 assert.equal(manifest.candidate.sha256,'622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc')
 assert.equal(createHash('sha256').update(sql).digest('hex'),manifest.candidate.sha256)
 assert.deepEqual(manifest.requires,expected)
 assert.equal(manifest.requires.length,13)
 assert.equal(manifest.requires.at(-1).file,'015_rider_uuid_owner_read.sql')
})
