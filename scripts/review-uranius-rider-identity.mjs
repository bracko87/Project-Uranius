// Offline-only exact 014 source+manifest review; no database and NO apply path.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
const base=new URL('../database/reconstruction/squad/',import.meta.url)
const digest=b=>createHash('sha256').update(b).digest('hex')
if(process.argv.length!==3||process.argv[2]!=='--review')
 throw new Error('Only --review is supported. No migration execution path exists.')
const manifestBytes=readFileSync(new URL('014_install_manifest_REVIEW_ONLY.json',base))
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const candidateBytes=readFileSync(new URL('014_synthetic_rider_uuid_REVIEW_ONLY.sql',base))
const sql=candidateBytes.toString('utf8')
const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
const prior=JSON.parse(readFileSync(new URL('013_install_manifest_REVIEW_ONLY.json',base)))
const required=[...prior.requires,prior.candidate&&{
 file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
const exactNames=['001_identity.sql','002_reference_schema.sql','003_access.sql',
 '004_synthetic_reference.sql','005_club_identity.sql','006_synthetic_world.sql',
 '007_smoke_reader.sql','008_game_clock_v1.sql','009_clock_smoke_reader.sql',
 '010_overview_race_reader.sql','013_squad_reader_grant.sql']
if(manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' ||
 manifest.postgresMajor!==17 ||
 manifest.status!=='REVIEW_ONLY_NOT_APPROVED' ||
 manifest.hostedApplied!==false ||
 manifest.approvalRequired!==true ||
 manifest.expectedLedgerEntries!==11 ||
 manifest.candidate?.file!=='014_synthetic_rider_uuid_REVIEW_ONLY.sql' ||
 manifest.candidate?.ledgerVersion!=='014_synthetic_rider_uuid.sql' ||
 manifest.candidate.sha256!=='f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f' ||
 digest(candidateBytes)!==manifest.candidate.sha256 ||
 JSON.stringify(manifest.requires)!==JSON.stringify(required) ||
 JSON.stringify(manifest.requires.map(x=>x.file))!==JSON.stringify(exactNames) ||
 !manifest.requires.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)) ||
 !sql.startsWith('-- PROJECT URANIUS — 014 UUID mapping DESIGN / REVIEW ONLY / NOT APPROVED.') ||
 !sql.includes('sdtsivgtcaoaeoihcwzd') ||
 !sql.includes("current_user <> 'uranius_migrator'") ||
 !sql.includes('pg_stat_ssl') ||
 !sql.includes('CREATE TABLE uranius_game.synthetic_rider_identity') ||
 !sql.includes('pg_catalog.gen_random_uuid()') ||
 !sql.includes('FORCE ROW LEVEL SECURITY') ||
 !sql.includes("identity_provenance text NOT NULL DEFAULT 'uranius_generated_synthetic'") ||
 !sql.includes('REVOKE ALL ON uranius_game.synthetic_rider_identity FROM PUBLIC, anon, authenticated, uranius_smoke_reader') ||
 /\b(?:COMMIT|SECURITY\s+DEFINER|CREATE\s+POLICY|GRANT\s+SELECT)\b/i.test(executable))
 throw new Error('Review-only 014 candidate, ledger prerequisites or manifest mismatched; no connection.')
console.log('URANIUS 014 — EXACT OFFLINE REVIEW PASSED; no database connection or apply path.')
console.log('Candidate SHA-256: '+manifest.candidate.sha256)
console.log('Manifest SHA-256: '+digest(manifestBytes))
console.log('Exact historical ledger prerequisites: '+manifest.requires.length)
console.log('Status: NOT APPROVED. Do not execute on hosted Supabase.')
