import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, PenTool, Calendar, TrendingUp, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AnalyticsData {
  totalDocumentos: number;
  documentosPorTipo: { name: string; value: number }[];
  assinaturasPendentes: number;
  assinaturasCompletas: number;
  consultasPendentes: number;
  consultasConfirmadas: number;
  documentosPorMes: { mes: string; count: number }[];
}

const PIE_COLORS = [
  "hsl(30, 85%, 52%)",
  "hsl(25, 80%, 60%)",
  "hsl(210, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(280, 60%, 55%)",
];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setLoading(true);

      const [docsRes, envelopesRes, consultasRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, document_type, created_at")
          .eq("user_id", user.id),
        supabase
          .from("signature_envelopes")
          .select("id, status, created_at")
          .eq("user_id", user.id),
        supabase
          .from("consultas")
          .select("id, status, data_hora")
          .order("created_at", { ascending: false }),
      ]);

      const docs = docsRes.data || [];
      const envelopes = envelopesRes.data || [];
      const consultas = consultasRes.data || [];

      // Documents by type
      const tipoCount: Record<string, number> = {};
      docs.forEach((d) => {
        const tipo = d.document_type || "outro";
        tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
      });
      const documentosPorTipo = Object.entries(tipoCount)
        .map(([name, value]) => ({ name: formatTipo(name), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Documents by month (last 6 months)
      const now = new Date();
      const documentosPorMes: { mes: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mesStr = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const count = docs.filter((doc) => {
          const docDate = new Date(doc.created_at);
          return docDate.getMonth() === d.getMonth() && docDate.getFullYear() === d.getFullYear();
        }).length;
        documentosPorMes.push({ mes: mesStr, count });
      }

      // Signatures
      const assinaturasPendentes = envelopes.filter((e) => e.status === "pendente" || e.status === "parcialmente_assinado").length;
      const assinaturasCompletas = envelopes.filter((e) => e.status === "assinado").length;

      // Consultations
      const consultasPendentes = consultas.filter((c) => c.status === "pendente").length;
      const consultasConfirmadas = consultas.filter((c) => c.status === "confirmada" || c.status === "paga").length;

      setData({
        totalDocumentos: docs.length,
        documentosPorTipo,
        assinaturasPendentes,
        assinaturasCompletas,
        consultasPendentes,
        consultasConfirmadas,
        documentosPorMes,
      });
      setLoading(false);
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    { label: "Documentos Gerados", value: data.totalDocumentos, icon: FileText, accent: "text-primary" },
    { label: "Assinaturas Pendentes", value: data.assinaturasPendentes, icon: Clock, accent: "text-yellow-400" },
    { label: "Assinaturas Completas", value: data.assinaturasCompletas, icon: PenTool, accent: "text-green-400" },
    { label: "Consultas Agendadas", value: data.consultasPendentes + data.consultasConfirmadas, icon: Calendar, accent: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={card.label}
            className="bg-card border border-border p-5 hover-gold-glow transition-all animate-fade-in-up"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`h-10 w-10 border border-border flex items-center justify-center ${card.accent}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className={`text-2xl font-serif ${card.accent}`}>{card.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar chart - Documents per month */}
        <div className="bg-card border border-border p-5">
          <h3 className="text-sm font-serif text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Documentos por Mês
          </h3>
          {data.documentosPorMes.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.documentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 11,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="count" fill="hsl(30, 85%, 52%)" name="Documentos" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
              Nenhum documento gerado ainda
            </div>
          )}
        </div>

        {/* Pie chart - Documents by type */}
        <div className="bg-card border border-border p-5">
          <h3 className="text-sm font-serif text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documentos por Tipo
          </h3>
          {data.documentosPorTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.documentosPorTipo}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  style={{ fontSize: 9 }}
                >
                  {data.documentosPorTipo.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 11,
                    color: "hsl(var(--foreground))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
              Nenhum documento gerado ainda
            </div>
          )}
        </div>
      </div>

      {/* Signatures summary */}
      <div className="bg-card border border-border p-5">
        <h3 className="text-sm font-serif text-foreground mb-4 flex items-center gap-2">
          <PenTool className="h-4 w-4 text-primary" />
          Resumo de Assinaturas Digitais
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 border border-border">
            <p className="text-xl font-serif text-yellow-400">{data.assinaturasPendentes}</p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Pendentes</p>
          </div>
          <div className="text-center p-3 border border-border">
            <p className="text-xl font-serif text-green-400">{data.assinaturasCompletas}</p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Assinados</p>
          </div>
          <div className="text-center p-3 border border-border">
            <p className="text-xl font-serif text-foreground">{data.assinaturasPendentes + data.assinaturasCompletas}</p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Total</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTipo(tipo: string): string {
  const map: Record<string, string> = {
    "peticao-inicial": "Petição Inicial",
    "contestacao": "Contestação",
    "apelacao": "Apelação",
    "agravo-instrumento": "Agravo",
    "contrato-servicos": "Contrato Serviços",
    "contrato-honorarios": "Contrato Honorários",
    "contrato-locacao": "Locação",
    "procuracao-ad-judicia": "Procuração",
    "procuracao-ad-negotia": "Procuração Neg.",
    "notificacao-extrajudicial": "Notificação",
    "acordo-extrajudicial": "Acordo",
    "parecer-juridico": "Parecer",
    "cumprimento-sentenca": "Cumpr. Sentença",
    "embargos-declaracao": "Embargos",
    "impugnacao": "Impugnação",
    "manifestacao-processual": "Manifestação",
    "acordo-trabalhista": "Acordo Trab.",
    "nda": "NDA",
    "acordo-familia": "Acordo Família",
    "declaracao-termo": "Declaração",
  };
  return map[tipo] || tipo.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
