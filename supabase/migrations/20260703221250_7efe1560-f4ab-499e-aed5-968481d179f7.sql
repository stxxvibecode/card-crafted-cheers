DROP POLICY IF EXISTS "Authenticated can read cards via view" ON public.cards;
DROP POLICY IF EXISTS "Public can read cards via view" ON public.cards;
CREATE POLICY "Owners can read their own cards" ON public.cards FOR SELECT TO authenticated USING (auth.uid() = user_id);