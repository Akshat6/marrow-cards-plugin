// Entirely synthetic, private medical KU facts must not enter public tests.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
class El{
 constructor(){this.children=[];this.text='';this.disabled=false;this.handlers={};}
 createEl(tag,p={}){const x=new El();x.tag=tag;x.text=p.text||'';this.children.push(x);return x;}
 createDiv(p={}){return this.createEl('div',p)}
 addEventListener(k,cb){this.handlers[k]=cb}
 findText(s){if(this.text===s)return this;for(const c of this.children){const n=c.findText(s);if(n)return n;}return null;}
}
class ItemView{constructor(leaf){this.app=leaf.app;this.contentEl=new El();}}
let count=0;
function mockQuestion(p){return {
 blueprintId:p.blueprintId,homeIndexId:p.homeIndexId,sourceIndexIds:p.sourceIndexIds,
 sourceKuIds:p.sourceKuIds,stem:'Which fictional sample category matches the imaginary description provided?',
 options:['A','B','C','D'].map((id,i)=>({id,text:'Fictional answer '+id})),
 correctOptionId:'C',
 optionRationales:['A','B','C','D'].map(id=>({id,isCorrect:id==='C',why:'Synthetic explanation for option '+id,kuIds:[p.sourceKuIds[0]]})),
 answerExplanation:'The fictional source maps to option C in this simulated response.',
 testedKuIds:p.sourceKuIds,sourceScope:'VERIFIED_MARROW_KUS_ONLY',
 externalKnowledgeUsed:false,sourceImage:null,sourceCardId:null};}
const obsidian={
 Plugin:class{},ItemView,PluginSettingTab:class{},Setting:class{},Notice:class{},
 requestUrl:async r=>{count++;assert.equal(r.method,'POST');assert.equal(r.headers.Authorization,'Bearer mock-secret');
  const input=JSON.parse(JSON.parse(r.body).messages[1].content);
  return {status:200,json:{choices:[{message:{content:JSON.stringify(mockQuestion(input))}}],usage:{total_tokens:71}}};},
 base64ToArrayBuffer:()=>{},normalizePath:x=>x};
const expose="\nmodule.exports.P={validatePyqExperimentalFeed,selectPyqExperimentalBlueprint,buildPyqExperimentalPacket,validatePyqExperimentalModel,generatePyqExperimentalDraft,PyqStyleController,MarrowDynamicRecallView,PYQ_EXPERIMENTAL_REMOTE};";
const m={exports:{}};
vm.runInNewContext(source+expose,{module:m,exports:m.exports,
 require:x=>{if(x==='obsidian')return obsidian;throw Error(x)},
 console,Date,JSON,TextDecoder,Promise,setTimeout,clearTimeout},{filename:'main.js'});
const P=m.exports.P;
const unit=(i,indexId)=>({id:'KU-'+String(i).padStart(6,'0'),indexId,
 sourceId:'SRC-TEST-'+i,sourceLocator:'Test PDF position '+i,
 sourceExcerpt:'Invented object X'+i+' matches token '+i,
 promptTarget:'Recall fictional token number '+i,answer:'Fictional token '+i,
 verification:'Verified',subject:'Imaginary',system:'Testing',indexTitle:'Sample'});
const units=[unit(1,'IDX-ONE'),unit(2,'IDX-TWO'),unit(3,'IDX-THREE')];
const snap=u=>({kuId:u.id,indexId:u.indexId,sourceId:u.sourceId,
 sourceLocator:u.sourceLocator,sourceExcerpt:u.sourceExcerpt,
 recallTarget:u.promptTarget,canonicalAnswer:u.answer,verification:'Verified'});
