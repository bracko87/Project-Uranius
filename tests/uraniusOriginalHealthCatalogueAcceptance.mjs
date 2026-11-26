import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {loadOriginalHealthCatalogue,reviewOriginalCatalogueHealth,HEALTH_CATALOGUE_SHA256} from '../scripts/uranius-original-health-catalogue-review.mjs'
const args=process.argv.slice(2);assert.equal(args.length,3);assert.equal(args[0],'--offline-only');assert.equal(args[1],'--catalogue-file')
const cataloguePath=args[2],catalogue=loadOriginalHealthCatalogue(cataloguePath)
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),clubId=id(1)
const recovery=(caseCode,severity,bodyPart=null,medicalCenterLevel=0)=>({provenance:'synthetic_review_fixture',clubId,caseCode,severity,bodyPart,startedOn:'2000-01-01',medicalCenterLevel,staffEvidence:{provenance:'synthetic_review_fixture',completeStaffEvidence:true,clubs:[{clubId,type:'main',parentClubId:null}],clubId,staff:[]}})
const review=(recoveryInput,mode='recovery',priorCase=null)=>reviewOriginalCatalogueHealth({cataloguePath,recoveryInput,mode,priorCase})
let checks=0;const pass=x=>{checks++;console.log('PASS '+x)}
assert.equal(catalogue.sourceSha256,HEALTH_CATALOGUE_SHA256)
assert.equal(catalogue.rows.length,15);assert.equal(catalogue.rows.filter(x=>x.caseType==='injury').length,9)
assert.equal(catalogue.rows.filter(x=>x.sourceContexts.includes('race')).length,10)
assert.equal(catalogue.verifiedConfigurationOnly,true);assert.equal(catalogue.official,false)
pass('043G exact private configuration digest and all 15 case rows verified')
let count=0
for(const row of catalogue.rows.filter(x=>x.sourceContexts.includes('race')))for(const severity of ['minor','moderate','major'])for(const level of [0,5]){
 const r=review(recovery(row.caseCode,severity,row.bodyPartRequired?row.defaultBodyParts[0]:null,level))
 const [a,b]=row.ranges[severity],base=Math.ceil((a+b)/2),days=Math.max(1,Math.ceil(base*(100-level*4)/100))
 assert.equal(r.result.selectedBaseDays,base);assert.equal(r.result.finalRecoveryDays,days)
 assert.equal(r.result.recoveryUntil,new Date(Date.UTC(2000,0,1+days)).toISOString().slice(0,10))
 assert.equal(r.configurationVerified,true);assert.equal(r.incidentAuthorityVerified,false);assert.equal(r.accountingAllowed,false);count++
}
assert.equal(count,60)
pass('043G 60 race-eligible severity and medical-centre recovery combinations')
assert.equal(review(recovery('minor_strain','minor','hamstring')).caseCode,'muscle_strain')
assert.equal(review(recovery('dehydration','moderate')).caseCode,'heat_exhaustion')
assert.throws(()=>review(recovery('cold','minor')),/unknown or non-race/)
assert.throws(()=>review(recovery('missing','minor')),/unknown or non-race/)
assert.throws(()=>review(recovery('fracture','major')),/body part required/)
assert.throws(()=>review({...recovery('road_rash','minor','elbow'),catalogueRow:{}}),/caller-supplied catalogue forbidden/)
pass('043G alias normalization, race source eligibility and body-part validation')
const prior={caseId:id(2),status:'active',severity:'moderate',activeUntil:'2000-01-12',recoveryUntil:'2000-01-16',selectionBlocked:false,trainingBlocked:true,developmentBlocked:true}
const before=structuredClone(prior)
const merged=review(recovery('road_rash','minor','elbow'),'handover',prior).result
assert.equal(merged.disposition,'merged_into_stronger_open_case');assert.equal(merged.recoveryUntil,prior.recoveryUntil)
const equal=review(recovery('road_rash','moderate','elbow'),'handover',prior).result
assert.equal(equal.disposition,'supersede_open_case_review');assert.equal(equal.recoveryUntil,prior.recoveryUntil);assert.equal(equal.availabilityReview,'not_fully_fit')
const major=review(recovery('fracture','major','collarbone'),'handover',prior).result
assert.equal(major.availabilityReview,'injured');assert.equal(major.nextStageSelectionBlocked,true)
const minor=review(recovery('road_rash','minor','elbow'),'handover').result
assert.equal(minor.restrictions.trainingBlocked,false);assert.equal(minor.restrictions.selectionBlocked,false)
assert.deepEqual(prior,before)
pass('043G stronger prior case, equal-severity handover, nonblocking minor and major withdrawal rules')
const dir=mkdtempSync(join(tmpdir(),'uranius-043g-catalogue-'))
try{
 const invalid=join(dir,'changed.json'),raw=readFileSync(cataloguePath);writeFileSync(invalid,Buffer.concat([raw,Buffer.from('\n')]))
 assert.throws(()=>loadOriginalHealthCatalogue(invalid),/fingerprint mismatch/)
 const altered=Buffer.from(raw);altered[10]^=1;writeFileSync(invalid,altered)
 assert.throws(()=>loadOriginalHealthCatalogue(invalid),/fingerprint mismatch/)
}finally{rmSync(dir,{recursive:true,force:true})}
pass('043G changed private file rejected, no fallback to guessed catalogue')
assert.equal(checks,5);console.log('PASS 5/5 original health catalogue checks; no hosted connection')
