// Synthetic, offline GitHub progress sync contract — no secrets or private notes.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('main.js','utf8');new vm.Script(source);
const files=new Map();
const token='github_pat_'+'A'.repeat(50);
let outbound=[],remainingConflict=0,offline=false;
const cloud=new Map();
const authHeaders=[];
const requestUrl=async ({url,method,headers,body})=>{
 assert(url.startsWith('https://api.github.com/repos/Akshat6/marrow-cards-data/contents/progress/by-device/'));
 assert(!url.includes('marrow-cards-plugin'));
 assert.equal(headers.Authorization,'Bearer '+token);
 authHeaders.push(headers.Authorization);
 const p=url.split('/contents/')[1];
 if(offline)return {status:503,json:{error:'offline'}};
 if(method==='GET'){
   if(!cloud.has(p))return {status:404,json:{}};
   const item=cloud.get(p);
   return {status:200,json:{sha:item.sha,encoding:'base64',
     content:Buffer.from(item.content,'utf8').toString('base64')}};
 }
 assert.equal(method,'PUT');
 const data=JSON.parse(body);
 assert(!JSON.stringify(data).includes('SECRET-STUDENT-ANSWER'));
 assert(!JSON.stringify(data).includes('CANONICAL-SOURCE-ANSWER'));
 assert(!JSON.stringify(data).includes('EXPLANATION-FEEDBACK'));
 assert(!JSON.stringify(data).includes('github_pat_'));
 const parsed=Buffer.from(data.content,'base64').toString('utf8');
 const json=JSON.parse(parsed);
 assert.equal(json.kind,'marrow-dynamic-progress-summary');
 assert(!parsed.includes('SECRET-STUDENT-ANSWER'));
 assert(!parsed.includes('CANONICAL-SOURCE-ANSWER'));
 assert(!parsed.includes('EXPLANATION-FEEDBACK'));
 assert(!parsed.includes('sourceLocator'));
 assert(!parsed.includes('indexTitle'));
 if(remainingConflict-->0)return {status:409,json:{}};
 const before=cloud.get(p);
 assert.equal(data.sha,before?.sha);
 cloud.set(p,{content:parsed,sha:'b'.repeat(40)});
 outbound.push({path:p,payload:json});
 return {status:before?200:201,json:{}};
};
const obsidian={Plugin:class{},ItemView:class{},PluginSettingTab:class{},Setting:class{},
 Notice:class{},requestUrl,normalizePath:x=>x,base64ToArrayBuffer:t=>Buffer.from(t,'base64')};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.syncChecks={dynamicProgressSnapshot,dynamicBase64Ascii,uploadDynamicProgress,MarrowCardsPlugin};',
 {module:m,exports:m.exports,require:n=>{if(n==='obsidian')return obsidian;throw Error('Unexpected import');},
  console,TextDecoder,Date,JSON,Promise,Math,setTimeout,clearTimeout});
const {dynamicProgressSnapshot,dynamicBase64Ascii,uploadDynamicProgress,MarrowCardsPlugin}=m.exports.syncChecks;
const units=[{id:'KU-TEST-001',indexId:'INDEX-001',answer:'CANONICAL-SOURCE-ANSWER',
 promptTarget:'Very private source question',verification:'Verified'},
 {id:'KU-TEST-002',indexId:'INDEX-001',answer:'Another answer',
 promptTarget:'Other recall target',verification:'Verified'}];
files.set('MarrowCards/dynamic-recall/units.json',JSON.stringify({
 schemaVersion:1,kind:'marrow-dynamic-recall-units',version:'1.0.1',units}));
const event=(deviceId,attemptId,kuId,score,at)=>({type:'graded',deviceId,attemptId,kuId,
 indexId:'INDEX-001',score,grade:score<=3?'wrong':score<=7?'partial':'correct',
 at,answer:'SECRET-STUDENT-ANSWER',referenceAnswer:'CANONICAL-SOURCE-ANSWER',
 question:'Private question',missing:'EXPLANATION-FEEDBACK'});
