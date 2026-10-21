# Isolated home-index/multi-source **audit-only** prototype (v0.9.2)

**2026-10-22.** Branch `feature/pyq-style-home-index-audit-v092` derives from experimental Step 4. This module is **not wired into released or experimental Obsidian `main.js`** and cannot change current learner behavior. No BRAT release, main merge, version bump, runtime feed or external medical facts.

## Why this exists
The experimental Step 3/4 selector, source packet and model validator currently insist `unit.indexId === blueprint.indexId`. This is correct fail-closed protection for an older single-index schema, but incompatible with the user-confirmed later **one `homeIndexId` per question, many original source KU `indexId`s**. A new reviewed schema is required before changing those gates.

## Implemented safely
`pyq-style-multi-index-audit.js` exports `validateFullProvenance`, `selectAuditBlueprint`, `makeAuditPacket`, `checkAuditPacket`, and intentionally rejecting `dispatchResearchPacket`.

- Selection keys **only** on the single owning home index. Supporting source indexes never become an extra question home or practice counter.
- Original **`sourceKuIds[]` are exact**, lookups resolve complete Verified source units from canonical feed, and `sourceIndexIds[]` must equal their actual original index sequence. Unknown/missing/extra-in-blueprint/unverified sources fail.
- Collision and dedup policies use canonical KU-set+cognitive-operation, not a fake prediction percentage. No generated questions or externally-sourced medical statements.
- The returned packet is `NON_DISPATCHABLE_HOME_INDEX_AUDIT_STRUCTURE`, with explicit false clinical/provider/runtime flags, no media and no provider integration; its SHA-256 integrity digest is **not a signed authority attestation**.
- This preliminary research scaffold accepts only notes-only (N) or anchored (A) *hypothesis* metadata; it never certifies user-approved historical H/clinical links or reads private PYQs.
- Synthetic fixtures alone cover one source index, two source indexes, and three source indexes, with no real anatomical content. Includes adversarial source, home, spoofed approval, and question-injection tests.

## What is NOT complete
This standalone research helper has **not** replaced the production or Step4 `validatePyqStyleRuntime`, `selectPyqStyleBlueprint`, `buildPyqStyleGroqPacket`, `validatePyqStyleModelPayload`, or device-local event format. Those routines and legacy Review/Browse/Dynamic Recall remain unchanged. Before actual runtime integration, separately version and validate reviewed `homeIndexId` feed ownership, approved PYQ-specific link/image authority, true one-index display/event metadata, live model response provenance, malformed/failed Groq handling and complete regression/device testing.

**Green synthetic CI = structure only**, not medical validity, one-best-answer correctness, Groq performance, calibrated examination prediction or student release. The private data branch holds all actual Verified KUs and source-constrained v0.9.2 audit envelope; keep it PRIVATE. No user source text is copied here.
