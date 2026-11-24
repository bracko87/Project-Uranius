import assert from 'node:assert/strict'
import {test} from 'node:test'
import {projectSyntheticRiderProfile,unavailableOriginalRiderFields} from '../database/reconstruction/squad/synthetic-rider-profile.mjs'
const base={
 kind:'syntheticSquadPreview',
 clubId:'00000000-0000-4000-8000-000000000011',
 missingOriginalFields:['assigned_role','age_years','overall','availability_status','fatigue',
 'country_code','birth_date','morale','potential','contract'],
 riders:[{syntheticRiderId:1,label:'Fixture Rider 1',flat:67,climbing:69,stamina:68,resistance:78},
         {syntheticRiderId:2,label:'Fixture Rider 2',flat:84,climbing:88,stamina:81,resistance:60}]
}
test('verified synthetic rider can be viewed without casting integer ID to original UUID',()=>{
 const p=projectSyntheticRiderProfile(base,1,{ownerVerified:true})
 assert.equal(p.kind,'syntheticRiderProfile')
 assert.equal(p.syntheticRiderId,1)
 assert.equal(p.clubId,base.clubId)
 assert.equal(p.label,'Fixture Rider 1')
 assert.deepEqual(p.skills,{flat:67,climbing:69,stamina:68,resistance:78})
 assert.equal(p.originalRiderIdentityAvailable,false)
 assert.equal(p.readOnly,true)
 assert.ok(p.unavailableOriginalFields.includes('rider_uuid'))
 assert.ok(p.unavailableOriginalFields.includes('fatigue'))
 assert.equal(Object.hasOwn(p,'age_years'),false)
 assert.equal(Object.hasOwn(p,'overall'),false)
 assert.equal(Object.hasOwn(p,'assigned_role'),false)
 assert.ok(Object.isFrozen(p))
 assert.ok(Object.isFrozen(p.skills))
})
test('unverified subject and non-owned rider cannot open profile',()=>{
 assert.throws(()=>projectSyntheticRiderProfile(base,1),/Verified/)
 assert.throws(()=>projectSyntheticRiderProfile(base,21,{ownerVerified:true}),/not in verified/)
 assert.throws(()=>projectSyntheticRiderProfile(base,'1',{ownerVerified:true}),/Verified/)
 assert.throws(()=>projectSyntheticRiderProfile(base,-1,{ownerVerified:true}),/Verified/)
})
test('malformed source and fabricated original attributes fail closed',()=>{
 const injected={...base,riders:[{...base.riders[0],overall:96}]}
 assert.throws(()=>projectSyntheticRiderProfile(injected,1,{ownerVerified:true}),/Invalid/)
 const duplicate={...base,riders:[base.riders[0],base.riders[0]]}
 assert.throws(()=>projectSyntheticRiderProfile(duplicate,1,{ownerVerified:true}),/Invalid/)
})
test('missing original profile fields are explicit and immutable',()=>{
 for(const name of ['rider_uuid','first_name','last_name','country_code','birth_date','age_years',
  'assigned_role','overall','sprint','time_trial','endurance','recovery','race_iq','teamwork',
  'morale','potential','fatigue','availability_status','market_value','salary','contract_expires_at'])
  assert.ok(unavailableOriginalRiderFields.includes(name),name)
 assert.ok(Object.isFrozen(unavailableOriginalRiderFields))
})
