// Daily Quest phase-one regression. Synthetic questions only; no private medical text.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('main.js','utf8');
new vm.Script(src,{filename:'main.js'});
const mod={exports:{}};
const fakeObsidian={
  Plugin:class{},ItemView:class{constructor(leaf){this.app=leaf.app;this.contentEl={};}},
  Notice:class{constructor(){}},PluginSettingTab:class{},Setting:class{},
  requestUrl(){},base64ToArrayBuffer(){},normalizePath(x){return x;}
};
vm.runInNewContext(src+
  '\nmodule.exports={DAILY_QUEST_POLICY,validateDailyQuestPolicy,dailyQuestDay,dailyQuestCandidatePool,dailyQuestPriority,dailyQuestSelect,dailyQuestLatest,dailyQuestAppend,MarrowDailyQuestView};',
  {module:mod,require(n){if(n==='obsidian')return fakeObsidian;throw Error(n);},
    console,Date,Math,Promise,Set,Map});
const {DAILY_QUEST_POLICY:policy,validateDailyQuestPolicy,dailyQuestDay,
  dailyQuestCandidatePool,dailyQuestPriority,dailyQuestSelect,dailyQuestLatest,
  dailyQuestAppend,MarrowDailyQuestView:View}=mod.exports;

assert.equal(policy.version,'1.1.0');
assert.equal(policy.goal,10);
assert.equal(policy.pyqTarget,10);
assert.equal(policy.blockSize,10);
assert.equal(validateDailyQuestPolicy(policy),policy);
assert.throws(()=>validateDailyQuestPolicy({...policy,indexIds:['INT-PULM']}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,indexIds:['MED-PULM-NA']}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,goal:30,pyqTarget:8}),/Invalid Daily Quest/,
  'Remote config must not secretly restore Knowledge Units');
assert.throws(()=>validateDailyQuestPolicy({...policy,goal:100,pyqTarget:100}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,indexIds:[policy.indexIds[0],policy.indexIds[0]]}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,weakDays:-1}),/Invalid Daily Quest/);
const expanded=validateDailyQuestPolicy({...policy,version:'1.2.0',goal:30,pyqTarget:30,blockSize:10});
assert.equal(expanded.goal,30,'Future 3x10 PYQ-only goal can be policy-only');
assert(policy.indexIds.includes('MED-PULM-08'));
assert(!policy.indexIds.includes('MED-PULM-09'));
assert(!policy.indexIds.includes('MED-PULM-NA'));
assert(!policy.indexIds.includes('INT-PULM'));
assert.equal(dailyQuestDay(new Date(2026,9,24)),'2026-10-24');

function card(id,indexIds=['MED-PULM-08'],extra={}){
  return {id,type:'pyq',status:'approved',question:'Synthetic question?',
    answer:'B',options:['a) Incorrect','b) Correct'],indexIds,...extra};
}
const ku={id:'SYNTH-KU',indexId:'ANAT-R3-067',
  verification:'Verified',promptTarget:'Synthetic recall target'};
const pool=dailyQuestCandidatePool([
  card('PYQ-A',['ANAT-R3-074','INT-PULM']),
  card('PYQ-B',['PED-RESP-04','INT-PULM']),
  card('PYQ-C',['MED-PULM-08','INT-PULM']),
  card('PYQ-X',['MED-PULM-09','INT-PULM']),
  card('PYQ-ALIAS',['INT-PULM']),
  card('PYQ-INCOMPLETE',['MED-PULM-03'],{answerStatus:'source_incomplete'}),
  card('PYQ-UNVERIFIED',['MED-PULM-03'],{answerStatus:'unverified'}),
  card('PYQ-NO-OPTIONS',['MED-PULM-03'],{options:[]}),
  card('PYQ-MISMATCH',['MED-PULM-03'],{answer:'B. Not actually second option'}),
  card('FACT',['PED-RESP-04'],{type:'fact'})
],[ku]);
assert.deepEqual(Array.from(pool.map(x=>x.key)),['p:PYQ-A','p:PYQ-B','p:PYQ-C'],
  'No KU, fact, unresolved key, out-of-scope, or incomplete sources');
assert.equal(new Set(pool.map(x=>x.key)).size,pool.length);

const largePool=dailyQuestCandidatePool(Array.from({length:32},(_,i)=>card('C-'+String(i).padStart(2,'0'))),[ku]);
const hist=new Map();
const daySets=[];
for(let n=24;n<=26;n++){
  const day='2026-10-'+n;
  const chosen=dailyQuestSelect(largePool,day,hist,new Map(),new Map());
  assert.equal(chosen.length,10,'Ten original MCQs each of first three days');
  assert(chosen.every(x=>x.startsWith('p:')));
  assert.deepEqual(chosen,dailyQuestSelect(largePool,day,hist,new Map(),new Map()),
    'Stable daily order with same saved history');
  for(const key of chosen){
    assert(!hist.has(key),'First three days must not repeat PYQs');
    hist.set(key,{itemKey:key,type:'graded',grade:'good',at:day+'T12:00:00Z'});
  }
  daySets.push(chosen);
}
assert.equal(new Set(daySets.flat()).size,30);
const day4=dailyQuestSelect(largePool,'2026-10-27',hist,new Map(),new Map());
assert.equal(day4.length,2,'Do not fill ten by repeating strong cards prematurely');
assert(day4.every(x=>!hist.has(x)));
const afterFour=new Map(hist);
for(const key of day4)afterFour.set(key,{itemKey:key,type:'graded',grade:'good',at:'2026-10-27T12:00:00Z'});
assert.equal(dailyQuestSelect(largePool,'2026-10-28',afterFour,new Map(),new Map()).length,10,
  'Strong answers from first day return at the four-day interval');
