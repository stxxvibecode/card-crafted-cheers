CREATE TABLE IF NOT EXISTS public.card_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reply', 'reaction', 'rsvp', 'guestbook')),
  content text NOT NULL,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_responses
  DROP CONSTRAINT IF EXISTS card_responses_kind_check,
  ADD CONSTRAINT card_responses_kind_check CHECK (kind IN ('reply', 'reaction', 'rsvp', 'guestbook'));

GRANT INSERT ON public.card_responses TO anon;
GRANT SELECT, INSERT ON public.card_responses TO authenticated;
GRANT ALL ON public.card_responses TO service_role;

ALTER TABLE public.card_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can respond to a card (recipients don't have accounts).
DROP POLICY IF EXISTS "Anyone can add a response to an existing card" ON public.card_responses;
DROP POLICY IF EXISTS "Anyone can respond to a card" ON public.card_responses;
CREATE POLICY "Anyone can respond to a card" ON public.card_responses
  FOR INSERT WITH CHECK (
    char_length(content) BETWEEN 1 AND 2000
    AND EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_responses.card_id
    )
  );

-- Only the card owner can read responses to their cards.
DROP POLICY IF EXISTS "Card owner can read responses" ON public.card_responses;
DROP POLICY IF EXISTS "Owners can read responses to their cards" ON public.card_responses;
CREATE POLICY "Owners can read responses to their cards" ON public.card_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_responses.card_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX card_responses_card_id_created_at_idx ON public.card_responses (card_id, created_at DESC);
