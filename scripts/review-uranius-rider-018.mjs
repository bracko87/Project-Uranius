// Source-only 018 review: NO apply mode, NO database connection.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
const args=process.argv.slice(2)
if(args.length!==1||args[0]!=='--review'){
 console.error('Usage: node scripts/review-uranius-rider-018.mjs --review (offline ONLY)')
 process.exitCode=1
}else{
 try{
  const root=new URL('../database/reconstruction/squad/',import.meta.url)
  const bytes=readFileSync(new URL('018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql',root))
  const sql=bytes.toString('utf8')
  const names=['sprint','climbing','time_trial','endurance','flat','recovery','resistance','race_iq','teamwork']
  const three=['climbing','flat','resistance']
  if(!sql.startsWith('-- PROJECT URANIUS — 018 SYNTHETIC NINE-SKILL STORAGE / OFFLINE REVIEW ONLY.') ||
     !sql.includes('NOT APPROVED for hosted execution') ||
     !sql.includes("current_user <> 'uranius_migrator'") ||
     !sql.includes('pg_stat_ssl') ||
     !sql.includes('sdtsivgtcaoaeoihcwzd') ||
     !sql.includes("version='015_rider_uuid_owner_read.sql'") ||
     !sql.includes('71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e') ||
     !sql.includes('FORCE ROW LEVEL SECURITY') ||
     names.some(n=>!sql.includes(n+' smallint CHECK ('+n+' BETWEEN 0 AND 100)') ||
                  !sql.includes(n+'_source text CHECK') ||
                  !sql.includes('CONSTRAINT '+n+'_source_pair CHECK')) ||
     !sql.includes('(rider_id,climbing,climbing_source,flat,flat_source,resistance,resistance_source)') ||
     !three.every(n=>sql.includes('r.'+n+",'isolated_catalog'")) ||
     /\b(?:COMMIT|ROLLBACK)\s*;/.test(sql) ||
     /\b(?:SECURITY\s+DEFINER|GRANT\s+SELECT|CREATE\s+POLICY)\b/i.test(sql.replace(/^\s*--[^\r\n]*/gm,''))){
   throw new Error('018 review source boundary changed; stop. No database connection.')
  }
  console.log('URANIUS 018 OFFLINE REVIEW PASSED — no database connection.')
  console.log('018 candidate SHA-256: '+createHash('sha256').update(bytes).digest('hex'))
  console.log('Nine skill slots: 9, directly sourced: 3, intentionally NULL: 6')
  console.log('Installed prerequisite: 015; next ledger count must remain 13 before any separate approval')
  console.log('Status: REVIEW ONLY, NOT APPROVED, NOT INSTALLED. No apply mode exists.')
 }catch(e){console.error(e.message);process.exitCode=1}
}
