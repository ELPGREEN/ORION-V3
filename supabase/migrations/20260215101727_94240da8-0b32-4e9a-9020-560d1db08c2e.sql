CREATE POLICY "Advogados can delete their own envelopes"
ON public.signature_envelopes
FOR DELETE
USING (auth.uid() = user_id AND status IN ('cancelado', 'expirado'));