/**
 * ─── Self-Organizing Map (SOM) Router v1.0 ───
 * Kohonen Network for ultra-fast intent routing (<2ms).
 * 
 * Replaces sequential regex matching with a trained topological map
 * that clusters query patterns into handler neighborhoods.
 * 
 * Key concepts:
 * - Competitive learning: neurons compete, winner activates
 * - Lateral inhibition: winner suppresses neighbors
 * - Topographic map: similar inputs → nearby neurons
 * - Online learning: adapts with each new query
 * 
 * Refs: Kohonen (1982), Ritter & Kohonen (1989)
 */

// ═══ Types ═══

export type SOMHandler =
  | "greeting" | "memory_store" | "memory_recall" | "voice_id" | "owner_identity"
  | "self_identity" | "who_am_i" | "voice_config" | "navigation"
  | "search" | "background_voice" | "bluetooth" | "iot_light"
  | "iot_temperature" | "iot_robot" | "iot_status" | "native_device"
  | "media_music" | "auto_construct" | "self_evolve" | "general_llm"
  | "legal_query" | "financial_query" | "calendar_query" | "crm_query"
  | "time_date" | "calculation" | "translation" | "humor" | "philosophy"
  | "security_query" | "reporting" | "explanation" | "analysis"
  | "industrial_scada" | "industrial_fleet" | "industrial_quality"
  | "industrial_maintenance" | "enterprise_erp" | "enterprise_hr" | "enterprise_logistics";

interface SOMNeuron {
  weights: number[];        // Weight vector (same dim as input features)
  handler: SOMHandler;      // Mapped handler
  hits: number;             // Activation count
  lastActivated: number;    // Timestamp
  confidence: number;       // Running average match quality
}

interface SOMConfig {
  gridWidth: number;        // Map width
  gridHeight: number;       // Map height
  featureDim: number;       // Input feature vector dimension
  initialLearningRate: number;
  initialSigma: number;     // Initial neighborhood radius
  decayRate: number;        // Learning rate decay per epoch
}

interface SOMMatchResult {
  handler: SOMHandler;
  confidence: number;
  neuronIdx: number;
  matchTimeMs: number;
  isSpecialCmd: boolean;    // Whether this is a local-handled command
}

// ═══ Feature Extraction ═══
// Convert query text into a fixed-size numeric feature vector

