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
