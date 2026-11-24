// Owner-verified, strictly shaped synthetic Squad UUID preview.
// Real rider UUIDs are unavailable: these are independently generated 014 identities.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const missing=Object.freeze([
 'assigned_role','age_years','overall','availability_status','fatigue',
 'country_code','birth_date','morale','potential','contract'
])
const fields=['syntheticRiderId','syntheticRiderUuid','label','flat','climbing','stamina','resistance']
const skills=['flat','climbing','stamina','resistance']
export function projectSyntheticSquadUuidPreview(packet,{ownerVerified=false}={}){
 if(ownerVerified!==true)throw new Error('Verified Uranius owner required')
 if(!packet || typeof packet!=='object' || Array.isArray(packet) ||
    packet.kind!=='syntheticSquadUuidPreview' ||
    typeof packet.clubId!=='string' || !uuid.test(packet.clubId) ||
    !Array.isArray(packet.riders) || packet.riders.length>100 ||
    !Array.isArray(packet.missingOriginalFields) ||
    packet.missingOriginalFields.length!==missing.length ||
    !missing.every((x,i)=>packet.missingOriginalFields[i]===x) ||
    Object.keys(packet).some(k=>!['kind','clubId','riders','missingOriginalFields'].includes(k)))
   throw new Error('Invalid UUID Squad preview contract')
 const ids=new Set(),uuids=new Set()
 const riders=packet.riders.map(row=>{
   if(!row || typeof row!=='object' || Array.isArray(row) ||
      !Number.isSafeInteger(row.syntheticRiderId) || row.syntheticRiderId<1 ||
      ids.has(row.syntheticRiderId) ||
      typeof row.syntheticRiderUuid!=='string' || !uuid.test(row.syntheticRiderUuid) ||
      row.syntheticRiderUuid.toLowerCase()==='00000000-0000-0000-0000-000000000000' ||
      uuids.has(row.syntheticRiderUuid.toLowerCase()) ||
      typeof row.label!=='string' || !row.label.trim() || row.label.length>150 ||
      !skills.every(k=>own(row,k)&&Number.isInteger(row[k])&&row[k]>=0&&row[k]<=100) ||
      Object.keys(row).some(k=>!fields.includes(k)))
     throw new Error('Invalid synthetic UUID Squad rider')
   ids.add(row.syntheticRiderId)
   uuids.add(row.syntheticRiderUuid.toLowerCase())
   return Object.freeze(Object.fromEntries(fields.map(k=>[k,row[k]])))
 })
 return Object.freeze({kind:packet.kind,clubId:packet.clubId,
   riders:Object.freeze(riders),missingOriginalFields:missing})
}
