// Smoke test: syntax and pack/data invariants.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('main.js','utf8');
new vm.Script(src, {filename:'main.js'});
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
assert.equal(manifest.id,'marrow-cards');
assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
assert.equal(manifest.isDesktopOnly,false);
const pack=JSON.parse(fs.readFileSync('examples/pilot-example.json','utf8'));
assert.equal(pack.schemaVersion,1);
assert.equal(pack.cards.length,2);
assert(pack.cards.every(c=>c.status==='approved'));
assert(pack.cards.every(c=>c.id&&c.question&&c.answer&&c.indexIds.length));
const imageUse=src.includes('createBinary')&&src.includes('getResourcePath');
assert(imageUse,'Missing image import/display implementation');
const logs=src.includes('jsonl')&&src.includes("event.action === 'right'");
assert(logs,'Missing review-event log implementation');
console.log('Pilot smoke checks passed: manifest, source syntax, dummy cards, image handling and review-log code.');

// Navigation contract: the reviewer starts at MBBS, then subject, then index.
assert(src.includes("this.screen = 'mbbs'"), 'MBBS should be initial navigation screen');
assert(src.includes('drawHierarchy(el)'), 'Missing hierarchical navigation');
assert(src.includes("this.goLibrary('subjects')"), 'Missing subject navigation');
assert(src.includes('this.expandedSubject'), 'Missing collapsible subject navigation');
assert(src.includes("this.startReview([idx.id])"), 'Missing one-index review');

assert(src.includes("async importLocalBundle(file)"), "Missing local bundle importer");
assert(src.includes("marrow-cards-bundle"), "Missing local bundle format validation");
assert(src.includes("SHA-256"), "Missing media checksum validation");
assert(src.includes("compareVersions(existing.version, info.version) >= 0"), "Missing no-downgrade protection");
console.log("Bundle import and no-downgrade smoke checks passed.");

// Review layout and flip-back behavior (lightweight Obsidian DOM stub).
class MockElement {
  constructor(props = {}) {
    this.props = props; this.children = []; this.handlers = {};
    this.text = props.text || ''; this.cls = props.cls || ''; this.style = {}; this.hidden = false;
  }
  empty() { this.children = []; }
  addClass() {}
  removeClass() {}
  createDiv(props = {}) { const c = new MockElement(props); this.children.push(c); return c; }
  createEl(tag, props = {}) { const c = new MockElement({ ...props, tag }); this.children.push(c); return c; }
  createSpan(props = {}) { return this.createEl('span', props); }
  addEventListener(event, handler) { this.handlers[event] = handler; }
  setText(value) { this.text = value; }
  setAttribute(name, value) { this.props.attr = { ...(this.props.attr || {}), [name]: value }; }
  querySelector(selector) { return selector.startsWith('.') ? this.findClass(selector.slice(1)) : null; }
  getContext() {
    return { clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){},
      arc(){}, fill(){}, lineJoin:'', lineCap:'', strokeStyle:'', fillStyle:'', lineWidth:0 };
  }
  getBoundingClientRect() { return { left:0, top:0, width:720, height:960 }; }
  setPointerCapture() {}


  findText(text) {
    if (this.text === text) return this;
    for (const child of this.children) { const found = child.findText(text); if (found) return found; }
    return null;
  }
  findClass(cls) {
    if (this.cls.split(' ').includes(cls)) return this;
    for (const child of this.children) { const found = child.findClass(cls); if (found) return found; }
    return null;
  }
}
const stubModule = { exports: {} };
const mockLeaf = { app: { vault: { getAbstractFileByPath: () => null } } };
const mockObsidian = {
  Plugin: class {}, ItemView: class { constructor(leaf) { this.app = leaf.app; this.contentEl = new MockElement(); } },
  PluginSettingTab: class {}, Setting: class {}, Notice: class {},
  requestUrl() {}, base64ToArrayBuffer() {}, normalizePath(p) { return p; }
};
vm.runInNewContext(src + '\nmodule.exports.ReviewerForTest = MarrowCardsView;', {
  module: stubModule, exports: stubModule.exports,
  require(name) { if (name === 'obsidian') return mockObsidian; throw new Error('Unexpected module ' + name); },
  console,
  window: { setInterval: () => 1 },
  setTimeout, clearTimeout
}, { filename: 'main.js' });
const Reviewer = stubModule.exports.ReviewerForTest;
const card = { id: 'TEST-001', type: 'pyq', status: 'approved', indexIds: ['OPH-04'],
  question: 'What layer is shown?', images: [], options: ['A', 'B'], answer: 'A', explanation: 'Test explanation' };
