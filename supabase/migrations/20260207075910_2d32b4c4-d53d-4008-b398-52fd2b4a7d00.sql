-- Allow advogados to insert client_profiles manually
CREATE POLICY "Advogados can insert client profiles" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'advogado'));