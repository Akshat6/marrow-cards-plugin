# Dynamic Recall — Phase 1 Groq integration

**Status on 2026-10-18: development branch only. NOT a BRAT release.**
Branch: feature/dynamic-recall-groq-phase1
Current installed stable branch: main, plugin version 0.2.10.

This file is the canonical **new-chat handoff**. Future developers and ChatGPT sessions must read this file, docs/plugin-maintenance.md, current branch, open PR and live Google Sheets before changing the plugin. Existing PYQ functionality and user data must not be disrupted.

## Core user requirements

- SAME Obsidian plugin, two separate modes.
- Existing command ID open-marrow-cards stays identical; visible name changes to Open PYQ Review; implementation unchanged.
- New command ID open-marrow-dynamic-recall opens separate view marrow-dynamic-recall.
- Study the growing set of verified knowledge units. On October 18 2026 the database has **157 KUs** (not 156): ANAT-R3-067 31, ANAT-R3-068 32, ANAT-R3-069 42, ANAT-R3-070 52. More are expected every day. No hardcoded count ceiling.
- Generate an open-response question per KU with Groq, batch up to 10 generation prompts/request, then score each typed answer with AI on an **integer 0–10 scale**. Display the canonical answer, what was correctly recalled, missing/incorrect facts, feedback, and allow manual numeric-score override.
- Persist attempt history against STABLE KU ID even if question wording changes. Prioritize weak/due or new units; **lower numeric scores become due sooner**; no fixed deck question bank.
- Target 50–75 AI-graded questions/day using Groq's genuinely free-tier allowance; local cap is 75 grading requests and 125 total AI requests per UTC day. Provider rate/token ceilings can independently be smaller. No automatic paid fallback.
- After 1–2 months stable cloud use, potentially support local AI on Galaxy Tab S9, S23 FE or Surface Pro 7. Leave provider integration isolated for future replacement.

## Source of truth and exact paths

Public plugin: Akshat6/marrow-cards-plugin. All phase 1 plugin changes in feature/dynamic-recall-groq-phase1 branch, NOT main.
Private data: Akshat6/marrow-cards-data. Legacy manifest.json and approved static packs stay untouched.
New private KU export: dynamic-recall/knowledge-units.json on main in the PRIVATE data repo, separate from legacy manifest. Initial version 1.0.0 contains 157 verified units.
Canonical Google Sheet: Marrow Dynamic Recall Database, ID 1ZK_Tvz4rKi10hSVU-_j2aN-PKrPx4i9otqLDxdlqqmE. Read 00 READ FIRST and 01 SOP, 03 APPROVAL RULES, 05 QA before making future source edits.
Approved cards: 9 specifically user-approved Anatomy PYQs, mapped via 11 VALID links. Do not infer that other GitHub card/index pairs are approved.
Source completeness: full 16-page microscopic diagram-label audit still pending; do not misrepresent extracted 157 as exhaustive.

## Code structure

- main.js retains original MarrowCardsView and MarrowCardsPlugin.
- Second view MarrowDynamicRecallView and DYNAMIC_* helpers appended to main.js, because the existing BRAT delivery system distributes only main.js, manifest.json, styles.css. Do NOT split runtime code to a module without adding a supported packaging/build system.
- styles.css: additive .marrow-dynamic-prefixed rules; no legacy CSS replacements.
- tests/smoke.js: existing legacy contract; do not weaken tests.
- tests/dynamic-smoke.js: synthetic KU feed, AI mock, isolated logs, 0–10 scoring, numeric override, older categorical event compatibility, score-based priority and malformed/429 error handling.
- .github/workflows/dynamic-recall-ci.yml: PR validation only, does not publish.
- Model openai/gpt-oss-20b, endpoint https://api.groq.com/openai/v1/chat/completions; JSON object response mode, AI output validated and errors fail closed.
- Credentials: Obsidian SecretStorage key marrow-dynamic-groq-key, device-local, never committed, pasted or synced.
- Privacy: each Groq request sends relevant private KU answer/excerpt plus user typed answer; it never sends the static PYQ image/card pack or full PDF.
- The separate AI call function is callDynamicGroq. Provider replacement later should keep grading and history format stable.
- Grading prompt requires a 0–10 integer score grounded solely in the verified canonical answer, with correct/missing/incorrect evidence and no additional textbook requirements. Broad mastery buckets are derived only for display/scheduling (0–3 Wrong, 4–7 Partial, 8–10 Correct); the numeric score is authoritative. Grading remains fallible and a numeric override is append-logged.

