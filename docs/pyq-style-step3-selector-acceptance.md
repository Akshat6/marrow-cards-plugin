# Milestone 2 Step 3 — Notes-only blueprint selection offline acceptance

**Date:** 2026-10-21. **Status:** Offline implementation and automated acceptance passed; not published, not merged, not medically approved. **Base:** Step 2 gate branch `feature/pyq-style-step2-feed-hardening`. **New isolated branch:** `feature/pyq-style-step3-notes-selector`.

## The problem corrected

The old audit-only Groq entrypoint selected `this.feed.blueprints.find(b=>b.indexId===indexId)`. It always returned the first matching blueprint and had no meaningful per-KU coverage, selection reason, duplicate-operation suppression or historical-evidence lane review. Although the underlying feed already required a formally reviewed runtime package, this would have concentrated attempts on the first blueprint if a genuine feed were eventually approved.

## Implemented gates

- `selectPyqStyleBlueprint(feed,units,cards,indexId,events)` first calls the Step 2 approved-runtime structural validator. It never reads the 70 proposed combinations or 14 disabled source blueprints as if they were approved. No returned candidate means no model call.
- No external medical facts. All referenced IDs must be exact canonical original KU IDs, currently `KU-000001` style, and must have verified source excerpts/locators and same-index scope.
- `H` and `A` blueprints require explicit historical link records: approved source card for the same index, direct KU ID in the proposed blueprint, declared approval record, `Confirmed` correlation and `VALID` eligibility. `A` requires two or more source KUs. `H` is an observed **pattern** connection, not certification of a new model's medical truth. This is a **metadata claim check**, NOT an independent live Google Sheet attestation. Exact original link IDs and pairs must be checked separately before eventual release.
- `N` requires at least two original KUs and must not claim observed historical links. `S` requires precisely one original KU and likewise carries no historical claim. Zero-history indexes can work with N/S; no fabricated H evidence. No global H-first preference.
- Deduplicate same KU-set/cognitive-operation blueprint signatures for selection.
- Prefer least-selected blueprint, then less-exposed source KUs, then underused evidence lanes, then cognitive operation, with stable source ID tie-breaking. The decision does **not** use uncalibrated examination probabilities, fake grades or fixed percentage quotas.
- Read only actual local `blueprint_selected` events; append full source KU IDs, lane, operation, policy, rationale, counters and null future-exam probability **before** a Groq audit-only request. Any generated draft is still saved exclusively as `candidate_unverified`, not learner-facing content.

## Verification

**Public plugin synthetic CI:** [run 39648458663](https://github.com/Akshat6/marrow-cards-plugin/actions/runs/39648458663) succeeded across PYQ-style and existing Review, Browse, progress, mobile-hierarchy simulations and Groq dry-run regressions. Tests now cover cold-start notes-only selection, history-informed rotation, no candidate if index empty, duplicate-suppression, H/A link metadata rejection, N/S provenance restrictions and actual append-only selection trace.

**Private real-data ledger CI:** [run 39648868810](https://github.com/Akshat6/marrow-cards-data/actions/runs/39648868810) succeeded on isolated `feature/notes-only-step3-evidence-audit`. It reads the exact original KU, historical-card, candidate, priority and blueprint snapshot, with hash locks; verifies 157 original verified KUs, H=9, A=13, N=57, X=3, S=157, 11 distinct verified link records mapping 10 KUs, **0** direct H observations for `ANAT-R3-069`, and **0** runtime-eligible original blueprints. Ten adversarial source mutations are rejected.

## Explicit open blockers

- `verifiedHistoricalLinkId`, `approvalId` and `releaseAuditId` fields are not a signed proof of actual approval. The original Sheets' approved pairs must be checked against the user-approved source records during the content-review/publication gate.
- Lexicographic coverage fairness is a deterministic policy design, not proof of educational optimization or future examination prediction. Actual user score-based adaptive revisits remain unimplemented and are **not** simulated.
- Near-duplicate lexical stems and option-level medical correctness cannot be known from blueprint metadata. These belong to Step 5.
- No genuine release-reviewed runtime feed exists and the current student-facing plugin remains unchanged. Physical Android/Obsidian taps and GitHub token network failures remain Step 7 acceptance.
- This branch remains private/research-level development; no PR merge, plugin manifest increase, new provider call, historical card edit, external KU activation or student attempt has occurred.

**Disposition:** Step 3 **offline engineering foundation accepted**. Next do Step 4 provider-neutral Groq contract/typed input validation and failure handling, then resume Step 5 clinical/source and examiner-quality review before any approved feed is published. 
