// Read-only Calendar projection; identity derived by trusted server-side SQL.
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const keys=(o,expected)=>object(o)&&Object.keys(o).length===expected.length&&expected.every(k=>Object.hasOwn(o,k))
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x
const label=x=>typeof x==='string'&&x.trim().length>0&&x.length<=300
const fields=['raceId','title','category','countryCode','raceStatus','stageNumber','stageDate','stageFormat','ownAccepted']
export function projectCalendar(packet){
 if(!keys(packet,['clubId','gameDate','stages'])||typeof packet.clubId!=='string'||!uuid.test(packet.clubId)||
   !date(packet.gameDate)||!Array.isArray(packet.stages)||packet.stages.length>500)
  throw Error('Invalid or oversized authenticated calendar packet')
 const start=Date.parse(packet.gameDate+'T00:00:00Z'),end=start+30*86400000
 const seen=new Set()
 const stages=packet.stages.map(row=>{
  if(!keys(row,fields)||typeof row.raceId!=='string'||!uuid.test(row.raceId)||
     !label(row.title)||!label(row.category)||
     !(row.countryCode===null||typeof row.countryCode==='string'&&/^[A-Z]{2}$/.test(row.countryCode))||
     !['draft','scheduled','active','completed','cancelled','archived'].includes(row.raceStatus)||
     !Number.isSafeInteger(row.stageNumber)||row.stageNumber<1||!date(row.stageDate)||
     Date.parse(row.stageDate+'T00:00:00Z')<start||Date.parse(row.stageDate+'T00:00:00Z')>=end||
     !(row.stageFormat===null||['road_race','individual_time_trial','team_time_trial','pair_time_trial','prologue'].includes(row.stageFormat))||
     typeof row.ownAccepted!=='boolean')throw Error('Invalid calendar stage')
  const id=row.raceId.toLowerCase()+':'+row.stageNumber
  if(seen.has(id))throw Error('Duplicate calendar stage')
  seen.add(id)
  return Object.freeze({...row})
 })
 return Object.freeze({clubId:packet.clubId,gameDate:packet.gameDate,stages:Object.freeze(stages)})
}
