// Daily Quest regression: synthetic only; NEVER commit private medical content.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('main.js','utf8');
new vm.Script(src,{filename:'main.js'});
const mod={exports:{}};
const fakeObsidian={
  Plugin:class {}, ItemView:class {constructor(leaf){this.app=leaf.app;this.contentEl={};}},
  Notice:class {constructor(){}}, PluginSettingTab:class {},Setting:class {},
  requestUrl(){},base64ToArrayBuffer(){},normalizePath(s){return s;}
};
vm.runInNewContext(src+
  '\nmodule.exports={DAILY_QUEST_POLICY,validateDailyQuestPolicy,dailyQuestDay,dailyQuestCandidatePool,dailyQuestPriority,dailyQuestSelect,dailyQuestLatest,dailyQuestAppend,MarrowDailyQuestView};',
  {module:mod,require(n){if(n==='obsidian')return fakeObsidian;throw Error(n);},
    console,Date,Math,Promise,Set,Map});
const {DAILY_QUEST_POLICY:policy,validateDailyQuestPolicy,dailyQuestDay,dailyQuestCandidatePool,
  dailyQuestPriority,dailyQuestSelect,dailyQuestLatest,dailyQuestAppend,MarrowDailyQuestView:View}=mod.exports;
assert.equal(policy.goal,30);
assert.equal(validateDailyQuestPolicy(policy),policy);
assert.throws(()=>validateDailyQuestPolicy({...policy,indexIds:['INT-PULM']}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,goal:100}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,indexIds:[policy.indexIds[0],policy.indexIds[0]]}),/Invalid Daily Quest/);
assert.throws(()=>validateDailyQuestPolicy({...policy,weakDays:-1}),/Invalid Daily Quest/);
const modified=validateDailyQuestPolicy({...policy,version:'1.0.1',goal:40,pyqTarget:12,blockSize:10});
assert.equal(modified.goal,40);
const makePool=[...Array.from({length:20},(_,i)=>({key:'p:C-'+i,type:'pyq',id:'C-'+i})),
  ...Array.from({length:50},(_,i)=>({key:'k:U-'+i,type:'ku',id:'U-'+i}))];
const choice=dailyQuestSelect(makePool,'2026-10-24',new Map(),new Map(),new Map(),modified);
assert.equal(choice.length,40);
assert.equal(choice.filter(x=>x.startsWith('p:')).length,12);

assert.equal(policy.blockSize,10);
assert.equal(policy.pyqTarget,8);
assert(policy.indexIds.includes('MED-PULM-08'));
assert(!policy.indexIds.includes('MED-PULM-09'));
assert(!policy.indexIds.includes('MED-PULM-NA'));
assert(!policy.indexIds.includes('INT-PULM'));
assert.equal(dailyQuestDay(new Date(2026,9,24)),'2026-10-24');

function card(id,indexIds,answerStatus){
  return {id,type:'pyq',status:'approved',question:'Synthetic prompt?',answer:'A',
    options:['One','Two'],indexIds,answerStatus};
}
function ku(id,indexId){
  return {id,indexId,verification:'Verified',promptTarget:'Synthetic retrieval target',
    answer:'Synthetic reference answer'};
}
const pool=dailyQuestCandidatePool([
  card('PYQ-A',['ANAT-R3-074','INT-PULM']),
  card('PYQ-B',['PED-RESP-04','INT-PULM']),
  card('PYQ-C',['MED-PULM-08','INT-PULM']),
  card('PYQ-X',['MED-PULM-09','INT-PULM']),
  card('PYQ-ALIAS',['INT-PULM']),
  card('PYQ-INCOMPLETE',['MED-PULM-03'],'source_incomplete')
],[
  ku('KU-A','ANAT-R3-069'),ku('KU-M','MED-PULM-08'),
  ku('KU-X','MED-PULM-09')
]);
assert.deepEqual(Array.from(pool.map(x=>x.key)),
  ['p:PYQ-A','p:PYQ-B','p:PYQ-C','k:KU-A','k:KU-M'],
  'Only approved source-index items in requested scope are included');
assert.equal(new Set(pool.map(x=>x.key)).size,pool.length);

const history=dailyQuestLatest([
  {type:'graded',itemKey:'k:KU-A',grade:'again',at:'2026-10-01T00:00:00Z'},
  {type:'graded',itemKey:'k:KU-A',grade:'good',at:'2026-10-22T00:00:00Z'}
]);
assert.equal(history.get('k:KU-A').grade,'good');
assert(dailyQuestPriority({key:'k:KU-M',type:'ku',id:'KU-M'},'2026-10-24',
  new Map(),new Map(),new Map([['KU-M',{last:'2026-10-19T10:00:00Z',lastScore:2,lastGrade:'wrong'}]]))<
  dailyQuestPriority({key:'k:KU-A',type:'ku',id:'KU-A'},'2026-10-24',
    new Map(),new Map(),new Map()),
  'An overdue wrong KU outranks an unseen KU');
