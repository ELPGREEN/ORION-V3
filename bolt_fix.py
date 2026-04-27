import sys

# 1. Optimize Orchestrator (Cap history)
filepath = 'src/core/pentagon/orchestrator/PentagonPizzaOrchestrator.ts'
content = open(filepath).read()
if 'this.state.history.push(this.state.currentState);' in content:
    content = content.replace(
        'this.state.history.push(this.state.currentState);',
        'this.state.history.push(this.state.currentState);\n    if (this.state.history.length > 50) this.state.history.shift();'
    )
    with open(filepath, 'w') as f:
        f.write(content)

# 2. Hoist Regex in useOrionReasoning.ts
filepath = 'src/components/dashboard/neural/useOrionReasoning.ts'
content = open(filepath).read()

regex_lines = [
    '  const OWNER_ONLY_INTENT_REGEX = /auto_evolution|auto_construct|self_evolve|code_analysis|code_refactor|improve_code|analyze_code|refactor/i;',
    '  const VISUAL_COMMAND_REGEX = /\\b(o\\s+que\\s+(voc[eê]\\s+)?(est[aá]\\s+vendo|v[eê]|v[êe])|descrev[ae]\\s+(a\\s+)?(imagem|cena|ambiente|isso|aqui|isto)|analise\\s+(a\\s+)?(imagem|cena|c[aâ]mera|isso|isto|aqui)|identifique\\s+(o\\s+)?(objeto|rosto|texto|isso|isto|aqui)|leia\\s+(o\\s+)?(texto|isso|isto|aqui)|quantos?\\s+.+\\s+(tem|h[aá])|olh[ae]\\s*(a[ií]|aqui|agora|isso|isto|pra\\s+(c[aá]|mim))?|v[eê]\\s+(isso|isto|aqui|agora|a[ií])|que\\s+(é\\s+)?(isso|isto|aqui)|esse\\s+aqui|essa\\s+aqui|isso\\s+aqui|isto\\s+aqui|aqui\\s+(na\\s+(minha|sua)\\s+(m[aã]o|frente)|do\\s+lado)|t[aá]\\s+vendo|consegue\\s+ver|repara\\s+(nisso|aqui|isso))\\b/i;'
]

new_regex_block = """
const OWNER_ONLY_INTENT_REGEX = /auto_evolution|auto_construct|self_evolve|code_analysis|code_refactor|improve_code|analyze_code|refactor/i;
const VISUAL_COMMAND_REGEX = /\\b(o\\s+que\\s+(voc[eê]\\s+)?(est[aá]\\s+vendo|v[eê]|v[êe])|descrev[ae]\\s+(a\\s+)?(imagem|cena|ambiente|isso|aqui|isto)|analise\\s+(a\\s+)?(imagem|cena|c[aâ]mera|isso|isto|aqui)|identifique\\s+(o\\s+)?(objeto|rosto|texto|isso|isto|aqui)|leia\\s+(o\\s+)?(texto|isso|isto|aqui)|quantos?\\s+.+\\s+(tem|h[aá])|olh[ae]\\s*(a[ií]|aqui|agora|isso|isto|pra\\s+(c[aá]|mim))?|v[eê]\\s+(isso|isto|aqui|agora|a[ií])|que\\s+(é\\s+)?(isso|isto|aqui)|esse\\s+aqui|essa\\s+aqui|isso\\s+aqui|isto\\s+aqui|aqui\\s+(na\\s+(minha|sua)\\s+(m[aã]o|frente)|do\\s+lado)|t[aá]\\s+vendo|consegue\\s+ver|repara\\s+(nisso|aqui|isso))\\b/i;
"""

for line in regex_lines:
    content = content.replace(line, '')

# Insert before the function
if 'export function useOrionReasoning' in content:
    content = content.replace('export function useOrionReasoning', new_regex_block + '\nexport function useOrionReasoning')

with open(filepath, 'w') as f:
    f.write(content)
