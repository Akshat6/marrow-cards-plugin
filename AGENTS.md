# Marrow Cards — instructions for a new ChatGPT session

**Dynamic Recall v0.3.0:** Same plugin; legacy PYQ Review remains independent, and one-index Groq Dynamic Recall adds 0–10 grading. User expressly chose a direct release without beta after automated tests and a limited real Groq audit, with Android device validation still pending. See [docs/dynamic-recall-phase1.md](docs/dynamic-recall-phase1.md) and [docs/rollback-v0.3.0.md](docs/rollback-v0.3.0.md). Keep old 0.2.10 assets and all local vault data safe. Future features still require specific user authorization.


**Start here in every new ChatGPT conversation about Marrow Cards — whether the user wants new approved flashcards OR a plugin/interface bug fix or upgrade.** This file is the GitHub entry point, not a card database.

## First choose the task-specific instructions

- **Plugin bug, interface improvement, navigation, reviewer behaviour, MCQ grading/shuffling, Browse, Android startup, stylus notes or Syncthing:** Read **[docs/plugin-maintenance.md](docs/plugin-maintenance.md)** in full *before* editing. Inspect live `main.js`, `styles.css`, `tests/smoke.js`, `manifest.json`, README and latest GitHub Actions runs. Preserve existing user notes/reviews and approved cards, add a regression test that reproduces the reported sequence, then publish/verify a BRAT release. The maintenance guide documents the **v0.2.3 consecutive-card disabled-button bug**, the **v0.2.4 Unicode-dash/multiline MCQ answer fix**, the **v0.2.5 per-card note-image/annotation feature**, the **v0.2.6 pen presets and image move/resize controls**, the **v0.2.7 question-only index overview with cumulative accuracy**, the **v0.2.10 Clear all selection control across collapsed subjects**, and all major current UI contracts.
- **PYQ extraction, approved personal facts, index mapping, card edits, card/media pack publishing:** Follow **[docs/flashcard-workflow.md](docs/flashcard-workflow.md)** and, for source images, **[docs/publishing-approved-cards.md](docs/publishing-approved-cards.md)**. Show exact card drafts and seek the user's explicit approval before publishing new approved content.
- **Both changes in one task:** Apply both guides while keeping the public plugin repo and private card data responsibilities completely separate. Do not use an app version bump as an excuse to modify approved private packs.

## Required first steps

1. Read **[docs/flashcard-workflow.md](docs/flashcard-workflow.md)** in full. It is the canonical end-to-end workflow. For PYQs with embedded figures, also read **[docs/publishing-approved-cards.md](docs/publishing-approved-cards.md)**.
2. Use the connected **Google Drive** tools to read the current index/PYQ mapping; use the connected **GitHub** tools to read the private card-data repository. Do **not** rely on previously seen mappings, screenshots, or remembered card counts.
3. Check **`Akshat6/marrow-cards-data/manifest.json`**, **`packs/mbbs-index-catalog.json`**, and relevant live packs before proposing IDs or edits. Treat the private repository and current spreadsheet as the source of truth.
4. Confirm which index the user is studying by **stable index ID**, subject, and title. Gather linked PYQs from the live mapping, then verify their question/answer contents against available original source PDFs.
5. **Prepare a preview and seek explicit approval of the exact front/back and any original images before publishing.** A request merely to “create cards” is *not* permission to auto-publish without review unless the user clearly provides explicit approval for the final content.
6. After approval, publish *only* approved content to the **private** data repository and update its manifest **last**. Verify by reading the live files back. Existing active cards, indexes, and review history must be preserved.

## Architectural boundaries

| Place | Role | Safety |
| --- | --- | --- |
| `Akshat6/marrow-cards-plugin` (this public repo) | Obsidian plugin source, tests, workflow documents, BRAT release assets | **Never** commit private PYQ text, answer keys, proprietary PDF pages/images, credentials, or review logs here |
| `Akshat6/marrow-cards-data` (private) | Approved card packs and original image assets; `manifest.json` is the download index | Keep private; no direct manual uploads expected of user |
| Connected Google Sheet “Marrow PYQ Index Master” | Latest PYQ code → index ID → canonical PDF page | Read before extracting PYQs; mapping can change |
| Connected Google Sheet “PYQ Index Lookup” | Quick index-wise PYQ list | Cross-check against the master |
| Project source PDFs | Original question/options/answers/explanations and embedded source images | Read user-provided source; don't invent missing detail |
| Local Obsidian vault `MarrowCards/` | Offline downloaded packs/media and per-device JSONL review logs | Never delete/rewrite to reset without specific request |

**Do not re-add the retired test PYQs to OPH-04.** As last verified 2026-10-11, OPH-04 “Anatomy of Retina” has **zero mapped PYQs** in the spreadsheet but **four user-approved personal fact cards** in its active pack. The three formerly tested Retina PYQs map instead to **OPH-32 “Anatomy and Investigations of Retina”** and are *not* currently approved cards. Re-check live sources in every new session.

## Working conventions

- `fact`: Personal user-supplied question/answer. Preserve the **approved** spelling, capitalization, and wording. Do not silently rewrite after approval.
- `pyq`: Genuine mapped previous-year question. Keep exact question, **all** options, verified answer, explanation and source images, as available; flag gaps to user, never substitute fabricated text.
- Preview one index at a time unless the user explicitly asks to combine indexes.
- IDs are stable and unique. Never overwrite another pack or create duplicate IDs.
- Publishing packs **does not** require a plugin version bump. BRAT releases are only for plugin code changes.
- The phone may download via **Check GitHub → Refresh local**. Syncthing delivers `MarrowCards/packs`, `MarrowCards/media`, and `MarrowCards/reviews` to the tablet. Obsidian's `.obsidian` directory stays device-local.

## Plugin-upgrade new-chat user prompt

“Read `https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md` and `https://github.com/Akshat6/marrow-cards-plugin/blob/main/docs/plugin-maintenance.md`. Fix or upgrade **[describe feature/bug]** in the currently published plugin, test affected phone/tablet flows and existing review/notes compatibility, update documentation, and publish only after GitHub Actions succeeds. Preserve approved PYQs and all user files.”

## New-chat user prompt

“Read `https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md` and its linked flashcard workflow. Then prepare cards for **[subject / index ID / index name]** from my live index mapping and available PDFs. Show me the exact cards for approval; do not publish until I approve.”

A new generic ChatGPT chat is **not guaranteed to load GitHub files automatically**. It needs this entry-point link or equivalent instruction. Once read, this file and the linked workflow replace dependence on any prior conversation.
