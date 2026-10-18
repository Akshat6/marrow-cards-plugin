// v0.3.1 phone focus and hierarchy regression: all synthetic units and IDs.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('main.js','utf8'),css=fs.readFileSync('styles.css','utf8');
new vm.Script(source);
class Element{
 constructor(tag='div',props={}){this.tag=tag;this.text=props.text||'';this.children=[];this.classes=new Set();this.events={};this.value='';this.disabled=false;this.open=false;}
 createEl(tag,props={}){const e=new Element(tag,props);this.children.push(e);return e;}
 createDiv(props={}){return this.createEl('div',props);}
 empty(){this.children=[];this.classes.clear();}
 addClass(...args){for(const a of args)this.classes.add(a);}
 removeClass(a){this.classes.delete(a);}
 addEventListener(name,fn){this.events[name]=fn;}
 setText(t){this.text=t;}
}
class ItemView{constructor(leaf){this.app=leaf.app;this.contentEl=new Element();}}
const fake={Plugin:class{},ItemView,PluginSettingTab:class{},Setting:class{},Notice:class{},normalizePath:x=>x,base64ToArrayBuffer(){}};
const m={exports:{}};
vm.runInNewContext(source+'\nmodule.exports.check={validDynamicUnit,dynamicLibraryHierarchy,MarrowDynamicRecallView};',{
 module:m,exports:m.exports,require:n=>{if(n==='obsidian')return fake;throw Error(n);},
 console,TextDecoder,Promise,Date,JSON,setTimeout,clearTimeout
});
const {validDynamicUnit,dynamicLibraryHierarchy,MarrowDynamicRecallView}=m.exports.check;
function unit(indexId,subject,system,title,n=1,links=[]){
 return {id:'K-TEST-'+indexId+'-'+n,indexId,subject,system,indexTitle:title,
   answer:'synthetic alpha beta',promptTarget:'Recall two facts',verification:'Verified',
   integratedIndexIds:links};
}
const anatomy=['067','068','069','070'].map((number,i)=>
 unit('ANAT-R3-'+number,'Anatomy','Thorax','Anatomy '+number,1,['INT-PULM']));
const extra=unit('ANAT-R3-067','Anatomy','Thorax','Anatomy 067',2,['INT-PULM']);
const medicine=unit('MED-PULM-01','Medicine','Pulmonology','Clinical Anatomy');
const pediatrics=unit('PED-RESP-04','Pediatrics','Respiratory System','Cystic Fibrosis',1,['INT-PULM']);
const units=[...anatomy,extra,medicine,pediatrics];
const catalog=[
 ...anatomy.map(u=>({id:u.indexId,subject:u.subject,system:u.system,title:u.indexTitle})),
 {id:'INT-PULM',subject:'Integrated',system:'Pulmonology',title:'Pulmonology'},
 {id:medicine.indexId,subject:'Medicine',system:'Pulmonology',title:medicine.indexTitle},
 {id:pediatrics.indexId,subject:'Pediatrics',system:'Respiratory System',title:pediatrics.indexTitle}
];
const cards=[{id:'FAKE-CARD',indexIds:['MED-PULM-01','INT-PULM']}];
for(const u of units)assert(validDynamicUnit(u));
assert(!validDynamicUnit({...units[0],integratedIndexIds:['INVALID ID']}));
function findNode(nodes,...path){
 let node;
 for(const segment of path){
   node=nodes.find(n=>n.label===segment);
   assert(node,'Missing hierarchy section '+segment);
   nodes=node.children;
 }
 return node;
}
const hierarchy=dynamicLibraryHierarchy(units,catalog,cards);
const primary=findNode(hierarchy,'Anatomy','Thorax');
assert.equal(primary.indexes.length,4);
const linked=findNode(hierarchy,'Integrated','Pulmonology','Anatomy');
assert.equal(linked.indexes.length,4,'All FOUR Anatomy indexes are in Integrated Pulmonology');
assert.equal(linked.indexes[0].units.length,2,'Index KUs are not copied into two histories');
const integratedMed=findNode(hierarchy,'Integrated','Pulmonology','Medicine');
assert.equal(integratedMed.indexes.length,1,'Approved PYQ integrated link connects later Medicine KUs');
const integratedPed=findNode(hierarchy,'Integrated','Pulmonology','Pediatrics');
assert.equal(integratedPed.indexes.length,1,'Explicit future Pediatrics link included');
assert.equal(findNode(hierarchy,'Medicine','Pulmonology').indexes.length,1);
assert.equal(findNode(hierarchy,'Pediatrics','Respiratory System').indexes.length,1);
assert.equal(hierarchy.find(x=>x.label==='Integrated').count,6);
assert.equal(primary.indexes.find(x=>x.id==='ANAT-R3-067').units[0].id,linked.indexes.find(x=>x.id==='ANAT-R3-067').units[0].id);
const unknown=unit('MED-NEW-99','Medicine','Pulmonology','New Unit',1);
assert.equal(dynamicLibraryHierarchy([unknown],catalog,[]).find(n=>n.label==='Integrated'),undefined,
  'Do not infer unapproved integrated medical relationships');
