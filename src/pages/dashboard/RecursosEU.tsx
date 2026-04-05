import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search, Globe, Building2, Euro, ExternalLink, Loader2, BookOpen, Users, Cpu, Factory, Brain,
  Sparkles, TrendingUp, Network, Mail, Link2, Download, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───
interface CORDISProject {
  id: string;
  acronym: string;
  title: string;
  objective: string;
  totalCost: string;
  ecContribution: string;
  startDate: string;
  endDate: string;
  status: string;
  programme: string;
  coordinator: string;
  country: string;
  url: string;
  topics: string[];
  partners?: string[];
  contacts?: { name: string; email: string; org: string }[];
  links?: { label: string; url: string }[];
}

// ─── Knowledge Domains ───
const KNOWLEDGE_DOMAINS = [
  { icon: Cpu, label: "IA & Robótica", tags: ["artificial-intelligence", "robotics", "HRI", "machine-learning"], color: "bg-blue-500/10 text-blue-400" },
  { icon: Factory, label: "Manufatura Avançada", tags: ["manufacturing", "industry-4.0", "digital-twin", "reconfiguration"], color: "bg-warning/10 text-warning" },
  { icon: Network, label: "Data Spaces", tags: ["data-spaces", "GAIA-X", "IDS", "interoperability"], color: "bg-purple-500/10 text-purple-400" },
  { icon: Globe, label: "IoT & Sensores", tags: ["IoT", "sensors", "edge-computing", "monitoring"], color: "bg-green-500/10 text-green-400" },
  { icon: Users, label: "Colaboração Humano-Robô", tags: ["HRI", "collaborative-robotics", "cobots", "safety"], color: "bg-rose-500/10 text-rose-400" },
  { icon: TrendingUp, label: "Resiliência & Supply Chain", tags: ["resilience", "supply-chain", "reconfiguration", "flexibility"], color: "bg-teal-500/10 text-teal-400" },
];

