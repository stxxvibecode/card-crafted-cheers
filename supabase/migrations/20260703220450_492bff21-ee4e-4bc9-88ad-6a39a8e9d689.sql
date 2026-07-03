
-- Revoke PII columns from authenticated; only server (service_role) reads recipient_email
REVOKE SELECT (recipient_email, user_id, prompt) ON public.cards FROM authenticated;

-- Replace the owner-only SELECT policy with one allowing all authenticated reads;
-- column-level grants block PII exposure.
DROP POLICY IF EXISTS "Owners can read their cards" ON public.cards;
CREATE POLICY "Authenticated can read cards via view"
  ON public.cards FOR SELECT
  TO authenticated
  USING (true);
