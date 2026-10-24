# Daily Quest — proposed lightweight Obsidian review mode (feature branch)

A **third view inside the existing Marrow Cards plugin**. Not a new plugin, separate question bank, static .canvas board, or replacement for original PYQ Review / Knowledge Dynamic Recall.

## Student experience

- Obsidian command **Open Daily Quest** or sparkles ribbon icon.
- Minimal Android-first dashboard: **30 cards/day**, progress bar, streak (2+ rated items/day), and **three 10-card blocks**.
- Start, read prompt, reveal source answer, then tap **Again / Got it**. Original PYQs with safely resolved keys support one-tap MCQ grading and answer/explanation. Relative/positional choices are not shuffled.
- Knowledge-unit cards show the existing source promptTarget and reference answer. No Groq calls or typing required.
- Flagged Needs Review KUs display a verification warning and retain provisional status; source reasons appear only on answer reveal.
- A daily stable ordered list is created on Start. Reopening resumes remaining cards. Explanations stay visible after grading until Next.

## Initial scope — checked against the private live manifest 2026-10-24

Source index IDs, never an INT-PULM alias:
- Anatomy Thorax KUs: ANAT-R3-067 to ANAT-R3-070 (157 KUs). Existing ANAT-R3-074 Mediastinum PYQs are also included.
- Pediatrics: PED-RESP-04 Cystic Fibrosis original PYQs. There is no current Pediatrics KU feed.
- Medicine: MED-PULM-01 through MED-PULM-08, ending at Respiratory Failure and Acute Respiratory Distress Syndrome (419 KUs).

Current eligible pool: **576 KUs and 32 approved distinct PYQs = 608 items**. Counts are a snapshot, not hardcoded. Higher Medicine indexes, MED-PULM-NA, pending questions and other subject homes remain excluded. By default select up to 8 PYQs and 22 KUs per day, interleaved; fill missing slots from the other type.

## Review scheduler and data isolation

- Rank overdue weak/due items ahead of unseen, then recently strong items; stable day+item tie-break. Source PYQ right/wrong and Dynamic Recall last AI grade influence priority, as does Daily Quest's independent recent self-rating.
- Scheduling intervals (roughly 1 day after weak/Again, 4 days after good) are initial practical heuristics, not a validated individualized memory algorithm.
- Day plans: MarrowCards/daily-quest/days/YYYY-MM-DD.json with stable item IDs only.
- Self-rated event history: MarrowCards/daily-quest/attempts/<device-id>/YYYY-MM.jsonl, one append-only JSONL event per rated answer. No private questions, answers, images or raw medical details in these logs.
- **Never overwrite** existing PYQ Review event logs, Dynamic Recall graded attempts/scores, source cards/KUs, private data manifest, My Notes, images or secrets. No cross-mode score inflation.
- Syncthing copies the new local Daily Quest directory with the vault. Finish syncing before switching devices; parallel edits can conflict. Continue excluding .obsidian from Syncthing.

## GitHub change mechanism

A validated JSON selection policy is now in the **private data repository**, at daily-quest/policy.json; the plugin caches it at MarrowCards/daily-quest/policy.json after you tap **Update selection rules**. It covers daily goal (10–50 in whole blocks), PYQ quota, block size, weak/good review intervals and source index whitelist. ChatGPT can change it on GitHub when requested; tapping Update selection rules in Obsidian fetches the new policy without a BRAT code release. Cached rules work offline; a pre-existing daily plan stays fixed until the next calendar day. The embedded DAILY_QUEST_POLICY provides safe defaults. New selection algorithms or UI code still require tested BRAT plugin updates on both devices. This mode does not create external notifications or operate while Obsidian is closed.

## Acceptance / release

This feature branch is NOT a live student release. Run node tests/daily-quest.js and all legacy CI regressions. After CI, Android device verification remains necessary for 10/20/30-card transitions, original figures, flagged notices, answer visibility, offline review and cross-device sync. No synthetic examples or proprietary data in the public repository.