function walk(el,fn,out=[]){if(fn(el))out.push(el);for(const x of el.children)walk(x,fn,out);return out;}
const plugin={indexes:catalog,cards,settings:{deviceId:'synthetic-device'}};
const view=new MarrowDynamicRecallView({app:{}},plugin);
view.units=units;view.selectedIndex='ANAT-R3-067';view.screen='library';view.draw();
const summaries=walk(view.contentEl,e=>e.tag==='summary').map(e=>e.text);
assert(summaries.some(x=>x.startsWith('Anatomy')));
assert(summaries.some(x=>x.startsWith('Integrated')));
assert(summaries.filter(x=>x.startsWith('Pulmonology')).length>=2);
const selectMedic=walk(view.contentEl,e=>e.tag==='button'&&e.text.includes('MED-PULM-01'));
assert(selectMedic.length>=2,'Both main and integrated index tiles must be available');
selectMedic[1].events.click();
assert.equal(view.selectedIndex,'MED-PULM-01','Same single index selection through integrated view');
assert.equal(view.units.length,7,'Navigation must never modify KU feed');
const allIndexButtons=walk(view.contentEl,e=>e.tag==='button'&&e.text.includes('ANAT-R3-067'));
assert.equal(allIndexButtons.length,2);
assert(css.includes('.marrow-dynamic.marrow-dynamic-study.is-answer-focused .marrow-dynamic-header'));
assert(css.includes('.marrow-dynamic .marrow-dynamic-question'));
view.screen='study';view.queue=[anatomy[0]];view.index=0;
view.questions=new Map([[anatomy[0].id,'What is the first synthetic fact?']]);
view.draw();
const panels=walk(view.contentEl,e=>e.classes.has('marrow-dynamic-question'));
const bodies=walk(view.contentEl,e=>e.classes.has('marrow-dynamic-study-body'));
const editors=walk(view.contentEl,e=>e.tag==='textarea');
assert.equal(panels.length,1);
assert.equal(bodies.length,1);
assert.equal(editors.length,1);
assert(!walk(bodies[0],e=>e.tag==='h3').some(e=>e.text.includes('synthetic fact')),
  'Question panel MUST be outside the answer-scroll region');
assert(walk(panels[0],e=>e.tag==='h3').some(e=>e.text.includes('synthetic fact')));
editors[0].events.focus();
assert(view.contentEl.classes.has('is-answer-focused'));
editors[0].events.blur();
assert(!view.contentEl.classes.has('is-answer-focused'));
console.log('Dynamic hierarchy/mobile regression passed: 4 Anatomy indexes in both paths, future Medicine and Pediatrics via verified links, single stable KU IDs, non-inference for unlinked KUs, phone question/answer scroll isolation and focus controls.');
