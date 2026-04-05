

## Integrar HURIDOCS PDF Layout Analysis como Serviço Externo

O **pdf-document-layout-analysis** da HURIDOCS e um microservico Docker (Python/FastAPI) que faz segmentacao inteligente de PDFs -- identifica titulos, paragrafos, tabelas, formulas, imagens e determina a ordem de leitura. Oferece conversao para Markdown/HTML, OCR com 150+ idiomas, e extracao de tabelas como HTML.

Como e um servico Python com GPU, **nao roda em Supabase Edge Functions**. A integracao viavel e criar uma Edge Function que faz proxy para uma instancia self-hosted do servico.

---

### O que ganhamos vs. o OCR atual

O OCR atual (`ocr-document`) usa Vision APIs (Groq, OpenAI, Anthropic, Gemini) para extrair texto bruto de imagens/PDFs. O HURIDOCS adiciona:

1. **Segmentacao estrutural** -- distingue titulo, paragrafo, tabela, formula, legenda, cabecalho, rodape
2. **Ordem de leitura** -- resolve PDFs com colunas multiplas ou layouts complexos
3. **Extracao de tabelas como HTML** -- tabelas viram `<table>` estruturado, nao texto solto
4. **Conversao PDF → Markdown/HTML** -- importacao de PDFs com formatacao preservada
5. **Visualizacao de segmentacao** -- overlay visual mostrando blocos detectados

---

### Tarefas de Implementacao

#### 1. Edge Function `pdf-layout-analysis` (proxy)
Nova Edge Function que recebe um PDF (base64) e encaminha para o servico HURIDOCS self-hosted. Suporta os endpoints principais: analise de layout (`/`), conversao Markdown (`/markdown`), conversao HTML (`/html`), e OCR (`/ocr`).

- Secret: `PDF_LAYOUT_SERVICE_URL` (ex: `https://pdf-layout.seudominio.com`)
- Aceita: `{ pdfBase64, mode: "analyze" | "markdown" | "html" | "ocr", fast?: boolean, language?: string }`
- Retorna: segmentos estruturados ou conteudo convertido

**Novo**: `supabase/functions/pdf-layout-analysis/index.ts`

#### 2. Melhorar OcrPanel com modo "Layout Inteligente"
Adicionar toggle no `OcrPanel` para escolher entre OCR simples (atual, Vision API) e "Analise de Layout" (HURIDOCS). No modo layout, exibir resultados segmentados com badges por tipo (Titulo, Paragrafo, Tabela, etc.) e opcao de copiar como Markdown estruturado.

**Modificado**: `src/components/dashboard/google/OcrPanel.tsx`

#### 3. Importacao de PDF estruturada no Editor
Adicionar opcao "Importar PDF (Layout Inteligente)" no editor de documentos que usa o endpoint `/html` do HURIDOCS para converter PDF em HTML preservando estrutura de titulos, paragrafos e tabelas -- inserindo diretamente no TipTap.

**Modificado**: `src/components/dashboard/DocumentEditor.tsx` (ou componente de importacao relevante)

#### 4. Visualizacao de Segmentacao de PDF
Componente que mostra o PDF com overlay colorido dos segmentos detectados (tipo o endpoint `/visualize`). Util para verificar a qualidade da extracao antes de importar.

**Novo**: `src/components/dashboard/editor/PDFSegmentationViewer.tsx`

---

### Arquitetura

```text
Frontend (React)
├── OcrPanel.tsx          ← toggle: OCR simples vs Layout
├── DocumentEditor.tsx    ← "Importar PDF estruturado"
└── PDFSegmentationViewer ← overlay visual dos segmentos
        │
        ▼
Edge Function (proxy)
├── pdf-layout-analysis/index.ts
│   POST { pdfBase64, mode }
│   → forward to HURIDOCS service
│
        ▼
HURIDOCS Service (self-hosted Docker)
├── POST /           → segmentos JSON
├── POST /markdown   → Markdown
├── POST /html       → HTML
├── POST /ocr        → PDF com OCR
└── POST /visualize  → PDF com overlay
```

### Pre-requisito
O usuario precisa ter uma instancia do servico HURIDOCS rodando (Docker) e configurar o secret `PDF_LAYOUT_SERVICE_URL` no Supabase. Sem isso, o modo "Layout Inteligente" fica desabilitado e o OCR simples continua funcionando normalmente.

