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
assert(src.includes("this.goLibrary('indexes')"), 'Missing index navigation');
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


// Approved-card-only browser filter: empty indexes and subjects are hidden,
// while existing selections and full-list visibility remain intact.
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
reviewer.selected = new Set(['OPH-04', 'MED-01']);
reviewer.draw();
assert(reviewer.contentEl.findText('ENT  ·  1 index'), 'All-subjects mode should show subjects without cards');
let availability = reviewer.contentEl.findClass('marrow-availability-label');
assert(availability, 'Approved-only toggle must be shown on subjects page');
let toggle = availability.children.find(child => child.props.tag === 'input');
assert(toggle && toggle.checked === false, 'Filter must start off');
toggle.checked = true;
toggle.handlers.change();
assert.equal(reviewer.onlyApprovedIndexes, true, 'Toggle state should turn on');
assert(!reviewer.contentEl.findText('ENT  ·  1 index'), 'Empty subjects must be hidden when filter is on');
assert(reviewer.contentEl.findText('Ophthalmology  ·  1 index'), 'Subject count should reflect visible approved indexes');
assert(reviewer.contentEl.findText('Medicine  ·  1 index'), 'Other approved subjects must stay visible');
reviewer.screen = 'indexes';
reviewer.navSubject = 'Ophthalmology';
reviewer.draw();
assert(reviewer.contentEl.findText(' Anatomy of Retina'), 'Approved index not displayed');
assert(!reviewer.contentEl.findText(' Unapproved eye index'), 'Unapproved index must be hidden');
assert.equal(reviewer.selected.size, 2, 'Filtering must not discard index selections');
availability = reviewer.contentEl.findClass('marrow-availability-label');
toggle = availability.children.find(child => child.props.tag === 'input');
assert(toggle && toggle.checked === true, 'Filter must remain on between screens');
toggle.checked = false;
toggle.handlers.change();
assert(reviewer.contentEl.findText(' Unapproved eye index'), 'Turn filter off to restore full index list');
assert.equal(reviewer.selected.size, 2, 'Turning off filter must preserve selected indexes');
assert(newCss.includes('.marrow-availability-label'), 'Touch-friendly toggle styles missing');
console.log('Approved-index visibility filter checks passed.');
