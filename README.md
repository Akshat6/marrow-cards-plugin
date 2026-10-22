**Experimental PYQ option-order fix (pending release):** Generated Groq MCQs now shuffle A-D choices once when safe, while retaining the model's original question/options/key in the audit record. Grading, answer-face explanations, bookmarks, flags and private feedback correctly translate between displayed letters and source option identities. Relative options such as “all of the above” remain in original order.

**v0.3.16 Rate-limit recovery:** On Groq HTTP 429 during Generate 10/20, the plugin now honors the provider `retry-after` window, keeps generated questions answerable while the remaining batch is prepared, and uses smaller two-question requests. Daily quotas and bounded cooldowns still apply; partial results remain possible. This directly addresses 1/10 after rate limiting. Real Groq/Android testing is still required.

**v0.3.15 Experimental PYQ practice upgrade:** Choose **Generate 1 / 10 / 20 experimental MCQs** in Dynamic Recall → PYQ-style. Tapping an answer flips to a dedicated back-of-card view with model key, your choice, explanation and four option-by-option rationales. Bookmark strong questions, flag questionable ones, and advance through the batch. Full-question auto-sync to the **private** data repo is OFF until you explicitly enable it in Marrow Cards Settings and supply a private-repo write token; local logs/export still work when off. On demand, ChatGPT can retrieve only new feedback and update a versioned, source-safe style-guidance file. These questions/answers remain AI-generated and medically unverified. [Workflow and setup](docs/pyq-feedback-workflow.md).

**v0.3.14 expanded experimental PYQ intelligence:** Opt-in PYQ-style can choose from the full private 157-Verified-KU / 73-relation analysis plus single-KU fallbacks (224 selectable experimental targets; six analyst holds stay blocked). Selection rotates by concept and knowledge coverage, avoids previous stems, and rejects duplicates. Four-to-five-line A–D options auto-expand. All generated medical answers remain **unverified** and separate from original PYQs/Verified scores. Details: [full-intelligence v2](docs/pyq-style-full-intelligence-v2.md).

**Opt-in Experimental AI MCQ (0.3.12 rollout):** Inside **Dynamic Recall → an index → PYQ-style**, choose **Try one Experimental AI MCQ (unverified)**. Groq generates new A–D questions on demand from user-accepted, privately stored Verified KU links. The question belongs to one home index even when its source KUs come from other indexes. Tap an answer to see Groq's proposed key and explanation; flag possible mistakes. These outputs are **not independently medically certified** and are recorded in separate local experimental logs, outside real PYQ Review and Verified Dynamic Recall scores. Initial available indexes: ANAT-R3-067 (006) and ANAT-R3-070 (068). Requires the existing private-repository read token, downloaded verified KUs, and Groq API key. Back up the vault before a BRAT update; see [integration guide](docs/pyq-style-experimental-obsidian-v1.md).

# Marrow Cards — Obsidian plugin for indexed MBBS review

**Released plugin v0.3.11 (manifest checked 2026-10-22):** Existing PYQ Review stays available, with a new, separate **Dynamic Recall** mode for one index at a time. The 0–10 Groq grader, KU-linked history, manual score correction and batched generation have passed synthetic and a limited real Groq audit. **Android device tests remain pending.** Back up your vault and review [rollback instructions](docs/rollback-v0.3.0.md) before updating.


An offline-first Obsidian flashcard reviewer for **user-approved** MBBS PYQs and personal facts. The public repository contains the **plugin code and instructions**. Approved cards and original images live in the separate, **private** `Akshat6/marrow-cards-data` repository. Android phone/tablet review logs are maintained per device and can sync through Syncthing.

## PYQ-style dynamic exam-intelligence project — current recovery entry

