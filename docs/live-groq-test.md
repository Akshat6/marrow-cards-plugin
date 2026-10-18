# Real Groq scoring quality audit — Phase 1, opt-in only

This audit tests the **actual Dynamic Recall grading and question-generation functions**
using a *dedicated testing* Groq key, but **never uses your private KU feed,
PDFs, personal recall answers, approved PYQ packs, or vault data**. All test
reference answers and variants are independently authored, generic medical facts
stored in the public script.

## Current status

- The ordinary PR workflow runs `node tests/live-groq-eval.js --dry-run`;
  this uses a simulated API response and **no Groq API key**.
- Live requests have NOT run yet until the owner securely sets up the environment
  and deliberately authorizes the one-off development-branch trigger.
- `main` and the stable installed plugin version **v0.2.10** remain unchanged.

## One-time owner setup (never paste a key into chat)

1. At <https://console.groq.com/keys>, create a dedicated **test-only** Groq
   API key in a free-tier project. If possible, use a separate project with
   conservative limits. Keep its value off GitHub issues, chats, commits and logs.
2. Visit <https://github.com/Akshat6/marrow-cards-plugin/settings/environments>
   and create an environment with the **exact name** `groq-live-test`.
3. Restrict **Deployment branches and tags** to **Selected branches and tags**,
   allow one branch only:
   `feature/dynamic-recall-groq-phase1`.
4. Under **Required reviewers**, add the repository owner `Akshat6`, if
   available. *Do not* enable "Prevent self-review" if the owner will initiate
   or approve the run; otherwise a second reviewer would be needed.
5. Under the environment's **Environment secrets** (not regular repo secrets),
   add secret **Name:** `GROQ_TEST_API_KEY` and **Value:** the new testing key.
   GitHub encrypts it; neither ChatGPT nor the plugin receives the value.
6. Tell the assistant only **"Groq test environment configured"**. Never send
   the actual key or even a partial fragment.

GitHub environment secrets are isolated to jobs referencing the named
environment and, if required reviewers are enabled, the job cannot access
them until approved. The plugin branch's live workflow does **not** run for
ordinary pushes, PRs, or pull_request_target. It runs **only on a deliberate push
that creates/changes** `.github/live-groq-test-request.txt` on the exact
development branch. The assistant will make that one-off request **after**
the user confirms setup, then inspect the job logs and sanitized score-only
artifact. GitHub's built-in workflow_dispatch / "Run workflow" control requires
a workflow file on the default branch, so we deliberately do not use it: it
would require changing `main`, which remains frozen.

**Live workflow:** `.github/workflows/dynamic-groq-live.yml`.
**Test runner:** `tests/live-groq-eval.js`.

## What runs and what never leaves the repository

- One real question-generation request containing 3 independent common anatomy
  or physiology KU descriptions; generated output is validated for KU matching.
- Thirteen real grading requests covering complete, incomplete, incorrect,
  equivalent-language and contradictory answers, including an identical answer
  submitted twice for reproducibility.
- Per-case checks against predetermined *score ranges*, plus the relevant
  correct/missing/incorrect evidence fields. Check consistency of the repeated
  identical answer (maximum 1-point difference).
- Exactly the production functions `generateDynamicQuestions` and
  `gradeDynamicAnswer` are invoked, including the production model name,
  low reasoning effort, JSON format, and score validation.
- The runner has a hard ceiling of **16 outgoing requests** and **30,000
  provider-reported tokens**, 40-second per-request timeout and a delay
  between live calls. There is no retry loop, paid-provider fallback, or
  automatic recurring trigger.
- Only a curated table of test IDs, scores, expected score ranges, pass/fail
  verdicts, request counts and token totals is logged and saved as
  `live-groq-summary.json`. No private KU data or raw AI text is published.
  API credentials are passed in the Authorization header and never logged.
- A provider 429/other error, malformed AI response, case out of expected range,
  missing evidence field or inconsistency is a **failed audit**, not a release.
  These ranges are initial quality heuristics, not definitive medical scoring
  validation. Inspect any failures before refining the actual grading rubric.

## After the test

- Inspect the GitHub Actions **Opt-in Groq scoring audit** run and its score-only
  artifact; record exactly what failed or passed.
- If provider/model behaviour exposes bugs, fix them **only** on
  `feature/dynamic-recall-groq-phase1` and rerun ordinary no-secret CI.
- The Android/Obsidian device checks remain separate requirements.
- Once the live audit is complete, the user can **revoke** the dedicated test
  key in Groq and delete the GitHub environment secret. The normal Obsidian key
  is separate and need not be changed.
