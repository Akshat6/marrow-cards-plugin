'use strict';

const { Plugin, ItemView, Notice, PluginSettingTab, Setting, requestUrl, base64ToArrayBuffer, normalizePath } = require('obsidian');

const VIEW_TYPE = 'marrow-cards-reviewer';
const ROOT = 'MarrowCards';
const PACKS = ROOT + '/packs';
const MEDIA = ROOT + '/media';
const REVIEWS = ROOT + '/reviews';
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


const PILOT_RESET_FILE = ROOT + '/pilot-reset.json';
const RETIRED_PACKS = new Map([
  ['demo', '0.1.0'], ['pilot-example', '1.0.0'], ['ophthalmology-retina-index', '1.1.0']
]);
const RETIRED_MEDIA = [
  'demo-circle.svg', 'pilot-circle.png',
  'A18-OPH-Q013-original.jpeg', 'A19-OPH-Q011-original.jpeg', 'I24-OPH-Q022-original.jpeg'
];
const RETIRED_CARD_IDS = new Set([
  'DEMO-Q001', 'DEMO-F001', 'DEMO-GH-001', 'DEMO-GH-002',
  'A18-OPH-Q013', 'A19-OPH-Q011', 'I24-OPH-Q022'
]);

class MarrowCardsPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({ deviceId: uniqueId(), autoSync: true }, await this.loadData() || {});
    if (!safeId(this.settings.deviceId)) this.settings.deviceId = uniqueId().replace(/[^A-Za-z0-9_-]/g, '');
    await this.saveData(this.settings);
    await this.ensureDirectories();
    await this.cleanPilotArtifacts();
    this.cards = [];
    this.indexes = [];
    this.stats = new Map();
    this.writeQueue = Promise.resolve();
    this.registerView(VIEW_TYPE, (leaf) => new MarrowCardsView(leaf, this));
    this.addRibbonIcon('layers', 'Open Marrow Cards', () => this.activateView());
    this.addCommand({ id: 'open-marrow-cards', name: 'Open reviewer', callback: () => this.activateView() });
    this.addCommand({ id: 'sync-marrow-card-packs', name: 'Check for approved card packs', callback: () => this.syncPacks() });
    this.addSettingTab(new MarrowSettingsTab(this.app, this));
    this.syncing = false;
    this.registerInterval(window.setInterval(() => {
      if (this.settings.autoSync && this.app.secretStorage.getSecret(TOKEN_KEY)) void this.syncPacks(true);
    }, 30 * 60 * 1000));
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoSync && this.app.secretStorage.getSecret(TOKEN_KEY)) void this.syncPacks(true);
    });
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
    for (const path of [PACKS, MEDIA, REVIEWS, REVIEWS + '/' + this.settings.deviceId]) await this.ensureFolder(path);
  }
  async writeJson(path, data) {
    const content = JSON.stringify(data, null, 2) + '\n';
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) await this.app.vault.modify(file, content);
    else await this.app.vault.create(path, content);
  }
  async cleanPilotArtifacts() {
    await this.ensureDirectories();
    let markerFile = this.app.vault.getAbstractFileByPath(PILOT_RESET_FILE);
    if (!markerFile) {
      const marker = { schemaVersion: 1, id: 'pilot-reset-2026-10-11',
        before: new Date().toISOString(),
        note: 'Remove retired pilot cards and reviews while preserving MBBS index catalog.' };
      try { await this.app.vault.create(PILOT_RESET_FILE, JSON.stringify(marker, null, 2) + '\n'); }
      catch (e) {
        if (!(await this.app.vault.adapter.exists(PILOT_RESET_FILE))) throw e;
      }
      markerFile = this.app.vault.getAbstractFileByPath(PILOT_RESET_FILE);
    }
    if (!markerFile) throw new Error('Missing pilot reset marker');
    const marker = JSON.parse(await this.app.vault.read(markerFile));
    if (marker.id !== 'pilot-reset-2026-10-11' ||
        !/^20\d{2}-\d{2}-\d{2}T/.test(marker.before)) {
      throw new Error('Invalid pilot reset marker; no files deleted.');
    }
    this.pilotResetBefore = marker.before;
    let removed = 0;
    for (const [id, maxVersion] of RETIRED_PACKS) {
      const file = this.app.vault.getAbstractFileByPath(PACKS + '/' + id + '.json');
      if (!file) continue;
      let pack;
      try { pack = JSON.parse(await this.app.vault.read(file)); }
      catch (e) { continue; }
      if (pack.packId === id && compareVersions(pack.version, maxVersion) <= 0) {
        await this.app.vault.delete(file);
        removed++;
      }
    }
    for (const name of RETIRED_MEDIA) {
      const file = this.app.vault.getAbstractFileByPath(MEDIA + '/' + name);
      if (file) { await this.app.vault.delete(file); removed++; }
    }
    for (const file of this.app.vault.getFiles().filter(f =>
      f.path.startsWith(REVIEWS + '/') && f.extension === 'jsonl')) {
      const lines = (await this.app.vault.read(file)).split('\n').filter(Boolean);
      const kept = lines.filter(line => {
        try {
          const e = JSON.parse(line);
          return !(RETIRED_CARD_IDS.has(e.cardId) &&
            typeof e.at === 'string' && e.at <= marker.before);
        } catch (e) { return true; }
      });
      if (kept.length === lines.length) continue;
      if (!kept.length) await this.app.vault.delete(file);
      else await this.app.vault.modify(file, kept.join('\n') + '\n');
      removed++;
    }
    return removed;
  }
  async loadCollection() {
    await this.cleanPilotArtifacts();
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
        try {
          const event = JSON.parse(line);
          if (RETIRED_CARD_IDS.has(event.cardId) &&
              typeof event.at === 'string' && event.at <= this.pilotResetBefore) continue;
          events.push(event);
        } catch (err) { console.warn('[Marrow Cards] malformed event line', file.path, err); }
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
    super(leaf); this.plugin = plugin; this.selected = new Set(); this.mode = 'all'; this.cursor = 0; this.flipped = false; this.busy = false; this.queue = []; this.screen = 'mbbs'; this.navSubject = '';
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Marrow Cards'; }
  getIcon() { return 'layers'; }
  async onOpen() { await this.refresh(); }
  async refresh() {
    await this.plugin.loadCollection();
    this.selected = new Set([...this.selected].filter((id) => this.plugin.indexes.some((idx) => idx.id === id)));
    if (this.screen === 'review') await this.resetQueue();
    else this.draw();
  }
  async startReview(indexIds) {
    this.selected = new Set(indexIds);
    this.screen = 'review';
    this.mode = 'all';
    await this.resetQueue();
  }
  goLibrary(level = 'mbbs') {
    this.screen = level;
    this.flipped = false;
    this.draw();
  }
  countForIndex(indexId) {
    return this.plugin.cards.reduce((n, card) => n + (card.indexIds.includes(indexId) ? 1 : 0), 0);
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
    const subjects = [...new Set(all.map(i => i.subject || 'Other'))].sort((a,b) => a.localeCompare(b));
    if (this.screen === 'mbbs') {
      el.createEl('p', { cls: 'marrow-hint', text: 'Choose MBBS to browse subjects and then your approved index decks.' });
      const btn = el.createEl('button', { cls: 'marrow-tree-tile', text: 'MBBS  ·  ' + subjects.length + ' subjects' });
      btn.addEventListener('click', () => this.goLibrary('subjects'));
      return;
    }
    if (this.screen === 'subjects') {
      el.createEl('h3', { text: 'Subjects' });
      if (!subjects.length) el.createEl('p', { text: 'No index catalog has been installed yet. Tap Check GitHub after configuring your private data token.' });
      for (const name of subjects) {
        const count = all.filter(i => (i.subject || 'Other') === name).length;
        const tile = el.createEl('button', { cls: 'marrow-tree-tile', text: name + '  ·  ' + count + ' indexes' });
        tile.addEventListener('click', () => { this.navSubject = name; this.goLibrary('indexes'); });
      }
      return;
    }
    if (this.screen === 'indexes') {
      el.createEl('h3', { text: this.navSubject });
      const matching = all.filter(i => (i.subject || 'Other') === this.navSubject);
      const grouped = new Map();
      for (const idx of matching) {
        const key = idx.system || 'Indexes';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(idx);
      }
      for (const [system, indexes] of grouped.entries()) {
        el.createEl('h4', { cls: 'marrow-system', text: system });
        for (const idx of indexes) {
          const count = this.countForIndex(idx.id);
          const tile = el.createDiv({ cls: 'marrow-index-tile' });
          const label = tile.createEl('label', { cls: 'marrow-index-name' });
          const checkbox = label.createEl('input', { type: 'checkbox' });
          checkbox.checked = this.selected.has(idx.id);
          checkbox.disabled = !count;
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) this.selected.add(idx.id);
            else this.selected.delete(idx.id);
            this.draw();
          });
          label.createSpan({ text: ' ' + idx.title });
          tile.createEl('span', { cls: 'marrow-count', text: count ? count + (count === 1 ? ' approved card' : ' approved cards') : 'Awaiting approved cards' });
          const practice = tile.createEl('button', { text: 'Review', cls: 'marrow-start-single' });
          practice.disabled = !count;
          practice.addEventListener('click', () => this.startReview([idx.id]));
        }
      }
      const picked = [...this.selected].filter(id => this.countForIndex(id) > 0);
      const combined = el.createEl('button', { cls: 'mod-cta marrow-start-selected', text: 'Review selected indexes (' + picked.length + ')' });
      combined.disabled = picked.length === 0;
      combined.addEventListener('click', () => this.startReview(picked));
      el.createEl('p', { cls: 'marrow-hint', text: 'You may select indexes across subjects. An index with zero approved cards is visible but cannot start a review.' });
    }
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
  async resetQueue() { this.queue = this.filterCards(); this.cursor = 0; this.flipped = false; await this.present(); }
  async present() {
    const card = this.queue[this.cursor];
    this.flipped = false;
    if (card) {
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
    if (!this.flipped || !card || this.busy) return;
    this.busy = true;
    try {
      await this.plugin.recordEvent(card.id, action);
      this.cursor += 1;
      await this.present();
    } catch (e) { new Notice('Review not saved: ' + e.message); this.draw(); }
    finally { this.busy = false; }
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
    controls.createEl('strong', { text: 'Reviewing ' + this.selected.size + (this.selected.size === 1 ? ' index' : ' indexes') });
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
      for (const option of card.options || []) panel.createEl('div', { cls: 'marrow-option', text: option });
    } else {
      panel.createEl('div', { cls: 'marrow-answer', text: card.answer });
      if (card.explanation) {
        panel.createEl('h4', { text: 'Explanation' });
        panel.createEl('div', { cls: 'marrow-explanation', text: card.explanation });
      }
    }
    const s = this.plugin.stats.get(card.id) || { seen: 0, right: 0, wrong: 0 };
    scroll.createEl('p', { cls: 'marrow-stats', text: 'Seen: ' + s.seen + '    Right: ' + s.right + '    Wrong: ' + s.wrong + '    Accuracy: ' + ((s.right + s.wrong) ? Math.round(100 * s.right / (s.right + s.wrong)) + '%' : '—') });
    const actions = el.createDiv({ cls: this.flipped ? 'marrow-actions marrow-actions-back' : 'marrow-actions marrow-actions-front', attr: { role: 'group', 'aria-label': 'Card review actions' } });
    if (!this.flipped) {
      const flip = actions.createEl('button', { text: 'Flip to answer', cls: 'mod-cta' });
      flip.addEventListener('click', () => { this.flipped = true; this.draw(); });
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
