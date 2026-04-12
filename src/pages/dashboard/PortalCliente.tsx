import { useState, useEffect, Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText, MessageSquare, Calendar, Bell, Clock, Scale,
  CheckCircle2, AlertTriangle, Loader2, Eye, Download, ArrowRight,
  Briefcase, Shield, Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// OrionBackground3D removed

interface ProcessoResumo {
  id: string;
  numero_processo: string | null;
  tipo: string | null;
  status: string | null;
  ultima_movimentacao: string | null;
  created_at: string;
}

interface DocumentoCompartilhado {
  id: string;
  title: string;
  document_type: string | null;
  created_at: string;
  status: string | null;
}

interface ConsultaAgendada {
  id: string;
  data_hora: string;
  tipo: string;
  status: string;
  notas: string | null;
}

const statusConfig: Record<string, { color: string; glow: string; label: string }> = {
  ativo: { color: "#22c55e", glow: "0 0 12px #22c55e40", label: "Ativo" },
  em_andamento: { color: "#3B82F6", glow: "0 0 12px #3B82F640", label: "Em Andamento" },
  arquivado: { color: "#6b7280", glow: "none", label: "Arquivado" },
  encerrado: { color: "#6b7280", glow: "none", label: "Encerrado" },
  suspenso: { color: "#f59e0b", glow: "0 0 12px #f59e0b40", label: "Suspenso" },
  pendente: { color: "#D4AF37", glow: "0 0 12px #D4AF3740", label: "Pendente" },
};

export default function PortalCliente() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoResumo[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoCompartilhado[]>([]);
  const [consultas, setConsultas] = useState<ConsultaAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, procRes, docsRes, consultasRes] = await Promise.all([
        supabase.from("client_profiles").select("id, nome").eq("user_id", user.id).maybeSingle(),
        supabase.from("processos").select("id, numero_processo, tipo, status, ultima_movimentacao, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("documents").select("id, title, document_type, created_at, status")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("consultas").select("id, data_hora, tipo, status, notas")
          .eq("cliente_id", user.id).order("data_hora", { ascending: false }).limit(5),
      ]);
      setClientName(profileRes.data?.nome || user.email?.split("@")[0] || "Cliente");
      setProcessos((procRes.data as any[]) || []);
      setDocumentos((docsRes.data as any[]) || []);
      setConsultas((consultasRes.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const activeProcesses = processos.filter(p => p.status === "ativo" || p.status === "em_andamento").length;
  const pendingConsultas = consultas.filter(c => c.status === "agendada" || c.status === "confirmada").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 3D Background */}
      <Suspense fallback={null}>
        
      </Suspense>

      <div className="relative z-10 space-y-6 p-1">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl p-6"
          style={{
            background: "linear-gradient(135deg, #3B82F60.08), rgba(212,175,55,0.05), rgba(10,10,15,0.9))",
            border: "1px solid #3B82F60.15)",
            boxShadow: "0 0 30px #3B82F60.05), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/40 to-transparent" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono tracking-[0.3em] uppercase mb-1" style={{ color: "#3B82F60.5)" }}>
                ■ PORTAL DO CLIENTE
              </p>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#3B82F6", textShadow: "0 0 20px #3B82F60.3)" }}>
                Olá, {clientName}
              </h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Acompanhe seus processos, documentos e consultas em tempo real
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                style={{ background: "linear-gradient(135deg, #3B82F6, #0099CC)", color: "#000" }}
                onClick={() => navigate("/dashboard/chat-ao-vivo")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat com Advogado
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                onClick={() => navigate("/dashboard/consultas")}
              >
                <Calendar className="h-3.5 w-3.5" />
                Agendar Consulta
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Scale, label: "Processos Ativos", value: activeProcesses, color: "#3B82F6" },
            { icon: FileText, label: "Documentos", value: documentos.length, color: "#D4AF37" },
            { icon: Calendar, label: "Consultas Agendadas", value: pendingConsultas, color: "#22c55e" },
            { icon: Shield, label: "Status Geral", value: activeProcesses > 0 ? "Em acompanhamento" : "Sem pendências", color: "#8B5CF6", isText: true },
          ].map((stat, i) => (
            <Card key={i} className="relative overflow-hidden border-0"
              style={{ backgroundColor: "rgba(10,10,15,0.7)", border: `1px solid ${stat.color}15`, boxShadow: `0 0 15px ${stat.color}05` }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stat.color}30, transparent)` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4" style={{ color: stat.color, filter: `drop-shadow(0 0 4px ${stat.color}60)` }} />
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `${stat.color}80` }}>{stat.label}</span>
                </div>
                <p className={`font-bold font-mono ${(stat as any).isText ? "text-sm" : "text-2xl"}`}
                  style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}30` }}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="processos" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/30 p-1">
            <TabsTrigger value="processos" className="text-xs gap-1.5 data-[state=active]:bg-[#3B82F6]/10 data-[state=active]:text-[#3B82F6]">
              <Scale className="h-3.5 w-3.5" /> Processos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs gap-1.5 data-[state=active]:bg-[#D4AF37]/10 data-[state=active]:text-[#D4AF37]">
              <FileText className="h-3.5 w-3.5" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="consultas" className="text-xs gap-1.5 data-[state=active]:bg-[#22c55e]/10 data-[state=active]:text-[#22c55e]">
              <Calendar className="h-3.5 w-3.5" /> Consultas
            </TabsTrigger>
          </TabsList>

          {/* Processos Tab */}
          <TabsContent value="processos" className="space-y-3">
            {processos.length === 0 ? (
              <Card className="border-border/20" style={{ backgroundColor: "rgba(10,10,15,0.6)" }}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Scale className="h-12 w-12 mb-4" style={{ color: "#3B82F60.2)" }} />
                  <p className="text-sm text-muted-foreground">Nenhum processo encontrado</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Seus processos aparecerão aqui quando cadastrados</p>
                </CardContent>
              </Card>
            ) : (
              processos.map((proc) => {
                const sc = statusConfig[proc.status || "pendente"] || statusConfig.pendente;
                return (
                  <Card key={proc.id} className="relative overflow-hidden border-0 hover:scale-[1.005] transition-transform cursor-pointer"
                    style={{ backgroundColor: "rgba(10,10,15,0.7)", border: `1px solid ${sc.color}20` }}
                    onClick={() => navigate("/dashboard/meus-processos")}>
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: sc.color, boxShadow: sc.glow }} />
                    <CardContent className="p-4 pl-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold" style={{ color: sc.color }}>
                              {proc.numero_processo || "Sem número"}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0"
                              style={{ borderColor: `${sc.color}40`, color: sc.color }}>
                              {sc.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{proc.tipo || "Processo"}</p>
                          {proc.ultima_movimentacao && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Última movimentação: {proc.ultima_movimentacao}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground/50 font-mono">
                            {format(new Date(proc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <ArrowRight className="h-4 w-4 mt-2 ml-auto" style={{ color: `${sc.color}50` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="space-y-3">
            {documentos.length === 0 ? (
              <Card className="border-border/20" style={{ backgroundColor: "rgba(10,10,15,0.6)" }}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 mb-4" style={{ color: "rgba(212,175,55,0.2)" }} />
                  <p className="text-sm text-muted-foreground">Nenhum documento compartilhado</p>
                </CardContent>
              </Card>
            ) : (
              documentos.map((doc) => (
                <Card key={doc.id} className="relative overflow-hidden border-0 hover:scale-[1.005] transition-transform cursor-pointer"
                  style={{ backgroundColor: "rgba(10,10,15,0.7)", border: "1px solid rgba(212,175,55,0.15)" }}
                  onClick={() => navigate(`/dashboard/documentos`)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.2)" }}>
                      <FileText className="h-5 w-5" style={{ color: "#D4AF37" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.document_type || "Documento"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground/50 font-mono">
                        {format(new Date(doc.created_at), "dd/MM/yy")}
                      </p>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 mt-1">
                        <Eye className="h-3.5 w-3.5 text-[#D4AF37]/60" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Consultas Tab */}
          <TabsContent value="consultas" className="space-y-3">
            {consultas.length === 0 ? (
              <Card className="border-border/20" style={{ backgroundColor: "rgba(10,10,15,0.6)" }}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 mb-4" style={{ color: "rgba(34,197,94,0.2)" }} />
                  <p className="text-sm text-muted-foreground">Nenhuma consulta agendada</p>
                  <Button
                    size="sm"
                    className="mt-4 text-xs gap-1.5"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }}
                    onClick={() => navigate("/dashboard/consultas")}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Agendar Consulta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              consultas.map((c) => {
                const isPast = new Date(c.data_hora) < new Date();
                const statusColor = c.status === "concluida" ? "#22c55e" : c.status === "cancelada" ? "#ef4444" : "#3B82F6";
                return (
                  <Card key={c.id} className="relative overflow-hidden border-0"
                    style={{ backgroundColor: "rgba(10,10,15,0.7)", border: `1px solid ${statusColor}15`, opacity: isPast ? 0.7 : 1 }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${statusColor}15, ${statusColor}05)`, border: `1px solid ${statusColor}25` }}>
                        <Calendar className="h-5 w-5" style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{c.tipo || "Consulta"}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(c.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px]"
                        style={{ borderColor: `${statusColor}40`, color: statusColor }}>
                        {c.status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
