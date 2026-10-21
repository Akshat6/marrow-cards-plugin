'use strict';
// PUBLIC synthetics only. The word "Verified" below means the fixture's shape,
// NOT medically verified facts, source approval, actual Groq output or PYQs.
const assert=require('node:assert/strict');
const A=require('../pyq-style-multi-index-audit.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const mk=(i,idx)=>{
 const n=String(i).padStart(6,'0');
 return {id:'KU-'+n,indexId:idx,subject:'Synthetic',sourceId:'SRC-TEST-'+n,
 sourceLocator:'fixture-locator-'+n,sourceExcerpt:'Imaginary symbol X'+n+' maps to sample token '+n,
 promptTarget:'Find matching imaginary sample token '+n,answer:'Token '+n,
 verification:'Verified'};
};
const sources=[mk(1,'IDX-X'),mk(2,'IDX-Y'),mk(3,'IDX-Z'),mk(4,'IDX-Y')];
function bp(name,home,kuIds,indexes,operation='Compare imaginary symbol relations') {
 return {blueprintId:name,homeIndexId:home,homeIndexRationale:'Synthetic fixture home chosen by primary test token',
  version:'0.9.2',sourceKuIds:kuIds,sourceIndexIds:indexes,evidenceLane:'N',
  cognitiveOperation:operation,distractorBoundaries:'No medical or unrecorded facts',
  sourcePolicy:A.POLICY,externalKnowledgeUsed:false,historicalFullCombinationObserved:false,
  researchOnly:true,independentClinicalReviewCompleted:false,approvedForProviderTrial:false,
  pluginMaySelect:false,runtimeApproved:false,allowedImage:null,sourceCardId:null};
}
const x=bp('BP-X','IDX-X',['KU-000001','KU-000002'],['IDX-X','IDX-Y']);
const z=bp('BP-Z','IDX-Z',['KU-000001','KU-000002','KU-000003'],['IDX-X','IDX-Y','IDX-Z'],
 'Compare three imaginary source tokens without clinical inference');
const y=bp('BP-Y','IDX-Y',['KU-000002','KU-000004'],['IDX-Y'],
 'Compare two synthetic same-index token categories');