const bigPool=[
  ...Array.from({length:12},(_,i)=>({key:'p:PYQ-'+i,type:'pyq',id:'PYQ-'+i})),
  ...Array.from({length:40},(_,i)=>({key:'k:KU-'+i,type:'ku',id:'KU-'+i}))
];
const selected=dailyQuestSelect(bigPool,'2026-10-24',new Map(),new Map(),new Map());
assert.equal(selected.length,30);
assert.equal(new Set(selected).size,30);
assert.equal(selected.filter(x=>x.startsWith('p:')).length,8);
assert.deepEqual(selected,dailyQuestSelect(bigPool,'2026-10-24',new Map(),new Map(),new Map()),
  'No silent reroll during a single calendar day');
const leaf={app:{vault:{}}},plugin={indexes:[],cards:[]};
const view=new View(leaf,plugin);
view.plan={items:['p:PYQ-A','k:KU-A']};
view.pyqs=new Map([['PYQ-A',card('PYQ-A',['MED-PULM-08'])]]);
view.kus=new Map([['KU-A',ku('KU-A','ANAT-R3-069')]]);
view.todayDone=new Set();
assert.equal(view.current().key,'p:PYQ-A');
view.currentKey='p:PYQ-A';view.answered=true;view.todayDone.add('p:PYQ-A');
assert.equal(view.current().key,'p:PYQ-A',
  'A graded card stays visible so the explanation and Next button remain accessible');
view.next=()=>{view.answered=false;view.currentKey='';};
view.next();
assert.equal(view.current().key,'k:KU-A');

(async()=>{
  const stored=new Map(); const touched=[];
  const mock={
    settings:{deviceId:'TEST-DEVICE'},
    ensureFolder:async folder=>{touched.push(folder);},
    app:{vault:{
      getAbstractFileByPath:p=>stored.has(p)?{path:p}:null,
      read:async file=>stored.get(file.path),
      create:async(p,v)=>{stored.set(p,v);touched.push(p);},
      modify:async(file,v)=>{stored.set(file.path,v);touched.push(file.path);}
    }}
  };
  await dailyQuestAppend(mock,'k:KU-A','again','2026-10-24');
  await dailyQuestAppend(mock,'p:PYQ-A','good','2026-10-24');
  const file=[...stored.keys()][0];
  assert.match(file,/^MarrowCards\/daily-quest\/attempts\/TEST-DEVICE\/\d{4}-\d{2}\.jsonl$/);
  const rows=stored.get(file).trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.itemKey),['k:KU-A','p:PYQ-A']);
  assert(rows.every(x=>x.day==='2026-10-24'));
  assert(!touched.some(x=>x.startsWith('MarrowCards/reviews/')),
    'Daily Quest must not write PYQ Review history');
  assert(!touched.some(x=>x.startsWith('MarrowCards/dynamic-recall/')),
    'Daily Quest must not write AI-grading history');

  // Actual view transitions: one original MCQ, one KU, saved answer screen,
  // automatic next item and completed dashboard. No medical facts in fixture.
  class Node {
    constructor(props={}){this.text=props.text||'';this.cls=props.cls||'';this.style={};
      this.children=[];this.handlers={};this.disabled=false;}
    empty(){this.children=[];}
    addClass(){}
    createDiv(x={}){const n=new Node(x);this.children.push(n);return n;}
    createEl(_tag,x={}){const n=new Node(x);this.children.push(n);return n;}
    createSpan(x={}){return this.createEl('span',x);}
    addEventListener(k,v){this.handlers[k]=v;}
    findText(t){if(this.text===t)return this;
      for(const c of this.children){const f=c.findText(t);if(f)return f;}return null;}
    findClass(cls){if(this.cls.split(' ').includes(cls))return this;
      for(const c of this.children){const f=c.findClass(cls);if(f)return f;}return null;}
  }
  const fakePlugin={...mock,indexes:[],cards:[],stats:new Map(),loadCollection:async()=>{}};
  const ui=new View({app:mock.app},fakePlugin);
  ui.contentEl=new Node();
  ui.day='2026-10-24';ui.plan={items:['p:PYQ-A','k:KU-A']};
  ui.pyqs=new Map([['PYQ-A',card('PYQ-A',['MED-PULM-08'])]]);
  ui.kus=new Map([['KU-A',ku('KU-A','ANAT-R3-069')]]);
  ui.todayDone=new Set();ui.screen='study';ui.allEvents=[];
  ui.draw();
  const option=ui.contentEl.findClass('marrow-quest-option');
  assert(option&&!option.disabled,'Approved MCQ option is tap-enabled');
  option.handlers.click();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(ui.answered,true);
  assert(ui.contentEl.findText('SOURCE ANSWER'),'Answer remains after saving');
  assert(ui.contentEl.findText('Next card →'),'Next button remains accessible');
  ui.contentEl.findText('Next card →').handlers.click();
  assert(ui.contentEl.findText('Synthetic retrieval target'),
    'Next screen should be the KU prompt');
  ui.contentEl.findText('Reveal answer').handlers.click();
  assert(ui.contentEl.findText('Synthetic reference answer'));
  ui.contentEl.findText('Got it').handlers.click();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert(ui.contentEl.findText('Finish today'),
    'Two completed items must allow returning to the dashboard');
  ui.contentEl.findText('Finish today').handlers.click();
  assert(ui.contentEl.findText('Completed for today ✓'));

  console.log('Daily Quest scope, selection, stable plan, explanation and isolated logs passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
