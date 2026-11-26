// 038: private owner-supplied policy snapshot, no hosted access or publication.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {planSyntheticFinalization} from './uranius-synthetic-finalization-plan.mjs'
export const POLICY_SHA256='22be0d2731882aa90f970c30db008a99a9564d32361f2f3e01139a2cb4f64650'
const codes=['1.1','1.2','1.HC','1.Pro','1.UWT','2.1','2.2','2.HC','2.Pro','2.UWT']
const integer=x=>Number.isSafeInteger(x)&&x>=0
const sum=xs=>xs.reduce((a,b)=>a+b,0)
const milli=x=>{assert.ok((typeof x==='string'||typeof x==='number')&&/^\d{1,3}(\.\d{1,3})?$/.test(String(x)),'Invalid percentage');const [a,b='']=String(x).split('.');const n=Number(a)*1000+Number(b.padEnd(3,'0'));assert.ok(n<=100000);return n}
const unique=(xs,key)=>new Set(xs.map(key)).size===xs.length
export function loadOriginalPolicy(text){
 assert.equal(typeof text,'string')
 assert.ok(Buffer.byteLength(text,'utf8')<=65536)
 assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),POLICY_SHA256,'Exact private snapshot required')
 const p=JSON.parse(text)
 assert.deepEqual(Object.keys(p).sort(),['categories','prizes','rankings','tax'])
 assert.deepEqual(p.categories.map(x=>x.race_class_code).sort(),[...codes].sort())
 assert.equal(p.prizes.length,40);assert.equal(p.rankings.length,20);assert.equal(sum(p.rankings.map(x=>x.scale.length)),281)
 assert.ok(unique(p.prizes,x=>x.race_class_code+':'+x.bucket_key)&&unique(p.rankings,x=>x.race_class_code+':'+x.source_type))
 assert.ok([...p.prizes,...p.rankings].every(x=>codes.includes(x.race_class_code)))
 assert.equal(p.tax.length,1);const tax=p.tax[0]
 assert.ok(tax.code==='race_prize'&&typeof tax.is_taxable==='boolean'&&integer(tax.tax_rate_bps)&&tax.tax_rate_bps<=10000)
 const categories=p.categories.map(c=>{
  const stage=c.race_class_code.startsWith('2.')
  assert.equal(c.race_format,stage?'stage_race':'one_day')
  assert.ok([c.min_teams,c.target_teams,c.max_teams,c.min_riders_per_team,c.max_riders_per_team,c.prize_fund_min_cash,c.prize_fund_max_cash].every(integer))
  assert.ok(c.min_teams>0&&c.min_teams<=c.target_teams&&c.target_teams<=c.max_teams&&c.min_riders_per_team>0&&c.min_riders_per_team<=c.max_riders_per_team&&c.prize_fund_min_cash<=c.prize_fund_max_cash)
  assert.equal(typeof c.ranking_points_enabled,'boolean')
  const buckets=p.prizes.filter(x=>x.race_class_code===c.race_class_code).map(x=>{
   assert.ok(integer(x.top_n)&&x.top_n>0&&Array.isArray(x.rank_distribution_percent)&&x.rank_distribution_percent.length===x.top_n)
   const rankMilliPercent=x.rank_distribution_percent.map(milli);assert.equal(sum(rankMilliPercent),100000)
   return {key:x.bucket_key,shareMilliPercent:milli(x.share),rankMilliPercent}
  })
  assert.deepEqual(buckets.map(x=>x.key).sort(),stage?['final_gc','final_mountain','final_points','final_team','final_young','stage_finish']:['oneday_finish','oneday_team'])
  assert.equal(sum(buckets.map(x=>x.shareMilliPercent)),100000)
  const scales=p.rankings.filter(x=>x.race_class_code===c.race_class_code)
  assert.deepEqual(scales.map(x=>x.source_type).sort(),stage?['final_gc','leader_day','stage_finish']:['oneday_finish'])
  const rankingRules=scales.flatMap(x=>{assert.ok(x.scale.length>0&&x.scale.every(([r,n],i)=>r===i+1&&integer(n)&&n<=2147483647));return x.scale.map(([rank,points])=>({source:x.source_type,rank,points}))})
  return {code:c.race_class_code,format:c.race_format,minTeams:c.min_teams,maxTeams:c.max_teams,minRiders:c.min_riders_per_team,maxRiders:c.max_riders_per_team,minCash:c.prize_fund_min_cash,maxCash:c.prize_fund_max_cash,rankingEnabled:c.ranking_points_enabled,buckets,rankingRules}
 })
 return {sha256:POLICY_SHA256,categories,taxRateBps:tax.is_taxable?tax.tax_rate_bps:0}
}
export function planWithOriginalPolicy({policyText,category,fixture}){
 const policy=loadOriginalPolicy(policyText),c=policy.categories.find(x=>x.code===category)
 assert.ok(c,'Unknown category')
 assert.equal(fixture?.provenance,'synthetic_review_fixture','Only synthetic fixtures; private engine jobs are not authorized')
 assert.equal(fixture.format,c.format)
 assert.equal(fixture.worldChampionship,false,'Special race eligibility outside ordinary category review')
 assert.ok(integer(fixture.prizeFundCash)&&fixture.prizeFundCash>=c.minCash&&fixture.prizeFundCash<=c.maxCash,'Synthetic prize fund outside original category range')
 assert.ok(!Object.hasOwn(fixture,'buckets')&&!Object.hasOwn(fixture,'rankingRules')&&!Object.hasOwn(fixture,'fixtureTaxRateBps'),'No policy overrides')
 const plan=planSyntheticFinalization({...fixture,buckets:c.buckets,rankingRules:c.rankingEnabled?c.rankingRules:[],coverage:{...fixture.coverage,policy:true}})
 const settlements=plan.cash.map(a=>{const taxCash=Number((BigInt(a.grossCash)*BigInt(policy.taxRateBps)+5000n)/10000n);return {...a,taxCash,netCash:a.grossCash-taxCash}})
 const totals=rows=>({grossCash:sum(rows.map(x=>x.grossCash)),taxCash:sum(rows.map(x=>x.taxCash)),netCash:sum(rows.map(x=>x.netCash))})
 const all=totals(settlements),current=totals(settlements.filter(x=>x.stageId===plan.stageId))
 return {version:'038_original_policy_fixture_review_v1',policySha256:policy.sha256,category,fixtureTaxRateBps:policy.taxRateBps,plan,settlements,allGenerated:all,currentStageOnly:current,unallocatedOrRoundingCash:plan.final?fixture.prizeFundCash-all.grossCash:null,official:false,hostedWriteAllowed:false,accountingAllowed:false}
}
