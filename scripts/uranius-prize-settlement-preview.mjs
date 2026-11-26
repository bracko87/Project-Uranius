/** Pure review of the original finance_award_race_prize + finance_apply_income_tax posting arithmetic. No DB, account creation, award generation, official settlement or transaction IDs. Logical event refs are review keys only; original tax ref is the persisted source transaction UUID. A caller-supplied prior synthetic receipt is not proof of DB persistence. */
export function reviewPrizeSettlement({award,policy,priorReceipt=null}){
 const req=(ok,m)=>{if(!ok)throw Error(m)}
 const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(x)
 req(award&&uuid(award.awardId)&&uuid(award.raceId)&&uuid(award.clubId)&&uuid(award.stageId),'Exact award/club/race/stage identity required')
 req(award.provenance==='synthetic_review_fixture','Only explicitly synthetic award fixtures accepted; no production data or generated prize schedule')
 req(Number.isSafeInteger(award.grossCash)&&award.grossCash>0,'Positive safe integer cash amount required')
 req(policy&&policy.code==='race_prize'&&typeof policy.isTaxable==='boolean'&&Number.isInteger(policy.taxRateBps)&&policy.taxRateBps>=0&&policy.taxRateBps<=10000,'Explicit transaction tax configuration required')
 req(policy.provenance==='synthetic_review_fixture','Tax policy must be explicitly supplied as test fixture')
 const effectiveRate=policy.isTaxable?policy.taxRateBps:0
 const tax=Number((BigInt(award.grossCash)*BigInt(effectiveRate)+5000n)/10000n)
 const prizeRef='race_prize:'+award.clubId+':'+award.awardId
 const taxRef='tax_withholding:'+award.clubId+':'+prizeRef
 const fingerprint={awardId:award.awardId,raceId:award.raceId,stageId:award.stageId,clubId:award.clubId,grossCash:award.grossCash,taxRateBps:effectiveRate}
 const postings=[{eventType:'race_prize',eventRef:prizeRef,entries:[{account:'TREASURY',amount:-award.grossCash},{account:'CLUB:'+award.clubId,amount:award.grossCash}]}]
 if(tax>0)postings.push({eventType:'tax_withholding',eventRef:taxRef,sourceEventRef:prizeRef,entries:[{account:'CLUB:'+award.clubId,amount:-tax},{account:'TAX_AUTHORITY',amount:tax}]})
 req(postings.every(x=>x.entries.reduce((a,b)=>a+b.amount,0)===0),'Unbalanced posting')
 const receipt={fingerprint,prizeRef,taxRef:tax>0?taxRef:null,grossCash:award.grossCash,taxCash:tax,netCash:award.grossCash-tax}
 if(priorReceipt!==null){
  req(priorReceipt&&JSON.stringify(priorReceipt)===JSON.stringify(receipt),'Conflicting or incomplete existing settlement receipt; refuse replay')
  return {status:'already_reviewed',official:false,writeAllowed:false,accountingAllowed:false,receipt,postings:[]}
 }
 return {status:'preview',official:false,writeAllowed:false,accountingAllowed:false,receipt,postings}
}
