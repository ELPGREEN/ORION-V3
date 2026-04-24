import re

file_path = "supabase/functions/neural-ops/index.ts"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update STT_RULES_BLOCK for 3-step response
old_stt_rules = """- NUNCA repita literalmente a transcrição do usuário.
- NUNCA ecoe a fala captada antes da resposta."""
new_stt_rules = """- PROCESSO DE RESPOSTA OBRIGATÓRIO (3 PASSOS):
  1. Transcrição literal exata em aspas (ex: "Transcrição: '...'").
  2. Lista de ruídos/dúvidas/pausas (ex: "Dúvidas: nenhuma" ou "Dúvidas: possível pausa longa").
  3. Resposta definitiva e confirmada.
- O microfone deve ficar SEMPRE ATIVO (always listening)."""

content = content.replace(old_stt_rules, new_stt_rules)

# 2. Update ORION_VOICE_FAST_PROMPT
old_fast_rules = "- NUNCA repita literalmente a transcrição do usuário."
new_fast_rules = "- OBRIGATÓRIO: Siga o processo de 3 passos (Transcrição literal -> Ruídos -> Resposta)."

content = content.replace(old_fast_rules, new_fast_rules)

# 3. Update ORION_SYSTEM_PROMPT_CONVERSATIONAL
old_conv_rules = "- NUNCA comece repetindo a transcrição literal do que ouviu."
new_conv_rules = "- OBRIGATÓRIO: Siga o processo de 3 passos (Transcrição literal -> Ruídos -> Resposta)."

content = content.replace(old_conv_rules, new_conv_rules)

with open(file_path, "w") as f:
    f.write(content)

print("3-step response rules updated in neural-ops.")