const shortDue=dailyQuestSelect([largePool[0]],'2026-10-26',new Map([[
  largePool[0].key,{itemKey:largePool[0].key,type:'graded',grade:'again',at:'2026-10-25T12:00:00Z'}
]]),new Map(),new Map());
assert.equal(shortDue.length,1,'Again returns at one day');
assert.equal(dailyQuestSelect([largePool[0]],'2026-10-25',new Map([[
  largePool[0].key,{itemKey:largePool[0].key,type:'graded',grade:'good',at:'2026-10-24T12:00:00Z'}
]]),new Map(),new Map()).length,0,'No immediate non-due repeats');
assert.equal(dailyQuestLatest([
  {type:'graded',itemKey:'p:C-01',grade:'again',at:'2026-10-01T00:00:00Z'},
  {type:'graded',itemKey:'p:C-01',grade:'good',at:'2026-10-22T00:00:00Z'}
]).get('p:C-01').grade,'good');

(async()=>{
  const saved=new Map();const touched=[];
  const vault={
    getAbstractFileByPath:p=>saved.has(p)?{path:p}:null,
    read:async file=>saved.get(file.path),
    create:async(p,v)=>{saved.set(p,v);touched.push(p);},
    modify:async(file,v)=>{saved.set(file.path,v);touched.push(file.path);}
  };
  const plugin={
    settings:{deviceId:'SYNTH-DEVICE'},app:{vault},indexes:[],cards:[],
    stats:new Map(),loadCollection:async()=>{},
    ensureFolder:async p=>touched.push(p)
  };
  await dailyQuestAppend(plugin,'p:PYQ-A','again','2026-10-24');
  await dailyQuestAppend(plugin,'p:PYQ-B','good','2026-10-24');
  await assert.rejects(()=>dailyQuestAppend(plugin,'k:KU-A','good','2026-10-24'));
  const file=[...saved.keys()][0];
  assert.match(file,/^MarrowCards\/daily-quest\/attempts\/SYNTH-DEVICE\/\d{4}-\d{2}\.jsonl$/);
  const events=saved.get(file).trim().split('\n').map(JSON.parse);
  assert.equal(events.length,2);
  assert.deepEqual(events.map(x=>x.itemKey),['p:PYQ-A','p:PYQ-B']);
  assert(events.every(x=>x.day==='2026-10-24'));
  assert(!touched.some(x=>x.startsWith('MarrowCards/reviews/')));
  assert(!touched.some(x=>x.startsWith('MarrowCards/dynamic-recall/')));

  class Node {
    constructor(props={}){this.text=props.text||'';this.cls=props.cls||'';
      this.style={};this.children=[];this.handlers={};this.disabled=false;}
    empty(){this.children=[];}addClass(){}
    createDiv(x={}){const v=new Node(x);this.children.push(v);return v;}
    createEl(tag,x={}){return this.createDiv(x);}
    createSpan(x={}){return this.createDiv(x);}
    addEventListener(t,fn){this.handlers[t]=fn;}
    findText(t){if(this.text===t)return this;
      for(const c of this.children){const v=c.findText(t);if(v)return v;}return null;}
    findClass(t){if(this.cls.split(' ').includes(t))return this;
      for(const c of this.children){const v=c.findClass(t);if(v)return v;}return null;}
  }
  const ui=new View({app:plugin.app},plugin);
  ui.contentEl=new Node();ui.day='2026-10-24';
  ui.plan={items:['p:PYQ-A','p:PYQ-B'],day:'2026-10-24'};
  ui.pyqs=new Map([['PYQ-A',card('PYQ-A')],['PYQ-B',card('PYQ-B')]]);
  ui.todayDone=new Set();ui.screen='study';ui.allEvents=[];
  ui.draw();
  assert(ui.contentEl.findText('ORIGINAL PYQ'));
  assert(!ui.contentEl.findText('KNOWLEDGE UNIT'));
  const opt=ui.contentEl.findClass('marrow-quest-option');
  assert(opt&&!opt.disabled,'MCQ options must accept touches');
  opt.handlers.click();
  opt.handlers.click(); // second tap during async write cannot duplicate grading
  await new Promise(resolve=>setTimeout(resolve,15));
  assert(ui.answered);
  assert(ui.contentEl.findText('SOURCE ANSWER'),'Answer stays visible after tap');
  assert(ui.contentEl.findText('Next card →'),'Need explicit Next for each question');
  assert.equal(ui.todayDone.size,1);
  ui.contentEl.findText('Next card →').handlers.click();
  assert(!ui.answered);
  assert(ui.contentEl.findClass('marrow-quest-option')?.disabled===false,
    'Second consecutive MCQ still tappable');
  ui.contentEl.findClass('marrow-quest-option').handlers.click();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert(ui.contentEl.findText('Finish today'));
  ui.contentEl.findText('Finish today').handlers.click();
  assert(ui.contentEl.findText('Completed for today ✓'));
  console.log('Daily Quest PYQ-only 10/day, first-three-day coverage, due-only scheduling, isolated logs and two-card UI passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
