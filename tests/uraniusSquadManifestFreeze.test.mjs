import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const dir=new URL('../database/reconstruction/squad/',import.meta.url)
const blob=readFileSync(new URL('013_install_manifest_REVIEW_ONLY.json',dir))
const m=JSON.parse(blob.toString('utf8'))
const candidate=readFileSync(new URL(m.candidate.file,dir))
const hash=x=>createHash('sha256').update(x).digest('hex')
test('proposed Squad 013 digest is frozen and project exact; no approval implied',()=>{
 assert.equal(m.projectRef,'sdtsivgtcaoaeoihcwzd')
 assert.equal(m.postgresMajor,17)
 assert.equal(m.status,'REVIEW_ONLY_NOT_APPROVED')
 assert.equal(m.hostedApplied,false)
 assert.equal(m.approvalRequired,true)
 assert.equal(m.expectedLedgerEntries,10)
 assert.equal(m.candidate.ledgerVersion,'013_squad_reader_grant.sql')
 assert.equal(m.candidate.sha256,'8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859')
 assert.equal(hash(candidate),m.candidate.sha256)
 assert.equal(m.requires.length,10)
 assert.equal(m.requires.at(-1).file,'010_overview_race_reader.sql')
 assert.equal(m.requires.at(-1).sha256,'56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af')
})
test('reviewer has offline only read mode and prints separately approvable manifest hash',()=>{
 const source=readFileSync(new URL('../scripts/review-uranius-squad.mjs',import.meta.url),'utf8')
 assert.match(source,/manifestBytes/)
 assert.match(source,/sha256\(candidate\)!==manifest\.candidate\.sha256/)
 assert.match(source,/Manifest SHA-256 for separate owner approval:/)
 assert.match(source,/--review/)
 assert.doesNotMatch(source,/(?:--apply|runPsqlBatch|child_process|supabase-js|https?:\/\/)/)
 assert.match(source,/NOT APPROVED/)
})
