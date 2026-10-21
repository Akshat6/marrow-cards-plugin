# PYQ-Style Practice — Milestone 2 gated prototype (feature branch)

**Branch:** feature/pyq-style-practice-m2
**Created:** 2026-10-21
**Status:** Development only, not a BRAT release; existing public main/plugin version **0.3.11** unchanged.

## Why this is deliberately gated

The Milestone 1 intelligence files in the **private** data repo are research drafts:
- 9 approved historical Anatomy PYQ analyses,
- 70 candidate KU co-tests plus three held, 
- a priority-lane policy, and
- 14 draft blueprints (11 *conditional offline test* candidates, 3 held).

Those records **must not** be interpreted as medically validated synthetic four-option MCQs or an approved runtime bank. The new interface **will not** load any of those draft files as a runtime feed. A separate future private file, currently **not published**, would need to be approved:

\`exam-intelligence/runtime-approved-v1.json\` (private)

It must be a distinct \`schemaVersion:1\`, \`kind:"marrow-pyq-style-runtime"\`, \`status:"APPROVED_FOR_RUNTIME"\`, \`approvedRelease:true\` release with vetted generator-eligible blueprint packets and independently verified synthetic MCQs. It is **intentionally absent** at the start of this branch's work. Do not change draft flags or publish it merely to make a button work.

## What is implemented in the development branch

The existing Dynamic Recall **Subject → System → Index** tiles retain **Review** and **Browse** and add a third **PYQ-style** action. Integrated views and the separate legacy PYQ Review have not been repurposed. Clicking the new action opens a separate mode; it does not count old KU Review grading or alter previous attempts.

On the new PYQ-style screen:
- **Check reviewed MCQ feed:** fetch and validate only the separate private *approved runtime* feed. Refuses missing, draft, unverified, wrong-index/KU, malformed or duplicate data without overwriting approved original cards. Cached local path: \`MarrowCards/pyq-style/approved-runtime.json\`.
- **Practise 10 / 20 reviewed MCQs:** if a future verified synthetic question bank is installed, present each question with A–D and an approved original image where authorized, grade the chosen letter deterministically, and show all option explanations. No separate AI grading request.
- **Generate ONE audit-only draft with Groq:** a separate future reviewed *generator eligible* blueprint plus current verified KUs is sent to the existing Groq adapter. Its **unreviewed output is only archived**, never offered as a medically correct question for practice. The same local Groq request counter and free-tier safety cap are reused; no paid fallback.
- **Flag question for review:** append a flag event, not an overwrite.
- **Export generated questions + answers:** write an explicit per-index JSON export in the vault for user-controlled ChatGPT analysis; ChatGPT cannot access the local Obsidian data without that export or a supported connection.

Raw local data path:
\`MarrowCards/pyq-style/events/<deviceId>/YYYY-MM.jsonl\` (append-only)
\`MarrowCards/pyq-style/exports/<deviceId>/batch-*.json\` (user-controlled exports)

Each saved \`question\` event retains complete exact stem, options, answer key, per-option explanation, KU IDs, source review audit ID and feed version. Each \`answered\` event retains actual chosen option, correctness, response time, blueprint ID and time/device ID. Generated audit-only candidates are stored separately as \`candidate_unverified\`; none counts as historical PYQ evidence or student performance. This uses existing isolated per-device stable identity and vault writing mechanisms.

**Approved original-image-only rule:** An image is displayed only if the exact named original asset is attached to a currently approved card for that source index and downloaded under \`MarrowCards/media/\`. No new images, note diagrams, overlays or replacements.

## Current limitations — do not treat prototype as ready for clinical release

- **No approved runtime feed exists yet.** The UI is intentionally gated; practice and candidate generation will report that no reviewed content is available. Do not enable the Milestone 1 draft JSON directly to bypass the gate.
- Structural checks verify four options, a consistent answer key, KU source references, original image membership and status. They **cannot prove** the clinical correctness or unique best answer of actual natural-language MCQs. A small real Groq generation run and ChatGPT/human medical audits must follow separately.
- Original source image labels can reveal an answer. Human/semantic checking of stem versus image content remains mandatory before any question is promoted into the verified bank.
- The early prototype uses a **single source index at a time**, not freely merged integrated collections. It deliberately keeps source-traceable scope strict.
- Export writes a new vault JSON file, not a GitHub upload. Any personal history remains local unless the user explicitly supplies an export.
- It does not automatically build a complete verified bank, compute calibrated future-exam probabilities, train Groq weights, or validate real Android taps.
- Draft versions and privately approved exam content must never be copied into public test source.

## Synthetic regression coverage
\`tests/pyq-style-smoke.js\` verifies rejection of research drafts and unreviewed synthetic bank entries, original-PYQ image membership and local media availability, strict A-D structure and correct key, single attempt/flag writes, export, audit-only candidate separation, unchanged old vault areas, and Groq call metering, using **imaginary** KUs/MCQs only. Existing smoke and Dynamic Recall regressions are run through the non-publishing feature-branch workflow \`.github/workflows/pyq-style-validation.yml\`. The workflow **does not release** the plugin.

Do not merge this branch or increase the public manifest version until CI passes, a small source-audited real output batch demonstrates medically sound MCQs, protections are tested on physical Android devices, and the user explicitly authorizes release.

## Cross-chat handoff
Read these exact starting points before continuing:
1. [Private Milestone 1 intelligence handoff](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/milestone-1-handoff-v0.1.md) and [permanent changelog](https://github.com/Akshat6/marrow-cards-data/blob/main/exam-intelligence/CHANGELOG.md)
2. Public \`AGENTS.md\`, \`docs/plugin-maintenance.md\`, live branch \`main.js\`, \`styles.css\`, \`tests/pyq-style-smoke.js\` and any CI failure
3. Live private KU feed, original approved cards/explicit links, approved original media and index map before publishing any runtime feed
4. Keep existing \`Review\`/\`Browse\`/legacy review/notes/score histories intact. Log all subsequent changes, SHA and verification results, remaining blockers.

Next work after this feature branch prototype: improve medical/semantic validation and question quality via a **small, separately reviewed** output sample; make a runtime-approved content release only after review; repeat regression and Android tests; only then consider a user-authorized plugin release.
