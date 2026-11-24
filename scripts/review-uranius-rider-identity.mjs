// Uranius 014 checksum and static review. NEVER connects to any database.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
const file=new URL('../database/reconstruction/squad/014_synthetic_rider_uuid_REVIEW_ONLY.sql',import.meta.url)
if(process.argv.length!==3||process.argv[2]!=='--review')
 throw new Error('Only --review supported. No migration execution path exists.')
const sql=readFileSync(file,'utf8')
const executable=sql.replace(/^\s*--[^\r\n]*/gm,'')
if(!sql.startsWith('-- PROJECT URANIUS — 014 UUID mapping DESIGN / REVIEW ONLY / NOT APPROVED.')||
 !sql.includes('sdtsivgtcaoaeoihcwzd')||
 !sql.includes("current_user <> 'uranius_migrator'")||
 !sql.includes('pg_stat_ssl')||
 !sql.includes('CREATE TABLE uranius_game.synthetic_rider_identity')||
 !sql.includes('pg_catalog.gen_random_uuid()')||
 !sql.includes('FORCE ROW LEVEL SECURITY')||
 !sql.includes("identity_provenance text NOT NULL DEFAULT 'uranius_generated_synthetic'")||
 !sql.includes('REVOKE ALL ON uranius_game.synthetic_rider_identity FROM PUBLIC, anon, authenticated, uranius_smoke_reader')||
 /\b(?:COMMIT|SECURITY\s+DEFINER|CREATE\s+POLICY|GRANT\s+SELECT)\b/i.test(executable))
 throw new Error('Review-only candidate changed or failed security checks. No database connection attempted.')
console.log('PROJECT URANIUS 014: OFFLINE REVIEW ONLY; no database access, no apply path.')
console.log('Candidate SHA-256: '+createHash('sha256').update(sql).digest('hex'))
console.log('Status: NOT APPROVED. SQL must not be executed against hosted Supabase.')
