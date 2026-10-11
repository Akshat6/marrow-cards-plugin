# Marrow Cards — phone/tablet regression checklist

This supersedes the **retired** first-device dummy-card pilot. The old "Install two DEMO cards" feature and `pilot-example` data were removed on 2026-10-11; **do not re-add them**.

For flashcard extraction and publication, use **[AGENTS.md](../AGENTS.md)** and **[flashcard-workflow.md](flashcard-workflow.md)**.

## First install / restart checks

1. Open the correct `Marrow Cards` Obsidian vault on the phone.
2. Install/enable BRAT and `Akshat6/marrow-cards-plugin`. Confirm Obsidian's **Settings → Community plugins → Installed plugins** lists **Marrow Cards** as enabled.
3. Confirm the separate **Marrow Cards** settings entry and **Open reviewer** command exist.
4. Remove Obsidian from Recent Apps completely and reopen the same vault. Verify the plugin **stays enabled**, its command/settings persist, and it does not need reinstalling.
5. If the plugin is installed but inactive, troubleshoot activation/startup before reinstalling; don't delete the vault or card data.

## Private database and cards

1. On the phone, configure a locally saved GitHub fine-grained token with **Contents: Read-only** for `Akshat6/marrow-cards-data`. Never paste the token into chat or into the vault.
2. Open the plugin, tap **Check GitHub → Refresh local**.
3. Confirm the MBBS subject/index hierarchy appears.
4. As of 2026-10-11, navigate to **MBBS → Ophthalmology → OPH-04 / Anatomy of Retina**: expect **four personal fact cards**, not the retired three-PYQ test pack.
5. Open a card: the question and explanation areas scroll; footer buttons remain visible. Tap **Flip to answer → Show question → Flip to answer**, and confirm neither flip-back nor scroll creates a new Right/Wrong mark. Grade **Right** or **Wrong** once.
6. Close and reopen Obsidian. Verify approved cards and the most recent review counts persist. Repeat on another day to verify local event logs.

## Syncthing phone/tablet

1. Sync the dedicated vault's `MarrowCards/packs/`, `MarrowCards/media/`, and `MarrowCards/reviews/`.
2. **Exclude `.obsidian`** on both devices; plugin code and settings stay device-local.
3. Install the plugin on the tablet independently. The tablet should receive already-downloaded card packs and images via Syncthing, normally without a GitHub token.
4. Tap **Refresh local** after Syncthing finishes, and verify counts include both devices' reviews, stored under distinct `MarrowCards/reviews/<device-id>/` folders.
5. Enable independent backups or Syncthing file versioning. Sync is not a backup.

## Regression cautions

- This is a manual device checklist, not proof of physical-device behavior.
- The plugin itself does **not** extract PYQ PDFs; the separate ChatGPT approval workflow prepares and publishes JSON packs.
- Adding approved data to the private repository should not require updating BRAT. BRAT updates are for plugin code.
- Preserve existing packs and review logs; do not run old pilot resets, restore deleted test cards or change mapped index IDs without explicit instruction.
