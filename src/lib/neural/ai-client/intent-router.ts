/**
 * Intent Router — classifyIntent
 * Extracted from orion-ai-client.ts (lines 1100-1187)
 * Classifies user questions into: visual | textual | mixed | self_evolve | auto_construct | web_search | url_analysis | youtube_summary | image_generation
 */

// ═══ PRE-COMPILED REGEXES ═══
const HEARING_CHECK_PATTERNS = /\b(voc[eê]\s+consegue\s+me\s+ouvir|voc[eê]\s+me\s+ouve|t[aá]\s+me\s+ouvindo|est[aá]\s+me\s+ouvindo|consegue\s+me\s+escutar|me\s+escuta)\b/i;
const SELF_IDENTITY_PATTERNS = /\b(quem\s+[eé]\s+voc[eê]|qual\s+[eé]\s+o\s+seu\s+nome|sua\s+personalidade|seu\s+signo|sua\s+hist[óo]ria|o\s+que\s+[eé]\s+voc[eê]|quando\s+voc[eê]\s+nasceu|conte\s+sobre\s+voc[eê]|fale\s+sobre\s+voc[eê]|fala\s+sobre\s+voc[eê]|me\s+conta(?:\s+um\s+pouco)?\s+sobre\s+voc[eê]|me\s+fala(?:\s+um\s+pouco)?\s+sobre\s+voc[eê])\b/i;
const CONVERSATIONAL_COMPLAINT_PATTERNS = /\b(ent[aã]o|cara|mano|tu|voc[eê]|c[eê])\b.*\b(n[aã]o\s+me\s+responde|n[aã]o\s+responde|me\s+ignora|n[aã]o\s+entende|n[aã]o\s+capta|n[aã]o\s+peg[ao]|s[oó]\s+peg[ao]\s+duas?|tr[eê]s\s+palavras|frase\s+inteira|t[aá]\s+me\s+tirando|arquivo\s+srfx|srfx)\b/i;
const VOICE_FAST_SHORTCUT_REGEX = /^(?:oi|ol[áa]|ola|opa|ei|hey|e\s*aí|e\s*ai|fala|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|valeu|obrigad[oa]|ok(?:ay)?|certo|beleza|sim|n[aã]o|nao|pode\s+repetir|repete|repita|me\s+ouve|me\s+escuta|t[aá]\s+me\s+tirando|arquivo\s+srfx|srfx)\b/i;
const VOICE_COMPLEXITY_GUARD_REGEX = /\b(quem|qual|quais|como|por\s+que|porque|quando|onde|explica|explique|resuma|resume|analisa|analise|compare|detalha|detalhe|contexto|mem[óo]ria|hist[óo]rico|base|conteúdo|documento|contrato|lei|artigo|processo|cliente|jules|pentagon|pentagol|rede\s+neural)\b/i;
const EXPLICIT_VISUAL_PATTERNS = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+vendo|v[eê]|v[êe] na c[aâ]mera)|o\s+que\s+tem\s+(na\s+frente|a[ií]|aqui)|descrev[ae]|s\s+mostre\s+o\s+que\s+v[eê]|analise\s+(a\s+)?(imagem|cena|ambiente|o\s+que\s+v[eê])|me\s+mostre\s+o\s+que\s+v[eê]|analise\s+(a\s+)?(imagem|cena|c[aâ]mera)|leia\s+(o\s+)?texto\s+(da\s+)?(imagem|c[aâ]mera)|identifique\s+(o\s+)?(objeto|rosto|texto)|quantos?\s+[^.?!]*\s+(tem|h[aá])\b/i;
const IMAGE_GEN_PATTERNS = /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae]|gerar?\s+foto|cri[ae]\s+(uma?\s+)?ilustra[çc][ãa]o|generate\s+(an?\s+)?image|draw|create\s+(an?\s+)?image|make\s+(an?\s+)?image|paint|sketch)\b/i;
const WEB_SEARCH_PATTERNS = /\b(hoje|atual|atualmente|recente|notícia|preço\s+d[eoa]|cotação|quem\s+é|quando\s+(foi|será|é)|onde\s+fica|resultado\s+d[eoa]|placar|eleição|último|última|novo\s+|nova\s+|2024|2025|2026|tempo\s+(em|na|no)|clima|previsão|lançamento|estreia|pesquis[ae]\s+na\s+web|busca\s+na\s+internet|search\s+for|look\s+up|news|current|latest|trending)\b/i;
const AUTO_CONSTRUCT_VERB_PATTERNS = /\b(crie?|gere?|implemente?|desenvolv[ae]|programe?|codifique|escreva|refatore?|monte|construa)\b/i;
const AUTO_CONSTRUCT_ARTIFACT_PATTERNS = /\b(c[óo]digo|fun[çc][ãa]o|endpoint|api|componente|tabela|migra[çc][ãa]o|script|arquivo|classe|hook|rota|p[áa]gina|feature|bot[aã]o|integra[çc][ãa]o|edge\s*function)\b/i;
const SELF_EVOLVE_VERB_PATTERNS = /\b(melhore-se|melhore\s+se|evolua|evolu[íi]r?|auto[-\s]?evolu[íi]r?|auto[-\s]?program[ae]|se\s+reprogram[ae]|recalibre|se\s+calibre|se\s+atualize|upgrade)\b/i;
const SELF_EVOLVE_TARGET_PATTERNS = /\b(seu\s+c[óo]digo|seus?\s+protocolos?|suas?\s+respostas?|você\s+mesmo|voc[eê]\s+mesmo|a\s+si\s+mesmo|se)\b/i;

