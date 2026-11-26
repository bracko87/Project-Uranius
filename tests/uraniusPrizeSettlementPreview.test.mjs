import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewPrizeSettlement as review} from '../scripts/uranius-prize-settlement-preview.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const award={awardId:id(1),raceId:id(2),stageId:id(3),clubId:id(4),grossCash:10000,provenance:'synthetic_review_fixture'}
const policy={code:'race_prize',isTaxable:true,taxRateBps:1500,provenance:'synthetic_review_fixture'}
const plan=(a=award,p=policy,priorReceipt=null)=>review({award:a,policy:p,priorReceipt})
test('balanced gross and tax postings',()=>{const x=plan();assert.equal(x.receipt.grossCash,10000);assert.equal(x.receipt.taxCash,1500);assert.equal(x.receipt.netCash,8500);assert.equal(x.postings.length,2);assert.ok(x.postings.every(x=>x.entries.reduce((a,e)=>a+e.amount,0)===0))})
test('positive half-unit rounds up',()=>assert.equal(plan({...award,grossCash:10}).receipt.taxCash,2))
test('non-taxable fixture does not withhold',()=>assert.equal(plan(award,{...policy,isTaxable:false}).postings.length,1))
test('exact retry has no new postings',()=>{const x=plan();assert.equal(plan(award,policy,x.receipt).status,'already_reviewed');assert.deepEqual(plan(award,policy,x.receipt).postings,[])})
test('two awards in same race and club have distinct event keys',()=>assert.notEqual(plan({...award,awardId:id(5)}).receipt.prizeRef,plan().receipt.prizeRef))
test('conflicting award amount refused',()=>assert.throws(()=>plan({...award,grossCash:10001},policy,plan().receipt)))
test('partial receipt refused',()=>assert.throws(()=>plan(award,policy,{...plan().receipt,taxRef:null})))
test('non-synthetic award refused',()=>assert.throws(()=>plan({...award,provenance:'production'})))
test('missing tax policy refused',()=>assert.throws(()=>plan(award,{...policy,taxRateBps:undefined})))
test('zero prize refused',()=>assert.throws(()=>plan({...award,grossCash:0})))
test('all official effects prohibited',()=>{const x=plan();assert.equal(x.official,false);assert.equal(x.writeAllowed,false);assert.equal(x.accountingAllowed,false)})
