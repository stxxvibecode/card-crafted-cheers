## Move medium selection into the composer

Right now Art vs. Code lives on chips inside the plan card — users only see them after Pigeon replies. Move the pick up-front to a dropdown that sits next to the Build/Plan control in the `PromptInput` footer, so the medium is chosen before the first message is sent (mirroring Lovable's Chat/Build dropdown pattern).

### UI changes (`src/routes/create.tsx`)

1. **Composer footer** — replace the lone submit button with a segmented control:
   - A **mode dropdown** ("Plan" / "Build") — the primary action label on the send button.
   - A **medium dropdown** ("Art" / "Code") shown to the left of the mode/send button, defaulting to unset with a placeholder "Choose medium".
   - Send button is disabled until a medium is chosen; tooltip explains why.
   - Selected medium persists in `draft.medium` from the first submission onward.

2. **Plan card** — remove the Art/Code chip row. The card now just summarizes what Pigeon will build (using the already-chosen medium) and shows a single **Build** button (or auto-builds if the user picked "Build" mode in the composer).

3. **Editor mode** — keep the Art/Code toggle in the editor pane (it's the manual surface), but read/write the same `draft.medium` so the composer dropdown stays in sync.

4. **Chat seeding** — if the user types before choosing a medium, show an inline assistant nudge ("Pick Art or Code above to continue") instead of the current chip-based nudge.

### Behavior

- **Plan mode** (default): submitting sends the message to `chatCard`, Pigeon replies with a plan, user clicks Build.
- **Build mode**: submitting sends the message AND immediately runs `regenerateImage`/`regenerateCode` once Pigeon returns a plan (skips the manual Build click).
- Medium dropdown is required for either mode; changing it mid-conversation triggers a fresh plan on the next turn.

### Files touched

- `src/routes/create.tsx` — composer footer, plan card, gating logic, editor sync.
- `src/lib/chatCard.functions.ts` — minor system-prompt tweak so Pigeon stops asking "Art or Code?" (the composer now guarantees it).

No schema, no server-function signature changes.