const KEYWORD_GROUPS: Record<string, string[]> = {
  greeting: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hey", "eai", "fala", "tudo bem", "beleza", "opa"],
  memory: ["guarde", "armazene", "lembre", "memorize", "salve", "grave", "registre", "memória", "memoria"],
  memory_recall: ["o que você lembra", "o que sabe sobre", "o que guardou", "me diga o que sabe", "lembra de", "o que memorizou"],
  voice_id: ["reconhece", "conhece", "voz", "voice id", "identidade vocal"],
  owner: ["dono", "proprietário", "proprietario", "criador", "desenvolvedor", "quem te criou", "quem te fez"],
  self: ["quem é você", "quem e voce", "seu nome", "sua personalidade", "seu signo", "sua história", "sua historia"],
  who_am_i: ["quem sou eu", "me conhece", "sabe quem eu sou", "meu nome"],
  voice_cfg: ["fale mais", "aumente velocidade", "aumente pitch", "diminua", "voz mais", "mude a voz", "mude o tom"],
  navigation: ["abra", "vá para", "va para", "navegue", "abrir", "ir para", "mostre", "acesse", "leve"],
  search: ["procure", "busque", "encontre", "ache", "localize", "documento", "cliente", "contato", "processo"],
  bg_voice: ["o que o", "o que a", "está dizendo", "está falando", "ta dizendo", "ta falando"],
  bluetooth: ["conecte bluetooth", "parear", "escanear", "scan bluetooth", "dispositivo ble"],
  iot_light: ["ligue a luz", "acenda", "desligue a luz", "apague", "lampada", "lâmpada", "todas as luzes"],
  iot_temp: ["temperatura", "sensor", "termômetro", "termometro"],
  iot_robot: ["robô", "robo", "robot", "status do robô"],
  iot_status: ["status sensor", "status dispositivo", "status iot", "status device"],
  native: ["bateria", "localização", "localizacao", "gps", "tirar foto", "capturar imagem", "status celular"],
  media: ["tocar", "play", "reproduzir", "buscar música", "buscar musica", "playlist", "spotify", "parar música", "pausar"],
  construct: ["construir", "criar função", "criar tabela", "criar componente", "implementar", "auto construção"],
  evolve: ["evoluir", "auto evolução", "auto evolucao", "ciclo evolução", "self evolve", "evolua"],
  legal: ["lei", "artigo", "código civil", "codigo civil", "jurisprudência", "jurisprudencia", "petição", "peticao", "recurso", "sentença", "mandado", "habeas corpus", "direito"],
  financial: ["fatura", "pagamento", "cobrança", "cobranca", "financeiro", "receita", "despesa", "honorário", "honorario", "boleto"],
  calendar: ["agenda", "agendar", "compromisso", "reunião", "reuniao", "consulta", "marcar", "desmarcar", "horário", "horario"],
  crm: ["pipeline", "lead", "oportunidade", "negócio", "negocio", "proposta", "contrato", "deal"],
  time_date: ["que horas", "que dia", "data de hoje", "hora atual", "que hora", "hoje é", "hoje e"],
  calculation: ["calcule", "calcular", "quanto é", "quanto e", "some", "multiplique", "divida", "raiz", "porcentagem"],
  translation: ["traduza", "traduzir", "tradução", "traducao", "em inglês", "em ingles", "em espanhol", "em italiano", "em chinês", "em chines"],
  humor: ["piada", "conte uma piada", "algo engraçado", "algo engracado", "brincadeira", "me faça rir", "me faca rir"],
  philosophy: ["sentido da vida", "consciência", "consciencia", "existência", "existencia", "filosofia", "reflexão", "reflexao", "o que é a vida"],
  security: ["ameaça", "ameaca", "segurança", "seguranca", "ataque", "invasão", "invasao", "threat", "defesa", "shield"],
  reporting: ["relatório", "relatorio", "métricas", "metricas", "estatísticas", "estatisticas", "dashboard", "resumo do dia", "resumo semanal"],
  explanation: ["explique", "o que é", "o que e", "como funciona", "me ensine", "tutorial", "defina", "significa"],
  analysis: ["analise", "analisar", "sentimento", "resumo", "sumarize", "avalie", "avaliação", "avaliacao"],
  industrial_scada: ["scada", "supervisório", "supervisorio", "alarme industrial", "setpoint", "opc-ua", "opcua", "plc", "clp", "batelada", "batch", "historiador", "sinóptico", "mimic"],
  industrial_fleet: ["frota", "fleet", "agv", "amr", "despachar", "missão", "missao", "vda5050", "vda 5050", "zona de colisão", "pickup", "dropoff"],
  industrial_quality: ["oee", "qualidade", "spc", "defeito", "inspeção", "inspecao", "cpk", "six sigma", "não conformidade", "rastreabilidade", "auditoria"],
  industrial_maintenance: ["manutenção", "manutencao", "preventiva", "preditiva", "mtbf", "mttr", "ordem de serviço", "spare parts", "peça de reposição", "calibração", "calibracao", "downtime", "lubrificação"],
  enterprise_erp: ["estoque", "inventário", "inventario", "bom", "bill of materials", "mrp", "ordem de produção", "producao", "requisição de compra"],
  enterprise_hr: ["funcionário", "funcionario", "folha de pagamento", "ponto", "férias", "ferias", "admissão", "admissao", "rh", "recursos humanos"],
  enterprise_logistics: ["expedição", "expedicao", "rastreamento", "frete", "entrega", "shipment", "logística", "logistica"],
};

const HANDLER_MAP: Record<string, SOMHandler> = {
  greeting: "greeting",
  memory: "memory_store",
  memory_recall: "memory_recall",
  voice_id: "voice_id",
  owner: "owner_identity",
  self: "self_identity",
  who_am_i: "who_am_i",
  voice_cfg: "voice_config",
  navigation: "navigation",
  search: "search",
  bg_voice: "background_voice",
  bluetooth: "bluetooth",
  iot_light: "iot_light",
  iot_temp: "iot_temperature",
  iot_robot: "iot_robot",
  iot_status: "iot_status",
  native: "native_device",
  media: "media_music",
  construct: "auto_construct",
  evolve: "self_evolve",
  legal: "legal_query",
  financial: "financial_query",
  calendar: "calendar_query",
  crm: "crm_query",
  time_date: "time_date",
  calculation: "calculation",
  translation: "translation",
  humor: "humor",
  philosophy: "philosophy",
  security: "security_query",
  reporting: "reporting",
  explanation: "explanation",
  analysis: "analysis",
  industrial_scada: "industrial_scada",
  industrial_fleet: "industrial_fleet",
  industrial_quality: "industrial_quality",
  industrial_maintenance: "industrial_maintenance",
  enterprise_erp: "enterprise_erp",
  enterprise_hr: "enterprise_hr",
  enterprise_logistics: "enterprise_logistics",
};

