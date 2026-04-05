-- Update publication 1: Plataforma
UPDATE public.publicacoes 
SET 
  titulo = 'Em Breve: Plataforma Jurídica para Advogados e Associados',
  resumo = 'Anunciamos a abertura da nossa plataforma de tecnologia jurídica para advogados e associados, com planos de contrato anual baseados no tempo de uso.',
  imagem_capa = '/images/pub-plataforma-cover.jpg',
  conteudo = '## Plataforma Jurídica — Abertura para Advogados e Associados

É com grande satisfação que anunciamos: **em breve, nossa plataforma de tecnologia jurídica estará disponível para advogados e associados** de todo o Brasil.

### O que é a Plataforma?

Desenvolvida pelo escritório Diego Hermann, a plataforma reúne ferramentas de inteligência artificial, pesquisa jurisprudencial, geração de documentos e gestão processual — tudo em um único ambiente seguro e intuitivo.

### Modelo de Acesso — Contrato Anual

O acesso será oferecido no modelo de **contrato anual**, com planos baseados no tempo de uso. Isso garante flexibilidade e previsibilidade de custos para escritórios de todos os portes.

**Principais vantagens:**

- **Previsibilidade financeira** — valor fixo sem surpresas
- **Acesso completo** às ferramentas de IA jurídica
- **Suporte técnico** dedicado e prioritário
- **Atualizações contínuas** com novas funcionalidades

### Para Quem é?

- Advogados autônomos que desejam escalar sua produtividade
- Escritórios de pequeno e médio porte buscando tecnologia acessível
- Associados que querem integrar IA ao seu fluxo de trabalho jurídico

### Próximos Passos

Estamos em fase final de testes. Em breve, abriremos as inscrições para os primeiros associados. **Entre em contato para garantir sua vaga na lista de espera.**

---

*Para mais informações, entre em contato pelo WhatsApp ou pela página de contato do site.*'
WHERE id = '80ac81c8-cb43-4f5d-a40a-cc440ee710b5';

-- Update publication 2: Engenharia
UPDATE public.publicacoes 
SET 
  titulo = 'Engenharia de Sistemas Aplicada à Advocacia de Alta Performance',
  resumo = 'Como a infraestrutura tecnológica do escritório Diego Hermann utiliza IA e segurança avançada para potencializar a atuação jurídica.',
  imagem_capa = '/images/pub-engenharia-cover.jpg',
  categoria = 'Institucional'
WHERE id = '1f066d9f-5848-43e4-8d1d-5fb052dcfedf';