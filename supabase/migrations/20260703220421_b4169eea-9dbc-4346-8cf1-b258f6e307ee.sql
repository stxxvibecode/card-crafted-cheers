
-- Recreate view with security_invoker so RLS applies as caller
DROP VIEW IF EXISTS public.public_cards;
CREATE VIEW public.public_cards
WITH (security_invoker = on) AS
  SELECT id, message, image_url, sender_name, recipient_name, occasion,
         medium, code_spec, created_at, sent_at
  FROM public.cards;

GRANT SELECT ON public.public_cards TO anon, authenticated;

-- Column-level grants on cards: anon/authenticated may read only non-PII columns directly
REVOKE SELECT ON public.cards FROM anon, authenticated;
GRANT SELECT (id, message, image_url, sender_name, recipient_name, occasion,
              medium, code_spec, created_at, sent_at)
  ON public.cards TO anon, authenticated;
-- Owner still needs full row access; grant all columns to owner path via a separate full grant to authenticated
-- Recipient_email is only readable by owner through the RLS policy + full column grant below.
GRANT SELECT (recipient_email, user_id, prompt) ON public.cards TO authenticated;

-- Add a permissive SELECT policy for anon so the view can read rows
CREATE POLICY "Public can read cards via view"
  ON public.cards FOR SELECT
  TO anon
  USING (true);
