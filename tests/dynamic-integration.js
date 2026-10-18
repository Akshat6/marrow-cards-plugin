// Deep synthetic integration tests for Dynamic Recall Phase 1.
// No private user KUs, real medical answers, credentials, Groq calls or device writes.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
class Element {
  constructor(){this.children=[];this.value='';this.disabled=false;this.dataset={};}
  empty(){this.children=[];}
  addClass(){}
  createEl(tag,props={}){
    const x=new Element();x.tag=tag;x.text=props.text||'';
    x.value=props.attr&&props.attr.value||'';this.children.push(x);return x;
  }
  createDiv(props={}){return this.createEl('div',props);}
  addEventListener(){}
}
class ItemView{constructor(leaf){this.app=leaf.app;this.contentEl=new Element();}}
const requests=[];
const generationBatchSizes=[];
let modelMode='normal';
let generationSerial=0;
const makeJson=(content)=>({status:200,headers:{'x-ratelimit-remaining-requests':'123'},json:{
  choices:[{message:{content:JSON.stringify(content)}}],usage:{total_tokens:42}}});
const fakeObsidian={
 Plugin:class{},ItemView,PluginSettingTab:class{},Setting:class{},
 Notice:class{constructor(msg){assert(!String(msg).includes('gsk_test'),'Secret leaked in UI');}},
 requestUrl:async r=>{
   requests.push(r);
   assert.equal(r.url,'https://api.groq.com/openai/v1/chat/completions');
   assert.equal(r.headers.Authorization,'Bearer gsk_test');
   const body=JSON.parse(r.body);
   assert.equal(body.model,'openai/gpt-oss-20b');
   assert.equal(body.response_format.type,'json_object');
   const payload=JSON.parse(body.messages[1].content);
   const isGrade=body.messages[0].content.includes('Grade an MBBS');
   if(!isGrade){
     assert(Array.isArray(payload));
     assert(payload.length>=1 && payload.length<=10);
     assert.equal(new Set(payload.map(x=>x.kuId)).size,payload.length);
     for(const p of payload){
       assert.equal(p.canonicalAnswer,'alpha beta');
       assert.equal(typeof p.learningTarget,'string');
       assert(Array.isArray(p.recentQuestions));
     }
     generationBatchSizes.push(payload.length);
     generationSerial++;
     return makeJson({questions:payload.map(u=>({
       kuId:u.kuId,question:'Name both elements of '+u.kuId+' (variant '+generationSerial+')?'
     }))});
   }
   assert.equal(payload.referenceAnswer,'alpha beta');
   assert(payload.kuId.startsWith('KU-TEST-'));
   if(modelMode==='grade429')return {status:429,json:{error:{message:'Synthetic provider rate limit'}}};
   const answer=payload.studentAnswer;
   const score=answer==='alpha beta'?10:answer==='alpha'?5:answer==='alpha gamma'?2:0;
   return makeJson({
     score,correct:score===10?'alpha beta':score===0?'':'alpha',
     missing:score===10?'':'beta',
     incorrect:score===2?'gamma':'',
     feedback:'Synthetic deterministic grading result'
   });
 },
 normalizePath:x=>x,base64ToArrayBuffer:()=>{}
};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.dynamicTest={MarrowDynamicRecallView,dynamicReviewSummary,dynamicUsageToday,gradeDynamicAnswer,generateDynamicQuestions};',{
 module:m,exports:m.exports,require(name){
   if(name==='obsidian')return fakeObsidian;
   throw Error('Unexpected dependency '+name);
 },console,Date,JSON,TextDecoder,Promise,setTimeout,clearTimeout
},{filename:'main.js'});
const U=m.exports.dynamicTest;
const units=Array.from({length:31},(_,i)=>({
  id:'KU-TEST-'+String(i+1).padStart(3,'0'),indexId:'INDEX-SYN-1',
  indexTitle:'Entirely synthetic',promptTarget:'Recall both elements',
  answer:'alpha beta',sourceExcerpt:'Synthetic: alpha beta',verification:'Verified'
}));
const files=new Map();
const vault={
  getAbstractFileByPath(path){return files.has(path)?{path,extension:path.split('.').pop()}:null;},
  getFiles(){return [...files.keys()].map(path=>({path,extension:path.split('.').pop()}));},
  async read(f){return files.get(f.path);},
  async create(path,v){assert(!files.has(path),'Unexpected file overwrite');files.set(path,v);},
  async modify(f,v){assert(files.has(f.path));files.set(f.path,v);}
};
const plugin={
  app:{vault,secretStorage:{getSecret:()=> 'gsk_test'}},
  settings:{deviceId:'synthetic-device'},
  dynamicWriteQueue:Promise.resolve(),
  ensureFolder:async()=>{},
  writeJson:async(path,data)=>files.set(path,JSON.stringify(data)),
  fetchGithub:async(path)=>{
    assert.equal(path,'dynamic-recall/knowledge-units.json');
    return JSON.stringify({schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0.0',units});
  }
};
function attempts(){
  return [...files].filter(([path])=>path.includes('/attempts/'))
    .flatMap(([,raw])=>raw.split('\n').filter(Boolean).map(JSON.parse));
}
function byKu(kuId){return U.dynamicReviewSummary(attempts()).totals.get(kuId);}
async function run(){
  const v=new U.MarrowDynamicRecallView({app:plugin.app},plugin);
  await v.syncUnits();
  assert.equal(v.units.length,31);
  await v.start(25);
  assert.equal(v.queue.length,25);
  const firstRunIds=v.queue.map(x=>x.id);
  assert.equal(generationBatchSizes.length,1);
  for(let i=0;i<25;i++){
    const kuId=v.queue[v.index].id;
    const answer=i%3===0?'gamma':i%3===1?'alpha':'alpha beta';
    const expected=i%3===0?0:i%3===1?5:10;
    v.typed=answer;
    const before=requests.length;
    await v.submit();
    assert.equal(v.result.score,expected);
    assert.equal(byKu(kuId).lastScore,expected);
    // Resubmitting the same card is not a second graded event or AI call.
    await v.submit();
    assert.equal(requests.length,before+1);
    assert.equal(byKu(kuId).attempts,1);
    if(i===1){
      await v.override(7);
      assert.equal(byKu(kuId).attempts,1);
      assert.equal(byKu(kuId).lastScore,7);
      assert.equal(byKu(kuId).scoreSum,7);
    }
    await v.next();
  }
  assert.equal(v.screen,'finished');
  assert.equal(attempts().filter(x=>x.type==='graded').length,25);
  assert.deepEqual(generationBatchSizes,[10,10,5]);
  assert.equal(requests.length,28,'25 graded answers + 3 batched generation requests');

  // Reopen: previous attempt history and recent question wording must be recovered.
  const v2=new U.MarrowDynamicRecallView({app:plugin.app},plugin);
  await v2.refresh();
  assert.equal(v2.stats.size,25);
  assert.equal(v2.recent.size,25);
  for(const id of firstRunIds)assert.equal(v2.recent.get(id).length,1);
  await v2.start(31);
  assert.equal(v2.queue.length,31);
  assert.equal(v2.queue[0].id,'KU-TEST-026','Previously unseen KU should be prioritized');
  for(let i=0;i<31;i++){
    const id=v2.queue[v2.index].id;
    v2.typed='alpha beta';
    await v2.submit();
    assert.equal(v2.result.score,10);
    await v2.next();
  }
  assert.equal(v2.screen,'finished');
  assert.deepEqual(generationBatchSizes,[10,10,5,10,10,10,1]);
  assert.equal(attempts().filter(x=>x.type==='graded').length,56);
  for(const id of firstRunIds){
    const t=byKu(id);
    assert.equal(t.attempts,2,'Repeated KU retains BOTH historical attempts');
    assert.equal(t.lastScore,10,'Latest score reflects improved answer');
    assert(t.scoreSum>=10,'Earlier score still contributes to cumulative total');
  }
  assert.equal(byKu('KU-TEST-026').attempts,1);
  assert.equal(requests.length,63);
  const measured=await U.dynamicUsageToday(plugin);
  assert.equal(measured.gradeResponses,56);
  assert.equal(measured.generatedKUs,56);
  assert.equal(measured.providerRemainingRequests,123);
  assert.equal(measured.gradeTokens,56*42);
  assert.equal(measured.generateTokens,7*42);

  // A mocked 429 is not a successful grade; original typed answer is preserved.
  const v3=new U.MarrowDynamicRecallView({app:plugin.app},plugin);
  await v3.refresh();
  await v3.start(1);
  v3.typed='alpha';
  modelMode='grade429';
  const before=attempts().length;
  await v3.submit();
  assert.equal(v3.result,null);
  assert.equal(v3.typed,'alpha');
  assert.match(v3.error,/Synthetic provider rate limit/);
  assert.equal(attempts().length,before);
  modelMode='normal';
  await v3.submit();
  assert.equal(v3.result.score,5);
  assert.equal(attempts().filter(x=>x.type==='graded').length,57);

  // Device-local hard grading and total-request caps must prevent network calls.
  const usagePath=[...files.keys()].find(p=>p.includes('/usage/'));
  assert(usagePath);
  const now=new Date().toISOString();
  let today=await U.dynamicUsageToday(plugin);
  assert.equal(today.grades,58,'The failed grade also consumes one request');
  const extraGrades=75-today.grades;
  files.set(usagePath,files.get(usagePath)+
    Array.from({length:extraGrades},()=>JSON.stringify({at:now,type:'request',kind:'grade'})).join('\n')+'\n');
  const reqBeforeCap=requests.length;
  await assert.rejects(
    ()=>U.gradeDynamicAnswer(plugin,units[0],'Recall both elements?','alpha beta'),
    /Daily 75-answer evaluation cap reached/);
  assert.equal(requests.length,reqBeforeCap,'No network call after grade cap');

  today=await U.dynamicUsageToday(plugin);
  assert.equal(today.grades,75);
  const extraRequests=125-today.requests;
  assert(extraRequests>=0);
  files.set(usagePath,files.get(usagePath)+
    Array.from({length:extraRequests},()=>JSON.stringify({at:now,type:'request',kind:'generate'})).join('\n')+'\n');
  const reqBeforeTotal=requests.length;
  await assert.rejects(
    ()=>U.generateDynamicQuestions(plugin,[units[0]],new Map()),
    /Daily Dynamic Recall request cap reached/);
  assert.equal(requests.length,reqBeforeTotal);
  assert.equal((await U.dynamicUsageToday(plugin)).requests,125);

  // Never write into the legacy static PYQ folders or embed a real secret.
  assert(![...files.keys()].some(p=>/^MarrowCards\/(reviews|notes|packs|media)\//.test(p)));
  assert.equal(source.includes("id: 'open-marrow-cards', name: 'Open PYQ Review'"),true);
  assert.equal(source.includes("id: 'open-marrow-dynamic-recall', name: 'Open Dynamic Recall'"),true);
  for(const [path,data] of files)assert(!data.includes('gsk_test'),'Secret persisted in '+path);
  console.log('Dynamic integration passed: 31 synthetic KUs, 10/10/5 then 10/10/10/1 batches, 57 graded attempts, 2 repeat sessions, numeric overrides, history, 429 recovery, per-day grade and request caps, and PYQ isolation.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
