// Synthetic-only tests; never commit real PYQs or study data.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
class El {
 constructor(){this.children=[];this.handlers={};this.value='';this.disabled=false;this.text='';}
 empty(){this.children=[];}addClass(){}removeClass(){}
 createEl(tag,props={}){const x=new El();x.tag=tag;x.text=props.text||'';this.children.push(x);return x;}
 createDiv(props={}){return this.createEl('div',props);}
 addEventListener(k,fn){this.handlers[k]=fn;}
 findText(s){if(this.text===s)return this;for(const x of this.children){const r=x.findText(s);if(r)return r;}return null;}
}
class ItemView {constructor(leaf){this.app=leaf.app;this.contentEl=new El();}}
const requests=[];
const rawCandidate=()=>({blueprintId:'BP-TEST-001',indexId:'ANA-TEST',sourceScope:'VERIFIED_MARROW_KUS_ONLY',externalKnowledgeUsed:false,stem:'Which imaginary relationship correctly follows from the supplied test-only reference?',
 options:['First sample','Second sample','Third sample','Fourth sample'].map((text,i)=>({id:'ABCD'[i],text})),
 correctOptionId:'A',optionRationales:['A','B','C','D'].map((id,i)=>({id,isCorrect:i===0,why:'Synthetic source rationale number '+i,kuIds:['KU-000001']})),
 answerExplanation:'The fake source explicitly defines the first sample as the correct one.',
 testedKuIds:['KU-000001'],sourceImage:null,sourceCardId:null});
const obsidian={Plugin:class{},ItemView,Notice:class{},PluginSettingTab:class{},Setting:class{},
 requestUrl:async request=>{requests.push(request);assert.equal(request.method,'POST');
  assert.equal(request.headers.Authorization,'Bearer gsk_mock');
  assert.equal(JSON.parse(request.body).model,'openai/gpt-oss-20b');
  return {status:200,json:{choices:[{message:{content:JSON.stringify(rawCandidate())}}],usage:{total_tokens:42}}};},
 base64ToArrayBuffer:()=>{},normalizePath:x=>x
};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.pyqTest={validatePyqStyleBlueprint,validatePyqStyleQuestion,validatePyqStyleRuntime,pyqStyleVerifiedOriginalImage,pyqStyleDraftFromModel,selectPyqStyleBlueprint,PyqStyleController,MarrowDynamicRecallView,PYQ_STYLE_FEED_FILE,PYQ_STYLE_FEED_REMOTE,PYQ_STYLE_EVENTS};',{
 module:m,exports:m.exports,require(n){if(n==='obsidian')return obsidian;throw Error(n);},
 console,TextDecoder,Date,Promise,JSON,setTimeout,clearTimeout
},{filename:'main.js'});
const API=m.exports.pyqTest;
const unit={id:'KU-000001',indexId:'ANA-TEST',subject:'Synthetic',indexTitle:'Imaginary anatomy',
 sourceId:'SRC-TEST-001',sourceLocator:'Synthetic fixture #1',
 promptTarget:'Synthetic matching only',answer:'First sample',sourceExcerpt:'Imaginary source A maps to the first sample.',
 verification:'Verified'};
const bp={blueprintId:'BP-TEST-001',indexId:'ANA-TEST',version:'1.0',evidenceLane:'S',
 sourceScope:'VERIFIED_MARROW_KUS_ONLY',externalKnowledgeUsed:false,
 status:'GENERATOR_ELIGIBLE_REVIEWED',kuIds:[unit.id],
 cognitiveOperation:'Match source-defined imaginary categories',
 stemIntent:'Choose source-defined fake property pair',
 distractorStrategy:'Use fake unrelated labels as contrasts'};
const q={...rawCandidate(),questionId:'MCQ-FAKE-001',reviewStatus:'VERIFIED_SYNTHETIC',
 sourceAuditId:'AUDIT-FAKE-001',claimedHistoricalPyq:false,
 approvedForPractice:true,releaseApprovalId:'RELEASE-FAKE-001'};
