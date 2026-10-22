// Synthetic-only private-sync test. Never insert real medical content or secrets.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');
new vm.Script(source,{filename:'main.js'});
const data=new Map(),uploads=[];
const fakeToken='github_pat_'+ 'A'.repeat(25);
const requestUrl=async req=>{
  assert(req.url.includes('api.github.com/repos/Akshat6/marrow-cards-data/contents/exam-intelligence/feedback/by-device/'));
  assert.equal(req.headers.Authorization,'Bearer '+fakeToken);
  const path=req.url.split('/contents/')[1];
  if(req.method==='GET'){
    if(!data.has(path))return {status:404,json:{}};
    return {status:200,json:{sha:'a'.repeat(40),encoding:'base64',
      content:Buffer.from(data.get(path),'utf8').toString('base64')}};
  }
  assert.equal(req.method,'PUT');
  const put=JSON.parse(req.body);
  const decoded=Buffer.from(put.content,'base64').toString('utf8');
  data.set(path,decoded);uploads.push({path,decoded});
  return {status:201,json:{}};
};
const obsidian={Plugin:class{},ItemView:class{},Notice:class{},PluginSettingTab:class{},Setting:class{},
  requestUrl,base64ToArrayBuffer:b64=>Uint8Array.from(Buffer.from(b64,'base64')).buffer,
  normalizePath:x=>x};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.T={MarrowCardsPlugin,pyqFeedbackRows,pyqUtf8Base64};',{
  module:m,exports:m.exports,require:x=>{
    if(x==='obsidian')return obsidian;throw Error('Unexpected dependency '+x);
  },console,Date,TextDecoder,TextEncoder,JSON,Promise,setTimeout,clearTimeout
},{filename:'main.js'});
const T=m.exports.T,deviceId='synthetic-device';
const month='2026-10';
const events=[
  {type:'experimental_candidate_unverified',at:'2026-10-22T01:00:00Z',deviceId,
    homeIndexId:'TEST-INDEX',questionId:'TEST-Q1',
    question:{stem:'A fabricated invented object?',correctOptionId:'A',options:[]},
    sourcePacket:{sourceKUs:[{kuId:'KU-000001',indexId:'TEST-INDEX',
      sourceLocator:'Synthetic fixture',sourceExcerpt:'Fictional original note.',
      canonicalAnswer:'Imaginary A'}]},rawModelJson:{unsafe:'Never sync raw model output'}},
  {type:'experimental_answered',at:'2026-10-22T01:01:00Z',deviceId,
    questionId:'TEST-Q1',selectedOptionId:'B',selectedSourceOptionId:'C',
    modelKeyOptionId:'A',displayedCorrectOptionId:'D',
    displayOptionOrder:['B','C','D','A'],matchesModelKey:false},
  {type:'experimental_bookmarked',at:'2026-10-22T01:02:00Z',deviceId,questionId:'TEST-Q1'},
  {type:'experimental_flagged',at:'2026-10-22T01:03:00Z',deviceId,
    questionId:'TEST-Q1',reason:'Student wants review'},
  {type:'experimental_candidate_rejected',at:'2026-10-22T01:04:00Z',deviceId,
    rawModelJson:{unsafe:'rejected outputs must remain local'}},
  {type:'experimental_answered',at:'2026-10-22T01:05:00Z',deviceId:'other-device',
    questionId:'OTHER-Q',selectedOptionId:'D'}
];
const files=new Map([['MarrowCards/pyq-style/events/'+deviceId+'/'+month+'.jsonl',
  events.map(e=>JSON.stringify(e)).join('\n')+'\n']]);
const vault={getFiles:()=>[...files.keys()].map(path=>({path,extension:'jsonl'})),
  read:async f=>files.get(f.path)};
const plugin=Object.create(T.MarrowCardsPlugin.prototype);
plugin.settings={deviceId,pyqSyncEnabled:false};
plugin.app={vault,secretStorage:{getSecret:()=>fakeToken}};
plugin.pyqSyncReceipts={};plugin.pyqSyncPromise=null;plugin.initPromise=Promise.resolve();
async function run(){
  const local=T.pyqFeedbackRows(events,deviceId);
  assert.equal(local.length,4);
  assert(!local.some(x=>x.rawModelJson));
  assert(!local.some(x=>x.deviceId==='other-device'));
  assert.equal((await plugin.syncPyqFeedback()).status,'off');
  assert.equal(uploads.length,0);
  plugin.settings.pyqSyncEnabled=true;
  assert.equal((await plugin.syncPyqFeedback()).status,'synced');
  assert.equal(uploads.length,1);
  assert(uploads[0].path.endsWith('/2026-10-22.json'));
  const parsed=JSON.parse(uploads[0].decoded);
  assert.equal(parsed.rows.length,4);
  assert.equal(parsed.rows[0].sourceKUs[0].sourceExcerpt,'Fictional original note.');
  assert.deepEqual(parsed.rows[1].displayOptionOrder,['B','C','D','A']);
  assert.equal(parsed.rows[1].selectedOptionId,'B');
  assert.equal(parsed.rows[1].selectedSourceOptionId,'C');
  assert.equal(parsed.rows[1].modelKeyOptionId,'A');
  assert.equal(parsed.rows[1].displayedCorrectOptionId,'D');
  assert(!uploads[0].decoded.includes('Never sync raw'));
  assert(!uploads[0].decoded.includes('rejected outputs'));
  await plugin.syncPyqFeedback();
  assert.equal(uploads.length,1,'unchanged feedback should not rewrite GitHub');
  console.log('PASS PYQ feedback: consent gate, private-only per-device daily upload, scoped content and idempotence.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