const makeBp=(bid,home,ids)=>{const us=ids.map(id=>units.find(u=>u.id===id));
 return {blueprintId:bid,homeIndexId:home,
  homeIndexRationale:'Primary fictional token home is this selected index',
  version:'1.0.0',sourceKuIds:ids,sourceIndexIds:[...new Set(us.map(u=>u.indexId))],
  evidenceLane:'N',cognitiveOperation:'Integrate two imaginary examples when possible',
  operationRequirement:'Require the fictional token assignments from source data',
  forbiddenTransformations:['Never invent medical facts','No procedures allowed'],
  experimentalEnabled:true,userAcceptedForExperimentalUse:true,clinicallyCertified:false,
  runtimeApproved:false,providerTrialApproved:false,pluginMaySelect:false,
  historicalFullCombinationObserved:false,sourceImage:null,sourceCardId:null,
  exactSourceKUs:us.map(snap)};};
const bp1=makeBp('BP-TEST-ONE','IDX-ONE',['KU-000001','KU-000002']);
const bp3=makeBp('BP-TEST-THREE','IDX-THREE',['KU-000001','KU-000002','KU-000003']);
const feed={schemaVersion:1,kind:'marrow-pyq-style-experimental-ai-v1',
 status:'USER_ACCEPTED_FOR_OPT_IN_EXPERIMENTAL_STUDY',userAcceptedExperimentalUse:true,
 clinicallyCertified:false,runtimeApproved:false,sourcePolicy:'VERIFIED_MARROW_KUS_ONLY',
 sourceKuBlobSha:'e'.repeat(40),externalKnowledgeEnabled:false,
 originalImagesEnabled:false,publicationStatus:'UNVERIFIED_PERSONAL_EXPERIMENT',
 version:'1.0.0',blueprints:[bp1,bp3]};
const cp=x=>JSON.parse(JSON.stringify(x));
function bad(label,fn){assert.throws(fn,undefined,label);}
const saved=new Map();
const vault={getAbstractFileByPath:p=>saved.has(p)?{path:p,extension:p.split('.').at(-1)}:null,
 getFiles:()=>[...saved.keys()].map(p=>({path:p,extension:p.split('.').at(-1)})),
 read:async f=>saved.get(f.path),
 create:async(p,v)=>{assert(!saved.has(p));saved.set(p,v)},
 modify:async(f,v)=>{assert(saved.has(f.path));saved.set(f.path,v)}};
const plugin={app:{vault,secretStorage:{getSecret:()=> 'mock-secret'}},
 settings:{deviceId:'fake-device'},cards:[],indexes:[],dynamicWriteQueue:Promise.resolve(),
 ensureFolder:async()=>{},fetchGithub:async path=>{
  assert.equal(path,P.PYQ_EXPERIMENTAL_REMOTE);return JSON.stringify(feed);}};
