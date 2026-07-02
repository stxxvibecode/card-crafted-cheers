Move the Art / Code medium pill from the composer footer to the top header row of the chat panel, next to the Chat/Editor toggle.

### Scope
- Single file: `src/routes/create.tsx`.
- No backend, AI, or route changes.

### Changes
1. **Relocate the pill**
   - Move the Art/Code segmented control from the `PromptInputFooter` up to the chat panel's header row.
   - It will sit alongside the Pigeon logo/identity and the existing Chat/Editor toggle.

2. **Clean up the footer**
   - Keep the ModelPicker and Plan/Build dropdown in the footer.
   - Remove the pill from the footer layout.

3. **Preserve the "pick medium first" cue**
   - When a user arrives with a prefilled prompt but no medium selected yet, the pill at the top should still receive the focus/attention pulse.

4. **Remove the redundant footer hint**
   - The "Choose Art or Code, then hit Build" text above the footer is no longer needed because the pill will be visible at the top.

5. **Editor panel stays unchanged**
   - The Editor panel already has its own Medium picker; leave it as-is.

### Verification
- Check that the pill is visible and aligned in the chat panel header at the current 1177px viewport.
- Confirm the footer no longer overflows and the Send button remains fully visible.
- Quick visual check at ~768px to ensure the header wraps gracefully if space is tight.