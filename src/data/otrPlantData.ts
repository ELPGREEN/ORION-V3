import { Bot, Cpu, Zap, Settings, Factory, Truck } from "lucide-react";

/**
 * Dados reais da ELP Green Technology — Smart Robotic OTR Line
 * Fonte: elpgreen.com — plano de expansão global 2025-2030
 * Parceria: TOPS Recycling Group
 */

export const getOtrMachines = (t?: any) => [
  {
    name: "Hydraulic Primary Cutter", description: "Corte hidráulico inicial dos pneus OTR gigantes", icon: Settings,
    src: "/placeholder.svg", title: "Cortador Hidráulico Primário", model: "ELP-HPC-3000",
    examples: ["57'' OTR", "59'' OTR", "63'' OTR"],
    power: "250kW", capacity: "10 t/h", dimensions: "8m x 5m x 4m",
    maxDiameter: "63'' (1600mm)", bladeSize: "1500mm", bladeLife: "6000 hrs", process: "Hidráulico robotizado",
    features: ["Auto-feed de pneus OTR", "Proteções de segurança ISO 10218", "Monitoramento remoto Orion", "Corte de parede lateral automatizado"],
    link: "/solucoes/industria", image: "/placeholder.svg",
  },
  {
    name: "Smart Shredder & Granulator", description: "Trituração e granulação inteligente", icon: Factory,
    src: "/placeholder.svg", title: "Triturador Inteligente", model: "ELP-SG-2500",
    examples: ["Borracha granulada 10-40 mesh", "Crumb rubber"],
    power: "200kW", capacity: "10 t/h", dimensions: "6m x 4m x 3m",
    maxDiameter: "N/A", bladeSize: "1200mm", bladeLife: "4000 hrs", process: "Mecânico multi-estágio",
    features: ["Multi-size output (10-40 mesh)", "Coleta de poeira integrada", "Auto-sorting por tamanho", "Controle de temperatura"],
    link: "/solucoes/industria", image: "/placeholder.svg",
  },
  {
    name: "Steel & Fiber Separator", description: "Separação magnética e pneumática de materiais", icon: Bot,
    src: "/placeholder.svg", title: "Separador de Materiais", model: "ELP-SFS-2000",
    examples: ["Aço para siderúrgicas", "Fibra têxtil para isolamento"],
    power: "80kW", capacity: "Contínuo", dimensions: "5m x 3m x 2.5m",
    maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "Magnético + pneumático",
    features: ["Separação magnética de aço", "Separação pneumática de fibra", "99.8% taxa de recuperação", "Monitoramento por IA Orion"],
    link: "/solucoes/industria", image: "/placeholder.svg",
  },
];

export const getOtrApplications = (t?: any) => [
  { name: "Caminhões de Mineração", description: "CAT 797F, Komatsu 980E, Liebherr T 284", icon: Truck, examples: ["Open pit", "Underground", "Portos"] },
  { name: "Carregadeiras de Grande Porte", description: "CAT 994K, L-2350, Komatsu WA1200", icon: Settings, examples: ["Carregamento", "Movimentação de materiais"] },
];

export const getEquipmentSpecs = (t?: any) => [
  { label: "Potência Total", value: "530kW", name: "Alimentação", model: "ELP-PS", power: "530kW", capacity: "Contínuo", dimensions: "2m x 1m", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "Elétrico", features: ["Redundante", "Eco-mode", "Monitoramento ESG"], link: "/solucoes/industria", image: "/placeholder.svg" },
  { label: "Throughput", value: "10 ton/hora", name: "Linha Principal", model: "ELP-ML-3000", power: "530kW", capacity: "10 t/h", dimensions: "25m x 10m", maxDiameter: "63''", bladeSize: "1500mm", bladeLife: "6000 hrs", process: "Robótico inteligente", features: ["Full auto", "Orion IA integrada"], link: "/solucoes/industria", image: "/placeholder.svg" },
  { label: "Automação", value: "100%", name: "Sistema Orion", model: "ELP-CS", power: "5kW", capacity: "N/A", dimensions: "1m x 0.5m", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "Digital/IA", features: ["Orion Neural Engine", "IoT", "Digital Twin"], link: "/solucoes/industria", image: "/placeholder.svg" },
  { label: "Recuperação", value: "99.8%", name: "Taxa de Recuperação", model: "N/A", power: "N/A", capacity: "N/A", dimensions: "N/A", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "N/A", features: ["Verificado", "Borracha + Aço + Fibra"], link: "/solucoes/industria", image: "/placeholder.svg" },
];

export const getOutputProducts = (t?: any) => [
  { name: "Borracha Granulada", percentage: 65, color: "hsl(var(--primary))", price: "€800/ton", applications: ["Superfícies esportivas", "Asfalto ecológico", "Produtos industriais", "Isolamento acústico"] },
  { name: "Aço Reciclado", percentage: 25, color: "hsl(var(--muted-foreground))", price: "€400/ton", applications: ["Siderúrgicas", "Construção civil", "Indústria automotiva"] },
  { name: "Fibra Têxtil", percentage: 10, color: "hsl(var(--accent))", price: "€200/ton", applications: ["Isolamento térmico", "Materiais compósitos", "Construção sustentável"] },
];

export const getKeySpecs = (t?: any) => [
  { label: "Capacidade", value: "10 t/h" },
  { label: "Tamanho", value: "57-63''" },
  { label: "Recuperação", value: "99.8%" },
  { label: "Fábricas 2030", value: "17-18" },
];

export const otrTirePartnershipImg = "/placeholder.svg";

export default { getOtrMachines, getOtrApplications, getEquipmentSpecs, getOutputProducts, getKeySpecs, otrTirePartnershipImg };
