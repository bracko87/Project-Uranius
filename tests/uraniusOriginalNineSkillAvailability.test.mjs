import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {ORIGINAL_RIDER_NINE_SKILLS,ISOLATED_SOURCE_SKILLS,projectOriginalNineSkillsFromSyntheticRider}
 from '../database/reconstruction/squad/original-nine-skill-availability.mjs'
const input={syntheticRiderId:1,syntheticRiderUuid:'f00ba000-0000-4000-8000-000000000001',
 label:'Fixture Rider 1',flat:67,climbing:69,stamina:68,resistance:78}
test('exact nine original RiderDetails skill names match source and retain original order',()=>{
 const source=readFileSync(new URL('../src/features/squad/types.ts',import.meta.url),'utf8')
 const details=source.slice(source.indexOf('export type RiderDetails = {'),source.indexOf('export type DevelopingTeamStatus'))
 const expected=['sprint','climbing','time_trial','endurance','flat','recovery','resistance','race_iq','teamwork']
 assert.deepEqual(ORIGINAL_RIDER_NINE_SKILLS,expected)
 for(const key of expected)assert.match(details,new RegExp('\\b'+key+': number\\b'))
})
test('bridge includes only actual same-name catalog skills; synthetic stamina is NOT original endurance',()=>{
 const projected=projectOriginalNineSkillsFromSyntheticRider(input,{ownerVerified:true})
 assert.equal(projected.skills.length,9)
 assert.deepEqual(ISOLATED_SOURCE_SKILLS,['climbing','flat','resistance'])
 assert.deepEqual(Object.fromEntries(projected.skills.map(x=>[x.name,x.value])),{
  sprint:null,climbing:69,time_trial:null,endurance:null,flat:67,
  recovery:null,resistance:78,race_iq:null,teamwork:null
 })
 assert.equal(projected.syntheticStamina.value,68)
 assert.equal(projected.syntheticStamina.originalEnduranceEquivalent,false)
 assert.equal(projected.originalRiderDetailsComplete,false)
 assert.ok(Object.isFrozen(projected.skills))
 assert.ok(projected.skills.every(skill=>skill.value!==null || skill.source==='unavailable_not_in_isolated_catalog'))
})
test('nine-skill bridge fails closed without verified source or valid synthetic rider',()=>{
 assert.throws(()=>projectOriginalNineSkillsFromSyntheticRider(input),/Verified/)
 assert.throws(()=>projectOriginalNineSkillsFromSyntheticRider({...input,climbing:null},{ownerVerified:true}))
 assert.throws(()=>projectOriginalNineSkillsFromSyntheticRider({...input,stamina:150},{ownerVerified:true}))
 assert.throws(()=>projectOriginalNineSkillsFromSyntheticRider({...input,syntheticRiderId:0},{ownerVerified:true}))
})
test('HTTPS Squad visualizes missing skill fields without inventing endurance',()=>{
 const client=readFileSync(new URL('../database/synthetic-world/hosted-smoke-client.tsx',import.meta.url),'utf8')
 assert.match(client,/data-original-nine-skills/)
 assert.match(client,/projectOriginalNineSkillsFromSyntheticRider\(rider,\{ownerVerified:true\}\)/)
 assert.match(client,/Six other skills are unavailable, not zero/)
 assert.match(client,/Synthetic Stamina is separate from original Endurance/)
 assert.match(client,/skill\.value === null \? 'Unavailable'/)
})