const fakePlugin = { cards: [card], indexes: [{ id: 'OPH-04', title: 'Anatomy of Retina', subject: 'Ophthalmology' }],
  stats: new Map([['TEST-001', { seen: 1, right: 0, wrong: 0 }]]) };
const reviewer = new Reviewer(mockLeaf, fakePlugin);
reviewer.screen = 'review';
reviewer.selected = new Set(['OPH-04']);
reviewer.queue = [card];
reviewer.cursor = 0;
reviewer.draw();
assert(reviewer.contentEl.findClass('marrow-review-scroll'), 'Question content must have a separate scroll container');
assert(reviewer.contentEl.findClass('marrow-actions-front'), 'Front-side action dock missing');
assert(reviewer.contentEl.findText('Flip to answer'), 'Missing front-side flip button');
reviewer.contentEl.findText('Flip to answer').handlers.click();
assert.equal(reviewer.flipped, true);
assert(reviewer.contentEl.findClass('marrow-actions-back'), 'Answer-side action dock missing');
for (const label of ['Show question', 'Right', 'Wrong']) {
  assert(reviewer.contentEl.findText(label), 'Missing answer-side action: ' + label);
}
reviewer.contentEl.findText('Show question').handlers.click();
assert.equal(reviewer.flipped, false, 'Show question must return to front without grading');
assert(reviewer.contentEl.findText('Flip to answer'), 'Must be able to flip to answer again');
assert(!reviewer.contentEl.findText('Right'), 'Right/Wrong should be hidden on question side');
const newCss = fs.readFileSync('styles.css', 'utf8');
assert(newCss.includes('.marrow-cards.marrow-review-mode .marrow-review-scroll'), 'Independent scroll styling missing');
assert(newCss.includes('overflow-y: auto'), 'Review content must be vertically scrollable');
assert(newCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Three action buttons must fit side by side');
console.log('Review layout and flip-back behavior checks passed.');


assert(!src.includes('cleanPilotArtifacts'), 'Obsolete pilot cleanup must not run again');
assert(!src.includes('RETIRED_CARD_IDS'), 'Old test-card filter must not affect future reviews');
const onloadCode = src.slice(src.indexOf('  onload() {'), src.indexOf('  onunload() {'));
assert(onloadCode.includes('this.addSettingTab('), 'Plugin settings must register');
assert(onloadCode.indexOf('this.addSettingTab(') < onloadCode.indexOf('this.initPromise = this.initializeRuntime()'),
  'Register settings before loading vault files');
assert(src.includes('async initializeRuntime()'), 'Asynchronous settings initialization missing');
assert(src.includes('if (this.initPromise) await this.initPromise'), 'Review startup must await local initialization');
console.log('Non-blocking startup checks passed.');

const startupCalls = [];
const instance = new stubModule.exports();
instance.app = { workspace: { onLayoutReady: () => {} }, secretStorage: { getSecret: () => null } };
instance.loadData = () => new Promise(() => {});
instance.registerView = () => startupCalls.push('view');
instance.addRibbonIcon = () => startupCalls.push('ribbon');
instance.addCommand = () => startupCalls.push('command');
instance.addSettingTab = () => startupCalls.push('settings');
instance.registerInterval = () => startupCalls.push('interval');
const resultOfLoad = instance.onload();
assert.equal(resultOfLoad, undefined, 'Startup should not block plugin registration');
assert(startupCalls.includes('settings') && startupCalls.includes('view'),
  'Views and settings must register despite a stuck settings-data read');
console.log('Android cold-start regression check passed.');


// v0.1.8 subject accordion + v0.1.7 approved-only filter tests.
const secondCard = { id: 'TEST-002', type: 'fact', status: 'approved',
  indexIds: ['MED-01'], question: 'Test?', answer: 'Test.' };
reviewer.plugin = {
  cards: [card, secondCard],
  indexes: [
    { id: 'OPH-04', title: 'Anatomy of Retina', subject: 'Ophthalmology', system: 'Basic Anatomy of Eye' },
    { id: 'OPH-05', title: 'Unapproved eye index', subject: 'Ophthalmology', system: 'Basic Anatomy of Eye' },
    { id: 'MED-01', title: 'Approved medicine index', subject: 'Medicine', system: 'General' },
    { id: 'ENT-01', title: 'Unapproved ENT index', subject: 'ENT', system: 'General' }
  ],
  stats: new Map()
};
reviewer.screen = 'subjects';
reviewer.onlyApprovedIndexes = false;
reviewer.expandedSubject = '';
reviewer.selected = new Set();
let chosenForReview;
reviewer.startReview = ids => { chosenForReview = ids; };
reviewer.draw();

// v0.2.1: Review and Browse must be adjacent, same-size sibling buttons.
for (const position of ['top', 'bottom']) {
  const group = reviewer.contentEl.findClass('marrow-selection-actions-' + position);
  assert(group, 'Paired action group missing: ' + position);
  assert.equal(group.children.length, 2, 'Review/Browse should be the only paired actions');
  assert.equal(group.children[0].text, 'Review selected indexes (0)');
  assert.equal(group.children[1].text, 'Browse selected indexes (0)');
  assert(group.children[0].cls.includes('mod-cta'), 'Review keeps accent button');
  assert(group.children[1].cls.includes('marrow-start-browse-selected'),
    'Browse keeps neutral button');
  assert.equal(group.children[0].disabled, true);
  assert.equal(group.children[1].disabled, true);
}
const pairedActionCss = fs.readFileSync('styles.css','utf8');
assert(!pairedActionCss.includes('.is-mobile .marrow-start-selected { margin-bottom: 110px; }'),
  'Old mobile button margin would create giant space between Review and Browse');
assert(pairedActionCss.includes('.marrow-selection-actions .marrow-start-selected'),
  'Paired buttons must override standalone margins');
assert(pairedActionCss.includes('gap: 8px'), 'Paired buttons need a consistent small gap');
console.log('Compact paired Browse/Review UI checks passed.');


assert(reviewer.contentEl.findText('▸  ENT  ·  1 index'), 'Unapproved subject should be visible with filter off');
assert(reviewer.contentEl.findText('▸  Medicine  ·  1 index'), 'Medicine subject should initially be collapsed');
assert(!reviewer.contentEl.findText(' Approved medicine index'), 'Collapsed subjects should not render indexes');
assert.equal(reviewer.contentEl.findClass('marrow-start-selected-top').disabled, true,
  'Review selected button should initially be disabled');

function findIndexCheckbox(root) {
  if (root.props.tag === 'input' && root.props.type === 'checkbox' &&
      root.props.attr?.['aria-label']?.startsWith('Select ')) return root;
  for (const child of root.children) {
    const result = findIndexCheckbox(child);
    if (result) return result;
  }
  return null;
}

const findActiveBody = node => {
  if (node.cls.split(' ').includes('marrow-accordion-body') && !node.hidden) return node;
  for (const child of node.children) { const f = findActiveBody(child); if (f) return f; }
  return null;
};
// Open medicine, select one index, then open Ophthalmology without leaving the page.
reviewer.contentEl.findText('▸  Medicine  ·  1 index').handlers.click();
assert.equal(reviewer.screen, 'subjects', 'Subject opens inline instead of navigating away');
assert.equal(reviewer.expandedSubject, 'Medicine', 'Medicine should be open');
assert(reviewer.contentEl.findText(' Approved medicine index'), 'Open subject should show its indexes');
let checkbox = findIndexCheckbox(findActiveBody(reviewer.contentEl));
assert(checkbox, 'Need an index selection checkbox');
checkbox.checked = true; checkbox.handlers.change();
assert(reviewer.selected.has('MED-01'), 'Medicine selection should stick');
assert(reviewer.contentEl.findText('▾  Medicine  ·  1 index  ·  1 selected'),
  'Medicine heading should show selected index count');
assert.equal(reviewer.contentEl.findClass('marrow-start-selected-top').disabled, false,
  'Review selected button must enable after selecting an index');

reviewer.contentEl.findText('▸  Ophthalmology  ·  2 indexes').handlers.click();
assert.equal(reviewer.screen, 'subjects');
assert.equal(reviewer.expandedSubject, 'Ophthalmology');
assert(!reviewer.contentEl.findText(' Approved medicine index'), 'Opening Ophthalmology must collapse Medicine');
assert(reviewer.selected.has('MED-01'), 'Collapsing must not discard Medicine selection');
assert(reviewer.contentEl.findText(' Anatomy of Retina'), 'Ophthalmology index must be visible');
assert(reviewer.contentEl.findText(' Unapproved eye index'), 'Full view must also show empty indexes');
// Locate the expanded (non-hidden) panel for Ophthalmology.
const activeBody = findActiveBody(reviewer.contentEl);
assert(activeBody, 'An expanded subject needs an active body');
checkbox = findIndexCheckbox(activeBody);
assert(checkbox, 'Ophthalmology checkbox missing');
checkbox.checked = true; checkbox.handlers.change();
assert(reviewer.selected.has('OPH-04') && reviewer.selected.has('MED-01'),
  'Both subjects must remain selected');
assert(reviewer.contentEl.findText('▾  Ophthalmology  ·  2 indexes  ·  1 selected'));
assert.equal(reviewer.contentEl.findClass('marrow-start-selected-top').text,
  'Review selected indexes (2)', 'Top combined review button should update');
assert.equal(reviewer.contentEl.findClass('marrow-start-selected-bottom').text,
  'Review selected indexes (2)', 'Bottom combined review button should update');
reviewer.contentEl.findClass('marrow-start-selected-top').handlers.click();
assert.deepEqual([...chosenForReview].sort(), ['MED-01', 'OPH-04'],
  'Combined review should include both subjects');

// The single-index Review button must not include other selected subjects.
activeBody.findText('Review').handlers.click();
assert.deepEqual([...chosenForReview], ['OPH-04'], 'Individual Review should start only that index');

// Approved filter hides empty indexes/subjects while preserving both selections.
let availability = reviewer.contentEl.findClass('marrow-availability-label');
let toggle = availability.children.find(child => child.props.tag === 'input');
assert(toggle && !toggle.checked, 'Approved-only toggle should start off');
toggle.checked = true; toggle.handlers.change();
assert.equal(reviewer.onlyApprovedIndexes, true);
assert(!reviewer.contentEl.findText('▸  ENT  ·  1 index'), 'Empty subjects must disappear');
assert(!reviewer.contentEl.findText(' Unapproved eye index'), 'Empty indexes must disappear');
assert(reviewer.contentEl.findText('▾  Ophthalmology  ·  1 index  ·  1 selected'),
  'Approved-only filter should keep the opened subject and selections');
assert.equal(reviewer.selected.size, 2, 'Filtering must not change selections');
availability = reviewer.contentEl.findClass('marrow-availability-label');
toggle = availability.children.find(child => child.props.tag === 'input');
toggle.checked = false; toggle.handlers.change();
assert(reviewer.contentEl.findText(' Unapproved eye index'), 'Full list should return when toggle is off');
assert.equal(reviewer.selected.size, 2, 'Turning off filter should keep both selections');

// Tapping the open subject a second time should collapse it.
reviewer.contentEl.findText('▾  Ophthalmology  ·  2 indexes  ·  1 selected').handlers.click();
assert.equal(reviewer.expandedSubject, '', 'An open subject should collapse when tapped again');
assert(!reviewer.contentEl.findText(' Anatomy of Retina'), 'Collapsed index tiles must be removed');
assert(reviewer.selected.has('OPH-04') && reviewer.selected.has('MED-01'));

assert(newCss.includes('.marrow-accordion-body'), 'Accordion panel styles missing');
assert(newCss.includes('max-height: min('), 'Open index list should have bounded scroll height');
console.log('Cross-subject collapsible index-selection and availability-filter checks passed.');


// v0.1.9: subject -> system/subheading -> index; selected cards survive switches.
const anatomyHeadCard = { id: 'ANAT-HNF-01', type: 'fact', status: 'approved',
  indexIds: ['ANA-HNF-01'], question: 'Head question?', answer: 'Answer' };
const anatomyUpperCard = { id: 'ANAT-UL-01', type: 'fact', status: 'approved',
  indexIds: ['ANA-UL-01'], question: 'Upper limb question?', answer: 'Answer' };
reviewer.plugin = {
  cards: [card, secondCard, anatomyHeadCard, anatomyUpperCard],
  indexes: [
    { id: 'ANA-HNF-01', title: 'Cranial nerves', subject: 'Anatomy', system: 'Head, Neck and Face' },
    { id: 'ANA-HNF-02', title: 'Face muscles (empty)', subject: 'Anatomy', system: 'Head, Neck and Face' },
    { id: 'ANA-UL-01', title: 'Brachial plexus', subject: 'Anatomy', system: 'Upper Limb' },
    { id: 'ANA-LL-01', title: 'Popliteal fossa (empty)', subject: 'Anatomy', system: 'Lower Limb' },
    { id: 'OPH-04', title: 'Anatomy of Retina', subject: 'Ophthalmology', system: 'Basic Anatomy of Eye' },
    { id: 'OPH-32', title: 'Retinal investigations (empty)', subject: 'Ophthalmology', system: 'Retina' },
    { id: 'MED-01', title: 'Approved medicine index', subject: 'Medicine', system: 'General' }
  ],
  stats: new Map()
};
reviewer.screen = 'subjects';
reviewer.expandedSubject = '';
reviewer.expandedSystem = '';
reviewer.onlyApprovedIndexes = false;
reviewer.selected = new Set();
reviewer.draw();

function findActiveSystem(node) {
  if (node.cls.split(' ').includes('marrow-system-body') && !node.hidden) return node;
  for (const child of node.children) {
    const found = findActiveSystem(child);
    if (found) return found;
  }
  return null;
}
assert(reviewer.contentEl.findText('▸  Anatomy  ·  4 indexes'),
  'Anatomy must appear as a collapsible subject');
reviewer.contentEl.findText('▸  Anatomy  ·  4 indexes').handlers.click();
assert(reviewer.contentEl.findText('▸  Head, Neck and Face  ·  2 indexes'),
  'Live catalog system names should be used as subheadings');
assert(reviewer.contentEl.findText('▸  Upper Limb  ·  1 index'),
  'Multiple subheadings should be shown');
assert(!reviewer.contentEl.findText(' Cranial nerves'),
  'Indexes should be hidden until their subheading opens');
reviewer.contentEl.findText('▸  Head, Neck and Face  ·  2 indexes').handlers.click();
assert.equal(reviewer.expandedSystem, 'Head, Neck and Face');
assert(reviewer.contentEl.findText(' Cranial nerves'),
  'Opening Head, Neck and Face should show its own indexes');
assert(!reviewer.contentEl.findText(' Brachial plexus'),
  'Another system’s indexes should remain hidden');
let nestedCheckbox = findIndexCheckbox(findActiveSystem(reviewer.contentEl));
assert(nestedCheckbox && nestedCheckbox.props.attr['aria-label'] === 'Select Cranial nerves',
  'Only the expanded system should provide selectable indexes');
nestedCheckbox.checked = true;
nestedCheckbox.handlers.change();
assert(reviewer.selected.has('ANA-HNF-01'));
assert(reviewer.contentEl.findText('▾  Head, Neck and Face  ·  2 indexes  ·  1 selected'),
  'Selected count should appear on the system heading');
reviewer.contentEl.findText('▸  Upper Limb  ·  1 index').handlers.click();
assert.equal(reviewer.expandedSystem, 'Upper Limb');
assert(!reviewer.contentEl.findText(' Cranial nerves'),
  'Opening Upper Limb should collapse Head, Neck and Face');
assert(reviewer.selected.has('ANA-HNF-01'), 'Switching system must keep earlier choices');
assert(reviewer.contentEl.findText(' Brachial plexus'));
nestedCheckbox = findIndexCheckbox(findActiveSystem(reviewer.contentEl));
nestedCheckbox.checked = true;
nestedCheckbox.handlers.change();
assert(reviewer.selected.has('ANA-UL-01'));
assert(reviewer.contentEl.findText('▾  Anatomy  ·  4 indexes  ·  2 selected'),
  'The subject header should reflect selections across its systems');
reviewer.contentEl.findText('▸  Ophthalmology  ·  2 indexes').handlers.click();
assert.equal(reviewer.expandedSubject, 'Ophthalmology');
assert.equal(reviewer.expandedSystem, '', 'New subject should start with subheadings collapsed');
assert(!reviewer.contentEl.findText(' Brachial plexus'),
  'Previous subject should collapse entirely');
assert(reviewer.selected.has('ANA-HNF-01') && reviewer.selected.has('ANA-UL-01'),
  'Both anatomy indexes must remain selected after switching subject');
assert(reviewer.contentEl.findText('▸  Basic Anatomy of Eye  ·  1 index'));
reviewer.contentEl.findText('▸  Basic Anatomy of Eye  ·  1 index').handlers.click();
assert(reviewer.contentEl.findText(' Anatomy of Retina'));
nestedCheckbox = findIndexCheckbox(findActiveSystem(reviewer.contentEl));
nestedCheckbox.checked = true;
nestedCheckbox.handlers.change();
assert.equal(reviewer.selected.size, 3, 'Anatomy and Ophthalmology selections must combine');
assert.equal(reviewer.contentEl.findClass('marrow-start-selected-top').text,
  'Review selected indexes (3)');
reviewer.contentEl.findClass('marrow-start-selected-top').handlers.click();
assert.deepEqual([...chosenForReview].sort(), ['ANA-HNF-01', 'ANA-UL-01', 'OPH-04'],
  'Combined review must include all chosen index IDs across subheadings/subjects');
// Approved-only should remove empty systems entirely and preserve selected ones.
availability = reviewer.contentEl.findClass('marrow-availability-label');
toggle = availability.children.find(child => child.props.tag === 'input');
toggle.checked = true;
toggle.handlers.change();
assert(!reviewer.contentEl.findText('▸  Retina  ·  1 index'),
  'System with no approved cards should be hidden by approved-only filter');
assert(reviewer.contentEl.findText(' Anatomy of Retina'),
  'Expanded, approved subheading should remain open after filtering');
assert.equal(reviewer.selected.size, 3, 'Filter must not remove selected indexes');
reviewer.contentEl.findText('▾  Ophthalmology  ·  1 index  ·  1 selected').handlers.click();
assert.equal(reviewer.expandedSystem, '', 'Collapsing subject should close its subheading');
assert.equal(reviewer.selected.size, 3);
assert(newCss.includes('max-height: min(74vh, 680px)'), 'Subject accordion should be taller');
assert(newCss.includes('max-height: min(70vh, 620px)'), 'Mobile subject accordion should be taller');
assert(newCss.includes('.marrow-system-toggle'), 'Nested subheading styles are missing');
console.log('Nested system accordion regression checks passed.');

// v0.2.0: Ungraded browsing and typed+ink notes persist independently of GitHub.
(async () => {
  const saved = new Map();
  const writer = new stubModule.exports();
  writer.initPromise = null;
  writer.app = {
    vault: {
      getAbstractFileByPath(path) { return saved.has(path) ? { path } : null; },
      async read(file) { return saved.get(file.path); },
      async modify(file, text) { saved.set(file.path, text); },
      async create(path, text) { saved.set(path, text); }
    }
  };
  writer.ensureFolder = async () => {};
  writer.noteWriteQueue = Promise.resolve();
  await writer.saveCardNotePart('OPH-04', 'text', 'Quick shorthand');
  await writer.saveCardNotePart('OPH-04', 'ink', [
    { id:'ink-1', color:'#286ab7', width:2.8, points:[[15,30],[25,40]] }
  ]);
  const local = await writer.readCardNote('OPH-04');
  assert.equal(local.text, 'Quick shorthand', 'Typed shorthand should reopen');
  assert.equal(local.strokes[0].points.length, 2, 'Vector pen coordinates should reopen');
  assert(saved.has('MarrowCards/notes/OPH-04/text.json'));
  assert(saved.has('MarrowCards/notes/OPH-04/ink.json'));
  assert(!Array.from(saved.keys()).some(path => path.includes('packs/') || path.includes('media/')),
    'Personal notes must not be stored in card or image packs');
  const independent = await writer.readCardNote('OPH-04');
  assert.equal(independent.strokes[0].points[1][0], 25);
  await assert.rejects(writer.saveCardNotePart('../unsafe', 'text', 'bad'), /Invalid note save/);

  const events = [];
  const notes = new Map();
  reviewer.plugin = {
    cards: [card, secondCard],
    indexes: [
      {id:'OPH-04', title:'Anatomy of Retina', subject:'Ophthalmology'},
      {id:'MED-01', title:'Medicine test', subject:'Medicine'}
    ],
    stats: new Map(),
    async recordEvent(id, action) { events.push({id, action}); },
    async readCardNote(cardId) {
      return notes.get(cardId) || {cardId, text:'', strokes:[]};
    },
    async saveCardNotePart(cardId, part, value) {
      const prev = notes.get(cardId) || {cardId, text:'', strokes:[]};
      const next = {...prev, [part === 'ink' ? 'strokes' : 'text']: JSON.parse(JSON.stringify(value))};
      notes.set(cardId, next);
    }
  };
  reviewer.screen = 'subjects';
  reviewer.selected = new Set();
  reviewer.notesOpen = false;
  reviewer.noteData = null;
  await reviewer.startBrowse(['OPH-04','MED-01']);
  assert.equal(reviewer.sessionKind, 'browse');
  assert.equal(events.length, 0, 'Starting Browse must never count Seen');
  assert(reviewer.contentEl.findText('Previous'));
  assert(reviewer.contentEl.findText('Show answer'));
  assert(reviewer.contentEl.findText('Next'));
  assert(!reviewer.contentEl.findText('Wrong'), 'Browse must never offer Wrong grading');
  assert(!reviewer.contentEl.findText('Right'), 'Browse must never offer Right grading');
  reviewer.contentEl.findText('Show answer').handlers.click();
  assert.equal(reviewer.flipped, true);
  assert(reviewer.contentEl.findText('Show question'));
  assert.equal(events.length, 0);

  const first = reviewer.queue[0];
  await reviewer.toggleNote(first);
  assert(reviewer.notesOpen, 'My notes must open on Browse cards');
  const quick = reviewer.contentEl.findClass('marrow-note-quick-type');
  assert(quick, 'Quick-typing editor missing');
  quick.value = 'Phone shorthand for later';
  quick.handlers.input();
  assert.equal(reviewer.noteData.text, 'Phone shorthand for later');
  assert.equal(reviewer.contentEl.findClass('marrow-note-text').value, 'Phone shorthand for later');
  const pen = reviewer.contentEl.findText('Pen');
  pen.handlers.click();
  const ink = reviewer.contentEl.findClass('marrow-note-ink');
  assert(ink, 'Stylus canvas should be available');
  ink.handlers.pointerdown({pointerType:'pen', pointerId:7, clientX:16, clientY:20, preventDefault(){}});
  ink.handlers.pointermove({pointerType:'pen', pointerId:7, clientX:80, clientY:90, preventDefault(){}});
  ink.handlers.pointerup({pointerType:'pen', pointerId:7});
  assert.equal(reviewer.noteData.strokes.length, 1, 'Stylus strokes should be retained');
  assert(reviewer.noteData.strokes[0].points.length >= 2);
  await reviewer.flushNote();
  assert.equal(notes.get(first.id).text, 'Phone shorthand for later');
  assert.equal(notes.get(first.id).strokes.length, 1, 'Ink and text should both be saved');
  assert.equal(events.length, 0, 'Writing notes must not count as practising');

  await reviewer.browseStep(1);
  assert.equal(reviewer.cursor, 1, 'Browse Next should move to the next card');
  assert.equal(reviewer.flipped, false, 'Next card should start on question');
  assert.equal(events.length, 0, 'Browse navigation must not write Seen events');
  await reviewer.browseStep(-1);
  assert.equal(reviewer.cursor, 0, 'Browse Previous should work');
  await reviewer.toggleNote(reviewer.queue[0]);
  assert.equal(reviewer.noteData.text, 'Phone shorthand for later', 'Note should reopen after navigation');
  assert.equal(reviewer.noteData.strokes.length, 1, 'Saved ink should reopen for editing');
  await reviewer.toggleNote(reviewer.queue[0]);
  assert.equal(events.length, 0);

  await Reviewer.prototype.startReview.call(reviewer, ['OPH-04']);
  assert.equal(reviewer.sessionKind, 'review');
  assert(events.some(event => event.action === 'seen'), 'Ordinary reviews must still count Seen');
  assert(reviewer.contentEl.findText('Flip to answer'));
  assert(reviewer.contentEl.findText('My notes (type / pen)'), 'Notes must also be available during reviews');
  console.log('No-grade Browse and phone+stylus note save/reopen checks passed.');
})().catch(err => { console.error(err); process.exitCode = 1; });
