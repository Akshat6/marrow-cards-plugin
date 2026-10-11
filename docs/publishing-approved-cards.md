# Publishing original source images into the private Marrow Cards data repo

**Read the main [flashcard workflow](flashcard-workflow.md) first.** This is the *binary-image* supplement for approved `pyq` cards. **Never publish an unapproved card or substitute an AI-generated diagram for an original source image.**

## Goal and boundaries

- All approved text/figures belong in **private** `Akshat6/marrow-cards-data`, not the public plugin repository.
- Images must be the actual original source images extracted from a user-provided PDF, or a clearly identified faithful source-page crop if the PDF has no standalone embedded image asset. Record source filename, page, and question number during preparation.
- The approved card JSON uses `images: ["filename.jpeg"]`; published media is stored at `media/filename.jpeg`.
- No recurring manual upload should be required of the user. Use the connected GitHub tools and binary bridge described here.
- Do not alter `MarrowCards/reviews/` or reset local data when adding assets.

## Preconditions

1. Reconfirm the current index-to-PYQ mapping in connected Google Sheets, and read the original PDF content.
2. Show **every source image**, full question, options, answer, and explanation to the user alongside the other previewed cards.
3. Get explicit approval for exactly those cards and images. Approval of other cards does not authorize publishing these.
4. Open live `manifest.json`, current pack(s) and Git tree; verify the target file names/IDs do not collide with existing active content.
5. Use the runtime's PDF-extraction skill/instructions for source image extraction when applicable. Never claim an extraction was exact without checking.

## Reusable binary bridge (connected environment)

The GitHub connector supports Git objects with `create_blob({repository_full_name, content, encoding:"base64"})`, but does not natively accept a local `/mnt/data` JPEG path. In a previous verified execution, the following reversible temporary text bridge worked.

1. Extract each original image to an **exact local binary file**. Record byte size, SHA-256, and expected Git blob ID: `SHA1(utf8("blob " + byteLength + "\\0") + rawBytes)`. Check the image opens correctly.
2. In the local working container, Base64-encode each image to `<name>.b64.txt`, with lines wrapped to **1024 Base64 characters**. This is a *temporary transfer file*; don't put it in the public GitHub repo.
3. Upload the temporary **text** file through `files.manage_library(operation="upload", container_path=..., destination_path=...)` into a private File Library path. Capture its returned `file_id`.
4. Using `files.read`, read that exact `file_id` in consecutive bounded chunks (previously, `start_line` steps of 40 worked). Concatenate its returned text, strip whitespace and check the Base64 char count against the source file. Never log/print the full Base64 payload.
5. In the same connected orchestration script, send the Base64 string to `GitHub.create_blob` with `encoding: "base64"` and repository `Akshat6/marrow-cards-data`. Compare the returned blob SHA to the expected SHA computed from the original bytes. **Abort on mismatch.**
6. After *all* images have verified blob IDs, build a Git tree from the current branch tree using entries of the form `{path:"media/<name>.jpeg",mode:"100644",type:"blob",sha:"<verified blob SHA>"}`; create a commit and advance the `main` ref using an expected-head lease. **Do not force-push**.
7. Re-fetch the latest tree and verify all committed `media/` paths, sizes and blob hashes. If the update was rejected due to a concurrent change, re-read the current head and reconcile before retrying.
8. Only then publish the approved JSON pack. Verify card IDs and image refs; **update the `manifest.json` pack entry last**. The plugin will download new media automatically through **Check GitHub**.
9. Delete the temporary Base64 Library files. Do not paste or expose Base64 payloads in chat, logs, public repositories, or final responses.

This bridge is a **tool-dependent implementation detail**, not a license to publish unapproved source material. If tool interfaces change, test with a small harmless blob first; do not claim success until media appears in the committed private repository.

## Publication safety checklist

- [ ] All question text/options/answers/explanations/images user-approved
- [ ] Each source image matches the original PDF; source page/question recorded
- [ ] Filename is safe, unique and correctly referenced in an approved card
- [ ] Blob SHA matches source image bytes; Git tree shows file and byte size
- [ ] Approved pack `version` is newer than the locally published prior version
- [ ] Existing approved cards remain in the target pack; no duplicate IDs across active packs
- [ ] `manifest.json` was updated **after** all pack/media uploads
- [ ] A fresh fetch of live `manifest.json`, pack and tree passes every check
- [ ] User is told exactly what is live and how to load it in Obsidian

**Image cache rule:** The app only downloads an image filename if it does not already exist locally. If the image's contents change, use a **new versioned filename** and update the card reference, to avoid stale cached media.

## What happened to the old retina pilot?

On 2026-10-11, three original JPEG images were successfully published using this bridge and verified by Git blob hashes. **That pilot was later removed from the active private repository at the user's request.** Those PYQs currently map to `OPH-32`, not `OPH-04`, and are not currently approved/live cards.

The current private repository contains the index catalog and four approved `OPH-04` personal fact cards. **Do not automatically restore the old pilot** from Git history, staging files, or local previews.

## Fallback (only if specifically needed)

The Obsidian plugin also supports an optional local approved-bundle importer. A `marrow-cards-bundle` JSON package with verified original-image Base64 payloads can be imported through the plugin's Import bundle control, but this requires the user to select a file on the device. Prefer the private GitHub publishing method so the default workflow is fully managed.

If the automated image bridge fails, explain the exact blocker, keep unpublished cards in the approval/preparation stage, and avoid replacing original source images with invented artwork.
