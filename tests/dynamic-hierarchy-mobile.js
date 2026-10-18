// v0.3.1 phone focus and hierarchy regression: all synthetic units and IDs.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('main.js','utf8'),css=fs.readFileSync('styles.css','utf8');
new vm.Script(source);
class Element{
 constructor(tag='div',props={}){this.tag=tag;this.text=props.text||'';this.children=[];this.classes=new Set(String(props.cls||'').split(/\s+/).filter(Boolean));this.events={};this.attr=props.attr||{};this.value='';this.disabled=false;this.open=false;}
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
vm.runInNewContext(source+'\nmodule.exports.check={validDynamicUnit,dynamicLibraryHierarchy,dynamicIntegratedCollections,dynamicSelectedUnits,dynamicUsageForecast,dynamicRoundPlan,MarrowDynamicRecallView};',{
 module:m,exports:m.exports,require:n=>{if(n==='obsidian')return fake;throw Error(n);},
 console,TextDecoder,Promise,Date,JSON,setTimeout,clearTimeout
});
const {validDynamicUnit,dynamicLibraryHierarchy,dynamicIntegratedCollections,dynamicSelectedUnits,dynamicUsageForecast,dynamicRoundPlan,MarrowDynamicRecallView}=m.exports.check;
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
// Each round consists of one graded attempt per stable KU ID, across sessions.
const indexUnits=Array.from({length:31},(_,i)=>unit('ANAT-R3-067','Anatomy','Thorax','Osteology of Thorax',i+10));
const tenGraded=new Map(indexUnits.slice(0,10).map((u,i)=>[u.id,{
  attempts:1,lastScore:i===0?0:10,lastGrade:i===0?'wrong':'correct',
  last:new Date().toISOString(),correct:i===0?0:1
}]));
const first=dynamicRoundPlan(indexUnits,tenGraded);
assert.equal(first.round,1);
assert.equal(first.completed,10);
assert.equal(first.total,31);
assert.equal(first.remaining,21);
assert.equal(first.eligible.length,21);
assert(first.eligible.every(u=>!tenGraded.has(u.id)),'Low score 0/10 must NOT repeat in Round 1');
const allOnce=new Map(indexUnits.map((u,i)=>[u.id,{
  attempts:1,lastScore:i===0?0:10,lastGrade:i===0?'wrong':'correct',
  last:new Date().toISOString(),correct:i===0?0:1
}]));
const second=dynamicRoundPlan(indexUnits,allOnce);
assert.equal(second.round,2);
assert.equal(second.remaining,31);
assert.equal(second.completed,0);
assert.equal(second.eligible[0].id,indexUnits[0].id,'Round 2 should first revisit a very low score');
allOnce.get(indexUnits[0].id).attempts=2;
const midSecond=dynamicRoundPlan(indexUnits,allOnce);
assert.equal(midSecond.round,2);
assert.equal(midSecond.completed,1);
assert(!midSecond.eligible.some(u=>u.id===indexUnits[0].id),
  'No third attempt until every KU receives its second');
const oldOverrideHistory=new Map(indexUnits.slice(0,2).map(u=>[u.id,{
  attempts:1,lastScore:null,lastGrade:'partial',last:new Date().toISOString(),correct:0
}]));
assert.equal(dynamicRoundPlan(indexUnits,oldOverrideHistory).remaining,29,
  'Old 3-category records count toward coverage without inventing numeric scores');
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
assert.equal(est.safeEstimate,58,'Leave a 10 percent safety margin, rounded down');
const constrained=dynamicUsageForecast({requests:11,grades:10,tokens:6220,
  gradeResponses:10,gradeTokens:5000,generateTokens:1220,generatedKUs:10,providerRemainingRequests:3},10);
assert.equal(constrained.estimate,2,'Account header RPD remaining must constrain local estimate');
assert.equal(constrained.safeEstimate,1,'Safety margin applies after account constraint');
const example20=dynamicUsageForecast({requests:103,grades:55,tokens:12000,
  gradeResponses:55,gradeTokens:11000,generateTokens:1000,generatedKUs:55,
  providerRemainingRequests:null},55);
assert.equal(example20.estimate,20);
assert.equal(example20.safeEstimate,18,'20 estimated questions must display as 18');
assert.equal(dynamicUsageForecast({requests:0,grades:0,tokens:0,providerRemainingRequests:null},0).hasSample,false);
function walk(el,fn,out=[]){if(fn(el))out.push(el);for(const x of el.children)walk(x,fn,out);return out;}
const plugin={indexes:catalog,cards,settings:{deviceId:'synthetic-device'}};
const view=new MarrowDynamicRecallView({app:{}},plugin);
view.units=units;view.selectedIndex='ANAT-R3-067';view.screen='library';view.draw();
// Index metrics must be hidden by default without hiding Review/Browse actions.
assert.equal(view.showIndexDetails,false);
const firstToggle=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Show index details');
assert.equal(firstToggle.length,1,'One visible top-of-list toggle');
assert.equal(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-round')).length,0,
  'Do not clutter the default index list with round statistics');
assert.equal(walk(view.contentEl,e=>e.text.includes('Average score')).length,0,
  'All score summaries are hidden by default');
assert.equal(walk(view.contentEl,e=>e.text.includes('linked KUs')).length,0,
  'The Integrated title is also compact by default');
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Review Anatomy 067').length,1);
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Browse Anatomy 067').length,1);
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Browse Pulmonology').length,1);
assert.equal(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-index-title')&&e.text==='Anatomy 067').length,1,
  'Index title must contain its human-readable name ONLY, not its internal ID or KU count');
assert.equal(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-index-title')&&e.text.includes('ANAT-R3')).length,0);
const sampleTile=walk(view.contentEl,e=>e.classes.has('marrow-dynamic-index')&&e.classes.has('marrow-index-tile'))[0];
assert(sampleTile,'Dynamic index must use existing PYQ index-tile structure');
const sampleActions=sampleTile.children.filter(e=>e.tag==='button');
assert.deepEqual(sampleActions.map(e=>e.text),['Review','Browse']);
assert(sampleActions.every(e=>e.classes.has('marrow-start-single')),
  'Review and Browse must share the existing PYQ compact button class');
assert(sampleActions[1].classes.has('marrow-start-browse'));
view.expandedGroups.add('/Anatomy');
firstToggle[0].events.click();
assert.equal(view.showIndexDetails,true);
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.text==='Hide index details').length,1);
assert(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-round')).length>=5,
  'All original and Integrated index round progress must reappear');