// ─── Complete Reference Projects (from uploaded documents) ───
const REFERENCE_PROJECTS: CORDISProject[] = [
  {
    id: "101091903", acronym: "Flex4Res",
    title: "Data spaces for flexible production lines and supply chains for resilient manufacturing",
    objective: "Flex4Res develops data spaces for flexible production lines using Digital Twins, IoT platforms, Asset Administration Shells (AAS), and AI-based reconfiguration strategies for resilient manufacturing. Integrates Eclipse Dataspace Connector (EDC), TRUE Connector, GAIA-X Compliance, IDS Information Model.",
    totalCost: "€ 5.624.225", ecContribution: "€ 5.624.225", startDate: "2023-01-01", endDate: "2025-12-31",
    status: "SIGNED", programme: "HORIZON-CL4-2022-TWIN-TRANSITION-01",
    coordinator: "PANEPISTIMIO PATRON (LMS)", country: "Grécia",
    url: "https://cordis.europa.eu/project/id/101091903",
    topics: ["Data Spaces", "Digital Twin", "IoT", "Resilient Manufacturing", "AAS", "GAIA-X", "IDS", "Eclipse Dataspace"],
    partners: ["University of Patras (LMS) - Grécia", "voestalpine - Áustria", "Sidenor - Grécia", "Berg KG - Alemanha", "Goimek - Espanha", "Soraluce - Espanha", "EIT Manufacturing", "Netcompany-Intrasoft", "Contact Software - Alemanha", "A1 Digital - Áustria", "BEIA - Bélgica", "Savvy Data Systems - Espanha", "Mondragon Corporation - Espanha", "IFT - Áustria", "PTW TU Darmstadt - Alemanha", "Uni Siegen - Alemanha", "IDEKO - Espanha"],
    links: [
      { label: "University of Patras (LMS)", url: "https://lms.mech.upatras.gr/" },
      { label: "voestalpine", url: "https://www.voestalpine.com/group/en/" },
      { label: "Sidenor", url: "https://sidenor.gr/en/" },
      { label: "Berg KG", url: "https://www.berg-kg.de/de/" },
      { label: "Goimek", url: "https://www.goimek.com/es" },
      { label: "Soraluce", url: "https://www.soraluce.com/en" },
      { label: "EIT Manufacturing", url: "https://www.eitmanufacturing.eu/" },
      { label: "Netcompany-Intrasoft", url: "https://www.netcompany-intrasoft.com/" },
      { label: "Contact Software", url: "https://contact-software.com/" },
      { label: "A1 Digital", url: "https://www.a1.digital/" },
      { label: "BEIA", url: "https://beia.be/" },
      { label: "Savvy Data Systems", url: "https://www.savvydatasystems.com/es/inicio" },
      { label: "Mondragon Corporation", url: "https://www.mondragon-corporation.com/" },
      { label: "IFT Austria", url: "http://www.ift.at/" },
      { label: "PTW TU Darmstadt", url: "https://www.ptw.tu-darmstadt.de/" },
      { label: "Uni Siegen", url: "https://www.uni-siegen.de/start/" },
      { label: "IDEKO", url: "https://www.ideko.es/" },
      { label: "Eclipse Dataspace Connector", url: "https://github.com/eclipse-edc/Connector" },
      { label: "IDS Association", url: "https://github.com/International-Data-Spaces-Association" },
      { label: "IDS Information Model", url: "https://github.com/International-Data-Spaces-Association/InformationModel" },
      { label: "TRUE Connector", url: "https://github.com/Engineering-Research-and-Development/true-connector-basic-data-app" },
      { label: "TRUE Connector Config", url: "https://engineering-ing-infr.gitbook.io/true-connector/modify-configuration" },
      { label: "GAIA-X Compliance", url: "https://compliance.gaia-x.eu/v1/docs/" },
      { label: "GAIA-X Registry", url: "https://registry.gaia-x.eu/v1/docs/" },
      { label: "GAIA-X Architecture", url: "https://gaia-x.eu/wp-content/uploads/2022/06/Gaia-x-Architecture-Document-22.04-Release.pdf" },
      { label: "IDSA Position Paper", url: "https://internationaldataspaces.org/wp-content/uploads/dlm_uploads/IDSA-Position-Paper-GAIA-X-and-IDS.pdf" },
      { label: "Ocean Protocol + GAIA-X", url: "https://github.com/deltaDAO/Ocean-Protocol-Use-Cases/blob/main/markdown/Ocean_Protocol_Use_Case-Gaia-X.md" },
      { label: "AAS Details (Plattform I40)", url: "https://www.plattform-i40.de/IP/Redaktion/EN/Downloads/Publikation/Details_of_the_Asset_Administration_Shell.html" },
    ],
  },
  {
    id: "101135784", acronym: "ARISE",
    title: "Agile, human-centric, and Real-tIme enabled open SourcE technologies advancing industrial HRI in Europe",
    objective: "ARISE torna implantações industriais de HRI mais simples, baratas e disseminadas na Europa com conceito AgileHRI. Soluções open-source centradas no humano. 4 TEFs e 25+ locais de trabalho (manufatura, saúde, logística). Middleware all-in-one integrando FIWARE e ROS2.",
    totalCost: "~€ 10M", ecContribution: "~€ 8M", startDate: "2024-01-01", endDate: "2027-12-31",
    status: "SIGNED", programme: "HORIZON-CL4-2023-DIGITAL-EMERGING-01-02",
    coordinator: "FUNDACION CARTIF", country: "Espanha",
    url: "https://cordis.europa.eu/project/id/101135784",
    topics: ["FIWARE", "ROS2", "Open-source", "SME Support", "TEFs", "AgileHRI", "Middleware"],
    partners: ["FUNDACION CARTIF - Espanha", "PAL Robotics - Espanha", "Demos Helsinki - Finlândia", "FundingBox Accelerator", "FundingBox Communities", "FIWARE Foundation", "Consorzio INTELLIMECH - Itália", "Politecnico di Milano - Itália", "Algebraic AI - Espanha", "Engineering SPA - Itália"],
    contacts: [
      { name: "Anibal Reñones", email: "aniren@cartif.es", org: "CARTIF" },
      { name: "Mireya de Diego", email: "mirdie@cartif.es", org: "CARTIF" },
      { name: "Francisco Melendez", email: "francisco.melendez@fiware.org", org: "FIWARE Foundation" },
    ],
    links: [
      { label: "ARISE CORDIS", url: "https://cordis.europa.eu/project/id/101135784" },
      { label: "ARISE Middleware", url: "https://arise-middleware.eu" },
      { label: "TEF1 Challenge 1 (CARTIF)", url: "https://youtu.be/pVYA1EUMzQ0" },
      { label: "TEF1 Challenge 2 (CARTIF)", url: "https://youtu.be/ECLC7G9yq5k" },
      { label: "TEF2 Challenges 3/4 (INTELLIMECH)", url: "https://youtu.be/OtXSwHZ7k9Q" },
      { label: "TEF3 Challenge 5 (PAL Robotics)", url: "https://youtu.be/IoRsV484LuA" },
      { label: "TEF3 Challenge 6 (PAL Robotics)", url: "https://youtu.be/-87R32HHaGI" },
      { label: "TEF4 Challenge 7 (POLIMI)", url: "https://youtu.be/R1yeb38ggEI" },
      { label: "TEF4 Challenge 8 (POLIMI)", url: "https://youtu.be/eWuR9BwIS54" },
      { label: "ARISE 1st OC Guidelines (PDF)", url: "https://s3.amazonaws.com/fundingbox-sites/gear/1729262917453-ARISE+1st+OC+-+Technical+Guidelines.pdf" },
      { label: "ROS4HRI GitHub", url: "https://github.com/ros4hri" },
      { label: "ROS4HRI Tutorials", url: "https://ros4hri.github.io/ros4hri-tutorials/" },
      { label: "Smart Data Models (FIWARE)", url: "https://github.com/smart-data-models/" },
    ],
  },
  {
    id: "101135707", acronym: "FORTIS",
    title: "Multi-Modal and Multi-Aspect Holistic Human-Robot Interaction",
    objective: "FORTIS fornece solução completa de HRI com comunicação multimodal e interação multi-aspecto. Centrado no humano para mitigar efeitos do envelhecimento da força de trabalho. 3 pilotos: construção, infraestrutura, manufatura. Pilotos adicionais em saúde, eventos, shopping.",
    totalCost: "~€ 8M", ecContribution: "~€ 6M", startDate: "2024-01-01", endDate: "2027-12-31",
    status: "SIGNED", programme: "HORIZON-CL4-2023-DIGITAL-EMERGING-01-02",
    coordinator: "FUNDACION TECNALIA RESEARCH & INNOVATION", country: "Espanha",
    url: "https://cordis.europa.eu/project/id/101135707",
    topics: ["Multimodal HRI", "Digital Twins", "Safety", "Wearables", "Adaptive Control", "Construction", "Healthcare"],
    partners: ["TECNALIA - Espanha", "Tampere University - Finlândia", "CSIC - Espanha", "Fondazione Bruno Kessler - Itália", "Ingeniarius - Portugal", "XLAB - Eslovênia", "Robotnik Automation - Espanha", "Factor Social - Portugal", "Garcia Garcia S.A.", "F6S Network Ireland", "Vias y Construcciones - Espanha", "Arcelik - Turquia"],
    contacts: [
      { name: "Leire Bastida", email: "leire.bastida@tecnalia.com", org: "TECNALIA" },
      { name: "Wael M. Mohammed", email: "wael.mohammed@tuni.fi", org: "Tampere University" },
      { name: "Fernando Castaño", email: "fernando.castano@car.upm-csic.es", org: "CAR UPM-CSIC" },
      { name: "Rodolfo E. Haber", email: "rodolfo.haber@car.upm-csic.es", org: "CAR UPM-CSIC" },
    ],
    links: [
      { label: "FORTIS CORDIS", url: "https://cordis.europa.eu/project/id/101135707" },
      { label: "FORTIS Website", url: "https://fortis-project.eu/" },
    ],
  },
  {
    id: "101135708", acronym: "JARVIS",
    title: "Intersubjective AI-driven multimodal interaction for advanced user-centric human robot collaborative applications",
    objective: "JARVIS desenvolve ferramentas reutilizáveis para interação multimodal por IA: interfaces para troca física e remota, controle e programação de robôs, habilidades sociais. Setores: energia, automotivo, aeronáutica.",
    totalCost: "~€ 10M", ecContribution: "~€ 8M", startDate: "2024-01-01", endDate: "2027-12-31",
    status: "SIGNED", programme: "HORIZON-CL4-2023-DIGITAL-EMERGING-01-02",
    coordinator: "PANEPISTIMIO PATRON (University of Patras)", country: "Grécia",
    url: "https://cordis.europa.eu/project/id/101135708",
    topics: ["Cognitive Mechatronics", "XR Teleoperation", "Trustworthy AI", "Industry 5.0", "Multimodal", "LLMs"],
    partners: ["University of Patras - Grécia", "TECNALIA - Espanha", "CEA - França", "Tampere University - Finlândia", "KUKA Deutschland - Alemanha", "Netcompany - Grécia", "Collins Aerospace Ireland", "SINTEF - Noruega", "F6S Network Ireland", "EDF - França", "TOFAS - Turquia", "CECIMO", "Teaching Factory CC", "Equinor Energy - Noruega", "Cranfield University - UK", "B/E Aerospace UK"],
    contacts: [
      { name: "Zoi Arkouli", email: "arkouli@lms.mech.upatras.gr", org: "University of Patras (LMS)" },
      { name: "Nikos Dimitropoulos", email: "dimitropoulos@lms.mech.upatras.gr", org: "University of Patras (LMS)" },
      { name: "Christos Gkrizis", email: "gkrizis@lms.mech.upatras.gr", org: "University of Patras (LMS)" },
      { name: "Sotiris Makris", email: "makris@lms.mech.upatras.gr", org: "University of Patras (LMS)" },
    ],
    links: [
      { label: "JARVIS CORDIS", url: "https://cordis.europa.eu/project/id/101135708" },
      { label: "JARVIS Website", url: "https://www.jarvis-project.eu/" },
    ],
  },
  {
    id: "723616", acronym: "THOMAS",
    title: "Mobile dual arm robotic workers with embedded cognition for hybrid manufacturing systems",
    objective: "THOMAS cria shop floors dinamicamente reconfiguráveis com robôs autônomos, móveis, de braço duplo capazes de perceber o ambiente e colaborar com humanos.",
    totalCost: "€ 5.624.225", ecContribution: "€ 4.510.700", startDate: "2016-10-01", endDate: "2021-03-31",
    status: "CLOSED", programme: "H2020-EU.2.1.5 - Industrial Leadership",
    coordinator: "PANEPISTIMIO PATRON", country: "Grécia",
    url: "https://cordis.europa.eu/project/id/723616",
    topics: ["Collaborative Robotics", "Dual-arm Robots", "Cognitive Manufacturing", "HRI", "Mobile Robots"],
    links: [
      { label: "THOMAS CORDIS", url: "https://cordis.europa.eu/project/id/723616" },
      { label: "THOMAS Reporting", url: "https://cordis.europa.eu/project/id/723616/reporting" },
      { label: "THOMAS DOI", url: "https://doi.org/10.3030/723616" },
    ],
  },
];

