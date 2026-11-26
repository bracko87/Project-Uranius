import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcileCanonicalMarkerReview} from '../scripts/uranius-canonical-marker-review.mjs'
import {carryoverDigest} from '../scripts/uranius-multistage-carryover-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const stageId=id(1)
const row=(n,t,km,points=[],bonus=[],kom=null)=>({id:id(n),stage_id:stageId,point_type:t,km_from_start:km,name:t,kom_category:kom,points_scheme:points,time_bonus_seconds:bonus,is_finish_point:t==='FINISH',sort_order:n})
const fixture=()=>({provenance:'synthetic_review_fixture',completeCanonicalEvidence:true,stageId,distanceKm:100,stageFormat:'road_race',profile:{intermediate_sprints:[{km:30,name:'Town sprint'},{km:65,name:'Bonus sprint'}],mountain_climbs:[{km:85,category:'Cat 2',name:'Summit'}],route_markers:[{type:'sprint',km:12,label:'Ignored duplicate source'}]},canonicalRows:[row(10,'START',0),row(11,'SPRINT',29,[20,17]),row(12,'BONUS_SPRINT',60,[5],[3,2]),row(13,'KOM',80,[8,4],[],'3'),row(14,'FINISH',100,[25,20],[10,6,4])]})
test('explicit physical profile wins; canonical IDs and scoring schemes retained',()=>{
 const p=fixture(),before=structuredClone(p),v=reconcileCanonicalMarkerReview(p),r=v.receipt
 assert.equal(r.sourceMode,'explicit_profile')
 assert.deepEqual(r.traceMarkers,[{pointId:id(11),type:'INTERMEDIATE_SPRINT',km:30},{pointId:id(12),type:'BONUS_SPRINT',km:65},{pointId:id(13),type:'KOM',km:85}])
 assert.deepEqual(r.scoringPoints[2].timeBonusSeconds,[3,2]);assert.deepEqual(r.scoringPoints[3].pointsScheme,[8,4])
 assert.equal(r.points[3].komCategory,'2');assert.equal(r.points[3].canonicalKm,80)
 assert.equal(r.points[1].name,'Town sprint');assert.equal(r.official,false);assert.equal(r.authoritativeSourceVerified,false)
 assert.equal(v.sha256,carryoverDigest(r));assert.deepEqual(p,before)
 assert.deepEqual(reconcileCanonicalMarkerReview({...p,canonicalRows:[...p.canonicalRows].reverse()}),v)
})
test('fallback route marker positions and timing checkpoint exclusion',()=>{
 const p=fixture();p.profile={intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'sprint',km:31,label:'Town sprint'},{type:'sprint',km:67,label:'Bonus sprint'},{type:'mountain_climb',km:86,category:'HC'},{type:'sprint',km:15,label:'Mid-course time check'},{type:'time_checkpoint',km:50}]}
 const r=reconcileCanonicalMarkerReview(p).receipt
 assert.equal(r.sourceMode,'route_marker_fallback');assert.deepEqual(r.traceMarkers.map(x=>x.km),[31,67,86]);assert.equal(r.excludedTimingMarkers.length,2)
 assert.equal(r.points[3].komCategory,'HC')
})
test('canonical-only geometry and zero-intermediate race are supported',()=>{
 const p=fixture();p.profile={intermediate_sprints:[],mountain_climbs:[],route_markers:[]}
 const r=reconcileCanonicalMarkerReview(p).receipt
 assert.equal(r.sourceMode,'canonical_only');assert.deepEqual(r.traceMarkers.map(x=>x.km),[29,60,80])
 p.canonicalRows=p.canonicalRows.filter(x=>['START','FINISH'].includes(x.point_type));assert.deepEqual(reconcileCanonicalMarkerReview(p).receipt.traceMarkers,[])
})
test('mismatched scoring and physical catalogues rejected rather than invented',()=>{
 let p=fixture();p.profile.intermediate_sprints.pop();assert.throws(()=>reconcileCanonicalMarkerReview(p),/count mismatch/)
 p=fixture();p.profile.mountain_climbs=[];assert.throws(()=>reconcileCanonicalMarkerReview(p),/count mismatch/)
 p=fixture();p.profile={intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'sprint',km:5,label:'Time split'}]};assert.throws(()=>reconcileCanonicalMarkerReview(p),/timing-only/)
})
test('malformed, duplicated, foreign, missing or out-of-range point evidence rejected',()=>{
 for(const change of [p=>p.canonicalRows.push(p.canonicalRows[1]),p=>p.canonicalRows[1].stage_id=id(99),p=>delete p.canonicalRows[1].points_scheme,p=>p.canonicalRows[2].time_bonus_seconds=[-1],p=>p.profile.intermediate_sprints[0].km=101,p=>p.profile.mountain_climbs[0].category='unknown',p=>p.canonicalRows.pop(),p=>p.canonicalRows[1].km_from_start=0,p=>p.canonicalRows[1].name='Timing gate']){
  const p=fixture();change(p);assert.throws(()=>reconcileCanonicalMarkerReview(p))
 }
})
test('timing checkpoints never carry points or bonuses, including ITT',()=>{
 const p=fixture();p.stageFormat='individual_time_trial';p.profile={intermediate_sprints:[],mountain_climbs:[],route_markers:[{type:'sprint',km:15,label:'Time check'}]}
 p.canonicalRows=[row(10,'START',0),row(15,'TIME_CHECK',15),row(14,'FINISH',100,[25,20])]
 const r=reconcileCanonicalMarkerReview(p).receipt;assert.deepEqual(r.traceMarkers,[]);assert.equal(r.excludedTimingMarkers.length,1)
 p.canonicalRows[1].points_scheme=[1];assert.throws(()=>reconcileCanonicalMarkerReview(p),/non-scoring/)
 p.canonicalRows[1].points_scheme=[];p.canonicalRows[2].time_bonus_seconds=[10];assert.throws(()=>reconcileCanonicalMarkerReview(p),/time trial/)
})
test('legacy labelled explicit sprint timing checkpoints fail closed if scoring remains',()=>{
 const p=fixture();p.profile.intermediate_sprints[0].name='Time check';assert.throws(()=>reconcileCanonicalMarkerReview(p),/count mismatch/)
 p.canonicalRows.splice(1,1);const r=reconcileCanonicalMarkerReview(p).receipt;assert.equal(r.excludedTimingMarkers.length,1);assert.equal(r.traceMarkers.length,2)
})
