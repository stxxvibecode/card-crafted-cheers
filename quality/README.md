# Card Quality Baseline

`fixtures.ts` defines the 24 prompt corpus used to judge card quality before and after changes to the renderer. The set covers personal cards, invitations, RSVP cards, art mode, long copy, long names, ambiguous prompts, and missing event details.

Use `targets.example.json` as the shape for a local `targets.json` file. Each fixture can point to the creator preview and/or a published recipient card. Do not commit real recipient links or personal data.

Run:

```bash
npm run quality:cards -- --targets quality/targets.json
```

The command creates a timestamped folder under `quality/runs/` with phone and desktop screenshots, browser vitals, a report template, and the fixture metadata used for the run. It never generates or publishes cards.

Score each case from 0 to 20 on the five dimensions in `scorecard.ts`:

1. Legibility
2. Composition
3. Occasion fit
4. Motion
5. Recipient experience

The pass threshold is 80/100 with no blocker. Record blockers for clipped content, unreadable contrast, broken open/action behavior, missing required event details, or a render failure.