const RELATED_PROJECTS = [
  { name: "SHOP4CF", desc: "Smart Human Oriented Platform for Connected Factories. H2020, 20 parceiros (BOSCH, VW, Arcelik, Siemens).", url: "https://shop4cf.eu/" },
  { name: "DIH²", desc: "Rede de hubs de inovação digital para robótica em PMEs e agilidade de manufatura.", url: "https://www.dih-squared.eu/" },
  { name: "RobMoSys", desc: "Engenharia baseada em modelos para robótica. H2020 Grant 732410.", url: "https://robmosys.eu/wiki/" },
];

const ACADEMIC_REFS = [
  { title: "Advancing Industrial Collaboration: The Next Generation of HRI", doi: "10.1007/978-3-032-10561-5_21", url: "https://doi.org/10.1007/978-3-032-10561-5_21", authors: "Reñones, de Diego, Melendez, Arkouli, Dimitropoulos, Gkrizis, Makris, Castaño, Mohammed, Haber, Bastida" },
  { title: "AI for Long-Term Robot Autonomy: A Survey", doi: "arXiv:1807.05196", url: "http://arxiv.org/abs/1807.05196", authors: "Kunze, Hawes, Duckett, Hanheide, Krajník" },
  { title: "ROS for Human-Robot Interaction", doi: "arXiv:2012.13944", url: "https://doi.org/10.48550/arXiv.2012.13944", authors: "Mohamed, Lemaignan" },
  { title: "Generative AI and Robotics: From LLMs to Intelligent HRI", doi: "10.5281/zenodo.14001479", url: "https://doi.org/10.5281/zenodo.14001479", authors: "Thaker" },
];

