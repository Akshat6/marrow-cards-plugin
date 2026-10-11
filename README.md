# Marrow Cards — Obsidian plugin

Offline-first Obsidian flashcard reviewer for **user-approved** medical PYQs and personal facts. Cards, images, and review history are stored in the vault and synchronized between Android devices with Syncthing.

**Version:** 0.1.2 — MBBS hierarchy technical pilot, not yet field-tested on physical Android devices. **No real PYQs are included.**

## Install with BRAT

1. Open your dedicated `Marrow Cards` vault.
2. Install and enable the Obsidian community plugin **BRAT**.
3. BRAT → **Add beta plugin** → enter `Akshat6/marrow-cards-plugin`.
4. BRAT should find [release 0.1.0](https://github.com/Akshat6/marrow-cards-plugin/releases/tag/0.1.0) with its `main.js`, `manifest.json` and `styles.css` assets.
5. Settings → Community plugins → enable **Marrow Cards**.
6. Use the layers icon or Command Palette → **Marrow Cards: Open reviewer**.
7. Press **Install two DEMO cards**, flip and mark Right/Wrong, then repeat a round. The image is a generated circle, **not an original PYQ**.

The plugin supports **multiple index selection**, Right/Wrong grading, question images, full explanation text, and local Seen/Right/Wrong/Accuracy counters. `Ever wrong` and `Never seen` practice filters are included.

## MBBS subject / index hierarchy

The reviewer now opens at **MBBS → Subjects → Indexes → Review**. Choose **MBBS**, then a subject (such as Ophthalmology), then an index (such as **Anatomy of Retina / OPH-04**). You may select multiple indexes to review together.

The private data repository includes a **metadata-only** catalog copied from the existing index tracker (19 subjects, 1,314 index IDs). It does **not** include real PYQ questions. Indexes with zero approved cards are shown as **Awaiting approved cards** and cannot be reviewed yet.

To receive the catalog: configure a read-only token for `Akshat6/marrow-cards-data` on the phone (see below), then select **Check GitHub** and **Refresh local**. Sync the vault to the tablet through Syncthing.

## Connect the private approved-card collection

The question-pack repository is **private**: `Akshat6/marrow-cards-data`.

On your **phone only**:

1. In GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens.
2. Create a token scoped only to **Akshat6/marrow-cards-data**, with **Contents → Read-only** permission, and set a reasonable expiration.
3. In Obsidian: Settings → Community plugins → Marrow Cards settings → **Read-only GitHub token** → paste token locally → **Save token locally**.
4. Open reviewer → **Check GitHub**. It downloads the dummy `pilot-example` pack and its PNG image. If it displays a 'downloaded' notice and the **Technical test** index appears, the importer is working.
5. Never send tokens to chat, place tokens in GitHub code, or store tokens in the vault. This plugin stores the token in Obsidian's local SecretStorage.

Auto-checks run on startup and every 30 minutes **while Obsidian is running and has internet connectivity**. After a pack is installed the reviewer works offline.

## Syncthing setup

- Synchronize the dedicated `Marrow Cards` vault between phone and tablet.
- On **both devices**, exclude `/.obsidian` in Syncthing Ignore Patterns. This keeps plugin settings, the token, and each device's unique review-log ID separate.
- Install BRAT and Marrow Cards independently on the tablet. **Do not** enter the GitHub token there; let Syncthing deliver `MarrowCards/packs/` and `MarrowCards/media/`.
- Review logs are device-separated: `MarrowCards/reviews/<device-id>/YYYY-MM.jsonl`. When Syncthing finishes, press **Refresh local** to reload merged totals.
- Enable Syncthing file versioning or another backup. Sync alone is not a backup.

## Card data model

The [data repository](https://github.com/Akshat6/marrow-cards-data) contains:

```text
manifest.json
packs/pilot-example.json
media/pilot-circle.png
```

The approved card's ID stays stable, even if its explanation changes. Cards can link to several indexes through `indexIds`. Supported types: `pyq` (options and images) and `fact` (simple question/answer). The app displays only approved cards and saves event logs separately from card text. Remote image imports accept JPG, PNG, WebP and GIF. They are cached locally.

Every index will first be prepared for your inspection. A PYQ is published to the private data repository **only after you confirm its exact text, options, original images, answer and explanation**. Incomplete/rejected questions remain unpublished.

## Limitations of the pilot

- Physical Android and actual Syncthing tests are still required.
- Rich equation/HTML support, editing inside the app, full visual review timeline, and resuming mid-queue are not yet implemented.
- The plugin does not perform PDF extraction or AI generation; ChatGPT prepares and publishes user-approved packs.
- No live database file is synchronized; per-device JSONL review logs avoid shared SQLite concurrency issues.

## Developer notes

The root `main.js`, `manifest.json`, and `styles.css` are the published plugin files; GitHub Actions packages these into a prerelease when the `manifest.json` version is incremented. Tests: `node tests/smoke.js`.

See [first-device pilot test](docs/first-device-test.md) for the complete checklist.

This public repository contains only plugin code and dummy examples. Keep question-bank content, media, and review history out of it.
