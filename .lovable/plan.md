
## What we're building

A Lovable.dev-style site rethemed for AI-generated e-cards. Users describe the card they want ("birthday card for my sister who loves cats"), we generate a unique image + heartfelt message with AI, then email it to a recipient. Authenticated users get a history of cards they've sent.

Visual direction: match Lovable.dev closely — dark background, gradient hero, minimal nav, big prompt-in-hero, example prompts as chips, feature strip below.

## Pages / routes

```
/                       Landing: dark hero, prompt textarea, example chips, features, footer
/create                 Full creator: prompt → live preview (streaming image + message) → recipient email → send
/card/:id               Public shareable card view (link included in the email)
/auth                   Sign in / sign up (email+password + Google)
/_authenticated/cards   "My cards" — list of cards the user has sent
/api/generate-image     Server route, SSE stream (OpenAI gpt-image-2)
```

Server functions (`src/lib/cards.functions.ts`):
- `generateMessage({ prompt, occasion })` — Gemini flash, returns short heartfelt message
- `saveCard({ prompt, message, imageBase64, recipientEmail, recipientName })` — uploads image to storage, inserts row, returns id
- `sendCard({ cardId })` — enqueues app email to recipient via Lovable Emails

## Backend (Lovable Cloud)

Enable Lovable Cloud. Then:

**Storage bucket** `card-images` (public) — final rendered card PNGs.

**Table** `public.cards`
- `id uuid pk`, `user_id uuid null references auth.users(id)`, `prompt text`, `message text`, `image_url text`, `recipient_email text`, `recipient_name text`, `sent_at timestamptz`, `created_at timestamptz default now()`
- RLS: owner can select/insert/update own rows; anyone (`anon` + `authenticated`) can SELECT a single row by id (for the public share page) with only safe columns queried; service_role full.
- Grants per project rules.

**Auth**: email/password + Google (via Lovable broker). No profiles table.

**Email**: enable Lovable Emails + email domain. Scaffold app emails. Template `card-delivery.tsx` with sender's message, card image, and link to `/card/:id`.

## AI

- Image: `POST /api/generate-image` streams `openai/gpt-image-2`, `quality: "low"`, `stream: true`, `partial_images: 1`. Client uses `eventsource-parser` + `flushSync`, blurs partials, unblurs on completion. On finalize we upload the last PNG to the `card-images` bucket via a server function.
- Message: `generateMessage` server fn using `google/gemini-3-flash-preview` returning `{ message: string }` (short, warm, 2–4 sentences).

Both run in parallel in the `/create` flow.

## UX flow on `/create`

1. User types prompt (optional occasion selector: birthday / thank you / congrats / holiday / just because).
2. Click "Generate" → parallel: streaming image (blurred → sharp) + message appears.
3. User can regenerate either independently.
4. Enter recipient name + email, optional sender name.
5. "Send card" → `saveCard` then `sendCard`. Toast + redirect to `/card/:id` where sender can also copy link.

Unauthenticated users can generate and send freely; if signed in, card is attached to their `user_id` and shows up under `/cards`.

## Visual system

- Tokens in `src/styles.css`: near-black background `oklch(0.15 0.02 260)`, off-white foreground, primary gradient from soft pink `oklch(0.78 0.15 15)` → warm amber `oklch(0.82 0.14 70)` (evokes greeting-card warmth vs Lovable's pink/orange).
- Font: Inter via `<link>` in `__root.tsx` head.
- Reused Lovable-style patterns: sticky translucent nav, gradient text on hero heading, subtle grid/noise background, prompt card with rounded-2xl and glow shadow, chip row of example prompts, three-column feature strip, minimal footer.
- Update `__root.tsx` head with real title/description/OG metadata ("Sendcard — AI-generated e-cards").

## Out of scope (this build)

- Payments / paid tiers
- Scheduled sending
- Recipient reply flow
- Card animations / video cards

## Technical notes

- `/api/generate-image` is a TSS server route (streaming requires it, not `createServerFn`).
- `saveCard` uses `requireSupabaseAuth` only when a user is signed in; also expose an unauthenticated variant that inserts with `user_id = null` under a narrow anon INSERT policy — OR simpler: always call an unauthenticated server fn that uses the server publishable client and a permissive anon INSERT policy scoped to the cards table. We'll go with the simpler path: anon can INSERT + SELECT-by-id; authenticated users additionally get SELECT/UPDATE where `user_id = auth.uid()`.
- `/cards` lives under `_authenticated/` so the managed layout handles the gate.
- Bearer attacher appended in `src/start.ts`.
- Email send uses the scaffolded `/lovable/email/transactional/send` route with an `idempotencyKey` of `card-${cardId}`.
