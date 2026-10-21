# Full-intelligence Experimental PYQ-style MCQs (v2, opt-in)

This implementation replaces the two-blueprint pilot selector, **not** the medically approved runtime bank. Private source: `exam-intelligence/experimental/ai-mcq-full-v2.json` in `Akshat6/marrow-cards-data`. It must remain private. Existing `ai-mcq-study-v1.json` and release 0.3.13 remain untouched for rollback.

## Content coverage
- 157 original Verified Anatomy KUs retained with original source index, locator, excerpt, answer and target.
- 73 analyzed relationship records (19 P1, 36 P2, 15 P3, 3 X), plus 157 single-KU fallback targets.
- Total 230 intelligence records; **224 exploratory selectable records**, with six explicit holds: 018, 060, 066, 071, 072, 073. Held items stay in the analyst catalog and cannot be sent to Groq.
- All 4 initial Anatomy index homes have selectable candidates. For cross-index relationships, one immutable `homeIndexId` controls display, while `sourceIndexIds[]` and `sourceKuIds[]` retain each factual origin.
- P1/P2/P3 are analyst investigation priorities, **not examination probabilities**. Original historical questions are examiner-style evidence only, never new medical facts.

## Generation behavior
The Obsidian controller loads the *full private index intelligence feed* but selects exactly one eligible source-verified concept blueprint per request. It chooses among the least-used blueprints, favors under-used cognitive families, uses analyst priority and KU exposure to break ties, and records the selection **before** the provider call so failure does not trap the user in the same topic. The provider receives only the selected original Verified KU excerpts, an analyst operation/constraint summary, and up to 8 recently generated stems for novelty avoidance. It does **not** receive all 157 KUs in one giant prompt.

Groq writes one new stem, A–D answers, one key and four source-referenced rationales. Wrong source identity, malformed option lists, unknown KUs, extraneous history, hard-source conflicts and exact/very-close recent duplicates are rejected. No automatic paid fallback or retry. The selected KU packet still has a bounded 18k-character size to preserve quota and source auditing; this is **not a cap on eligible KUs or blueprints in the index intelligence library**.

Unverified Groq results are clearly marked experimental, stored in isolated device-local `experimental_*` events and **do not affect Verified study scores**. Software checks do **not** establish clinical accuracy, uniqueness or true future-PYQ predictiveness. The user should flag poor answers and export batches for independent review. A model may return `unableToConstruct` for sparse source KUs; no quota can guarantee six clinically sound questions.

## Display fix
`styles.css` overrides fixed theme button heights on PYQ-style options (and legacy MCQ choice buttons): full width, auto height, no max height, wrapping, multi-line whitespace and normal vertical separation. Long 4–5-line answers should occupy their own buttons rather than overlap subsequent options.

## Regression and device gates
`tests/pyq-style-experimental-integration.js` now checks more than 30 synthetic blueprints, a held blueprint, standalone KU schema, model identity tampering, coverage-aware rotation, duplicate rejection, multi-index source origins, local logs, export and long-choice markup/CSS. The publishing CI also runs prior Review/Browse/Dynamic Recall mobile and plugin smoke suites. Physical Android phone/tablet wrapping, real Groq medical soundness, API/quota behavior and BRAT updates still require on-device checking.

**Rollback:** keep the 0.3.13 release and the old private v1 study feed. Always back up the Obsidian vault including notes and event files before updating through BRAT. This revision changes no original question pack, media, verified KU record, user scores, local event identity or approved runtime feed.