const FEATURE_DIM = Object.keys(KEYWORD_GROUPS).length + 4; // keyword groups + length features

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFeatures(query: string): number[] {
  const norm = normalizeText(query);
  const words = norm.split(" ");
  const features: number[] = [];

  // Keyword group scores (Jaccard-like overlap)
  const groups = Object.values(KEYWORD_GROUPS);
  for (const group of groups) {
    let maxScore = 0;
    for (const keyword of group) {
      if (norm.includes(keyword)) {
        const score = keyword.split(" ").length / Math.max(words.length, 1);
        maxScore = Math.max(maxScore, Math.min(1, score * 2));
      }
    }
    features.push(maxScore);
  }

  // Meta features
  features.push(Math.min(1, words.length / 20));        // Normalized length
  features.push(norm.endsWith("?") || /\?/.test(query) ? 1 : 0); // Is question
  features.push(/^(o que|quem|qual|quando|onde|como|por que|porque)\b/.test(norm) ? 1 : 0); // Starts with interrogative
  features.push(Math.min(1, (query.match(/[A-Z]/g)?.length || 0) / 10)); // Capitalization ratio

  return features;
}

// ═══ SOM Core ═══

const DEFAULT_CONFIG: SOMConfig = {
  gridWidth: 8,
  gridHeight: 5,
  featureDim: FEATURE_DIM,
  initialLearningRate: 0.5,
  initialSigma: 2.0,
  decayRate: 0.995,
};

const STORAGE_KEY = "orion_som_router_v2";
const LOCAL_HANDLERS = new Set<SOMHandler>([
  "greeting", "memory_store", "memory_recall", "voice_id", "owner_identity",
  "self_identity", "who_am_i", "voice_config", "navigation",
  "search", "background_voice", "bluetooth", "iot_light",
  "iot_temperature", "iot_robot", "iot_status", "native_device",
  "media_music", "auto_construct", "self_evolve",
  "time_date", "calculation", "humor", "security_query",
  "industrial_scada", "industrial_fleet", "industrial_quality",
  "industrial_maintenance", "enterprise_erp", "enterprise_hr", "enterprise_logistics",
]);

class SelfOrganizingMap {
  private neurons: SOMNeuron[];
  private config: SOMConfig;
  private epoch: number;
  private totalQueries: number;

  constructor(config: SOMConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.epoch = 0;
    this.totalQueries = 0;
    this.neurons = [];
    this.initialize();
  }

  /** Initialize neurons with pre-seeded weights from keyword groups */
  private initialize() {
    const totalNeurons = this.config.gridWidth * this.config.gridHeight;
    const handlerKeys = Object.keys(KEYWORD_GROUPS);

    this.neurons = Array.from({ length: totalNeurons }, (_, idx) => {
      // Assign handlers round-robin, with "general_llm" for extras
      const handlerIdx = idx % (handlerKeys.length + 1);
      const handlerKey = handlerIdx < handlerKeys.length ? handlerKeys[handlerIdx] : null;
      const handler: SOMHandler = handlerKey ? (HANDLER_MAP[handlerKey] || "general_llm") : "general_llm";

      // Pre-seed weights: if this neuron maps to a keyword group, boost those features
      const weights = new Array(this.config.featureDim).fill(0).map(() => Math.random() * 0.3);
      if (handlerKey && handlerIdx < Object.keys(KEYWORD_GROUPS).length) {
        weights[handlerIdx] = 0.8 + Math.random() * 0.2; // Strong signal for its own group
      }

      return { weights, handler, hits: 0, lastActivated: 0, confidence: 0.5 };
    });
  }

