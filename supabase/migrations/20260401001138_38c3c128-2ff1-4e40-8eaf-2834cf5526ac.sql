UPDATE neural_evolution_proposals
SET 
  status = 'applied',
  approved_at = COALESCE(approved_at, now()),
  applied_at = now()
WHERE status IN ('pending', 'approved');