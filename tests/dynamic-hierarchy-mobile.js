// v0.3.1 phone focus and hierarchy regression: all synthetic units and IDs.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('main.js','utf8'),css=fs.readFileSync('styles.css','utf8');
new vm.Script(source);
class Element{
 constructor(tag='div',props={}){this.tag=tag;this.text=props.text||'';this.children=[];this.classes=new Set(String(props.cls||'').split(/\s+/).filter(Boolean));this.events={};this.value='';this.disabled=false;this.open=false;}
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
vm.runInNewContext(source+'\nmodule.exports.check={validDynamicUnit,dynamicLibraryHierarchy,dynamicIntegratedCollections,dynamicSelectedUnits,dynamicUsageForecast,MarrowDynamicRecallView};',{
 module:m,exports:m.exports,require:n=>{if(n==='obsidian')return fake;throw Error(n);},
 console,TextDecoder,Promise,Date,JSON,setTimeout,clearTimeout
});
const {validDynamicUnit,dynamicLibraryHierarchy,dynamicIntegratedCollections,dynamicSelectedUnits,dynamicUsageForecast,MarrowDynamicRecallView}=m.exports.check;
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
const integratedNode=findNode(hierarchy,'Integrated');
assert.equal(integratedNode.children.length,0,'Pulmonology should be a direct collection, not a new subject tree');
assert.equal(integratedNode.collections.length,1,'Pulmonology is exactly one collection tile');
const pulm=integratedNode.collections[0];
assert.equal(pulm.id,'INT-PULM');
assert.equal(pulm.title,'Pulmonology');
assert.equal(pulm.units.length,7,'Include 4 Anatomy indexes plus Medicine and Pediatrics without duplicate KUs');
assert.equal(new Set(pulm.units.map(x=>x.id)).size,pulm.units.length);
assert.equal(pulm.units.filter(u=>u.subject==='Anatomy').length,5);
assert.equal(pulm.units.filter(u=>u.subject==='Medicine').length,1);
assert.equal(pulm.units.filter(u=>u.subject==='Pediatrics').length,1);
assert.equal(dynamicSelectedUnits(units,'INT-PULM',catalog,cards).length,7);
assert.equal(dynamicSelectedUnits(units,'ANAT-R3-067',catalog,cards).length,2);
assert.equal(dynamicSelectedUnits(units,'INT-PULM',catalog,cards).find(x=>x.id===anatomy[0].id),anatomy[0],
  'Both index and integrated pool reference the exact same KU object');
const unknown=unit('MED-NEW-99','Medicine','Pulmonology','New Unit',1);
assert.equal(dynamicIntegratedCollections([unknown],catalog,[]).length,0,
  'Unapproved Medicine units are not auto-tagged Integrated Pulmonology');
// Forecast uses only measured, successful provider responses and local safety caps.
const est=dynamicUsageForecast({
  requests:11,grades:10,tokens:6220,gradeResponses:10,gradeTokens:5000,
  generateTokens:1220,generatedKUs:10,providerRemainingRequests:null},10);
assert.equal(est.completedToday,10);
assert.equal(est.remainingGrades,65);
assert.equal(est.remainingRequests,114);
assert.equal(est.averagePerAnswer,622);
assert.equal(est.estimate,65,'Keep estimated questions inside local 75 grade/125 request caps');
const constrained=dynamicUsageForecast({requests:11,grades:10,tokens:6220,
  gradeResponses:10,gradeTokens:5000,generateTokens:1220,generatedKUs:10,providerRemainingRequests:3},10);
assert.equal(constrained.estimate,2,'Account header RPD remaining must constrain local estimate');
assert.equal(dynamicUsageForecast({requests:0,grades:0,tokens:0,providerRemainingRequests:null},0).hasSample,false);
function walk(el,fn,out=[]){if(fn(el))out.push(el);for(const x of el.children)walk(x,fn,out);return out;}
const plugin={indexes:catalog,cards,settings:{deviceId:'synthetic-device'}};
const view=new MarrowDynamicRecallView({app:{}},plugin);
view.units=units;view.selectedIndex='ANAT-R3-067';view.screen='library';view.draw();
const summaries=walk(view.contentEl,e=>e.tag==='summary').map(e=>e.text);
assert(summaries.some(x=>x.startsWith('Anatomy')));
assert(summaries.some(x=>x.startsWith('Integrated')));
assert.equal(summaries.filter(x=>x.startsWith('Pulmonology')).length,1,
  'The single Pulmonology accordion is the normal Medicine system; Integrated Pulmonology is a direct tile');
const reviews=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Review Pulmonology');
const browses=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Browse Pulmonology');
assert.equal(reviews.length,1);assert.equal(browses.length,1);
assert(walk(view.contentEl,e=>e.text==='Today’s AI usage (UTC)').length>0,
  'Daily usage panel must be visible on the Dynamic Recall home screen');
assert(walk(view.contentEl,e=>e.text.includes('Illustrative reference token headroom:')).length>0,
  'Daily token reference headroom must be displayed and never called a verified Groq quota');
browses[0].events.click();
assert.equal(view.screen,'browse');
assert.equal(view.selectedIndex,'INT-PULM');
assert.equal(walk(view.contentEl,e=>e.tag==='details'&&e.classes.has('marrow-dynamic-browse-unit')).length,7);
assert.equal(view.stats.size,0,'Browsing must not create graded attempts');
const reviewFromBrowse=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Review Pulmonology');
assert.equal(reviewFromBrowse.length,1);
reviewFromBrowse[0].events.click();
assert.equal(view.screen,'collection');
const startButtons=walk(view.contentEl,e=>e.tag==='button'&&e.text.startsWith('Study '));
assert.equal(startButtons.length,4,'Direct Integrated Review presents four session sizes');
view.screen='library';view.draw();
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
console.log('Dynamic hierarchy/mobile regression passed: one Integrated Pulmonology Review/Browse collection, source-index KU identity, approved Medicine/Pediatrics links, usage forecast and limits, no auto-tag inference, phone focus controls.');