  /** Euclidean distance between two vectors */
  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = (a[i] || 0) - (b[i] || 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /** Grid distance between two neuron indices */
  private gridDistance(i: number, j: number): number {
    const w = this.config.gridWidth;
    const xi = i % w, yi = Math.floor(i / w);
    const xj = j % w, yj = Math.floor(j / w);
    return Math.sqrt((xi - xj) ** 2 + (yi - yj) ** 2);
  }

  /** Neighborhood function h(winner, neuron, epoch) */
  private neighborhood(winnerIdx: number, neuronIdx: number): number {
    const sigma = this.config.initialSigma * Math.pow(this.config.decayRate, this.epoch);
    const d = this.gridDistance(winnerIdx, neuronIdx);
    return Math.exp(-(d * d) / (2 * sigma * sigma));
  }

  /** Current learning rate (decays over epochs) */
  private learningRate(): number {
    return this.config.initialLearningRate * Math.pow(this.config.decayRate, this.epoch);
  }

  /** Find Best Matching Unit (BMU) — the winner neuron */
  findBMU(features: number[]): { idx: number; distance: number } {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.neurons.length; i++) {
      const d = this.distance(features, this.neurons[i].weights);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return { idx: bestIdx, distance: bestDist };
  }

  /** Train SOM with a single input (online learning) */
  train(features: number[], correctHandler?: SOMHandler) {
    const { idx: winnerIdx } = this.findBMU(features);
    const eta = this.learningRate();

    // Update weights: winner and neighbors
    for (let i = 0; i < this.neurons.length; i++) {
      const h = this.neighborhood(winnerIdx, i);
      if (h < 0.01) continue; // Skip negligible updates

      const neuron = this.neurons[i];
      for (let f = 0; f < this.config.featureDim; f++) {
        // Kohonen update rule: w(t+1) = w(t) + η·h(t)·(x - w(t))
        neuron.weights[f] += eta * h * ((features[f] || 0) - neuron.weights[f]);
      }
    }

    // Update winner metadata
    const winner = this.neurons[winnerIdx];
    winner.hits++;
    winner.lastActivated = Date.now();

    // If correct handler provided, reinforce or reassign
    if (correctHandler && winner.handler !== correctHandler) {
      // If this neuron is rarely used, reassign it
      if (winner.hits < 5) {
        winner.handler = correctHandler;
      }
      // Otherwise, find the nearest neuron with the correct handler or create affinity
      winner.confidence = Math.max(0.1, winner.confidence * 0.9);
    } else if (correctHandler) {
      winner.confidence = Math.min(1.0, winner.confidence * 1.05 + 0.02);
    }

    this.epoch++;
    this.totalQueries++;
  }

  /** Classify a query — returns handler + confidence */
  classify(query: string): SOMMatchResult {
    const t0 = performance.now();
    const features = extractFeatures(query);
    const { idx, distance } = this.findBMU(features);
    const winner = this.neurons[idx];

    // Confidence: inverse of distance, scaled by neuron's historical confidence
    const rawConf = Math.max(0, 1 - distance / 2);
    const confidence = rawConf * winner.confidence;
    const handler = winner.handler;

    return {
      handler,
      confidence,
      neuronIdx: idx,
      matchTimeMs: performance.now() - t0,
      isSpecialCmd: LOCAL_HANDLERS.has(handler) && confidence > 0.35,
    };
  }

  /** Batch train with pre-defined examples */
  batchTrain(examples: Array<{ query: string; handler: SOMHandler }>, epochs: number = 3) {
    for (let e = 0; e < epochs; e++) {
      // Shuffle for each epoch
      const shuffled = [...examples].sort(() => Math.random() - 0.5);
      for (const ex of shuffled) {
        const features = extractFeatures(ex.query);
        this.train(features, ex.handler);
      }
    }
  }

  /** Serialize for localStorage persistence */
  serialize(): string {
    return JSON.stringify({
      neurons: this.neurons,
      epoch: this.epoch,
      totalQueries: this.totalQueries,
      version: 1,
    });
  }

  /** Restore from localStorage */
  restore(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version !== 1 || !parsed.neurons) return false;
      this.neurons = parsed.neurons;
      this.epoch = parsed.epoch || 0;
      this.totalQueries = parsed.totalQueries || 0;
      return true;
    } catch {
      return false;
    }
  }

  /** Get map statistics */
  getStats() {
    const handlerCounts: Record<string, number> = {};
    let totalHits = 0;
    for (const n of this.neurons) {
      handlerCounts[n.handler] = (handlerCounts[n.handler] || 0) + 1;
      totalHits += n.hits;
    }
    return {
      totalNeurons: this.neurons.length,
      epoch: this.epoch,
      totalQueries: this.totalQueries,
      totalHits,
      handlerDistribution: handlerCounts,
    };
  }
}

