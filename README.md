# Marrow Cards — Obsidian plugin for indexed MBBS review

An offline-first Obsidian flashcard reviewer for **user-approved** MBBS PYQs and personal facts. The public repository contains the **plugin code and instructions**. Approved cards and original images live in the separate, **private** `Akshat6/marrow-cards-data` repository. Android phone/tablet review logs are maintained per device and can sync through Syncthing.

## New ChatGPT conversation? Start here

**[AGENTS.md — read first](AGENTS.md)** · **[Complete flashcard workflow](docs/flashcard-workflow.md)** · **[Original-image publishing procedure](docs/publishing-approved-cards.md)**

The workflow explains how to look up an index in the live Google Sheets tracker, retrieve exact PYQ text/options/answers and original figures from user-provided PDFs, show cards for approval, publish *only approved cards* to the private repository, update the manifest, and verify the cards in Obsidian.

Suggested first message in a new chat:

> Read https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md and the linked workflow. Prepare cards for [subject + index ID], using my live PYQ mapping and source PDFs. Show every card for my approval before publishing anything.

**GitHub files are not automatically loaded into every new ChatGPT conversation.** Include that entry-point link or explicitly ask the new chat to read it. The instructions are designed not to require this conversation once loaded.

## What the plugin does

- Navigate **MBBS → Subject → Index → Review** across the current index catalog.
- Select **one or more indexes** to practise together, including personal `fact` cards and mapped `pyq` cards.
- Review question/option/source image → flip to answer/explanation → flip back to question or grade **Wrong**/**Right**.
- Scroll long questions and explanations independently of the docked action buttons on mobile.
- Filter **All**, **Ever wrong**, or **Never seen**; show Seen/Right/Wrong counts from per-device JSONL event logs.
- Download approved card packs and original image files from the private repository, caching locally for offline access.
- Sync the vault's downloaded packs/media and separate review logs through Syncthing. The ChatGPT workflow prepares the packs; the plugin does **not** extract PDFs by itself.

## Compact Review / Browse action buttons (v0.2.1)

On the **MBBS → Subjects** screen, **Review selected indexes (N)** (purple) and **Browse selected indexes (N)** (neutral grey) are now adjacent in a small, consistent vertical stack at both the top and bottom of the subject list. The old Android 110px per-button bottom gap has been removed; bottom toolbar clearance is reserved at the end of the library page instead. Button functionality, card grading, browsing, personal notes and cross-subject index selection are unchanged.

## Browse without grading and personal typed + handwritten notes (v0.2.0)

From **MBBS → Subjects → Subheading → Index**, press **Browse** beside an installed index (or **Browse selected indexes (N)** to browse all selected indexes). Browse displays the question, options, and images; use **Show answer / Show question**, **Previous**, and **Next**. Browse NEVER records a `seen`, `right`, or `wrong` event: accuracy and `Ever wrong` history do not change. The familiar **Review** button still does real practice with Right/Wrong and the normal Seen count.

On **either** a Browse card or a Review card, press **My notes (type / pen)**. Notes are per stable card ID and can be reopened later after returning through the subject/subheading/index hierarchy. One on-screen page combines a typed text layer and independently editable vector ink layer. On a phone, use the **quick type** field above the page to jot shorthand; it is the same text displayed on the underlying pen page. On an Android tablet, select **Pen** and use a stylus to write over the typed content; select **Eraser** to delete a touched stroke or **Undo ink** to remove the most recent stroke. Switching tools retains the editor's scroll position. Typed text and ink are autosaved after about 650 ms of inactivity; **Save note** provides an explicit save. Moving to another card, leaving Browse, and exiting the reviewer also flush pending edits. A first-version note is one fixed 720 × 960-pixel portrait page, horizontally scrollable on a narrow phone for consistent text/ink alignment.

**Storage:** User-authored notes are NOT in the approved GitHub data repository and are NEVER uploaded with PYQ packs/images. They live inside the Obsidian vault in `MarrowCards/notes/<card-id>/text.json` and `MarrowCards/notes/<card-id>/ink.json` (schemaVersion 1). Handwriting saves individual vector strokes and coordinates, not just a flattened screenshot. The separate text/ink files help avoid text-versus-ink overwrites across devices, but **do not eliminate Syncthing conflicts** if the same file is edited on both devices at once. Enable Syncthing file versioning or a backup, let files finish synchronizing between phone/tablet, and avoid simultaneous offline edits of the same note. Keep `.obsidian/` excluded from vault synchronization as before.

The first-version eraser removes whole strokes, not stroke segments. Pen mode accepts stylus or mouse pointer events and deliberately ignores touch pointers to reduce palm marks. Exact stylus pressure, palm rejection and Android drawing latency require testing on the actual tablet. This feature does not modify or republish any approved card, PYQ mapping or review event history.

## Collapsible subheadings inside subjects (v0.1.9)

The reviewer now uses **MBBS → Subjects → Subheadings/systems → Indexes**. Subjects still behave as a one-at-a-time accordion; for subjects with multiple catalog subheadings, expanding a subject now displays its **real catalog system names** before individual index checkboxes. Examples:

- **Anatomy:** General Anatomy, Head, Neck and Face, Neuroanatomy, Embryology, Upper Limb, Lower Limb, Thorax, Abdomen and Perineum, Histology, etc.
- **Ophthalmology:** Basic Anatomy of Eye, Retina, Glaucoma, Cornea, Uvea, etc.
- **Medicine:** Cardiology, Neurology, Gastroenterology, Endocrinology, etc.

Tap one subheading to see only its indexes. Opening a different subheading collapses the first; opening another subject collapses the previous subject. **All checked indexes stay selected**. Subjects with only one catalog system display indexes directly to avoid an unnecessary click.

The expanded **subject** panel has a longer vertical scroll area: up to `min(74vh, 680px)` on desktop, `min(70vh, 620px)` on mobile. Other subject headings remain reachable. The existing **Show only indexes with approved cards** toggle removes empty indexes and therefore empty subheadings; it does not modify selections or data.

Use the top or bottom **Review selected indexes (N)** control to practise all checked indexes across subjects and subheadings, or **Review** beside an individual index to practise just that index. Inside review, the **Ever wrong** filter continues to work.

## Collapsible subject selector (v0.1.8)

Select multiple indexes across different subjects **without leaving the subject list**:

1. Navigate **Marrow Cards → MBBS → Subjects**.
2. Tap **Anatomy** to expand its indexes. Tick the two indexes you want.
3. Tap **Ophthalmology**. Anatomy automatically collapses, but its two selections stay selected. Tick two Ophthalmology indexes.
4. Tap **Review selected indexes (4)** at the top or bottom of the subject list. It reviews all four indexes together; choose **Ever wrong** inside the reviewer to practise only the ones previously marked Wrong.

You can tap an open subject again to collapse it. Each expanded index list has its own bounded scroll area, keeping other subject headings accessible on small Android screens. **Review** beside any individual index still reviews only that one index.

The existing **Show only indexes with approved cards** filter also works with the collapsible list, hiding subjects and indexes with no installed approved cards. Toggling it never clears selections. The expanded subject is remembered during the current reviewer session; nothing is added to or removed from the underlying data.

## Show only indexes with approved cards (v0.1.7)

On **MBBS → Subjects** or **Subject → Indexes**, turn on **Show only indexes with approved cards**. The browser will hide index entries that do not have at least one approved card in the locally installed packs, and hide subjects without any such indexes. You can turn it off at any time to restore the full subject/index catalog.

- The toggle is **off by default** and stays set while browsing in the current reviewer session.
- Subject counts reflect the visible indexes while the filter is enabled.
- Existing selected indexes remain selected when the filter is toggled. **Review** beside an index still reviews only that index; **Review selected indexes** still reviews all selected indexes together.
- This is a *visibility filter only*: it does not delete packs, unapproved/empty index metadata, card images, or review history.
- If you have just approved/published an index but it does not appear, tap **Check GitHub → Refresh local** on the phone (or **Refresh local** after Syncthing on the tablet). The filter uses the cards already available locally, not merely PYQ mapping counts.

## Current approved content (re-check the live private repository)

On 2026-10-11, the private manifest lists:
- `mbbs-index-catalog`: MBBS index names and IDs, not flashcards.
- `oph04-personal-facts`: **four approved personal fact cards** for `OPH-04 / Ophthalmology / Anatomy of Retina`.

The live spreadsheet maps **zero PYQs** to OPH-04. The different index `OPH-32 / Anatomy and Investigations of Retina` has three mapped PYQ codes, but the previous pilot PYQ cards are **not** active and must not be restored without a new approval. Catalog mappings and pack counts can change; the connected sheet and live `manifest.json` take precedence over this snapshot.

## Install or update via BRAT (phone and tablet)

1. Open the dedicated `Marrow Cards` Obsidian vault.
2. Install/enable the **BRAT** community plugin.
3. Add beta repository `Akshat6/marrow-cards-plugin`.
4. Enable **Marrow Cards** under **Settings → Community plugins → Installed plugins**.
5. Open via the layers ribbon icon or the Command Palette action **Marrow Cards: Open reviewer**.
6. For *plugin-code changes*, use **BRAT → Check for updates**, then restart Obsidian if needed. See [GitHub releases](https://github.com/Akshat6/marrow-cards-plugin/releases).

If it is listed as installed but its settings entry disappears after a restart, check whether it remains enabled or has a startup error. Newer versions register plugin settings before asynchronous vault initialization. **Never delete review data to fix a plugin activation issue.**

## Connect the private card database (phone)

1. Create a fine-grained GitHub token scoped to **only** `Akshat6/marrow-cards-data`, with repository **Contents: Read-only** permission.
2. Under **Obsidian → Settings → Marrow Cards**, paste it in **Read-only GitHub token** and tap **Save token locally**.
3. Open **Marrow Cards → Check GitHub → Refresh local**. Select **MBBS → Subject → Index**.
4. For a *card-data-only update*, repeat Check GitHub and Refresh local. **Do not reinstall the plugin or use BRAT** for new card packs.

Keep the token on-device only; never share it in chat, logs, or the vault. A 404 from `manifest.json` on a private repository can mean the token lacks access to the **data** repo.

## Syncthing and storage

- Sync the dedicated vault folders `MarrowCards/packs/`, `MarrowCards/media/`, and `MarrowCards/reviews/` between Android devices.
- **Exclude `.obsidian`** from Syncthing on both devices. Each device should have its own local plugin installation, token policy, settings, and review-log device ID.
- Review log path: `MarrowCards/reviews/<device-id>/YYYY-MM.jsonl`. Don't merge files by overwriting one device's log with another.
- On the tablet, install BRAT/Marrow Cards independently but rely on Syncthing for already downloaded approved content. Tap **Refresh local** after sync.
- Use backups or Syncthing versioning; synchronization alone is not a backup.

## Repository boundaries

**Public code:** `Akshat6/marrow-cards-plugin` — `main.js`, `manifest.json`, `styles.css`, source tests, workflow docs.

**Private approved data:** `Akshat6/marrow-cards-data` — `manifest.json`, `packs/*.json`, `media/*`.

Approved card IDs are stable, pack versions increase when edited, and only approved cards appear in the app. Never commit proprietary source images, question-bank text, answer keys, private review history or credentials to the public repository.

## Development and maintenance

- Run `node tests/smoke.js` for syntax, data-model, reviewer controls and non-blocking startup regression checks.
- For plugin-code changes, update `main.js` / `styles.css` as needed, bump `manifest.json` version, and confirm GitHub Actions released assets `main.js`, `manifest.json`, `styles.css`.
- For **new approved cards**, update **only the private data repository** per [the workflow](docs/flashcard-workflow.md); do not bump the public plugin version.
- See [first-device pilot test checklist](docs/first-device-test.md) for optional regression checks and [media publishing procedure](docs/publishing-approved-cards.md) for binary-image uploads.
