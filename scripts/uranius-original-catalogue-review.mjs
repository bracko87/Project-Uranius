// Archived original SQL: baseline_04_sql_dump_001_120 lines 4173–4359;
// baseline_04_sql_dump_241_360 lines 8870–9007. Explicit synthetic rows only.
const P='synthetic_review_fixture',req=(x,m)=>{if(!x)throw Error('043AN: '+m)}
const cats=['frame','wheelset','tires','groupset','helmet','shoes']
const keys=['flat_bonus_pct','hilly_bonus_pct','mountain_bonus_pct','cobble_bonus_pct','time_trial_bonus_pct','sprint_bonus_pct','fatigue_reduction_pct']
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const round2=x=>Math.sign(x)*Math.round((Math.abs(x)+1e-10)*100)/100
const uniq=(a,k)=>Array.isArray(a)&&new Set(a.map(k)).size===a.length
export const archivedStarterDefinitions=Object.freeze([
 ['frame','Cannondalea','Meridian Core'],['wheelset','Fulcram','NeraCore F40'],['tires','Spacialized','BaseWay Road'],['groupset','Campagnola','Axiom Gearset 120'],['helmet','Skott','CityRace Comp'],['shoes','Spacialized','BaseLock Road']
].map(([category,brand,displayName])=>Object.freeze({category,brand,displayName,requiredCount:10})))
export function reviewOriginalEquipmentPreview({provenance,weights,allowedKeys,catalogue,selection,terrain}){
 req(provenance===P&&uniq(weights,x=>x.category)&&weights.length===6&&cats.every(c=>weights.some(w=>w.category===c))&&weights.every(w=>finite(w.weight)&&w.weight>=0&&w.weight<=1),'explicit category weights required')
 req(uniq(allowedKeys,x=>x)&&allowedKeys.length===keys.length&&keys.every(k=>allowedKeys.includes(k)),'explicit supported allowed-key snapshot required')
 req(uniq(catalogue,x=>x.catalogItemId)&&uniq(selection,x=>x.category)&&selection.length===6&&cats.every(c=>selection.some(s=>s.category===c)),'complete catalogue selection required')
 const selected=weights.map(w=>{
  const s=selection.find(s=>s.category===w.category),item=catalogue.find(x=>x.catalogItemId===s.catalogItemId)
  req(item&&item.category===w.category&&item.kind==='durable'&&item.active===true&&item.effects&&Object.keys(item.effects).every(k=>!keys.includes(k)||finite(item.effects[k])),'missing active matching catalogue item')
  return {category:w.category,catalogItemId:item.catalogItemId,weight:w.weight,effects:Object.fromEntries(keys.map(k=>[k,item.effects[k]??0]))}
 })
 const raw=Object.fromEntries(keys.map(k=>[k,round2(selected.reduce((n,x)=>n+x.weight*x.effects[k],0))]))
 const capped=Object.fromEntries(keys.map(k=>[k,Math.max(-4,Math.min(4,raw[k]))]))
 const stageKey={flat:'flat_bonus_pct',hilly:'hilly_bonus_pct',mountain:'mountain_bonus_pct',cobbled:'cobble_bonus_pct',time_trial:'time_trial_bonus_pct'}[terrain]
 req(stageKey,'unsupported terrain')
 return {model:'weighted_equipment_setup_bonus_v1',selected,rawWeightedBonuses:raw,weightedBonuses:capped,stageKey,stageUiBonusPct:capped[stageKey],official:false,authoritativeCatalogueVerified:false,conditionScalingVerified:false}
}
export function reviewOriginalConsumableFallback({supplyKey,planned,stock,riderCount}){
 req(['bidons_water_bottles','energy_gels','nutrition_packs'].includes(supplyKey)&&[planned,stock,riderCount].every(x=>Number.isSafeInteger(x)&&x>=0)&&riderCount>0,'invalid consumable fallback evidence')
 const usableQuantity=Math.min(planned,stock),usableRatio=planned?usableQuantity/planned:0,perRider=usableQuantity/riderCount
 return {usableQuantity,usableRatio,supplySupportPoints:supplyKey==='energy_gels'?.75*perRider:0,standardized:{
 supplyEnergySavingPct:({bidons_water_bottles:.6,energy_gels:1.5,nutrition_packs:3})[supplyKey]*perRider,
 supplyEnergyPenaltyPct:0,supplyFatigueReductionPct:supplyKey==='bidons_water_bottles'?.6*perRider:0,
 supplyFatiguePenaltyPct:planned>stock?3:0,supplyRecoveryBonusPoints:supplyKey==='nutrition_packs'?1.5*perRider:0
 }}
}
