// Original ProPeloton RiderDetails taxonomy, projected WITHOUT fabricating missing skills.
// Source: src/features/squad/types.ts RiderDetails (source-only).
// 013 synthetic catalog: flat, climbing, stamina, resistance.
// Stamina is NOT the original RiderDetails.endurance skill.
export const ORIGINAL_RIDER_NINE_SKILLS=Object.freeze([
 'sprint','climbing','time_trial','endurance','flat',
 'recovery','resistance','race_iq','teamwork'
])
export const ISOLATED_SOURCE_SKILLS=Object.freeze(['climbing','flat','resistance'])
const safe=Object.prototype.hasOwnProperty
const frozenSkill=(name,value,source)=>Object.freeze({name,value,source})
export function projectOriginalNineSkillsFromSyntheticRider(row,{ownerVerified=false}={}){
 if(ownerVerified!==true || !row || typeof row!=='object' || Array.isArray(row) ||
  !Number.isSafeInteger(row.syntheticRiderId) || row.syntheticRiderId<1 ||
  !['climbing','flat','resistance','stamina'].every(name=>
    safe.call(row,name)&&Number.isInteger(row[name])&&row[name]>=0&&row[name]<=100))
  throw new Error('Verified synthetic rider with observed source values required')
 // This is a compatibility VIEW, never the original complete RiderDetails model.
 const skills=ORIGINAL_RIDER_NINE_SKILLS.map(name=>
  ISOLATED_SOURCE_SKILLS.includes(name)
   ? frozenSkill(name,row[name],'uranius_catalog.riders.'+name)
   : frozenSkill(name,null,'unavailable_not_in_isolated_catalog'))
 return Object.freeze({
  kind:'syntheticOriginalNineSkillAvailability',
  syntheticRiderId:row.syntheticRiderId,
  originalRiderDetailsComplete:false,
  sourceOnly:true,
  syntheticStamina:Object.freeze({name:'stamina',value:row.stamina,source:'uranius_catalog.riders.stamina',
    originalEnduranceEquivalent:false}),
  skills:Object.freeze(skills)
 })
}