## Vault isolation — critical

Legacy paths MUST remain unchanged:
MarrowCards/packs/
MarrowCards/media/
MarrowCards/reviews/<device-id>/YYYY-MM.jsonl
MarrowCards/notes/<card-id>/

New paths only:
MarrowCards/dynamic-recall/units.json
MarrowCards/dynamic-recall/attempts/<device-id>/YYYY-MM.jsonl
MarrowCards/dynamic-recall/usage/<device-id>/YYYY-MM.jsonl

Event log is append-only, actual typed attempts recorded only after a successful AI grading response; overrides append an extra event for the same attempt ID. Request usage logged BEFORE network call so repeated provider errors cannot silently bypass the device cap. Usage is counted in UTC days. Both devices keep distinct IDs when .obsidian is excluded from Syncthing. Cross-device usage caps can temporarily diverge before sync; Groq's upstream free limits still apply.

## Updating daily growing KU feed

1. Read live Google Sheets workbook SOP and all current rows of Knowledge Units.
2. Export all verified KU records using stable KU IDs and exact PYQ_Index_ID. Include id, indexId, indexTitle, promptTarget, answer, sourceExcerpt, sourceLocator, verification. Preserve previous IDs; add new verified records and correction revisions. Never automatically include Needs Review units.
3. Bump version from 1.0.0 to 1.0.1 and onward; add exportedAt. Check unique IDs, matching index IDs, no accidental deletions and no prohibited PYQ inference.
4. Update ONLY the private GitHub data repository file dynamic-recall/knowledge-units.json. DO NOT update the old private manifest or approved static packs.
5. Open Dynamic Recall on devices and click Check knowledge units on GitHub. Confirm count and new index list. Existing Open PYQ Review → Check GitHub remains independent.
6. Preserve existing local attempt logs across feed updates, including questions generated from earlier canonical versions. Do not corrupt user history.
7. If conflict between canonical answer and old attempts, record a correction and potentially request review, not silently overwrite past attempts.

## Rollout and testing checklist

- Verify node --check main.js, node tests/smoke.js, node tests/dynamic-smoke.js all PASS. New PR workflow should check both suites.
- Never bump manifest.json or merge to main before CI passes and the rollout is explicitly discussed.
- Live Groq API calls have NOT been verified; user must enter API key privately through Obsidian settings on device. Never request key in chat or write to GitHub. Verify model, JSON parsing, throttling/429, no-paid-fallback and real token use.
- Verify original PYQ Review: option selection across 2nd/3rd cards, Browse behavior, image display, manual flip, notes including ink, cleared selections, private GitHub sync, existing review totals, Android startup, phone/tablet install.
- Verify dynamic study on S23 FE/Tab S9: index list, 10-question batches, 50–75 daily grading, **numeric scores and evidence**, manual 0–10 override, no double submit, preserved text after error, change index, restart, no connectivity, quota exhaustion, Syncthing and independent device logs.
- Avoid publicly releasing proprietary KU excerpts or approved PYQ question content. Public tests MUST use synthetic made-up facts.
- Remaining incompleteness: no live Groq key/test, no Android device tests, no released plugin; offline generated-question cache and fully local AI not implemented.
- The public plugin's existing main-only workflow automatically publishes a prerelease on main pushes, so development MUST stay on branch/draft PR until verified. BRAT updates require final version bump and tested deployment later.

## New-chat starting prompt

