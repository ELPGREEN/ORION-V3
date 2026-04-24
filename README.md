# ORION — Plataforma Jurídica IA SaaS LegalTech

Plataforma SaaS jurídica com inteligência artificial neural avançada para escritórios de advocacia, empresas e profissionais do Direito.

## 🚀 Funcionalidades Principais

- **Geração de Documentos IA** — Pipeline de 9 agentes com 7 providers (OpenAI, Gemini, Groq, Mistral, Anthropic, DeepSeek, Perplexity)
- **Rede Neural Auto-Evolutiva** — Aprendizado contínuo com A/B testing de prompts (HybridMoE-RAG-CAG)
- **Sistema de Raciocínio Orion** — Motor de raciocínio com classificação de intenção, streaming com análise de sentenças e limpeza neurolinguística
- **Visão Neural** — Análise visual multi-provider com voz humana
- **Reconhecimento Facial** — Autenticação biométrica com anti-spoofing IA
- **Pesquisa Jurisprudencial** — Busca unificada em 10+ fontes (DataJud, STF, STJ, Senado)
- **Editor Jurídico** — TipTap com revisão IA em tempo real e colaboração WebRTC
- **CRM Jurídico** — Gestão de clientes, processos e consultas
- **Documentos Internacionais** — 15+ tipos (LOI, MOU, NDA, Joint Venture) com templates bilíngues EN/PT
- **AML Screening** — Triagem anti-lavagem internacional
- **Assinatura Digital** — ClickSign (ICP-Brasil)
- **Pagamentos** — Stripe (Checkout + Connect)
- **Web Bluetooth (BLE) & IoT** — MQTT via WebSocket
- **PWA Instalável** + **App Nativo** (Capacitor iOS/Android)

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | PostgreSQL + Auth + Storage + Edge Functions |
| Editor | TipTap |
| 3D | Three.js + React Three Fiber |
| Colaboração | Yjs + y-webrtc |
| Pagamentos | Stripe |
| Mobile (Nativo) | Capacitor (iOS/Android) |

## 🏃 Como rodar localmente

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

### Build Mobile (Capacitor)

```sh
npx cap add android   # ou ios
npx cap sync
npx cap run android   # ou ios
```

## ©️ Propriedade

- **Criador**: Ericson Rodrigues Piccoli
- **Empresa**: ELP® Green Technology (CNPJ: 42.501.190/0001-70)
- **Todos os direitos reservados** © 2026
