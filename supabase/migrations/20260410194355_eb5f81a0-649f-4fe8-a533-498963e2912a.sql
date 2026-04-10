-- 1. Fix orion_reports: restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Service role can insert reports" ON public.orion_reports;
CREATE POLICY "Authenticated users can insert reports"
  ON public.orion_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix affiliate_sales
DROP POLICY IF EXISTS "Affiliates see own sales" ON public.affiliate_sales;
CREATE POLICY "Affiliates see own sales restricted"
  ON public.affiliate_sales FOR SELECT TO authenticated
  USING (affiliate_user_id = auth.uid());