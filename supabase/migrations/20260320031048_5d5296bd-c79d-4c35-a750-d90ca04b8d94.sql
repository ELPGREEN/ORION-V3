-- FIX C1: Remove overly broad RLS policy on signed_urls that leaks URLs to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read signed_urls" ON public.signed_urls;