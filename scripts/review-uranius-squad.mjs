// Offline-only checksum and structural review. NO database connections or apply mode.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
const path=new URL('../database/reconstruction/squad/013_squad_reader_grant_REVIEW_ONLY.sql',import.meta.url)
const sql=readFileSync(path)
const text=sql.toString('utf8')
const sha=createHash('sha256').update(sql).digest('hex')
if(process.argv.length!==3||process.argv[2]!=='--review')
 throw Error('Usage: node scripts/review-uranius-squad.mjs --review')
if(!text.startsWith('-- Uranius Squad restricted column grant')||
   !text.includes('REVIEW_ONLY_NOT_APPROVED')||
   !text.includes("current_user <> 'uranius_migrator'")||
   !text.includes("'sdtsivgtcaoaeoihcwzd'")||
   !text.includes("GRANT SELECT (label,flat,climbing,stamina,resistance)")||
   !text.includes("policyname='riders_read'")||
   !text.includes("has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','team_id','SELECT')")||
   /\bCOMMIT\s*;/i.test(text))
 throw Error('Uranius Squad SQL review guards changed; no approval digest emitted')
console.log('REVIEW ONLY — no database connection or modification.')
console.log('Target: isolated Uranius sdtsivgtcaoaeoihcwzd (not original ProPeloton)')
console.log('Migration draft: 013_squad_reader_grant_REVIEW_ONLY.sql')
console.log('Draft candidate SHA-256: '+sha)
console.log('Approval status: NOT APPROVED. Do not execute this SQL on hosted Supabase.')
