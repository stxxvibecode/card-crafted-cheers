ALTER TABLE public.cards
  ADD COLUMN medium text NOT NULL DEFAULT 'art',
  ADD COLUMN code_spec jsonb,
  ALTER COLUMN image_url DROP NOT NULL,
  ADD CONSTRAINT cards_medium_check CHECK (medium IN ('art', 'code'));