const feed={schemaVersion:1,kind:'marrow-pyq-style-runtime',status:'APPROVED_FOR_RUNTIME',
 approvedRelease:true,version:'1.0.0',releaseId:'RELEASE-FAKE-001',releaseAuditId:'REVIEW-FAKE-001',
 sourcePolicy:'VERIFIED_MARROW_KUS_ONLY',sourceKuPath:'dynamic-recall/knowledge-units.json',
 externalKnowledgeEnabled:false,blueprints:[bp],verifiedQuestions:[q]};
let remoteFeed=feed;
const files=new Map();
const vault={getAbstractFileByPath(p){return files.has(p)?{path:p,extension:p.split('.').pop()}:null;},
 getFiles(){return [...files.keys()].map(p=>({path:p,extension:p.split('.').pop()}));},
 async read(f){return files.get(f.path);},
 async create(p,x){assert(!files.has(p));files.set(p,x);},
 async modify(f,x){assert(files.has(f.path));files.set(f.path,x);},
 getResourcePath(f){return 'app://'+f.path;}};
const plugin={app:{vault,secretStorage:{getSecret:k=>k==='marrow-dynamic-groq-key'?'gsk_mock':null}},
 settings:{deviceId:'fake-device'},cards:[],indexes:[],dynamicWriteQueue:Promise.resolve(),
 ensureFolder:async()=>{},writeJson:async(p,x)=>files.set(p,JSON.stringify(x)),
 async fetchGithub(p){assert.equal(p,API.PYQ_STYLE_FEED_REMOTE);return JSON.stringify(remoteFeed);}};
