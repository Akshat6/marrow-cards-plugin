# Marrow Cards — Obsidian plugin

Offline-first Obsidian flashcard reviewer for **user-approved** medical PYQs and personal facts. Cards, images, and review history are stored in the vault and synchronized between Android devices with Syncthing.

**Version:** 0.1.6 — Android cold-start reliability; remove obsolete reset cleanup while preserving approved flashcards.n-slate reset: preserve MBBS subject/index catalog and remove the old pilot cards, images and review attempts on each device.nd flip-back controls. Android UI refinement awaiting user verification. The public plugin contains no proprietary PYQs; approved PYQs live in the private data repository.

## Install with BRAT

1. Open your dedicated `Marrow Cards` vault.
2. Install and enable the Obsidian community plugin **BRAT**.
3. BRAT → **Add beta plugin** → enter `Akshat6/marrow-cards-plugin`.
4. BRAT should find the [current beta release](https://github.com/Akshat6/marrow-cards-plugin/releases/tag/0.1.4) with its `main.js`, `manifest.json` and `styles.css` assets.
5. Settings → Community plugins → enable **Marrow Cards**.
6. Use the layers icon or Command Palette → **Marrow Cards: Open reviewer**.
7. The reviewer opens at **MBBS**. Use **Check GitHub** to load the subject/index catalog; no demonstration cards are installed.nd mark Right/Wrong, then repeat a round. The image is a generated circle, **not an original PYQ**.

The plugin supports **multiple index selection**, Right/Wrong grading, question images, full explanation text, and local Seen/Right/Wrong/Accuracy counters. `Ever wrong` and `Never seen` practice filters are included.

## Android startup reliability (0.1.6)

Obsidian now registers Marrow Cards' reviewer, commands and settings **before** asynchronous local storage initialization. The obsolete one-time 0.1.5 pilot reset migration has been removed, so it cannot run at every app launch.

Your approved OPH-04 flashcards, synced packs, images, review logs and indexes remain unchanged by the plugin update. The data repository currently contains four approved OPH-04 personal fact cards. You do not need to reinstall the plugin to install new card packs.

## Mobile review controls (0.1.4)

- The question and explanation use an **independently scrollable** area.
- The review actions remain **docked above Obsidian's bottom toolbar**, not at the end of the long question.
- Front: **Flip to answer**.
- Back: **Show question**, **Wrong**, **Right**. Tapping Show question flips back without recording another Seen event or grading the card; flip to answer again to mark Right or Wrong.
- Updates change only app code, not `MarrowCards/packs/`, `MarrowCards/media/`, or `MarrowCards/reviews/`.

## MBBS subject / index hierarchy

The reviewer now opens at **MBBS → Subjects → Indexes → Review**. Choose **MBBS**, then a subject (such as Ophthalmology), then an index (such as **Anatomy of Retina / OPH-04**). You may select multiple indexes to review together.

The private data repository currently contains only the **metadata-only** index catalog (19 subjects, 1,314 index IDs), and **no active cards or media**. The index tracker now maps all three former OPH-04 pilot PYQs to **OPH-32 — Anatomy and Investigations of Retina**; OPH-04 remains listed, with zero linked questions. All indexes still show **Awaiting approved cards** until approved packs are published.

To receive the catalog: configure a read-only token for `Akshat6/marrow-cards-data` on the phone (see below), then select **Check GitHub** and **Refresh local**. Sync the vault to the tablet through Syncthing.

## Import a complete approved pack without uploading images to GitHub

When an approved index has images, ChatGPT can prepare one `.marrowpack.json` file containing the exact original images, card text, answer options, explanations and SHA-256 checksums.

1. Download the single `.marrowpack.json` bundle from the conversation to the phone.
2. Open Marrow Cards (anywhere in the MBBS library).
3. Tap **Import approved bundle**, then choose that downloaded JSON file.
4. The plugin validates the card format and all image checksums, writes the images into `MarrowCards/media/`, and writes the card pack into `MarrowCards/packs/`.
5. Open **MBBS → Ophthalmology → Anatomy of Retina** and review the imported cards.
6. Syncthing carries the images, card text, and later review history to the tablet without needing a second import.

No GitHub media upload, GitHub access token, app reinstall, or folder extraction is required for this operation. **Do not upload this bundle to a public repository**; it may contain proprietary question-bank material.

The normal publishing process now uses an automated, checksum-verified binary bridge to publish original image bytes to the **private** data repository. You do **not** need to download/upload/import files for routine approved indexes. The local bundle importer is a fallback for outages or offline recovery. See [media publishing playbook](docs/publishing-approved-cards.md).

## Connect the private approved-card collection

The question-pack repository is **private**: `Akshat6/marrow-cards-data`.

On your **phone only**:

1. In GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens.
2. Create a token scoped only to **Akshat6/marrow-cards-data**, with **Contents → Read-only** permission, and set a reasonable expiration.
3. In Obsidian: Settings → Community plugins → Marrow Cards settings → **Read-only GitHub token** → paste token locally → **Save token locally**.
4. Open reviewer → **Check GitHub**. It downloads the MBBS index catalog (no active cards). If Ophthalmology and other subjects appear, private authentication is working.
5. Never send tokens to chat, place tokens in GitHub code, or store tokens in the vault. This plugin stores the token in Obsidian's local SecretStorage.

Auto-checks run on startup and every 30 minutes **while Obsidian is running and has internet connectivity**. After a pack is installed the reviewer works offline.

## Syncthing setup

- Synchronize the dedicated `Marrow Cards` vault between phone and tablet.
- On **both devices**, exclude `/.obsidian` in Syncthing Ignore Patterns. This keeps plugin settings, the token, and each device's unique review-log ID separate.
- Install BRAT and Marrow Cards independently on the tablet. **Do not** enter the GitHub token there; let Syncthing deliver `MarrowCards/packs/` and `MarrowCards/media/`.
- Review logs are device-separated: `MarrowCards/reviews/<device-id>/YYYY-MM.jsonl`. When Syncthing finishes, press **Refresh local** to reload merged totals.
- Enable Syncthing file versioning or another backup. Sync alone is not a backup.

## Card data model

The [private data repository](https://github.com/Akshat6/marrow-cards-data) now contains only:

```text
manifest.json
packs/mbbs-index-catalog.json
```

There are no active questions or question images in the database.

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
