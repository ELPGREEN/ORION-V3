
-- Keep only the most recent experiment per scope, cancel the rest
-- For document_feedback: keep 25b9d878 (newest), cancel the other 4
UPDATE public.neural_ab_experiments 
SET status = 'cancelled', ended_at = now()
WHERE id IN (
  'c9eb1133-e2e9-464a-a06b-d82be44c1225',
  '61a85952-cca1-4d60-a2c1-bd16ef992516',
  '9881ed94-4b63-4357-8e76-d4f965ea117b',
  '8a23b6ee-6c1f-40f4-9c52-29ea9e641f82'
);

-- For multi_head_attention: keep 56564941 (newest), cancel the other 4
UPDATE public.neural_ab_experiments 
SET status = 'cancelled', ended_at = now()
WHERE id IN (
  'b7de7a19-189c-4839-8f04-0872a42090e3',
  'bc22e5da-7aba-4737-956a-c7213b1d9c04',
  '410c6c02-3899-483a-95e9-4426d93cd4e8',
  '38ff9ffc-86ea-4c79-a903-a24f056353fa'
);
