// Strict browser-facing projection. No raw attributes, rider UUIDs or event payloads.
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const keys=(o,a)=>object(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x)
const label=x=>typeof x==='string'&&x.trim().length>0&&x.length<=300
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0
function require(ok){if(!ok)throw Error('Invalid synthetic replay projection')}
export function projectRaceReplay(data){
 require(keys(data,['clubId','replay'])&&uuid(data.clubId))
 if(data.replay===null)return Object.freeze({clubId:data.clubId,replay:null})
 const p=data.replay
 require(keys(p,['runId','raceId','stageId','title','kind','distanceKm','classification','frames','events'])&&
 uuid(p.runId)&&uuid(p.raceId)&&uuid(p.stageId)&&label(p.title)&&p.kind==='syntheticRaceReplay'&&p.distanceKm===120&&
 Array.isArray(p.classification)&&p.classification.length===10&&Array.isArray(p.frames)&&p.frames.length===347&&
 Array.isArray(p.events)&&p.events.length===12)
 const names=new Set()
 p.classification.forEach((r,i)=>{
  require(keys(r,['rank','rider','team','seconds'])&&r.rank===i+1&&label(r.rider)&&label(r.team)&&num(r.seconds)&&r.seconds>0&&!names.has(r.rider))
  names.add(r.rider)
 })
 require(new Set(p.classification.map(r=>r.team)).size===2)
 let previous=-1
 p.frames.forEach(f=>{
  require(keys(f,['second','km','groups'])&&num(f.second)&&f.second>previous&&num(f.km)&&f.km<=p.distanceKm&&Array.isArray(f.groups)&&f.groups.length>=1&&f.groups.length<=10)
  previous=f.second
  const ids=new Set()
  f.groups.forEach(g=>{
   require(keys(g,['id','type','km','speed','gap','count','active'])&&label(g.id)&&label(g.type)&&!ids.has(g.id)&&num(g.km)&&g.km<=p.distanceKm&&num(g.speed)&&g.speed<=150&&num(g.gap)&&Number.isInteger(g.count)&&g.count>=0&&g.count<=10&&typeof g.active==='boolean')
   ids.add(g.id)
  })
 })
 require(p.frames[0].second===0&&p.frames[0].km===0&&p.frames.at(-1).km===p.distanceKm)
 p.events.forEach((e,i)=>require(keys(e,['sequence','second','km','type'])&&e.sequence===i+1&&num(e.second)&&e.second<=previous&&num(e.km)&&e.km<=p.distanceKm&&label(e.type)))
 return Object.freeze({clubId:data.clubId,replay:p})
}