assert(walk(view.contentEl,e=>e.text.includes('Average score')).length>=5,
  'Coverage, score and attempt summaries should reappear');
assert.equal(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-index-title')&&e.text==='Anatomy 067').length,1,
  'Turning on details must not add internal IDs to the index title');
assert(walk(view.contentEl,e=>e.text.includes('linked KUs')).length>=1);
assert(view.expandedGroups.has('/Anatomy'),'Opening group survives toggling');
const hide=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Hide index details');
hide[0].events.click();
assert.equal(view.showIndexDetails,false);
assert.equal(walk(view.contentEl,e=>e.classes.has('marrow-dynamic-round')).length,0);
assert.equal(walk(view.contentEl,e=>e.text.includes('Average score')).length,0);
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Browse Pulmonology').length,1,
  'Integrated Browse remains accessible after toggling');
const summaries=walk(view.contentEl,e=>e.tag==='summary').map(e=>e.text);
assert(summaries.some(x=>x.startsWith('Anatomy')));
assert(summaries.some(x=>x.startsWith('Integrated')));
assert.equal(summaries.filter(x=>x.startsWith('Pulmonology')).length,1,
  'The single Pulmonology accordion is the normal Medicine system; Integrated Pulmonology is a direct tile');
const reviews=walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Review Pulmonology');
const browses=walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Browse Pulmonology');
assert.equal(reviews.length,1);assert.equal(browses.length,1);
const usageDetails=walk(view.contentEl,e=>e.tag==='details'&&e.classes.has('marrow-dynamic-usage'));
assert.equal(usageDetails.length,1,'The home must have exactly one compact AI usage disclosure');
assert.equal(usageDetails[0].open,false,'Large usage details must be collapsed by default');
assert(walk(view.contentEl,e=>e.text==='Today’s AI usage (UTC)').length>0,
  'Daily usage details must remain available on demand');
assert(walk(usageDetails[0],e=>e.tag==='summary'&&e.text.includes('estimate pending')).length===1,
  'No token estimate until valid daily grading sample');
usageDetails[0].open=true;usageDetails[0].events.toggle();
assert.equal(view.usageExpanded,true);
view.draw();
assert.equal(walk(view.contentEl,e=>e.tag==='details'&&e.classes.has('marrow-dynamic-usage'))[0].open,true,
  'Disclosure preference must survive harmless view refreshes');
view.usageExpanded=false;view.draw();
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
const indexReview=walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Review Anatomy 067');
const indexBrowse=walk(view.contentEl,e=>e.tag==='button'&&e.attr['aria-label']==='Browse Anatomy 067');
assert.equal(indexReview.length,1);
assert.equal(indexBrowse.length,1,'Every normal index must provide a direct quick Browse action');
const savedStats=view.stats.size;
indexBrowse[0].events.click();
assert.equal(view.screen,'browse');
assert.equal(view.selectedIndex,'ANAT-R3-067');
const quickCards=walk(view.contentEl,e=>e.tag==='details'&&e.classes.has('marrow-dynamic-browse-unit'));
assert.equal(quickCards.length,2,'Index browse must include only this original index KUs');
assert.equal(quickCards[0].open,false,'Answers should be hidden until tapped');
assert(quickCards.every(x=>walk(x,e=>e.tag==='summary'&&e.text==='Recall two facts').length===1),
  'Browse front is a verified KU recall target, not an invented AI question');
assert.equal(view.stats.size,savedStats,'Browse must leave recall scores and attempts unchanged');
const indexReviewFromBrowse=walk(view.contentEl,e=>e.tag==='button'&&e.text==='Review ANAT-R3-067');
assert.equal(indexReviewFromBrowse.length,1);
indexReviewFromBrowse[0].events.click();
assert.equal(view.screen,'index','Return to original index Review chooser');
assert.equal(walk(view.contentEl,e=>e.tag==='button'&&e.text.startsWith('Study ')).length,4);
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
console.log('Dynamic hierarchy/mobile regression passed: name-only PYQ-sized Review/Browse actions, stats toggle, original KU IDs and history, usage forecast and phone focus controls.');