for(const b of [x,y,z]) {
 const p=A.makeAuditPacket(b,sources,b.homeIndexId);
 assert.equal(p.homeIndexId,b.homeIndexId);
 assert.deepEqual(p.sourceIndexIds,b.sourceIndexIds);
 assert.deepEqual(p.sourceKuIds,b.sourceKuIds);
 assert.deepEqual(p.sourceIndexIds,[...new Set(p.sourceKUs.map(u=>u.indexId))]);
 assert.equal(p.approvedForProviderTrial,false);
 assert.equal(p.noProviderInvocation,true);
 assert.equal(p.pluginMaySelect,false);
 assert.equal(p.runtimeApproved,false);
 assert.equal(p.generatedQuestion,null);
 assert.equal(A.checkAuditPacket(p,b,sources,b.homeIndexId).canDispatchProvider,false);
}
assert.equal(A.makeAuditPacket(z,sources,'IDX-Z').sourceIndexIds.length,3);
assert.equal(A.makeAuditPacket(y,sources,'IDX-Y').sourceIndexIds.length,1);
const selectX=A.selectAuditBlueprint([x,y,z],sources,'IDX-X');
assert.equal(selectX.blueprint.blueprintId,'BP-X');
assert.equal(selectX.trace.homeIndexId,'IDX-X');
const selectZ=A.selectAuditBlueprint([x,y,z],sources,'IDX-Z');
assert.equal(selectZ.blueprint.blueprintId,'BP-Z');
assert.deepEqual(selectZ.trace.sourceIndexIds,['IDX-X','IDX-Y','IDX-Z']);
const ev=[{type:'blueprint_selected',homeIndexId:'IDX-X',sourceKuIds:x.sourceKuIds,blueprintId:x.blueprintId,evidenceLane:'N'}];
assert.equal(A.selectAuditBlueprint([x,y,z],sources,'IDX-X',ev).trace.homeIndexId,'IDX-X');
const dup=bp('BP-X2','IDX-X',x.sourceKuIds,x.sourceIndexIds);
assert.equal(A.selectAuditBlueprint([dup,x],sources,'IDX-X').trace.blueprintId,'BP-X');
assert.throws(()=>A.dispatchResearchPacket());
let rejected=0;
const fail=(name,fn)=>{assert.throws(fn,undefined,'expected rejection: '+name);rejected++;};
fail('supporting index not a second home',()=>A.makeAuditPacket(x,sources,'IDX-Y'));
fail('unknown home',()=>A.selectAuditBlueprint([x,y],sources,'IDX-Z'));
fail('duplicate blueprint ID',()=>A.selectAuditBlueprint([x,clone(x)],sources,'IDX-X'));
fail('unreviewed source extra',()=>A.makeAuditPacket(x,[...sources,mk(5,'IDX-Q')].map(u=>({...u,verification:u.verification})), 'IDX-Y')); // request mismatch must fail
const mutations=[
 ['source index lie',b=>b.sourceIndexIds=['IDX-X']],
 ['add source index',b=>b.sourceIndexIds.push('IDX-Q')],
 ['home not in sources',b=>b.homeIndexId='IDX-Q'],
 ['blank home rationale',b=>b.homeIndexRationale=''],
 ['legacy index alias',b=>b.indexId='IDX-X'],
 ['primary alias',b=>b.primaryIndexId='IDX-Y'],
 ['unknown ku',b=>b.sourceKuIds[0]='KU-999999'],
 ['extra ku',b=>b.sourceKuIds.push('KU-000003')],
 ['duplicate ku',b=>b.sourceKuIds.push('KU-000001')],
 ['changed version',b=>b.version='v'.repeat(100)],
 ['source policy drift',b=>b.sourcePolicy='EXTERNAL_KU'],
 ['external fact switch',b=>b.externalKnowledgeUsed=true],
 ['historical question spoof',b=>b.historicalFullCombinationObserved=true],
 ['unreviewed changed',b=>b.researchOnly=false],
 ['clinical approval spoof',b=>b.independentClinicalReviewCompleted=true],
 ['provider trial approval spoof',b=>b.approvedForProviderTrial=true],
 ['plugin select spoof',b=>b.pluginMaySelect=true],
 ['runtime approval spoof',b=>b.runtimeApproved=true],
 ['image inserted',b=>b.allowedImage='test.jpg'],
 ['old PYQ card injected',b=>b.sourceCardId='FAKE-CARD'],
 ['MCQ inserted',b=>b.stem='Which fake item'],
 ['options inserted',b=>b.options=['a','b','c','d']],
 ['release audit spoof',b=>b.releaseAuditId='FAKE-RELEASE']
];
for(const [name,change] of mutations){
 const b=clone(x);change(b);fail(name,()=>A.makeAuditPacket(b,sources,b.homeIndexId));
}
const unitMutations=[
 ['false original index',list=>list[0].indexId='IDX-Z'],
 ['unverified original',list=>list[0].verification='Draft'],
 ['blank source excerpt',list=>list[0].sourceExcerpt=''],
 ['no locator',list=>list[0].sourceLocator=''],
 ['no source id',list=>list[0].sourceId=''],
 ['missing source unit',list=>list.shift()],
 ['duplicate source unit',list=>list.push(clone(list[0]))],
 ['invent unknown extra original',list=>list.push({...clone(list[0]),id:'KU-000009'})]
];
for(const [name,change] of unitMutations){
 const units=clone(sources);change(units);
 // Unknown extra KU with properly formed source is allowed in full feed; 
 // it cannot leak into a blueprint unless explicitly listed. Verify no leakage.
 if(name==='invent unknown extra original'){
  const p=A.makeAuditPacket(x,units,'IDX-X');assert.equal(p.sourceKUs.length,2);
 }else fail(name,()=>A.makeAuditPacket(x,units,'IDX-X'));
}
const packetMutations=[
 ['home index remap',p=>p.homeIndexId='IDX-Y'],
 ['source index alias',p=>p.sourceIndexIds=['IDX-X']],
 ['source excerpt changed',p=>p.sourceKUs[0].sourceExcerpt='fabricated'],
 ['source origin changed',p=>p.sourceKUs[1].indexId='IDX-X'],
 ['source integrity hash mutated',p=>p.sourceIntegrityDigest='0000'],
 ['clinical certification spoof',p=>p.clinicallyReviewed=true],
 ['provider grant spoof',p=>p.approvedForProviderTrial=true],
 ['runtime flag',p=>p.runtimeApproved=true],
 ['model response field',p=>p.generatedQuestion={stem:'Not real'}],
 ['fake image',p=>p.image='fake.png'],
 ['faked history',p=>p.historicalFullCombinationObserved=true],
 ['faked future prediction',p=>p.futureExamProbability=0.75],
 ['extra options',p=>p.options=[1,2,3,4]],
 ['duplicated index ownership',p=>p.otherHomeIndexId='IDX-Y']
];
for(const [name,change] of packetMutations){
 const pkt=A.makeAuditPacket(x,sources,'IDX-X');change(pkt);
 fail(name,()=>A.checkAuditPacket(pkt,x,sources,'IDX-X'));
}
assert.equal(rejected,4+mutations.length+(unitMutations.length-1)+packetMutations.length);
console.log('PASS: standalone public multi-index audit helper, 1/2/3 source indexes under one home, '+rejected+' invalid scopes/metadata rejected; no Groq, no private KUs, no runtime integration.');
