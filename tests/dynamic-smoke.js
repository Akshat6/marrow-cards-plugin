// Dynamic Recall Phase 1 smoke tests. Synthetic, no private medical material.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
const noop=()=>{};
class Element {
  constructor(){this.children=[];this.value='';this.disabled=false;this.dataset={};}
  empty(){this.children=[];}
  addClass(){}
  createEl(tag,props={}){const x=new Element();x.tag=tag;x.text=props.text||'';this.children.push(x);return x;}
  createDiv(props={}){return this.createEl('div',props);}
  addEventListener(){}
}
class ItemView{
  constructor(leaf){this.app=leaf.app;this.contentEl=new Element();}
}
let requests=[];
let responseStyle='partial';
const mockObsidian={
 Plugin:class{},ItemView,
 PluginSettingTab:class{},
 Setting:class{},
 Notice:class{constructor(msg){if(String(msg).includes('secret'))throw Error('Unsafe notice');}},
 requestUrl:async r=>{
   requests.push(r);
   assert.equal(r.url,'https://api.groq.com/openai/v1/chat/completions');
   assert.equal(r.method,'POST');
   assert.equal(r.headers.Authorization,'Bearer gsk_test');
   const body=JSON.parse(r.body);
   assert.equal(body.model,'openai/gpt-oss-20b');
   const isGrade=body.messages[0].content.includes('Grade an MBBS');
   return {status:200,json:{
     choices:[{message:{content:JSON.stringify(isGrade
       ? {grade:responseStyle,feedback:'T8 present; missing an essential part.',missing:'Central tendon'}
       : {questions:[{kuId:'KU-TEST-001',question:'At which vertebral level and in what part does a test vessel pass?'}]})}}],
     usage:{total_tokens:174}
   }};
 },
 base64ToArrayBuffer:noop,normalizePath:x=>x
};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.dynamicUnderTest={validateDynamicUnits,generateDynamicQuestions,gradeDynamicAnswer,dynamicReviewSummary,dynamicUsageToday,MarrowDynamicRecallView,DYNAMIC_ROOT,DYNAMIC_GROQ_KEY};',{
 module:m,exports:m.exports,
 require(name){if(name==='obsidian')return mockObsidian;throw Error('Unexpected dependency '+name);},
 console,TextDecoder,Date,Promise,JSON,setTimeout,clearTimeout
},{filename:'main.js'});
const U=m.exports.dynamicUnderTest;
const ku={id:'KU-TEST-001',indexId:'ANAT-R3-999',indexTitle:'Synthetic',
 answer:'T8, in the central tendon',promptTarget:'State vertebral level and location.',
 sourceExcerpt:'T8 central tendon',verification:'Verified'};
assert.equal(U.validateDynamicUnits({schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0',units:[ku]}).units.length,1);
assert.throws(()=>U.validateDynamicUnits({schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0',units:[ku,ku]}));
assert.throws(()=>U.validateDynamicUnits({schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0',units:[{...ku,verification:'Needs Review'}]}));
const files=new Map();
const vault={
 getAbstractFileByPath(path){return files.has(path)?{path,extension:path.split('.').pop()}:null;},
 getFiles(){return [...files.keys()].map(path=>({path,extension:path.split('.').pop()}));},
 async read(f){return files.get(f.path);},
 async create(path,content){assert(!files.has(path));files.set(path,content);},
 async modify(f,content){assert(files.has(f.path));files.set(f.path,content);}
};
const plugin={
 app:{vault,secretStorage:{getSecret:k=>k==='marrow-dynamic-groq-key'?'gsk_test':null}},
 settings:{deviceId:'unit-test-device'},dynamicWriteQueue:Promise.resolve(),
 ensureFolder:async()=>{},writeJson:async(path,obj)=>files.set(path,JSON.stringify(obj)),
 async fetchGithub(path){assert.equal(path,'dynamic-recall/knowledge-units.json');return JSON.stringify({schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0',units:[ku]});}
};
async function run(){
 const v=new U.MarrowDynamicRecallView({app:plugin.app},plugin);
 await v.syncUnits();
 assert.equal(v.units.length,1);
 assert.equal(files.has('MarrowCards/dynamic-recall/units.json'),true);
 await v.start(1);
 assert.equal(v.questions.size,1);
 assert.equal(requests.length,1,'One API generation call');
 v.typed='T8';
 await v.submit();
 assert.equal(v.result.grade,'partial');
 assert.equal(requests.length,2,'One API grading call');
 const events=await plugin.app.vault.read(vault.getFiles().find(x=>x.path.includes('/attempts/')));
 const recorded=events.trim().split('\n').map(JSON.parse);
 assert.equal(recorded.length,1);
 assert.equal(recorded[0].kuId,'KU-TEST-001');
 await v.override('correct');
 assert.equal(v.result.grade,'correct');
 const summary=U.dynamicReviewSummary((await plugin.app.vault.read(vault.getFiles().find(x=>x.path.includes('/attempts/')))).trim().split('\n').map(JSON.parse));
 assert.equal(summary.totals.get('KU-TEST-001').correct,1);
 assert.equal(summary.totals.get('KU-TEST-001').partial,0);
 const usage=await U.dynamicUsageToday(plugin);
 assert.equal(usage.requests,2);
 assert.equal(usage.grades,1);
 assert.equal(usage.tokens,348);
 assert(![...files.keys()].some(p=>p.startsWith('MarrowCards/reviews/') || p.startsWith('MarrowCards/notes/') || p.startsWith('MarrowCards/packs/')));
 assert(source.includes("id: 'open-marrow-cards', name: 'Open PYQ Review'"));
 assert(source.includes("id: 'open-marrow-dynamic-recall', name: 'Open Dynamic Recall'"));
 console.log('Dynamic smoke passed: validated KU feed, distinct commands, batch generation, typed grading, override, quota metering, isolated local logs.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
