
-- Drop the broken client policy
DROP POLICY IF EXISTS "Clientes can view envelopes they are signers on" ON public.signature_envelopes;

-- Recreate: client can see envelopes where their email appears in signers JSONB array
CREATE POLICY "Clientes can view envelopes they are signers on"
ON public.signature_envelopes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(signers) AS s
    WHERE lower(s->>'email') = lower(auth.jwt()->>'email')
  )
);
