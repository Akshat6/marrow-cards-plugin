# PYQ-style Milestone 2 — Step 2 feed foundation acceptance

**Date:** 2026-10-21. **Target:** Pipeline B / Milestone 2 / Step 2. **Branch:** `feature/pyq-style-step2-feed-hardening`, forked from `feature/pyq-style-practice-m2`. No merge or release.

**Scope policy:** `VERIFIED_MARROW_KUS_ONLY` as agreed by the user. No `EXKU-*`, external medical truth completion, historical-PYQ-as-source shortcuts, live synthetic question publication or modification to the existing Review/Browse/legacy PYQ modes.

## Concrete engineering changes

`main.js` PYQ-style validation now requires:
- top-level approved-release gate plus syntactically valid SemVer, safe release and release-audit IDs, exact `sourcePolicy=VERIFIED_MARROW_KUS_ONLY`, exact `sourceKuPath=dynamic-recall/knowledge-units.json` and `externalKnowledgeEnabled=false`;
- each blueprint's source scope as original verified Marrow notes, `externalKnowledgeUsed=false`, no populated external-KU references, distinct canonical `KU-000001`-style IDs, and actual same-index verified KUs with nonempty source ID/locator/excerpt;
- each verified question references one eligible blueprint, valid A–D answer/rationales and distinct tested source KUs, explicit `VERIFIED_SYNTHETIC` status, source audit ID, `approvedForPractice=true`, and question `releaseApprovalId` matching the feed's `releaseId`;
- an unchanged original approved-card image must be attached to the same source index **before a feed containing it is accepted**, and the image reference must match the specific blueprint and question. Physical local media availability remains a display/practice check. Image-label leakage requires **later human visual QA**;
- remote update must be **newer than** the validated local feed, or **byte-equivalent JSON semantics at the same version**. Same-version altered content and version downgrades are rejected before any local file modification. Invalid/corrupted cache cannot be used from retained memory.

Additional test-only semantics: the synthetic test dataset uses fake anatomy and dummy IDs patterned like canonical original KUs. It has no original question text, no clinical truth, no student responses and no GitHub secrets.

## Step 2 acceptance tests

| Check | Result |
| --- | --- |
| Separate approved feed path and runtime status gate | Tested |
| Strict original-verified-KU-only scope in feed, blueprint and question | Tested with negative fixtures |
| Missing/nonverified/cross-index/untraceable or external source KU rejection | Tested with negative fixtures |
| Duplicate blueprint/source-question IDs and options | Tested |
| Release ID/audit ID and per-item release approval consistency | Tested with synthetic records; **not proof of actual approval** |
| Original approved card image membership and blueprint matching | Tested without publishing original images |
| Cache version downgrade / silent equal-version content change | Rejected; local cache unchanged |
| Valid version upgrade | Tested with synthetic records |
| Corrupted local cache clears in-memory use | Tested |
| Existing Review/Browse and Dynamic Recall regressions | Passed through existing CI suite |
| Physical Android/Obsidian UI and real GitHub token integration | **Not yet tested; Step 7** |
| Independent medical examination review and actual approved bank | **Not completed; Step 5** |
| Runtime feed publication and user-authorized plugin release | **Not authorized** |

**CI:** [PYQ-style branch validation](https://github.com/Akshat6/marrow-cards-plugin/actions/workflows/pyq-style-validation.yml), on `feature/pyq-style-step2-feed-hardening`. First run found a stale test error-message expectation (rejection itself was correct). Revised full suite passed at commit `22c4aa47584a51febab3f6c5d86ee07c3fb2f043`, run `39646876512`.

## Important limits

The feed loader **cannot verify a human reviewer or clinical accuracy merely from fields declaring approval**. `sourceAuditId`, `releaseAuditId` and `approvedForPractice` are *structural placeholders until an actual independently audited review record and explicit release decision exist*. Factual claims and every plausible distractor still require per-question independent review in Step 5. Step 2 **engineering foundation passed synthetic CI**, not production feed readiness.

The approved private path `exam-intelligence/runtime-approved-v1.json` remains **absent**. Do not fabricate a runtime file to satisfy UI conditions. No candidate is approved or selectable for students. Network/server-side revocations after a previously cached approved feed, loss of the user's read-only private GitHub token, real device semantics and future multi-subject indexes need Step 7 acceptance testing and a release/rollback policy.

**Current checkpoint:** Step 2 foundation may be marked **offline acceptance passed, production activation blocked by Step 5 and release authorization**. Next sequential task is Step 3 selection-engine audit with the same strict notes-only policy, then Step 4's bounded Groq contract, then resume Step 5 for medical/source and examiner-quality validation. No extra Groq calls are needed to complete this Step 2 handoff.
