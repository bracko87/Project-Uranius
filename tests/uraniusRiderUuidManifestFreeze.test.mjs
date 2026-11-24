import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
const base=new URL('../database/reconstruction/squad/',import.meta.url)
const read=n=>readFileSync(new URL(n,base))
const m=JSON.parse(read('014_install_manifest_REVIEW_ONLY.json').toString('utf8'))
const previous=JSON.parse(read('013_install_manifest_REVIEW_ONLY.json').toString('utf8'))
const hash=x=>createHash('sha256').update(x).digest('hex')
test('014 exact tested digest frozen and approvals withheld',()=>{
 assert.equal(m.projectRef,'sdtsivgtcaoaeoihcwzd')
 assert.equal(m.postgresMajor,17)
 assert.equal(m.status,'REVIEW_ONLY_NOT_APPROVED')
 assert.equal(m.hostedApplied,false)
 assert.equal(m.approvalRequired,true)
 assert.equal(m.expectedLedgerEntries,11)
 assert.equal(m.candidate.file,'014_synthetic_rider_uuid_REVIEW_ONLY.sql')
 assert.equal(m.candidate.ledgerVersion,'014_synthetic_rider_uuid.sql')
 assert.equal(m.candidate.sha256,'f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f')
 assert.equal(hash(read(m.candidate.file)),m.candidate.sha256)
})
test('014 manifest requires exact 001–010 plus installed 013 source fingerprints',()=>{
 assert.equal(m.requires.length,11)
 assert.deepEqual(m.requires.slice(0,10),previous.requires)
 assert.deepEqual(m.requires[10],{
  file:previous.candidate.ledgerVersion,sha256:previous.candidate.sha256
 })
 assert.equal(new Set(m.requires.map(x=>x.file)).size,11)
 assert.ok(m.requires.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)))
})
test('014 offline reviewer must verify both source and ledger manifest and lack any apply mode',()=>{
 const script=readFileSync(new URL('../scripts/review-uranius-rider-identity.mjs',import.meta.url),'utf8')
 assert.match(script,/digest\(candidateBytes\)!==manifest\.candidate\.sha256/)
 assert.match(script,/JSON\.stringify\(manifest\.requires\)!==JSON\.stringify\(required\)/)
 assert.match(script,/Manifest SHA-256:/)
 assert.match(script,/Only --review is supported/)
 assert.doesNotMatch(script,/runPsqlBatch|spawnSync|child_process|--apply/)
})
test('014 proposal remains entirely private until separate owner approval',()=>{
 assert.equal(m.scope.createTable,'uranius_game.synthetic_rider_identity')
 assert.match(m.scope.rls,/FORCE RLS; no policies/)
 assert.ok(m.scope.excluded.includes('Original ProPeloton production'))
 assert.match(m.approvalGate,/NOT APPROVED/)
})
