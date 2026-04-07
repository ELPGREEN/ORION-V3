import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

const ML = 30, MR = 20, MT = 30, PW = 210, CW = PW - ML - MR;

function pageNum(doc: jsPDF, p: number, t: number) {
  doc.setFontSize(8); doc.setFont("times", "normal"); doc.setTextColor(120);
  doc.text(`${p} / ${t}`, PW / 2, 290, { align: "center" });
  doc.setTextColor(0);
}

function secHeader(doc: jsPDF, y: number, num: string, title: string) {
  doc.setFontSize(12); doc.setFont("times", "bold");
  doc.text(`${num}  ${title.toUpperCase()}`, ML, y);
  doc.setDrawColor(180, 150, 50); doc.setLineWidth(0.4);
  doc.line(ML, y + 2, ML + CW, y + 2);
  return y + 10;
}

function subSec(doc: jsPDF, y: number, num: string, title: string) {
  doc.setFontSize(11); doc.setFont("times", "bold");
  doc.text(`${num}  ${title}`, ML, y);
  return y + 7;
}

function body(doc: jsPDF, y: number, text: string, indent = 0) {
  doc.setFontSize(10); doc.setFont("times", "normal");
  const lines = doc.splitTextToSize(text, CW - indent);
  doc.text(lines, ML + indent, y);
  return y + lines.length * 5;
}

function bullet(doc: jsPDF, y: number, label: string, value: string) {
  doc.setFontSize(10); doc.setFont("times", "bold");
  doc.text(`•  ${label}:`, ML + 5, y);
  const w = doc.getTextWidth(`•  ${label}: `);
  doc.setFont("times", "normal");
  doc.text(value, ML + 5 + w, y);
  return y + 6;
}

function tblRow(doc: jsPDF, y: number, cols: string[], widths: number[], bold = false) {
  doc.setFontSize(9); doc.setFont("times", bold ? "bold" : "normal");
  let x = ML;
  cols.forEach((c, i) => { doc.text(c, x + 2, y); x += widths[i]; });
  doc.setDrawColor(200); doc.setLineWidth(0.2);
  doc.line(ML, y + 2, ML + widths.reduce((a, b) => a + b, 0), y + 2);
  return y + 6;
}

function pgBreak(doc: jsPDF, y: number, n: number) {
  if (y + n > 275) { doc.addPage(); return MT; }
  return y;
}

// ── CHART: Horizontal bar chart ──
function drawBarChart(doc: jsPDF, y: number, data: [string, number][], title: string, maxWidth = 90) {
  const maxVal = Math.max(...data.map(d => d[1]), 1);
  doc.setFontSize(9); doc.setFont("times", "bold");
  doc.text(title, ML, y); y += 6;

  data.forEach(([label, val]) => {
    doc.setFontSize(8); doc.setFont("times", "normal");
    const shortLabel = label.length > 22 ? label.substring(0, 20) + "…" : label;
    doc.text(shortLabel, ML + 2, y);
    const barX = ML + 50;
    const barW = (val / maxVal) * maxWidth;
    // bar bg
    doc.setFillColor(240, 240, 240);
    doc.rect(barX, y - 3, maxWidth, 4, "F");
    // bar fill
    doc.setFillColor(180, 150, 50);
    doc.rect(barX, y - 3, barW, 4, "F");
    // value
    doc.setFontSize(7);
    doc.text(val.toLocaleString(), barX + maxWidth + 3, y);
    y += 6;
  });
  return y;
}

// ── CHART: Pie chart (simple segments) ──
function drawPieChart(doc: jsPDF, y: number, segments: { label: string; value: number; color: [number, number, number] }[], title: string) {
  doc.setFontSize(9); doc.setFont("times", "bold");
  doc.text(title, ML, y);

  const cx = ML + 35, cy = y + 30, r = 22;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    const sliceAngle = (seg.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    // Draw slice as filled triangle fan
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    const points: number[] = [cx, cy];
    const steps = Math.max(Math.ceil(sliceAngle / 0.1), 3);
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (sliceAngle * i) / steps;
      points.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    // Use lines to draw filled sector
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (sliceAngle * i) / steps;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) {
        doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      }
      // Simple approach: filled triangles
      if (i > 0) {
        const prevA = startAngle + (sliceAngle * (i - 1)) / steps;
        const ppx = cx + r * Math.cos(prevA);
        const ppy = cy + r * Math.sin(prevA);
        doc.triangle(cx, cy, ppx, ppy, px, py, "F");
      }
    }
    startAngle = endAngle;
  });

  // Circle outline
  doc.setDrawColor(100); doc.setLineWidth(0.3);
  doc.circle(cx, cy, r, "S");

  // Legend
  let ly = y + 8;
  const lx = ML + 65;
  segments.forEach(seg => {
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.rect(lx, ly - 3, 4, 4, "F");
    doc.setFontSize(8); doc.setFont("times", "normal");
    const pct = total ? Math.round((seg.value / total) * 100) : 0;
    doc.text(`${seg.label}: ${seg.value} (${pct}%)`, lx + 6, ly);
    ly += 6;
  });

  return y + 58;
}

