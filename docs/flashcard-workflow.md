# Marrow Cards — canonical new-chat flashcard workflow

**Purpose:** A fresh ChatGPT session should be able to prepare and publish indexed MBBS flashcards without reading previous chats, asking for manual GitHub uploads, or changing existing cards without permission.

This is an **operating procedure**, not an instruction to auto-create or auto-publish everything. The current user's approval controls what enters the review database.

## 0. Read this on every task

- First open [../AGENTS.md](../AGENTS.md).
- Use connected GitHub tools on `Akshat6/marrow-cards-plugin` (public, app code) and `Akshat6/marrow-cards-data` (**private**, approved data). Do not substitute unauthenticated public web search for the user's private repositories.
- Read the live private `manifest.json`, catalog `packs/mbbs-index-catalog.json`, and relevant active packs before editing. Never assume an earlier chat's cache is current.
- Open the linked Google Sheets through the connected Google Drive integration. A session with no Drive access must disclose that mapping cannot be verified rather than inventing mappings.
- Original source PDFs may be attached to this Project or supplied in the chat. Discover project files if not visible; read PDF instructions before programmatic PDF extraction. If the PDF isn't accessible, state the blocker and request the actual source; don't hallucinate its contents.

## 1. Data sources and order of authority

**Index and code mapping (live, may change):**

