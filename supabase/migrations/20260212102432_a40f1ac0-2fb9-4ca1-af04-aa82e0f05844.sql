
-- Public read-only policies for imported Senado data tables

CREATE POLICY "Public read access" ON public."Contrato"
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.avencas
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public."banco de dados senado"
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public."empresa contratadas"
FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public."licitações"
FOR SELECT USING (true);
