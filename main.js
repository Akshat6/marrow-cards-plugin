'use strict';

const { Plugin, ItemView, Notice, PluginSettingTab, Setting, requestUrl, base64ToArrayBuffer, normalizePath } = require('obsidian');

const VIEW_TYPE = 'marrow-cards-reviewer';
const ROOT = 'MarrowCards';
const PACKS = ROOT + '/packs';
const MEDIA = ROOT + '/media';
const REVIEWS = ROOT + '/reviews';
const NOTES = ROOT + '/notes';
const TOKEN_KEY = 'marrow-cards-github-token';
const REPO = 'Akshat6/marrow-cards-data';
const ALLOWED_IMAGE = /\.(png|jpe?g|webp|gif)$/i;

function safeId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value); }
function safePath(value) {
  return typeof value === 'string' && value.length < 240 && !value.startsWith('/') &&
    !value.split('/').some((s) => !s || s === '.' || s === '..') && /^[A-Za-z0-9_./-]+$/.test(value);
}
function uniqueId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}
function getQuestion(card) { return card.question || card.front || ''; }
function isCard(card) {
  return card && safeId(card.id) && ['pyq', 'fact'].includes(card.type) &&
    typeof getQuestion(card) === 'string' && getQuestion(card).trim().length > 0 &&
    typeof card.answer === 'string' && card.answer.trim().length > 0 &&
    Array.isArray(card.indexIds) && card.indexIds.length > 0 && card.indexIds.every(safeId) &&
    (!card.options || (Array.isArray(card.options) && card.options.every((s) => typeof s === 'string'))) &&
    (!card.images || (Array.isArray(card.images) && card.images.every((s) => typeof s === 'string' && safePath(s) && !s.includes('/')))) &&
    (!card.explanation || typeof card.explanation === 'string') && card.status === 'approved';
}
function validatePack(pack) {
  if (!pack || pack.schemaVersion !== 1 || !safeId(pack.packId) ||
      typeof pack.version !== 'string' || !Array.isArray(pack.indexes) || !Array.isArray(pack.cards)) {
    throw new Error('Invalid card pack header. Required: schemaVersion, packId, version, indexes, cards.');
  }
  const ids = new Set();
  const indexIds = new Set();
  for (const idx of pack.indexes) {
    if (!idx || !safeId(idx.id) || typeof idx.title !== 'string') throw new Error('Invalid index in ' + pack.packId);
    if (indexIds.has(idx.id)) throw new Error('Duplicate index ID: ' + idx.id);
    indexIds.add(idx.id);
  }
  for (const card of pack.cards) {
    if (!isCard(card)) throw new Error('Unapproved or malformed card in ' + pack.packId);
    if (ids.has(card.id)) throw new Error('Duplicate card ID: ' + card.id);
    for (const id of card.indexIds) if (!indexIds.has(id)) throw new Error('Unknown index ' + id + ' in ' + card.id);
    ids.add(card.id);
  }
  return pack;
}


function optionBody(value) {
  return String(value).trim().replace(/^[A-Ha-h][).: -]+/, '').trim();
}
function correctOptionIndex(card) {
  const options = card.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > 8) return -1;
  const answer = String(card.answer || '').trim();
  if (/^[A-Ha-h]$/.test(answer)) {
    const index = answer.toUpperCase().charCodeAt(0) - 65;
    return index < options.length ? index : -1;
  }
  const match = answer.match(/^([A-Ha-h])[).: -]+(.*)$/s);
  if (match) {
    const idx = match[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= options.length) return -1;
    const body = optionBody(options[idx]).toLowerCase().replace(/\\s+/g, ' ');
    const detail = match[2].trim().toLowerCase().replace(/\\s+/g, ' ');
    if (!detail || detail === body || detail.startsWith(body + ' -') ||
        detail.startsWith(body + ' (') || detail.startsWith(body + ':')) return idx;
    return -1;
  }
  const matches = options.map((option, index) =>
    optionBody(option).toLowerCase() === answer.toLowerCase() ? index : -1
  ).filter(index => index >= 0);
  return matches.length === 1 ? matches[0] : -1;
}
function optionLetter(index) { return String.fromCharCode(65 + index); } // A, B, C, D