const TECH_RESOURCES = [
  { label: "Eclipse Dataspace Connector (EDC)", url: "https://github.com/eclipse-edc/Connector", type: "Data Spaces" },
  { label: "IDS Association - GitHub", url: "https://github.com/International-Data-Spaces-Association", type: "Data Spaces" },
  { label: "IDS Information Model", url: "https://github.com/International-Data-Spaces-Association/InformationModel", type: "Data Spaces" },
  { label: "TRUE Connector", url: "https://github.com/Engineering-Research-and-Development/true-connector-basic-data-app", type: "Data Spaces" },
  { label: "TRUE Connector Config", url: "https://engineering-ing-infr.gitbook.io/true-connector/modify-configuration", type: "Data Spaces" },
  { label: "GAIA-X Compliance API", url: "https://compliance.gaia-x.eu/v1/docs/", type: "GAIA-X" },
  { label: "GAIA-X Registry API", url: "https://registry.gaia-x.eu/v1/docs/", type: "GAIA-X" },
  { label: "GAIA-X Architecture 22.04", url: "https://gaia-x.eu/wp-content/uploads/2022/06/Gaia-x-Architecture-Document-22.04-Release.pdf", type: "GAIA-X" },
  { label: "IDSA Position Paper GAIA-X", url: "https://internationaldataspaces.org/wp-content/uploads/dlm_uploads/IDSA-Position-Paper-GAIA-X-and-IDS.pdf", type: "GAIA-X" },
  { label: "Ocean Protocol + GAIA-X", url: "https://github.com/deltaDAO/Ocean-Protocol-Use-Cases/blob/main/markdown/Ocean_Protocol_Use_Case-Gaia-X.md", type: "GAIA-X" },
  { label: "ROS4HRI - GitHub", url: "https://github.com/ros4hri", type: "Robotics" },
  { label: "ROS4HRI Tutorials", url: "https://ros4hri.github.io/ros4hri-tutorials/", type: "Robotics" },
  { label: "Smart Data Models (FIWARE)", url: "https://github.com/smart-data-models/", type: "IoT" },
  { label: "Interoperability in Robotics", url: "https://howtorobot.com/expert-insight/interoperability", type: "Robotics" },
  { label: "Horizon CL4 Programme", url: "https://cordis.europa.eu/programme/id/HORIZON_HORIZON-CL4-2023-DIGITAL-EMERGING-01-02/en", type: "Funding" },
  { label: "AAS Details (Plattform I40)", url: "https://www.plattform-i40.de/IP/Redaktion/EN/Downloads/Publikation/Details_of_the_Asset_Administration_Shell.html", type: "Standards" },
  { label: "Creative Commons BY 4.0", url: "http://creativecommons.org/licenses/by/4.0/", type: "License" },
  { label: "CrossMark / Crossref", url: "http://crossmark.crossref.org/dialog/?doi=10.1007/978-3-032-10561-5_21&domain=pdf", type: "Academic" },
];

