CREATE TABLE public.card_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('reaction','reply')),
  content TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.card_responses TO anon, authenticated;
GRANT ALL ON public.card_responses TO service_role;
ALTER TABLE public.card_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can add a response" ON public.card_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Card owner can read responses" ON public.card_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid()));