
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  occasion text,
  message text NOT NULL,
  image_url text NOT NULL,
  sender_name text,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cards TO authenticated;
GRANT SELECT, INSERT ON public.cards TO anon;
GRANT ALL ON public.cards TO service_role;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can read any card — share links are public.
CREATE POLICY "Cards are publicly readable" ON public.cards
  FOR SELECT USING (true);

-- Anyone can create a card (anonymous senders welcome).
CREATE POLICY "Anyone can create a card" ON public.cards
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Only owners can update their own cards (e.g. to mark sent_at).
CREATE POLICY "Owners can update their cards" ON public.cards
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX cards_user_id_created_at_idx ON public.cards (user_id, created_at DESC);
