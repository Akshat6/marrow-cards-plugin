# Publishing approved question packs (including exact source images)

This project can publish approved JPEG/PNG images into the **private** GitHub data repository without asking the user to manually upload media.

## Source and approval rules

1. Match a studied index to verified PYQ codes and source PDF pages.
2. Extract the **original embedded image bytes** from the source (do not recreate an illustration).
3. Show every question, option, image, source answer and explanation for explicit approval.
4. Never activate cards until every referenced image is published, all options/explanations are complete, and the card owner approves.
5. Keep the repository private, stable question IDs, and versioned card-pack filenames.

## Binary bridge for connected tools

GitHub's `create_blob` accepts Base64 strings; this environment's GitHub connector cannot directly accept local container file paths. Use this reversible text bridge:

1. In the local working container, for each image create a temporary `<image>.b64.txt` with Base64 data wrapped at **1024 characters per line**.
2. Compute the original byte size, **SHA-256** and Git blob hash `SHA-1("blob " + len(bytes) + "\\0" + bytes)`.
3. Upload each temporary Base64 **text file** to your authorized private File Library using `files.manage_library(operation=upload, container_path=...)`.
4. In **one orchestrated code-mode tool script**, read that file in chunks of around 40 lines via `files.read`, concatenate the text, strip whitespace, and validate the expected Base64 character count.
5. Pass the concatenated Base64 directly (without echoing it in tool outputs or chat) to `GitHub.create_blob({ repository_full_name, content, encoding: "base64" })`.
6. **Compare** the returned Git SHA against the locally computed Git blob SHA. Abort on any mismatch.
7. Attach the verified image blobs at `media/<image-file>` using GitHub `create_tree` with the existing base tree, `create_commit`, and `update_ref`.
8. Verify `media/` paths, sizes and SHAs exist in the committed tree.
9. Activate approved card JSON in `packs/` and then bump its corresponding `manifest.json` pack version. The plugin will download changes on the next `Check GitHub`.
10. Delete the temporary Base64 files from the private Library. Never retain encoded media payloads in the public code repository or send them to the user as text.

### Important implementation notes

- The tool bridge is **temporary**, not a public hosting service. Source images remain private.
- Git objects can be written before the manifest is switched; this ensures readers never encounter incomplete packs.
- Do **not** change `manifest.json` before image and card validation is complete.
- Keep the initial media filename stable once published. Revisions must use a versioned new filename if the actual bytes differ to avoid stale cached local images.
- The plugin uses GitHub Contents API to fetch Base64-encoded image data and writes it into local Obsidian vault `MarrowCards/media/`. Syncthing synchronizes the complete deck.
- The plugin's optional local bundle importer remains a fallback if a connector or GitHub publishing step fails, but **no manual download, upload or import is necessary for the normal workflow**.

### Verified pilot, 2026-10-11

Index `OPH-04` (MBBS → Ophthalmology → Anatomy of Retina) published three user-approved cards, linked to exact source images, verified by source byte counts and Git blob SHA, with `manifest.json` pack version `1.1.0`.

The question-text source, PDF location and original images are private medical study content and must never enter the public plugin repository.
