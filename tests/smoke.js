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
const mockDocument = {
  lastPicker: null,
  body: { appendChild() {} },
  createElement(tag) {
    if (tag !== 'input') throw new Error('Unexpected document element ' + tag);
    const picker = { style: {}, files: [], handlers: {}, removed: false, clicked: false,
      addEventListener(name, fn) { this.handlers[name] = fn; },
      remove() { this.removed = true; }, click() { this.clicked = true; }
    };
    this.lastPicker = picker;
    return picker;
  }
};
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
  document: mockDocument,
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


// v0.2.2: Option tap and safe scrambling, independent of original answer letters.
(async () => {
  const logged = [];
  const mcq = { id:'MCQ-TAP-01', type:'pyq', status:'approved', indexIds:['OPH-04'],
    question:'Site of best visual acuity?', images:[],
    options:['a) Optic disc','b) Ora serrata','c) Fovea','d) Periphery'],
    answer:'C. Fovea', explanation:'Central acuity is highest at the fovea.' };
  const fact = { id:'FACT-TAP-02', type:'fact', status:'approved', indexIds:['OPH-04'],
    question:'Name of blind spot?', answer:'Mariotte blind spot', images:[] };
  const plugin = { cards:[mcq,fact],
    indexes:[{id:'OPH-04', subject:'Ophthalmology', title:'Retina'}],
    stats:new Map(),
    async recordEvent(id, action) { logged.push({id,action}); },
    async readCardNote(id) {return {cardId:id,text:'',strokes:[]}; },
    async saveCardNotePart() {}
  };
  const mcqView = new Reviewer(mockLeaf,plugin);
  await mcqView.startReview(['OPH-04']);
  assert.equal(mcqView.correctIndex,2,'Source C must identify third option');
  assert.equal(mcqView.optionOrder.length,4);
  assert.notDeepEqual([...mcqView.optionOrder],[0,1,2,3],
    'Safe MCQ should reshuffle on new presentation');
  const firstOrder = [...mcqView.optionOrder];
  mcqView.flipped = true;
  mcqView.draw();
  const originalCorrectPosition = firstOrder.indexOf(2);
  assert(mcqView.contentEl.findText('Correct: ' + String.fromCharCode(65+originalCorrectPosition) + '. Fovea'),
    'Flipping must display the new answer letter');
  mcqView.flipped = false;
  mcqView.draw();

  mcqView.optionOrder = [2,0,3,1];
  mcqView.draw();
  const selectable = mcqView.contentEl.findText('A. Fovea');
  assert(selectable && selectable.handlers.click,'Newly lettered correct option must be tappable');
  await Promise.all([mcqView.selectOption(2), mcqView.selectOption(2)]);
  assert.equal(logged.filter(e=>e.action==='right').length,1,
    'Double taps must not create duplicate Right events');
  assert.equal(mcqView.flipped,true,'Selecting an option must automatically reveal answer');
  assert(mcqView.contentEl.findText('Correct — saved as Right'));
  assert(mcqView.contentEl.findText('Your choice: A. Fovea'));
  assert(mcqView.contentEl.findText('Next card'));
  assert(!mcqView.contentEl.findText('Wrong'),'After automatic grading do not show manual Wrong');
  assert(mcqView.contentEl.findText('My notes (type / pen)'),
    'Answered card should remain open for note editing');
  mcqView.contentEl.findText('Show question').handlers.click();
  assert(mcqView.contentEl.findText('A. Fovea'), 'Answer order must stay fixed on reverse flip');
  await mcqView.selectOption(0);
  assert.equal(logged.filter(e=>e.action==='wrong').length,0,
    'A finished answer cannot be graded a second time');
  mcqView.contentEl.findText('Show answer').handlers.click();
  await mcqView.nextAfterOption();
  assert.equal(mcqView.queue[mcqView.cursor].id,'FACT-TAP-02',
    'Next should move after showing the answer');
  assert.equal(mcqView.correctIndex,-1,'Fact with no options stays manual');
  assert(mcqView.contentEl.findText('Flip to answer'));
  mcqView.contentEl.findText('Flip to answer').handlers.click();
  assert(mcqView.contentEl.findText('Right') && mcqView.contentEl.findText('Wrong'),
    'No-option cards must retain manual grading');
  await mcqView.startReview(['OPH-04']);
  await mcqView.selectOption(0);
  assert.equal(logged.filter(e=>e.action==='wrong').length,1,
    'Selecting an incorrect option must log Wrong');
  assert(mcqView.contentEl.findText('Incorrect — saved as Wrong'));
  const eventCount = logged.length;
  await mcqView.startBrowse(['OPH-04']);
  assert.equal(logged.length,eventCount,'Browse must not record Seen');
  assert(mcqView.contentEl.findText('a) Optic disc'),
    'Browsing must display the untouched source options');
  await mcqView.selectOption(2);
  assert.equal(logged.length,eventCount,'Browse selection must never grade');
  const positional = { ...mcq, id:'MCQ-POSITIONAL', options:[
    'a) First','b) Correct','c) Both A and B','d) Last'
  ], answer:'B. Correct' };
  plugin.cards = [positional];
  await mcqView.startReview(['OPH-04']);
  assert.deepEqual([...mcqView.optionOrder],[0,1,2,3],
    'Dependent options must remain in source order');
  const bad = { ...positional, id:'MCQ-UNKNOWN-ANSWER', answer:'B. Not in the options' };
  plugin.cards = [bad];
  await mcqView.startReview(['OPH-04']);
  assert.equal(mcqView.correctIndex,-1,'Never guess a mismatched source answer');
  assert(mcqView.contentEl.findText('Flip to answer'));
  assert(mcqView.contentEl.findText('b) Correct'),
    'Unverifiable MCQ must remain readable with manual grading');
  console.log('MCQ tap-to-grade, changed letters, single count and fact fallback checks passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});


// v0.2.3: the second and third cards must be tappable after Next.
// Previously, nextAfterOption() and grade() drew the subsequent question
// while busy=true and left its options permanently disabled in the DOM.
(async () => {
  const three = [1, 2, 3].map(i => ({
    id: 'SEQUENTIAL-DEMO-' + i, type: 'pyq', status: 'approved',
    indexIds: ['THREE-CARDS'], question: 'Dummy question ' + i,
    options: ['a) First','b) Second','c) Third','d) Fourth'],
    answer: i === 2 ? 'D. Fourth' : 'B. Second',
    images: [], explanation: 'Dummy explanation ' + i
  }));
  const events = [];
  const plugin = {
    cards: three, indexes: [{id:'THREE-CARDS',subject:'Test',title:'Three-card index'}],
    stats: new Map(),
    async recordEvent(id, action) { events.push({id,action}); },
    async readCardNote(id) { return {cardId:id,text:'',strokes:[]}; },
    async saveCardNotePart() {}
  };
  const v = new Reviewer(mockLeaf, plugin);
  await v.startReview(['THREE-CARDS']);
  function currentChoice() {
    const originalIndex = v.correctIndex;
    const displayedIndex = v.optionOrder.indexOf(originalIndex);
    const letter = String.fromCharCode(65 + displayedIndex);
    const text = ['First','Second','Third','Fourth'][originalIndex];
    return v.contentEl.findText(letter + '. ' + text);
  }
  for (let i = 0; i < three.length; i++) {
    assert.equal(v.queue[v.cursor].id,three[i].id,'Expected sequence card ' + (i + 1));
    const choice = currentChoice();
    assert(choice && choice.handlers.click,'Choice must be interactive for card ' + (i + 1));
    assert.equal(choice.disabled,false,
      'Option button must not remain disabled after Next: card ' + (i + 1));
    await v.selectOption(v.correctIndex);
    assert.equal(v.flipped,true);
    assert(v.contentEl.findText('Correct — saved as Right'));
    if (i < three.length - 1) await v.nextAfterOption();
  }
  assert.equal(events.filter(e=>e.action==='right').length,3,
    'All three cards should be correctly auto-graded exactly once');
  assert.equal(events.filter(e=>e.action==='seen').length,3);

  // A manual Right/Wrong attempt must also leave the next MCQ enabled.
  await v.startReview(['THREE-CARDS']);
  v.contentEl.findText('Flip to answer').handlers.click();
  await v.grade('wrong');
  const afterManual = currentChoice();
  assert(afterManual && afterManual.disabled === false,
    'MCQ options should be enabled after manually grading the prior card');
  console.log('Multiple consecutive MCQ controls regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});


// v0.2.4: New cards may encode correct answers with Unicode dashes or
// multiline numbered sequences. Test actual Review option controls, not only
// an isolated parser. Use synthetic questions only (no private PYQ text).
(async () => {
  const examples = [
    {
      id: 'FORMAT-EMDASH', options: ['a) Alpha', 'b) Beta', 'c) Gamma', 'd) Delta'],
      answer: 'B — Beta', correct: 1
    },
    {
      id: 'FORMAT-ENDASH', options: ['a) Alpha', 'b) Beta', 'c) Gamma', 'd) Delta'],
      answer: 'C – Gamma', correct: 2
    },
    {
      id: 'FORMAT-HYPHEN', options: ['a) Alpha', 'b) Beta', 'c) Gamma', 'd) Delta'],
      answer: 'D - Delta', correct: 3
    },
    {
      id: 'FORMAT-MULTILINE',
      options: ['a) 1- Alpha; 2- Beta; 3- Gamma',
        'b) 1- Beta; 2- Alpha; 3- Gamma',
        'c) 1- Beta; 2- Gamma; 3- Alpha',
        'd) 1- Gamma; 2- Alpha; 3- Beta'],
      answer: 'A\n1 — Alpha\n2 — Beta\n3 — Gamma', correct: 0, preserveOrder: true
    },
    {
      id: 'FORMAT-EXPLANATION', options: ['a) A', 'b) B', 'c) C', 'd) D'],
      answer: 'D. D - Synthetic extra explanation', correct: 3
    },
    {
      id: 'FORMAT-LEGACY', options: ['a) Alpha', 'b) Beta', 'c) Gamma', 'd) Delta'],
      answer: 'A. Alpha', correct: 0
    }
  ];
  const cards = examples.map(c => ({
    id: c.id, type: 'pyq', status: 'approved', indexIds: ['FORMAT-TEST'],
    question: 'Synthetic source question?', options: c.options,
    answer: c.answer, images: [], explanation: 'Synthetic explanation'
  }));
  const events = [];
  const plugin = {
    cards, indexes: [{id:'FORMAT-TEST',subject:'Test',title:'Format test'}],
    stats: new Map(),
    async recordEvent(id, action) { events.push({id, action}); },
    async readCardNote(id) { return {cardId:id, text:'', strokes:[]}; },
    async saveCardNotePart() {}
  };
  const v = new Reviewer(mockLeaf, plugin);
  await v.startReview(['FORMAT-TEST']);
  for (let i = 0; i < examples.length; i++) {
    const expected = examples[i];
    assert.equal(v.queue[v.cursor].id,expected.id);
    assert.equal(v.correctIndex,expected.correct,
      'Verify answer text and source choice for ' + expected.id);
    if (expected.preserveOrder) {
      assert.deepEqual([...v.optionOrder],[0,1,2,3],
        'Sequence/numbered image choices must not reshuffle');
    }
    const shownAt = v.optionOrder.indexOf(expected.correct);
    const letter = String.fromCharCode(65 + shownAt);
    const original = expected.options[expected.correct].replace(/^[a-d][).:\- ]+/, '');
    const button = v.contentEl.findText(letter + '. ' + original);
    assert(button && button.handlers.click && button.disabled === false,
      'Option must be clickable for ' + expected.id);
    await v.selectOption(expected.correct);
    assert(v.contentEl.findText('Correct — saved as Right'));
    if (i + 1 < examples.length) await v.nextAfterOption();
  }
  assert.equal(events.filter(e => e.action === 'seen').length, examples.length);
  assert.equal(events.filter(e => e.action === 'right').length, examples.length);
  assert.equal(events.filter(e => e.action === 'wrong').length, 0);

  for (const answer of ['B — Wrong text', 'A — Beta', 'F — Alpha']) {
    plugin.cards = [{...cards[0], id:'FORMAT-MISMATCH', answer}];
    await v.startReview(['FORMAT-TEST']);
    assert.equal(v.correctIndex,-1, 'Do not trust a letter when option text mismatches');
    assert(v.contentEl.findText('a) Alpha'),
      'Unverifiable choices remain read-only for manual grading');
  }
  plugin.cards = cards;
  const priorEvents = events.length;
  await v.startBrowse(['FORMAT-TEST']);
  assert.equal(events.length, priorEvents, 'Browse must not add events');
  assert.equal(v.correctIndex,examples[0].correct);
  assert(v.contentEl.findText('a) Alpha'), 'Browse keeps original choice order');
  console.log('Unicode dash, multiline answer, safe option tap and Browse regressions passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });


// v0.2.5: Two ways to attach an image to a card note. Image bytes must
// remain in notes/, never overwrite a PYQ image, and survive note reopen.
(async () => {
  const storage = new Map();
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,1,2,3,4]).buffer;
  const jpg = new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,0,1,2,3,4]).buffer;
  const media = 'MarrowCards/media/source-figure.png';
  storage.set(media, png);
  const vault = {
    getAbstractFileByPath(path) { return storage.has(path) ? {path} : null; },
    async read(file) { return storage.get(file.path); },
    async readBinary(file) { return storage.get(file.path); },
    async modify(file, data) { storage.set(file.path,data); },
    async create(path, data) { storage.set(path,data); },
    async createBinary(path,data) { storage.set(path,data); },
    getResourcePath(file) { return 'app://marrow/' + file.path; }
  };
  const writer = new stubModule.exports();
  writer.initPromise = null;
  writer.app = {vault};
  writer.noteWriteQueue = Promise.resolve();
  writer.ensureFolder = async () => {};
  const imageCard = {
    id: 'NOTE-IMAGE-01', type:'pyq',status:'approved',indexIds:['IMG-INDEX'],
    question:'Synthetic picture question?',options:['a) First','b) Second'],
    answer:'A. First',images:['source-figure.png']
  };
  writer.cards = [imageCard];
  writer.indexes = [{id:'IMG-INDEX',subject:'Test',title:'Image annotations'}];
  writer.stats = new Map();
  writer.recordEvent = async () => { throw new Error('Browse must not grade'); };
  const v = new Reviewer({app:{vault}},writer);
  await v.startBrowse(['IMG-INDEX']);
  await v.toggleNote(imageCard);
  assert.equal(v.noteData.image,null, 'Existing notes without image.json should still load');
  assert(v.contentEl.findText('Use question image'), 'Question image action missing');
  assert(v.contentEl.findText('Choose image from device'), 'Device picture picker missing');

  v.noteData.text = 'Typed explanation stays';
  v.noteData.dirtyText = true;
  v.noteData.strokes = [{id:'stroke-1',color:'#286ab7',width:2.8,points:[[22,24],[80,95]]}];
  v.noteData.dirtyInk = true;
  await v.flushNote();
  await v.attachQuestionImage(imageCard,'source-figure.png');
  assert(v.noteData.image?.filename?.endsWith('.png'), 'Copied source PNG was not saved');
  const noteImagePath = 'MarrowCards/notes/NOTE-IMAGE-01/images/' + v.noteData.image.filename;
  assert(storage.has(noteImagePath), 'Source image copy should live under card notes');
  assert.equal(storage.get(media),png,'Original approved media bytes must stay untouched');
  assert(storage.has('MarrowCards/notes/NOTE-IMAGE-01/image.json'));
  assert(v.contentEl.findClass('marrow-note-reference-image'),
    'Saved image must appear below note ink canvas');
  assert(v.contentEl.findClass('marrow-note-ink'), 'Pen canvas must remain present');
  assert(v.contentEl.findClass('marrow-note-page-with-image'),
    'Text should be repositioned below an attached figure');
  v.contentEl.findText('Pen').handlers.click();
  const penOnImage = v.contentEl.findClass('marrow-note-ink');
  penOnImage.handlers.pointerdown({pointerType:'pen',pointerId:21,
    clientX:100,clientY:110,preventDefault(){}});
  penOnImage.handlers.pointermove({pointerType:'pen',pointerId:21,
    clientX:200,clientY:210,preventDefault(){}});
  penOnImage.handlers.pointerup({pointerType:'pen',pointerId:21});
  await v.flushNote();
  assert.equal(v.noteData.strokes.length,2,'Stylus must draw over the attached image');
  const note1 = await writer.readCardNote(imageCard.id);
  assert.equal(note1.text,'Typed explanation stays');
  assert.equal(note1.strokes.length,2);
  assert.equal(note1.image.filename,v.noteData.image.filename);

  await v.toggleNote(imageCard);
  await v.toggleNote(imageCard);
  assert(v.contentEl.findClass('marrow-note-reference-image'),
    'Image must render after closing/reopening notes');
  assert.equal(v.noteData.strokes.length,2,'Ink annotations must persist after reopening');
  assert.equal(v.noteData.text,'Typed explanation stays');

  // An image chosen from the device replaces the display pointer without
  // deleting original source media or existing typed/vector annotations.
  v.contentEl.findText('Choose image from device').handlers.click();
  const picker = mockDocument.lastPicker;
  assert(picker && picker.clicked, 'Device image action must launch file picker');
  assert(picker.accept.includes('image/jpeg'));
  picker.files = [{name:'picked.jpg',size:jpg.byteLength,
    async arrayBuffer(){return jpg;}}];
  await picker.handlers.change();
  assert(picker.removed, 'Temporary file picker must clean itself up');
  assert(v.noteData.image.filename.endsWith('.jpg'));
  assert(storage.has('MarrowCards/notes/NOTE-IMAGE-01/images/' + v.noteData.image.filename));
  assert.equal(storage.get(media),png, 'Picking a new image cannot modify approved media');
  assert.equal(v.noteData.strokes.length,2, 'Replacing image must not clear vector ink');

  await v.removeNoteImage(imageCard);
  assert.equal(v.noteData.image,null);
  assert(!v.contentEl.findClass('marrow-note-reference-image'),
    'Removed picture should disappear from note page');
  const remaining = await writer.readCardNote(imageCard.id);
  assert.equal(remaining.image,null);
  assert.equal(remaining.text,'Typed explanation stays');
  assert.equal(remaining.strokes.length,2);
  assert(![...storage.keys()].some(path => path.startsWith('MarrowCards/packs/')),
    'Personal note images must never enter published packs');

  // Invalid or oversized files must be rejected before writing any bytes.
  await assert.rejects(writer.addCardNoteImage(imageCard.id,new Uint8Array(20).buffer),
    /Unsupported image/);
  await assert.rejects(writer.addCardNoteImage('../bad',png), /Invalid note card ID/);
  await assert.rejects(writer.addCardNoteImage(imageCard.id,{byteLength:16*1024*1024}),
    /15 MB/);
  console.log('Source-image, device picker, image persistence, note/ink safety and remove-image checks passed.');
})().catch(err => { console.error(err); process.exitCode = 1; });


// v0.2.6: Pen color buttons, image drag / corner-resize, saved geometry, and
// existing image.json files without a placement field remain compatible.
(async () => {
  const storage = new Map();
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,1,2,3,4]).buffer;
  const vault = {
    getAbstractFileByPath(path) { return storage.has(path) ? {path} : null; },
    async read(file) { return storage.get(file.path); },
    async readBinary(file) { return storage.get(file.path); },
    async modify(file, content) { storage.set(file.path,content); },
    async create(path, content) { storage.set(path,content); },
    async createBinary(path, content) { storage.set(path,content); },
    getResourcePath(file) { return 'app://marrow/' + file.path; }
  };
  const writer = new stubModule.exports();
  writer.app = { vault };
  writer.initPromise = null;
  writer.settings = {penColor:'#286ab7'};
  writer.saveData = async settings => { writer.savedColor = settings.penColor; };
  writer.ensureFolder = async () => {};
  writer.noteWriteQueue = Promise.resolve();
  writer.stats = new Map();
  const card = {id:'COLOR-IMAGE-TEST',type:'pyq',status:'approved',indexIds:['NOTES-ID'],
    question:'Synthetic study question?',options:['a) Sample','b) Other'],
    answer:'A. Sample',images:[]};
  writer.cards = [card];
  writer.indexes = [{id:'NOTES-ID',title:'Color and layout',subject:'Test'}];
  writer.recordEvent = async ()=>{throw new Error('Browse should not grade');};
  const v = new Reviewer({app:{vault}},writer);
  await v.startBrowse(['NOTES-ID']);
  await v.toggleNote(card);
  assert(v.contentEl.findClass('marrow-note-pen-colors'),'Color selector not shown');
  const red = v.contentEl.findClass('marrow-note-pen-colors').children
    .find(item => item.props.attr?.['aria-label'] === 'Pen color Red');
  assert(red && red.handlers.click,'Red preset is missing');
  red.handlers.click();
  await Promise.resolve();
  assert.equal(v.noteData.mode,'pen');
  assert.equal(v.noteData.penColor,'#d73a49');
  assert.equal(writer.savedColor,'#d73a49','Color preference should persist locally');
  const redButton = v.contentEl.findClass('marrow-note-pen-colors').children
    .find(item => item.props.attr?.['aria-label'] === 'Pen color Red');
  assert.equal(redButton.props.attr['aria-pressed'],'true');
  const pen = v.contentEl.findClass('marrow-note-ink');
  pen.handlers.pointerdown({pointerType:'pen',pointerId:91,clientX:40,clientY:45,
    preventDefault(){}});
  pen.handlers.pointermove({pointerType:'pen',pointerId:91,clientX:70,clientY:75,
    preventDefault(){}});
  pen.handlers.pointerup({pointerType:'pen',pointerId:91});
  await v.flushNote();
  assert.equal(v.noteData.strokes[0].color,'#d73a49');
  assert.equal(writer.settings.penColor,'#d73a49');

  // Simulate a legacy v0.2.5 note: just the filename, no geometry.
  const fileName = 'note-legacytest.png';
  storage.set('MarrowCards/notes/'+card.id+'/image.json',
    JSON.stringify({schemaVersion:1,cardId:card.id,filename:fileName}));
  storage.set('MarrowCards/notes/'+card.id+'/images/'+fileName,png);
  await v.toggleNote(card);
  await v.toggleNote(card);
  assert.deepEqual([...Object.values(v.noteData.image.placement)], [22,22,676,624],
    'Legacy attachment must get a non-destructive default placement');
  assert.equal(v.noteData.penColor,'#d73a49');
  const imageButton = v.contentEl.findText('Move / resize image');
  assert(imageButton && imageButton.handlers.click,'Image move mode missing');
  imageButton.handlers.click();
  assert.equal(v.noteData.mode,'image');
  assert.equal(v.contentEl.findClass('marrow-note-ink').style.pointerEvents,'none',
    'Ink must not draw when moving an image');
  const frame = v.contentEl.findClass('marrow-note-image-selection');
  assert(frame && frame.handlers.pointerdown,'Image selection frame missing');
  const start = {...v.noteData.image.placement};
  frame.handlers.pointerdown({pointerId:41,pointerType:'touch',
    clientX:80,clientY:90,preventDefault(){},stopPropagation(){}});
  frame.handlers.pointermove({pointerId:41,clientX:94,clientY:112,preventDefault(){}});
  frame.handlers.pointerup({pointerId:41,clientX:94,clientY:112,preventDefault(){}});
  assert.equal(v.noteData.image.placement.x,start.x+14);
  assert.equal(v.noteData.image.placement.y,start.y+22);
  assert.equal(v.noteData.strokes.length,1,'Moving image must not move/clear handwriting');
  await v.flushNote();
  const moved = await writer.readCardNote(card.id);
  assert.equal(moved.image.placement.x,start.x+14);
  assert.equal(moved.image.placement.y,start.y+22);
  const handle = v.contentEl.findClass('marrow-note-image-resize-handle');
  assert(handle && handle.handlers.pointerdown,'Resize corner missing');
  handle.handlers.pointerdown({pointerId:42,pointerType:'pen',
    clientX:230,clientY:250,preventDefault(){},stopPropagation(){}});
  handle.handlers.pointermove({pointerId:42,clientX:150,clientY:170,preventDefault(){}});
  handle.handlers.pointerup({pointerId:42,clientX:150,clientY:170,preventDefault(){}});
  assert(v.noteData.image.placement.width<start.width,'Resize should shrink image');
  const resized = {...v.noteData.image.placement};
  assert(Math.abs(resized.width/resized.height - start.width/start.height)<0.000001,
    'Resize must preserve its box proportions');
  await v.flushNote();
  await v.toggleNote(card);
  await v.toggleNote(card);
  assert.equal(v.noteData.image.placement.width,resized.width);
  assert.equal(v.noteData.image.placement.height,resized.height);
  assert.equal(v.noteData.strokes.length,1);
  assert.equal(v.noteData.strokes[0].color,'#d73a49');

  // Image bounds stay on 720x960 page even after a large drag, and
  // changing image layout cannot alter approved source media or grades.
  v.contentEl.findText('Move / resize image').handlers.click();
  const boundedFrame=v.contentEl.findClass('marrow-note-image-selection');
  boundedFrame.handlers.pointerdown({pointerId:43,clientX:1,clientY:1,preventDefault(){}});
  boundedFrame.handlers.pointermove({pointerId:43,clientX:10001,clientY:10001,preventDefault(){}});
  boundedFrame.handlers.pointerup({pointerId:43,clientX:10001,clientY:10001,preventDefault(){}});
  await v.flushNote();
  const bounded=v.noteData.image.placement;
  assert(bounded.x+bounded.width<=720.001 && bounded.y+bounded.height<=960.001);
  await assert.rejects(writer.saveCardNoteImagePlacement(card.id,{
    filename:fileName,placement:{x:-1,y:2,width:300,height:300}
  }),/Invalid note image position/);
  assert(![...storage.keys()].some(path=>path.startsWith('MarrowCards/media/')||
    path.startsWith('MarrowCards/packs/')||path.startsWith('MarrowCards/reviews/')),
    'Moving local note images should not edit source media, packs or review logs');
  assert(newCss.includes('.marrow-note-image-resize-handle'));
  assert(newCss.includes('.marrow-note-color-choice'));
  console.log('Pen palette, image drag/resize, bounds, legacy notes and saved geometry regressions passed.');
})().catch(err => {console.error(err);process.exitCode=1;});


// v0.2.7: the third per-index action lists only question statements and
// historical stats; full card details and review attempts must not leak.
(() => {
  const a = {id:'INDEX-OV-01',type:'pyq',status:'approved',indexIds:['IDX-A'],
    question:'Question about the first structure?',options:['SECRET_OPTION_ALPHA','SECRET_OPTION_BETA'],
    answer:'SECRET_ANSWER_ALPHA',explanation:'SECRET_EXPLANATION_ALPHA',
    images:['SECRET_IMAGE_ALPHA.png']};
  const b = {id:'INDEX-OV-02',type:'pyq',status:'approved',indexIds:['IDX-A'],
    question:'A second study question?',options:['SECRET_OPTION_GAMMA','SECRET_OPTION_DELTA'],
    answer:'SECRET_ANSWER_BETA',explanation:'SECRET_EXPLANATION_BETA',
    images:['SECRET_IMAGE_BETA.png']};
  const c = {id:'INDEX-OV-03',type:'fact',status:'approved',indexIds:['IDX-A'],
    question:'An unattempted recall question?',answer:'SECRET_ANSWER_GAMMA',images:[]};
  const d = {id:'INDEX-OV-04',type:'pyq',status:'approved',indexIds:['IDX-B'],
    question:'Question in another index?',options:['SECRET_OTHER_OPTION'],
    answer:'SECRET_OTHER_ANSWER',images:['SECRET_OTHER_IMAGE.png']};
  const stats = new Map([
    [a.id,{seen:3,right:2,wrong:0}],
    [b.id,{seen:6,right:1,wrong:3}],
    [d.id,{seen:9,right:9,wrong:0}]
  ]);
  let touchedReview = 0;
  const plugin = {cards:[a,b,c,d],
    indexes:[
      {id:'IDX-A',title:'Questions overview index',subject:'Demo',system:'Single topic'},
      {id:'IDX-B',title:'Separate index',subject:'Demo',system:'Single topic'},
      {id:'IDX-EMPTY',title:'Empty index',subject:'Demo',system:'Single topic'}
    ],stats,
    async recordEvent(){touchedReview++;throw new Error('Question overview must not log reviews');}
  };
  const v = new Reviewer(mockLeaf,plugin);
  v.screen='indexes';
  v.navSubject='Demo';
  v.draw();
  function walk(node,visit) {
    visit(node);
    for (const child of node.children) walk(child,visit);
  }
  function tileFor(label) {
    let result=null;
    walk(v.contentEl,node=>{
      if(node.cls.split(' ').includes('marrow-index-tile') && node.findText(' '+label)) result=node;
    });
    return result;
  }
  const tile=tileFor('Questions overview index');
  assert(tile,'Index tile should exist');
  const summary=tile.findClass('marrow-index-accuracy');
  assert(summary,'Cumulative index accuracy should be visible even when collapsed');
  assert.equal(summary.text,'Index accuracy: 50%  ·  Seen: 9  ·  Right: 3  ·  Wrong: 3',
    'Aggregate accuracy is attempt-weighted: (2+1) / (2+0+1+3), not mean of card percentages');
  const separate=tileFor('Separate index');
  assert.equal(separate.findClass('marrow-index-accuracy').text,
    'Index accuracy: 100%  ·  Seen: 9  ·  Right: 9  ·  Wrong: 0',
    'Other indexes must not be included in this index');
  const empty=tileFor('Empty index');
  assert.equal(empty.findClass('marrow-index-accuracy').text,
    'Index accuracy: —  ·  Seen: 0  ·  Right: 0  ·  Wrong: 0');
  assert.equal(empty.findText('Questions').disabled,true,
    'Empty indexes should not have a question preview');
  const controls = tile.children.filter(el=>el.props.tag==='button');
  assert.deepEqual(controls.map(c=>c.text), ['Review','Browse','Questions'],
    'Keep one-index review/browse while adding Questions as third action');
  const toggle=tile.findText('Questions');
  assert.equal(toggle.props.attr['aria-expanded'],'false');
  assert(tile.findClass('marrow-index-question-list').hidden, 'Preview should start collapsed');
  toggle.handlers.click();
  assert.equal(toggle.text,'Hide questions');
  assert.equal(toggle.props.attr['aria-expanded'],'true');
  const list=tile.findClass('marrow-index-question-list');
  assert.equal(list.hidden,false);
  for(const question of [a.question,b.question,c.question]) {
    assert(list.findText(question),'Question statement should appear in preview: '+question);
  }
  assert.equal(list.findClass('marrow-index-question-row').findClass('marrow-index-question-stats').text,
    'Accuracy: 100%  ·  Seen: 3  ·  Right: 2  ·  Wrong: 0');
  const rowStats=[];
  const forbidden=[];
  let imageElements=0;
  walk(list,node=>{
    if(node.cls.split(' ').includes('marrow-index-question-stats'))rowStats.push(node.text);
    if(node.props.tag==='img')imageElements++;
    if(/SECRET_|(INDEX-OV-0)/.test(node.text))forbidden.push(node.text);
  });
  assert.equal(rowStats.length,3,'One accuracy row per approved card');
  assert.deepEqual(rowStats, [
    'Accuracy: 100%  ·  Seen: 3  ·  Right: 2  ·  Wrong: 0',
    'Accuracy: 25%  ·  Seen: 6  ·  Right: 1  ·  Wrong: 3',
    'Accuracy: —  ·  Seen: 0  ·  Right: 0  ·  Wrong: 0'
  ]);
  assert.equal(forbidden.length,0,'Question overview must hide all answer, option, explanation and source IDs');
  assert.equal(imageElements,0,'Question overview must not render source images');
  assert.equal(touchedReview,0,'Viewing question list must never record Seen or grades');
  assert.equal(v.screen,'indexes','Preview must remain in the library, not enter Review/Browse');
  toggle.handlers.click();
  assert.equal(list.hidden,true,'Questions should collapse again');
  assert.equal(toggle.text,'Questions');
  assert.equal(list.children.length,0,'Closed previews should clear their question DOM');
  assert.equal(touchedReview,0);
  assert(v.contentEl.findText('Review selected indexes (0)'), 'Combined actions must stay available');
  assert(newCss.includes('.marrow-index-question-list'));
  assert(newCss.includes('.marrow-index-question-stats'));
  console.log('Index Questions third-action, hidden answer/media, cumulative accuracy and zero-grade checks passed.');
})();
