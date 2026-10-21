# Milestone 2 Step 4 — Source-locked Groq provider contract (offline acceptance)

**Date:** 2026-10-21. **Scope:** Pipeline B → M2 → Step 4. **Branch:** `feature/pyq-style-step4-provider-safety`, forked from the Step 3 selection-engine research branch. **Disposition:** Offline engineering foundation passed. No live provider requests, clinical certification, merge, approved feed or Obsidian release.

## Gap addressed

The older PYQ-style audit-only generator assembled Groq messages directly from loose blueprint/KU fields, silently stamped source provenance on model output, checked only basic four-option structure and listed KU IDs, and on failure retained only a short rejection reason. It called the shared Groq service, which already meters each call before transport and enforces the Dynamic Recall free-tier caps; those controls are preserved.

## Implementation

In the isolated development branch's `main.js`:

1. `buildPyqStyleGroqPacket` requires exactly the selected blueprint KUs and a reviewed blueprint metadata shape, distinct original `KU-000001`-style IDs, same source index, `Verified` status, and nonempty source IDs, excerpts and PDF locators. The packet is ordered by blueprint KU IDs and limits total serialized evidence to 18,000 characters. It includes the blueprint operation and distractor intent, no history-as-fact claims, optional same-card image reference but **no image pixel interpretation**, and `UNREVIEWED_AUDIT_ONLY` provenance. No 157-KU dump or external facts.
2. `makePyqStyleMessages` produces deterministic JSON-only prompt messages requesting one A–D single-best-answer question. The source excerpts are treated as *untrusted fact data, not instructions*. The model is told to return `unableToConstruct` when the provided notes cannot justify exactly one answer plus three refutable distractors; that is intentionally a **rejected** output, not a fake question.
3. `validatePyqStyleModelPayload` checks a **strict allowlist of raw model keys**, exact blueprint/index/scope/image identity, all cited original KUs inside the packet, distinct tested IDs, four choices, per-option rationale provenance, and a matching answer key. Additional model-supplied fields such as `reviewStatus`, `approvedForPractice`, `releaseApprovalId`, `sourceAuditId`, external KU lists and asserted historical provenance are rejected.
4. `pyqStyleDraftFromModel` constructs a fresh **allowlisted** local draft with `UNVERIFIED_MODEL_DRAFT`, `approvedForPractice:false`, `eligibleForStudentPractice:false`, and explicit prompt/packet versions. It does **not** promote source-backed references to medical truth certification.
5. `generatePyqStyleAuditCandidate` accepts an **injected provider callback** for no-network testing; the actual plugin uses the existing shared `callDynamicGroq` adapter with one metered request, rate-limit/failure handling and **no automatic retry/paid fallback**.
6. Complete selected source packet, generated question and version metadata are written to the device-local append-only `candidate_unverified` event. On failure, `candidate_rejected` retains a bounded raw **parsed model JSON** (up to 12,000 chars) when available and the packet; malformed/unparsable transport content is still rejected but cannot be reconstructed verbatim from parsed data. The local event log is separate from learner answer history; no public-source uploads.

## Acceptance / evidence

**Nonpublishing synthetic CI:** [run 39650351027](https://github.com/Akshat6/marrow-cards-plugin/actions/runs/39650351027) succeeded at commit `18a059bd98ec7d450926cfeda36551ef5a094148`. The full existing PYQ-style, legacy Review/Browse, Dynamic Recall, mobile hierarchy and dry-Groq tests ran, along with new Step 4 checks for:
- KU-only packet content, exact index and original source excerpt/locator, rejection of unverified, foreign, external or missing source units;
- rejection of injected approval/release/historical claims, extra fields, wrong images/index/blueprint and unsupported KU references;
- injected no-network fake provider test confirming single request, source packet, unreviewed draft and no student permission;
- injected provider failure, `unableToConstruct` response rejection and no unapproved promotion;
- simulated HTTP 429 and unusable provider JSON each resulting in **one** metered network attempt (under mock transport), appropriate rejected audit records and no new student-facing questions;
- preexisting source, image, versioning, selection rotation, local event and legacy regression tests.

## Unresolved and intentionally blocked

**Step 4 is an interface and structural provenance boundary, not a medical semantic truth verifier.** A model can cite the correct KU while composing a medically unsupported statement; neither citation shape, key matching nor the model's own explanation proves clinical validity. Exact clinical truth and one-best-answer judgments, image-label answer leakage, examiner-style novelty and historical near-duplication require the Step 5 source/manual audits. A first real Groq batch must remain audit-only and preserve immutable raw provider outputs and token/usage metadata in a separately authorized controlled experiment.

A model's `unableToConstruct` or malformed response is **not** auto-regenerated. No promise of question volume or future PYQ prediction can be inferred from syntax passes. The approved runtime feed `exam-intelligence/runtime-approved-v1.json` remains absent. Historic direct-link claim metadata and reviewer approvals need independent user-approved Sheets/source checks before any publishing. Physical Android/Obsidian and real token/quota tests remain Step 7. No plugin manifest bump or main branch release was made.

**Next milestone checkpoint:** Step 5, notes-only medical/exam-quality validation of small carefully source-backed candidate questions, while respecting all holds and external-KU scope freeze. First review baseline exam/candidate/KU relation quality and exact source facts, then consider an explicitly scoped, limited real Groq study; do not enable the live bank merely because Step 4 CI is green.