For the proposed **intelligence-guided Groq PYQ-style MCQ generator** (different from both existing historical PYQ Review and established Dynamic Recall), start with the [**private Step 5 v0.8 execution runbook**](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/STEP5-NEXT-CHAT-RUNBOOK-v0.8.md), the [private project next-chat handoff](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/NEXT-CHAT-HANDOFF.md), and [public plugin AGENTS](AGENTS.md) — **before** touching the experimental Step 3/4 plugin branch. The current source-locked research contains four *preview packets* (two same-index and two cross-index with **one owning home index each**); [source-only CI passed](https://github.com/Akshat6/marrow-cards-data/actions/runs/39679151308). It has **not** produced clinically approved real Groq MCQs, and **no student-facing PYQ-style runtime feed or released feature exists**. A separate clinical/source review, source-safe multi-index adapter, real Groq trial, option-by-option QA, regression and release permission are pending. **Do not upload proprietary KU excerpts, historical PYQs, raw model results, secrets or private medical data to this public code repo.**

## New ChatGPT conversation? Start here

**[AGENTS.md — start every new chat here](AGENTS.md)** · **[Plugin maintenance, upgrades and bug fixes](docs/plugin-maintenance.md)** · **[Approved-card workflow](docs/flashcard-workflow.md)** · **[Original-image publishing procedure](docs/publishing-approved-cards.md)**

The **plugin maintenance guide** explains how to inspect code, preserve the existing navigation/reviewer/notes/Browse features, reproduce regressions, test, publish a new BRAT release and avoid repeating past Android bugs. The separate flashcard publishing workflow explains how to look up an index in the live Google Sheets tracker, retrieve exact PYQ text/options/answers and original figures from user-provided PDFs, show cards for approval, publish *only approved cards* to the private repository, update the manifest, and verify the cards in Obsidian.

Suggested first message in a new chat:

> Read https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md and the linked workflow. Prepare cards for [subject + index ID], using my live PYQ mapping and source PDFs. Show every card for my approval before publishing anything.

For **plugin upgrades or bug fixes** in a new chat, use:

> Read https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md and https://github.com/Akshat6/marrow-cards-plugin/blob/main/docs/plugin-maintenance.md. Inspect the current plugin and tests, then fix [problem], add a regression test, keep all approved cards and local notes/reviews untouched, publish a verified BRAT release, and explain how to update.

**GitHub files are not automatically loaded into every new ChatGPT conversation.** Include that entry-point link or explicitly ask the new chat to read it. The instructions are designed not to require this conversation once loaded.

## What the plugin does

- Navigate **MBBS → Subject → Index → Review** across the current index catalog.
- Select **one or more indexes** to practise together, including personal `fact` cards and mapped `pyq` cards.
- Review question/option/source image → flip to answer/explanation → flip back to question or grade **Wrong**/**Right**.
- Scroll long questions and explanations independently of the docked action buttons on mobile.
- Filter **All**, **Ever wrong**, or **Never seen**; show Seen/Right/Wrong counts from per-device JSONL event logs.
- Download approved card packs and original image files from the private repository, caching locally for offline access.
- Sync the vault's downloaded packs/media and separate review logs through Syncthing. The ChatGPT workflow prepares the packs; the plugin does **not** extract PDFs by itself.

## Clear all selected indexes (v0.2.10)

In the **MBBS → Subjects → System/subheading → Indexes** selector, a neutral **Clear all selection** button appears directly below the existing **Review selected indexes (N)** and **Browse selected indexes (N)** controls, both at the top and bottom of the list. It is disabled when no indexes are selected. One tap removes all checked index selections **across every subject and collapsed subheading**, not just the currently visible ones.

The open subject, subheading, approved-only filter and current scroll position stay in place. All visible checkboxes, subject/subheading selected counts, and combined Review/Browse button counts update immediately to zero. You can select indexes again at once; nothing is permanently reset. **No card data, approved packs, notes, images, statistics or review-event logs are changed.** Clearing is only a temporary multi-index selection UI action.


## Question-only index overview and cumulative accuracy (v0.2.7)

From **MBBS → Subject → System/subheading → Index**, each index now shows three actions: **Review**, **Browse**, and **Questions**. **Questions** expands in place to show only approved question *statements*, never option choices, answer keys, solutions/explanations, card IDs or figures. Beside each question, see its **Accuracy, Seen, Right and Wrong** totals from your already stored per-device review events. An unattempted card displays **Accuracy: —** rather than inventing an outcome. Close with **Hide questions**, without altering the selected indexes or creating review events.

Every index tile also displays its cumulative **Index accuracy** alongside summed Seen/Right/Wrong. The index value is calculated from **total Right ÷ (total Right + total Wrong)** over all its approved cards, not from an unweighted average of card percentages. Indexes without any graded attempts display `—`. Only approved cards contribute; separate indexes are not mixed together. These are displays of existing review history, not new metadata stored in packs.

As requested, the **Seen / Right / Wrong / Accuracy** information has moved **out of the individual Review/Browse card viewer** and into the question overview and index tile. Review and Browse still display questions, options, figures, answer/explanation as before; their grading and note tools are unchanged. Opening the Questions overview is *not* reviewing or browsing and does **not** increment Seen. Multi-index Review/Browse and the approved-only filter still work.

## Pen colors and movable/resizable note images (v0.2.6)

**Pen color selector:** Open **My notes** and tap one of six preset swatches — **Blue, Black, Red, Green, Purple or Orange**. Selecting a swatch switches to **Pen**. Each new vector stroke saves its own color, so old handwritten notes and previously drawn strokes retain their original colors. The most recently selected color is saved in that device's local Obsidian plugin settings; it is not uploaded to GitHub.

**Image layout controls:** After adding an image through **Use question image** or **Choose image from device**, tap **Move / resize image**. Drag the highlighted image with **a finger, stylus or mouse** to reposition it anywhere inside the fixed 720 × 960 note page. Drag the square at its bottom-right corner to make it smaller or larger while preserving its displayed proportions. Tap **Done moving image** or **Pen** to return to handwriting. The image's position and dimensions auto-save in that card's local `MarrowCards/notes/<card-id>/image.json`; reopening the note restores the saved placement on synced devices.

The picture is still a **separate layer beneath typed text and vector ink**. Moving or resizing a picture does not move ink strokes already drawn on the page — position the picture before annotating it for best alignment. One image can be displayed per note at a time; pictures still cannot be cropped, rotated or layered together. Previously saved v0.2.5 `image.json` files without image geometry load in the original position automatically; no migration or re-import is necessary. Pen strokes, source image bytes, approved card packs, review events and old typed notes remain unchanged.

**Android:** Image-moving mode permits finger drag/resize; drawing mode continues to ignore finger input to reduce accidental palm strokes. Mobile touch interactions still require confirmation on a physical device after the BRAT update.

## Add a source or device picture to My notes (v0.2.5)

Open **My notes (type / pen)** in Browse or Review. If the card includes original question images, tap **Use question image** (or **Use question image 1/2** for multiple figures) to copy one to that card's personal note. Alternatively, choose **Choose image from device** to open the Android/desktop file picker (PNG/JPEG/WebP, up to 15 MB). The picture is displayed on the fixed notes page *beneath* the existing pen layer, and the typed text area sits below it. Use **Pen** to annotate the picture, **Eraser** or **Undo ink** to edit strokes, and **Remove note image** to clear the displayed picture without deleting text or ink. A note supports **one displayed picture at a time** in this version; choosing another replaces its display, not its saved annotations.

The plugin copies images into the **local vault** at `MarrowCards/notes/<card-id>/images/note-*.png|jpg|webp` and stores the current image reference in `MarrowCards/notes/<card-id>/image.json`. Approved PYQ media, private GitHub card packs and review logs are **never modified**. Image metadata and local copies sync through Syncthing with `MarrowCards/notes/`; on the other device, let both files finish syncing before opening the note. An image that has not synced appears as a missing-image notice, not a silently erased attachment. Old text/ink-only notes continue to load unchanged. Image removal does not delete the stored copy, to avoid accidental data loss during sync; use your backup/versioning policy for orphan cleanup.

Images are placed on a fixed 720 × 960 page so existing vector-stroke coordinates remain stable. They cannot yet be moved, resized or cropped, and an image change does **not** reset annotations. Finger drawing is still ignored in Pen mode to limit palm strokes; use a stylus on Android tablet or mouse on desktop. As with previous note features, physical stylus latency and Android file picker behavior require on-device verification.


## Unicode-dash and multiline PYQ answers (v0.2.4)

The plugin now recognizes verified correct answers written with an em dash (such as `B — answer`), en dash, hyphen, period, or a line break followed by a numbered answer list. It checks the full answer text against the selected source option before enabling tap-to-grade; mismatched answer text still falls back to manual Flip and Right/Wrong. Numbered/image sequence options remain in their original order instead of being shuffled. This restores one-tap grading for the newly published Ophthalmology OPH-32 and OPH-33 MCQs **without changing their approved card data**.

Regression tests cover consecutive cards with mixed answer separators, numbered multiline answers, mismatch fallback, and Browse remaining no-grade. Update **the plugin** through BRAT to receive this fix; refreshing packs alone cannot update old option-recognition code. Verify taps on the actual phone after the update.

## Consecutive MCQ tap-to-answer fix (v0.2.3)

**Reported Android bug in v0.2.2:** The first MCQ accepted a tap, but later cards in an index could stop responding to option taps. Root cause: `nextAfterOption()` and manual `grade()` render the next card while the reviewer is temporarily `busy`; the old button-rendering code used `option.disabled = Boolean(this.answerState) || this.busy`. The newly rendered options therefore remained disabled even after the asynchronous transition completed. The fixed renderer disables options only when that **same card has already been graded**, while `selectOption()` continues to check the live `busy` flag to prevent premature or double taps.

**Regression tests:** New automated checks go through **all three consecutive synthetic MCQs**, assert that each next card's actual option button is enabled, and verify exact Seen/Right counts. They also check that a newly presented MCQ is enabled after **manual** flip + Wrong on the preceding card. Real-device tapping should still be verified after updating BRAT on Android. Details and full compatibility rules: [plugin maintenance guide](docs/plugin-maintenance.md).

## Tap MCQ options and shuffle them safely in Review (v0.2.2)

**Review mode:** For approved questions with a verifiable correct option, tap an option instead of flipping. The plugin saves a single **Right** or **Wrong** event immediately and flips to the answer, displaying the chosen choice, the correct **currently displayed letter**, and the original explanation. It stays on the answered card until you tap **Next card**, so you can open **My notes** and write before advancing. Once an answer has been recorded, flipping back to the question cannot grade it again. **Flip to answer** remains available as an alternative for mental recall and manual Right/Wrong grading.

**Per-attempt option scrambling:** Eligible independent-option MCQs receive a new randomized display order whenever they are presented for Review; a given card's displayed order does not change while flipping, opening notes, or viewing its explanation. The source options and answers in the private approved packs are **never modified**. The app calculates correctness from the original source option identity, not the current A/B/C/D position. Questions with potentially positional answer choices (such as "All of the above", "Both A and B", numeric matching sequences, or image marker labels) remain in their original order but still support tapping when their answers are verifiable. If the original answer does not match its options safely, choices remain read-only and you must flip and grade manually. Future PYQ approvals should include a verified correct answer and identify unsafe-to-shuffle option dependencies.

**Fact cards without options** still use manual flip and Right/Wrong. **Browse mode** keeps options in their original order, does not let taps grade the card, and never records Seen/Right/Wrong. No change is made to your existing approved cards, personal notes, image assets or previous review events.

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


## Integrated Pulmonology (v0.2.8)

In **MBBS → Subjects → Integrated → Pulmonology**, all linked approved Anatomy, Pediatrics and Medicine respiratory cards appear under one Pulmonology tile, with no subject-level subdivisions. Existing cards keep their unique IDs and local review/notes history; the same card can also appear at its original subject index.

**Questions** includes the reviewed-but-index-pending Medicine PYQ registry and figure-blocked question records alongside active cards. These pending entries show an abbreviated topic label and stable PYQ code, not a fabricated full question, correct option, or review grade. Pending entries are not added to the review queue. Cards labelled with an unverified answer or incomplete source data may be browsed and flipped, but Review advances them without recording Right/Wrong, protecting accuracy statistics.

Updating the private cards uses **Check GitHub → Refresh local**. This new integrated pending-question view additionally requires a BRAT plugin update to v0.2.8 on each device.

### Check GitHub feedback (v0.2.9)

Manual **Check GitHub** now immediately shows **Checking GitHub for card updates...**. If an earlier sync is still active, tapping again says **A GitHub card check is already in progress** instead of silently returning. After a successful check, it still reports the number of updated packs or that everything is already current; failures continue to display an error. Background automatic checks remain quiet unless they download new packs. This UI change does not edit card packs, source images, notes or per-device review logs.

## Dynamic Recall in v0.3.0

Use **Open Dynamic Recall** as a separate Obsidian command. In **Marrow Cards settings**, enter your own Groq API key using the device-local SecretStorage control. Tap **Check knowledge units on GitHub** to download the versioned verified KU pack from the private data repository. Choose one index, then **Study 10/25/50/75 units** (up to the units available). The AI generates questions in batches of up to 10 and grades each typed response individually on a **0–10** scale with corrected, missing and incorrect facts plus manual numeric override.

Results are append-only under `MarrowCards/dynamic-recall/attempts/<device-id>/YYYY-MM.jsonl`; old PYQ reviews remain under `MarrowCards/reviews/`. Each device must be upgraded separately through BRAT. The server receives the selected KU's answer/excerpt and your typed response; the model can make medical grading mistakes. There is **no paid fallback** and daily safety caps of 75 grading calls/125 total requests per device, not a guarantee of free provider quota. **Only single-index Dynamic Recall** is available in v0.3.0; multi-index, offline question cache, automated Sheets ingestion and local AI remain postponed.

The existing verified public testing report is [here](https://github.com/Akshat6/marrow-cards-plugin/actions/runs/39113855817). See [rollback instructions](docs/rollback-v0.3.0.md) and [technical handoff](docs/dynamic-recall-phase1.md). Before updating on your phone or tablet, copy the entire Obsidian vault and check Syncthing has settled.

## v0.3.1 — Dynamic Recall phone layout and index hierarchy

The Dynamic Recall screen now uses **MBBS → Subject → System → Index** sections instead of a flat list. **Integrated → Pulmonology → Anatomy** presents the four reviewed Anatomy Thorax indexes (ANAT-R3-067–070), each pointing to its original stable KUs and score history rather than duplicating attempts. Later Medicine/Pediatrics indexes join when their verified KU metadata or explicitly approved card links associate them with `INT-PULM`; no automatic medical-topic inference. Selecting a tile still studies **one index only**.

On small phones, the active question occupies its own non-scrolling panel and the large header is hidden while the answer textarea has focus. This aims to prevent Android's keyboard scroll from pushing the question off-screen. The question remains accessible even for long stems. The separate answer area scrolls beneath it. Tablet presentation and the old PYQ reviewer styles remain independent. No existing scores, notes, or cards are edited.

**After updating through BRAT to 0.3.1**, reopen Dynamic Recall and tap **Check knowledge units on GitHub** to retrieve private KU feed v1.0.1 with explicit reviewed Integrated Pulmonology membership. Device-only keyboard behavior remains to be checked on your S23 FE.

## v0.3.2: Integrated Pulmonology and daily AI usage

**Integrated → Pulmonology is one directly actionable collection**, just as in PYQ Review. It has **Review Pulmonology** and **Browse Pulmonology** actions, with no Anatomy/Medicine/Pediatrics subdivisions inside the integrated tile. Review offers 10/25/50/75 KU sessions from all verified units explicitly tagged `INT-PULM` or linked through approved PYQ index mappings. Browse shows their verified KU targets and answers read-only without Groq calls or grading. Ordinary subjects still retain **Subject → System → Index** navigation. An integrated Review is a special explicitly linked collection, not a general multi-index selector; every KU retains its original stable ID, historical score and originating index.

The Dynamic Recall home page now reports **today's completed questions, used/remaining local grading calls (75/day), total API requests (125/day) and measured tokens**. When available, it shows Groq's last reported **account-wide remaining requests/day**. After at least two successful grading responses and a generation response, it also estimates average tokens per graded KU (including generation overhead) and approximate remaining questions, bounded by local call caps. Groq currently publishes an illustrative Free Plan reference of 200,000 tokens/day for `openai/gpt-oss-20b`; the plugin **cannot verify actual account-wide tokens remaining** from its response headers, which expose *per-minute* remaining tokens. Usage on other devices/apps, rate limits, and failed requests may reduce the real allowance; no paid fallback.

**v0.3.3:** the AI usage panel now directly prints **illustrative reference token headroom** (published Free Plan 200,000 tokens/day minus locally observed token totals). This is NOT a verified Groq account-wide remaining balance; other apps/devices and exact organization limits are not included.

## v0.3.4 — quick browsing per index and compact conservative daily budget

Each original KU-backed index in **Subject → System → Index** now has its own **Review** and **Browse** actions, matching the existing direct Integrated Pulmonology Review/Browse controls. Review opens the single-index 10/25/50/75 AI written-recall selector. Browse opens fast, tap-to-reveal **verified KU learning-target prompts** and verified answers, with no typing. These prompts are taken from the private verified KU feed's `promptTarget` (rather than generated Groq question wording), so browsing requires **zero API requests**, no offline question bank or caching, no grading and no new attempt records. A source index and an integrated collection continue to use the same KU IDs and progress history.

The verbose AI usage panel is now a **collapsed-by-default disclosure beside the Dynamic Recall heading**. With enough successful daily token samples, the closed disclosure shows a one-line estimate such as **≈ 15 more questions today (estimate)**. The expanded view retains the exact local request/grading caps, observed response-token totals, reference-budget headroom and reasoning behind the forecast. The prominent number applies a **25% safety reserve, rounded down** (20 raw → 15 displayed), but is still not a guarantee of available Groq quota, and is not based on verified account-wide remaining daily tokens.

## v0.3.5 — complete each Knowledge Unit before repeating, and a smaller AI forecast reserve

Dynamic Recall now follows **coverage-first rounds**. For a source index with 31 verified KUs, Round 1 presents each KU **once** before repeating even very low-scoring responses. If you study 10 + 10, the next batch comes from the 11 remaining unseen KUs. If you ask for 25 with only 11 remaining, that session presents **11** and stops; **Round 2** begins on the next session, prioritizing weaker/due scores among the KUs that have one attempt. The same principle enforces all 31 second attempts before any third. Round counters (e.g. `Round 1 · 20/31 scored · 11 remaining`) are shown on the index and collection review screens. Progress is derived from existing per-KU attempt history, survives Obsidian restarts/Syncthing, and is never reset merely because you close a session; old categorical reviews count as real attempts too. A newly approved KU starts at zero and is prioritized to catch up.

The **Integrated Pulmonology** special linked collection also follows the coverage-first rule, sharing the exact same stable KU history; ordinary source-index navigation stays separate. Browsing remains read-only and creates no attempts. The optional 1–2% early-repeat idea is **not activated**: with batches of 10 it would round to zero and undermines the primary one-attempt-per-KU guarantee. Once a complete round finishes, low-scoring KUs receive review priority in the new round.

The Daily AI Usage panel now displays a **10% conservative safety buffer** on its estimated remaining question capacity: e.g. rough estimate 20 → displayed estimate **18** (rounded down). It remains a prediction, not a verified remaining provider quota.

## v0.3.6 — clean index list with optional details

On the **Dynamic Recall index library**, the new top **Show index details / Hide index details** button controls the verbose KU count, round/coverage progress, numeric score averages, correct/partial/wrong counts and total attempts for **all ordinary indexes and Integrated Pulmonology** at once. Details default **hidden** to leave a compact Subject → System → Index list with direct **Review** and **Browse** actions. The switch stays selected while this Dynamic Recall view is open and redrawn; reopening a fresh view starts compact again. Review-session round progress and the separate collapsible Groq daily-usage panel stay available independently. The toggle is view-only: it never removes or changes a KU, grade, attempt or approved PYQ.

## v0.3.7 — Dynamic Recall index cards match PYQ reviewer

Dynamic Recall source indexes now display **only the human-readable index title**, without internal identifiers or KU counts in the heading. Their two short, side-by-side **Review** and **Browse** buttons reuse the original PYQ Review button classes and approximately 40px touch height, instead of the oversized label-filled buttons. Integrated Pulmonology uses the same compact two-action styling. The **Show index details** toggle still independently reveals progress and attempts when desired. Internal index IDs remain untouched for selection, scoring and synchronization; buttons retain accessible descriptions via ARIA labels.

## v0.3.8 — local revision analysis and permanent new-chat ingestion procedure

Within **Review** for each source index (and in **Integrated Pulmonology Review**) use **Revision analysis** to inspect source-linked weaknesses. The plugin derives five groups from actual saved grade history: revise first (very low or repeatedly weak), revise next (partial/recently weak), monitor (insufficient strong evidence), consistently strong (two recent numeric scores at least 8/10; defer temporarily), and not assessed. It identifies the **original verified note heading**, KU learning target, source locator and most recent score/AI-marked omissions. Weakest headings rank first. This local analysis makes **no Groq request** and changes neither the scores nor the coverage-first scheduling logic.

The app automatically refreshes report files when loading/syncing KUs and after grading/manual correction. Look in `MarrowCards/dynamic-recall/analysis/<device-id>/<source-index-id>.md` or `INT-PULM.md`. Reports are separate, replaceable derived snapshots; historical JSONL attempts stay append-only. They omit student answer text, canonical answers and API credentials. To request an index weakness analysis in a new ChatGPT conversation, **attach the latest local Markdown report**; the chat cannot automatically read scores kept only in Obsidian. For detailed note-based remediation, attach or provide the corresponding source PDF as well.

See the durable [new-index ingestion and handoff guide](docs/dynamic-recall-new-index-handoff.md) for the existing connected Google Sheet's current SOP, stable private KU feed, verification/approval gates, per-index mapping and publishing sequence. No new Google Sheet rows or private KU facts were added by this plugin feature.

## v0.3.9 — automatic private GitHub progress snapshots

Dynamic Recall now supports **automatic, compact, private GitHub progress uploads**. The **public** repository contains only plugin code and instructions. The **private** `Akshat6/marrow-cards-data` repository receives a separate JSON snapshot per device at `progress/by-device/<device-id>.json`, containing only stable KU/index IDs, per-KU attempt counts, latest 0–10 grade, most recent grade category/time, and cumulative numeric totals. This is **not the raw review history**: typed answers, Groq-generated questions, feedback, note headings/excerpts, PDFs and API keys never enter the GitHub snapshot. The approved card packs, KU feed and original attempt JSONL remain independent and unchanged.

**One-time setup on each device:** Create a fine-grained GitHub Personal Access Token, restrict it to the **private** `Akshat6/marrow-cards-data` repository only, and grant **Contents: Read and write**. Unlike the existing read-only token used for PYQ pack/KU downloads, this is a separate, higher-privilege token and should be protected carefully. Obsidian → Settings → Marrow Cards → **Dynamic Recall — automatic private GitHub progress sync** → **Private GitHub progress write token (this device only)** → **Save progress token**. Repeat on the tablet; each has a separate Obsidian SecretStorage. Never paste tokens into chat or put them in synced files.

After setup, the plugin schedules private uploads automatically following graded answers or manual score corrections (45 seconds after recent activity), immediately when a session finishes, on Obsidian startup, and every 30 minutes while Obsidian is open. Changes are compared to the existing remote snapshot to avoid unnecessary commits; a transient network error is retried on later activity/startup/periodic check. Use **Sync now** to force a check and see its status. The plugin **cannot run when Obsidian is closed**. The latest scores continue to be stored in local append-only Obsidian attempt files regardless of remote upload success.

In new ChatGPT conversations, after connecting GitHub, follow the permanent [Dynamic Recall handoff](docs/dynamic-recall-new-index-handoff.md) and request live `progress/by-device/` snapshots **from the private repository**, plus the verified private KU metadata. Combine per-device outcomes by stable KU ID; do not assume Google Sheets attempts auto-update or trust a single snapshot as globally complete. The private GitHub record exposes compact performance to anyone with access to that private repo. Do not mirror this directory to the public repository.

## v0.3.10 — safe repair for a cloned phone/tablet Device ID

If Syncthing copied the entire `.obsidian` folder before it was excluded, the phone and tablet can accidentally share the same Marrow Cards Device ID. **Excluding `.obsidian` later does not regenerate the cloned ID**. Both devices then publish to the same `progress/by-device/<device-id>.json` snapshot, so the second device may report "already up to date".

**Fix only on the tablet:** first ensure the phone and tablet show the same Current device ID, and confirm `.obsidian` is now excluded from Syncthing. Back up the complete vault (including the historical `MarrowCards/reviews`, `MarrowCards/dynamic-recall/attempts`, `usage` and `analysis` folders). Finish any active question. Update to v0.3.10 → Obsidian Settings → Marrow Cards → **Repair cloned device ID (tablet only)** → **Prepare tablet ID repair** → **Confirm: this is the tablet**.

The plugin gives only this installation a fresh ID, saves it in local plugin settings and logs the identity change at `MarrowCards/dynamic-recall/identity-changes/<new-device-id>.json`. It **never deletes, renames, duplicates or rewrites** any old history; the original shared-ID snapshot remains in private GitHub. It registers a separate **0-attempt** private GitHub device file immediately, so you can verify the split without adding dummy graded attempts. New tablet attempts go under the new ID and upload to the second file. Previously recorded history using the shared ID cannot reliably be attributed to one physical device retroactively; keep that historical combined snapshot once and don't sum it twice. Phone ID and its old scores remain unchanged.

If automatic GitHub upload is offline, the new identity still saves locally and the separate upload can be retried with **Sync now**. No need to replace the same GitHub token already configured on both devices. Do not use the repair button on the phone.

## v0.3.11 — Device IDs locked after recovery

The temporary **Repair cloned device ID (tablet only)** control from v0.3.10 and its manual ID-changing function have been **removed** to prevent accidental generation of more device IDs. Current device IDs remain readable in Settings, but there is no manual rotate/regenerate action. No migration runs on update: existing IDs, all old shared-ID records, private GitHub snapshots, review/PYQ logs, score history, coverage-first rounds, local analysis, credentials, and sync settings are preserved.

Keep `.obsidian` excluded in Syncthing on both devices so settings remain independent. If IDs ever collide again, investigate the actual sync configuration and back up original history before any future deliberate manual recovery; do not reset progress or delete GitHub snapshots. Automatic private progress uploads and retry behavior are unchanged.