const view=new P.MarrowDynamicRecallView({app:plugin.app},plugin);
view.draw=()=>{};view.units=units;view.selectedIndex='IDX-ONE';
const ctrl=new P.PyqStyleController(view);view.pyqState=ctrl;
async function run(){
 assert.equal(P.validatePyqExperimentalFeed(feed,units),feed);
 assert.equal(P.selectPyqExperimentalBlueprint(feed,units,'IDX-ONE').blueprint.blueprintId,'BP-TEST-ONE');
 bad('source index must not display question',()=>P.selectPyqExperimentalBlueprint(feed,units,'IDX-TWO'));
 const packet=P.buildPyqExperimentalPacket(bp1,units);
 assert.deepEqual([...packet.sourceIndexIds],['IDX-ONE','IDX-TWO']);
 assert.equal(P.buildPyqExperimentalPacket(bp3,units).sourceIndexIds.length,3);
 assert.equal(P.validatePyqExperimentalModel(mockQuestion(packet),packet).correctOptionId,'C');
 const mutes=[x=>x.homeIndexId='IDX-TWO',x=>x.sourceIndexIds=['IDX-TWO'],
 x=>x.sourceKuIds.pop(),x=>x.sourceImage='wrong.png',x=>x.reviewStatus='APPROVED',
 x=>x.testedKuIds=['KU-999999'],x=>x.options[1].text=x.options[0].text,
 x=>x.optionRationales[0].kuIds=['KU-000003'],x=>x.correctOptionId='A'];
 for(const f of mutes){const q=cp(mockQuestion(packet));f(q);bad('model field tamper',()=>P.validatePyqExperimentalModel(q,packet));}
 const fmutes=[x=>x.clinicallyCertified=true,x=>x.runtimeApproved=true,
 x=>x.status='APPROVED_FOR_RUNTIME',x=>x.blueprints[0].homeIndexId='IDX-THREE',
 x=>x.blueprints[0].sourceIndexIds=['IDX-TWO','IDX-ONE'],
 x=>x.blueprints[0].sourceKuIds.push('KU-000003'),
 x=>x.blueprints[0].exactSourceKUs[0].canonicalAnswer='changed',
 x=>x.blueprints[0].providerTrialApproved=true,x=>x.blueprints.push(cp(x.blueprints[0])),
 x=>x.originalImagesEnabled=true];
 for(const f of fmutes){const x=cp(feed);f(x);bad('feed tamper',()=>P.validatePyqExperimentalFeed(x,units));}
 const draft=await P.generatePyqExperimentalDraft(plugin,feed,units,'IDX-ONE',[],
  async(_p,msg)=>mockQuestion(JSON.parse(msg[1].content)));
 assert.equal(draft.question.reviewStatus,'AI_GENERATED_UNVERIFIED');
 assert.equal(draft.question.approvedForPractice,false);
 await ctrl.experimentalGenerate('IDX-ONE');
 assert.equal(ctrl.error,'');assert.equal(ctrl.experimentalQuestion.correctOptionId,'C');
 assert.equal(count,1);
 await ctrl.experimentalAnswer('B');assert.equal(ctrl.experimentalChoice,'B');
 await ctrl.experimentalFlag();assert.equal(ctrl.experimentalFlagged,true);
 const rows=[...saved.values()].join('\n').split('\n').filter(Boolean).map(x=>JSON.parse(x));
 assert(rows.some(x=>x.type==='experimental_blueprint_selected'));
 const candidate=rows.find(x=>x.type==='experimental_candidate_unverified');
 assert.equal(candidate.question.sourceIndexIds.length,2);
 assert.equal(candidate.question.reviewStatus,'AI_GENERATED_UNVERIFIED');
 const answer=rows.find(x=>x.type==='experimental_answered');
 assert.equal(answer.matchesModelKey,false);
 assert.equal(answer.countedTowardVerifiedLearningScores,false);
 assert(rows.some(x=>x.type==='experimental_flagged'));
 assert(!rows.some(x=>x.type==='answered'||x.type==='question'));
 plugin.writeJson=async(path,data)=>saved.set(path,JSON.stringify(data));
 await ctrl.exportRecords('IDX-ONE');
 assert.equal(ctrl.error,'');
 const exp=[...saved.entries()].find(([name])=>name.startsWith('MarrowCards/pyq-style/exports/')&&name.endsWith('.json'));
 assert(exp,'Experimental source/answer export must be written');
 const exported=JSON.parse(exp[1]);
 assert.equal(exported.indexId,'IDX-ONE');
 assert(exported.rows.some(x=>x.type==='experimental_candidate_unverified'));
 assert(exported.rows.some(x=>x.type==='experimental_answered'));
 assert(exported.rows.some(x=>x.type==='experimental_flagged'));
 assert(!exported.rows.some(x=>x.homeIndexId==='IDX-TWO'));
 const screen=new El();view.drawPyqStyle(screen);
 assert(screen.findText('Groq answer: C · Different'));
 assert(screen.findText('Generate another experimental MCQ'));
 ctrl.experimentalQuestion=null;const home=new El();view.drawPyqStyle(home);
 assert(home.findText('Try one Experimental AI MCQ (unverified)'));
 assert(home.findText('Check reviewed MCQ feed'));
 console.log('PASS experimental Obsidian source-locked dynamic MCQ: 1/2/3 index scope, 19 model/feed negatives, real controller UI and mock metered Groq, independent logs and NO release.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
