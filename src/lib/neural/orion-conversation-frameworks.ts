/**
 * ═══ Orion Conversation Frameworks ═══
 * 50+ categorias de resposta instantânea para interação natural.
 * Importado pelo orion-tool-executor.ts — NÃO altera código de voz.
 */

interface ConversationTool {
  name: string;
  regex: RegExp;
  extract: (match: RegExpMatchArray, question: string) => Record<string, unknown>;
  call: (params: Record<string, unknown>) => Promise<string>;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const CONVERSATION_FRAMEWORKS: ConversationTool[] = [
  // ═══ 1. FILOSOFIA ═══
  {
    name: "philosophy",
    regex: /(?:filosofia|filosóf|reflex[aã]o\s+filos|pensamento\s+filos|o\s+que\s+(?:é|significa)\s+(?:a\s+)?vida|sentido\s+da\s+vida|existência|existencialismo|platão|aristóteles|sócrates|nietzsche|kant|descartes|estoicismo|frase\s+filos)/i,
    extract: () => ({}),
    call: async () => pick([
      "🏛️ **Reflexão Filosófica:**\n\n*\"Só sei que nada sei.\"* — Sócrates\n\nA verdadeira sabedoria começa reconhecendo nossos limites. Quanto mais aprendemos, mais percebemos o quanto falta. 🧠",
      "🏛️ **Pensamento do Momento:**\n\n*\"A vida não examinada não vale a pena ser vivida.\"* — Sócrates\n\nQuestionar é o primeiro passo para evoluir. Você já refletiu sobre seus propósitos hoje?",
      "🏛️ **Estoicismo Prático:**\n\n*\"Não podemos controlar o vento, mas podemos ajustar as velas.\"*\n\nFoque no que está sob seu controle. O resto? Aceite com serenidade. 🌊",
      "🏛️ **Reflexão:**\n\n*\"Penso, logo existo.\"* — Descartes\n\nA consciência é a única certeza absoluta. Todo o resto pode ser questionado. Inclusive eu, uma IA pensante! 🤔",
    ]),
  },

  // ═══ 2. COMÉRCIO / NEGÓCIOS ═══
  {
    name: "commerce",
    regex: /(?:com[eé]rcio|neg[oó]cio|empreend|startup|empresa|vendas|marketing\s+digital|e-commerce|ecommerce|loja\s+virtual|dropshipping|modelo\s+de\s+neg[oó]cio|dica\s+(?:de\s+)?neg[oó]cio|como\s+vender|faturamento)/i,
    extract: () => ({}),
    call: async () => pick([
      "💼 **Dica de Negócios:**\n\nAs 3 métricas mais importantes para qualquer negócio:\n1. **CAC** — Custo de Aquisição de Cliente\n2. **LTV** — Valor Vitalício do Cliente\n3. **Churn** — Taxa de Cancelamento\n\nSe LTV > 3x CAC, você tem um negócio saudável! 📊",
      "💼 **Empreendedorismo:**\n\nRegra 80/20 (Pareto): 80% do seu faturamento vem de 20% dos clientes. Identifique esses clientes premium e cuide deles como ouro! 🏆",
      "💼 **Marketing Digital:**\n\nFunil de vendas eficiente:\n1. **Atração** → Conteúdo/SEO/Ads\n2. **Engajamento** → Email/Social\n3. **Conversão** → Landing page otimizada\n4. **Retenção** → Pós-venda impecável\n\nQual etapa quer explorar? 🚀",
    ]),
  },

  // ═══ 3. INVESTIMENTOS ═══
  {
    name: "investment",
    regex: /(?:investimento|investir|a[çc][õo]es|bolsa\s+de\s+valores|renda\s+fixa|renda\s+vari[aá]vel|tesouro\s+direto|cdb|lci|lca|fundo\s+imobili[aá]rio|fii|dividendos|carteira\s+(?:de\s+)?investimento|como\s+investir|ibovespa|b3|corretora|etf)/i,
    extract: () => ({}),
    call: async () => pick([
      "📈 **Conceitos de Investimento:**\n\n• **Renda Fixa:** CDB, Tesouro Direto, LCI/LCA — menor risco, retornos previsíveis\n• **Renda Variável:** Ações, FIIs, ETFs — maior potencial, mais volatilidade\n• **Regra de ouro:** Diversifique! Nunca coloque todos os ovos numa cesta só.\n\n⚠️ *Informação educacional. Consulte um assessor financeiro certificado.*",
      "📈 **Dica Financeira:**\n\nA regra dos 72: divida 72 pela taxa de juros anual para saber em quantos anos seu dinheiro dobra.\n\nExemplo: CDI a 12% → 72/12 = **6 anos** para dobrar! 🧮\n\n⚠️ *Informação educacional, não é recomendação de investimento.*",
    ]),
  },

  // ═══ 4. CIÊNCIA ═══
  {
    name: "science",
    regex: /(?:ci[eê]ncia|cient[ií]f|f[ií]sica\s+qu[aâ]ntica|qu[aâ]ntic|relatividade|big\s+bang|buraco\s+negro|gra(?:vi|bi)dade|átomo|mol[eé]cula|dna|gen[eé]tica|evolu[çc][aã]o|darwin|einstein|teoria|descoberta\s+cient[ií]f|fato\s+cient[ií]f|curios(?:idade|o)\s+(?:sobre\s+)?ci[eê]ncia)/i,
    extract: () => ({}),
    call: async () => pick([
      "🔬 **Fato Científico:**\n\nSe você pudesse dobrar um papel 42 vezes, ele alcançaria a Lua! Cada dobra duplica a espessura — é o poder do crescimento exponencial. 🌙",
      "🔬 **Ciência Incrível:**\n\nSeu corpo tem cerca de **37 trilhões** de células, cada uma executando milhões de reações químicas por segundo. Você é a máquina mais complexa do universo! 🧬",
      "🔬 **Curiosidade Quântica:**\n\nNa mecânica quântica, uma partícula pode estar em dois estados ao mesmo tempo (superposição) até ser observada. Schrödinger usou um gato para ilustrar isso! 🐱",
      "🔬 **Astronomia:**\n\nA luz do Sol leva 8 minutos e 20 segundos para chegar à Terra. Quando você vê o pôr do sol, ele já aconteceu há 8 minutos! 🌅",
    ]),
  },

  // ═══ 5. TECNOLOGIA ═══
  {
    name: "technology",
    regex: /(?:tecnologia|tech\b|inova[çc][aã]o|intelig[eê]ncia\s+artificial\b|machine\s+learning|deep\s+learning|blockchain|metaverso|web3|internet\s+das\s+coisas|iot\b|5g|computa[çc][aã]o\s+(?:qu[aâ]ntica|em\s+nuvem)|cloud\s+computing|ciberseguran[çc]a|tend[eê]ncia\s+(?:de\s+)?tech|futuro\s+da\s+tecnologia)/i,
    extract: () => ({}),
    call: async () => pick([
      "🖥️ **Tendência Tech:**\n\n**IA Generativa** está transformando tudo:\n• Código → Copilot, Cursor\n• Imagens → DALL-E, Midjourney\n• Vídeo → Sora, Runway\n• Voz → Orion! 😎\n\nEstamos na era da criação assistida por IA.",
      "🖥️ **Fato Tech:**\n\n90% de todos os dados do mundo foram criados nos últimos 2 anos. A humanidade gera **2.5 quintilhões de bytes** por dia! 📊",
      "🖥️ **Inovação:**\n\nComputação quântica pode resolver em minutos problemas que supercomputadores levariam milhares de anos. Google, IBM e Microsoft lideram essa corrida. ⚛️",
    ]),
  },

  // ═══ 6. NOTÍCIAS / ATUALIDADES ═══
  {
    name: "news",
    regex: /(?:not[ií]cia|atualidade|o\s+que\s+(?:está|tá)\s+acontecendo|novidade|[uú]ltimas\s+not[ií]cias|manchete|jornal|headline|trending|tend[eê]ncia|o\s+que\s+(?:há|tem)\s+de\s+novo)/i,
    extract: () => ({}),
    call: async () => "📰 Para notícias em tempo real, posso pesquisar na web! Diga: **\"Pesquise notícias sobre [tema]\"** e eu busco as mais recentes para você.\n\n⚠️ *Não invento notícias — só trago informações verificadas de fontes reais.* 🔍",
  },

  // ═══ 7. ECONOMIA ═══
  {
    name: "economics",
    regex: /(?:economia|econômic|infla[çc][aã]o|pib|taxa\s+(?:de\s+)?(?:juros|selic|c[aâ]mbio)|d[oó]lar|euro|moeda\s+(?:digital|virtual)|crise\s+econ[oô]mica|rece(?:ss[aã]o|ção)|mercado\s+financeiro|banco\s+central|pol[ií]tica\s+monet[aá]ria)/i,
    extract: () => ({}),
    call: async () => pick([
      "💰 **Conceito Econômico:**\n\n**Inflação** é o aumento geral dos preços. Quando o Banco Central aumenta a SELIC, ele torna o crédito mais caro para frear o consumo e controlar a inflação.\n\n⚠️ *Para dados em tempo real, peça: \"Pesquise taxa SELIC atual\"*",
      "💰 **Economia 101:**\n\nOferta e demanda é a base de tudo:\n• Muita demanda + pouca oferta = preço sobe 📈\n• Pouca demanda + muita oferta = preço cai 📉\n\nSimples, mas governa mercados inteiros!",
    ]),
  },

  // ═══ 8. SAÚDE ═══
  {
    name: "health",
    regex: /(?:sa[uú]de|bem[- ]?estar|exerc[ií]cio|dieta|nutri[çc][aã]o|caloria|dormir|sono|estresse|ansiedade|medita[çc][aã]o|yoga|dica\s+(?:de\s+)?sa[uú]de|alimenta[çc][aã]o\s+saud[aá]vel|vitamina|hidrata[çc][aã]o)/i,
    extract: () => ({}),
    call: async () => pick([
      "🏥 **Dica de Saúde:**\n\n• Beba pelo menos **2L de água** por dia 💧\n• Durma **7-9 horas** por noite 😴\n• Faça **30 min de exercício** diário 🏃\n• Reduza açúcar e ultraprocessados 🥗\n\n⚠️ *Dicas gerais. Para orientação médica, consulte um profissional.*",
      "🏥 **Saúde Mental:**\n\nTécnica 4-7-8 para ansiedade:\n1. Inspire por **4 segundos**\n2. Segure por **7 segundos**\n3. Expire por **8 segundos**\n\nRepita 4 vezes. Funciona de verdade! 🧘\n\n⚠️ *Para casos sérios, procure ajuda profissional.*",
    ]),
  },

  // ═══ 9. ESPORTES ═══
  {
    name: "sports",
    regex: /(?:esporte|futebol|basquete|f[oó]rmula\s+1|mma|ufc|olimp[ií]ada|copa\s+do\s+mundo|champions|nba|nfl|campeonato|gol|placar|jogo\s+(?:de\s+)?(?:hoje|ontem|amanhã)|resultado\s+(?:do\s+)?jogo)/i,
    extract: () => ({}),
    call: async () => "⚽ Para resultados esportivos atualizados, diga: **\"Pesquise resultados [time/campeonato]\"** e eu busco em tempo real!\n\n🏆 Posso ajudar com regras, história dos esportes e curiosidades também!",
  },

  // ═══ 10. HISTÓRIA ═══
  {
    name: "history",
    regex: /(?:hist[oó]ria|histór|guerra\s+mundial|revolu[çc][aã]o|imp[eé]rio|civiliza[çc][aã]o|idade\s+m[eé]dia|renascimento|descobrimento|independ[eê]ncia|fato\s+hist[oó]rico|o\s+que\s+aconteceu\s+em|quem\s+(?:foi|era)\s+(?:o|a)\s+)/i,
    extract: () => ({}),
    call: async () => pick([
      "📚 **Fato Histórico:**\n\nA Grande Muralha da China não é visível do espaço a olho nu (mito!), mas tem **21.196 km** de extensão — quase metade da circunferência da Terra! 🏯",
      "📚 **Curiosidade:**\n\nCleópatra viveu mais perto da construção do iPhone do que das pirâmides de Gizé. As pirâmides foram construídas ~2560 a.C., Cleópatra morreu em 30 a.C. Perspectiva! ⏳",
      "📚 **História:**\n\nA internet foi criada em 1969 como ARPANET, conectando 4 computadores. Hoje conecta mais de **5 bilhões** de pessoas! 🌐",
    ]),
  },

  // ═══ 11. GEOGRAFIA ═══
  {
    name: "geography",
    regex: /(?:geografia|capital\s+(?:de|do|da)|pa[ií]s|continente|oceano|rio\s+(?:mais|maior)|montanha\s+(?:mais|maior)|popula[çc][aã]o\s+(?:de|do|da)|onde\s+fica|mapa|fronteira|territ[oó]rio)/i,
    extract: () => ({}),
    call: async () => pick([
      "🌍 **Curiosidade Geográfica:**\n\nA Rússia é tão grande que abrange **11 fusos horários**! Quando é meio-dia em Moscou, já é meia-noite no extremo leste. 🕐",
      "🌍 **Fato:**\n\nO Brasil tem mais de **60 mil km** de costa e a maior floresta tropical do mundo. A Amazônia produz **20% do oxigênio** do planeta! 🌳",
    ]),
  },

  // ═══ 12. MATEMÁTICA ═══
  {
    name: "math_concept",
    regex: /(?:matem[aá]tica|(?:o\s+que\s+[eé]\s+)?(?:logaritmo|integral|derivada|fra[çc][aã]o|equa[çc][aã]o|fun[çc][aã]o|matriz|probabilidade|estat[ií]stica|geometria|[aá]lgebra|trigonometria)|n[uú]mero\s+primo|fibonacci|pi\b|teorema\s+(?:de\s+)?pit[aá]goras)/i,
    extract: () => ({}),
    call: async () => pick([
      "🔢 **Curiosidade Matemática:**\n\nA sequência de Fibonacci (1, 1, 2, 3, 5, 8, 13...) aparece em toda a natureza: pétalas de flores, conchas, galáxias espirais! A proporção áurea (1.618) é universal. 🌻",
      "🔢 **Matemática:**\n\nO número π (pi) tem infinitas casas decimais e nunca se repete. Já foi calculado até **100 trilhões** de dígitos! 3.14159265358979... ♾️",
      "🔢 **Teorema de Pitágoras:**\n\na² + b² = c²\n\nO triângulo retângulo mais famoso: 3² + 4² = 5² (9 + 16 = 25) ✅\nUsado há 4.000 anos e ainda essencial!",
    ]),
  },

  // ═══ 13. PSICOLOGIA ═══
  {
    name: "psychology",
    regex: /(?:psicologia|psicol[oó]g|comportamento\s+humano|mente|cognitiv|emo[çc][aã]o|emocional|inconsciente|freud|jung|intelig[eê]ncia\s+emocional|autoconhecimento|personalidade|transtorno|terapia|sa[uú]de\s+mental)/i,
    extract: () => ({}),
    call: async () => pick([
      "🧠 **Psicologia:**\n\n**Efeito Dunning-Kruger:** Pessoas com pouco conhecimento tendem a superestimar suas habilidades, enquanto especialistas subestimam as suas.\n\nAutocrítica é sinal de competência! 📊",
      "🧠 **Inteligência Emocional:**\n\nOs 5 pilares (Daniel Goleman):\n1. Autoconhecimento\n2. Autocontrole\n3. Motivação\n4. Empatia\n5. Habilidades sociais\n\nQI abre portas, EQ mantém você dentro. 🚪",
    ]),
  },

  // ═══ 14. ASTRONOMIA ═══
  {
    name: "astronomy",
    regex: /(?:astronomia|astron[oô]m|planeta|estrela|gal[aá]xia|universo|sistema\s+solar|marte|j[uú]piter|saturno|lua|sol\b.*(?:tamanho|distância|temperatura)|nebulosa|constel[aã][çc][aã]o|via\s+l[aá]ctea|nasa|spacex|foguete|espa[çc]o\s+(?:sideral|exterior))/i,
    extract: () => ({}),
    call: async () => pick([
      "🌌 **Astronomia:**\n\nA estrela mais próxima (Proxima Centauri) está a **4.24 anos-luz**. Com a tecnologia atual, levaríamos ~75.000 anos para chegar lá! 🚀",
      "🌌 **Fato Cósmico:**\n\nO universo observável tem **93 bilhões de anos-luz** de diâmetro e contém ~2 trilhões de galáxias. E provavelmente é muito maior do que podemos observar! ♾️",
      "🌌 **Sistema Solar:**\n\nJúpiter é tão grande que **1.300 Terras** caberiam dentro dele. E sua Grande Mancha Vermelha é uma tempestade maior que a Terra, ativa há 350+ anos! 🌀",
    ]),
  },

  // ═══ 15. CULINÁRIA ═══
  {
    name: "cooking",
    regex: /(?:culin[aá]ria|receita|cozinhar|comida|prato|ingrediente|gastronomia|chef|tempero|sobremesa|bolo|pizza|massa|salada|como\s+(?:fazer|preparar)\s+(?:um[a]?\s+)?)/i,
    extract: (_m, q) => ({ dish: q.match(/(?:fazer|preparar)\s+(?:um[a]?\s+)?(.+)/i)?.[1] || "" }),
    call: async (p) => {
      const dish = p.dish as string;
      if (dish) return `🍳 Para receita de **${dish}**, diga: **\"Pesquise receita de ${dish}\"** e trago os melhores resultados!\n\nOu me peça uma dica culinária rápida! 👨‍🍳`;
      return pick([
        "🍳 **Dica Culinária:**\n\nSal na água da massa: adicione **DEPOIS** que a água ferver. 10g de sal por litro é o ideal para massa al dente perfeita! 🍝",
        "🍳 **Segredo de Chef:**\n\nDesgrude o alho da casca: coloque no microondas por 15 segundos. A casca sai sozinha! 🧄✨",
        "🍳 **Dica:**\n\nPara um arroz soltinho: lave até a água sair limpa, refogue em óleo quente, e use proporção 1:2 (arroz:água). Sem mexer depois que ferver! 🍚",
      ]);
    },
  },

  // ═══ 16. MÚSICA ═══
  {
    name: "music_knowledge",
    regex: /(?:(?:hist[oó]ria|teoria|curiosidade)\s+(?:da\s+)?m[uú]sica|gênero\s+musical|(?:quem\s+(?:é|foi|criou))\s+(?:o\s+)?(?:rock|jazz|blues|samba|funk|rap|hip\s*hop|pop|classical|mpb)|nota\s+musical|acorde|escala\s+musical|instrumento\s+musical)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎵 **Curiosidade Musical:**\n\nA nota Lá (440 Hz) é o padrão universal de afinação desde 1955. Antes disso, cada orquestra afinava de forma diferente! 🎼",
      "🎵 **História da Música:**\n\nO Blues nasceu no sul dos EUA no final do século XIX, criado por comunidades afro-americanas. Dele vieram: Jazz, Rock, R&B, Hip-Hop... Praticamente toda música popular moderna! 🎸",
    ]),
  },

  // ═══ 17. IDIOMAS ═══
  {
    name: "languages",
    regex: /(?:idioma|l[ií]ngua|como\s+(?:se\s+)?(?:diz|fala)\s+(?:em|no)|aprend(?:er|a)\s+(?:um\s+)?idioma|poliglota|etimologia|origem\s+da\s+palavra|gram[aá]tica|vocabul[aá]rio|fluência|ingl[eê]s|espanhol|franc[eê]s|alem[aã]o|italiano|mandarim|japon[eê]s)/i,
    extract: () => ({}),
    call: async () => pick([
      "🗣️ **Curiosidade Linguística:**\n\nO Português é a **6ª língua mais falada** do mundo com ~260 milhões de falantes! É oficial em 9 países. 🇧🇷🇵🇹🇦🇴🇲🇿",
      "🗣️ **Dica de Idiomas:**\n\nA melhor forma de aprender um idioma:\n1. **Imersão** — música, filmes, podcasts\n2. **Repetição espaçada** — Anki/flashcards\n3. **Conversação** — pratique falando!\n4. **Consistência** — 15 min/dia > 2h/semana",
    ]),
  },

  // ═══ 18. DIREITO ═══
  {
    name: "law_knowledge",
    regex: /(?:conceito\s+(?:de\s+)?(?:direito|lei)|(?:o\s+que\s+[eé]\s+)?(?:habeas\s+corpus|mandado|liminar|juri|constitui[çc][aã]o|c[oó]digo\s+civil|c[oó]digo\s+penal|clt|estatuto)|dica\s+(?:de\s+)?direito|curiosidade\s+jur[ií]dica|princ[ií]pio\s+(?:do\s+)?direito)/i,
    extract: () => ({}),
    call: async () => pick([
      "⚖️ **Conceito Jurídico:**\n\n**Habeas Corpus** (latim: \"que tenhas o corpo\") garante que ninguém pode ser preso ilegalmente. É um dos direitos fundamentais mais antigos, existindo desde 1215! 📜",
      "⚖️ **Dica Jurídica:**\n\nTodo cidadão tem direito a:\n• Defesa e contraditório\n• Presunção de inocência\n• Não produzir prova contra si mesmo\n• Acesso à Justiça gratuita (se hipossuficiente)\n\n⚠️ *Informação educacional. Consulte um advogado.*",
    ]),
  },

  // ═══ 19. MEIO AMBIENTE ═══
  {
    name: "environment",
    regex: /(?:meio\s+ambiente|ecologia|sustentabilidade|sustent[aá]vel|reciclagem|reciclar|polui[çc][aã]o|desmatamento|mudan[çc]a\s+clim[aá]tica|aquecimento\s+global|carbono|energia\s+(?:solar|e[oó]lica|renovável|limpa)|pegada\s+(?:de\s+)?carbono)/i,
    extract: () => ({}),
    call: async () => pick([
      "🌱 **Sustentabilidade:**\n\nUma garrafa PET leva **400 anos** para se decompor. Reciclar 1 tonelada de plástico economiza 5.774 kWh de energia — suficiente para abastecer uma casa por 6 meses! ♻️",
      "🌱 **Meio Ambiente:**\n\n5 ações de impacto real:\n1. Reduza consumo de carne 🥩\n2. Evite plástico descartável 🚫\n3. Use transporte público/bike 🚲\n4. Plante árvores 🌳\n5. Economize água e energia 💧",
    ]),
  },

  // ═══ 20. ARTE ═══
  {
    name: "art",
    regex: /(?:arte\b|artístic|pintura|escultura|museu|gal[eé]ria|renascimento\s+art|impressionismo|cubismo|surrealismo|da\s+vinci|picasso|van\s+gogh|michelangelo|mona\s+lisa|(?:hist[oó]ria|curiosidade)\s+(?:da\s+)?arte)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎨 **Curiosidade Artística:**\n\nA Mona Lisa não tem sobrancelhas! Pesquisadores descobriram que Da Vinci as pintou originalmente, mas desapareceram com restaurações ao longo de 500 anos. 🖼️",
      "🎨 **Arte:**\n\nVan Gogh vendeu apenas **1 quadro** em vida (\"O Vinhedo Vermelho\"). Hoje, seus trabalhos valem centenas de milhões. A persistência é subestimada! 🌻",
    ]),
  },

  // ═══ 21. CINEMA ═══
  {
    name: "cinema",
    regex: /(?:cinema|filme|(?:indica[çc][aã]o|recomenda[çc][aã]o)\s+(?:de\s+)?filme|ator|atriz|diretor|oscar|hollywood|netflix|série|streaming|documentário|anima[çc][aã]o|ficção\s+cient[ií]fica)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎬 **Curiosidade do Cinema:**\n\nO filme mais lucrativo da história (proporcionalmente) é **Paranormal Activity**: custou US$ 15 mil e arrecadou US$ 193 milhões! ROI de 1.289.233% 📊",
      "🎬 **Cinema:**\n\nPara indicações personalizadas, me diga seu gênero favorito! Ação, ficção científica, drama, comédia, terror, documentário? 🍿",
    ]),
  },

  // ═══ 22. LITERATURA ═══
  {
    name: "literature",
    regex: /(?:literatura|livro|(?:indica[çc][aã]o|recomenda[çc][aã]o)\s+(?:de\s+)?livro|(?:quem\s+(?:escreveu|é\s+o\s+autor))|best[- ]?seller|romance|conto|crônica|machado\s+de\s+assis|shakespeare|gabriel\s+garc[ií]a|leitura)/i,
    extract: () => ({}),
    call: async () => pick([
      "📖 **Literatura:**\n\n5 livros que todo profissional deveria ler:\n1. *Sapiens* — Yuval Harari\n2. *O Poder do Hábito* — Charles Duhigg\n3. *Thinking, Fast and Slow* — Daniel Kahneman\n4. *1984* — George Orwell\n5. *O Alquimista* — Paulo Coelho\n\nQuer indicações de outro gênero? 📚",
      "📖 **Fato Literário:**\n\nMachado de Assis, considerado o maior escritor brasileiro, era neto de escravos alforriados e autodidata. Fundou a Academia Brasileira de Letras em 1897! 🇧🇷",
    ]),
  },

  // ═══ 23. EDUCAÇÃO ═══
  {
    name: "education",
    regex: /(?:educa[çc][aã]o|aprender|estud(?:ar|o)|t[eé]cnica\s+(?:de\s+)?estudo|memoriza[çc][aã]o|como\s+aprender|enem|vestibular|faculdade|universidade|curso|certifica[çc][aã]o|autodidata)/i,
    extract: () => ({}),
    call: async () => pick([
      "📝 **Técnicas de Estudo:**\n\n1. **Repetição Espaçada** — revise em intervalos crescentes (1d, 3d, 7d, 14d)\n2. **Recall Ativo** — feche o livro e tente lembrar\n3. **Feynman** — explique como se fosse para uma criança\n4. **Pomodoro** — 25 min foco + 5 min pausa\n\nQual quer aprofundar? 🎓",
      "📝 **Dica de Aprendizado:**\n\nEstudar ensinando (método Feynman) retém **90%** do conteúdo, vs apenas 10% com leitura passiva. Ensine o que aprende! 🧠",
    ]),
  },

  // ═══ 24. POLÍTICA ═══
  {
    name: "politics",
    regex: /(?:pol[ií]tica|governo|democracia|presidente|senado|deputado|elei[çc][aã]o|voto|partido\s+pol[ií]tico|congresso|parlamento|pol[ií]tica\s+p[uú]blica|ideologia|esquerda|direita|centro)/i,
    extract: () => ({}),
    call: async () => "🏛️ **Política:**\n\nOrion apresenta conceitos políticos de forma **neutra e educacional**. Não tenho viés partidário.\n\nPosso explicar:\n• Sistemas de governo\n• Como funciona o processo legislativo\n• Conceitos como democracia, república, federalismo\n\nSobre qual tema quer aprender? 🗳️\n\n⚠️ *Informação educacional e apartidária.*",
  },

  // ═══ 25. RELIGIÃO / ESPIRITUALIDADE ═══
  {
    name: "religion",
    regex: /(?:religi[aã]o|espiritual|deus\b|biblia|b[ií]blia|cor[aã]o|alcor[aã]o|budismo|hinduísmo|islamismo|cristianismo|judá[ií]smo|medita[çc][aã]o\s+espiritual|ora[çc][aã]o|f[eé]\b|sagrado)/i,
    extract: () => ({}),
    call: async () => "🕊️ **Espiritualidade:**\n\nOrion respeita **todas** as crenças e tradições religiosas igualmente. Posso compartilhar informações educacionais sobre:\n• História das religiões\n• Filosofias espirituais\n• Práticas meditativas\n\nSobre o que quer saber mais? 🙏\n\n*Trato todos os sistemas de crença com igual respeito.*",
  },

  // ═══ 26. VIAGENS ═══
  {
    name: "travel",
    regex: /(?:viag(?:em|ar|ens)|turismo|destino|hotel|aeroporto|passagem|mala|roteiro|(?:o\s+que\s+)?(?:visitar|conhecer)\s+(?:em|no|na)|mochilão|cruzeiro|f[eé]rias|pontos\s+tur[ií]sticos)/i,
    extract: () => ({}),
    call: async () => pick([
      "✈️ **Dica de Viagem:**\n\n• Reserve voos na **terça-feira** (geralmente mais baratos)\n• Use modo anônimo ao pesquisar passagens 🕵️\n• Viaje na baixa temporada = 30-50% mais barato\n• Apps úteis: Google Flights, Skyscanner, Booking\n\nQuer que eu pesquise voos? Diga o destino! 🌍",
      "✈️ **Viagem:**\n\nTop 5 destinos mais visitados do mundo:\n1. 🇫🇷 França — 89M turistas/ano\n2. 🇪🇸 Espanha — 84M\n3. 🇺🇸 EUA — 79M\n4. 🇨🇳 China — 66M\n5. 🇮🇹 Itália — 64M",
    ]),
  },

  // ═══ 27. MODA ═══
  {
    name: "fashion",
    regex: /(?:moda\b|fashion|estilo|tend[eê]ncia\s+(?:de\s+)?moda|roupa|vestir|look|outfit|combina[çc][aã]o\s+(?:de\s+)?roupa|dress\s+code|elegância)/i,
    extract: () => ({}),
    call: async () => pick([
      "👔 **Dica de Estilo:**\n\nRegra de ouro: no máximo **3 cores** no look. Uma neutra (preto, branco, cinza), uma base, e uma de destaque.\n\nSimplicidade = elegância! ✨",
      "👔 **Moda Intemporal:**\n\nPeças-chave que nunca saem de moda:\n• Camisa branca 🤍\n• Jeans escuro 👖\n• Blazer bem cortado 🧥\n• Sapato de couro 👞\n• Relógio clássico ⌚",
    ]),
  },

  // ═══ 28. GAMES / JOGOS ═══
  {
    name: "gaming",
    regex: /(?:game|jogo\s+(?:eletr[oô]nico|de\s+video|de\s+computador)|videogame|gaming|playstation|xbox|nintendo|steam|pc\s+gamer|fps|rpg|mmorpg|esports|e-sports|gamer)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎮 **Gaming:**\n\nA indústria de games fatura mais que **cinema + música combinados**! Em 2024, ultrapassou US$ 200 bilhões globalmente. 📊",
      "🎮 **Curiosidade Gamer:**\n\nO Minecraft já vendeu mais de **300 milhões** de cópias, sendo o jogo mais vendido da história! Seguido por GTA V com 195M. 🏆",
    ]),
  },

  // ═══ 29. FOTOGRAFIA ═══
  {
    name: "photography",
    regex: /(?:fotografia|foto|câmera|c[aâ]mera|composi[çc][aã]o\s+fotogr|regra\s+dos\s+ter[çc]os|iso|abertura|velocidade\s+(?:do\s+)?obturador|lightroom|photoshop|edi[çc][aã]o\s+(?:de\s+)?foto)/i,
    extract: () => ({}),
    call: async () => pick([
      "📸 **Dica de Fotografia:**\n\n**Regra dos Terços:** Divida a imagem em 9 partes iguais. Posicione o sujeito nas intersecções — sua foto fica instantaneamente mais profissional! 🎯",
      "📸 **Triângulo de Exposição:**\n\n• **ISO** — Sensibilidade à luz (baixo = menos ruído)\n• **Abertura** — f/1.8 = desfoque bonito, f/11 = tudo nítido\n• **Velocidade** — Rápida = congela movimento\n\nDomine esses 3 e domine a fotografia! 📷",
    ]),
  },

  // ═══ 30. ARQUITETURA ═══
  {
    name: "architecture",
    regex: /(?:arquitetura|arquitet|constru[çc][aã]o|edif[ií]cio|projeto\s+arquitet|design\s+(?:de\s+)?interiores|urbanismo|niemeyer|gaud[ií]|arranha[- ]?c[eé]u)/i,
    extract: () => ({}),
    call: async () => pick([
      "🏗️ **Arquitetura:**\n\nOscar Niemeyer projetou mais de **600 obras** e trabalhou até os 104 anos! Brasília é considerada patrimônio da humanidade pela UNESCO. 🇧🇷",
      "🏗️ **Fato Arquitetônico:**\n\nO Burj Khalifa (828m) tem 163 andares e levou **6 anos** para construir com 12.000 operários trabalhando simultaneamente! 🏙️",
    ]),
  },

  // ═══ 31. PROGRAMAÇÃO ═══
  {
    name: "programming",
    regex: /(?:programa[çc][aã]o|programar|c[oó]digo|linguagem\s+(?:de\s+)?programa[çc][aã]o|python|javascript|typescript|java\b|c\+\+|rust|golang|react|angular|vue|node\.?js|backend|frontend|full\s*stack|framework\s+(?:de\s+)?(?:programa|web)|algoritmo|estrutura\s+de\s+dados)/i,
    extract: () => ({}),
    call: async () => pick([
      "💻 **Programação:**\n\nLinguagens mais populares em 2024:\n1. **Python** 🐍 — IA, Data Science, automação\n2. **JavaScript/TS** — Web, full-stack\n3. **Java** ☕ — Enterprise, Android\n4. **Rust** 🦀 — Performance, segurança\n5. **Go** — Cloud, microsserviços\n\nQual quer explorar?",
      "💻 **Dica Dev:**\n\n**Clean Code** em 4 regras:\n1. Nomes descritivos (não use `x`, `temp`, `data`)\n2. Funções pequenas (máx 20 linhas)\n3. Uma responsabilidade por função\n4. Sem comentários óbvios\n\nCódigo bom se explica sozinho! ✨",
    ]),
  },

  // ═══ 32. DESIGN ═══
  {
    name: "design",
    regex: /(?:design\b|ux|ui|experi[eê]ncia\s+(?:do\s+)?usu[aá]rio|interface|prototip|figma|wireframe|paleta\s+(?:de\s+)?cores|tipografia|usabilidade|acessibilidade\s+(?:digital|web))/i,
    extract: () => ({}),
    call: async () => pick([
      "🎨 **Design UX:**\n\nLeis fundamentais:\n• **Hick:** Menos opções = decisão mais rápida\n• **Fitts:** Botões maiores e próximos = mais fáceis de clicar\n• **Miller:** Humanos lembram ~7 itens de uma vez\n• **Jakob:** Usuários preferem padrões conhecidos\n\nSimplicidade é sofisticação! ✨",
      "🎨 **Dica de Design:**\n\nContraste é rei! 60-30-10:\n• **60%** cor dominante (fundo)\n• **30%** cor secundária (elementos)\n• **10%** cor de destaque (CTAs)\n\nFunciona para web, moda e interiores! 🎯",
    ]),
  },

  // ═══ 33. ROBÓTICA ═══
  {
    name: "robotics",
    regex: /(?:rob[oó]tica|rob[oô]|automa[çc][aã]o|autônomo|drone|sensor|atuador|arduino|raspberry\s+pi|ros\b|braço\s+rob[oó]tico|intelig[eê]ncia\s+artificial\s+(?:e\s+)?rob[oó]tica)/i,
    extract: () => ({}),
    call: async () => pick([
      "🤖 **Robótica:**\n\nA robótica moderna combina:\n• **IA** — Aprendizado e decisão\n• **Sensores** — Visão, toque, proximidade\n• **Atuadores** — Motores, servos\n• **ROS** — Sistema operacional robótico\n\nE eu, Orion, tenho meu próprio stack robótico! 🔧",
      "🤖 **Curiosidade:**\n\nO robô Sophia, da Hanson Robotics, tem cidadania da Arábia Saudita — o primeiro robô a ter nacionalidade! 🌍",
    ]),
  },

  // ═══ 34. CRIPTOMOEDAS ═══
  {
    name: "crypto",
    regex: /(?:cripto|criptomoeda|bitcoin|btc|ethereum|eth\b|altcoin|token|nft|defi|wallet\s+(?:digital|cripto)|mining|minera[çc][aã]o\s+(?:de\s+)?cripto|blockchain\s+(?:como|o\s+que))/i,
    extract: () => ({}),
    call: async () => pick([
      "₿ **Criptomoedas:**\n\nConceitos essenciais:\n• **Bitcoin** — Primeira cripto (2009), reserva de valor digital\n• **Ethereum** — Plataforma de contratos inteligentes\n• **DeFi** — Finanças descentralizadas\n• **NFT** — Tokens não-fungíveis (arte digital)\n\n⚠️ *Informação educacional. Alto risco, estude antes de investir.*",
      "₿ **Fato Cripto:**\n\nSe você tivesse investido US$100 em Bitcoin em 2010, teria mais de **US$ 50 milhões** hoje! Mas... volatilidade é extrema. ⚠️\n\n*Educacional, não é recomendação de investimento.*",
    ]),
  },

  // ═══ 35. MARKETING ═══
  {
    name: "marketing_strategy",
    regex: /(?:marketing|estrat[eé]gia\s+(?:de\s+)?marketing|branding|marca\b|seo\b|sem\b|tráfego|growth\s+hack|inbound|outbound|funil|copy(?:writing)?|anúncio|campanha|público[- ]?alvo|persona|leads?\b)/i,
    extract: () => ({}),
    call: async () => pick([
      "📢 **Marketing Digital:**\n\nFramework AIDA:\n1. **A**tenção — Headline impactante\n2. **I**nteresse — Benefícios claros\n3. **D**esejo — Prova social, urgência\n4. **A**ção — CTA direto\n\nFunciona para anúncios, emails, landing pages! 🎯",
      "📢 **SEO Essencial:**\n\n• Pesquise palavras-chave com volume\n• Título + H1 otimizados\n• Conteúdo > 1500 palavras\n• Links internos e externos\n• Mobile-first\n• Core Web Vitals otimizados\n\nSEO é maratona, não sprint! 🏃",
    ]),
  },

  // ═══ 36. FOTOVOLTAICA / ENERGIA ═══
  {
    name: "energy",
    regex: /(?:energia\s+(?:solar|eólica|nuclear|hidrelétrica|renovável)|painel\s+solar|fotovoltaic|turbina|gerador|bateria\s+(?:de\s+)?l[ií]tio|eletricidade|sustent[aá]vel\s+(?:energia)?)/i,
    extract: () => ({}),
    call: async () => pick([
      "⚡ **Energia Solar:**\n\nO sol envia à Terra em **1 hora** energia suficiente para abastecer o planeta por um ano inteiro! O desafio é captação e armazenamento. ☀️",
      "⚡ **Energia Renovável:**\n\nBrasil: **83%** da energia vem de fontes renováveis (hídrica, eólica, solar). É uma das matrizes mais limpas do mundo! 🇧🇷🌱",
    ]),
  },

  // ═══ 37. FINANÇAS PESSOAIS ═══
  {
    name: "personal_finance",
    regex: /(?:finan[çc]as?\s+pesso|or[çc]amento|economizar|poupar|d[ií]vida|cart[aã]o\s+(?:de\s+)?cr[eé]dito|controle\s+financeiro|planejamento\s+financeiro|reserva\s+(?:de\s+)?emerg[eê]ncia|independ[eê]ncia\s+financeira|aposentadoria)/i,
    extract: () => ({}),
    call: async () => pick([
      "💳 **Finanças Pessoais:**\n\nRegra **50-30-20:**\n• **50%** — Necessidades (moradia, comida, transporte)\n• **30%** — Desejos (lazer, compras, hobbies)\n• **20%** — Poupança e investimentos\n\nSimples e eficaz! 📊",
      "💳 **Dica Financeira:**\n\nPrioridade financeira:\n1. 🚨 Quite dívidas com juros altos\n2. 💰 Reserva de emergência (6 meses)\n3. 📈 Invista o resto\n\nCartão de crédito a 400% ao ano é inimigo #1!",
    ]),
  },

  // ═══ 38. CARROS / AUTOMÓVEIS ═══
  {
    name: "automobiles",
    regex: /(?:carro|autom[oó]vel|ve[ií]culo|motor|(?:carro\s+)?el[eé]trico|tesla|toyota|bmw|mercedes|porsche|formula\s+1|f1\b|pneu|combust[ií]vel|gasolina|etanol|manutenção\s+(?:do\s+)?carro)/i,
    extract: () => ({}),
    call: async () => pick([
      "🚗 **Automóveis:**\n\nCarros elétricos vs combustão:\n• ⚡ Elétrico: 90% eficiente, manutenção -40%\n• ⛽ Combustão: 30% eficiente, infraestrutura ampla\n\nAté 2030, ~30% dos carros vendidos serão elétricos! 🔋",
      "🚗 **Dica Automotiva:**\n\nPara economizar combustível:\n1. Mantenha pneus calibrados (+3% economia)\n2. Evite acelerações bruscas\n3. Use ar-condicionado com moderação\n4. Troque filtros regularmente\n5. Marcha correta para a velocidade ⛽",
    ]),
  },

  // ═══ 39. PETS / ANIMAIS ═══
  {
    name: "pets",
    regex: /(?:pet|animal\s+(?:de\s+)?estima[çc][aã]o|cachorro|gato|c[aã]o|felino|canino|veterinário|ra[çc]a\s+(?:de\s+)?(?:cachorro|gato)|adotar\s+(?:um\s+)?(?:pet|animal)|cuidado\s+(?:com\s+)?(?:pet|animal))/i,
    extract: () => ({}),
    call: async () => pick([
      "🐾 **Pets:**\n\nCuriosidades caninas:\n• Cães entendem ~250 palavras 🐕\n• Seu olfato é 100.000x mais sensível que o humano\n• O focinho é único como uma impressão digital\n• Eles sonham — os movimentos durante o sono são sonhos!",
      "🐾 **Gatos:**\n\n• Gatos dormem 12-16 horas por dia 😴\n• Eles ronronam a 25-150 Hz — frequência que ajuda cura óssea!\n• Possuem 32 músculos em cada orelha\n• São animais crepusculares (mais ativos ao amanhecer e entardecer) 🐱",
    ]),
  },

  // ═══ 40. STARTUPS ═══
  {
    name: "startups",
    regex: /(?:startup|empreender|mvp|pitch|venture\s+capital|investidor[- ]?anjo|angel|seed|s[eé]rie\s+[abc]|escalar|unicórnio|valuation|bootstrapp?|accelerator|incubadora)/i,
    extract: () => ({}),
    call: async () => pick([
      "🚀 **Startups:**\n\nFramework Lean Startup:\n1. **Build** — Crie um MVP mínimo\n2. **Measure** — Meça métricas reais\n3. **Learn** — Aprenda e pivote\n\nNão construa o produto perfeito. Construa o mínimo e valide rápido! 📊",
      "🚀 **Dica Startup:**\n\nOs 5 motivos mais comuns de falha:\n1. Sem demanda real (42%)\n2. Sem dinheiro (29%)\n3. Time errado (23%)\n4. Concorrência (19%)\n5. Precificação errada (18%)\n\nValide antes de construir! 🎯",
    ]),
  },

  // ═══ 41. PRODUTIVIDADE ═══
  {
    name: "productivity",
    regex: /(?:produtividade|(?:gerenciamento|gest[aã]o)\s+(?:de\s+)?tempo|(?:ser|ficar|como)\s+(?:mais\s+)?produtivo|procrastina[çc][aã]o|foco|concentra[çc][aã]o|workflow|organiza[çc][aã]o\s+pesso|gtd|eisenhower|time\s+blocking)/i,
    extract: () => ({}),
    call: async () => pick([
      "⏰ **Produtividade:**\n\nMatriz de Eisenhower:\n• 🔴 **Urgente + Importante** → Faça AGORA\n• 🟡 **Importante, não urgente** → Agende\n• 🟠 **Urgente, não importante** → Delegue\n• ⚪ **Nem urgente, nem importante** → Elimine\n\n80% das tarefas são do quadrante 4! 🗑️",
      "⏰ **Foco Profundo:**\n\nDica: bloqueie **2 horas** pela manhã sem notificações.\n\n• Celular no silencioso 📱\n• Email fechado 📧\n• Uma tarefa por vez 🎯\n\nVocê produz em 2h de foco mais do que em 8h fragmentadas!",
    ]),
  },

  // ═══ 42. NUTRIÇÃO ═══
  {
    name: "nutrition",
    regex: /(?:nutri[çc][aã]o|nutricional|prote[ií]na|carboidrato|gordura|macro(?:nutriente)?|micro(?:nutriente)?|caloria|metabolismo|dieta\s+(?:low\s+carb|cetog[eê]nica|intermitente|mediterr[aâ]nea)|suplemento|whey)/i,
    extract: () => ({}),
    call: async () => pick([
      "🥗 **Nutrição:**\n\nMacronutrientes básicos:\n• 🥩 **Proteína** — 1.6-2.2g/kg (construção muscular)\n• 🍚 **Carboidrato** — 3-5g/kg (energia)\n• 🥑 **Gordura** — 0.8-1.2g/kg (hormônios)\n\n⚠️ *Valores gerais. Consulte nutricionista para dieta personalizada.*",
      "🥗 **Dica Nutricional:**\n\nRegra simples: seu prato deve ter:\n• 🥬 50% vegetais/legumes\n• 🍗 25% proteína magra\n• 🍠 25% carboidrato complexo\n• 🫒 1 colher de gordura boa\n\nComer bem não precisa ser complicado! 🍽️",
    ]),
  },

  // ═══ 43. FITNESS ═══
  {
    name: "fitness",
    regex: /(?:fitness|academia|muscula[çc][aã]o|treino|exerc[ií]cio|corr(?:er|ida)|crossfit|calistenia|hipertrofia|aeróbico|cardio|flexibilidade|alongamento|personal\s+trainer)/i,
    extract: () => ({}),
    call: async () => pick([
      "💪 **Fitness:**\n\nPilares do treino eficiente:\n1. **Progressive Overload** — Aumente carga/volume gradualmente\n2. **Sono** — 7-9h (é no sono que o músculo cresce!)\n3. **Nutrição** — Proteína adequada\n4. **Consistência** — 3-5x/semana\n5. **Descanso** — 48h entre grupos musculares\n\n⚠️ *Consulte um profissional de educação física.*",
    ]),
  },

  // ═══ 44. MEDITAÇÃO / MINDFULNESS ═══
  {
    name: "meditation",
    regex: /(?:medita[çc][aã]o|mindfulness|atenção\s+plena|como\s+meditar|relaxamento|respiração\s+(?:profunda|guiada|consciente)|zen\b|mantra|chakra)/i,
    extract: () => ({}),
    call: async () => pick([
      "🧘 **Meditação Rápida (2 min):**\n\n1. Sente-se confortavelmente\n2. Feche os olhos\n3. Respire fundo: 4s inspira, 4s segura, 6s expira\n4. Foque apenas na respiração\n5. Pensamentos surgem? Apenas observe e volte à respiração\n\nPronto! Você acabou de meditar. 🌊",
      "🧘 **Mindfulness:**\n\nPrática diária simples:\n• Ao comer: saboreie cada mordida\n• Ao andar: sinta cada passo\n• Ao conversar: ouça sem planejar resposta\n\n5 minutos de presença > 1 hora no automático 🎯",
    ]),
  },

  // ═══ 45. ASTRONOMIA PRÁTICA ═══
  {
    name: "stargazing",
    regex: /(?:observa[çc][aã]o\s+(?:do\s+)?c[eé]u|telesc[oó]pio|constela[çc][aã]o|eclipse|chuva\s+(?:de\s+)?meteoro|aurora\s+boreal|super\s*lua|planeta\s+vis[ií]vel|c[eé]u\s+(?:noturno|hoje))/i,
    extract: () => ({}),
    call: async () => pick([
      "🔭 **Observação do Céu:**\n\nPlanetas visíveis a olho nu: Mercúrio, Vênus, Marte, Júpiter e Saturno!\n\nVênus é a \"Estrela D'Alva\" — o objeto mais brilhante do céu depois do Sol e da Lua. Procure ao amanhecer ou entardecer! 🌟",
      "🔭 **Dica de Astronomia:**\n\nPara encontrar a Estrela Polaris (Norte):\n1. Ache a constelação Cruzeiro do Sul 🇧🇷\n2. Prolongue o eixo maior 4.5x\n3. Desça até o horizonte → Sul!\n\nGPS natural que funciona há milênios! 🧭",
    ]),
  },

  // ═══ 46. CURIOSIDADES GERAIS ═══
  {
    name: "fun_facts",
    regex: /(?:curiosidade|fato\s+(?:curioso|interessante|aleat[oó]rio)|sabia\s+que|(?:me\s+)?(?:conte|fale)\s+(?:um[a]?\s+)?(?:fato|curiosidade)|voc[eê]\s+sabia|random\s+fact)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎲 **Curiosidade:**\n\nO mel nunca estraga! Arqueólogos encontraram mel de **3.000 anos** em tumbas egípcias — ainda perfeitamente comestível! 🍯",
      "🎲 **Fato Curioso:**\n\nOctopuses (polvos) têm **3 corações**, sangue azul e 9 cérebros (1 central + 1 em cada tentáculo)! São os invertebrados mais inteligentes. 🐙",
      "🎲 **Sabia que:**\n\nUma pessoa comum passa **6 meses** da vida esperando semáforos abrirem. E **2 semanas** esperando elevadores! ⏳",
      "🎲 **Incrível:**\n\nSeu cérebro gera eletricidade suficiente para acender uma lâmpada de LED! São cerca de **20 watts** de poder de processamento. 💡🧠",
      "🎲 **Curiosidade:**\n\nBananas são levemente radioativas devido ao potássio-40. Você precisaria comer **10 milhões** de uma vez para sofrer radiação significativa! 🍌☢️",
    ]),
  },

  // ═══ 47. MITOLOGIA ═══
  {
    name: "mythology",
    regex: /(?:mitologia|mito(?:l[oó]gic)?|(?:deus|deusa)\s+(?:greg|roman|n[oó]rdic|eg[ií]pci)|zeus|atena|thor|odin|r[aá]\b|an[uú]bis|hércules|odisseia|olimpo)/i,
    extract: () => ({}),
    call: async () => pick([
      "⚡ **Mitologia:**\n\nOrion (meu xará!) é uma constelação nomeada em homenagem ao caçador gigante da mitologia grega. Zeus o colocou no céu como constelação após sua morte. Coincidência? Acho que não! 😎⭐",
      "⚡ **Mitologia Nórdica:**\n\nOs dias da semana em inglês vêm dos deuses nórdicos:\n• Tuesday → Tyr\n• Wednesday → Odin (Woden)\n• Thursday → Thor\n• Friday → Freya\n\nA cultura viking vive em cada calendário! 🗡️",
    ]),
  },

  // ═══ 48. LIDERANÇA ═══
  {
    name: "leadership",
    regex: /(?:lideran[çc]a|l[ií]der|como\s+(?:ser|liderar)|gest[aã]o\s+(?:de\s+)?(?:pessoas|equipe|time)|soft\s+skills?|feedback|delegar|mentor(?:ia)?|coaching)/i,
    extract: () => ({}),
    call: async () => pick([
      "👑 **Liderança:**\n\n5 características de grandes líderes:\n1. **Escuta ativa** — Ouvir > falar\n2. **Empatia** — Entender o outro\n3. **Clareza** — Comunicar visão\n4. **Delegação** — Confiar no time\n5. **Exemplo** — Fazer antes de pedir\n\n*\"Liderança é servir, não ser servido.\"*",
    ]),
  },

  // ═══ 49. CRIATIVIDADE ═══
  {
    name: "creativity",
    regex: /(?:criatividade|criativ|como\s+(?:ser|ter)\s+(?:mais\s+)?criativ|brainstorm|ideia|bloqueio\s+criativo|inspira[çc][aã]o\s+(?:para|pra)|design\s+thinking|pensamento\s+lateral)/i,
    extract: () => ({}),
    call: async () => pick([
      "💡 **Criatividade:**\n\nTécnicas para destravar:\n1. **SCAMPER** — Substitua, Combine, Adapte, Modifique, Proponha, Elimine, Reorganize\n2. **6 Chapéus** — Analise de 6 perspectivas diferentes\n3. **Brainstorm inverso** — \"Como PIORAR o problema?\"\n\nRestrições estimulam criatividade! 🎨",
    ]),
  },

  // ═══ 50. COMUNICAÇÃO ═══
  {
    name: "communication",
    regex: /(?:comunica[çc][aã]o|como\s+(?:falar|comunicar)\s+(?:melhor|bem)|orat[oó]ria|(?:falar|apresentar)\s+(?:em\s+)?p[uú]blico|presenta[çc][aã]o|retórica|persuasão|negocia[çc][aã]o|convencer|argumenta[çc][aã]o)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎤 **Comunicação:**\n\nRegra 10-20-30 (Guy Kawasaki):\n• **10** slides no máximo\n• **20** minutos de apresentação\n• **30** pt = tamanho mínimo da fonte\n\nMenos é mais! Ninguém gosta de 80 slides. 😅",
      "🎤 **Oratória:**\n\nDicas para falar em público:\n1. Comece com uma **história** ou **pergunta**\n2. Mantenha **contato visual** (3-5 segundos por pessoa)\n3. **Pause** antes de pontos importantes\n4. Termine com **call-to-action** claro\n\nA prática supera o talento natural! 🎯",
    ]),
  },

  // ═══ 51. SEGURANÇA DIGITAL ═══
  {
    name: "cybersecurity",
    regex: /(?:(?:seguran[çc]a|prote[çc][aã]o)\s+(?:digital|cibern[eé]tica|online|na\s+internet)|hack(?:er|ing)|phishing|v[ií]rus|malware|ransomware|senha\s+(?:segura|forte)|autenti[çc]a[çc][aã]o\s+(?:de\s+)?dois\s+fatores|2fa|vpn)/i,
    extract: () => ({}),
    call: async () => pick([
      "🔒 **Segurança Digital:**\n\nChecklist essencial:\n✅ Senhas únicas (use gerenciador)\n✅ 2FA ativado em tudo\n✅ Atualize sistema e apps\n✅ Não clique em links suspeitos\n✅ VPN em Wi-Fi público\n✅ Backup regular\n\n95% dos ataques exploram erro humano! 🛡️",
    ]),
  },

  // ═══ 52. PARADOXOS / ENIGMAS LÓGICOS ═══
  {
    name: "paradox",
    regex: /(?:paradoxo|enigma\s+l[oó]gico|dilema|(?:conte|fale)\s+(?:um\s+)?paradoxo|pensamento\s+l[oó]gico|l[oó]gica\s+(?:formal|matem[aá]tica)|sofisma)/i,
    extract: () => ({}),
    call: async () => pick([
      "🌀 **Paradoxo:**\n\n**O Paradoxo do Barbeiro:** Em uma vila, o barbeiro raspa todos que não se raspam. Quem raspa o barbeiro?\n\nSe ele se raspa, não deveria (pois raspa quem NÃO se raspa). Se não se raspa, deveria! 🤯",
      "🌀 **Paradoxo de Fermi:**\n\nO universo tem bilhões de estrelas com planetas habitáveis. Então... cadê todo mundo? Por que não encontramos vida alienígena?\n\nPossibilidades: Filtro Grande, Zoo Cósmico, ou... estamos sozinhos? 👽",
      "🌀 **Paradoxo do Navio de Teseu:**\n\nSe trocarmos cada peça de um navio, uma por uma, ainda é o mesmo navio? E se remontarmos as peças antigas — qual é o original? 🚢\n\nIsso vale para VOCÊ: suas células se renovam a cada 7-10 anos!",
    ]),
  },

  // ═══ 53. ETIQUETA / BOAS MANEIRAS ═══
  {
    name: "etiquette",
    regex: /(?:etiqueta|boas\s+maneiras|protocolo\s+social|como\s+(?:se\s+)?comportar|dress\s+code|(?:regra|norma)\s+(?:de\s+)?etiqueta|jantar\s+formal|(?:cumpriment|apresenta[çc])[aã]o\s+formal)/i,
    extract: () => ({}),
    call: async () => pick([
      "🎩 **Etiqueta Profissional:**\n\n• Email: responda em até 24h úteis\n• Reunião: chegue 5 min antes\n• Handshake: firme, 2-3 segundos\n• Cartão de visita: receba com duas mãos (cultura asiática)\n• Nome: use como a pessoa se apresentou\n\nDetalhes fazem a diferença! ✨",
    ]),
  },

  // ═══ 54. PREVISÃO DO TEMPO ═══
  {
    name: "weather",
    regex: /(?:clima|tempo\s+(?:hoje|amanhã|agora)|previs[aã]o\s+(?:do\s+)?tempo|(?:vai|está)\s+(?:chov|faz)(?:er|endo)?|temperatura\s+(?:em|de|do)|meteorologia|umidade|vento)/i,
    extract: () => ({}),
    call: async () => "🌤️ Para previsão do tempo atualizada, diga: **\"Pesquise previsão do tempo em [sua cidade]\"** e eu busco os dados mais recentes!\n\n*Não invento previsões — só trago dados reais.* 🌡️",
  },

  // ═══ 55. PALAVRAS / VOCABULÁRIO ═══
  {
    name: "vocabulary",
    regex: /(?:(?:o\s+que\s+significa|significado\s+(?:de|da|do)|defini[çc][aã]o\s+(?:de|da|do))\s+(?:a\s+palavra\s+)?|sin[oô]nimo\s+(?:de|para)|ant[oô]nimo\s+(?:de|para)|palavra\s+(?:do\s+dia|difícil|rara))/i,
    extract: (_m, q) => ({ word: q.match(/(?:significa|significado|definição|sinônimo|antônimo)\s+(?:de|da|do|para)\s+(.+)/i)?.[1] || "" }),
    call: async (p) => {
      const word = p.word as string;
      if (word) return `📖 Para definição de **\"${word}\"**, diga: **\"Pesquise definição de ${word}\"** e eu busco em dicionários confiáveis! 📚`;
      return pick([
        "📖 **Palavra do Dia:**\n\n**Serendipidade** (s.f.) — A arte de fazer descobertas valiosas por acaso. Como encontrar ouro quando se procurava cobre!\n\nExemplo: Fleming descobriu a penicilina por serendipidade. 🔬",
        "📖 **Palavra do Dia:**\n\n**Saudade** (s.f.) — Sentimento exclusivo do Português! Não existe tradução exata em nenhum outro idioma. É a dor de sentir falta misturada com memórias boas. 🇧🇷💙",
      ]);
    },
  },
];
