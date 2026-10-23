# Dynamic Recall source status and authorized notes practice

The user authorized notes-only pulmonology practice on 2026-10-23, including unresolved source-review units with a visible verification notice. This permission changes study availability, not source verification or PYQ eligibility.

## Feed contract

Existing `Verified` units keep their IDs, answers and memberships. An additional `Source-extracted` or `Needs Review` unit is accepted only with complete source identity, a normalized-source-paraphrase marker, and `studyActivation: {approved:true, approvalId, scope:"DYNAMIC_RECALL_ONLY", approvedAt:"YYYY-MM-DD"}`. `reviewRequired` must match `Needs Review`; flagged units require a nonempty `reviewReason`. Missing or malformed permission is rejected. Extraction IDs may be retained as crosswalk metadata; attempts use the canonical `KU-######` ID.

These statuses mean that the answers reproduce the supplied notes. Normalized source excerpts are paraphrases, not verbatim quotations or independent clinical sign-off. The source PDF/page locator remains available for checking. New additions require their own explicit user authorization; this exception does not auto-approve future unverified material.

## Review behavior

- A flagged question displays **Flagged for review — verify this answer** in the fixed question panel before typing. The notice reveals no answer or reason.
- After grading, the reference answer and AI score are provisional. The source locator and review reason are displayed. Browse marks the prompt and reveals the warning/reason with the answer.
- Generation and grading receive source status. Grading measures recall against the notes and must not adjudicate clinical correctness. New graded attempts retain reference status, review flag/reason and `provisionalScore`; manual overrides do not remove that metadata or add an attempt.
- Revision reports identify flagged KUs and provisional scores. Strong recall does not resolve a source flag. Reports omit canonical answers and source-review reasons.
- An explicit `integratedIndexIds` tag presents the same KU in an Integrated collection. There are no copied KUs, duplicate histories or independent scores.

## Boundaries and validation

`validDynamicUnit` stays strictly `Verified` for PYQ source gates. Only Dynamic Recall pack ingestion uses `validDynamicStudyUnit`. Experimental PYQ catalogs validate their declared Verified subset of the larger KU feed; all declared source IDs and exact source identities remain mandatory. Later notes-only additions cannot become blueprint sources without separate approval and verification.

`tests/dynamic-flagged-units.js` uses 866 fictional units across 18 indexes, including 136 flags. It exercises load, shared Integrated membership/history, concealed question notices, grading payloads, saved attempts/override, Browse and revision reports. Experimental regression tests cover unrelated notes-only additions and reject flagged or undeclared catalog sources. Existing Review, Browse, mobile hierarchy and progress-sync checks remain required.

After the release, update the plugin through BRAT on each device, then use Dynamic Recall → **Check knowledge units on GitHub**. Automated mocks are not real Groq or Android validation. Preserve vault histories and keep `.obsidian` device-local.
