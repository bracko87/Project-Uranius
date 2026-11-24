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
  const manifestBytes=readFileSync(new URL('018_install_manifest_REVIEW_ONLY.json',root))
  const manifest=JSON.parse(manifestBytes.toString('utf8'))
  const prior=JSON.parse(readFileSync(new URL('015_install_manifest_REVIEW_ONLY.json',root)).toString('utf8'))
  const expected=[...prior.requires,{file:prior.candidate.ledgerVersion,sha256:prior.candidate.sha256}]
  const expectedNames=['001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql','005_club_identity.sql','006_synthetic_world.sql','007_smoke_reader.sql','008_game_clock_v1.sql','009_clock_smoke_reader.sql','010_overview_race_reader.sql','013_squad_reader_grant.sql','014_synthetic_rider_uuid.sql','015_rider_uuid_owner_read.sql']
  const candidateHash=createHash('sha256').update(bytes).digest('hex')
  const manifestHash=createHash('sha256').update(manifestBytes).digest('hex')
  const sql=bytes.toString('utf8')
  const names=['sprint','climbing','time_trial','endurance','flat','recovery','resistance','race_iq','teamwork']
  const three=['climbing','flat','resistance']
  if(manifestHash!=='9995c7a1558d222426e759b5af4911981d5d4b12688a4e2e3c1adee8d6975205' ||
     candidateHash!=='622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc' ||
     manifest.projectRef!=='sdtsivgtcaoaeoihcwzd' || manifest.postgresMajor!==17 ||
     manifest.status!=='REVIEW_ONLY_NOT_APPROVED' || manifest.hostedApplied!==false ||
     manifest.approvalRequired!==true || manifest.expectedLedgerEntries!==13 ||
     manifest.candidate?.file!=='018_synthetic_nine_skill_attributes_REVIEW_ONLY.sql' ||
     manifest.candidate?.ledgerVersion!=='018_synthetic_nine_skill_attributes.sql' ||
     manifest.candidate?.sha256!==candidateHash ||
     JSON.stringify(manifest.requires)!==JSON.stringify(expected) ||
     JSON.stringify(expected.map(x=>x.file))!==JSON.stringify(expectedNames) ||
     expected.length!==13 || !expected.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)) ||
     !sql.startsWith('-- PROJECT URANIUS — 018 SYNTHETIC NINE-SKILL STORAGE / OFFLINE REVIEW ONLY.') ||
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
  console.log('018 candidate SHA-256: '+candidateHash)
  console.log('018 manifest SHA-256: '+manifestHash)
  console.log('Exact historical prerequisites: '+expected.length)
  console.log('Nine skill slots: 9, directly sourced: 3, intentionally NULL: 6')
  console.log('Installed prerequisite: 015; next ledger count must remain 13 before any separate approval')
  console.log('Status: REVIEW ONLY, NOT APPROVED, NOT INSTALLED. No apply mode exists.')
 }catch(e){console.error(e.message);process.exitCode=1}
}
