// Strict read-only profile detail derived from the ALREADY authenticated Squad packet.
// Never maps synthetic integer identity onto the original rider UUID.
import {projectSyntheticSquadPreview} from './synthetic-squad-preview.mjs'
const allowed = new Set(['syntheticRiderId','label','flat','climbing','stamina','resistance'])
export const unavailableOriginalRiderFields=Object.freeze([
 'rider_uuid','first_name','last_name','country_code','birth_date','age_years',
 'assigned_role','overall','sprint','time_trial','endurance','recovery',
 'race_iq','teamwork','morale','potential','fatigue','availability_status',
 'market_value','salary','contract_expires_at'
])
export function projectSyntheticRiderProfile(packet, riderId, {ownerVerified=false}={}) {
 if(ownerVerified!==true || !Number.isSafeInteger(riderId) || riderId<=0)
  throw new Error('Verified positive synthetic rider selection required')
 const roster=projectSyntheticSquadPreview(packet,{ownerVerified:true})
 const row=roster.riders.find(rider=>rider.syntheticRiderId===riderId)
 if(!row) throw new Error('Selected synthetic rider is not in verified club roster')
 if(Object.keys(row).some(field=>!allowed.has(field)))
  throw new Error('Unexpected synthetic rider profile field')
 return Object.freeze({
  kind:'syntheticRiderProfile', clubId:roster.clubId,
  syntheticRiderId:row.syntheticRiderId,label:row.label,
  skills:Object.freeze({
   flat:row.flat,climbing:row.climbing,stamina:row.stamina,resistance:row.resistance
  }),
  originalRiderIdentityAvailable:false,
  unavailableOriginalFields:unavailableOriginalRiderFields,
  readOnly:true
 })
}