Open GitHub repo Akshat6/marrow-cards-plugin, branch feature/dynamic-recall-groq-phase1, and read docs/dynamic-recall-phase1.md and docs/plugin-maintenance.md; read its draft PR, smoke tests and Groq API implementation. Also inspect current private dynamic-recall/knowledge-units.json and Google Sheet for new verified KUs. Continue feature development and tests without touching main/release, static PYQ packs, old MarrowCards/reviews, user notes or media. Do not assume live Groq or Android validation has happened until documented in this file.


## 2026-10-18 implementation log / independently verified checkpoints

1. Created isolated plugin branch feature/dynamic-recall-groq-phase1 from v0.2.10 main. No code, release manifest or deployment was changed on main.
2. Added new command / independent view, batched question generation by KU, typed response and strict JSON grading (updated to integer 0–10 scoring), append-only grading plus override events, independent quota usage logging, local secure Groq key settings, separate CSS selectors.
3. Published independent PRIVATE data feed at Akshat6/marrow-cards-data/dynamic-recall/knowledge-units.json, version 1.0.0 containing 157 verified Anatomy units. Existing private approved-card manifest and packs unmodified. Added private-feed README for future export work.
4. Added synthetic tests/dynamic-smoke.js and PR-only Dynamic Recall CI workflow. Existing tests/smoke.js unchanged. Automated run https://github.com/Akshat6/marrow-cards-plugin/actions/runs/39107462188 PASSED on code commit 8849ea485b3aeeb6b8883c7d3f3ae7f940eb5e0c (Node syntax, legacy reviewer tests, dynamic synthetic mocked AI tests). No real Groq API key or Android device involved.
5. The development PR is https://github.com/Akshat6/marrow-cards-plugin/pull/1 (draft; do not merge/release yet). Main plugin version remains 0.2.10.
6. Added progress per selected index (KUs ever answered / total, most recent correct/partial/wrong, total attempts). Added local daily request, grade and token summary. Added no-downgrade/no-disappearing-KU checks when fetching a newer private unit feed.
7. Model selected: Groq openai/gpt-oss-20b with low reasoning effort, JSON output. Provider quota official reference https://console.groq.com/docs/rate-limits. The exact per-account free ceiling must be checked when key is set.

**Pending before anything touches the installed plugin:** actual free Groq request validation with device-local token; negative/error and rate-limit behavior; real S23 FE and Tab S9 UI/regression checks; document and resolve any defects. User should NOT paste a private token into chat.

**Additional known Phase 1 limitations:** history lives in local Obsidian vault (Syncthing-copyable), not automatically in Google Sheets or ChatGPT; no live online Sheets ingestion watcher; generating a KU feed update is a separate explicitly requested operation; one index per Dynamic Recall session; no offline LLM; Groq remains an external cloud processor of snippets and typed answers.

## 2026-10-18 Phase 1 scoring refinement — development branch only

- The initial three-category AI result has been replaced by an **integer 0–10 score**, with `correct`, `missing`, `incorrect`, and `feedback` strings. Score validation rejects malformed, fractional or out-of-range output before any attempt is recorded.
- The AI must grade only the essential facts in the verified KU reference answer, allow medically equivalent wording, avoid invented textbook criteria, and deduct for contradictory claims. Scores are still AI estimates; the clinical accuracy of the rubric requires live model and human spot checks.
- Scoring interpretation: **0–3 Wrong, 4–7 Partial, 8–10 Correct**. Scheduling gives 0–3 immediate priority, 4–7 next-day priority, 8–9 a longer interval, and 10 the longest interval. The numeric score is saved and drives recall priority.
- Overrides now select **0 through 10** and append a correction event to the existing attempt ID. The original AI grade is not deleted. The index view shows average numeric score alongside its original coverage/attempt totals.
- Older categorical logs remain readable and still influence priorities; **no artificial scores are backfilled** into old attempts. PYQ history, cards, media, notes, `main`, and the static data manifest stay unchanged.
- Follow-up gate: inspect the newest GitHub CI run and then validate the real Groq model and Samsung phone/tablet behaviour before any merge, BRAT release, or version bump.
