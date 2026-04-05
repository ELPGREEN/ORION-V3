
-- ==========================================
-- PART 1: Add 'advogado' and 'cliente' to app_role enum
-- ==========================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advogado';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';
