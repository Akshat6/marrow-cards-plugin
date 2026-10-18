# Dynamic Recall — Phase 1 Groq integration

**Status on 2026-10-18: user approved direct v0.3.0 without beta; release handoff updated. Actual device validation is pending.**
Branch: feature/dynamic-recall-groq-phase1
Pre-release stable baseline: main, plugin version 0.2.10. Preserve its release assets indefinitely as rollback.

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

## 2026-10-18 real Groq scoring audit — completed, controlled public cases

- User configured a dedicated GitHub Actions environment `groq-live-test` and its `GROQ_TEST_API_KEY` secret; no value was shared with ChatGPT or committed. User explicitly authorized triggering this one-off run.
- The live workflow was triggered on dev commit `3dd255e57fac7cd305c3061be94b8497c83a01d5`: https://github.com/Akshat6/marrow-cards-plugin/actions/runs/39113855817. **Completed successfully**. The job ran the actual plugin question-generation and grading functions via Groq model `openai/gpt-oss-20b`.
- **14 actual Groq requests**, including **one batched generation of 3 questions** and **13 grading responses**. **All 13 tests passed** independently predefined ranges and required missing/incorrect feedback-field presence. Provider-reported total **7,602 tokens**.
- Observed 0–10 scoring: exact answers 10; partial answers 5, 5, 7; incorrect answers 0; medically equivalent answers 10; contradictory T8 + T10 answer 5; identical repeated answer 10 and 10 (zero variance in this one pair). These are observed scores, not guarantees for other content.
- Source data for test runner are independent common public anatomy/physiology facts ONLY. Private knowledge units, user notes, PYQ packs, proprietary PDFs, user review history and device sync data were never loaded by this test. The audit artifact contains sanitized IDs, numeric scores, pass/fail and token totals; no test key.
- **Still pending:** larger clinically reviewed sample of actual (privately held) verified KUs, long-run repeated scoring consistency, provider 50–75 grades/day rate/token limits, free-plan billing/rate-limit validation, Android phone and tablet Obsidian experience, Syncthing and offline/restart device testing. Never treat this green test as permission to merge/release.
- Dedicated key can be revoked by user after no further live testing is desired; the original device-local Obsidian Groq key is separate.

## Direct v0.3.0 release decision (2026-10-18)

- The user explicitly requested an update directly to **Marrow Cards v0.3.0** inside the same existing plugin and rejected a separate beta. The user accepts iterative fixes if devices reveal problems and wants the option to return to the preserved v0.2.10 release.
- Device-facing Android, restart, Syncthing and actual free-tier 50–75 grading/day tests are **still unverified**. Do not imply otherwise. Controlled Groq audit: 14 real requests, 13 graded answers all in expected ranges, 7,602 tokens; synthetic CI green.
- The GitHub release assets/tag for 0.2.10 remain available. See [rollback-v0.3.0.md](rollback-v0.3.0.md). Code rollback uses BRAT frozen `0.2.10`, but existing vault data is not automatically reverted. Back up the entire vault and settings **before installing** v0.3.0, especially Syncthing-shared files.
- Do not remove verified KUs, accepted PYQ cards, private packs, local legacy reviews, notes or media. The newer version must be the same plugin ID and keep both reviewer commands, strictly separate Dynamic Recall logs, and unchanged private KU/approved PYQ database.
- All postponed features remain out-of-scope until the user asks.

## v0.3.1 post-release issue resolution — 2026-10-18

- User screenshots from S23 FE showed the top Dynamic Recall header consuming space and the question moving out of view during phone answer editing; Tab S9 was not affected. Patch places question in an independent compact fixed-in-layout panel above a scrolling editor, hides the verbose header on small screens while typing, and preserves question visibility during keyboard focus.
- Dynamic Recall library now mirrors subject → system → index navigation from PYQ Review. The integrated path is **Integrated → Pulmonology → Anatomy → ANAT-R3-067/068/069/070**, sharing each index's existing KUs and stable score history with **Anatomy → Thorax**. No multi-index recall sessions added.
- Private `Akshat6/marrow-cards-data/dynamic-recall/knowledge-units.json` updated **v1.0.0 → v1.0.1** with explicit `integratedIndexIds: ["INT-PULM"]` for all 157 original units; their `id`, `indexId`, clinical source, `answer`, `sourceExcerpt`, `verification`, and user attempts stay unchanged. User expressly confirmed all four Anatomy indexes belong in Integrated Pulmonology. Future verified Medicine/Pediatrics KUs join only through explicit integratedIndexIds or existing approved card index links—not inferred from names.
- Dedicated regression `tests/dynamic-hierarchy-mobile.js` covers nested groups, overlapping paths sharing KU IDs, prospective Medicine/Pediatrics links, no inference for unlinked units, and correct DOM separation/focus classes. Scope intentionally excludes automated Sheets ingestion, offline caching, local inference, and multi-index recall.

