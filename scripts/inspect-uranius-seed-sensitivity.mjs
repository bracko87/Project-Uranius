// Read-only offline seed-sensitivity check over the saved long-stage JSON.
// Does not rerun races, access network, or change a simulation rule.
import {readFileSync} from 'node:fs'
const path=process.argv[2]||'race-long-stage-local.json'
const report=JSON.parse(readFileSync(path,'utf8'))
if(report.reportVersion!=='uranius-long-stage-diagnostic-v1'||!Array.isArray(report.results))
 throw Error('Expected saved Uranius long-stage diagnostic JSON')
const pairs=[]
for(const course of ['rolling_120','mountain_160']){
 for(const mode of ['default_off','birth_tick_protected','receding_drop_protected']){
  const alpha=report.results.find(r=>r.course===course&&r.seed==='alpha'&&r.experiment===mode)
  const beta=report.results.find(r=>r.course===course&&r.seed==='beta'&&r.experiment===mode)
  if(!alpha||!beta||alpha.error||beta.error||!alpha.inputDigest||!beta.inputDigest||
     !alpha.classificationDigest||!beta.classificationDigest)
   throw Error('Missing or failed paired result: '+course+' '+mode)
  pairs.push({course,mode,
   differentInputDigests:alpha.inputDigest!==beta.inputDigest,
   differentClassificationDigests:alpha.classificationDigest!==beta.classificationDigest,
   winnerSpeedSame:alpha.winnerAverageKmh===beta.winnerAverageKmh,
   spreadSame:alpha.finishSpreadSeconds===beta.finishSpreadSeconds,
   transitionCountSame:alpha.transitions===beta.transitions,
   conclusion:alpha.classificationDigest===beta.classificationDigest?
    'NO_CLASSIFICATION_VARIATION_FROM_SEED_ON_THIS_FIXTURE':
    'CLASSIFICATION_CHANGED_WITH_SEED'})
 }
}
console.log('URANIUS SEED-SENSITIVITY AUDIT — reading existing local JSON only')
for(const p of pairs)console.log([p.course,p.mode,
 'inputDiff '+p.differentInputDigests,'classificationDiff '+p.differentClassificationDigests,
 'speedSame '+p.winnerSpeedSame,'spreadSame '+p.spreadSame,p.conclusion].join(' | '))
if(pairs.some(p=>!p.differentInputDigests))process.exitCode=2
console.log('Note: Different input digests may reflect only the seed text. Identical classifications do not prove RNG is globally broken; diagnose whether this lane has any intended seed-dependent mechanics.')
