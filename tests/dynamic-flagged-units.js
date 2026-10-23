// Synthetic notes-only activation: no private source facts or live provider calls.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class El {
 constructor(tag='div',p={}){this.tag=tag;this.text=p.text||'';this.children=[];this.events={};this.value='';this.classes=new Set((p.cls||'').split(/\s+/));}
 createEl(t,p={}){const x=new El(t,p);this.children.push(x);return x;}
 createDiv(p={}){return this.createEl('div',p);}
 empty(){this.children=[];} addClass(){} removeClass(){} addEventListener(n,f){this.events[n]=f;}
}
class ItemView{constructor(l){this.app=l.app;this.contentEl=new El();}}
const requests=[],files=new Map();
const obsidian={Plugin:class{},ItemView,PluginSettingTab:class{},Setting:class{},Notice:class{},normalizePath:x=>x,base64ToArrayBuffer(){},
 requestUrl:async r=>{const b=JSON.parse(r.body);requests.push(b);const p=JSON.parse(b.messages[1].content);
  const reply=Array.isArray(p)?{questions:p.map(u=>({kuId:u.kuId,question:'According to these notes, which imaginary pair is recorded?'}))}:
   {score:5,correct:'alpha',missing:'beta',incorrect:'',feedback:'Synthetic partial recall'};
  return {status:200,json:{choices:[{message:{content:JSON.stringify(reply)}}],usage:{total_tokens:20}}};}};
const m={exports:{}};
vm.runInNewContext(fs.readFileSync('main.js','utf8')+'\nmodule.exports.T={validDynamicUnit,validDynamicStudyUnit,validateDynamicUnits,dynamicLibraryHierarchy,dynamicSelectedUnits,dynamicRoundPlan,dynamicRevisionAnalysis,dynamicRevisionReport,MarrowDynamicRecallView};',
 {module:m,exports:m.exports,require:n=>{if(n==='obsidian')return obsidian;throw Error(n);},console,TextDecoder,Promise,JSON,Date,setTimeout,clearTimeout});
const T=m.exports.T,approval={approved:true,approvalId:'SYN-ACTIVATION',scope:'DYNAMIC_RECALL_ONLY',approvedAt:'2026-01-01'};
const units=Array.from({length:866},(_,i)=>({id:'KU-'+String(i+158).padStart(6,'0'),indexId:'MED-PULM-'+String(i%18+1).padStart(2,'0'),
 subject:'Medicine',system:'Pulmonology',indexTitle:'Synthetic topic '+(i%18+1),promptTarget:'Recall an imaginary pair',answer:'SECRET alpha beta',
 sourceId:'SRC-SYN',sourceLocator:'Synthetic source page 1',sourceExcerpt:'Normalized fictional pair',sourceExcerptType:'normalized-source-paraphrase',
 verification:i<136?'Needs Review':'Source-extracted',reviewRequired:i<136,reviewReason:i<136?'SECRET REASON beta is unclear':'',
 studyActivation:approval,integratedIndexIds:['INT-PULM']}));
