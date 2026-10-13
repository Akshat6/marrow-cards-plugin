# Marrow Cards — phone/tablet regression checklist

This supersedes the **retired** first-device dummy-card pilot. The old "Install two DEMO cards" feature and `pilot-example` data were removed on 2026-10-11; **do not re-add them**.

For plugin changes or future regressions, use **[plugin-maintenance.md](plugin-maintenance.md)** and **[AGENTS.md](../AGENTS.md)**. For flashcard extraction and publication, follow **[flashcard-workflow.md](flashcard-workflow.md)**.

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

## v0.2.3 regression: multi-card MCQ tapping on Android

1. In **MBBS → Subjects → Anatomy → a subheading → an approved 3-card index**, tap **Review** beside that index (not Browse). Card 1 should display tappable option buttons.
2. Tap any option. It must immediately record one **Right** or **Wrong**, flip to the answer/explanation, show the chosen and correctly relettered answers, and still allow **My notes**.
3. Tap **Next card**. **Card 2 must have enabled, tappable options**. Tap one, then Next, and repeat for **card 3**. This directly tests the v0.2.2 bug where cards 2/3 had disabled options after a transition.
4. Restart the same review. For card 1, use **Flip to answer → Wrong** instead of tapping an option. Confirm that card 2 **still has tappable option buttons** (the async manual-grade path previously had the same risk).
5. Return to an answered MCQ with **Show question** and ensure another tap **does not create another Right/Wrong event** for that attempt. Displayed options must not reshuffle during flip-back or note editing.
6. Tap **Browse** for the same index: Previous/Next and flip must **not** change Seen, Right, Wrong or accuracy. Options remain in original source order and are not grading buttons.
7. Try a personal fact with **no options**. It should still use reversible Flip plus manual Right/Wrong. Verify notes can be opened both in Review and Browse.
8. Confirm personal typed/stylus notes and review counts remain after an Obsidian cold restart. Test on both phone and tablet after independently updating BRAT. Do **not** delete old reviews to simulate a clean test.

The GitHub Actions regression test covers a synthetic three-card sequence, DOM `disabled` states for second and third cards and the post-manual-grade path. This checklist is the necessary **real Android validation**.


## v0.2.6 pen colors and image movement

1. On Android tablet, open an existing image-bearing note and tap the red pen swatch; draw a stroke using the stylus, then change to green and draw another. Both strokes must keep their own colors after closing/reopening the note.
2. Tap **Move / resize image**. Drag the image with a finger, drag its corner handle with a stylus to resize, and confirm that it stays within the page. Verify **Pen** stops image moving and returns to handwriting.
3. Close the notes/editor and restart Obsidian. Confirm the image position and size, typed text, and vector strokes all persist. Confirm the old image-notes from v0.2.5 that did not have placement metadata still open in their original position.
4. After Syncthing finishes syncing `MarrowCards/notes/`, verify picture geometry and strokes on the second device. Avoid simultaneous edits to the same note and keep file versioning enabled.
5. Confirm Browse still records no Seen/Right/Wrong and image manipulation never edits the source `MarrowCards/media/` image or the approved GitHub pack.

## v0.2.7 index question overview and accuracy

1. Expand an installed subject and subheading with approved cards. Confirm each index tile has **Review**, **Browse**, and **Questions**; its cumulative accuracy is already visible.
2. Tap **Questions**. Confirm the list contains only the full *question statements* plus their Seen, Right, Wrong, Accuracy totals. No answer text, choices, solutions, original question figures or private source metadata should be rendered in this view.
3. Check a previously answered question and an unseen question. Verify the answered card's accuracy agrees with its historical Right and Wrong counts, and the unseen card shows `—`. Index accuracy must use pooled Right / (Right + Wrong), not average card accuracies.
4. Close with **Hide questions**, then **Review** and **Browse** that same index. Both full-card modes should still work and allow notes, but should **not** show the old per-card stats line. Browse and Questions must never generate new review events.
5. Confirm switching subjects, collapsing subheadings, selecting indexes across subjects and the approved-only filter still work; no extra blank space or horizontal overflow on Android phone.
6. After marking a card Right/Wrong, go back to its subject and reopen Questions. The new numbers should reflect the logged result. Repeat after Syncthing completes on the other device.

## Syncthing phone/tablet

1. Sync the dedicated vault's `MarrowCards/packs/`, `MarrowCards/media/`, `MarrowCards/reviews/`, and **`MarrowCards/notes/`**.
2. **Exclude `.obsidian`** on both devices; plugin code and settings stay device-local.
3. Install the plugin on the tablet independently. The tablet should receive already-downloaded card packs and images via Syncthing, normally without a GitHub token.
4. Tap **Refresh local** after Syncthing finishes, and verify counts include both devices' reviews, stored under distinct `MarrowCards/reviews/<device-id>/` folders.
5. Enable independent backups or Syncthing file versioning. Sync is not a backup.

## Regression cautions

- This is a manual device checklist, not proof of physical-device behavior.
- The plugin itself does **not** extract PYQ PDFs; the separate ChatGPT approval workflow prepares and publishes JSON packs.
- Adding approved data to the private repository should not require updating BRAT. BRAT updates are for plugin code.
- Preserve existing packs and review logs; do not run old pilot resets, restore deleted test cards or change mapped index IDs without explicit instruction.