function canShuffleCard(card, correct) {
  if (correct < 0 || !Array.isArray(card.options) || card.options.length < 2) return false;
  const labels = card.options.map(optionBody);
  // A deliberately conservative opt-out for positional and referential MCQs.
  if (labels.some(value => {
    const x = value.toLowerCase();
    return /^[a-h]$/i.test(value) || /^[0-9, -]+$/.test(value) ||
      x.includes('all of the above') || x.includes('none of the above') ||
      x.includes('both of the above') || x.includes('either of the above') ||
      x.includes('option a') || x.includes('option b') ||
      x.includes('option c') || x.includes('option d') ||
      x.includes('both a') || x.includes('both b') || x.includes('a and b') ||
      x.includes('a or b') || x.includes('all of') || x.includes('none of') ||
      /^[a-d] +(and|or) +[a-d]$/i.test(value);
  })) return false;
  const prompt = String(getQuestion(card) || '').toLowerCase();
  if (prompt.includes('option a') || prompt.includes('option b') ||
      prompt.includes('option c') || prompt.includes('option d')) return false;
  const explanation = String(card.explanation || '').toLowerCase();
  if (explanation.includes('printed answer') || explanation.includes('original answer') ||
      explanation.includes('source answer') || explanation.includes('option a') ||
      explanation.includes('option b') || explanation.includes('option c') ||
      explanation.includes('option d')) return false;
  return true;
}
function shuffleChoiceIndices(count, random = Math.random) {
  const result = Array.from({length: count}, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (count > 1 && result.every((index, i) => index === i)) result.push(result.shift());
  return result;
}

function compareVersions(a, b) {
  const parse = s => String(s || '0.0.0').split('.').slice(0,3).map(x => Number(x) || 0);
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function tally(events) {
  const result = new Map();
  const eventIds = new Set();
  for (const event of events) {
    if (!event || typeof event.id !== 'string' || eventIds.has(event.id) || !safeId(event.cardId)) continue;
    eventIds.add(event.id);
    const stats = result.get(event.cardId) || { seen: 0, right: 0, wrong: 0, last: '' };
    if (event.action === 'seen') stats.seen += 1;
    if (event.action === 'right') stats.right += 1;
    if (event.action === 'wrong') stats.wrong += 1;
    if (['right', 'wrong'].includes(event.action) && typeof event.at === 'string' && event.at > stats.last) stats.last = event.at;
    result.set(event.cardId, stats);
  }
  return result;
}


class MarrowCardsPlugin extends Plugin {
  onload() {
    this.settings = { deviceId: uniqueId(), autoSync: true };
    this.cards = [];
    this.indexes = [];
    this.stats = new Map();
    this.writeQueue = Promise.resolve();
    this.noteWriteQueue = Promise.resolve();
    this.syncing = false;

    // Register the plugin with Obsidian before touching the vault.
    this.registerView(VIEW_TYPE, (leaf) => new MarrowCardsView(leaf, this));
    this.addRibbonIcon('layers', 'Open Marrow Cards', () => this.activateView());
    this.addCommand({ id: 'open-marrow-cards', name: 'Open reviewer', callback: () => this.activateView() });
    this.addCommand({ id: 'sync-marrow-card-packs', name: 'Check for approved card packs', callback: () => this.syncPacks() });
    this.addSettingTab(new MarrowSettingsTab(this.app, this));

    this.initPromise = this.initializeRuntime();
    this.registerInterval(window.setInterval(() => {
      if (this.settings.autoSync && this.app.secretStorage?.getSecret?.(TOKEN_KEY)) void this.syncPacks(true);
    }, 30 * 60 * 1000));
    this.app.workspace.onLayoutReady(() => {
      void this.initPromise.then(() => {
        if (this.settings.autoSync && this.app.secretStorage?.getSecret?.(TOKEN_KEY)) void this.syncPacks(true);
      });
    });
  }

  async initializeRuntime() {
    try {
      const saved = await this.loadData();
      this.settings = Object.assign(this.settings, saved || {});
      if (!safeId(this.settings.deviceId)) {
        this.settings.deviceId = uniqueId().replace(/[^A-Za-z0-9_-]/g, '');
      }
      if (!saved || !safeId(saved.deviceId)) await this.saveData(this.settings);
      await this.ensureDirectories();
    } catch (error) {
      console.error('[Marrow Cards] Startup file initialization failed', error);
      new Notice('Marrow Cards: could not initialize local files. Plugin remains enabled.');
    }
  }

  onunload() { this.app.workspace.detachLeavesOfType(VIEW_TYPE); }
  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async ensureFolder(path) {
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const segment = normalizePath(parts.slice(0, i).join('/'));
      if (!(await this.app.vault.adapter.exists(segment))) await this.app.vault.createFolder(segment);
    }
  }
  async ensureDirectories() {
    for (const path of [PACKS, MEDIA, REVIEWS, REVIEWS + '/' + this.settings.deviceId, NOTES]) await this.ensureFolder(path);
  }
  async writeJson(path, data) {
    const content = JSON.stringify(data, null, 2) + '\n';
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) await this.app.vault.modify(file, content);
    else await this.app.vault.create(path, content);
  }
  // Notes are user-authored local data, intentionally not in GitHub packs.
  // Split text and ink so a phone text edit and tablet pen edit normally touch
  // different files. Sync these files via the existing Syncthing vault.
  async readCardNote(cardId) {
    if (!safeId(cardId)) throw new Error('Invalid note card ID');
    if (this.initPromise) await this.initPromise;
    const directory = NOTES + '/' + cardId;
    const loadPart = async (file, kind) => {
      const path = directory + '/' + file;
      const found = this.app.vault.getAbstractFileByPath(path);
      if (!found) return kind === 'ink' ? [] : '';
      const parsed = JSON.parse(await this.app.vault.read(found));
      if (parsed.schemaVersion !== 1 || parsed.cardId !== cardId) throw new Error('Unexpected note format: ' + path);
      if (kind === 'ink') {
        if (!Array.isArray(parsed.strokes)) throw new Error('Invalid saved pen strokes: ' + path);
        return parsed.strokes.filter(stroke => stroke && Array.isArray(stroke.points));
      }
      if (typeof parsed.text !== 'string') throw new Error('Invalid typed note: ' + path);
      return parsed.text;
    };
    return { cardId, text: await loadPart('text.json', 'text'), strokes: await loadPart('ink.json', 'ink') };
  }
  async saveCardNotePart(cardId, part, value) {
    if (!safeId(cardId) || !['text', 'ink'].includes(part)) throw new Error('Invalid note save');
    const path = NOTES + '/' + cardId + '/' + part + '.json';
    const payload = part === 'text'
      ? { schemaVersion: 1, cardId, text: String(value).slice(0, 100000) }
      : { schemaVersion: 1, cardId, strokes: value };
    const operation = async () => {
      await this.ensureFolder(NOTES + '/' + cardId);
      await this.writeJson(path, payload);
    };
    this.noteWriteQueue = this.noteWriteQueue.catch(() => {}).then(operation);
    return this.noteWriteQueue;
  }

  async loadCollection() {
    if (this.initPromise) await this.initPromise;
    const cards = new Map();
    const indexes = new Map();
    const files = this.app.vault.getFiles().filter((f) => f.path.startsWith(PACKS + '/') && f.extension === 'json');
    for (const file of files) {
      try {
        const pack = validatePack(JSON.parse(await this.app.vault.read(file)));
        for (const card of pack.cards) if (cards.has(card.id)) throw new Error('Duplicate card ID across packs: ' + card.id);
        for (const item of pack.indexes) indexes.set(item.id, item);
        for (const card of pack.cards) cards.set(card.id, card);
      } catch (err) { console.error('[Marrow Cards] skipped pack', file.path, err); new Notice('Invalid pack: ' + file.name); }
    }
    this.cards = [...cards.values()].sort((a, b) => a.id.localeCompare(b.id));
    this.indexes = [...indexes.values()].sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || a.title.localeCompare(b.title));
    await this.loadStats();
  }
  async loadStats() {
    const events = [];
    const files = this.app.vault.getFiles().filter((f) => f.path.startsWith(REVIEWS + '/') && f.extension === 'jsonl');
    for (const file of files) {
      const text = await this.app.vault.read(file);
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try { events.push(JSON.parse(line)); } catch (err) { console.warn('[Marrow Cards] malformed event line', file.path, err); }
      }
    }
    this.stats = tally(events);
  }
  async recordEvent(cardId, action) {
    if (!['seen', 'right', 'wrong'].includes(action) || !safeId(cardId)) throw new Error('Invalid review event');
    const event = { id: uniqueId(), cardId, action, at: new Date().toISOString(), deviceId: this.settings.deviceId };
    const month = event.at.slice(0, 7);
    const path = REVIEWS + '/' + this.settings.deviceId + '/' + month + '.jsonl';
    const save = async () => {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file) await this.app.vault.modify(file, (await this.app.vault.read(file)) + JSON.stringify(event) + '\n');
      else await this.app.vault.create(path, JSON.stringify(event) + '\n');
      const stats = this.stats.get(cardId) || { seen: 0, right: 0, wrong: 0, last: '' };
      if (action === 'seen') stats.seen += 1;
      if (action === 'right') stats.right += 1;
      if (action === 'wrong') stats.wrong += 1;
      if (action !== 'seen') stats.last = event.at;
      this.stats.set(cardId, stats);
    };
    this.writeQueue = this.writeQueue.catch(() => {}).then(save);
    return this.writeQueue;
  }

  async importLocalBundle(file) {
    if (!file || typeof file.text !== 'function') throw new Error('Select a Marrow Cards .json bundle.');
    if (file.size > 40 * 1024 * 1024) throw new Error('The selected bundle is too large (40 MB limit).');
    const data = JSON.parse(await file.text());
    if (!data || data.format !== 'marrow-cards-bundle' || data.schemaVersion !== 1) throw new Error('Not a supported Marrow Cards bundle.');
    const pack = validatePack(data.pack);
    if (!Array.isArray(data.media)) throw new Error('Bundle has no media list.');
    const supplied = new Map();
    const decoded = new Map();
    for (const item of data.media) {
      if (!item || !safePath(item.filename) || item.filename.includes('/') || !ALLOWED_IMAGE.test(item.filename) ||
          typeof item.dataBase64 !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(item.dataBase64) ||
          typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) || supplied.has(item.filename)) {
        throw new Error('Invalid media entry in bundle.');
      }
      const binary = base64ToArrayBuffer(item.dataBase64.replace(/\s/g, ''));
      if (binary.byteLength < 10 || binary.byteLength > 15 * 1024 * 1024) throw new Error('Invalid image byte length: ' + item.filename);
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', binary))).map(b => b.toString(16).padStart(2, '0')).join('');
      if (sha !== item.sha256) throw new Error('Image checksum mismatch: ' + item.filename);
      supplied.set(item.filename, true);
      decoded.set(item.filename, binary);
    }
    const used = new Set(pack.cards.flatMap(c => c.images || []));
    for (const image of used) if (!supplied.has(image)) throw new Error('Image missing from bundle: ' + image);
    for (const image of supplied.keys()) if (!used.has(image)) throw new Error('Unused image: ' + image);
    const path = PACKS + '/' + pack.packId + '.json';
    const existingFile = this.app.vault.getAbstractFileByPath(path);
    if (existingFile) {
      const existing = validatePack(JSON.parse(await this.app.vault.read(existingFile)));
      if (compareVersions(pack.version, existing.version) < 0) throw new Error('Cannot replace a newer installed pack with an older bundle.');
    }
    for (const f of this.app.vault.getFiles().filter(x => x.path.startsWith(PACKS + '/') && x.path !== path && x.extension === 'json')) {
      const other = validatePack(JSON.parse(await this.app.vault.read(f)));
      const ids = new Set(other.cards.map(c => c.id));
      for (const c of pack.cards) if (ids.has(c.id)) throw new Error('Card ID already belongs to another pack: ' + c.id);
    }
    await this.ensureDirectories();
    for (const [name, binary] of decoded) {
      const mediaPath = MEDIA + '/' + name;
      const file = this.app.vault.getAbstractFileByPath(mediaPath);
      if (file) {
        const old = await this.app.vault.readBinary(file);
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', old))).map(b => b.toString(16).padStart(2, '0')).join('');
        const expected = data.media.find(m => m.filename === name).sha256;
        if (hash !== expected) throw new Error('A different image already exists with this filename: ' + name);
      } else await this.app.vault.createBinary(mediaPath, binary);
    }
    await this.writeJson(path, pack);
    await this.refreshOpenViews();
    new Notice('Imported ' + pack.cards.length + ' approved card(s) with ' + supplied.size + ' original image(s).');
  }
  chooseLocalBundle() {
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = '.json,application/json'; picker.style.display = 'none';
    document.body.appendChild(picker);
    picker.addEventListener('change', async () => {
      try { if (picker.files && picker.files[0]) await this.importLocalBundle(picker.files[0]); }
      catch (err) { console.error('[Marrow Cards] import failed', err); new Notice('Import failed: ' + (err.message || String(err)), 9000); }
      finally { picker.remove(); }
    }, { once: true });
    picker.click();
  }

  async refreshOpenViews() {
    await this.loadCollection();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) await leaf.view.refresh();
  }
  async fetchGithub(path, asBinary = false) {
    if (!safePath(path)) throw new Error('Unsafe GitHub file path: ' + path);
    const token = this.app.secretStorage.getSecret(TOKEN_KEY);
    if (!token) throw new Error('Add a read-only GitHub token in Marrow Cards settings on this device.');
    const url = 'https://api.github.com/repos/' + REPO + '/contents/' + path;
    const response = await requestUrl({
      url, method: 'GET', throw: false,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (response.status !== 200) throw new Error('GitHub returned HTTP ' + response.status + ' for ' + path);
    const data = response.json;
    if (!data || data.encoding !== 'base64' || !data.content) throw new Error('Unsupported GitHub content size/encoding: ' + path);
    const decoded = base64ToArrayBuffer(data.content.replace(/\s/g, ''));
    return asBinary ? decoded : new TextDecoder().decode(decoded);
  }
  async syncPacks(silent = false) {
    if (this.initPromise) await this.initPromise;
    if (this.syncing) return;
    this.syncing = true;
    try {
      await this.ensureDirectories();
      const manifest = JSON.parse(await this.fetchGithub('manifest.json'));
      if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.packs)) throw new Error('Bad data repository manifest');
      let downloaded = 0;
      for (const info of manifest.packs) {
        if (!info || !safeId(info.id) || !safePath(info.path) || typeof info.version !== 'string' ||
            !info.path.startsWith('packs/')) throw new Error('Unsafe pack manifest entry');
        const dest = PACKS + '/' + info.id + '.json';
        const existingFile = this.app.vault.getAbstractFileByPath(dest);
        if (existingFile) {
          try { const existing = JSON.parse(await this.app.vault.read(existingFile));
            if (compareVersions(existing.version, info.version) >= 0) continue;
          } catch (e) { /* overwrite malformed local pack only after successful remote validation */ }
        }
        const pack = validatePack(JSON.parse(await this.fetchGithub(info.path)));
        if (pack.packId !== info.id || pack.version !== info.version) throw new Error('Pack ID/version mismatch: ' + info.id);
        const otherIds = new Set();
        for (const file of this.app.vault.getFiles().filter((f) => f.path.startsWith(PACKS + '/') && f.path !== dest && f.extension === 'json')) {
          const otherPack = validatePack(JSON.parse(await this.app.vault.read(file)));
          for (const other of otherPack.cards) otherIds.add(other.id);
        }
        for (const card of pack.cards) if (otherIds.has(card.id)) throw new Error('Duplicate card ID across packs: ' + card.id);
        for (const card of pack.cards) {
          for (const filename of card.images || []) {
            if (!safePath(filename) || filename.includes('/') || !ALLOWED_IMAGE.test(filename)) throw new Error('Unsafe image filename: ' + filename);
            const local = MEDIA + '/' + filename;
            if (!(await this.app.vault.adapter.exists(local))) {
              const binary = await this.fetchGithub('media/' + filename, true);
              await this.app.vault.createBinary(local, binary);
            }
          }
        }
        await this.writeJson(dest, pack);
        downloaded += 1;
      }
      await this.refreshOpenViews();
      if (!silent || downloaded) new Notice(downloaded ? downloaded + ' card pack(s) installed or updated.' : 'Card packs are already up to date.');
    } catch (error) {
      console.error('[Marrow Cards] download failed', error);
      if (!silent) new Notice('Card update failed: ' + (error.message || String(error)));
    } finally { this.syncing = false; }
  }
}

class MarrowCardsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf); this.plugin = plugin; this.selected = new Set(); this.mode = 'all'; this.cursor = 0; this.flipped = false; this.busy = false; this.queue = []; this.screen = 'mbbs'; this.navSubject = ''; this.expandedSubject = ''; this.expandedSystem = ''; this.onlyApprovedIndexes = false; this.sessionKind = 'review'; this.notesOpen = false; this.noteData = null; this.noteTimer = null; this.noteRevision = 0; this.optionOrder = []; this.correctIndex = -1; this.answerState = null;
  }
  getViewType() { return VIEW_TYPE; }
  async onClose() { try { await this.flushNote(); } catch (error) { /* notice already shown */ } }
  getDisplayText() { return 'Marrow Cards'; }
  getIcon() { return 'layers'; }
  async onOpen() { await this.refresh(); }
  async refresh() {
    await this.plugin.loadCollection();
    this.selected = new Set([...this.selected].filter((id) => this.plugin.indexes.some((idx) => idx.id === id)));
    if (this.screen === 'review') {
      try { await this.flushNote(); } catch (error) { return; }
      this.notesOpen = false;
      this.noteData = null;
      await this.resetQueue();
    }
    else this.draw();
  }
  async startReview(indexIds) {
    await this.startSession(indexIds, 'review');
  }
  async startBrowse(indexIds) {
    await this.startSession(indexIds, 'browse');
  }
  async startSession(indexIds, kind) {
    await this.flushNote();
    this.selected = new Set(indexIds);
    this.screen = 'review';
    this.sessionKind = kind;
    this.mode = 'all';
    this.notesOpen = false;
    this.noteData = null;
    await this.resetQueue();
  }
  async goLibrary(level = 'mbbs') {
    try { await this.flushNote(); } catch (error) { return; }
    this.noteRevision += 1;
    this.notesOpen = false;
    this.noteData = null;
    this.screen = level;
    this.flipped = false;
    this.draw();
  }
  countForIndex(indexId) {
    return this.plugin.cards.reduce((n, card) => n + (card.indexIds.includes(indexId) ? 1 : 0), 0);
  }
  // Shared index tiles for the accordion (and the legacy index view).
  // Selection updates the review buttons in place to avoid scroll jumps.
  drawIndexChoices(container, indexes, onSelectionChange, showHeadings = true) {
    const grouped = new Map();
    for (const idx of indexes) {
      const system = showHeadings ? (idx.system || 'Indexes') : '';
      if (!grouped.has(system)) grouped.set(system, []);
      grouped.get(system).push(idx);
    }
    for (const [system, group] of grouped.entries()) {
      if (showHeadings) container.createEl('h4', { cls: 'marrow-system', text: system });
      for (const idx of group) {
        const count = this.countForIndex(idx.id);
        const tile = container.createDiv({ cls: 'marrow-index-tile' });
        const label = tile.createEl('label', { cls: 'marrow-index-name' });
        const checkbox = label.createEl('input', {
          type: 'checkbox', attr: { 'aria-label': 'Select ' + idx.title }
        });
        checkbox.checked = this.selected.has(idx.id);
        checkbox.disabled = count === 0;
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) this.selected.add(idx.id);
          else this.selected.delete(idx.id);
          onSelectionChange();
        });
        label.createSpan({ text: ' ' + idx.title });
        tile.createEl('span', { cls: 'marrow-count',
          text: count ? count + (count === 1 ? ' approved card' : ' approved cards') : 'Awaiting approved cards' });
        const practice = tile.createEl('button', { text: 'Review', cls: 'marrow-start-single' });
        practice.disabled = count === 0;
        practice.addEventListener('click', () => this.startReview([idx.id]));
        const browse = tile.createEl('button', { text: 'Browse', cls: 'marrow-start-single marrow-start-browse' });
        browse.disabled = count === 0;
        browse.addEventListener('click', () => this.startBrowse([idx.id]));
      }
    }
  }
  drawHierarchy(el) {
    const header = el.createDiv({ cls: 'marrow-header' });
    header.createEl('h2', { text: 'MBBS Flashcards' });
    const toolbar = header.createDiv({ cls: 'marrow-toolbar' });
    const importButton = toolbar.createEl('button', { text: 'Import approved bundle' });
    importButton.addEventListener('click', () => this.plugin.chooseLocalBundle());
    const refresh = toolbar.createEl('button', { text: 'Refresh local' });
    refresh.addEventListener('click', () => this.refresh());
    const sync = toolbar.createEl('button', { text: 'Check GitHub' });
    sync.addEventListener('click', () => this.plugin.syncPacks());
    const crumbs = el.createDiv({ cls: 'marrow-breadcrumb' });
    const home = crumbs.createEl('button', { text: 'MBBS', cls: 'marrow-crumb' });
    home.addEventListener('click', () => this.goLibrary('mbbs'));
    if (this.screen === 'indexes') {
      crumbs.createSpan({ text: ' / ' });
      const subject = crumbs.createEl('button', { text: this.navSubject, cls: 'marrow-crumb' });
      subject.addEventListener('click', () => this.goLibrary('subjects'));
    }
    const all = this.plugin.indexes;
    // Active packs are validated before loading, so every card in this array
    // is approved. Build a set once to avoid scanning the card list per index.
    const approvedIndexIds = new Set(this.plugin.cards.flatMap(card => card.indexIds));
    const visibleIndexes = this.onlyApprovedIndexes
      ? all.filter(index => approvedIndexIds.has(index.id))
      : all;
    const subjects = [...new Set(visibleIndexes.map(i => i.subject || 'Other'))].sort((a,b) => a.localeCompare(b));

    if (this.screen === 'subjects' || this.screen === 'indexes') {
      const filter = el.createDiv({ cls: 'marrow-availability-filter' });
      const filterLabel = filter.createEl('label', { cls: 'marrow-availability-label' });
      const toggle = filterLabel.createEl('input', {
        type: 'checkbox',
        attr: { 'aria-label': 'Show only indexes with approved cards' }
      });
      toggle.checked = this.onlyApprovedIndexes;
      toggle.addEventListener('change', () => {
        this.onlyApprovedIndexes = toggle.checked;
        this.draw();
      });
      filterLabel.createSpan({ text: ' Show only indexes with approved cards' });
    }
    if (this.screen === 'mbbs') {
      el.createEl('p', { cls: 'marrow-hint', text: 'Choose MBBS to browse subjects and then your approved index decks.' });
      const btn = el.createEl('button', { cls: 'marrow-tree-tile', text: 'MBBS  ·  ' + subjects.length + ' subjects' });
      btn.addEventListener('click', () => this.goLibrary('subjects'));
      return;
    }
    if (this.screen === 'subjects') {
      el.createEl('h3', { text: 'Subjects' });
      el.createEl('p', { cls: 'marrow-hint',
        text: 'Open a subject, expand a subheading to choose indexes, then open another subject. Your selections stay selected.' });
      if (!subjects.length) {
        el.createEl('p', { cls: 'marrow-hint', text: this.onlyApprovedIndexes
          ? 'No indexes with approved cards yet. Turn off the filter to browse all subjects.'
          : 'No index catalog has been installed yet. Tap Check GitHub after configuring your private data token.' });
      }

      // A different filter can remove the previously open subject.
      if (!subjects.includes(this.expandedSubject)) this.expandedSubject = '';
      const subjectIndexes = new Map(subjects.map(name => [
        name, visibleIndexes.filter(i => (i.subject || 'Other') === name)
      ]));
      const availableSelected = () => [...this.selected].filter(id => approvedIndexIds.has(id));
      const actionButtons = [];
      const updateActions = () => {
        const picked = availableSelected();
        for (const entry of actionButtons) {
          entry.button.setText((entry.kind === 'browse' ? 'Browse' : 'Review') + ' selected indexes (' + picked.length + ')');
          entry.button.disabled = !picked.length;
        }
      };
      const addReviewAction = (container, position, kind = 'review') => {
        const btn = container.createEl('button', {
          cls: (kind === 'browse' ? 'marrow-start-browse-selected ' : 'mod-cta ') +
            'marrow-start-selected marrow-start-selected-' + position,
          text: (kind === 'browse' ? 'Browse' : 'Review') + ' selected indexes (0)'
        });
        btn.addEventListener('click', () => {
          const picked = availableSelected();
          if (picked.length) void (kind === 'browse' ? this.startBrowse(picked) : this.startReview(picked));
        });
        actionButtons.push({ button: btn, kind });
        return btn;
      };
      const addSelectionActions = position => {
        const group = el.createDiv({ cls: 'marrow-selection-actions marrow-selection-actions-' + position });
        addReviewAction(group, position, 'review');
        addReviewAction(group, position, 'browse');
      };
      addSelectionActions('top');

      const sectionNodes = new Map();
      const labelFor = name => {
        const indexes = subjectIndexes.get(name);
        const selectedCount = indexes.filter(idx => this.selected.has(idx.id)).length;
        return (this.expandedSubject === name ? '▾  ' : '▸  ') + name + '  ·  ' +
          indexes.length + (indexes.length === 1 ? ' index' : ' indexes') +
          (selectedCount ? '  ·  ' + selectedCount + ' selected' : '');
      };
      const updateSubjectLabels = () => {
        for (const [name, nodes] of sectionNodes) nodes.button.setText(labelFor(name));
        updateActions();
      };
      // Multi-system subjects get their own second-level accordion:
      // subject → system/subheading → index. A single-system subject
      // displays its indexes directly to avoid an unnecessary extra tap.
      const drawSubjectBody = (name, body) => {
        const groups = new Map();
        for (const idx of subjectIndexes.get(name)) {
          const key = idx.system || 'Indexes';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(idx);
        }
        if (groups.size <= 1) {
          this.drawIndexChoices(body, subjectIndexes.get(name), updateSubjectLabels);
          return;
        }
        if (!groups.has(this.expandedSystem)) this.expandedSystem = '';
        const systemNodes = new Map();
        const systemLabelFor = system => {
          const indexes = groups.get(system);
          const selectedCount = indexes.filter(idx => this.selected.has(idx.id)).length;
          return (this.expandedSystem === system ? '▾  ' : '▸  ') + system + '  ·  ' +
            indexes.length + (indexes.length === 1 ? ' index' : ' indexes') +
            (selectedCount ? '  ·  ' + selectedCount + ' selected' : '');
        };
        const updateSystemLabels = () => {
          for (const [system, nodes] of systemNodes) nodes.button.setText(systemLabelFor(system));
          updateSubjectLabels();
        };
        for (const [system, indexes] of groups) {
          const section = body.createDiv({ cls: 'marrow-system-section' });
          const open = this.expandedSystem === system;
          const button = section.createEl('button', {
            cls: 'marrow-system-toggle',
            text: systemLabelFor(system),
            attr: { 'aria-expanded': String(open) }
          });
          const content = section.createDiv({ cls: 'marrow-system-body' });
          content.hidden = !open;
          systemNodes.set(system, { button, content });
          if (open) this.drawIndexChoices(content, indexes, updateSystemLabels, false);
          button.addEventListener('click', () => {
            const prior = this.expandedSystem;
            if (prior && systemNodes.has(prior)) {
              const old = systemNodes.get(prior);
              old.content.empty();
              old.content.hidden = true;
              old.button.setAttribute('aria-expanded', 'false');
            }
            this.expandedSystem = prior === system ? '' : system;
            if (this.expandedSystem) {
              content.hidden = false;
              this.drawIndexChoices(content, indexes, updateSystemLabels, false);
              button.setAttribute('aria-expanded', 'true');
            }
            updateSystemLabels();
          });
        }
      };

      const list = el.createDiv({ cls: 'marrow-subject-accordion' });
      for (const name of subjects) {
        const section = list.createDiv({ cls: 'marrow-subject-section' });
        const open = this.expandedSubject === name;
        const button = section.createEl('button', {
          cls: 'marrow-tree-tile marrow-subject-toggle',
          text: labelFor(name), attr: { 'aria-expanded': String(open) }
        });
        const body = section.createDiv({ cls: 'marrow-accordion-body' });
        body.hidden = !open;
        sectionNodes.set(name, { button, body });
        if (open) drawSubjectBody(name, body);

        button.addEventListener('click', () => {
          const prior = this.expandedSubject;
          if (prior && sectionNodes.has(prior)) {
            const old = sectionNodes.get(prior);
            old.body.empty();
            old.body.hidden = true;
            old.button.setAttribute('aria-expanded', 'false');
          }
          this.expandedSubject = prior === name ? '' : name;
          this.expandedSystem = '';
          if (this.expandedSubject) {
            body.hidden = false;
            drawSubjectBody(name, body);
            button.setAttribute('aria-expanded', 'true');
          }
          updateSubjectLabels();
        });
      }
      addSelectionActions('bottom');
      updateActions();
      el.createEl('p', { cls: 'marrow-hint', text: this.onlyApprovedIndexes
        ? 'Only indexes with approved cards are shown. Other selected indexes stay selected.'
        : 'Indexes without approved cards are shown but cannot be selected for review.' });
      return;
    }
    // Backward-compatible legacy route; normal browsing now uses the accordion.
    if (this.screen === 'indexes') {
      el.createEl('h3', { text: this.navSubject });
      const matching = visibleIndexes.filter(i => (i.subject || 'Other') === this.navSubject);
      if (!matching.length && this.onlyApprovedIndexes) {
        el.createEl('p', { cls: 'marrow-hint',
          text: 'No indexes with approved cards in this subject. Turn off the filter to see all indexes.' });
      }
      this.drawIndexChoices(el, matching, () => this.draw());
      const picked = [...this.selected].filter(id => approvedIndexIds.has(id));
      const combined = el.createEl('button', {
        cls: 'mod-cta marrow-start-selected',
        text: 'Review selected indexes (' + picked.length + ')'
      });
      combined.disabled = !picked.length;
      combined.addEventListener('click', () => this.startReview(picked));
      const browse = el.createEl('button', {
        cls: 'marrow-start-selected marrow-start-browse-selected',
        text: 'Browse selected indexes (' + picked.length + ')'
      });
      browse.disabled = !picked.length;
      browse.addEventListener('click', () => this.startBrowse(picked));
      el.createEl('p', { cls: 'marrow-hint',
        text: 'Return to Subjects for the collapsible multi-subject index selector.' });
    }
  }
  // A note is local to the card ID, not to a changing GitHub pack version.
  // Text and vector ink have independent files for Syncthing.
  scheduleNoteSave() {
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => {
      this.noteTimer = null;
      void this.flushNote().catch(() => {});
    }, 650);
  }
  async flushNote() {
    if (this.noteTimer) { clearTimeout(this.noteTimer); this.noteTimer = null; }
    const note = this.noteData;
    if (!note) return;
    try {
      if (note.dirtyText) {
        const snapshot = note.text;
        await this.plugin.saveCardNotePart(note.cardId, 'text', snapshot);
        if (note.text === snapshot) note.dirtyText = false;
      }
      if (note.dirtyInk) {
        const snapshot = JSON.parse(JSON.stringify(note.strokes));
        await this.plugin.saveCardNotePart(note.cardId, 'ink', snapshot);
        if (JSON.stringify(note.strokes) === JSON.stringify(snapshot)) note.dirtyInk = false;
      }
    } catch (error) {
      console.error('[Marrow Cards] Note save failed', error);
      new Notice('Personal note not saved: ' + (error.message || String(error)), 9000);
      throw error;
    }
  }
  async toggleNote(card) {
    if (this.notesOpen) {
      try { await this.flushNote(); } catch (error) { return; }
      this.notesOpen = false;
      this.noteData = null;
      this.noteRevision += 1;
      this.redrawKeepingScroll();
      return;
    }
    try {
      await this.flushNote();
      const revision = ++this.noteRevision;
      const data = await this.plugin.readCardNote(card.id);
      if (revision !== this.noteRevision || this.queue[this.cursor]?.id !== card.id) return;
      this.noteData = { ...data, mode: 'type', dirtyText: false, dirtyInk: false };
      this.notesOpen = true;
      this.redrawKeepingScroll();
    } catch (error) {
      console.error('[Marrow Cards] Note load failed', error);
      new Notice('Could not open personal note: ' + (error.message || String(error)), 9000);
    }
  }
  async browseStep(direction) {
    if (this.sessionKind !== 'browse') return;
    const next = this.cursor + direction;
    if (next < 0 || next >= this.queue.length) return;
    try { await this.flushNote(); } catch (error) { return; }
    this.noteRevision += 1;
    this.notesOpen = false;
    this.noteData = null;
    this.cursor = next;
    await this.present(); // Browsing deliberately does not record a 'seen' event.
  }
  redrawKeepingScroll() {
    // Switching pen tools should not jump away from the editor on Android.
    const previous = this.contentEl.querySelector?.('.marrow-review-scroll');
    const position = previous?.scrollTop || 0;
    this.draw();
    const current = this.contentEl.querySelector?.('.marrow-review-scroll');
    if (current) current.scrollTop = position;
  }
  drawNoteEditor(parent, card) {
    const note = this.noteData;
    if (!this.notesOpen || !note || note.cardId !== card.id) return;
    const holder = parent.createDiv({ cls: 'marrow-note-editor' });
    holder.createEl('h4', { text: 'My notes · ' + card.id });
    holder.createEl('p', { cls: 'marrow-hint',
      text: 'Type on your phone; switch to Pen on your tablet to write over the text. Saved locally for Syncthing.' });
    const toolbar = holder.createDiv({ cls: 'marrow-note-toolbar' });
    const setMode = mode => {
      note.mode = mode;
      this.redrawKeepingScroll(); // preserves note data and scroll position.
    };
    for (const [mode, label] of [['type', 'Type'], ['pen', 'Pen'], ['eraser', 'Eraser']]) {
      const button = toolbar.createEl('button', {
        text: label, cls: note.mode === mode ? 'mod-cta' : ''
      });
      button.addEventListener('click', () => setMode(mode));
    }
    const undo = toolbar.createEl('button', { text: 'Undo ink' });
    undo.disabled = !note.strokes.length;
    undo.addEventListener('click', () => {
      if (!note.strokes.length) return;
      note.strokes.pop();
      note.dirtyInk = true;
      this.redrawKeepingScroll();
      this.scheduleNoteSave();
    });
    const save = toolbar.createEl('button', { text: 'Save note' });
    save.addEventListener('click', () => void this.flushNote().then(
      () => new Notice('Personal note saved locally.'),
      () => {}
    ));
    const quick = holder.createEl('textarea', {
      cls: 'marrow-note-quick-type',
      attr: { 'aria-label': 'Quick type your card note on phone',
        placeholder: 'Type shorthand here on your phone. It appears on the pen page below.' }
    });
    quick.value = note.text;
    quick.addEventListener('input', () => {
      note.text = quick.value;
      note.dirtyText = true;
      this.scheduleNoteSave();
      const pageText = holder.querySelector('.marrow-note-text');
      if (pageText) pageText.value = note.text;
    });
    const viewport = holder.createDiv({ cls: 'marrow-note-viewport' });
    const stage = viewport.createDiv({ cls: 'marrow-note-page' });
    const input = stage.createEl('textarea', {
      cls: 'marrow-note-text',
      attr: { 'aria-label': 'Editable typed note for ' + card.id,
        placeholder: 'Type your quick revision notes here…' }
    });
    input.value = note.text;
    input.readOnly = note.mode !== 'type';
    input.addEventListener('input', () => {
      note.text = input.value;
      quick.value = note.text;
      note.dirtyText = true;
      this.scheduleNoteSave();
    });
    const canvas = stage.createEl('canvas', { cls: 'marrow-note-ink' });
    const width = 900, height = 1200;
    canvas.width = width;
    canvas.height = height;
    canvas.style.pointerEvents = note.mode === 'type' ? 'none' : 'auto';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      holder.createEl('p', { text: 'Drawing canvas is unavailable on this device.' });
      return;
    }
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const stroke of note.strokes) {
        if (!stroke.points?.length) continue;
        ctx.strokeStyle = stroke.color || '#286ab7';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = stroke.width || 2.5;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
        if (stroke.points.length === 1) {
          ctx.arc(stroke.points[0][0], stroke.points[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
          }
          ctx.stroke();
        }
      }
    };
    const coords = event => {
      const rect = canvas.getBoundingClientRect();
      return [
        Math.max(0, Math.min(width, ((event.clientX - rect.left) / Math.max(rect.width, 1)) * width)),
        Math.max(0, Math.min(height, ((event.clientY - rect.top) / Math.max(rect.height, 1)) * height))
      ];
    };
    let active = null;
    let pointer = null;
    canvas.addEventListener('pointerdown', event => {
      if (note.mode === 'type' || event.pointerType === 'touch') return; // reject palms/fingers
      event.preventDefault();
      const point = coords(event);
      if (note.mode === 'eraser') {
        const before = note.strokes.length;
        // Simple first-version eraser removes the touched stroke, not a segment.
        const thresholdSq = 15 * 15;
        for (let i = note.strokes.length - 1; i >= 0; i--) {
          if (note.strokes[i].points.some(p =>
            (p[0] - point[0]) ** 2 + (p[1] - point[1]) ** 2 <= thresholdSq)) {
            note.strokes.splice(i, 1);
            break;
          }
        }
        if (note.strokes.length !== before) {
          note.dirtyInk = true;
          render();
          this.scheduleNoteSave();
        }
        return;
      }
      if (note.strokes.length >= 5000) {
        new Notice('This note has reached the first-version ink limit.');
        return;
      }
      active = { id: uniqueId(), color: '#286ab7', width: 2.8, points: [point] };
      pointer = event.pointerId;
      note.strokes.push(active);
      canvas.setPointerCapture?.(event.pointerId);
      render();
    });
    canvas.addEventListener('pointermove', event => {
      if (!active || event.pointerId !== pointer) return;
      event.preventDefault();
      const point = coords(event);
      const prior = active.points[active.points.length - 1];
      if ((prior[0] - point[0]) ** 2 + (prior[1] - point[1]) ** 2 < 0.7) return;
      if (active.points.length < 15000) active.points.push(point);
      render();
    });
    const finish = event => {
      if (!active || event.pointerId !== pointer) return;
      active = null;
      pointer = null;
      note.dirtyInk = true;
      render();
      this.scheduleNoteSave();
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    render();
    holder.createEl('p', { cls: 'marrow-hint',
      text: 'Pen/Eraser accepts stylus or mouse input; touch is ignored to reduce accidental palm marks. Keep Syncthing file versioning enabled and avoid simultaneous edits on both devices.' });
  }

  filterCards() {
    return this.plugin.cards.filter((c) => {
      if (this.selected.size && !c.indexIds.some((id) => this.selected.has(id))) return false;
      const s = this.plugin.stats.get(c.id) || { seen: 0, right: 0, wrong: 0 };
      if (this.mode === 'wrong' && s.wrong === 0) return false;
      if (this.mode === 'unseen' && s.seen > 0) return false;
      return true;
    });
  }
  async resetQueue() {
    try { await this.flushNote(); } catch (error) { return; }
    this.noteRevision += 1;
    this.notesOpen = false;
    this.noteData = null;
    this.queue = this.filterCards();
    this.cursor = 0;
    this.flipped = false;
    await this.present();
  }
  async present() {
    const card = this.queue[this.cursor];
    this.flipped = false;
    this.answerState = null;
    this.correctIndex = card ? correctOptionIndex(card) : -1;
    this.optionOrder = card && Array.isArray(card.options)
      ? (this.sessionKind === 'review' && canShuffleCard(card, this.correctIndex)
          ? shuffleChoiceIndices(card.options.length)
          : card.options.map((_, index) => index))
      : [];
    if (card && this.sessionKind !== 'browse') {
      try { await this.plugin.recordEvent(card.id, 'seen'); } catch (e) { console.error(e); new Notice('Could not record view: ' + e.message); }
    }
    this.draw();
    const next = this.queue[this.cursor + 1];
    if (next) for (const image of next.images || []) {
      const f = this.app.vault.getAbstractFileByPath(MEDIA + '/' + image);
      if (f) { const img = new Image(); img.src = this.app.vault.getResourcePath(f); }
    }
  }
  async grade(action) {
    const card = this.queue[this.cursor];
    if (this.sessionKind === 'browse' || !this.flipped || !card || this.busy || this.answerState) return;
    this.busy = true;
    try {
      await this.flushNote();
      await this.plugin.recordEvent(card.id, action);
      this.notesOpen = false;
      this.noteData = null;
      this.noteRevision += 1;
      this.cursor += 1;
      await this.present();
    } catch (e) { new Notice('Review not saved: ' + e.message); this.draw(); }
    finally { this.busy = false; }
  }
  async selectOption(sourceIndex) {
    const card = this.queue[this.cursor];
    if (this.sessionKind !== 'review' || this.flipped || this.busy || this.answerState ||
        !card || this.correctIndex < 0 || !this.optionOrder.includes(sourceIndex)) return;
    this.busy = true;
    const outcome = sourceIndex === this.correctIndex ? 'right' : 'wrong';
    try {
      await this.plugin.recordEvent(card.id, outcome);
      this.answerState = { cardId: card.id, sourceIndex, outcome };
      this.flipped = true;
      this.redrawKeepingScroll();
    } catch (error) {
      console.error('[Marrow Cards] Could not record chosen option', error);
      new Notice('Could not record your answer: ' + (error.message || String(error)));
    } finally { this.busy = false; }
  }

  async nextAfterOption() {
    if (!this.answerState || this.busy || this.sessionKind !== 'review') return;
    this.busy = true;
    try {
      await this.flushNote();
      this.noteRevision++;
      this.notesOpen = false;
      this.noteData = null;
      this.cursor++;
      await this.present();
    } catch (error) {
      console.error('[Marrow Cards] Could not advance', error);
      new Notice('Could not advance to next card: ' + (error.message || String(error)));
    } finally { this.busy = false; }
  }
  draw() {
    const el = this.contentEl;
    el.empty();
    el.addClass('marrow-cards');
    el.removeClass('marrow-review-mode');
    if (this.screen !== 'review') { this.drawHierarchy(el); return; }
    el.addClass('marrow-review-mode');
    // Keep the review body independently scrollable. The footer stays docked
    // above Obsidian's mobile toolbar, rather than appearing below long content.
    const scroll = el.createDiv({ cls: 'marrow-review-scroll' });
    const header = scroll.createDiv({ cls: 'marrow-header' });
    header.createEl('h2', { text: 'Marrow Cards' });
    const bar = header.createDiv({ cls: 'marrow-toolbar' });
    const library = bar.createEl('button', { text: '← MBBS library' });
    library.addEventListener('click', () => this.goLibrary('subjects'));
    const importButton = bar.createEl('button', { text: 'Import bundle' });
    importButton.addEventListener('click', () => this.plugin.chooseLocalBundle());
    const refresh = bar.createEl('button', { text: 'Refresh local' });
    refresh.addEventListener('click', () => this.refresh());
    const sync = bar.createEl('button', { text: 'Check GitHub' });
    sync.addEventListener('click', () => this.plugin.syncPacks());
    const controls = scroll.createDiv({ cls: 'marrow-controls' });
    controls.createEl('strong', {
      text: (this.sessionKind === 'browse' ? 'Browsing ' : 'Reviewing ') + this.selected.size +
        (this.selected.size === 1 ? ' index' : ' indexes')
    });
    if (this.sessionKind === 'browse') {
      controls.createEl('p', { cls: 'marrow-hint',
        text: 'Browse only: flip, go back/next and add notes. Nothing is counted as Seen, Right or Wrong.' });
    }
    controls.createEl('p', { cls: 'marrow-hint', text: this.plugin.indexes.filter(i => this.selected.has(i.id)).map(i => i.title).join(' · ') || 'All installed cards' });
    const row = controls.createDiv({ cls: 'marrow-toolbar' });
    row.createSpan({ text: 'Practice: ' });
    const select = row.createEl('select');
    for (const [value, title] of [['all','All cards'],['wrong','Ever wrong'],['unseen','Never seen']]) {
      const opt = select.createEl('option', { text: title }); opt.value = value; opt.selected = value === this.mode;
    }
    select.addEventListener('change', () => { this.mode = select.value; this.resetQueue(); });
    const card = this.queue[this.cursor];
    if (!this.plugin.cards.length) {
      scroll.createEl('p', { text: 'No approved cards yet. Your MBBS indexes are ready for newly approved PYQ decks.' });
      return;
    }
    if (!card) {
      scroll.createEl('p', { text: 'No more cards in this selection. Change the filters or restart.' });
      const restart = scroll.createEl('button', { text: 'Practice again' });
      restart.addEventListener('click', () => this.resetQueue());
      return;
    }
    scroll.createEl('p', { cls: 'marrow-position', text: 'Card ' + (this.cursor + 1) + ' of ' + this.queue.length + ' · ' + card.id });
    const panel = scroll.createDiv({ cls: 'marrow-panel' });
    panel.createEl('div', { cls: 'marrow-side', text: this.flipped ? 'ANSWER' : 'QUESTION' });
    if (!this.flipped) {
      panel.createEl('div', { cls: 'marrow-question', text: getQuestion(card) });
      for (const filename of card.images || []) {
        const f = this.app.vault.getAbstractFileByPath(MEDIA + '/' + filename);
        if (!f) { panel.createEl('p', { text: 'Missing image: ' + filename, cls: 'marrow-missing' }); continue; }
        const img = panel.createEl('img', { cls: 'marrow-image', attr: { alt: 'Question image for ' + card.id } });
        img.src = this.app.vault.getResourcePath(f);
        img.loading = 'eager';
      }
      if (this.sessionKind === 'review' && this.correctIndex >= 0 && !this.answerState) {
        panel.createEl('p', { cls: 'marrow-hint',
          text: 'Tap an option to check it automatically, or flip to assess yourself.' });
      } else if (this.sessionKind === 'review' && (card.options || []).length && this.correctIndex < 0) {
        panel.createEl('p', { cls: 'marrow-hint',
          text: 'This answer cannot be verified automatically. Flip and grade it manually.' });
      }
      for (const sourceIndex of this.optionOrder) {
        const text = card.options[sourceIndex];
        const displayIndex = this.optionOrder.indexOf(sourceIndex);
        if (this.sessionKind === 'review' && this.correctIndex >= 0) {
          const option = panel.createEl('button', {
            cls: 'marrow-option marrow-option-choice',
            text: optionLetter(displayIndex) + '. ' + optionBody(text),
            attr: { 'aria-label': 'Choose option ' + optionLetter(displayIndex) }
          });
          option.disabled = Boolean(this.answerState) || this.busy;
          if (this.answerState?.sourceIndex === sourceIndex) option.addClass('marrow-option-selected');
          option.addEventListener('click', () => void this.selectOption(sourceIndex));
        } else {
          panel.createEl('div', { cls: 'marrow-option', text });
        }
      }
    } else {
      const answerText = this.sessionKind === 'review' && this.correctIndex >= 0
        ? 'Correct: ' + optionLetter(this.optionOrder.indexOf(this.correctIndex)) + '. ' +
          optionBody(card.options[this.correctIndex])
        : card.answer;
      panel.createEl('div', { cls: 'marrow-answer', text: answerText });
      if (this.answerState && this.answerState.cardId === card.id) {
        panel.createEl('p', {
          cls: this.answerState.outcome === 'right' ? 'marrow-choice-correct' : 'marrow-choice-wrong',
          text: this.answerState.outcome === 'right'
            ? 'Correct — saved as Right' : 'Incorrect — saved as Wrong'
        });
        panel.createEl('p', { cls: 'marrow-choice-feedback-detail',
          text: 'Your choice: ' + optionLetter(this.optionOrder.indexOf(this.answerState.sourceIndex)) +
            '. ' + optionBody(card.options[this.answerState.sourceIndex]) });
      }
      if (card.explanation) {
        panel.createEl('h4', { text: 'Explanation' });
        panel.createEl('div', { cls: 'marrow-explanation', text: card.explanation });
      }
    }
    const s = this.plugin.stats.get(card.id) || { seen: 0, right: 0, wrong: 0 };
    scroll.createEl('p', { cls: 'marrow-stats', text: 'Seen: ' + s.seen + '    Right: ' + s.right + '    Wrong: ' + s.wrong + '    Accuracy: ' + ((s.right + s.wrong) ? Math.round(100 * s.right / (s.right + s.wrong)) + '%' : '—') });
    const noteButton = scroll.createEl('button', {
      text: this.notesOpen ? 'Close my notes' : 'My notes (type / pen)',
      cls: 'marrow-note-toggle'
    });
    noteButton.addEventListener('click', () => void this.toggleNote(card));
    if (this.notesOpen) this.drawNoteEditor(scroll, card);
    const actions = el.createDiv({ cls: this.sessionKind === 'browse'
      ? 'marrow-actions marrow-actions-browse'
      : (this.flipped
          ? (this.answerState ? 'marrow-actions marrow-actions-auto' : 'marrow-actions marrow-actions-back')
          : 'marrow-actions marrow-actions-front'),
      attr: { role: 'group', 'aria-label': this.sessionKind === 'browse' ? 'Browse card actions' : 'Card review actions' } });
    if (this.sessionKind === 'browse') {
      const previous = actions.createEl('button', { text: 'Previous' });
      previous.disabled = this.cursor === 0;
      previous.addEventListener('click', () => void this.browseStep(-1));
      const flip = actions.createEl('button', {
        text: this.flipped ? 'Show question' : 'Show answer', cls: 'mod-cta'
      });
      flip.addEventListener('click', () => { this.flipped = !this.flipped; this.draw(); });
      const next = actions.createEl('button', { text: 'Next' });
      next.disabled = this.cursor + 1 >= this.queue.length;
      next.addEventListener('click', () => void this.browseStep(1));
    } else if (!this.flipped) {
      const flip = actions.createEl('button', {
        text: this.answerState ? 'Show answer' : 'Flip to answer', cls: 'mod-cta'
      });
      flip.addEventListener('click', () => {
        if (this.busy) return;
        this.flipped = true;
        this.draw();
      });
    } else if (this.answerState) {
      const back = actions.createEl('button', { text: 'Show question' });
      back.addEventListener('click', () => { this.flipped = false; this.draw(); });
      const next = actions.createEl('button', { text: 'Next card', cls: 'mod-cta' });
      next.addEventListener('click', () => void this.nextAfterOption());
    } else {
      const showQuestion = actions.createEl('button', { text: 'Show question', cls: 'marrow-flip-back' });
      const wrong = actions.createEl('button', { text: 'Wrong', cls: 'marrow-wrong' });
      const right = actions.createEl('button', { text: 'Right', cls: 'marrow-right' });
      // Going back to the question is not a new review attempt.
      showQuestion.addEventListener('click', () => { this.flipped = false; this.draw(); });
      wrong.addEventListener('click', () => this.grade('wrong'));
      right.addEventListener('click', () => this.grade('right'));
    }
  }
}

class MarrowSettingsTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Marrow Cards settings' });
    containerEl.createEl('p', { text: 'Cards and review history are saved under MarrowCards/ in this vault. Keep your .obsidian folder device-local for a unique device ID on each phone or tablet.' });
    new Setting(containerEl).setName('Current device ID').setDesc(this.plugin.settings.deviceId);
    new Setting(containerEl).setName('Data source').setDesc('Private GitHub repository: ' + REPO + '. Token is only needed on the device that downloads packs.');
    new Setting(containerEl).setName('Automatic pack checks').setDesc('Check on startup and every 30 minutes while Obsidian is open, if a token is set.')
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
        this.plugin.settings.autoSync = value; await this.plugin.saveData(this.plugin.settings);
      }));
    let pending = '';
    new Setting(containerEl)
      .setName('Read-only GitHub token')
      .setDesc('Fine-grained token: this repository only, Contents read permission. Stored locally in Obsidian SecretStorage, never in the synced card files.')
      .addText((input) => { input.inputEl.type = 'password'; input.setPlaceholder('Paste token locally (not into chat)').onChange((v) => { pending = v.trim(); }); })
      .addButton((button) => button.setButtonText('Save token locally').onClick(() => {
        if (!pending) { new Notice('Paste a token first.'); return; }
        this.app.secretStorage.setSecret(TOKEN_KEY, pending);
        pending = '';
        new Notice('Read-only GitHub token saved on this device.');
        this.display();
      }));
    new Setting(containerEl).setName('Delete stored token').setDesc('Clears the local token; it does not delete cards or statistics.')
      .addButton((button) => button.setButtonText('Clear').onClick(() => { this.app.secretStorage.setSecret(TOKEN_KEY, ''); new Notice('Token cleared.'); }));
    new Setting(containerEl).setName('Download approved packs').setDesc('Checks private GitHub manifest.json and downloads new/updated card packs and images.')
      .addButton((button) => button.setButtonText('Check now').onClick(() => this.plugin.syncPacks()));
  }
}

module.exports = MarrowCardsPlugin;
