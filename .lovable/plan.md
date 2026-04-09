

# Remoção Cirúrgica — Somente Edge Functions Fantasma Comprovadas

Verificação feita função por função, com busca no `src/` inteiro e em todas as outras edge functions.

## O que será removido (5 edge functions com ZERO referências)

| Edge Function | Linhas | Prova |
|---|---|---|
| `elevenlabs-tts` | ~20 | Stub desabilitado. 0 refs em `src/`, 0 refs em outras functions. Constraint de memória proíbe. |
| `extract-code` | ~80 | Nunca chamada. 0 refs em `src/`, 0 refs em outras functions. |
| `google-workspace` | ~490 | Nunca integrada. 0 refs em `src/`, 0 refs em outras functions. |
| `translate-libre` | ? | Substituída por `translate-text`. 0 refs em `src/`, 0 refs em outras functions. |
| `ibm-quantum` | ~120 | Experimental. 0 refs em `src/`, 0 refs em outras functions. |

## O que NÃO será tocado

- Nenhuma tabela do banco de dados
- Nenhuma função DB
- Nenhum arquivo no `src/`
- Nenhuma outra edge function

## Passos

1. **Deletar os 5 diretórios** de edge functions: `elevenlabs-tts`, `extract-code`, `google-workspace`, `translate-libre`, `ibm-quantum`
2. **Remover do deploy** usando a ferramenta de delete de edge functions
3. **Nada mais** — zero alterações em código, banco ou configuração

Somente remoção de código morto. Sem efeitos colaterais.