let events=[
 event('phone','ATT-001','KU-TEST-001',2,'2026-10-18T08:00:00.000Z'),
 event('tablet','ATT-002','KU-TEST-001',9,'2026-10-18T09:00:00.000Z'),
 event('phone','ATT-003','KU-TEST-002',5,'2026-10-18T10:00:00.000Z'),
 {type:'override',deviceId:'phone',attemptId:'ATT-003',score:7,grade:'partial',at:'2026-10-18T11:00:00.000Z'}
];
const vault={
 getAbstractFileByPath:path=>files.has(path)?{path}:null,
 getFiles:()=>[...files.keys()].map(path=>({path,extension:path.split('.').pop()})),
 read:async f=>files.get(f.path)
};
const secretStorage={getSecret:k=>k==='marrow-dynamic-progress-github-write-token'?token:''};
const phone={app:{vault,secretStorage},settings:{deviceId:'phone'}};
const tablet={app:{vault,secretStorage},settings:{deviceId:'tablet'}};
function updateLogs(){
 const contents=events.map(e=>JSON.stringify(e)).join('\n')+'\n';
 files.set('MarrowCards/dynamic-recall/attempts/shared/2026-10.jsonl',contents);
}
(async()=>{
 updateLogs();
 const snap=dynamicProgressSnapshot(units,events,'phone');
 assert.equal(snap.attemptCount,2);
 assert.equal(snap.units.length,2);
 assert.equal(snap.units.find(x=>x.kuId==='KU-TEST-002').lastScore,7,'Override changes score, not attempt count');
 assert(!JSON.stringify(snap).includes('SECRET-STUDENT-ANSWER'));
 assert.equal(Buffer.from(dynamicBase64Ascii('plain ASCII'),'base64').toString(),'plain ASCII');
 assert.throws(()=>dynamicBase64Ascii('non-ASCII é'));
 let x=await uploadDynamicProgress(phone);
 assert.equal(x.status,'uploaded');assert.equal(outbound.length,1);
 assert.equal(outbound[0].path,'progress/by-device/phone.json');
 assert.equal(outbound[0].payload.attemptCount,2);
 x=await uploadDynamicProgress(phone);
 assert.equal(x.status,'unchanged','Unchanged study data should not create GitHub commits');
 assert.equal(outbound.length,1);
 x=await uploadDynamicProgress(tablet);
 assert.equal(x.status,'uploaded');
 assert.equal(outbound[1].path,'progress/by-device/tablet.json');
 assert.equal(outbound[1].payload.attemptCount,1,'Syncthing copied logs must not duplicate device stats');
 // Add a graded attempt. Simulate a GitHub 409 conflict then retry with SHA.
 events.push(event('phone','ATT-004','KU-TEST-001',8,'2026-10-18T12:00:00.000Z'));
 updateLogs();
 remainingConflict=1;
 x=await uploadDynamicProgress(phone);
 assert.equal(x.status,'uploaded');
 assert.equal(outbound.length,3);
 assert.equal(outbound[2].payload.attemptCount,3);
 assert.equal(outbound[2].payload.units[0].attempts,2);
 offline=true;let threw=false;
 try{await uploadDynamicProgress(tablet);}catch(error){threw=true;assert(String(error).includes('HTTP 503'));}
 assert(threw,'Offline failures remain detectable and retryable');
 offline=false;
 x=await uploadDynamicProgress(tablet);
 assert.equal(x.status,'unchanged','Later retry should not corrupt the existing remote snapshot');
 // A repaired tablet gets its own registration even before new attempts.
 const standalone={app:{vault,secretStorage},settings:{deviceId:'new-tablet'}};
 x=await uploadDynamicProgress(standalone,true);
 assert.equal(x.status,'uploaded');
 assert.equal(outbound.at(-1).path,'progress/by-device/new-tablet.json');
 assert.equal(outbound.at(-1).payload.attemptCount,0,
   'Do not re-attribute existing old-device attempts as tablet attempts');
 assert.equal(outbound.at(-1).payload.kuCount,0);
 x=await uploadDynamicProgress(standalone,true);
 assert.equal(x.status,'unchanged','Repeated empty registration causes no extra commit');
 // Rotate the ID on the simulated tablet only. Old shared files and phone ID
 // are left untouched, but future snapshots will use the distinct new ID.
 const beforeLogs=new Map(files);
 let writtenSettings=null,identityAudit=null,uploadFlags=[],ensured=false;
 const tabletInstall=new MarrowCardsPlugin();
 tabletInstall.settings={deviceId:'phone',progressSyncEnabled:true,autoSync:true};
 tabletInstall.app={vault,secretStorage,
   workspace:{getLeavesOfType:()=>[]}};
 tabletInstall.dynamicWriteQueue=Promise.resolve();
 tabletInstall.writeQueue=Promise.resolve();
 tabletInstall.progressSyncPromise=null;
 tabletInstall.progressSyncTimer=null;
 tabletInstall.initPromise=Promise.resolve();
 tabletInstall.saveData=async next=>{writtenSettings={...next};};
 tabletInstall.ensureDirectories=async()=>{ensured=true;};
 tabletInstall.ensureFolder=async()=>{};
 tabletInstall.writeJson=async(path,obj)=>{identityAudit={path,obj};};
 tabletInstall.syncDynamicProgress=async(...args)=>{uploadFlags.push(args);return {status:'uploaded'};};
 const change=await tabletInstall.rotateDeviceIdForThisInstall();
 assert.equal(change.oldDeviceId,'phone');
 assert(change.newDeviceId&&change.newDeviceId!==change.oldDeviceId);
 assert.equal(writtenSettings.deviceId,change.newDeviceId);
 assert.equal(tabletInstall.settings.deviceId,change.newDeviceId);
 assert(ensured);
 assert.deepEqual(uploadFlags,[[false,true]],'Register new identity, even before any new scores');
 assert(identityAudit.path.includes(change.newDeviceId));
 assert.equal(identityAudit.obj.oldDeviceId,'phone');
 assert.equal(identityAudit.obj.preservedHistory,true);
 for(const [path,content] of beforeLogs)
   assert.equal(files.get(path),content,'Historical logs and KUs remain byte-identical');
 assert.equal(phone.settings.deviceId,'phone','The original phone identity stays unchanged');
 // Guard against a pending upload while changing the ID.
 tabletInstall.progressSyncPromise=Promise.resolve();
 await assert.rejects(tabletInstall.rotateDeviceIdForThisInstall(),/upload in progress/);
 assert.equal(tabletInstall.settings.deviceId,change.newDeviceId);
 const missing={app:{vault,secretStorage:{getSecret:()=>''}},settings:{deviceId:'phone'}};
 x=await uploadDynamicProgress(missing);
 assert.equal(x.status,'not-configured');
 assert.equal(outbound.length,4);
 console.log('Private sync passed: device isolation, no answers or secrets, numeric manual overrides, SHA updates, unchanged skip, 409 retry, offline failure and missing-token safety and cloned device ID repair.');
})().catch(e=>{console.error(e);process.exitCode=1});
