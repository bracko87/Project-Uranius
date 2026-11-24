// Strict synthetic preview boundary. Not a public.club_roster adapter.
// This module does NOT establish authorization; the caller must use the verified
// server-owned subject and owner-scoped RLS SQL before invoking this projector.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const knownMissing=Object.freeze([
 'assigned_role','age_years','overall','availability_status','fatigue',
 'country_code','birth_date','morale','potential','contract'
])
const skills=['flat','climbing','stamina','resistance']
export function projectSyntheticSquadPreview(source,{ownerVerified=false}={}) {
 if(ownerVerified!==true) throw new Error('Verified Uranius owner required')
 if(!source||typeof source!=='object'||Array.isArray(source)||
   source.kind!=='syntheticSquadPreview'||typeof source.clubId!=='string'||
   !uuid.test(source.clubId)||!Array.isArray(source.riders)||
   source.riders.length>100||!Array.isArray(source.missingOriginalFields)||
   source.missingOriginalFields.length!==knownMissing.length||
   !knownMissing.every((field,index)=>source.missingOriginalFields[index]===field))
   throw new Error('Invalid synthetic Squad preview contract')
 const ids=new Set()
 const riders=source.riders.map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||
      !Number.isSafeInteger(row.syntheticRiderId)||row.syntheticRiderId<1||
      ids.has(row.syntheticRiderId)||typeof row.label!=='string'||
      !row.label.trim()||row.label.length>150||
      !skills.every(skill=>own(row,skill)&&Number.isInteger(row[skill])&&
        row[skill]>=0&&row[skill]<=100)||
      Object.keys(row).some(field=>!['syntheticRiderId','label',...skills].includes(field)))
      throw new Error('Invalid synthetic Squad rider')
   ids.add(row.syntheticRiderId)
   return Object.freeze({syntheticRiderId:row.syntheticRiderId,label:row.label,
     flat:row.flat,climbing:row.climbing,stamina:row.stamina,resistance:row.resistance})
 })
 return Object.freeze({kind:source.kind,clubId:source.clubId,
   riders:Object.freeze(riders),missingOriginalFields:knownMissing})
}
