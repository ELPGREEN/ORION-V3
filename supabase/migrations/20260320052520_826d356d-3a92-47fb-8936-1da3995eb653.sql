DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '4462f868-4bbb-4c59-b254-2230b0b585e8') THEN
    INSERT INTO public.publicacoes (titulo, resumo, conteudo, categoria, autor, publicado, data_publicacao, slug, user_id)
VALUES (
  'Plataforma Jurídica em Breve: Abertura para Advogados e Associados',
  'Estamos preparando a abertura da nossa plataforma de tecnologia jurídica para advogados e associados, com modelo de contrato anual por tempo de uso.',
  '## Uma Nova Era na Advocacia Digital

É com grande satisfação que anunciamos: **em breve, nossa plataforma de tecnologia jurídica estará disponível para advogados e associados** de todo o Brasil.

### O que é a Plataforma?

Desenvolvida internamente pelo escritório Diego Hermann, a plataforma reúne ferramentas de inteligência artificial, pesquisa jurisprudencial, geração de documentos e gestão processual — tudo em um único ambiente seguro e intuitivo.

### Modelo de Acesso

O acesso será oferecido no modelo de **contrato anual**, com planos baseados no tempo de uso. Isso garante flexibilidade e previsibilidade de custos para escritórios de todos os portes.

**Principais vantagens do modelo anual:**

- **Previsibilidade financeira** — valor fixo mensal sem surpresas
- **Acesso completo** às ferramentas de IA jurídica
- **Suporte técnico** dedicado e prioritário
- **Atualizações contínuas** com novas funcionalidades

### Para Quem é?

A plataforma é destinada a:

- Advogados autônomos que desejam escalar sua produtividade
- Escritórios de pequeno e médio porte buscando tecnologia acessível
- Associados que querem integrar IA ao seu fluxo de trabalho jurídico

### Próximos Passos

Estamos em fase final de testes e ajustes. Em breve, abriremos as inscrições para os primeiros associados. **Fique atento às nossas publicações e entre em contato para garantir sua vaga na lista de espera.**

---

*Para mais informações, entre em contato pelo WhatsApp ou pela página de contato do site.*',
  'Institucional',
  'Dr. Diego Hermann',
  true,
  now(),
  'plataforma-abertura-advogados-associados',
  '4462f868-4bbb-4c59-b254-2230b0b585e8'
);
  END IF;
END $$;
