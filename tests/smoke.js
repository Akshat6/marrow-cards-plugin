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
    this.text = props.text || ''; this.cls = props.cls || '';
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
  window: { setInterval: () => 1 }
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

// Open medicine, select one index, then open Ophthalmology without leaving the page.
reviewer.contentEl.findText('▸  Medicine  ·  1 index').handlers.click();
assert.equal(reviewer.screen, 'subjects', 'Subject opens inline instead of navigating away');
assert.equal(reviewer.expandedSubject, 'Medicine', 'Medicine should be open');
assert(reviewer.contentEl.findText(' Approved medicine index'), 'Open subject should show its indexes');
let checkbox = findIndexCheckbox(reviewer.contentEl.findClass('marrow-accordion-body'));
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
checkbox = findIndexCheckbox(reviewer.contentEl.findClass('marrow-accordion-body'));
// There are multiple bodies; get the active (non-hidden) body for Ophthalmology.
const findActiveBody = node => {
  if (node.cls.split(' ').includes('marrow-accordion-body') && !node.hidden) return node;
  for (const child of node.children) { const f = findActiveBody(child); if (f) return f; }
  return null;
};
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