## v0.3.2 user-requested corrections (2026-10-18)

- Integrated Pulmonology is **one collection card**, with direct **Review** and **Browse** controls. Do not display child source subjects or indexes inside Pulmonology. Use the same `INT-PULM` tags/approved links as the established PYQ integrated mapping. Individual primary subjects continue as Subject → System → Index; Integrated Review is a special collection pool explicitly requested by the user, not blanket multi-index selection.
- Both modes operate on the exact same stable KU objects. Integrated Browse shows reference answers without submitting, grading, logging attempts, or using tokens. Review still prioritizes by existing score history and uses batched question generation.
- Home AI usage forecast shows completed attempts, plugin safety-cap usage, observed tokens, last provider-reported RPD remaining when present, and an *estimated* number of further KUs computed from response observations. Groq's reference Free Plan for `openai/gpt-oss-20b` is 1,000 RPD / 200,000 TPD at time of implementation, but personal limits and account-wide TPD remaining are not verified; headers for tokens mean remaining **per minute**, not per day. Never present the token budget/forecast as an exact guaranteed account balance.

## v0.3.4 — direct index browsing and small budget indicator

- User requested **Browse for each individual index**, in addition to the existing Integrated Pulmonology Browse; when needing quick revision, tap a verified KU learning target to reveal its answer instead of generating AI questions or typing. This mode is read-only and has no request, scoring or history side effects.
- User requested **collapsed daily usage in a corner** and a deliberately pessimistic displayed question count. Default shows a short `≈ N more questions today (estimate)` when adequate daily samples exist, otherwise an estimate-pending label. Tap to expand usage and token details. Display uses floor(75% of raw estimate), e.g. 20 → 15, while making no promise about provider account quota.
- Same plugin ID and all original KU IDs/history; old approved PYQ reviewer untouched. This is a UI/safety-quality patch only.

## v0.3.5 — persistent coverage-first KU rounds (user request, 2026-10-18)

- User explicitly wants **every KU in an index scored at least once before any repeats**, even if certain responses score badly; then every KU scored a second time before any third. Daily 10-question study sessions should continue with previously unseen KUs. The user mentioned at most 1–2% optional early repeats; implementation deliberately uses **0% until round completion** to guarantee coverage.
- `dynamicRoundPlan` is derived from existing append-only scores and stable KU IDs with attempt counts, not separate round state. A manually overridden score does not add an attempt. Weak/due priority matters **within** the active round, never overrides the coverage floor. A 31-KU index with 20 attempted has an 11-KU eligible pool even if the requested session size is 25. After all 31 reach 1 attempt, the next session opens Round 2 and prioritizes low scores. Newly verified KUs begin at 0 and catch up.
- Show clear `Round n, completed/total, remaining` counters at index and integrated collection level. Integrated Pulmonology remains a special approved cross-index KU pool, original IDs and histories shared. Do not introduce arbitrary multi-index selection or offline AI question cache.
- Daily approximate remaining-question display applies **10%** buffer (e.g., 20 → 18), down from 25%. Still not guaranteed account-wide Groq allowance.

## v0.3.6: Optional KU stats in the index library

- User requested less clutter from the KU counts, round/progress text, scores and attempt statistics on the library screen. The top button toggles visibility globally across normal indexes and Integrated Pulmonology; hidden is default, and Review/Browse remain visible. No data or session logic changes.
- This new stats toggle is separate from the existing collapsible daily token/API budget. Round details inside Review still explain the current session's eligible KUs; neither history nor review scheduling is changed.

## v0.3.7 — user-confirmed index tile simplification

- Display just verified index title in each Dynamic Recall library tile, no visible index code/ID. Reuse the PYQ Review tile and compact side-by-side Review/Browse buttons (same size/style, with hidden accessible descriptive labels). Integrated Pulmonology matches the compact buttons.
- Optional expanded stats continue to show round, coverage, scoring and attempts; underlying stable IDs remain in the KU feed and attempt history. No other features or scheduling changes.
