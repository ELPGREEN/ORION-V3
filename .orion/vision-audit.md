# Auditoria do Pipeline de Visão Neural

> Atualizado após Fase 2.

## ✅ Fase 2 — concluída (limpeza segura)

Removido de `src/components/dashboard/neural/NeuralVision.tsx`:
- import `classifyImage` (não usado no arquivo — continua sendo usado em `orion-orchestrator-exec.ts`)
- imports `FilesetResolver`, `ObjectDetector` de `@mediapipe/tasks-vision`
- vars globais `mpObjectDetector`, `mpVisionReady`
- função `preloadVisionModel` (apenas imprimia warning)
- env `VITE_VISION_MEDIAPIPE_FRAMESKIP` (consumida só pela branch morta)
- refs `lastLocalDetectionRef`, `localDetectionRunningRef`
- branch ML inteira (linhas antigas 731-765) que dependia de `mpObjectDetector && mpVisionReady` — sempre falsa

**Resultado:** ~40 linhas a menos, bundle perde dependência tipada `@mediapipe/tasks-vision` (a lib em si só sai do bundle se nenhum outro arquivo usar — verificar separadamente). Zero mudança de comportamento.

---

## ⚠️ Fase 3 — descoberta crítica antes de mexer

### M4 (bug "pede melhorias quando pergunto o que vê") — **a guarda JÁ EXISTE**

`useOrionReasoning.ts` linhas 463-472 já contém:

```ts
if (VISUAL_COMMAND_REGEX.test(qLow) && intentType !== "visual") {
  addLog(`🛡️ Visual guard: forcing visual intent (was ${intentType})`);
}
const effectiveIntentType = VISUAL_COMMAND_REGEX.test(qLow) ? "visual" : intentType;

if ((OWNER_ONLY_INTENT_REGEX.test(intentType)
     || OWNER_ONLY_INTENT_REGEX.test(somResult.handler)
     || (/\b(refator|refactor|analis[ae].*c[oó]digo|melhor[ae].*c[oó]digo)\b/i.test(qLow)
         && effectiveIntentType !== "visual"))
    && !isOwner) {
  // fallback: "esse tipo de análise é restrito à administração"
}
```

A regex visual cobre até frases coloquiais (`olha aí`, `vê isso`, `t[áa] vendo`, `consegue ver`, `esse aqui`, `aqui na minha mão` etc.). E o owner-gate cobre `refactor`, `analyze code`, `improve code` em PT/EN.

**Conclusão:** o sintoma reportado ("Orion responde com sugestão de refator quando pergunto o que vê") **não pode ser causado por essa branch** se o usuário for autenticado como owner — porque para owner a guarda **deixa passar** a intent code. Se for non-owner, a guarda **bloqueia** com mensagem de admin.

### Hipóteses reais para o sintoma

1. **Você está autenticado como owner** → o gate deixa `improve_code` rodar mesmo quando a pergunta era visual, **porque o classificador de intent (`classifyIntent` em `orion-ai-client`) está retornando intent errada** antes do gate. A regex visual força `effectiveIntentType="visual"`, mas o **handler já foi resolvido por `somResult.handler`** que não é reescrito.
2. O bug está no **dispatcher downstream**: mesmo com `effectiveIntentType="visual"`, alguma branch posterior usa `intentType` original ou `somResult.handler` para decidir o que executar.
3. Câmera estava off → pipeline visual não tinha frame → fallback caiu numa intent textual qualquer.

### Por que NÃO vou alterar código agora

Mexer no dispatcher sem reproduzir o bug é violação direta da sua regra (`mem://preference/vision-optimize-only`: "só melhorar performance, nunca alterar o que funciona"). Preciso de um dos seguintes para fechar M4 com segurança:

- **(a)** Print do console do navegador (F12) no momento exato em que você pergunta "o que você está vendo?" e ele responde sobre código. Quero ver as linhas com `[useOrionReasoning]`, `🛡️ Visual guard`, `intent=`, `handler=`.
- **(b)** Confirmação de qual tela e se a câmera estava ligada (luz da webcam acesa).
- **(c)** Se você está autenticado como owner ou como guest.

Com isso, em 5 min identifico o ponto exato e corrijo só ele.

---

## Restante da Fase 3 (segura, posso fazer agora se autorizar)

| Item | Risco | Ação |
|------|-------|------|
| **A1** — `multimodal-pipeline.ts` chama agente que é stub | Baixo | Remover `agentCycle`/`realTimeVision`/`agentContext` do retorno e do `MultimodalContext` |
| **A2** — `orion-orchestrator-exec.ts` itera APIs de stubs vazios | Médio | Trocar `orchestratorSee` para chamar diretamente `analyzeFrameSmart` (caminho real) |
| **A3** — `processFrame` Phase 7-10 são stubs | Baixo | Remover blocos das linhas ~319-363 + campos correspondentes em `VS` |

Posso aplicar A1+A3 agora (baixo risco, sem mudar comportamento útil — só removem trabalho desperdiçado). A2 deixaria para depois de M4 resolvido.

**Aguardo:**  
1. Autorizar A1+A3 (limpeza de stubs no pipeline).  
2. Me passar console/contexto para investigar M4 com base real.
