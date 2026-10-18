// Real Groq integration quality audit for Dynamic Recall Phase 1.
// Uses independently authored public-domain medical facts; NEVER loads private KUs.
// Default is inert: --dry-run mocks the API, live mode requires a GitHub environment secret.
// Compare actual plugin grading prompt, JSON validation, request configuration and usage.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const DRY = process.argv.includes('--dry-run');
const MODEL = 'openai/gpt-oss-20b';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_REQUESTS = 16;
const MAX_TOKENS = 30000;
const REQUEST_TIMEOUT_MS = 40000;
const API_DELAY_MS = 1400;
const key = DRY ? 'dry-run-only' : process.env.GROQ_TEST_API_KEY;
if (!key) {
  console.error('Missing GROQ_TEST_API_KEY. Put a dedicated key in the groq-live-test GitHub environment.');
  process.exit(2);
}

const facts = [
  {
    id: 'PUBLIC-KU-IVC', indexId: 'PUBLIC-TEST-INDEX', verification: 'Verified',
    promptTarget: 'Name the vertebral level and part of the diaphragm.',
    answer: 'The inferior vena cava passes through the diaphragm at T8 via the central tendon.',
    sourceExcerpt: 'Independently authored common anatomy fact: inferior vena cava, T8, central tendon.',
    question: 'At which vertebral level does the IVC traverse the diaphragm, and through which part?',
    variants: [
      {id:'ivc-exact-1', answer:'T8, through the central tendon.', min:9, max:10},
      {id:'ivc-partial', answer:'T8.', min:3, max:7, requireMissing:true},
      {id:'ivc-incorrect', answer:'T10, through the esophageal hiatus.', min:0, max:2, requireIncorrect:true},
      {id:'ivc-equivalent', answer:'Thoracic vertebra eight; the tendinous centre of the diaphragm.', min:8, max:10},
      {id:'ivc-contradiction', answer:'T8 through central tendon, but the IVC also passes at T10 through the esophageal hiatus.', min:0, max:7, requireIncorrect:true},
      {id:'ivc-exact-2', answer:'T8, through the central tendon.', min:9, max:10}
    ]
  },
  {
    id: 'PUBLIC-KU-PHRENIC', indexId: 'PUBLIC-TEST-INDEX', verification: 'Verified',
    promptTarget: 'State spinal root levels and chief motor supply.',
    answer: 'The phrenic nerve arises primarily from C3, C4 and C5, and supplies the diaphragm motor function.',
    sourceExcerpt: 'Independently authored common anatomy fact: phrenic C3 C4 C5, motor diaphragm.',
    question: 'Which spinal roots contribute to the phrenic nerve, and which muscle does it supply for motor function?',
    variants: [
      {id:'phrenic-exact',answer:'C3 to C5; it supplies the diaphragm with motor innervation.', min:9, max:10},
      {id:'phrenic-partial',answer:'C3, C4 and C5.', min:3, max:7,requireMissing:true},
      {id:'phrenic-equivalent',answer:'Cervical roots three, four, five; activation of the diaphragm for breathing.', min:8,max:10},
      {id:'phrenic-incorrect',answer:'C6 to C8; main motor supply to intercostals.', min:0,max:2,requireIncorrect:true}
    ]
  },
  {
    id: 'PUBLIC-KU-PULMONARY-VEINS', indexId: 'PUBLIC-TEST-INDEX', verification: 'Verified',
    promptTarget: 'Describe direction and oxygenation of pulmonary venous blood.',
    answer: 'Pulmonary veins carry oxygenated blood from the lungs to the left atrium.',
    sourceExcerpt: 'Independently authored common physiology fact: pulmonary veins, lungs, oxygenated, left atrium.',
    question: 'Where do pulmonary veins carry blood from and to, and what is its oxygenation state?',
    variants: [
      {id:'pulmonary-exact',answer:'They bring oxygenated blood from the lungs into the left atrium.',min:9,max:10},
      {id:'pulmonary-partial',answer:'They bring blood from the lungs to the heart.',min:3,max:7,requireMissing:true},
      {id:'pulmonary-incorrect',answer:'They take deoxygenated blood from the right ventricle to the lungs.',min:0,max:2,requireIncorrect:true}
    ]
  }
];