// ═══ Pre-seeded Training Data ═══

const TRAINING_EXAMPLES: Array<{ query: string; handler: SOMHandler }> = [
  // Greetings
  { query: "oi", handler: "greeting" },
  { query: "olá", handler: "greeting" },
  { query: "bom dia", handler: "greeting" },
  { query: "boa tarde", handler: "greeting" },
  { query: "boa noite", handler: "greeting" },
  { query: "hey", handler: "greeting" },
  { query: "eai", handler: "greeting" },
  { query: "tudo bem", handler: "greeting" },
  { query: "beleza", handler: "greeting" },
  { query: "fala", handler: "greeting" },
  // Memory
  { query: "guarde na memória que meu nome é João", handler: "memory_store" },
  { query: "armazene isso na memória", handler: "memory_store" },
  { query: "lembre que eu gosto de café", handler: "memory_store" },
  { query: "memorize isso", handler: "memory_store" },
  { query: "salve na memória", handler: "memory_store" },
  // Voice ID
  { query: "reconhece minha voz", handler: "voice_id" },
  { query: "sabe minha voz", handler: "voice_id" },
  { query: "conhece minha voz", handler: "voice_id" },
  { query: "voice id", handler: "voice_id" },
  // Owner identity
  { query: "quem é o dono", handler: "owner_identity" },
  { query: "quem te criou", handler: "owner_identity" },
  { query: "quem é o proprietário", handler: "owner_identity" },
  { query: "quem te fez", handler: "owner_identity" },
  { query: "quem é o desenvolvedor", handler: "owner_identity" },
  // Self identity
  { query: "quem é você", handler: "self_identity" },
  { query: "qual é o seu nome", handler: "self_identity" },
  { query: "sua personalidade", handler: "self_identity" },
  { query: "conte sobre você", handler: "self_identity" },
  // Who am I
  { query: "quem sou eu", handler: "who_am_i" },
  { query: "me conhece", handler: "who_am_i" },
  { query: "sabe quem eu sou", handler: "who_am_i" },
  { query: "qual é meu nome", handler: "who_am_i" },
  // Voice config
  { query: "fale mais devagar", handler: "voice_config" },
  { query: "fale mais rápido", handler: "voice_config" },
  { query: "aumente a velocidade", handler: "voice_config" },
  { query: "voz mais grave", handler: "voice_config" },
  { query: "mude o tom", handler: "voice_config" },
  // Navigation
  { query: "abra documentos", handler: "navigation" },
  { query: "vá para clientes", handler: "navigation" },
  { query: "navegue para o dashboard", handler: "navigation" },
  { query: "abrir processos", handler: "navigation" },
  // Search
  { query: "procure documento contrato", handler: "search" },
  { query: "busque cliente João", handler: "search" },
  { query: "encontre contato Maria", handler: "search" },
  { query: "localize processo 123", handler: "search" },
  // Background voice
  { query: "o que o João está dizendo", handler: "background_voice" },
  { query: "o que a Maria está falando", handler: "background_voice" },
  // Bluetooth
  { query: "conecte bluetooth", handler: "bluetooth" },
  { query: "escanear dispositivos bluetooth", handler: "bluetooth" },
  { query: "parear ble", handler: "bluetooth" },
  // IoT
  { query: "ligue a luz", handler: "iot_light" },
  { query: "acenda a lâmpada", handler: "iot_light" },
  { query: "desligue a luz", handler: "iot_light" },
  { query: "apague todas as luzes", handler: "iot_light" },
  { query: "qual a temperatura", handler: "iot_temperature" },
  { query: "status do sensor de temperatura", handler: "iot_temperature" },
  { query: "status do robô", handler: "iot_robot" },
  { query: "estado do robot", handler: "iot_robot" },
  { query: "status dos sensores", handler: "iot_status" },
  { query: "status dos dispositivos iot", handler: "iot_status" },
  // Native device
  { query: "status do celular", handler: "native_device" },
  { query: "nível da bateria", handler: "native_device" },
  { query: "qual minha localização", handler: "native_device" },
  { query: "tirar foto", handler: "native_device" },
  // Media
  { query: "tocar música", handler: "media_music" },
  { query: "play", handler: "media_music" },
  { query: "buscar música rock", handler: "media_music" },
  { query: "minhas playlists", handler: "media_music" },
  { query: "parar música", handler: "media_music" },
  // Auto construct
  { query: "crie uma função de autenticação", handler: "auto_construct" },
  { query: "construa um componente de dashboard", handler: "auto_construct" },
  { query: "implemente um endpoint de API", handler: "auto_construct" },
  // Self evolve
  { query: "evoluir sistema", handler: "self_evolve" },
  { query: "ciclo de auto evolução", handler: "self_evolve" },
  { query: "auto evolução", handler: "self_evolve" },
  // General LLM (should not match local handlers)
  { query: "o que é React", handler: "general_llm" },
  { query: "compare React e Vue", handler: "general_llm" },
  // Legal
  { query: "qual artigo do código civil", handler: "legal_query" },
  { query: "jurisprudência sobre dano moral", handler: "legal_query" },
  { query: "preciso de uma petição", handler: "legal_query" },
  { query: "quais são os direitos do consumidor", handler: "legal_query" },
  { query: "o que diz a lei sobre contratos", handler: "legal_query" },
  // Financial
  { query: "minhas faturas pendentes", handler: "financial_query" },
  { query: "quanto recebi este mês", handler: "financial_query" },
  { query: "honorários do cliente", handler: "financial_query" },
  { query: "status dos pagamentos", handler: "financial_query" },
  // Calendar
  { query: "agenda de hoje", handler: "calendar_query" },
  { query: "agendar reunião", handler: "calendar_query" },
  { query: "próximos compromissos", handler: "calendar_query" },
  { query: "marcar consulta", handler: "calendar_query" },
  // CRM
  { query: "status do pipeline", handler: "crm_query" },
  { query: "leads ativos", handler: "crm_query" },
  { query: "oportunidades abertas", handler: "crm_query" },
  { query: "propostas pendentes", handler: "crm_query" },
  // Time/Date
  { query: "que horas são", handler: "time_date" },
  { query: "que dia é hoje", handler: "time_date" },
  { query: "hora atual", handler: "time_date" },
  // Calculation
  { query: "calcule 15% de 1000", handler: "calculation" },
  { query: "quanto é 250 vezes 4", handler: "calculation" },
  { query: "calcule a taxa de juros", handler: "calculation" },
  // Translation
  { query: "traduza para inglês: bom dia", handler: "translation" },
  { query: "como se diz contrato em italiano", handler: "translation" },
  // Humor
  { query: "conte uma piada", handler: "humor" },
  { query: "algo engraçado", handler: "humor" },
  { query: "me faça rir", handler: "humor" },
  // Philosophy
  { query: "qual o sentido da vida", handler: "philosophy" },
  { query: "o que é consciência", handler: "philosophy" },
  { query: "reflexão sobre existência", handler: "philosophy" },
  // Security
  { query: "status de segurança", handler: "security_query" },
  { query: "ameaças recentes", handler: "security_query" },
  { query: "relatório de defesa", handler: "security_query" },
  // Reporting
  { query: "relatório do dia", handler: "reporting" },
  { query: "métricas da semana", handler: "reporting" },
  { query: "estatísticas de uso", handler: "reporting" },
  // Explanation
  { query: "explique machine learning", handler: "explanation" },
  { query: "como funciona o sistema solar", handler: "explanation" },
  { query: "o que é inteligência artificial", handler: "explanation" },
  { query: "me ensine sobre React", handler: "explanation" },
  // Analysis
  { query: "analise este código", handler: "analysis" },
  { query: "resuma este artigo", handler: "analysis" },
  { query: "avalie este texto", handler: "analysis" },
  // Memory recall
  { query: "o que você lembra sobre mim", handler: "memory_recall" },
  { query: "o que sabe sobre o cliente", handler: "memory_recall" },
  { query: "lembra do que guardei", handler: "memory_recall" },
  // Industrial SCADA
  { query: "alarmes ativos do scada", handler: "industrial_scada" },
  { query: "status do clp", handler: "industrial_scada" },
  { query: "abrir sinóptico", handler: "industrial_scada" },
  { query: "ler setpoint", handler: "industrial_scada" },
  { query: "iniciar batelada", handler: "industrial_scada" },
  { query: "variáveis opc-ua", handler: "industrial_scada" },
  // Industrial Fleet
  { query: "status da frota", handler: "industrial_fleet" },
  { query: "despachar agv", handler: "industrial_fleet" },
  { query: "criar missão para o robô", handler: "industrial_fleet" },
  { query: "carga dos veículos", handler: "industrial_fleet" },
  { query: "status vda5050", handler: "industrial_fleet" },
  // Industrial Quality
  { query: "oee atual", handler: "industrial_quality" },
  { query: "carta spc", handler: "industrial_quality" },
  { query: "registrar defeito", handler: "industrial_quality" },
  { query: "rastreabilidade do lote", handler: "industrial_quality" },
  { query: "cpk do processo", handler: "industrial_quality" },
  // Industrial Maintenance
  { query: "criar ordem de serviço", handler: "industrial_maintenance" },
  { query: "manutenção preventiva", handler: "industrial_maintenance" },
  { query: "alertas preditivos", handler: "industrial_maintenance" },
  { query: "peças de reposição", handler: "industrial_maintenance" },
  { query: "mtbf do equipamento", handler: "industrial_maintenance" },
  // Enterprise ERP
  { query: "verificar estoque", handler: "enterprise_erp" },
  { query: "ordem de produção", handler: "enterprise_erp" },
  { query: "rodar mrp", handler: "enterprise_erp" },
  { query: "lista de materiais", handler: "enterprise_erp" },
  // Enterprise HR
  { query: "listar funcionários", handler: "enterprise_hr" },
  { query: "registro de ponto", handler: "enterprise_hr" },
  { query: "escala de férias", handler: "enterprise_hr" },
  // Enterprise Logistics
  { query: "rastrear expedição", handler: "enterprise_logistics" },
  { query: "cotação de frete", handler: "enterprise_logistics" },
  { query: "status das entregas", handler: "enterprise_logistics" },
];

