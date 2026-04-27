-- Marcar todas as 12 propostas duplicadas "Error Handling" como rejected, exceto a mais recente (3018d15e)
UPDATE public.arc_evolution_proposals
SET status = 'rejected',
    reviewer_notes = COALESCE(reviewer_notes, '') || ' [auto-cleanup: duplicate of 3018d15e-550a-4ec8-b19c-653fcfd10d29]',
    updated_at = now()
WHERE status = 'pending'
  AND title ILIKE '%Error Handling%'
  AND id <> '3018d15e-550a-4ec8-b19c-653fcfd10d29';