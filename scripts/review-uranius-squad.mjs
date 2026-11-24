// STRICT offline-only review. No apply mode, network, Supabase or database.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const directory = new URL('../database/reconstruction/squad/',import.meta.url)
if (process.argv.length!==3 || process.argv[2]!=='--review')
 throw new Error('Usage: node scripts/review-uranius-squad.mjs --review')
const manifestBytes=readFileSync(new URL('013_install_manifest_REVIEW_ONLY.json',directory))
const manifest=JSON.parse(manifestBytes.toString('utf8'))
const candidate=readFileSync(new URL('013_squad_reader_grant_REVIEW_ONLY.sql',directory))
const sql=candidate.toString('utf8')
const expectedNames=[
 '001_identity.sql','002_reference_schema.sql','003_access.sql',
 '004_synthetic_reference.sql','005_club_identity.sql',
 '006_synthetic_world.sql','007_smoke_reader.sql',
 '008_game_clock_v1.sql','009_clock_smoke_reader.sql','010_overview_race_reader.sql'
]
if (manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' ||
 manifest.postgresMajor!==17 || manifest.status!=='REVIEW_ONLY_NOT_APPROVED' ||
 manifest.hostedApplied!==false || manifest.approvalRequired!==true ||
 manifest.expectedLedgerEntries!==10 ||
 manifest.candidate?.file!=='013_squad_reader_grant_REVIEW_ONLY.sql' ||
 manifest.candidate?.ledgerVersion!=='013_squad_reader_grant.sql' ||
 sha256(candidate)!==manifest.candidate.sha256 ||
 JSON.stringify(manifest.requires?.map(x=>x.file))!==JSON.stringify(expectedNames) ||
 !manifest.requires.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)) ||
 manifest.requires[9].sha256!=='56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af' ||
 !sql.includes('REVIEW_ONLY_NOT_APPROVED') ||
 !sql.includes("current_user <> 'uranius_migrator'") ||
 !sql.includes("uranius.approved_project_ref") ||
 !sql.includes("GRANT SELECT (label,flat,climbing,stamina,resistance)") ||
 !sql.includes("policyname='riders_read'") ||
 !sql.includes("has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')") ||
 /\bCOMMIT\s*;/i.test(sql))
 throw new Error('Squad 013 review package is incomplete or differs from the frozen fingerprint. No database access attempted.')
console.log('REVIEW ONLY — source and manifest SHA-256 verified; no database connection.')
console.log('Target: isolated Uranius sdtsivgtcaoaeoihcwzd (not original ProPeloton)')
console.log('Candidate: '+manifest.candidate.file)
console.log('Candidate SHA-256: '+manifest.candidate.sha256)
console.log('Manifest SHA-256 for separate owner approval: '+sha256(manifestBytes))
console.log('Status: NOT APPROVED. Do not install this package on hosted Supabase.')
