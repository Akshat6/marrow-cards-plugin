'use strict';
// Isolated PUBLIC synthetic-only parity prototype for a future reviewed,
// one-home/multi-source PYQ-style mode. NOT wired into main.js and NO transport.
// Never copy private original KU facts or PYQs here.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const POLICY='VERIFIED_MARROW_KUS_ONLY';
const KIND='NON_DISPATCHABLE_HOME_INDEX_AUDIT_STRUCTURE';
const KU=/^KU-\d{6}$/;
const ID=/^[A-Za-z0-9_-]{1,100}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
const stable=x=>JSON.stringify(x);
function validBlueprint(b) {
 assert(b&&id(b.blueprintId)&&id(b.homeIndexId),'Blueprint has no unique home');
 assert(typeof b.homeIndexRationale==='string'&&b.homeIndexRationale.trim().length>=20);
 assert(typeof b.version==='string'&&b.version.length<=32);
 assert(Array.isArray(b.sourceKuIds)&&b.sourceKuIds.length>=2&&b.sourceKuIds.length<=12);
 assert(b.sourceKuIds.every(k=>KU.test(k))&&new Set(b.sourceKuIds).size===b.sourceKuIds.length);
 assert(Array.isArray(b.sourceIndexIds)&&b.sourceIndexIds.length>=1&&b.sourceIndexIds.length<=12);
 assert(b.sourceIndexIds.every(id)&&new Set(b.sourceIndexIds).size===b.sourceIndexIds.length);
 assert(b.sourceIndexIds.includes(b.homeIndexId),'Home must originate among sources');
 assert(['A','N'].includes(b.evidenceLane),'This scaffold supports A/N research only');
 assert(typeof b.cognitiveOperation==='string'&&b.cognitiveOperation.trim().length>=15);
 assert(typeof b.distractorBoundaries==='string'&&b.distractorBoundaries.trim().length>=15);
 assert(b.sourcePolicy===POLICY&&b.externalKnowledgeUsed===false);
 assert(b.historicalFullCombinationObserved===false);
 assert(b.researchOnly===true&&b.independentClinicalReviewCompleted===false);
 assert(b.approvedForProviderTrial===false&&b.pluginMaySelect===false&&b.runtimeApproved===false);
 assert(b.allowedImage===null&&b.sourceCardId===null);
 assert(!Object.hasOwn(b,'indexId'),'Legacy indexId cannot masquerade as homeIndexId');
 assert(!Object.hasOwn(b,'primaryIndexId'),'Migration alias not a second home');
 for(const bad of ['stem','options','answerKey','releaseAuditId','approvedRelease','clinicalApprovalId'])
  assert(!Object.hasOwn(b,bad),'No authored question/approval fields on research blueprint');
 return b;
}
function validKu(u) {
 assert(u&&KU.test(u.id)&&id(u.indexId)&&id(u.sourceId)&&u.verification==='Verified',
  'Original KU identity/provenance/Verified status required');
 for(const k of ['sourceLocator','sourceExcerpt','promptTarget','answer']) {
  assert(typeof u[k]==='string'&&u[k].trim().length>=4,'Incomplete original KU '+k);
 }
 assert(!Object.hasOwn(u,'externalKuId'));
 return u;
}
function validateFullProvenance(b,fullVerifiedFeed) {
 validBlueprint(b);
 assert(Array.isArray(fullVerifiedFeed),'Canonical KU feed required');
 const byId=new Map();
 for(const u of fullVerifiedFeed) {
  validKu(u);assert(!byId.has(u.id),'Duplicate canonical KU identity');
  byId.set(u.id,u);
 }
 const exact=b.sourceKuIds.map(k=>{const u=byId.get(k);assert(u,'Unresolvable source KU');return u;});
 const sourceIndexIds=[...new Set(exact.map(u=>u.indexId))];
 assert.deepEqual(sourceIndexIds,b.sourceIndexIds,'Incomplete, extra or reordered original source indexes');
 assert(sourceIndexIds.includes(b.homeIndexId));
 return exact.map(u=>({
  kuId:u.id,indexId:u.indexId,sourceId:u.sourceId,sourceLocator:u.sourceLocator,
  sourceExcerpt:u.sourceExcerpt,recallTarget:u.promptTarget,
  canonicalAnswer:u.answer,verification:u.verification
 }));
}
function signature(b){
 validBlueprint(b);
 return b.sourceKuIds.slice().sort().join(',')+'|'+b.cognitiveOperation.trim().toLowerCase().replace(/\s+/g,' ');
}
function selectAuditBlueprint(blueprints,fullVerifiedFeed,requestedHomeIndexId,events=[]) {
 assert(id(requestedHomeIndexId),'Explicit home index selection required');
 assert(Array.isArray(blueprints)&&Array.isArray(events));
 // Fail closed on duplicate blueprint IDs even if in another home index.
 const ids=new Set();
 for(const b of blueprints) {
  validBlueprint(b);
  assert(!ids.has(b.blueprintId),'Duplicate blueprint id');ids.add(b.blueprintId);
  validateFullProvenance(b,fullVerifiedFeed);
 }
 const local=blueprints.filter(b=>b.homeIndexId===requestedHomeIndexId);
 assert(local.length,'No reviewed audit blueprint under chosen home');
 const seen=new Set();
 const unique=local.slice().sort((a,b)=>a.blueprintId.localeCompare(b.blueprintId)).filter(b=>{
  const sig=signature(b);
  if(seen.has(sig))return false;
  seen.add(sig);return true;
 });
 const history=events.filter(e=>e?.type==='blueprint_selected' &&
  e.homeIndexId===requestedHomeIndexId&&id(e.blueprintId)&&
  Array.isArray(e.sourceKuIds)&&e.sourceKuIds.every(x=>KU.test(x)));
 const count=f=>history.filter(f).length;
 const priority={N:0,A:1};
 const ranking=unique.map(b=>({
  b,uses:count(e=>e.blueprintId===b.blueprintId),
  kuUses:count(e=>e.sourceKuIds.some(x=>b.sourceKuIds.includes(x))),
  laneUses:count(e=>e.evidenceLane===b.evidenceLane)
 })).sort((a,b)=>a.uses-b.uses||a.kuUses-b.kuUses||
  a.laneUses-b.laneUses||priority[a.b.evidenceLane]-priority[b.b.evidenceLane]||
  a.b.blueprintId.localeCompare(b.b.blueprintId));
 const selected=ranking[0];
 return {blueprint:selected.b,trace:{
  policy:'SYNTHETIC_ONLY_M2_STEP5_HOME_INDEX_AUDIT_V092',
  blueprintId:selected.b.blueprintId,homeIndexId:requestedHomeIndexId,
  sourceIndexIds:selected.b.sourceIndexIds.slice(),
  sourceKuIds:selected.b.sourceKuIds.slice(),
  evidenceLane:selected.b.evidenceLane,cognitiveOperation:selected.b.cognitiveOperation,
  historicalFullCombinationObserved:false,
  selectedUnderOtherIndexes:false,sourceTruthClinicallyVerified:false,
  noProviderInvocation:true,approvedForProviderTrial:false,
  pluginMaySelect:false,runtimeApproved:false,estimatedFutureExamProbability:null
 }};
}
function makeAuditPacket(blueprint,fullVerifiedFeed,requestedHomeIndexId) {
 validBlueprint(blueprint);
 assert(requestedHomeIndexId===blueprint.homeIndexId,'Not requested home index');
 const sourceKUs=validateFullProvenance(blueprint,fullVerifiedFeed);
 const packet={
  schemaVersion:2,kind:KIND,adapterVersion:'0.9.2',
  homeIndexId:blueprint.homeIndexId,homeIndexRationale:blueprint.homeIndexRationale,
  blueprintId:blueprint.blueprintId,blueprintVersion:blueprint.version,
  sourcePolicy:POLICY,sourceKuIds:blueprint.sourceKuIds.slice(),
  sourceIndexIds:blueprint.sourceIndexIds.slice(),
  sourceKUs,evidenceLane:blueprint.evidenceLane,
  historicalFullCombinationObserved:false,
  cognitiveOperation:blueprint.cognitiveOperation,
  distractorBoundaries:blueprint.distractorBoundaries,
  sourceIntegrityDigest:crypto.createHash('sha256').update(stable(sourceKUs)).digest('hex'),
  externalKnowledgeAllowed:false,image:null,sourceCardId:null,
  futureExamProbability:null,questionWriter:'Groq only after external approval',
  noProviderInvocation:true,approvedForProviderTrial:false,
  pluginMaySelect:false,runtimeApproved:false,
  clinicallyReviewed:false,generatedQuestion:null
 };
 assert(Buffer.byteLength(stable(packet),'utf8')<=18000,'Oversize packet');
 return packet;
}
function checkAuditPacket(packet,blueprint,fullVerifiedFeed,requestedHomeIndexId) {
 const expected=makeAuditPacket(blueprint,fullVerifiedFeed,requestedHomeIndexId);
 assert.deepEqual(packet,expected,'Protected source, home, KU or status modified');
 return {sourceStructureValid:true,clinicalTruthCertified:false,canDispatchProvider:false};
}
function dispatchResearchPacket(){throw Error('NO_PROVIDER_PATH_AUDIT_ONLY');}
module.exports={POLICY,KIND,validBlueprint,validateFullProvenance,
 signature,selectAuditBlueprint,makeAuditPacket,checkAuditPacket,dispatchResearchPacket};