const ALL_CONTACTS = [
  { name: "Anibal Reñones", email: "aniren@cartif.es", org: "Fundacion CARTIF", project: "ARISE" },
  { name: "Mireya de Diego", email: "mirdie@cartif.es", org: "Fundacion CARTIF", project: "ARISE" },
  { name: "Francisco Melendez", email: "francisco.melendez@fiware.org", org: "FIWARE Foundation", project: "ARISE" },
  { name: "Zoi Arkouli", email: "arkouli@lms.mech.upatras.gr", org: "University of Patras (LMS)", project: "JARVIS" },
  { name: "Nikos Dimitropoulos", email: "dimitropoulos@lms.mech.upatras.gr", org: "University of Patras (LMS)", project: "JARVIS" },
  { name: "Christos Gkrizis", email: "gkrizis@lms.mech.upatras.gr", org: "University of Patras (LMS)", project: "JARVIS" },
  { name: "Sotiris Makris", email: "makris@lms.mech.upatras.gr", org: "University of Patras (LMS)", project: "JARVIS" },
  { name: "Fernando Castaño", email: "fernando.castano@car.upm-csic.es", org: "CAR UPM-CSIC", project: "FORTIS" },
  { name: "Rodolfo E. Haber", email: "rodolfo.haber@car.upm-csic.es", org: "CAR UPM-CSIC", project: "FORTIS" },
  { name: "Wael M. Mohammed", email: "wael.mohammed@tuni.fi", org: "Tampere University", project: "FORTIS" },
  { name: "Leire Bastida", email: "leire.bastida@tecnalia.com", org: "TECNALIA", project: "FORTIS" },
];

