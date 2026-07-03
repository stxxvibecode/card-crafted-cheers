
-- 1. Lock down cards SELECT to owner only
DROP POLICY IF EXISTS "Cards are publicly readable" ON public.cards;

CREATE POLICY "Owners can read their cards"
  ON public.cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Public view exposing non-PII fields for shared card links
CREATE OR REPLACE VIEW public.public_cards AS
  SELECT id, message, image_url, sender_name, recipient_name, occasion,
         medium, code_spec, created_at, sent_at
  FROM public.cards;

GRANT SELECT ON public.public_cards TO anon, authenticated;

-- 3. Tighten card_responses inserts with validation
ALTER TABLE public.card_responses
  DROP CONSTRAINT IF EXISTS card_responses_kind_check,
  DROP CONSTRAINT IF EXISTS card_responses_content_length,
  DROP CONSTRAINT IF EXISTS card_responses_author_length;

ALTER TABLE public.card_responses
  ADD CONSTRAINT card_responses_kind_check
    CHECK (kind IN ('reply','reaction','rsvp','guestbook')),
  ADD CONSTRAINT card_responses_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000),
  ADD CONSTRAINT card_responses_author_length
    CHECK (author_name IS NULL OR char_length(author_name) <= 100);
