ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS spec_version integer NOT NULL DEFAULT 1
  CHECK (spec_version IN (1, 2));

CREATE INDEX IF NOT EXISTS cards_spec_version_idx ON public.cards (spec_version);