// ═══ Singleton Instance ═══

let _somInstance: SelfOrganizingMap | null = null;

function getSOM(): SelfOrganizingMap {
  if (_somInstance) return _somInstance;
  if (typeof window === "undefined") {
    _somInstance = new SelfOrganizingMap();
    return _somInstance;
  }
  if (_somInstance) return _somInstance;

  _somInstance = new SelfOrganizingMap(DEFAULT_CONFIG);

  // Try restore from localStorage
  try {
    const saved = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( STORAGE_KEY);
    if (saved && _somInstance.restore(saved)) {
      console.log("[SOM] Restored from localStorage", _somInstance.getStats());
      return _somInstance;
    }
  } catch {}

  // Fresh initialization: batch train with examples
  _somInstance.batchTrain(TRAINING_EXAMPLES, 5);

  // Persist
  if (typeof window !== "undefined") try { if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, _somInstance.serialize()); } catch {}

  console.log("[SOM] Initialized with batch training", _somInstance.getStats());
  return _somInstance;
}

// ═══ Public API ═══

/**
 * Classify a query using the SOM router.
 * Returns handler, confidence, and whether it's a local command.
 * Typical latency: <2ms.
 */
export function somClassify(query: string): SOMMatchResult {
  const som = getSOM();
  return som.classify(query);
}

/**
 * Online learning: teach the SOM after a successful handler execution.
 * Call this after a query is successfully handled to reinforce the mapping.
 */
export function somLearn(query: string, handler: SOMHandler) {
  const som = getSOM();
  const features = extractFeatures(query);
  som.train(features, handler);

  // Persist every 10 queries
  if (som.getStats().totalQueries % 10 === 0) {
    if (typeof window !== "undefined") try { if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, som.serialize()); } catch {}
  }
}

/**
 * Get SOM statistics for the neural dashboard.
 */
export function somGetStats() {
  return getSOM().getStats();
}

/**
 * Force re-initialization (useful after updates).
 */
export function somReset() {
  _somInstance = null;
  if (typeof window !== "undefined") try { if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY); } catch {}
  getSOM(); // Re-initialize
}