export default function RecursosEU() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ingested, setIngested] = useState<Set<string>>(new Set());

  const filteredProjects = searchQuery.trim()
    ? REFERENCE_PROJECTS.filter((p) => {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.objective.toLowerCase().includes(q) || p.acronym.toLowerCase().includes(q) || p.topics.some((t) => t.toLowerCase().includes(q)) || p.partners?.some((pa) => pa.toLowerCase().includes(q));
      })
    : REFERENCE_PROJECTS;

  const analyzeWithAI = async (project: CORDISProject) => {
    setIsAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Autenticação necessária", description: "Faça login para usar a análise neural", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          action: "chat",
          question: `Analise o projeto EU "${project.acronym}" (${project.title}).\nObjetivo: ${project.objective}\nPrograma: ${project.programme}\nOrçamento: ${project.totalCost}\nParceiros: ${project.partners?.join(", ") || "N/A"}\n\nForneça:\n1. Tecnologias-chave e aplicabilidade\n2. Oportunidades de colaboração\n3. Adaptação para legal tech / IA jurídica\n4. Oportunidades de financiamento similares\n5. Análise do consórcio`,
        },
      });
      if (error) throw new Error(error.message || "Erro na Edge Function");
      const content = data?.content || data?.response || data?.text;
      if (content) { setAiAnalysis(content); toast({ title: "Análise concluída", description: `Projeto ${project.acronym} analisado` }); }
      else if (data?.error) throw new Error(data.error);
      else throw new Error("Resposta vazia do provedor IA");
    } catch (err: any) { toast({ title: "Erro na análise", description: err?.message || "Falha ao analisar projeto", variant: "destructive" }); }
    finally { setIsAnalyzing(false); }
  };

  const ingestToNeuralNetwork = async (project: CORDISProject) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Você precisa estar autenticado para absorver dados", variant: "destructive" });
        return;
      }
      const contactsText = project.contacts?.map((c) => `${c.name} (${c.email} - ${c.org})`).join("; ") || "";
      const partnersText = project.partners?.join(", ") || "";
      const linksText = project.links?.map((l) => `${l.label}: ${l.url}`).join("\n") || "";
      const fullContent = `Projeto EU: ${project.acronym}\nTítulo: ${project.title}\nObjetivo: ${project.objective}\nPrograma: ${project.programme}\nOrçamento: ${project.totalCost}\nContribuição EC: ${project.ecContribution}\nCoordenador: ${project.coordinator}\nPaís: ${project.country}\nTópicos: ${project.topics.join(", ")}\nParceiros: ${partnersText}\nContatos: ${contactsText}\nLinks:\n${linksText}\nURL: ${project.url}`;
      
      const { error } = await supabase.from("neural_knowledge_base").insert({
        title: `[EU Project] ${project.acronym}: ${project.title}`,
        content: fullContent,
        source_type: "eu_funding",
        source_reference: project.url,
        category: "research",
        tags: ["eu-funding", "horizon-europe", ...project.topics.map((t) => t.toLowerCase().replace(/\s+/g, "-"))],
        user_id: user.id,
      });
      if (error) throw error;

      // Trigger embedding processing via neural-ops
      supabase.functions.invoke("neural-ops", {
        body: { action: "process_embeddings" },
      }).catch(() => {/* silent - cron will pick up */});

      setIngested((prev) => new Set(prev).add(project.id));
      toast({ title: "✅ Conhecimento absorvido", description: `${project.acronym} adicionado à base neural e enviado para processamento de embeddings` });
    } catch (err: any) { toast({ title: "Erro ao absorver", description: err?.message || "Falha ao ingerir na rede neural", variant: "destructive" }); }
  };

  const ingestAll = async () => {
    for (const project of REFERENCE_PROJECTS) {
      if (!ingested.has(project.id)) await ingestToNeuralNetwork(project);
    }
    toast({ title: "✅ Todos ingeridos", description: `${REFERENCE_PROJECTS.length} projetos absorvidos pela rede neural` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Recursos EU & Financiamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">53 links • 11 contatos • 5 projetos • 4 referências acadêmicas • Dados completos dos documentos EU</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={ingestAll} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Absorver Tudo na Rede Neural
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KNOWLEDGE_DOMAINS.map((domain) => (
          <Card key={domain.label} className="cursor-pointer hover:border-primary/40 transition-colors group" onClick={() => setSearchQuery(domain.tags[0])}>
            <CardContent className="p-3 flex flex-col items-center text-center gap-2">
              <div className={`p-2 rounded-lg ${domain.color}`}><domain.icon className="h-5 w-5" /></div>
              <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">{domain.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="projects" className="gap-1.5"><Search className="h-3.5 w-3.5" /> Projetos</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Contatos (11)</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Links (53+)</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Análise Neural</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex gap-3">
              <Input placeholder="Buscar por tecnologia, parceiro, país... (ex: robotics, KUKA, Espanha)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10" />
              <Button onClick={() => setSearchQuery("")} variant="ghost" size="sm">Limpar</Button>
            </div>
          </CardContent></Card>
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onAnalyze={() => analyzeWithAI(project)} onIngest={() => ingestToNeuralNetwork(project)} isAnalyzing={isAnalyzing} isIngested={ingested.has(project.id)} />
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-sm">Projetos Relacionados (H2020)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {RELATED_PROJECTS.map((rp) => (
                <div key={rp.name} className="flex items-start justify-between gap-3 p-2 rounded border border-border/50">
                  <div><span className="text-xs font-semibold text-foreground">{rp.name}</span><p className="text-[11px] text-muted-foreground">{rp.desc}</p></div>
                  <Button size="sm" variant="ghost" className="shrink-0 h-7 text-[10px]" onClick={() => window.open(rp.url, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Contatos dos Projetos EU (11)</CardTitle></CardHeader>
            <CardContent><div className="grid gap-2">
              {ALL_CONTACTS.map((c) => (
                <div key={c.email} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.org}</div>
                    <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{c.project}</Badge>
                </div>
              ))}
            </div></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Todos os Links & Recursos</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="tech">
                  <AccordionTrigger className="text-xs font-semibold">🔧 Recursos Técnicos ({TECH_RESOURCES.length})</AccordionTrigger>
                  <AccordionContent><div className="grid gap-1.5">
                    {TECH_RESOURCES.map((res) => (
                      <a key={res.url} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded border border-border/30 hover:border-primary/40 transition-colors">
                        <div className="flex items-center gap-2 min-w-0"><ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" /><span className="text-xs text-foreground truncate">{res.label}</span></div>
                        <Badge variant="secondary" className="text-[9px] shrink-0">{res.type}</Badge>
                      </a>
                    ))}
                  </div></AccordionContent>
                </AccordionItem>
                <AccordionItem value="academic">
                  <AccordionTrigger className="text-xs font-semibold">📚 Referências Acadêmicas ({ACADEMIC_REFS.length})</AccordionTrigger>
                  <AccordionContent><div className="grid gap-2">
                    {ACADEMIC_REFS.map((ref) => (
                      <a key={ref.doi} href={ref.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded border border-border/30 hover:border-primary/40 block">
                        <div className="text-xs font-medium text-foreground">{ref.title}</div>
                        <div className="text-[10px] text-muted-foreground">DOI: {ref.doi}</div>
                        <div className="text-[10px] text-muted-foreground">Autores: {ref.authors}</div>
                      </a>
                    ))}
                  </div></AccordionContent>
                </AccordionItem>
                {REFERENCE_PROJECTS.filter((p) => p.links && p.links.length > 0).map((project) => (
                  <AccordionItem key={project.id} value={project.id}>
                    <AccordionTrigger className="text-xs font-semibold">🔗 {project.acronym} ({project.links!.length} links)</AccordionTrigger>
                    <AccordionContent><div className="grid gap-1.5">
                      {project.links!.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded border border-border/30 hover:border-primary/40 transition-colors">
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground truncate">{link.label}</span>
                        </a>
                      ))}
                    </div></AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Análise Neural</CardTitle></CardHeader>
            <CardContent>
              {aiAnalysis ? (
                <ScrollArea className="h-[400px]"><div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{aiAnalysis}</div></ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Brain className="h-12 w-12 mx-auto mb-4 opacity-30" /><p className="text-sm">Selecione um projeto e clique em "Analisar com IA"</p></div>
              )}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-sm">Conceitos Arquiteturais dos Documentos</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: "Data Spaces (IDS + Gaia-X + EDC)", desc: "Arquitetura federada para compartilhamento soberano de dados. Eclipse Dataspace Connector, TRUE Connector, catálogo GAIA-X." },
                { title: "Asset Administration Shell (AAS)", desc: "Modelo padronizado para representação digital de ativos industriais (Plattform I40). Interoperabilidade entre Digital Twins." },
                { title: "Resilience Assessment Toolbox", desc: "Avaliação de resiliência em cadeias de suprimentos com modelos de dados e reconfiguração baseada em IA." },
                { title: "FIWARE + ROS2 Middleware (ARISE)", desc: "Stack open-source para interoperabilidade entre plataformas robóticas e IoT. EPROSIMA Vulcanexus, Smart Data Models." },
                { title: "Cognitive Mechatronics (JARVIS)", desc: "Integração de percepção, cognição e comunicação. XR Teleoperation, Trustworthy AI, interfaces multimodais." },
                { title: "TEFs & FSTP Programs (ARISE)", desc: "4 TEFs: CARTIF, INTELLIMECH, PAL Robotics, POLIMI. 8 challenges industriais. FSTP para PMEs." },
                { title: "ROS4HRI Framework", desc: "Convenções para HRI em ROS 1/2 (REP-155). Percepção social, LLMs para robôs interativos." },
                { title: "VDA 5050 & MassRobotics", desc: "Padrões de interoperabilidade para frotas diversas de AMRs de diferentes fabricantes." },
              ].map((c) => (
                <div key={c.title} className="p-3 rounded-lg border border-border/50 bg-secondary/30">
                  <h4 className="text-xs font-semibold text-foreground mb-1">{c.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectCard({ project, onAnalyze, onIngest, isAnalyzing, isIngested }: { project: CORDISProject; onAnalyze: () => void; onIngest: () => void; isAnalyzing: boolean; isIngested: boolean }) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] shrink-0">{project.acronym}</Badge>
              <Badge className={`text-[10px] shrink-0 ${project.status === "SIGNED" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted text-muted-foreground"}`}>{project.status}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{project.programme}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{project.title}</h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{project.objective}</p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Euro className="h-3 w-3" /> {project.ecContribution}</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {project.coordinator}</span>
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {project.country}</span>
              {project.partners && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {project.partners.length} parceiros</span>}
              {project.contacts && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {project.contacts.length} contatos</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {project.topics.slice(0, 6).map((t) => (<Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>))}
              {project.topics.length > 6 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">+{project.topics.length - 6}</Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={onAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Analisar
            </Button>
            <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={onIngest} disabled={isIngested}>
              {isIngested ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Brain className="h-3 w-3" />} {isIngested ? "Absorvido" : "Absorver"}
            </Button>
            <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1" onClick={() => window.open(project.url, "_blank")}>
              <ExternalLink className="h-3 w-3" /> CORDIS
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
