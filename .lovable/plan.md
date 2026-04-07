

# Adicionar Seções Enterprise/Robótica/Industrial na Página Inicial

## Situação Atual

A página inicial (`Index.tsx`) tem apenas:
- Hero → About → Video → WhoIsItFor → WhyOrion → Comparison → CTA

**Faltam completamente**: a linha robótica Smart OTR, automação industrial, arquitetura do sistema, stack tecnológica e segurança (Orion Shield). Esses componentes **já existem** mas não estão importados na Home:
- `SmartOtrSection` — Linha robótica OTR (pneus gigantes)
- `SystemArchitectureSection` — 9 módulos do Orion (Neural, CRM, Docs, etc.)
- `TechStackSection` — Stack tecnológica proprietária
- `SecurityShieldSection` — Orion Shield (segurança)

## Plano

### 1. Importar e adicionar as 4 seções na Home

Editar `src/pages/Index.tsx` para incluir as seções que já existem, na seguinte ordem:

```
Hero
About (Google OAuth)
OrionVideoShowcase
WhoIsItForSection
SystemArchitectureSection  ← NOVO (módulos da plataforma)
SmartOtrSection             ← NOVO (linha robótica OTR)
TechStackSection            ← NOVO (stack/infra)
SecurityShieldSection       ← NOVO (Orion Shield)
WhyOrionSection
ComparisonSection
CtaSection
Footer
```

### 2. Corrigir link da SmartOtrSection

O CTA "Conheça Nossa Tecnologia" aponta para `/sobre` (que é redirect). Mudar para `/servicos#industria`.

### 3. Reduzir espaçamento das novas seções

As 4 seções usam `py-20 sm:py-28` — reduzir para `py-12 sm:py-16` para manter consistência com o restante da Home (que já foi compactada).

## Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Index.tsx` | Importar e posicionar as 4 seções |
| `src/components/home/SmartOtrSection.tsx` | Fix link `/sobre` → `/servicos#industria`, reduzir padding |
| `src/components/home/SystemArchitectureSection.tsx` | Reduzir padding |
| `src/components/home/TechStackSection.tsx` | Reduzir padding |
| `src/components/home/SecurityShieldSection.tsx` | Reduzir padding |

