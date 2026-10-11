# First-device pilot test

**Scope:** technical dummy cards only. Real PYQs require user approval before entry.

1. Open the **Marrow Cards** vault on the phone.
2. Install BRAT and add `Akshat6/marrow-cards-plugin` after a GitHub release exists, then enable **Marrow Cards**.
3. Use the plugin ribbon icon or command **Marrow Cards: Open reviewer**.
4. Tap **Install two DEMO cards**. Check the question, generated circle graphic, four options, answer and explanation.
5. Flip and grade one **Right** and one **Wrong**. Open the same cards again using **Practice again**. Confirm the right/wrong counts rise and persist on reopening Obsidian.
6. In GitHub, create a **fine-grained personal access token** with read-only **Contents** permission for the single private repository `Akshat6/marrow-cards-data`.
7. In plugin settings on the **phone only**, paste and save the token through **Read-only GitHub token**. **Never send the token to ChatGPT or put it inside the vault.**
8. Press **Check GitHub**. The private dummy pack (and its PNG image) should download automatically. Confirm the additional `Technical test · Imported example pack` index appears.
9. Confirm the local files `MarrowCards/packs/pilot-example.json` and `MarrowCards/media/pilot-circle.png` exist.
10. On the tablet, after Syncthing finishes, refresh the plugin reviewer and confirm the imported questions and PNG display **without a GitHub token**.
11. Check that two distinct `MarrowCards/reviews/<device-id>/` folders exist after grading on both devices. Check both devices' counts match after sync and a **Refresh local** action.
12. Switch on Syncthing versioning or make independent backups before real data.

### Critical Syncthing rule

Exclude `/.obsidian` on **both devices** so their plugin settings and per-device identifiers are not shared. Install the plugin independently on each device. This avoids both installations writing to the same active review log.

### Known pilot limitations

- Physical Android devices not tested by the developer.
- Resuming at a specific card after quitting mid-session is not implemented.
- Card-by-card review timeline UI and rich scientific typesetting are not implemented yet.
- The plugin supports questions and explanations from pre-approved JSON packs; it does not extract PYQs by itself.