const pack={schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.1.0',units};
assert.equal(T.validateDynamicUnits(pack),pack);
assert.equal(units.filter(T.validDynamicUnit).length,0,'Notes permission never grants strict Verified/PYQ eligibility');
for(const change of [{studyActivation:null},{studyActivation:{...approval,scope:'PYQ'}},{reviewRequired:false},{reviewReason:''},{sourceExcerptType:'verbatim'}])
 assert.throws(()=>T.validateDynamicUnits({...pack,units:[{...units[0],...change}]}));
assert.throws(()=>T.validateDynamicUnits({...pack,units:[units[0],units[0]]}));
const catalog=[{id:'INT-PULM',subject:'Integrated',system:'Pulmonology',title:'Pulmonology'}];
const h=T.dynamicLibraryHierarchy(units,catalog,[]);
assert.equal(h.find(x=>x.label==='Medicine').children.find(x=>x.label==='Pulmonology').indexes.length,18);
const combined=T.dynamicSelectedUnits(units,'INT-PULM',catalog,[]);
assert.equal(combined.length,866);assert.equal(combined[0],units[0]);
assert.equal(combined.filter(u=>u.reviewRequired).length,136);
const stats=new Map([[units[0].id,{attempts:1,lastScore:5,lastGrade:'partial'}]]);
assert.equal(T.dynamicRoundPlan(combined,stats).completed,1);
assert.equal(T.dynamicRoundPlan(T.dynamicSelectedUnits(units,units[0].indexId),stats).completed,1,'Shared progress across views');
const vault={getAbstractFileByPath:p=>files.has(p)?{path:p,extension:p.split('.').at(-1)}:null,
 getFiles:()=>[...files.keys()].map(path=>({path,extension:path.split('.').at(-1)})),read:async f=>files.get(f.path),
 create:async(p,v)=>files.set(p,v),modify:async(f,v)=>files.set(f.path,v)};
const plugin={app:{vault,secretStorage:{getSecret:()=> 'synthetic-key'}},settings:{deviceId:'synthetic-device'},indexes:catalog,cards:[],
 dynamicWriteQueue:Promise.resolve(),ensureFolder:async()=>{},writeJson:async(p,d)=>files.set(p,JSON.stringify(d)),fetchGithub:async()=>JSON.stringify(pack)};
const walk=(e,f)=>[...(f(e)?[e]:[]),...e.children.flatMap(c=>walk(c,f))];
const text=e=>walk(e,()=>true).map(x=>x.text).join('\n');
async function run(){
 const v=new T.MarrowDynamicRecallView({app:plugin.app},plugin);await v.syncUnits();
 v.selectedIndex=units[0].indexId;await v.start(1);
 assert(text(v.contentEl).includes('Flagged for review — verify this answer.'));
 assert(!text(v.contentEl).includes('SECRET'),'Question warning hides both answer and review reason');
 const question=walk(v.contentEl,e=>e.classes.has('marrow-dynamic-question'))[0];
 assert(text(question).includes('Flagged for review'),'Notice remains in fixed mobile question panel');
 assert.equal(JSON.parse(requests[0].messages[1].content)[0].reviewRequired,true);
 v.typed='alpha';await v.submit();
 assert(text(v.contentEl).includes('Provisional AI score: 5/10'));
 assert(text(v.contentEl).includes('Review reason: SECRET REASON'));
 assert(text(v.contentEl).includes('Provisional reference answer: SECRET alpha beta'));
 assert.equal(JSON.parse(requests.at(-1).messages[1].content).reviewRequired,true);
 assert(requests.at(-1).messages[0].content.includes('never certify its clinical correctness'));
 const attempts=[...files].filter(([p])=>p.includes('/attempts/')).flatMap(([,s])=>s.trim().split('\n').map(JSON.parse));
 assert.equal(attempts.length,1);assert.equal(attempts[0].provisionalScore,true);assert.equal(attempts[0].referenceVerification,'Needs Review');
 await v.override(9);assert.equal(v.stats.get(units[0].id).attempts,1,'Override does not duplicate attempt');
 const analysis=T.dynamicRevisionAnalysis([units[0]],v.attemptHistory);
 assert.equal(analysis.groups.revise[0]?.reviewRequired||analysis.groups.monitor[0]?.reviewRequired,true);
 const report=T.dynamicRevisionReport('Synthetic','SYN',analysis);
 assert(report.includes('scores remain provisional'));assert(!report.includes('SECRET'),'Report exports no canonical answer/review reason');
 v.screen='browse';v.draw();
 assert(text(v.contentEl).includes('[Flagged for review] Recall an imaginary pair'));
 assert(text(v.contentEl).includes('Review reason: SECRET REASON'));
 const ordinary=units[136];v.queue=[ordinary];v.index=0;v.screen='study';v.result=null;v.questions.set(ordinary.id,'Recall the fictional pair?');v.draw();
 assert(!text(v.contentEl).includes('Flagged for review'));assert(!text(v.contentEl).includes('SECRET'));
 v.result={score:10,grade:'correct',feedback:'Synthetic',attemptId:'SYN'};v.draw();
 assert(text(v.contentEl).includes('Source-based reference answer: SECRET alpha beta'));
 assert(!text(v.contentEl).includes('Verified reference answer'));
 console.log('PASS notes-only activation: 866 synthetic KUs, 18 indexes, 136 flags, shared history, concealed warnings, provisional grades, browse and strict PYQ exclusion.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