const mockScores = {
 'ivc-exact-1':10,'ivc-partial':5,'ivc-incorrect':0,'ivc-equivalent':9,
 'ivc-contradiction':4,'ivc-exact-2':10,
 'phrenic-exact':10,'phrenic-partial':5,'phrenic-equivalent':9,'phrenic-incorrect':0,
 'pulmonary-exact':10,'pulmonary-partial':5,'pulmonary-incorrect':0
};
const answerToMock = new Map();
for (const f of facts) for (const t of f.variants)
  answerToMock.set(f.id+'::'+t.answer, mockScores[t.id]);

let calls = 0, totalTokens = 0;
const usageLog = [];
const vaultFiles = new Map();
const vault = {
  getAbstractFileByPath(p){return vaultFiles.has(p)?{path:p,extension:p.split('.').pop()}:null;},
  getFiles(){return [...vaultFiles.keys()].map(path=>({path,extension:path.split('.').pop()}));},
  async read(f){return vaultFiles.get(f.path);},
  async create(p,s){if(vaultFiles.has(p))throw Error('Duplicate synthetic log path');vaultFiles.set(p,s);},
  async modify(f,s){vaultFiles.set(f.path,s);}
};
async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function requestUrl(req){
  assert.equal(req.url,ENDPOINT);
  assert.equal(req.method,'POST');
  assert.equal(req.headers.Authorization,'Bearer '+key);
  const body=JSON.parse(req.body);
  assert.equal(body.model,MODEL);
  assert.equal(body.reasoning_effort,'low');
  assert.equal(body.response_format.type,'json_object');
  assert.equal(body.max_completion_tokens,2200);
  if (calls >= MAX_REQUESTS || totalTokens >= MAX_TOKENS)
    throw Error('Conservative live-test request/token ceiling reached; no more API calls');
  calls++;
  if (calls > 1 && !DRY) await sleep(API_DELAY_MS);
  let response;
  if(DRY){
    const user=JSON.parse(body.messages[1].content);
    if(Array.isArray(user)){
      response={status:200,choices:[{message:{content:JSON.stringify({questions:
        user.map(u=>({kuId:u.kuId,question:'Recall the independently authored facts for '+u.kuId+'?'}))
      })}}],usage:{total_tokens:200}};
    }else{
      const score=answerToMock.get(user.kuId+'::'+user.studentAnswer);
      assert(Number.isInteger(score),'Unrecognized dry-run answer');
      response={status:200,choices:[{message:{content:JSON.stringify({
        score,correct:score===0?'':'Some or all expected facts',
        missing:score===10?'':'Some essential fact was omitted',
        incorrect:score===0 || score===4?'An incorrect claim was made':'',
        feedback:'Independently simulated response'
      })}}],usage:{total_tokens:250}};
    }
  }else{
    // Key is only passed via the HTTP Authorization header, never in URL, logs or files.
    const res=await fetch(ENDPOINT,{method:'POST',headers:req.headers,body:req.body,
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    // Never print raw response bodies, potentially sensitive headers, or user content.
    let parsed;
    try{ parsed=await res.json(); }catch{throw Error('Provider returned non-JSON response (HTTP '+res.status+')');}
    if(res.status!==200){
      // Avoid reflecting arbitrary provider text into a public GitHub Actions log.
      throw Error('Provider returned HTTP '+res.status+'; stopping live audit without retry');
    }
    response={status:res.status,...parsed};
  }
  const usage=Number(response.usage&&response.usage.total_tokens)||0;
  totalTokens+=usage;
  usageLog.push({request:calls,tokens:usage});
  return {status:response.status,json:response};
}

class Element{}
class ItemView {constructor(leaf){this.app=leaf.app;this.contentEl=new Element();}}
const obsidian={
  Plugin:class{},ItemView,PluginSettingTab:class{},Setting:class{},Notice:class{},
  requestUrl, normalizePath:x=>x,base64ToArrayBuffer:()=>{}
};
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
const moduleMock={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.liveTest={generateDynamicQuestions,gradeDynamicAnswer,dynamicUsageToday};',{
  module:moduleMock,exports:moduleMock.exports,
  require:n=>{if(n==='obsidian')return obsidian;throw Error('Unexpected module '+n);},
  console,Promise,Date,JSON,TextDecoder,setTimeout,clearTimeout
},{filename:'main.js'});
const {generateDynamicQuestions,gradeDynamicAnswer,dynamicUsageToday}=moduleMock.exports.liveTest;
const plugin={
  app:{vault,secretStorage:{getSecret:()=>key}},
  settings:{deviceId:'public-live-test-runner'},
  dynamicWriteQueue:Promise.resolve(),
  ensureFolder:async()=>{}
};

async function main(){
  const cases=[];
  let hardFailure=false;
  const generated=await generateDynamicQuestions(plugin,facts,new Map());
  assert.equal(generated.size,facts.length);
  assert.equal(new Set(generated.keys()).size,3);
  for(const fact of facts){
    assert(generated.get(fact.id).length>=8);
  }
  console.log('Real-model question-generation response: '+generated.size+' KUs in one request; structurally valid.');
  for(const fact of facts) for(const t of fact.variants){
    const evaluated=await gradeDynamicAnswer(plugin,fact,fact.question,t.answer);
    const within=evaluated.score>=t.min && evaluated.score<=t.max;
    const evidenceOk=(!t.requireMissing || evaluated.missing.length>0) &&
      (!t.requireIncorrect || evaluated.incorrect.length>0);
    const passed=within && evidenceOk;
    if(!passed)hardFailure=true;
    const record={test:t.id,score:evaluated.score,expected:[t.min,t.max],
      withinExpectedRange:within,evidenceFieldsPresent:evidenceOk,pass:passed};
    cases.push(record);
    // Only curated test IDs and numeric metadata appear in public CI output.
    console.log(t.id+': '+evaluated.score+'/10; expected '+t.min+'-'+t.max+
      '; '+(passed?'PASS':'REVIEW'));
  }
  const a=cases.find(x=>x.test==='ivc-exact-1').score;
  const b=cases.find(x=>x.test==='ivc-exact-2').score;
  const repeatDifference=Math.abs(a-b);
  const repeatedConsistent=repeatDifference<=1;
  if(!repeatedConsistent)hardFailure=true;
  const logged=await dynamicUsageToday(plugin);
  assert.equal(logged.requests,calls);
  assert.equal(logged.grades,cases.length);
  assert.equal(logged.tokens,totalTokens);
  assert(calls<=MAX_REQUESTS);
  console.log('Duplicate correct-answer difference: '+repeatDifference+'/10 (accept <=1).');
  console.log('Requests: '+calls+'; grading requests: '+cases.length+
    '; provider-reported tokens: '+totalTokens+'.');
  const summary={
    mode:DRY?'mock-no-secret':'real-Groq',
    model:MODEL,referenceSource:'Independently authored public medical facts; no private notes',
    generation:{kuCount:generated.size,requests:1},
    cases,repeatDifference,repeatedConsistent,requests:calls,reportedTokens:totalTokens,
    passed:!hardFailure
  };
  const path='live-groq-summary.json';
  fs.writeFileSync(path,JSON.stringify(summary,null,2)+'\n',{mode:0o600});
  console.log('Sanitized metadata report written to '+path+'.');
  if(hardFailure){
    console.error('Medical grading consistency/expected score gate FAILED. Review test IDs; do not release.');
    process.exitCode=1;
  }else console.log((DRY?'Mock integration':'Live Groq grading')+' passed numeric response and expected-range checks.');
}
main().catch(e=>{
  // Public logs reveal only sanitized exception type/name without raw responses or key.
  const message=String(e&&e.message||'Unknown failure').split(key).join('[REDACTED]');
  console.error('Live Groq audit aborted: '+message.slice(0,240));
  console.error('Requests attempted: '+calls+'; provider-reported tokens so far: '+totalTokens);
  process.exitCode=1;
});
