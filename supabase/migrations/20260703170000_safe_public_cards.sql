ALTER TABLE public.cards
  ALTER COLUMN recipient_email DROP NOT NULL;

DROP POLICY IF EXISTS "Cards are publicly readable" ON public.cards;

CREATE POLICY "Card owners can read their raw cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.public_cards;

CREATE VIEW public.public_cards AS
SELECT
  id,
  message,
  image_url,
  sender_name,
  recipient_name,
  occasion,
  medium,
  code_spec,
  created_at,
  sent_at
FROM public.cards;

GRANT SELECT ON public.public_cards TO anon;
GRANT SELECT ON public.public_cards TO authenticated;