const view=new API.MarrowDynamicRecallView({app:plugin.app},plugin);
view.draw=()=>{};view.units=[unit];view.selectedIndex='ANA-TEST';
const ctrl=new API.PyqStyleController(view);view.pyqState=ctrl;
async function run(){
 assert.equal(API.validatePyqStyleBlueprint(bp),true);
 assert.equal(API.validatePyqStyleQuestion(q),q);
 assert.throws(()=>API.validatePyqStyleRuntime({kind:'marrow-examination-intelligence'},view.units),/No approved/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,status:'DRAFT_NOT_RUNTIME'},view.units),/No approved/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[{...q,reviewStatus:'DRAFT'}]},view.units),/missing review/);
 assert.throws(()=>API.validatePyqStyleQuestion({...q,options:[q.options[0],q.options[0],q.options[2],q.options[3]]}),/A–D/);
 assert.throws(()=>API.validatePyqStyleQuestion({...q,correctOptionId:'B'}),/A–D/);
 assert.throws(()=>API.validatePyqStyleQuestion({...q,options:q.options.map((o,i)=>({...o,text:i<2?'same':'different-'+i}))}),/Duplicate/);
 assert.throws(()=>API.validatePyqStyleQuestion({...q,claimedHistoricalPyq:true}),/original PYQ/);
 assert.equal(API.validatePyqStyleRuntime(feed,view.units),feed);

 // Step 3: source-index isolation, N/S cold-start coverage, and real trace reuse.
 const allScope={...feed,verifiedQuestions:[]};
 const unit2={...unit,id:'KU-000002',sourceId:'SRC-TEST-002',
   sourceExcerpt:'Imaginary second reference states another distinct test-only property.'};
 const n={...bp,blueprintId:'BP-TEST-002',evidenceLane:'N',
   kuIds:[unit.id,unit2.id],cognitiveOperation:'Compare two imaginary source categories'};
 const selectionFeed={...allScope,blueprints:[bp,n]};
 const chosen=API.selectPyqStyleBlueprint(selectionFeed,[unit,unit2],[], 'ANA-TEST',[]);
 assert.equal(chosen.blueprint.blueprintId,'BP-TEST-002'); // N before S when no history
 assert.equal(chosen.trace.estimatedFutureExamProbability,null);
 assert.equal(chosen.trace.externalKnowledgeUsed,false);
 const traceEvent={type:'blueprint_selected',...chosen.trace};
 const rotated=API.selectPyqStyleBlueprint(selectionFeed,[unit,unit2],[],'ANA-TEST',[traceEvent]);
 assert.equal(rotated.blueprint.blueprintId,'BP-TEST-001');
 assert.equal(rotated.trace.actualSelectionEvents,1);
 assert.throws(()=>API.selectPyqStyleBlueprint(selectionFeed,[unit,unit2],[],'ANA-OTHER',[]),/No independently/);

 assert.throws(()=>API.selectPyqStyleBlueprint({...allScope,blueprints:[]},[unit,unit2],[],'ANA-TEST',[]),/No independently/);
 assert.throws(()=>API.selectPyqStyleBlueprint({...selectionFeed,blueprints:[{...n,evidenceLane:'H',sourceCardId:'HISTORY-1'}]},[unit,unit2],[],'ANA-TEST',[]),/Historical/);
 assert.throws(()=>API.selectPyqStyleBlueprint({...selectionFeed,blueprints:[{...n,evidenceLane:'A'}]},[unit,unit2],[],'ANA-TEST',[]),/Historical/);
 assert.throws(()=>API.selectPyqStyleBlueprint({...selectionFeed,blueprints:[{...bp,evidenceLane:'S',historicalEvidence:[{sourceCardId:'HISTORY'}]}]},[unit,unit2],[],'ANA-TEST',[]),/N\/S/);
 assert.throws(()=>API.selectPyqStyleBlueprint({...selectionFeed,blueprints:[{...n,evidenceLane:'S'}]},[unit,unit2],[],'ANA-TEST',[]),/N\/S/);
 const proof={sourceCardId:'APPROVED-FAKE',approvalId:'APR-FAKE',
   verifiedLinkId:'LINK-FAKE',linkedKuId:unit.id,
   correlationStatus:'Confirmed',eligibilityCheck:'VALID'};
 const fakeHistoricalCard={id:'APPROVED-FAKE',type:'pyq',status:'approved',
   indexIds:['ANA-TEST'],images:[]};
 const h={...bp,blueprintId:'BP-H-001',evidenceLane:'H',
   sourceCardId:'APPROVED-FAKE',historicalEvidence:[proof]};
 const a={...n,blueprintId:'BP-A-001',evidenceLane:'A',historicalEvidence:[proof]};
 assert.equal(API.validatePyqStyleRuntime({...allScope,blueprints:[h,a]},[unit,unit2],[fakeHistoricalCard]).blueprints.length,2);
 assert.throws(()=>API.validatePyqStyleRuntime({...allScope,blueprints:[h]},[unit,unit2],[]),/Historical/);
 assert.throws(()=>API.validatePyqStyleRuntime({...allScope,blueprints:[a]},[unit,unit2],[{...fakeHistoricalCard,indexIds:['OTHER']}]),/Historical/);
 assert.throws(()=>API.validatePyqStyleRuntime({...allScope,blueprints:[{...a,historicalEvidence:[{...proof,eligibilityCheck:'INVALID'}]}]},[unit,unit2],[fakeHistoricalCard]),/Historical/);
 const dedup={...n,blueprintId:'BP-TEST-003'};
 const dedupPlan=API.selectPyqStyleBlueprint({...allScope,blueprints:[n,dedup]},[unit,unit2],[],'ANA-TEST',[]);
 assert.equal(dedupPlan.trace.candidateCount,1);


 // Step 2: strict notes-only eligibility, verified source pointers and release provenance.
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,sourcePolicy:'EXTERNAL_EXPANDED'},view.units),/notes-only/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,externalKnowledgeEnabled:true},view.units),/notes-only/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,sourceKuPath:'external-kus.json'},view.units),/notes-only/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,version:'1.0.0-beta'},view.units),/notes-only/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,releaseAuditId:''},view.units),/notes-only/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,blueprints:[{...bp,kuIds:['EXKU-000001']}]},view.units),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,blueprints:[{...bp,kuIds:['KU-000002']}]},view.units),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,blueprints:[{...bp,kuIds:[unit.id,unit.id]}]},view.units),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,blueprints:[{...bp,externalKnowledgeUsed:true}]},view.units),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[{...q,testedKuIds:['EXKU-000001']}]},view.units),/source IDs/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[{...q,approvedForPractice:false}]},view.units),/release approval/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[{...q,releaseApprovalId:'ANOTHER-RELEASE'}]},view.units),/release approval/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[{...q,externalKnowledgeUsed:true}]},view.units),/source IDs/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,verifiedQuestions:[q,q]},view.units),/release approval/);
 assert.throws(()=>API.validatePyqStyleRuntime({...feed,blueprints:[bp,bp]},view.units),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime(feed,[{...unit,verification:'Unverified'}]),/blueprint/);
 assert.throws(()=>API.validatePyqStyleRuntime(feed,[{...unit,sourceLocator:''}]),/blueprint/);
 const bImage={...bp,sourceCardId:'APPROVED-FAKE',sourceImage:'fake-original.png'};
 const qImage={...q,sourceCardId:'APPROVED-FAKE',sourceImage:'fake-original.png'};
 const imageFeed={...feed,blueprints:[bImage],verifiedQuestions:[qImage]};
 assert.throws(()=>API.validatePyqStyleRuntime(imageFeed,view.units,[]),/image/);
 plugin.cards=[{id:'APPROVED-FAKE',status:'approved',images:['fake-original.png'],indexIds:['ANA-TEST']}];
 assert.equal(API.validatePyqStyleRuntime(imageFeed,view.units,plugin.cards),imageFeed);
 assert.throws(()=>API.validatePyqStyleRuntime({...imageFeed,verifiedQuestions:[{...qImage,sourceImage:null}]},view.units,plugin.cards),/image match/);
 plugin.cards=[];

 const im={...q,sourceImage:'fake-original.png',sourceCardId:'APPROVED-FAKE'};
 assert.throws(()=>API.pyqStyleVerifiedOriginalImage(plugin,im),/not in an approved card/);
 plugin.cards=[{id:'APPROVED-FAKE',status:'approved',images:['fake-original.png'],indexIds:['ANA-TEST']}];
 assert.throws(()=>API.pyqStyleVerifiedOriginalImage(plugin,im),/has not been downloaded/);
 files.set('MarrowCards/media/fake-original.png','fake-media');
 assert.match(API.pyqStyleVerifiedOriginalImage(plugin,im),/app:\/\//);
 await ctrl.syncApproved();assert.equal(ctrl.feed.version,'1.0.0');assert(files.has(API.PYQ_STYLE_FEED_FILE));

 // A remote downgrade or silent same-version mutation must not overwrite local reviewed cache.
 const stable=files.get(API.PYQ_STYLE_FEED_FILE);
 remoteFeed={...feed,version:'0.9.0'};
 await ctrl.syncApproved();
 assert.match(ctrl.error,/downgrade/);
 assert.equal(files.get(API.PYQ_STYLE_FEED_FILE),stable);
 remoteFeed={...feed,verifiedQuestions:[{...q,stem:q.stem+' Altered without version.'}]};
 await ctrl.syncApproved();
 assert.match(ctrl.error,/without a version increase/);
 assert.equal(files.get(API.PYQ_STYLE_FEED_FILE),stable);
 remoteFeed=feed;
 await ctrl.syncApproved();
 assert.equal(ctrl.error,'');
 assert.equal(files.get(API.PYQ_STYLE_FEED_FILE),stable);

 await ctrl.start('ANA-TEST',10);assert.equal(ctrl.status,'study');assert.equal(ctrl.current.questionId,q.questionId);
 assert.equal(ctrl.queue.length,1);assert.equal(requests.length,0);
 await ctrl.choose('B');await ctrl.choose('A');await ctrl.flagCurrent();await ctrl.flagCurrent();
 const evPath=[...files.keys()].find(x=>x.startsWith(API.PYQ_STYLE_EVENTS+'/')&&x.endsWith('.jsonl'));
 const rows=files.get(evPath).trim().split('\n').map(JSON.parse);
 assert.equal(rows.filter(x=>x.type==='question').length,1);
 assert.equal(rows.filter(x=>x.type==='answered').length,1);
 assert.equal(rows.filter(x=>x.type==='flagged').length,1);
 assert.equal(rows.find(x=>x.type==='question').question.options.length,4);
 assert.equal(rows.find(x=>x.type==='answered').selectedOptionId,'B');
 assert.equal(rows.find(x=>x.type==='answered').correct,false);
 assert.equal(typeof rows.find(x=>x.type==='answered').responseTimeMs,'number');
 await ctrl.next();assert.equal(ctrl.status,'finished');
 await ctrl.exportRecords('ANA-TEST');
 const exportFile=[...files.keys()].find(x=>x.startsWith('MarrowCards/pyq-style/exports/')&&x.endsWith('.json'));
 assert(exportFile);assert.equal(JSON.parse(files.get(exportFile)).rows.filter(x=>x.type==='answered').length,1);
 const before=ctrl.queue.length;ctrl.status='home';await ctrl.auditCandidate('ANA-TEST');
 assert.equal(requests.length,1);assert.equal(ctrl.queue.length,before);
 const events=files.get(evPath).trim().split('\n').map(JSON.parse);
 assert.equal(events.filter(x=>x.type==='candidate_unverified').length,1);
 assert.equal(events.filter(x=>x.type==='blueprint_selected').length,1);
 assert.equal(events.find(x=>x.type==='blueprint_selected').evidenceLane,'S');
 assert.equal(events.find(x=>x.type==='blueprint_selected').sourceKuIds[0],unit.id);
 assert(![...files.keys()].some(x=>x.startsWith('MarrowCards/reviews/')||
  x.startsWith('MarrowCards/notes/')||x.startsWith('MarrowCards/packs/')));
 assert(source.includes("text:'PYQ-style'"));
 assert(source.includes("if(this.screen==='pyq-style'){this.drawPyqStyle(el);return;}"));
 const host=new El();view.drawPyqStyle(host);
 assert(host.findText('Check reviewed MCQ feed'));
 assert(host.findText('Generate ONE audit-only draft with Groq'));

 // Monotonically versioned replacement is allowed if the new question release matches.
 remoteFeed={...feed,version:'1.0.1',releaseId:'RELEASE-FAKE-002',
   releaseAuditId:'REVIEW-FAKE-002',
   verifiedQuestions:[{...q,releaseApprovalId:'RELEASE-FAKE-002'}]};
 await ctrl.syncApproved();
 assert.equal(ctrl.feed.version,'1.0.1');
 assert.equal(JSON.parse(files.get(API.PYQ_STYLE_FEED_FILE)).releaseId,'RELEASE-FAKE-002');
 // Stale in-memory approval is never usable after a corrupted local cache read.
 const goodCache=files.get(API.PYQ_STYLE_FEED_FILE);
 files.set(API.PYQ_STYLE_FEED_FILE,'{"corrupted":true}');
 await assert.rejects(()=>ctrl.loadLocal(),/notes-only/);
 assert.equal(ctrl.feed,null);
 files.set(API.PYQ_STYLE_FEED_FILE,goodCache);
 await ctrl.loadLocal();assert.equal(ctrl.feed.version,'1.0.1');

 console.log('PYQ-style step-2 feed hardening: draft gate, original image, option check, one answer, flag, export, Groq audit-only candidate.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