// ── DIAGRAM: Neural Architecture Map ──
function drawNeuralMap(doc: jsPDF, y: number) {
  doc.setFontSize(9); doc.setFont("times", "bold");
  doc.text("MAPA NEURAL DO SISTEMA -- ARQUITETURA FUNCIONAL", ML, y);
  y += 6;

  const boxW = 32, boxH = 10, gap = 4;
  const startX = ML + 2;

  function drawBox(x: number, yy: number, text: string, fill: [number, number, number], textColor: [number, number, number] = [0, 0, 0]) {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
    doc.roundedRect(x, yy, boxW, boxH, 1.5, 1.5, "FD");
    doc.setFontSize(6.5); doc.setFont("times", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const lines = doc.splitTextToSize(text, boxW - 3);
    doc.text(lines, x + boxW / 2, yy + (lines.length === 1 ? 5.5 : 3.5), { align: "center" });
    doc.setTextColor(0);
  }

  function arrow(x1: number, y1: number, x2: number, y2: number) {
    doc.setDrawColor(150, 130, 50); doc.setLineWidth(0.4);
    doc.line(x1, y1, x2, y2);
    // arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const aLen = 2;
    doc.line(x2, y2, x2 - aLen * Math.cos(angle - 0.4), y2 - aLen * Math.sin(angle - 0.4));
    doc.line(x2, y2, x2 - aLen * Math.cos(angle + 0.4), y2 - aLen * Math.sin(angle + 0.4));
  }

  // Layer 1: User inputs
  const l1y = y;
  const inputs = ["Chat IA", "Pesquisa MHA", "Gerar Documento", "Legislação"];
  inputs.forEach((label, i) => {
    drawBox(startX + i * (boxW + gap), l1y, label, [230, 240, 255]);
  });

  // Arrow down to orchestrator
  const l2y = l1y + boxH + 8;
  inputs.forEach((_, i) => {
    arrow(startX + i * (boxW + gap) + boxW / 2, l1y + boxH, startX + i * (boxW + gap) + boxW / 2, l2y);
  });

  // Layer 2: Orchestrator (wide)
  const orchW = inputs.length * (boxW + gap) - gap;
  doc.setFillColor(180, 150, 50); doc.setDrawColor(120); doc.setLineWidth(0.3);
  doc.roundedRect(startX, l2y, orchW, boxH, 1.5, 1.5, "FD");
  doc.setFontSize(7); doc.setFont("times", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("ORQUESTRADOR IA -- ai-orchestrator (Motor Alpha / Beta / Gamma / Delta)", startX + orchW / 2, l2y + 5.5, { align: "center" });
  doc.setTextColor(0);

  // Arrow down
  const l3y = l2y + boxH + 8;
  arrow(startX + orchW / 2, l2y + boxH, startX + orchW / 2, l3y);

  // Layer 3: Core modules
  const coreModules = ["RAG Pipeline", "Quantum Perceptron", "MHA v4", "Anti-Alucinacao"];
  coreModules.forEach((label, i) => {
    drawBox(startX + i * (boxW + gap), l3y, label, [255, 240, 210]);
  });

  // Arrows down
  const l4y = l3y + boxH + 8;
  coreModules.forEach((_, i) => {
    arrow(startX + i * (boxW + gap) + boxW / 2, l3y + boxH, startX + i * (boxW + gap) + boxW / 2, l4y);
  });

  // Layer 4: Data sources
  const sources = ["pgvector", "DataJud API", "Senado API", "STF BigQuery"];
  sources.forEach((label, i) => {
    drawBox(startX + i * (boxW + gap), l4y, label, [220, 245, 220]);
  });

  // Layer 5: Additional sources
  const l5y = l4y + boxH + gap;
  const sources2 = ["CourtListener", "Legislacao Fed.", "OAB/AcessoRH", "Cache Intel."];
  sources2.forEach((label, i) => {
    drawBox(startX + i * (boxW + gap), l5y, label, [220, 245, 220]);
  });

  // Lateral: Learning loop
  const loopX = startX + orchW + 6;
  const loopY = l2y;
  drawBox(loopX, loopY, "Auto-Learn Cron", [245, 230, 255]);
  arrow(loopX, loopY + boxH / 2, startX + orchW, l2y + boxH / 2);
  drawBox(loopX, loopY + boxH + gap, "Feedback A/B", [245, 230, 255]);
  arrow(loopX, loopY + boxH + gap + boxH / 2, loopX, loopY + boxH);
  drawBox(loopX, loopY + 2 * (boxH + gap), "Queue Worker", [245, 230, 255]);
  arrow(loopX, loopY + 2 * (boxH + gap) + boxH / 2, loopX, loopY + boxH + gap + boxH);

  return l5y + boxH + 8;
}

export function NeuralPDFReport() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  async function generateReport() {
    setGenerating(true);
    try {
      const [
        embeddingsRes, knowledgeRes, knowledgeProcessedRes,
        learningRes, learnedRes, feedbackRes,
        weightsRes, specsRes, queuePending, queueFailed,
        metricsRes,
      ] = await Promise.all([
        supabase.from("legal_embeddings").select("source", { count: "exact", head: false }).limit(1000),
        supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }),
        supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).eq("is_processed", true),
        supabase.from("neural_learning_data").select("id", { count: "exact", head: true }),
        supabase.from("neural_learning_data").select("id", { count: "exact", head: true }).eq("learned", true),
        supabase.from("neural_learning_data").select("quality_score, metadata").eq("interaction_type", "quantum_feedback").limit(200),
        supabase.from("neural_specializations").select("prompts").eq("name", "Quantum Category Weights").eq("is_active", true).maybeSingle(),
        supabase.from("neural_specializations").select("name, category, accuracy_score, training_status, is_active"),
        supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("ai_metrics").select("provider, success, total_duration_ms, complexity, cost_tier").order("created_at", { ascending: false }).limit(200),
      ]);

      // Process data
      const sourceMap = new Map<string, number>();
      (embeddingsRes.data || []).forEach((r: any) => {
        sourceMap.set(r.source || "unknown", (sourceMap.get(r.source || "unknown") || 0) + 1);
      });
      const topSources = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
      const totalEmbeddings = embeddingsRes.count || 0;

      const feedbackItems = feedbackRes.data || [];
      const positiveCount = feedbackItems.filter((f: any) => f.quality_score === 1.0).length;
      const negativeCount = feedbackItems.filter((f: any) => f.quality_score === 0.0).length;
      const neutralCount = feedbackItems.length - positiveCount - negativeCount;

      const prompts = (weightsRes.data?.prompts || {}) as Record<string, unknown>;
      const categories = (prompts.categories || []) as Array<{ name: string; weights: number[] }>;
      const specs = specsRes.data || [];

      const knowledgeTotal = knowledgeRes.count || 0;
      const knowledgeProcessed = knowledgeProcessedRes.count || 0;
      const learningTotal = learningRes.count || 0;
      const learnedTotal = learnedRes.count || 0;
      const learningRate = learningTotal ? Math.round((learnedTotal / learningTotal) * 100) : 0;
      const pendingJobs = queuePending.count || 0;
      const failedJobs = queueFailed.count || 0;

      // AI Metrics
      const metrics = metricsRes.data || [];
      const providerMap = new Map<string, { total: number; success: number; avgMs: number }>();
      metrics.forEach((m: any) => {
        const p = m.provider || "unknown";
        const cur = providerMap.get(p) || { total: 0, success: 0, avgMs: 0 };
        cur.total++;
        if (m.success) cur.success++;
        cur.avgMs += m.total_duration_ms || 0;
        providerMap.set(p, cur);
      });
      providerMap.forEach(v => { v.avgMs = v.total ? Math.round(v.avgMs / v.total) : 0; });

      const complexityMap = new Map<string, number>();
      metrics.forEach((m: any) => {
        const c = m.complexity || "unknown";
        complexityMap.set(c, (complexityMap.get(c) || 0) + 1);
      });

      // ──── PDF ────
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      const timeStr = now.toLocaleTimeString("pt-BR");

      // ══════ COVER ══════
      doc.setDrawColor(180, 150, 50); doc.setLineWidth(1);
      doc.line(ML, 25, ML + CW, 25);
      doc.setFontSize(10); doc.setFont("times", "normal"); doc.setTextColor(120);
      doc.text("ORION IA -- ELP GREEN TECHNOLOGY -- NEURAL ENGINEERING DEPT.", ML, 22);

      doc.setTextColor(0); doc.setFontSize(22); doc.setFont("times", "bold");
      doc.text("RELATÓRIO TÉCNICO DE ENGENHARIA", ML, 55);
      doc.setFontSize(16); doc.setFont("times", "normal");
      doc.text("Rede Neural Conexao -- Quantum Deep Learning v11", ML, 65);
      doc.setDrawColor(180, 150, 50); doc.setLineWidth(0.5);
      doc.line(ML, 70, ML + CW, 70);

      let cy = 85;
      const meta = [
        ["Documento", "RT-NEURAL-" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")],
        ["Classificacao", "CONFIDENCIAL -- Uso Interno"],
        ["Data de Emissao", `${dateStr} -- ${timeStr}`],
        ["Versao", "v11.0 -- Quantum Perceptron + MHA v4"],
        ["Advogado / Diretor Juridico", "[Nome do Advogado] -- [OAB]"],
        ["Criador & Arquiteto do Sistema", "Ericson Piccoli -- Engenheiro de IA & Quantum Computing"],
        ["Pipeline", "Neural Search v8 -> Quantum Perceptron Multi-Layer"],
        ["Infraestrutura", "Supabase Edge Functions + pgvector + 5 Cron Jobs"],
      ];
      meta.forEach(([l, v]) => {
        doc.setFont("times", "bold"); doc.setFontSize(10);
        doc.text(`${l}:`, ML, cy);
        doc.setFont("times", "normal");
        doc.text(v, ML + 42, cy);
        cy += 7;
      });

      cy += 10;
      doc.setDrawColor(200); doc.setLineWidth(0.3);
      doc.line(ML, cy, ML + CW, cy); cy += 8;
      doc.setFontSize(11); doc.setFont("times", "bold");
      doc.text("RESUMO", ML, cy); cy += 7;
      doc.setFontSize(10); doc.setFont("times", "italic");
      const abstractText = `Este relatorio apresenta o estado operacional completo da Rede Neural Conexao, sistema de inteligencia artificial juridica baseado em arquitetura hibrida classico-quantica (Multi-Layer QNN + MHA v4). Metricas: ${totalEmbeddings.toLocaleString()} embeddings, ${knowledgeTotal.toLocaleString()} entradas na base, taxa de aprendizado ${learningRate}%, ${specs.length} especializacoes, ${metrics.length} interacoes de IA recentes monitoradas.`;
      const aLines = doc.splitTextToSize(abstractText, CW);
      doc.text(aLines, ML, cy); cy += aLines.length * 5 + 5;
      doc.setFont("times", "bold"); doc.setFontSize(9);
      doc.text("Palavras-chave:", ML, cy);
      doc.setFont("times", "normal");
      doc.text("Quantum Computing, Deep Learning, NLP Juridico, RAG, Embeddings, pgvector, MHA", ML + 28, cy);

      // Cover footer
      doc.setDrawColor(180, 150, 50); doc.setLineWidth(1);
      doc.line(ML, 275, ML + CW, 275);
      doc.setFontSize(8); doc.setFont("times", "italic"); doc.setTextColor(120);
      doc.text("ELP Green Technology -- Rede Neural Conexao v11 -- Confidencial", ML, 280);
      doc.text("info@iasofthub.com | www.iasofthub.com | [OAB]", ML, 284);
      doc.setTextColor(0);

      // ══════ TOC ══════
      doc.addPage();
      let y = MT;
      doc.setFontSize(14); doc.setFont("times", "bold");
      doc.text("SUMÁRIO", ML, y); y += 3;
      doc.setDrawColor(180, 150, 50); doc.setLineWidth(0.4);
      doc.line(ML, y, ML + CW, y); y += 10;

      const toc = [
        ["1", "Visao Geral -- Rede Neural Conexao v11 (Quantum Deep Learning)"],
        ["1.1", "Metricas Principais"], ["1.2", "Fila de Processamento"],
        ["2", "Mapa Neural do Sistema"], ["3", "Arquitetura Quantica (PQC)"],
        ["4", "Distribuicao de Fontes de Dados"],
        ["5", "Analise de Feedback (A/B Testing)"], ["6", "Metricas de Provedores de IA"],
        ["7", "Distribuicao por Complexidade"], ["8", "Pesos Quanticos por Categoria"],
        ["9", "Especializacoes Treinadas"], ["10", "Arquitetura Tecnica Detalhada"],
        ["11", "Consideracoes Finais"],
      ];
      doc.setFontSize(10);
      toc.forEach(([num, title]) => {
        const isMain = !num.includes(".");
        doc.setFont("times", isMain ? "bold" : "normal");
        doc.text(num, ML + (isMain ? 0 : 5), y);
        doc.text(title, ML + 15, y);
        y += 7;
      });

      // ══════ SECTION 1 ══════
      doc.addPage(); y = MT;
      y = secHeader(doc, y, "1", "Visao Geral -- Rede Neural Conexao v11 (Quantum Deep Learning)");
      y = body(doc, y,
        "A Rede Neural Conexao v12 e um sistema de inteligencia artificial juridica criado e arquitetado " +
        "por Ericson Piccoli (linkedin.com/in/elpgreen), engenheiro de IA e criador do sistema, " +
        "atendendo as necessidades juridicas definidas pelo [Nome do Advogado] ([OAB]). " +
        "O sistema utiliza arquitetura hibrida classico-quantica " +
        "(Multi-Layer Quantum Neural Network + Multi-Head Attention v6) para processamento de linguagem " +
        "natural especializado em direito brasileiro."
      );
      y += 4;
      y = body(doc, y,
        "O Nucleo Neural esta funcionalmente interconectado a 11 modulos: Chat IA (RAG), Geracao de Documentos, " +
        "Pesquisa MHA, Cache Inteligente, Fila de Processamento, Legislacao Federal, DataJud, Assinatura Digital, " +
        "Gestao de Clientes (CRM), Pagamentos e Notificacoes. Essa integracao garante que a IA utilize dados " +
        "reais da base para fundamentacao tecnica e prevencao de alucinacoes em todas as ferramentas."
      );
      y += 4;
      y = subSec(doc, y, "1.1", "Metricas Principais");
      y = bullet(doc, y, "Embeddings Juridicos", `${totalEmbeddings.toLocaleString()} vetores em ${topSources.length} fontes`);
      y = bullet(doc, y, "Base Neural", `${knowledgeTotal.toLocaleString()} entradas (${knowledgeProcessed.toLocaleString()} processadas -- ${knowledgeTotal ? Math.round((knowledgeProcessed / knowledgeTotal) * 100) : 0}%)`);
      y = bullet(doc, y, "Interacoes de Aprendizado", `${learningTotal.toLocaleString()} (${learnedTotal.toLocaleString()} incorporadas)`);
      y = bullet(doc, y, "Taxa de Aprendizado", `${learningRate}%`);
      y = bullet(doc, y, "Especializacoes Ativas", `${specs.filter((s: any) => s.is_active).length} / ${specs.length}`);
      y = bullet(doc, y, "IA Interactions (ultimas 200)", `${metrics.length} registros monitorados`);
      y += 4;
      y = subSec(doc, y, "1.2", "Fila de Processamento");
      y = bullet(doc, y, "Pendentes", `${pendingJobs}`);
      y = bullet(doc, y, "Falhados", `${failedJobs}`);
      y = bullet(doc, y, "Heartbeat", "15s intervalo, auto-fail > 10min");
      y += 8;

      // ══════ SECTION 2: NEURAL MAP ══════
      y = pgBreak(doc, y, 80);
      y = secHeader(doc, y, "2", "Mapa Neural do Sistema");
      y = body(doc, y,
        "O diagrama abaixo representa a arquitetura funcional completa do sistema, desde os pontos de entrada " +
        "do usuário até as fontes de dados, passando pelo Orquestrador IA, Pipeline RAG, Quantum Perceptron " +
        "e o loop de aprendizado contínuo."
      );
      y += 4;
      y = drawNeuralMap(doc, y);
      y += 4;
      y = body(doc, y,
        "Fluxo: Entrada -> Orquestrador (classificacao de complexidade) -> Pipeline RAG (pgvector) -> " +
        "Quantum Perceptron (6 eixos) -> MHA v4 (4 cabecas) -> Anti-Alucinacao -> Resposta. " +
        "Loop lateral: Auto-Learn Cron -> Feedback A/B -> Queue Worker -> ajuste de pesos."
      );
      y += 8;

      // ══════ SECTION 3: QUANTUM CIRCUIT ARCHITECTURE ══════
      doc.addPage(); y = MT;
      y = secHeader(doc, y, "3", "Arquitetura Quantica (PQC)");
      y = body(doc, y,
        "A arquitetura quantica foi concebida por Ericson Piccoli (linkedin.com/in/elpgreen) e implementa " +
        "um Parameterized Quantum Circuit (PQC) como nucleo do classificador semantico juridico."
      );
      y += 6;

      y = subSec(doc, y, "3.1", "Rotation Gates (RX, RY, RZ)");
      y = body(doc, y,
        "Portas de rotacao parametrizadas nos eixos X, Y e Z do espaco de Bloch. Angulos treinaveis " +
        "via gradient descent para representacoes continuas dos vetores semanticos juridicos."
      );
      y += 4;
      y = subSec(doc, y, "3.2", "CNOT Entanglement Layer");
      y = body(doc, y,
        "Emaranhamento quantico via CNOT em topologia linear e circular. Correlacoes nao-classicas " +
        "entre features juridicas capturam relacoes semanticas impossiveis em modelos classicos."
      );
      y += 4;
      y = subSec(doc, y, "3.3", "Von Neumann Entropy");
      y = body(doc, y,
        "S(rho) = -Tr(rho*log(rho)). Mede o grau de emaranhamento entre qubits. Valores altos indicam " +
        "forte correlacao entre dimensoes semanticas para classificacao multi-categoria."
      );
      y += 4;
      y = subSec(doc, y, "3.4", "Parameter-Shift Rule");
      y = body(doc, y,
        "Gradientes quanticos analiticos: df/dtheta = [f(theta+pi/2) - f(theta-pi/2)] / 2. Treinamento " +
        "eficiente dos parametros das rotation gates sem backpropagation classica no circuito."
      );
      y += 4;
      y = subSec(doc, y, "3.5", "Amplitude Encoding + Hadamard Gate");
      y = body(doc, y,
        "Codificacao de amplitude com Hadamard para representacao continua no espaco de Hilbert. " +
        "Embeddings (1536-dim) mapeados para amplitudes de n qubits -- processamento exponencialmente compacto."
      );
      y += 4;
      y = subSec(doc, y, "3.6", "Multi-Class Cross-Entropy Loss + Adam Optimizer");
      y = body(doc, y,
        "Loss para classificacao juridica (penal, civil, trabalhista, tributario). Integracao hibrida " +
        "com Adam (lr=0.001, beta1=0.9, beta2=0.999) sobre parametros classicos e quanticos simultaneamente."
      );
      y += 4;
      y = subSec(doc, y, "3.7", "Doc->Neural Feedback Loop");
      y = body(doc, y,
        "Retroalimentacao continua: documentos avaliados -> feedback A/B -> score propagado -> ajuste " +
        "de pesos quanticos via Parameter-Shift Rule -> persistencia em neural_specializations. " +
        "Melhoria continua sem intervencao manual."
      );
      y += 8;

      // PQC Diagram
      y = pgBreak(doc, y, 60);
      doc.setFontSize(9); doc.setFont("times", "bold");
      doc.text("DIAGRAMA DO CIRCUITO QUANTICO PARAMETRIZADO (PQC)", ML, y); y += 6;

      const qY = y;
      const nQubits = 4, wireLen = 120, wireSpacing = 12, gateW = 8;
      for (let q = 0; q < nQubits; q++) {
        const wy = qY + q * wireSpacing;
        doc.setFontSize(8); doc.setFont("times", "bold");
        doc.text(`|q${q}>`, ML, wy + 1);
        doc.setDrawColor(150); doc.setLineWidth(0.3);
        doc.line(ML + 10, wy, ML + 10 + wireLen, wy);
      }

      const gatesDef = [
        { x: 20, qs: [0,1,2,3], t: "H" }, { x: 35, qs: [0], t: "RX" }, { x: 35, qs: [1], t: "RY" },
        { x: 35, qs: [2], t: "RZ" }, { x: 35, qs: [3], t: "RX" },
        { x: 52, qs: [0,1], t: "CNOT" }, { x: 52, qs: [2,3], t: "CNOT" }, { x: 65, qs: [1,2], t: "CNOT" },
        { x: 78, qs: [0], t: "RY" }, { x: 78, qs: [1], t: "RX" }, { x: 78, qs: [2], t: "RY" }, { x: 78, qs: [3], t: "RZ" },
        { x: 95, qs: [0,1,2,3], t: "M" },
      ];
      gatesDef.forEach(gate => {
        gate.qs.forEach(q => {
          const gx = ML + 10 + gate.x, gy = qY + q * wireSpacing;
          if (gate.t === "CNOT" && q === gate.qs[0]) {
            doc.setFillColor(0, 0, 0); doc.circle(gx, gy, 1.2, "F");
            const ty = qY + gate.qs[1] * wireSpacing;
            doc.setDrawColor(0); doc.setLineWidth(0.4);
            doc.line(gx, gy, gx, ty);
            doc.circle(gx, ty, 2.5, "S");
            doc.line(gx-2.5, ty, gx+2.5, ty); doc.line(gx, ty-2.5, gx, ty+2.5);
          } else if (gate.t !== "CNOT") {
            const isH = gate.t === "H", isM = gate.t === "M";
            doc.setFillColor(isH?220:isM?240:255, isH?235:isM?230:245, isH?255:isM?220:230);
            doc.setDrawColor(100); doc.setLineWidth(0.3);
            doc.rect(gx-gateW/2, gy-4, gateW, 8, "FD");
            doc.setFontSize(6); doc.setFont("times","bold"); doc.setTextColor(40);
            doc.text(gate.t, gx, gy+1.5, { align:"center" }); doc.setTextColor(0);
          }
        });
      });
      y = qY + nQubits * wireSpacing + 8;
      doc.setFontSize(7); doc.setFont("times","italic"); doc.setTextColor(100);
      doc.text("H = Hadamard | RX/RY/RZ = Rotation Gates (theta trainable) | CNOT = Entanglement | M = Measurement", ML+10, y);
      doc.setTextColor(0);
      y += 10;

      // ══════ SECTION 4: SOURCES (BAR CHART) ══════
      y = pgBreak(doc, y, 20 + topSources.length * 7);
      y = secHeader(doc, y, "4", "Distribuicao de Fontes de Dados");
      y = body(doc, y,
        "Distribuicao dos embeddings vetoriais por fonte de origem, ordenada por volume."
      );
      y += 4;
      y = drawBarChart(doc, y, topSources.slice(0, 12), "Embeddings por Fonte (Top 12)");
      y += 4;

      // Table with full data
      const colW = [90, 35, 35];
      y = pgBreak(doc, y, 10 + topSources.length * 6);
      y = tblRow(doc, y, ["FONTE", "REGISTROS", "% TOTAL"], colW, true);
      topSources.forEach(([source, count]) => {
        y = pgBreak(doc, y, 8);
        const pct = totalEmbeddings ? ((count / totalEmbeddings) * 100).toFixed(1) + "%" : "—";
        y = tblRow(doc, y, [source, count.toLocaleString(), pct], colW);
      });
      y += 8;

      // ══════ SECTION 5: FEEDBACK PIE ══════
      y = pgBreak(doc, y, 70);
      y = secHeader(doc, y, "5", "Analise de Feedback (A/B Testing)");
      y = body(doc, y,
        "O Quantum Perceptron utiliza teste A/B continuo. Feedback binario (1.0 = positivo, 0.0 = negativo) " +
        "ajusta pesos via backpropagation simplificada."
      );
      y += 4;
      y = drawPieChart(doc, y, [
        { label: "Positivo", value: positiveCount, color: [80, 180, 80] },
        { label: "Negativo", value: negativeCount, color: [220, 80, 80] },
        { label: "Neutro", value: neutralCount, color: [180, 180, 180] },
      ], "Distribuição de Feedback");
      y += 4;
      y = bullet(doc, y, "Total", `${feedbackItems.length}`);
      y = bullet(doc, y, "Taxa de Aprovacao", `${feedbackItems.length ? Math.round((positiveCount / feedbackItems.length) * 100) : 0}%`);
      y += 8;

      // ══════ SECTION 6: AI PROVIDERS (BAR CHART) ══════
      y = pgBreak(doc, y, 50);
      y = secHeader(doc, y, "6", "Metricas de Provedores de IA");
      y = body(doc, y, "Performance dos provedores de IA nas ultimas 200 interacoes monitoradas.");
      y += 4;

      const providerData: [string, number][] = Array.from(providerMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => [name, data.total]);
      y = drawBarChart(doc, y, providerData, "Interações por Provedor");
      y += 4;

      // Provider table
      const pColW = [50, 30, 30, 30, 20];
      y = pgBreak(doc, y, 10 + providerMap.size * 6);
      y = tblRow(doc, y, ["PROVEDOR", "TOTAL", "SUCESSO", "LATENCIA (ms)", "TAXA"], pColW, true);
      Array.from(providerMap.entries()).sort((a, b) => b[1].total - a[1].total).forEach(([name, data]) => {
        y = pgBreak(doc, y, 8);
        const rate = data.total ? Math.round((data.success / data.total) * 100) + "%" : "—";
        y = tblRow(doc, y, [name, String(data.total), String(data.success), String(data.avgMs), rate], pColW);
      });
      y += 8;

      // ══════ SECTION 7: COMPLEXITY PIE ══════
      y = pgBreak(doc, y, 70);
      y = secHeader(doc, y, "7", "Distribuicao por Complexidade");
      y = body(doc, y, "Classificacao das consultas por nivel de complexidade determinada pelo Orquestrador IA.");
      y += 4;

      const complexColors: Record<string, [number, number, number]> = {
        simple: [100, 200, 100], medium: [200, 180, 60], complex: [200, 100, 60], unknown: [180, 180, 180],
      };
      const complexSegments = Array.from(complexityMap.entries()).map(([label, value]) => ({
        label, value, color: complexColors[label] || [150, 150, 150],
      }));
      y = drawPieChart(doc, y, complexSegments, "Complexidade das Consultas");
      y += 8;

      // ══════ SECTION 8: QUANTUM WEIGHTS ══════
      if (categories.length > 0) {
        y = pgBreak(doc, y, 30 + categories.length * 6);
        y = secHeader(doc, y, "8", "Pesos Quanticos por Categoria Juridica");
        y = body(doc, y,
          "Coeficientes do Quantum Perceptron: Semantica, Keyword, Autoridade, Recencia, Jurisprudencial, Profundidade."
        );
        y += 4;
        const qW = [40, 20, 20, 20, 20, 20, 20];
        y = tblRow(doc, y, ["CATEGORIA", "Sem", "Kw", "Auth", "Rec", "Jur", "Dep"], qW, true);
        categories.forEach(cat => {
          y = pgBreak(doc, y, 8);
          const vals = cat.weights.map(w => (w >= 0 ? "+" : "") + w.toFixed(2));
          y = tblRow(doc, y, [cat.name, ...vals], qW);
        });
        y += 8;
      }

      // ══════ SECTION 9: SPECIALIZATIONS ══════
      if (specs.length > 0) {
        y = pgBreak(doc, y, 20 + specs.length * 6);
        y = secHeader(doc, y, "9", "Especializacoes Treinadas");
        y = body(doc, y, "Modelos fine-tuned por area juridica. Status: [OK] completed, [..] training, [  ] pending.");
        y += 4;
        const sW = [60, 35, 30, 35];
        y = tblRow(doc, y, ["NOME", "CATEGORIA", "ACURÁCIA", "STATUS"], sW, true);
        specs.forEach((spec: any) => {
          y = pgBreak(doc, y, 8);
          const st = spec.training_status === "completed" ? "[OK] Completo" : spec.training_status === "training" ? "[..] Treinando" : "[  ] Pendente";
          y = tblRow(doc, y, [spec.name, spec.category, ((spec.accuracy_score || 0) * 100).toFixed(1) + "%", st], sW);
        });
        y += 8;
      }

      // ══════ SECTION 10: ARCHITECTURE DETAIL ══════
      y = pgBreak(doc, y, 80);
      y = secHeader(doc, y, "10", "Arquitetura Tecnica Detalhada");

      const archSteps = [
        ["Camada de Entrada", "Chat IA, Pesquisa, Geracao de Documentos, Legislacao Federal"],
        ["Orquestrador IA", "Classifica complexidade (simple/medium/complex), seleciona motor neural (Alpha, Beta, Delta)"],
        ["Pipeline RAG v4", "Retrieval-Augmented Generation com pgvector (cosseno, threshold 0.75)"],
        ["Multi-Head Attention v4", "6 cabecas: semantica, keyword, autoridade, recencia, jurisdicao, profundidade"],
        ["Quantum Perceptron", "Classificacao multi-dimensional, pesos ajustaveis, decaimento exponencial (half-life 3 anos)"],
        ["Cross-Encoder", "Reordenamento contextual pos-retrieval para precisao final"],
        ["Anti-Alucinacao", "Validacao cruzada, score minimo, fallback para fontes primarias"],
        ["Fontes (20+)", "DataJud, STF BigQuery, Senado API, CourtListener, Legislacao Federal, OAB, Camara, LexML"],
        ["Cron Jobs (5)", "auto-ingestion, auto-evolution, neural-auto-learn, queue-worker, embeddings"],
        ["Cache Inteligente", "api_cache + query_embedding_cache com TTL e cleanup automatico"],
      ];
      archSteps.forEach(([label, desc]) => {
        y = pgBreak(doc, y, 14);
        doc.setFontSize(10); doc.setFont("times", "bold");
        doc.text(`> ${label}`, ML + 5, y); y += 5;
        y = body(doc, y, desc, 10); y += 2;
      });
      y += 6;

      // ══════ SECTION 11: CONCLUSIONS ══════
      y = pgBreak(doc, y, 50);
      y = secHeader(doc, y, "11", "Consideracoes Finais");
      y = body(doc, y,
        `O sistema opera com ${totalEmbeddings.toLocaleString()} embeddings em ${topSources.length} fontes, ` +
        `taxa de aprendizado de ${learningRate}%, ${specs.filter((s: any) => s.is_active).length} especializacoes ativas ` +
        `e ${metrics.length} interacoes de IA recentes. O pipeline Quantum Perceptron + MHA v4 + Cross-Encoder ` +
        `garante classificacao semantica de alta precisao com ajuste continuo via feedback A/B e 5 cron jobs autonomos.`
      );
      y += 6;
      y = body(doc, y,
        "Relatorio gerado automaticamente pelo modulo NeuralPDFReport. " +
        "Os dados refletem o estado do sistema no momento da emissao."
      );

      // Signatures
      y = pgBreak(doc, y, 50); y += 15;
      doc.setDrawColor(0); doc.setLineWidth(0.3);
      doc.line(ML, y, ML + 60, y); y += 5;
      doc.setFontSize(10); doc.setFont("times", "bold");
      doc.text("Ericson Piccoli", ML, y); y += 5;
      doc.setFont("times", "normal"); doc.setFontSize(9);
      doc.text("Criador & Arquiteto do Sistema", ML, y); y += 4;
      doc.setFontSize(8); doc.setFont("times", "italic"); doc.setTextColor(100);
      doc.text("linkedin.com/in/elpgreen", ML, y);
      doc.setTextColor(0);
      let sy = y - 14;
      doc.line(ML + 100, sy, ML + CW, sy); sy += 5;
      doc.setFontSize(10); doc.setFont("times", "bold");
      doc.text("[Nome do Advogado]", ML + 100, sy); sy += 5;
      doc.setFont("times", "normal"); doc.setFontSize(9);
      doc.text("Advogado / Diretor Juridico -- [OAB]", ML + 100, sy);

      // Page numbers
      const total = doc.getNumberOfPages();
      for (let i = 2; i <= total; i++) { doc.setPage(i); pageNum(doc, i - 1, total - 1); }

      doc.setProperties({
        title: "Relatorio Tecnico - Rede Neural Conexao v11",
        subject: "Relatorio de Engenharia de IA -- Quantum Deep Learning",
        author: "Ericson Piccoli (Criador & Arquiteto) / ELP Green Technology",
        keywords: "quantum computing, deep learning, NLP juridico, RAG, embeddings, pgvector",
        creator: "Rede Neural Conexao -- NeuralPDFReport Module",
      });

      doc.save(`RT-NEURAL-${now.toISOString().split("T")[0]}.pdf`);
      toast({ title: "Relatorio tecnico gerado!", description: "Documento de engenharia completo exportado." });
    } catch (error) {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button onClick={generateReport} disabled={generating} variant="outline" size="sm">
      {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
      Exportar Relatório PDF
    </Button>
  );
}
