UPDATE public.neural_specializations 
SET training_status = 'completed', 
    status = 'trained',
    last_trained_at = now(),
    updated_at = now()
WHERE training_status = 'pending' AND status = 'active';