const VERB_IDENTIFY = /\b(identific[ãa]r?|identifique|identify|reconhe[cç][ãa]o|reconozc[ãa]|identificar?)\b/i;
const VERB_ANSWER = /\b(respond[ãa]r?|me\s+respond[ãa]o|me\s+diz|me\s+fal[ãa]o|me\s+conta|answer|tell\s+me|explain|reply)\b/i;
const VERB_ANALYZE = /\b(analis[ãa]r?|analise|analy[sz]e|evaluat[ãa]o|examinar?)\b/i;
const VERB_CHECK = /\b(verific[ãa]r?|verifique|checar?|confir[aem]r?|check|verify)\b/i;
const VERB_SEARCH = /\b(pesquis[ãa]r?|busc[ãa]r?|procur[ãa]r?|google|search|look\s+up|find)\b/i;
const VERB_COMPARE = /\b(compar[ãa]r?|diferença\s+entre|versus|vs\b|melhor\s+entre)\b/i;
const VERB_REFLECT = /\b(reflita|pens[ãa]s\s+sobre|consider[ãa]o|raciocin[ãa]o|reason|think\s+about|ponderar)\b/i;

const STRONG_VISUAL_ANCHORS = /\b(segurando|usando|vestindo|mostr[ae]|aparência|rosto|cor\b|enxerg|olh[ae]|vê|vejo|vendo|câmera|imagem|foto|holding|wearing|showing|face|camera|image|photo)\b/i;
const BODY_REF = /\b(mão|mãos|dedo|braço|cabeça|rosto|olho|boca|cabelo|roupa|camisa|camiseta|óculos|chapéu|caneca|copo|garrafa|hand|finger|arm|head|eye|mouth|hair|shirt|glasses|hat|cup|bottle)\b/i;
const DEICTIC_PATTERNS = /\b(isso|isto|esse|essa|aquilo|aqui|ali|lá|aí|aquel[ea]s?|this|that|these|those|here|there|esto|eso|aquello)\b/i;

const STRONG_TEXTUAL = /\b(que dia|que horas|hora|data de hoje|capital d[aoe]|piada|conta uma|explica|defin[ie]|signific|quem é|quem foi|quanto é|calcul|agenda|prazo|processo|cliente|documento|resumo|traduz|como funciona|o que é|por que|quando foi|onde fica|qual é|quais são|previsão|temperatura|clima|tempo|notícia|cotação|dólar|euro|bitcoin|what time|what day|capital of|joke|explain|define|meaning|who is|how much|calculate|schedule|deadline|summary|translate|how does|what is|why|when|where|which)\b/i;
const KNOWLEDGE_PATTERNS = /\b(histór|ciência|matemática|física|química|política|economi|filosofi|programa[çc]ão|código|lei\b|artigo\b|jurisprudência|direito|constitui[çc]|penal|trabalhist|contrato|clt|cdc|lgpd|recurso|habeas|mandado|sentença|acórdão|súmula|tribunal|stf|stj|indenizaç|prescriç|responsabilidade\s*civil|tutela|execuç|licitaç|improbidade|tributári)\b/i;
const CONVERSATIONAL_PATTERNS = /\b(opini[ãa]o|acha\s+que|concorda|discorda|argumento|debate|sugir[ãa]o|recomend|aconselh|orienta[çc]ã[o]o|estrat[ée]gia|planej|organiz|prioriz|importa\b|melhor\s+forma|como\s+(posso|devo|faz)|me\s+ajud|preciso\s+de|tenho\s+que|deveria|poderia|gostaria|queria)\b/i;
const EMOTIONAL_PATTERNS = /\b(sinto|sentindo|triste|feliz|ansios|preocupad|estressad|frustrad|animad|chateado|confus[oa]|nervos[oa]|calm[oa]|motiv|desanima|angústi|med[oa]|raiva|alegr|satisf)\b/i;

const YOUTUBE_DOMAIN_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/i;
const URL_DOMAIN_REGEX = /https?:\/\/[^\s]+/i;

