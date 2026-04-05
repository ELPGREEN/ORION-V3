-- Fix 1: Allow "quantum_feedback" in neural_learning_data interaction_type check constraint
ALTER TABLE public.neural_learning_data DROP CONSTRAINT IF EXISTS neural_learning_data_interaction_type_check;

-- Fix 2: Remove the foreign key constraint on neural_specializations.user_id 
-- (system-level entries use placeholder UUIDs that don't exist in auth.users)
ALTER TABLE public.neural_specializations DROP CONSTRAINT IF EXISTS neural_specializations_user_id_fkey;