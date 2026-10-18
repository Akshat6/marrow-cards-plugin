# Marrow Cards v0.3.0 — backup and rollback to v0.2.10

The user chose direct v0.3.0 release without a separate beta. Code changes can be rolled back, **but rollback is not the same as restoring local vault data**. Phone/tablet compatibility has not yet been fully tested.

## Before installing v0.3.0

1. Close Obsidian on phone and tablet. Wait for Syncthing to finish on both.
2. Back up the **entire Obsidian vault** (including `.obsidian/` if accessible, `MarrowCards/packs/`, `media/`, `notes/`, `reviews/`, `dynamic-recall/`, and any personal notes). Keep the backup outside the synced vault. Syncthing is not by itself a backup.
3. Keep this previous release bookmarked: [Marrow Cards 0.2.10](https://github.com/Akshat6/marrow-cards-plugin/releases/tag/0.2.10). Verified files exist: `main.js`, `manifest.json`, `styles.css`.
4. Update the existing Marrow Cards plugin through BRAT on **each** device separately; don't install a second copy with a different plugin ID. Reopen Obsidian and check both **Open PYQ Review** and **Open Dynamic Recall**.

## Return to 0.2.10 if v0.3.0 does not work

**Recommended for BRAT v1.1.0 or later**

1. Open Obsidian **Settings → BRAT → Beta plugins**.
2. Edit the entry for `Akshat6/marrow-cards-plugin` and choose a **frozen/specific version** instead of the latest.
3. Select the existing release tag **`0.2.10`**, and let BRAT download/reinstall its release files. Reload Obsidian.
4. Keep it **frozen** so the latest v0.3.0 release does not overwrite the downgrade on a subsequent check.

If your installed BRAT version does not offer a frozen-version edit, use the BRAT command to **add a beta plugin with a frozen version based on a release tag** and choose `0.2.10`, or manually replace the three plugin files from the release link inside your local `.obsidian/plugins/marrow-cards/` after making a backup. Avoid deleting or recreating the vault.

### What comes back, and what does not

- The **0.2.10 code and interface** come back, including the old PYQ reviewer.
- The **0.3.0-only Dynamic Recall interface** disappears until you reinstall 0.3.0 or a fixed later version.
- Your **existing PYQ reviews, notes, image assets and private pack cache** remain in the vault as long as you do not delete them.
- The `MarrowCards/dynamic-recall/` logs are **not automatically removed** when downgrading, but version 0.2.10 does not display them. Keep the logs for future re-upgrade.
- If files or settings were accidentally changed, use your pre-upgrade **vault backup** to restore the correct state; a code-only downgrade cannot recover lost file content.

## For maintainers

- Do not delete the 0.2.10 release or rewrite its tag/assets.
- Leave the public plugin ID **`marrow-cards`** unchanged for all versions.
- Never replace old PYQ `MarrowCards/reviews/`, `notes/`, `packs/` or `media/` paths while implementing Groq Dynamic Recall.
- For urgent repair, publish the next higher patch version (for example, 0.3.1) after regression checks; do not mutate an already-published 0.3.0 release.
- Android startup, touch/scroll, persistence across restart, live provider limits and Syncthing behaviour must be examined on real devices after installation.
