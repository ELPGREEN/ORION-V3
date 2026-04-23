-- RPC function to add credits (called by the system)
-- This was missing from previous migrations
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_added_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the adder is an admin/owner
  -- Using public.is_admin as it's the standard in this project
  IF NOT public.is_admin(p_added_by) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar créditos';
  END IF;

  -- Insert transaction
  INSERT INTO public.credit_transactions (user_id, target_user_id, amount, type, description)
  VALUES (p_added_by, p_user_id, CAST(p_amount * 100 AS INTEGER), 'credit_added', p_reason);

  -- Update balance in client_profiles
  UPDATE public.client_profiles
  SET credits_balance = credits_balance + p_amount
  WHERE user_id = p_user_id;
END;
$$;
