

# Plano: Tornar o Formant Synth Inteligível (v6)

## Diagnóstico

O som sai mas é ininteligível por 3 razões técnicas principais:

1. **Ressonadores em paralelo** — O modelo atual soma F1+F2+F3+F4 em paralelo. Para fala, o trato vocal é uma **cascata** (série): a saída de F1 alimenta F2, que alimenta F3, etc. Paralelo funciona para análise, cascata para síntese realista.

2. **Fonte glotal muito simples** — O Rosenberg C produz um pulso limpo demais. Falta a riqueza harmônica real do Iapetus. Precisa usar o `harmonicProfile` de 10 harmônicos diretamente na geração do pulso.

3. **Duração dos fonemas muito curta** — Vogais com 80-110ms são rápidas demais para o cérebro processar. Fala natural em PT-BR usa 120-180ms para vogais tônicas.

## Mudanças Técnicas

### 1. `formantSynth.ts` — Reescrever motor (v6)

- **Trocar paralelo → cascata**: F1 → F2 → F3 → F4 em série
- **Fonte glotal com harmônicos reais**: Usar os 10 harmônicos do `VOICE_DNA.harmonicProfile` para construir o pulso, em vez do Rosenberg C simplificado
- **Aumentar ganho do F1/F2**: São os formantes que definem identidade da vogal
- **Reduzir pre-emphasis**: De 0.4 para 0.15 (menos agressivo)
- **Adicionar anti-zeroing nasal**: Zeros nasais em ~500Hz para nasais reais

### 2. `phonemes.ts` — Aumentar durações

- Vogais orais: +40% duração (ex: 'a' de 110→155ms, 'i' de 80→115ms)  
- Vogais nasais: +30%
- Plosivas: manter curtas (realista)
- Fricativas: +20%
- Pausas: manter

### 3. Verificação

- Gerar WAV de teste com frase "Olá, eu sou o Orion" e validar espectrograma
- Comparar com sample Iapetus-11 enviado

## Resultado Esperado

Vogais distinguíveis entre si (a/e/i/o/u), consoantes audíveis, ritmo natural de PT-BR. Ainda será voz sintética, mas **compreensível**.