export function classifyIntent(
  question: string,
  recentIntents?: string[],
): "visual" | "textual" | "mixed" | "self_evolve" | "auto_construct" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation" {
  const q = question.toLowerCase().trim();

  // Skip classification for very short inputs (likely voice artifacts)
  if (q.length < 2) return "mixed";

  // Conversational identity/hearing guard — NEVER route these to code/evolution/media
  if (HEARING_CHECK_PATTERNS.test(q) || SELF_IDENTITY_PATTERNS.test(q) || CONVERSATIONAL_COMPLAINT_PATTERNS.test(q)) return "textual";

  // Visual command guard — never let camera/scene questions fall into code/evolution buckets
  if (EXPLICIT_VISUAL_PATTERNS.test(q)) return "visual";

  // ═══ OPERA AI: Image generation intent (highest priority) ═══
  if (IMAGE_GEN_PATTERNS.test(q)) return "image_generation";

  // ═══ OPERA AI: YouTube summary intent ═══
  if (YOUTUBE_DOMAIN_REGEX.test(q)) return "youtube_summary";

  // ═══ OPERA AI: URL analysis intent ═══
  if (URL_DOMAIN_REGEX.test(q) && !YOUTUBE_DOMAIN_REGEX.test(q)) return "url_analysis";

  // ═══ OPERA AI: Web search intent ═══
  if (WEB_SEARCH_PATTERNS.test(q)) return "web_search";

  // ═══ Auto-construct intent ═══
  if (AUTO_CONSTRUCT_VERB_PATTERNS.test(q) && AUTO_CONSTRUCT_ARTIFACT_PATTERNS.test(q)) return "auto_construct";

  // ═══ Self-evolution intent ═══
  if (SELF_EVOLVE_VERB_PATTERNS.test(q) && SELF_EVOLVE_TARGET_PATTERNS.test(q)) return "self_evolve";

  // Direct visual questions — short-circuit to visual
  if (STRONG_VISUAL_ANCHORS.test(q) && (DEICTIC_PATTERNS.test(q) || BODY_REF.test(q) || /o que (é|está|têm)\b/.test(q))) {
    return "visual";
  }
  if (/o que.*(segurando|usando|vestindo|mostrando)/i.test(q)) return "visual";
  if (/como\s+(eu\s+)?(estou|tô)\b/i.test(q) && q.length < 40) return "visual";

  if (VERB_IDENTIFY.test(q)) return "visual";
  if (VERB_ANSWER.test(q) && !STRONG_VISUAL_ANCHORS.test(q)) return "textual";
  if (VERB_CHECK.test(q) && !DEICTIC_PATTERNS.test(q)) return "textual";
  if (VERB_SEARCH.test(q)) return "textual";
  if (VERB_COMPARE.test(q)) return "textual";
  if (VERB_REFLECT.test(q)) return "textual";
  if (VERB_ANALYZE.test(q)) {
    return DEICTIC_PATTERNS.test(q) || STRONG_VISUAL_ANCHORS.test(q) ? "visual" : "mixed";
  }

  // ═══ Contextual scoring system ═══
  let visualScore = 0;
  let textualScore = 0;

  if (DEICTIC_PATTERNS.test(q)) visualScore += 3;
  if (STRONG_VISUAL_ANCHORS.test(q)) visualScore += 3;
  if (BODY_REF.test(q)) visualScore += 2;
  if (/o que (é|são|tem)/.test(q) && DEICTIC_PATTERNS.test(q)) visualScore += 3;
  if (/\btô\b/.test(q) && q.length < 40) visualScore += 1;

  if (STRONG_TEXTUAL.test(q)) textualScore += 3;
  if (KNOWLEDGE_PATTERNS.test(q)) textualScore += 2;
  if (CONVERSATIONAL_PATTERNS.test(q)) textualScore += 3;
  if (EMOTIONAL_PATTERNS.test(q)) textualScore += 2;
  if (/^(o que|como|por que|quando|onde|quem|qual|quais|quanto)\b/.test(q) && !DEICTIC_PATTERNS.test(q) && !STRONG_VISUAL_ANCHORS.test(q) && !BODY_REF.test(q)) textualScore += 2;
  if (q.includes("?") && !DEICTIC_PATTERNS.test(q) && !STRONG_VISUAL_ANCHORS.test(q)) textualScore += 1;
  if (q.length > 80 && visualScore === 0) textualScore += 1;

  // Context from recent conversation
  if (recentIntents && recentIntents.length > 0) {
    const lastIntent = recentIntents[recentIntents.length - 1];
    if (lastIntent === "visual" && q.length < 20) visualScore += 1;
    if (lastIntent === "textual" && !DEICTIC_PATTERNS.test(q)) textualScore += 1;
    if (q.length < 15 && recentIntents.length >= 2) {
      const prevTwo = recentIntents.slice(-2);
      if (prevTwo.every(i => i === "textual")) textualScore += 1;
      if (prevTwo.every(i => i === "visual")) visualScore += 1;
    }
  }

  if (q.length < 8 && visualScore === 0 && textualScore === 0) return "mixed";

  const diff = visualScore - textualScore;
  if (diff >= 2) return "visual";
  if (diff <= -2) return "textual";
  if (visualScore > 0 && textualScore > 0) return "mixed";
  if (visualScore > 0) return "visual";
  if (textualScore > 0) return "textual";
  return q.length < 15 ? "mixed" : "textual";
}