1. [Marrow PYQ Index Master](https://docs.google.com/spreadsheets/d/1VoC_y7JJIrPpQjlJZy0XTniipYz3g-SQ54mVaS5fEIk/edit): relevant **`<Subject> Index`** tab. Fields include `Index_ID`, `System`, `Index_Title`, `Notes_Page`, `PYQ_Count`, `PYQ_Codes`. A blank code list means zero mapped PYQs, **not** “invent equivalent PYQs.”
2. Same workbook's **`<Subject> PYQs`** tab: `PYQ_Code`, `Exam_Family`, `Year`, `Canonical_Block`, `Canonical_PDF_Page`, `Question_No`, `Primary_Index_ID`. Use its metadata to locate each original question.
3. Same workbook's **`PYQ Master`** tab for the consolidated canonical code, page, answer/mapping fields and source status. Check the per-subject mapping against it.
4. [PYQ Index Lookup](https://docs.google.com/spreadsheets/d/1dIh2DNyMx8O-fWzLX3GUxOplkRuLaIAJ3JEXbkE3Prw/edit): subject tabs; quick columns `SECTION`, `INDEX`, `PYQ CODES`. **Cross-check**, but do not treat its row number as an index ID.
5. Existing private GitHub catalog `packs/mbbs-index-catalog.json`: stable Obsidian index IDs, subjects, systems, names, volumes and note page metadata. This file is a *display catalog*, **not** the source for PYQ content. If a spreadsheet has updated mapping, never assume an older active card already reflects that update.

**Original material (content authority):** User-provided/indexed PYQ PDF, most recently called `Year wise pyq.pdf`, and the MBBS index PDFs (e.g. `1st 2nd 3rd year indexpdf.pdf`, `final year index.pdf`). The canonical PDF page is a locator, not evidence that the question text was actually inspected. Confirm source page numbering (printed pages versus PDF viewer positions) before extraction. Source images must be original assets, not recreated diagrams.

**User-supplied personal facts:** If the index has no PYQs, the user may dictate original fact cards. Do **not** call those “PYQs” or add them to the spreadsheet's PYQ counts.

**Existing approved cards:** The live private pack is authoritative for what is published and how many cards exist; the spreadsheet alone cannot tell you the number of personal cards.

### Known Retina example (re-check, not a permanent mapping override)

As checked on 2026-10-11:
- `OPH-04` / `Basic Anatomy of Eye` / **Anatomy of Retina**: `PYQ_Count=0`; **four approved personal facts** already stored in `packs/oph04-personal-facts.json`.
- `OPH-32` / `Retina` / **Anatomy and Investigations of Retina**: `A18-OPH-Q013`, `A19-OPH-Q011`, `I24-OPH-Q022` mapped in Google Sheets; **do not resurrect the deleted test cards** from old Git commits or screenshots. Draft them again and ask for approval when requested.
- Both index titles are similar; match the **ID**, not merely the word “Retina.”

## 2. Extract for a selected index

1. Resolve the user's subject/index ID and exact current title from the catalog and live spreadsheet. Ask a targeted clarification only if multiple indexes remain possible.
2. Read the matching `<Subject> Index` row. Parse the **complete** `PYQ_Codes` list, not only `PYQ_Count`.
3. For each code, read its subject-PYQs metadata and check `PYQ Master` for consistent code/page/mapping. Make a source trace: PYQ code, exam/session/year, original PDF page/question number, index ID.
4. Open the original source PDF and inspect the question block, its four or however-many options, any diagrams/images, printed/canonical answer, and explanation. Use the original text and ordering. Preserve nuance and call out truncated/illegible passages explicitly. Do not silently "correct" a conflicting source with general medical knowledge.
5. If an image is referenced, extract the original image file(s) from the PDF where possible, and display them to the user in the approval preview. If the source PDF has no standalone embedded asset, retain a faithful crop of the actual source page rather than generating an invented illustration; label the method.
6. Avoid invented figures, answers, options, explanations, source tags, years and page numbers. If content is absent, mark it `unverified` and **exclude from publication** until the user resolves it.
7. If an index lists no PYQs, report this clearly. Offer to create **personal fact** cards from the user's notes or dictated questions; never invent PYQs.

## 3. Preview and approval checkpoint — mandatory

**Do not write an active pack or update the manifest before the user approves the preview.**

For every draft card, show:
- **Stable proposed ID**, subject, index ID/title and source type (`PYQ` or `Personal fact`).
- **Front:** exact question. For PYQs, every option, in order, and all original figure(s).
- **Back:** proposed exact answer; explanation **only if supported by the original source or explicitly supplied**.
- Source/exam/year/PDF page metadata for PYQs; mark transcription uncertainty, spelling edits, and anything inferred.
- Clear checkboxes or equivalent text choices to **approve**, **edit**, **reject**, or **defer** individually.

If the user edits any field, use their **final approved wording exactly**. Unapproved draft content must not be written into the live pack or manifest. A partial approval publishes *only the approved subset*. Never attach another index's PYQs automatically to a similarly named one.

For updates to existing approved cards, show the **old versus proposed new** field(s) and get specific approval; don't silently rewrite a live card or reset study counters.

## 4. Pack format and stable IDs

The Obsidian plugin supports `schemaVersion=1`. Cards are `type: "fact"` or `type: "pyq"`; `status: "approved"`; `indexIds` must refer to entries in the same pack's `indexes` array.

Example **shape only** (do not publish this placeholder):

```json
{
  "schemaVersion": 1,
  "packId": "oph04-personal-facts",
  "version": "1.0.0",
  "indexes": [
    {
      "id": "OPH-04",
      "course": "MBBS",
      "subject": "Ophthalmology",
      "system": "Basic Anatomy of Eye",
      "title": "Anatomy of Retina",
      "volume": "Final Year",
      "notesPage": "13"
    }
  ],
  "cards": [
    {
      "id": "OPH04-FACT-001",
      "type": "fact",
      "status": "approved",
      "indexIds": ["OPH-04"],
      "question": "What is the optic disc also called?",
      "answer": "Mariotte's blind spot (physiological blind spot)."
    }
  ]
}
```

The example reflects an *existing published card*; do not create it again. For genuine PYQs, use a unique stable ID associated with the verified `PYQ_Code`, `type: "pyq"`, `options: [ ... ]`, `images: ["original-file.jpeg"]` if needed, `answer`, and `explanation` if verified. No blank placeholder option, image, answer, or fabricated explanation. Image files are stored at `media/<filename>` in the **private** repository and referenced by the filename only.

**Critical constraints:**
- Index IDs and approved card IDs remain stable over edits; version numbers increase when a pack changes, never decrease.
- Inspect *all active packs* to avoid duplicate card IDs. The catalog and new packs may repeat index metadata, but index IDs/titles must match the authoritative catalog.
- Preserve all previously approved cards in a pack when adding new approved cards. Never replace a whole pack with just the newest batch unless an explicit delete request covers those old cards.
- If the user asks to *move* a PYQ to another index, re-check the live mapping and arrange a controlled update so it appears in exactly the intended index after approval.
- Never delete or alter `MarrowCards/reviews/` as part of adding or editing cards; per-device Seen/Right/Wrong history belongs to the user.
- Do **not** revive obsolete `staging` or `demo` packs without explicit instruction.

## 5. Safe publication sequence

Publication goes to **`Akshat6/marrow-cards-data` only**, never the public plugin repo.

1. Re-read live `manifest.json`, catalog and target pack to prevent a race with another chat/session.
2. Assemble a pack of **only approved** cards, alongside its index definitions. Use the existing pack ID when updating an existing deck; for a new deck, choose a unique descriptive ID. Use a new monotonically higher `version` for updates.
3. Validate the pack schema as in the plugin's `validatePack` implementation; validate uniqueness across every active pack. Verify options, exact approved Q/A, referenced images, index ID and correct source mapping.
4. Publish every original media image first (if needed), verify byte counts and Git blob hashes. See **[publishing-approved-cards.md](publishing-approved-cards.md)** for the connected-tools binary bridge. **The user should not have to manually upload images.**
5. Write/create the approved JSON pack under `packs/` in the private repo. Read it back and compare all approved fields and media filenames.
6. **Only when pack and media are present**, update `manifest.json` with its `id`, `path` and matching `version`. Never edit the catalog merely to add fact cards or change PYQ counts.
7. Verify by fetching `manifest.json`, the pack and Git tree: active pack ID, new version, exact card count, stable IDs, no unexpected removals, and all referenced `media/` files.
8. Tell user: what changed, exactly which cards are live, anything pending, and how to get them in Obsidian. If activation failed, disclose which step failed rather than claiming completion.

**Plugin code remains unchanged** when only data changes. Do not bump `Akshat6/marrow-cards-plugin/manifest.json` or ask for a BRAT update unless plugin code itself changed.

## 6. Device workflow

- **Phone:** `Obsidian → Marrow Cards → Check GitHub → Refresh local → MBBS → Subject → Index`. The plugin downloads private approved packs using its locally saved read-only GitHub token.
- **Tablet:** Syncthing replicates `MarrowCards/packs/`, `MarrowCards/media/`, and `MarrowCards/reviews/`; tap `Refresh local` after sync. Keep `.obsidian` **excluded** from Syncthing on both devices so plugin settings and each device ID stay local.
- Logs live at `MarrowCards/reviews/<device-id>/YYYY-MM.jsonl`; do not combine raw files under a shared device ID.
- Existing downloaded content and reviews work offline. Updating approved data is **not** a BRAT plugin update.

## 7. Failure-handling and security

- **Mapping differs from memory:** Believe the current connected sheet; record the difference in the preview and ask for approval before moving published content.
- **Source PDF missing or illegible:** Do not claim exact source transcription. Stop that card at draft/unverified status.
- **Missing original image:** Do not activate broken media references. Use the binary bridge; if it fails, disclose and retain staging, rather than blaming private-repo permissions or requiring recurring manual uploads.
- **Manifest/package mismatch or duplicate ID:** Abort activation, verify remote state, repair or revert while preserving existing cards.
- **GitHub token/access:** Never request a token in chat. Do not make the data repository public as a workaround.
- **Plugin missing on Android:** Distinguish “installed” from “enabled”; settings/commands can disappear when startup fails. Diagnose separately; never delete cards as a plugin reinstall fix.
- **Privacy:** Never put proprietary question-bank content, PDF images, review history, or personal GitHub credentials in the public plugin repository or unprotected links.
- **No auto-deletion:** The historical pilot cleanup has already been removed from the plugin. Never reintroduce a reset migration without a separate explicit request.

## 8. New-chat templates

For an index with PYQs:

> Read [Marrow Cards AGENTS.md](https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md) and its full workflow. Prepare flashcards for **[INDEX ID / SUBJECT]** using my live Google Sheets mapping and original source PDF. Show all questions, options, source images, answers and explanations for approval; **do not publish yet**.

For publishing an approved preview:

> Publish **only cards [IDs]** that I approved above, using their exact wording, to the private Marrow Cards data repository. Verify the pack, image assets and manifest. Do not change any other cards or review history.

For a personal fact index with no linked PYQs:

> Read the workflow. I will dictate fact questions for **[INDEX ID]**. First return the exact question/answer preview for corrections; publish only after I approve.

**Note:** A GitHub file does not inject itself into every new ChatGPT conversation. The user should supply the AGENTS link or ask the session to open it. Once opened, this document is designed to be sufficient without any previous conversation history.
