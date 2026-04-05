INSERT INTO public.neural_knowledge_base (title, content, source_type, category, tags, is_processed)
VALUES
  ('Estrutura de contratos internacionais e cláusulas essenciais (CISG/ICC)', 'Contratos internacionais devem seguir CISG e ICC. Cláusulas essenciais: partes, objeto, preço, Incoterms (FOB/CIF/EXW/DDP), garantias, force majeure, IP, confidencialidade, lei aplicável, arbitragem ICC/UNCITRAL, idioma prevalente, notificações.', 'manual', 'internacional', ARRAY['contratos','internacional','CISG','ICC','arbitragem','incoterms'], true),
  ('Documentação para exportação e comércio exterior', 'Documentos: Invoice Proforma, Commercial Invoice, Packing List, B/L, Certificado de Origem, Licença Import/Export, DU-E, DI, Seguro. Incoterms 2020: EXW, FOB, CIF, DDP. UE: REACH, CE marking, GDPR.', 'manual', 'internacional', ARRAY['exportação','importação','comércio exterior','incoterms'], true),
  ('Due diligence e compliance em operações internacionais', 'DD: Legal, Financeiro, Tributário, Trabalhista, Ambiental, Regulatório, Anti-corrupção (FCPA, UK Bribery Act, Lei 12.846/13). Compliance: programa integridade, KYC/AML, GDPR.', 'manual', 'internacional', ARRAY['due diligence','compliance','FCPA','GDPR'], true),
  ('Framework de LOI/MOU para parcerias industriais', 'LOI: pré-contratual para M&A, não-vinculante exceto exclusividade e confidencialidade. MOU: framework cooperação, pode ser vinculante. Definir binding vs non-binding, governing law, dispute resolution.', 'manual', 'internacional', ARRAY['LOI','MOU','letter of intent','parcerias'], true);

INSERT INTO public.neural_specializations (name, description, category, is_active, prompts)
VALUES (
  'International Business Documents',
  'Especialização em documentos empresariais internacionais bilíngues: LOI, MOU, NDA, Supply Agreements, Joint Ventures, Term Sheets, Due Diligence e Compliance Reports.',
  'internacional',
  true,
  '["Gere documentos bilíngues EN/PT seguindo ICC, CISG, UNCITRAL. Use Incoterms 2020. Inclua arbitragem ICC, confidencialidade, governing law, force majeure."]'::jsonb
);