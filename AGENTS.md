# Marrow Cards — instructions for a new ChatGPT session

**PYQ-STYLE DYNAMIC MCQ GENERATION — CRASH-SAFE CURRENT HANDOFF (2026-10-22):** This is **development research**, not the current released plugin's student feature. Always start in the PRIVATE data repository with [`STEP5-NEXT-CHAT-RUNBOOK-v0.8.md`](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/STEP5-NEXT-CHAT-RUNBOOK-v0.8.md), then [`NEXT-CHAT-HANDOFF.md`](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/NEXT-CHAT-HANDOFF.md), [`ARCHITECTURE-CONTRACT.md`](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/ARCHITECTURE-CONTRACT.md) and [`CROSS-INDEX-LINKING-POLICY.md`](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/CROSS-INDEX-LINKING-POLICY.md). **Current private research v0.8:** two same-index and two cross-index **source-locked Groq packet PREVIEWS**. Static [CI 39679151308 succeeded](https://github.com/Akshat6/marrow-cards-data/actions/runs/39679151308), but **zero actual notes-only v0.8 Groq-generated MCQs** have been medically evaluated. The next task is factual/operation/distractor feasibility analysis and explicit hold decisions, not manual ChatGPT MCQs or release.

**Binding single-home/multi-source rule:** Every integrated blueprint/question has exactly **one owning `homeIndexId`** for index practice, although the source KUs may originate in multiple actual `sourceIndexIds[]`; preserve each KU's true original index and source facts. This rule **is not yet implemented in** public-plugin experimental Step 3/4, which still rejects cross-index source KUs. Before any plugin work, inspect [Step 3 selector contract](https://github.com/Akshat6/marrow-cards-plugin/blob/feature/pyq-style-step3-notes-selector/docs/pyq-style-step3-selector-acceptance.md) on its research branch, [Step 4 provider contract](https://github.com/Akshat6/marrow-cards-plugin/blob/feature/pyq-style-step4-provider-safety/docs/pyq-style-step4-provider-acceptance.md), the actual feature-branch `main.js` and tests, and [maintenance guide](docs/plugin-maintenance.md). Source-only research packet preview files are **not** approved provider requests or clinical evidence. Never copy private KUs/PYQs/keys/raw outputs into this public repository; preserve the released manifest v0.3.11, local device-separated histories, original Review/Browse/Dynamic Recall and disabled runtime feed until separate medical and user authorization.

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

## New-chat Dynamic Recall ingestion and score-analysis workflow (v0.3.8)

For **new Marrow notes/PDFs → connected Google Sheet → source-verified private KUs → Obsidian**, read [docs/dynamic-recall-new-index-handoff.md](docs/dynamic-recall-new-index-handoff.md) first. It specifies the actual workbook, live SOP/QA tabs, current private feed, approval/source checks, and what must be logged. Older PYQ/approved-card workflows remain separate. No raw note facts or user attempt logs are allowed in the public plugin repo.

For questions about **weak/strong portions in an index**, the plugin produces **local derived Markdown reports** from actual scores at `MarrowCards/dynamic-recall/analysis/<device-id>/<index-id>.md`. The user must attach the report in a new chat (plus the original note source if a full audit is wanted); GitHub alone does not expose private device-local scores. Reports are not proof of clinical mastery and do not replace source verification.

**New chat prompt:** "Read `https://github.com/Akshat6/marrow-cards-plugin/blob/main/AGENTS.md` and the linked Dynamic Recall new-index handoff. Open the live workbook SOP and my source PDFs, reconcile and verify the index/KUs before storing or publishing anything. Use attached local analysis report if I ask which areas to revise."

## Automatic private progress summary for future chats (v0.3.9)

Marrow Cards now supports compact **private** per-device GitHub progress snapshots after local token setup. Read [the permanent KU handoff](docs/dynamic-recall-new-index-handoff.md). The public repository holds only code and instructions; the private `Akshat6/marrow-cards-data/progress/by-device/<device-id>.json` files contain numeric scores/attempt counts by stable KU ID. Future chats with GitHub access should read all private device snapshots and join to the verified private KU feed for study analysis. **Do not expect raw attempt logs or answers in GitHub**, do not claim the connected Google Sheet auto-syncs attempts, and don't assume Obsidian can sync while closed. Users must configure a fine-grained private-repo Contents read/write PAT on each device (different from the old read-only download token). Never disclose or commit tokens.

## Cloned Device ID repair (v0.3.10)

If `.obsidian` was synced from phone to tablet before exclusion, Marrow Cards may have **one shared Device ID**. The v0.3.10 settings offer **Repair cloned device ID (tablet only)**, a two-click repair after backups and confirming `.obsidian` is excluded. Only the tablet's future logs/snapshots use a new ID. All old score history and the original GitHub file remain untouched; old shared-ID attempts must not be reattributed or double-counted. See the [permanent Dynamic Recall handoff](docs/dynamic-recall-new-index-handoff.md).

## v0.3.11 — identity repair button retired

The temporary **Repair cloned device ID (tablet only)** setting described above was REMOVED in v0.3.11 after recovery. **Do not recommend looking for or using that button in current releases.** Current IDs are displayed read-only, normal startup validates or initializes missing IDs only, and no manual ID-rotation action exists. Existing local histories and private snapshots (including old shared-ID records) must be preserved as-is. Continue excluding `.obsidian` from Syncthing on each device.
