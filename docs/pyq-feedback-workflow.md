# Experimental PYQ-style practice — feedback workflow (v0.3.17)

## What the student does
1. Open Dynamic Recall > PYQ-style for a home index, then **Generate 1**, **10** or **20 experimental MCQs**.
2. Tap an option: the question face becomes the **answer face**, showing the model key, your choice, explanation, and all four source-attributed distractor rationales. The model key is **not medically certified**.
3. On the answer face, optionally **Bookmark** a well-designed question or **Flag** a flawed/ambiguous one. Both controls are reversible. Unmarked answered questions count as neutral. Unanswered generated questions are **not** implicitly neutral.
4. Tap **Next question** or **Finish practice**. The original device-local append-only logs remain authoritative.

## Generation
- Bulk requests use up to **two** source-locked packets per Groq call to fit the free model's per-minute token budget more conservatively. The previous three-packet requests could reserve 7,200 output tokens before including input. Valid questions become answerable while the rest of the batch is generated. Output is a JSON object with ordered \`questions\`; each answer is independently checked against its own packet and source KU identities.
- Missing/invalid items are rejected independently; valid items are kept. Temporary Groq HTTP 429 rate limits use the provider's `retry-after` header with bounded, cancellation-aware cooldowns while Obsidian remains open. Daily exhaustion, credentials or exhausted waiting budgets stop safely. If completion is impossible, the session keeps the valid questions and explicitly reports a partial batch. No quota bypass, automatic paid fallback, or guarantee of 10/20 within one minute.
- Candidate generation and attempted answers are **experimental, unverified**, never added to genuine historical PYQ packs, approved cards or Verified learning scores.
- Multi-KU relationships are prioritized at a default 60% source-supported selection target; multi-KU questions must declare at least two actually tested KUs. This does **not** prove meaningful integration or medical correctness; qualitative assessment follows from flags/bookmarks.
- Optional private generator style guidance is loaded from \`exam-intelligence/feedback/generator-guidance-v1.json\`, schema 1. It accepts only whitelisted style codes and a 0–80% integration target; arbitrary generated medical facts are never accepted as guidance.

## Correct-answer position and option shuffling (v0.3.17)
Experimental Groq MCQs retain the original model-authored A-D options, key, KU provenance and rationales. The plugin uses its existing Review option-shuffling helper for the **display only**, once per question. Display order persists while answering and when the answer face redraws after bookmark/flag interactions. Student taps map from the visible A-D letter to the original source option ID for grading, and explanations referring explicitly to “Option X” are re-labelled on screen. Position-dependent alternatives are conservatively left unshuffled. This is not a medical verification mechanism.

The local `experimental_answered` record additionally stores `displayOptionOrder` (array of original option IDs in visible A-D order), `displayedCorrectOptionId`, and `selectedSourceOptionId`, alongside the original model key and the visible selected letter. The opt-in private feedback sync retains those mapping fields so reviewers can reconstruct exactly what the student saw; old events without mappings retain their original letter semantics. No approved card, KU or historic PYQ content is changed.

## One-time opt-in private sync
**PYQ question sync is OFF by default.** In Marrow Cards settings, configure the existing **private GitHub progress write token** for \`Akshat6/marrow-cards-data\` (fine-grained token scoped only to that repository with Contents Read/Write), then enable **Automatically sync full experimental questions**. Never paste credentials in ChatGPT.

The plugin stores local event logs in \`MarrowCards/pyq-style/events/<device-id>/YYYY-MM.jsonl\` and uploads **selected event types only** to the **private** repository as \`exam-intelligence/feedback/by-device/<device-id>/YYYY-MM-DD.json\`: question with validated output and source KU excerpts; selected model key and student choice; bookmark/undo; flag/undo. **Rejected raw models, Groq keys, private token credentials, and unrelated Dynamic Recall scores are excluded.** No experimental question content is committed to the public plugin repository.

Sync is debounced after question activity and retries on Obsidian startup / periodic intervals while Obsidian remains open. Device IDs isolate phone and tablet snapshots. GitHub commits are not made for unchanged daily snapshots. Check the PYQ view status line or settings; **no promises of background sync when Obsidian is closed**. An optional **Sync now** control is provided.

## ChatGPT periodic on-demand audit
When the user says "Analyse new Marrow Tracker questions":
- Fetch \`exam-intelligence/feedback/by-device/\` from the private repository and \`exam-intelligence/feedback/review-checkpoint-v1.json\`.
- Join candidate/answer/feedback events by \`questionId\` across device/day; apply the latest bookmark/undo and flag/undo events by time; deduplicate via \`type|at|deviceId|questionId\`.
- Restrict neutral assessment to **answered** items. Skip detailed review of answered, unmarked items. Unanswered candidates are neither neutral nor evaluated.
- Review new bookmarked questions for *style* patterns; they are not facts or automatically certified answers.
- For new flagged questions, present the exact stem/options/model key and KU evidence, then propose a likely reason. Wait for user's confirmation/correction on specific causes before using those causes as validated negative guidance. Keep unresolved flag IDs in checkpoint.
- After analysis, update the private review checkpoint with processed event keys, last reviewed timestamp, and unresolved flagged question IDs. Update the guidance JSON only for confirmed failure patterns or well-supported positive trends. Retain audit history in commits; do not write medical content into public code.
- None of this retrains underlying Groq model weights. It adapts question prompts, constrained blueprint selection and structural safeguards on subsequent runs.

## Compatibility and rollout
Legacy PYQ Review, Browse, approved card packs, Dynamic Recall grading, notes and attachments, and the separate *reviewed synthetic bank* are unchanged. The old reviewed-bank and manual export controls are still available in the collapsible Advanced section, but reviewed-bank availability remains dependent on its original feed.

Synthetic Node/VM and GitHub Actions tests cover source identities, 10-item batching, card states, bookmark/flag events and consented remote snapshots. **Real Groq batches, rate limits, actual Android scrolling/touch and private-token setup must still be verified on devices.** Preserve vault backups and the previous BRAT release for rollback.
