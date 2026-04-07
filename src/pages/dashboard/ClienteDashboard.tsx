import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useNavigate } from "react-router-dom";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import {
  MessageSquare,
  FolderOpen,
  Calendar,
  CreditCard,
  ChevronRight,
  FileText,
  Clock,
  Bell,
  Star,
  Users,
  Scale,
  PenTool,
  Upload,
  Download,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
  HelpCircle,
  Bot,
  Wallet,
  ShoppingBag,
  Store,
  Brain,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvaliacaoForm } from "@/components/dashboard/AvaliacaoForm";
import { ClientUploadDialog } from "@/components/dashboard/clients/ClientUploadDialog";
import { ProcessStatusTracker } from "@/components/dashboard/ProcessStatusTracker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { LawyerSelectionCard } from "@/components/dashboard/clients/LawyerSelectionCard";

interface ClientDocument {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  categoria: string | null;
  notas: string | null;
  created_at: string;
}

interface SharedFolder {
  id: string;
  name: string;
  color: string | null;
  documentCount: number;
}

interface PendingSignature {
  id: string;
  document_title: string;
  status: string;
  signature_method: string;
  created_at: string;
  clicksign_envelope_id: string | null;
  signers: Array<{ name: string; email: string; status?: string }>;
}

const quickActions = [
  {
    title: "Falar com Suporte",
    desc: "Chat ao vivo com ORION IA",
    icon: Users,
    path: "/dashboard/chat-ao-vivo",
    highlight: true,
  },
  {
    title: "Orion IA",
    desc: "Consulte o Orion — assistente com voz e visão",
    icon: Bot,
    path: "/consulta",
  },
  {
    title: "Meus Processos",
    desc: "Acompanhe o andamento dos seus processos",
    icon: Scale,
    path: "/dashboard/meus-processos",
  },
  {
    title: "Meus Documentos",
    desc: "Acesse contratos e documentos compartilhados",
    icon: FolderOpen,
    path: "/dashboard/documentos",
  },
  {
    title: "Marketplace",
    desc: "Explore produtos e serviços digitais",
    icon: Star,
    path: "/dashboard/marketplace",
  },
  {
    title: "Agendar Consulta",
    desc: "Marque uma consulta presencial ou online",
    icon: Calendar,
    path: "/dashboard/consultas",
  },
  {
    title: "Pagamentos",
    desc: "Gerencie honorários e faturas",
    icon: CreditCard,
    path: "/dashboard/pagamentos",
  },
  {
    title: "Meu Plano",
    desc: "Veja seu plano e benefícios",
    icon: Star,
    path: "/dashboard/plano",
  },
  {
    title: "Meu Perfil",
    desc: "Atualize seus dados pessoais",
    icon: Users,
    path: "/dashboard/perfil-cliente",
  },
  {
    title: "Notificações",
    desc: "Acompanhe atualizações do seu caso",
    icon: Bell,
    path: "/dashboard/notificacoes",
  },
  {
    title: "Central de Ajuda",
    desc: "Instruções e perguntas frequentes",
    icon: HelpCircle,
    path: "/dashboard/central-ajuda",
  },
];

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente";
  const [hasReview, setHasReview] = useState<boolean | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [clientProfile, setClientProfile] = useState<{ id: string; advogado_id?: string | null } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [myDocuments, setMyDocuments] = useState<ClientDocument[]>([]);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [resendingLink, setResendingLink] = useState<string | null>(null);
  const [signingNow, setSigningNow] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [latestNotif, setLatestNotif] = useState<{ titulo: string; descricao: string | null } | null>(null);
  const [receivedDocs, setReceivedDocs] = useState<Array<{ id: string; title: string; document_type: string; created_at: string; document_id: string; signatureStatus: string | null }>>([]);
  const [myProcessos, setMyProcessos] = useState<any[]>([]);
  const [processoAndamentos, setProcessoAndamentos] = useState<Record<string, any[]>>({});
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [myConsultas, setMyConsultas] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [iaConversationCount, setIaConversationCount] = useState(0);

  const loadClientData = useCallback(async () => {
      if (!user) return;
      
      // 🧠 Neural: registra acesso do cliente ao dashboard
      logNeural({
        interaction_type: "crm_client_event",
        input_text: "Cliente acessou dashboard",
        quality_score: 0.6,
        user_id: user.id,
        metadata: { source: "cliente_dashboard_view" },
      });
      
      // Buscar perfil do cliente
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        setClientProfile(profile);
        
        // Buscar documentos do cliente
        const { data: docs } = await supabase
          .from("client_documents")
          .select("*")
          .eq("client_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);
        
        setMyDocuments((docs as ClientDocument[]) || []);
      }
      
      // Buscar documentos compartilhados para encontrar pastas vinculadas
      const { data: sharedDocs } = await supabase
        .from("shared_documents")
        .select(`
          document_id,
          documents (
            id,
            folder_id,
            document_folders (
              id,
              name,
              color
            )
          )
        `)
        .eq("shared_with", user.id);
      
      // Agrupar por pasta
      if (sharedDocs && sharedDocs.length > 0) {
        const folderMap = new Map<string, SharedFolder>();
        
        sharedDocs.forEach((sd: any) => {
          const folder = sd.documents?.document_folders;
          if (folder) {
            const existing = folderMap.get(folder.id);
            if (existing) {
              existing.documentCount++;
            } else {
              folderMap.set(folder.id, {
                id: folder.id,
                name: folder.name,
                color: folder.color,
                documentCount: 1,
              });
            }
          }
        });
        
        setSharedFolders(Array.from(folderMap.values()));
      }
      
      // Buscar documentos pendentes de assinatura (onde o e-mail do cliente é signatário)
      const userEmail = user.email;
      if (userEmail) {
        const { data: allEnvelopes } = await supabase
          .from("signature_envelopes")
          .select("*")
          .in("status", ["pendente", "parcialmente_assinado"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (allEnvelopes) {
          const myPending = allEnvelopes.filter((env: any) => {
            const signersList = env.signers as any[];
            return Array.isArray(signersList) && signersList.some(
              (s: any) => s.email?.toLowerCase() === userEmail.toLowerCase()
            );
          });
          setPendingSignatures(myPending as unknown as PendingSignature[]);
        }
      }

      setLoadingDocs(false);

      // Fetch unread notifications
      const { data: notifs, count: notifCount } = await supabase
        .from("notificacoes")
        .select("titulo, descricao", { count: "exact" })
        .eq("user_id", user.id)
        .eq("lida", false)
        .order("created_at", { ascending: false })
        .limit(1);
      setUnreadNotifs(notifCount || 0);
      setLatestNotif(notifs?.[0] || null);

      // Fetch received documents (shared with client) + signature status
      const { data: sharedDocsList } = await supabase
        .from("shared_documents")
        .select(`
          id,
          created_at,
          document_id,
          documents (
            id,
            title,
            document_type,
            created_at,
            signature_status
          )
        `)
        .eq("shared_with", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (sharedDocsList) {
        const docIds = sharedDocsList.filter((sd: any) => sd.documents).map((sd: any) => sd.document_id);
        
        // Fetch signature envelopes for these docs
        let sigMap = new Map<string, string>();
        if (docIds.length > 0 && user.email) {
          const { data: envelopes } = await supabase
            .from("signature_envelopes")
            .select("*")
            .in("document_id", docIds);
          
          if (envelopes) {
            envelopes.forEach((env: any) => {
              const signersList = env.signers as any[];
              const mySigner = Array.isArray(signersList) && signersList.find(
                (s: any) => s.email?.toLowerCase() === user.email!.toLowerCase()
              );
              if (mySigner && env.document_id) {
                sigMap.set(env.document_id, mySigner.status || "pendente");
              }
            });
          }
        }

        setReceivedDocs(
          sharedDocsList
            .filter((sd: any) => sd.documents)
            .map((sd: any) => ({
              id: sd.id,
              title: sd.documents.title,
              document_type: sd.documents.document_type,
              created_at: sd.created_at,
              document_id: sd.document_id,
              signatureStatus: sigMap.get(sd.document_id) || null,
            }))
        );
      }
      
      // Fetch processos + andamentos
      if (profile) {
        const { data: procs } = await supabase
          .from("processos")
          .select("id, numero_processo, tipo, status, ultima_movimentacao")
          .eq("client_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(3);
        setMyProcessos(procs || []);

        // Fetch andamentos for these processos
        if (procs && procs.length > 0) {
          const procIds = procs.map((p: any) => p.id);
          const { data: andamentos } = await supabase
            .from("andamentos")
            .select("id, tipo, descricao, data_ocorrencia, created_at, processo_id")
            .in("processo_id", procIds)
            .order("data_ocorrencia", { ascending: false })
            .limit(30);
          
          if (andamentos) {
            const grouped: Record<string, any[]> = {};
            andamentos.forEach((a: any) => {
              if (!grouped[a.processo_id]) grouped[a.processo_id] = [];
              grouped[a.processo_id].push(a);
            });
            setProcessoAndamentos(grouped);
          }
        }
      }

      // Fetch consultas
      const { data: consultas } = await supabase
        .from("consultas")
        .select("*")
        .eq("cliente_id", user.id)
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true })
        .limit(5);
      setMyConsultas(consultas || []);

      // Fetch pending invoices count
      if (profile) {
        const { count: invCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("client_profile_id", profile.id)
          .eq("status", "pending");
        setPendingInvoices(invCount || 0);
      }

      // Fetch IA conversations count
      const { count: iaCount } = await supabase
        .from("chat_ia_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setIaConversationCount(iaCount || 0);

      // Verificar avaliação existente
      const { data: review } = await supabase
        .from("avaliacoes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setHasReview(!!review);
  }, [user]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  useRefreshOnFocus(loadClientData);
  useRealtimeNotifications(loadClientData);

  const handleDownloadDoc = async (doc: ClientDocument) => {
    // 🧠 Neural: download pelo cliente = sinal forte de engajamento e utilidade
    logNeural({
      interaction_type: "document_viewed",
      input_text: `Download por cliente: ${doc.file_name}`,
      output_text: doc.categoria || "sem categoria",
      quality_score: 0.85,
      user_id: user?.id,
      metadata: { doc_id: doc.id, categoria: doc.categoria, source: "cliente_dashboard_download" },
    });

    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast({ title: "Erro", description: "Não foi possível baixar o arquivo.", variant: "destructive" });
    }
  };

  const getCategoriaLabel = (cat: string | null) => {
    const labels: Record<string, string> = {
      geral: "Geral",
      documento_pessoal: "Documento Pessoal",
      comprovante: "Comprovante",
      contrato: "Contrato",
      procuracao: "Procuração",
      outros: "Outros",
    };
    return labels[cat || "geral"] || cat;
  };

  const handleResendSignatureLink = async (envelopeId: string) => {
    setResendingLink(envelopeId);
    try {
      const { error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "resend", envelope_id: envelopeId },
      });
      if (error) throw error;
      toast({ 
        title: "Link de assinatura reenviado!", 
        description: "Verifique seu e-mail para o novo link de assinatura." 
      });
    } catch (e: any) {
      toast({ title: "Erro ao reenviar", description: e.message, variant: "destructive" });
    }
    setResendingLink(null);
  };

  const handleSignNow = async (envelopeId: string) => {
    setSigningNow(envelopeId);
    try {
      const { data, error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "get-signing-url", envelope_id: envelopeId },
      });
      if (error) throw error;
      if (data?.signing_url) {
        window.open(data.signing_url, "_blank");
      } else if (data?.needs_resend) {
        toast({ title: "Ação necessária", description: data.error || "Verifique seu e-mail ou peça ao advogado para reenviar a notificação." });
      } else {
        throw new Error(data?.error || "URL de assinatura não disponível");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível obter URL de assinatura.", variant: "destructive" });
    }
    setSigningNow(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden border border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/8 blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/60 mb-1 font-sans">Plataforma ORION</p>
            <h1 className="text-2xl md:text-3xl font-serif text-foreground">
              Olá, <span className="text-gold-shine">{userName}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              Bem-vindo à plataforma ORION. Estamos aqui para ajudar.
            </p>
          </div>
          {/* Quick summary */}
          <div className="flex gap-4">
            {[
              { label: "Processos", value: myProcessos.length, icon: Scale },
              { label: "Mensagens", value: unreadMessages, icon: MessageSquare },
              { label: "Pendentes", value: pendingInvoices, icon: Wallet },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="h-8 w-8 mx-auto mb-1 bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-lg font-serif text-foreground">{s.value}</p>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lawyer Selection — only shown if client has no linked advogado */}
      {clientProfile && !(clientProfile as any).advogado_id && (
        <LawyerSelectionCard
          clientProfileId={clientProfile.id}
          onLinked={() => loadClientData()}
        />
      )}

      {/* Status Banner */}
      <div className="bg-card border border-primary/20 p-5 flex items-center gap-4">
        <div className="h-12 w-12 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          {unreadNotifs > 0 && latestNotif ? (
            <>
              <h2 className="text-sm font-serif text-foreground mb-0.5">
                {latestNotif.titulo}
                {unreadNotifs > 1 && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">+{unreadNotifs - 1}</Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {latestNotif.descricao || "Clique em Notificações para ver detalhes."}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-serif text-foreground mb-0.5">Nenhuma notificação pendente</h2>
              <p className="text-xs text-muted-foreground">
                Você será notificado sobre atualizações em seus processos e documentos.
              </p>
            </>
          )}
        </div>
        {unreadNotifs > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs btn-outline-gold"
            onClick={() => navigate("/dashboard/notificacoes")}
          >
            Ver Todas
          </Button>
        )}
      </div>

      {/* Resumo do Caso */}
      {myProcessos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Status Atual */}
          <div className="bg-card border border-border p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Scale className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-foreground">Status Atual</h3>
                <p className="text-[10px] text-muted-foreground">{myProcessos.length} processo{myProcessos.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {myProcessos.slice(0, 3).map((proc) => {
                const statusLabel: Record<string, string> = {
                  ativo: "Em andamento",
                  em_andamento: "Em andamento",
                  concluido: "Concluído",
                  arquivado: "Arquivado",
                  suspenso: "Suspenso",
                  pendente: "Pendente",
                  aguardando: "Aguardando análise",
                };
                const statusStyle: Record<string, string> = {
                  ativo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                  em_andamento: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                  concluido: "bg-sky-500/15 text-sky-400 border-sky-500/30",
                  arquivado: "bg-muted text-muted-foreground border-border",
                  suspenso: "bg-warning/15 text-warning border-warning/30",
                  pendente: "bg-warning/15 text-warning border-warning/30",
                  aguardando: "bg-primary/15 text-primary border-primary/30",
                };
                return (
                  <button
                    key={proc.id}
                    onClick={() => navigate("/dashboard/meus-processos")}
                    className="w-full flex items-center justify-between gap-2 p-2.5 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {proc.numero_processo || proc.tipo || "Processo"}
                      </p>
                      {proc.tipo && proc.numero_processo && (
                        <p className="text-[10px] text-muted-foreground truncate">{proc.tipo}</p>
                      )}
                    </div>
                    <Badge className={`text-[9px] shrink-0 ${statusStyle[proc.status || "ativo"] || statusStyle.ativo}`}>
                      {statusLabel[proc.status || "ativo"] || proc.status}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-primary hover:text-primary"
              onClick={() => navigate("/dashboard/meus-processos")}
            >
              Ver todos os processos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Card 2: Próximos Prazos */}
          <div className="bg-card border border-border p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-foreground">Próximos Prazos</h3>
                <p className="text-[10px] text-muted-foreground">{myConsultas.length} evento{myConsultas.length !== 1 ? "s" : ""} agendado{myConsultas.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex-1">
              {myConsultas.length > 0 ? (
                <div className="space-y-2">
                  {myConsultas.slice(0, 3).map((c) => {
                    const consultaStatus: Record<string, { label: string; style: string }> = {
                      pendente: { label: "Pendente", style: "bg-warning/15 text-warning border-warning/30" },
                      confirmada: { label: "Confirmado", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                      cancelada: { label: "Cancelado", style: "bg-destructive/15 text-destructive border-destructive/30" },
                      realizada: { label: "Realizada", style: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
                    };
                    const st = consultaStatus[c.status] || consultaStatus.pendente;
                    const tipoLabel: Record<string, string> = {
                      inicial: "Consulta Inicial",
                      retorno: "Retorno",
                      audiencia: "Audiência",
                      reuniao: "Reunião",
                      prazo: "Vencimento de Prazo",
                    };
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate("/dashboard/consultas")}
                        className="w-full flex items-center gap-3 p-2.5 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-center flex-shrink-0 w-10">
                          <p className="text-sm font-bold text-primary leading-none">
                            {new Date(c.data_hora).getDate()}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase">
                            {new Date(c.data_hora).toLocaleDateString("pt-BR", { month: "short" })}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                            {tipoLabel[c.tipo] || c.tipo || "Consulta"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Badge className={`text-[9px] shrink-0 ${st.style}`}>{st.label}</Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground/60">Nenhuma consulta agendada.</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-primary hover:text-primary"
              onClick={() => navigate("/dashboard/consultas")}
            >
              Agendar consulta <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Card 3: Último Andamento */}
          <div className="bg-card border border-border p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-foreground">Último Andamento</h3>
                <p className="text-[10px] text-muted-foreground">Movimentação mais recente</p>
              </div>
            </div>
            <div className="flex-1">
              {(() => {
                const allAnds = Object.values(processoAndamentos).flat();
                const sorted = [...allAnds].sort((a, b) => new Date(b.data_ocorrencia).getTime() - new Date(a.data_ocorrencia).getTime());
                const latest = sorted[0];
                if (!latest) {
                  return (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground/60">Nenhum andamento registrado.</p>
                    </div>
                  );
                }
                const tipoAndamento: Record<string, string> = {
                  peticao: "Entrega de petição",
                  decisao: "Decisão judicial",
                  audiencia: "Audiência realizada",
                  despacho: "Despacho",
                  citacao: "Citação",
                  intimacao: "Intimação",
                  outros: "Atualização",
                };
                return (
                  <button
                    onClick={() => navigate("/dashboard/meus-processos")}
                    className="w-full text-left p-3 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">
                        {tipoAndamento[latest.tipo] || latest.tipo || "Atualização"}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">
                      {latest.descricao}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(latest.data_ocorrencia).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    {/* Show 2nd most recent if available */}
                    {sorted[1] && (
                      <div className="pt-2 border-t border-border/30 mt-2">
                        <p className="text-[10px] text-muted-foreground truncate">
                          Anterior: {sorted[1].descricao}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60">
                          {new Date(sorted[1].data_ocorrencia).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-primary hover:text-primary"
              onClick={() => navigate("/dashboard/meus-processos")}
            >
              Ver histórico completo <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-serif text-foreground">Como Usar a Plataforma</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="chat">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Como falar com o advogado
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Clique em <strong>"Falar com Advogado"</strong> no menu de Acesso Rápido.</p>
              <p>2. Clique no botão <strong>"+"</strong> para iniciar uma nova conversa.</p>
              <p>3. Digite sua mensagem e pressione <strong>Enter</strong> ou clique no botão de enviar.</p>
              <p>4. Aguarde a resposta do ORION IA. Você receberá uma notificação quando ele responder.</p>
              <p className="text-primary/80 italic">Dica: Seja claro e objetivo na sua mensagem para receber uma resposta mais rápida.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ia">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Como usar o assistente IA
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Acesse <strong>"Consulta com IA"</strong> no menu de Acesso Rápido.</p>
              <p>2. Digite sua dúvida jurídica na caixa de mensagem.</p>
              <p>3. O assistente inteligente responderá com base na legislação brasileira.</p>
              <p className="text-primary/80 italic">Atenção: A IA auxilia com informações gerais. Para orientação específica ao seu caso, fale diretamente com o advogado.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="docs">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Como enviar e receber documentos
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Acesse <strong>"Meus Documentos"</strong> no menu.</p>
              <p>2. Para enviar: clique em <strong>"Enviar Documento"</strong> e selecione o arquivo do seu computador.</p>
              <p>3. Documentos recebidos do advogado aparecerão organizados em pastas por categoria (Contratos, Procurações, etc.).</p>
              <p>4. Clique em qualquer documento para visualizar ou baixar.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="signature">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary" />
                Como assinar documentos
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Quando um documento requer sua assinatura, aparecerá na seção <strong>"Documentos Pendentes de Assinatura"</strong>.</p>
              <p>2. Clique em <strong>"Assinar Agora"</strong> para ser redirecionado ao sistema de assinatura.</p>
              <p>3. Após assinar, o documento será atualizado automaticamente com o status <strong>"Assinado"</strong>.</p>
              <p>4. O documento assinado ficará salvo na sua pasta de documentos.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="consultas">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Como agendar consultas
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Acesse <strong>"Agendar Consulta"</strong> no menu.</p>
              <p>2. Escolha o tipo de consulta (presencial ou online).</p>
              <p>3. Selecione a data e horário disponível.</p>
              <p>4. Realize o pagamento conforme os honorários configurados.</p>
              <p>5. Aguarde a confirmação — você receberá uma notificação.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pagamentos">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Como gerenciar pagamentos
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>1. Acesse <strong>"Pagamentos"</strong> no menu de Acesso Rápido.</p>
              <p>2. Visualize faturas pendentes e o histórico de pagamentos.</p>
              <p>3. Clique em uma fatura pendente para realizar o pagamento via cartão ou PIX.</p>
              <p>4. Após o pagamento, o status será atualizado automaticamente.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Pending Signatures */}
      {pendingSignatures.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Documentos Pendentes de Assinatura
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => navigate("/dashboard/assinatura")}
            >
              Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {pendingSignatures.map((sig) => {
              const myStatus = sig.signers?.find(
                (s) => s.email?.toLowerCase() === user?.email?.toLowerCase()
              );
              const iSigned = myStatus?.status === "assinado";

              return (
                <div
                  key={sig.id}
                  className="bg-card border border-primary/20 p-4 hover-gold-glow transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <PenTool className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {sig.document_title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(sig.created_at).toLocaleDateString("pt-BR")} •{" "}
                          {sig.signature_method === "icp-brasil"
                            ? "ICP-Brasil"
                            : sig.signature_method === "gov-br"
                            ? "GOV.BR"
                            : "Eletrônica"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {iSigned ? (
                        <span className="text-[9px] px-2 py-0.5 border border-green-400/30 text-green-400 tracking-wider uppercase flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Você assinou
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 border border-warning/30 text-warning tracking-wider uppercase flex items-center gap-1 animate-pulse">
                          <Clock className="h-3 w-3" />
                          Aguardando sua assinatura
                        </span>
                      )}
                    </div>
                  </div>
                    {!iSigned && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          className="btn-gold text-[10px]"
                          disabled={signingNow === sig.id}
                          onClick={() => handleSignNow(sig.id)}
                        >
                          {signingNow === sig.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3 w-3 mr-1" />
                          )}
                          Assinar Agora
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] btn-outline-gold"
                          disabled={resendingLink === sig.id}
                          onClick={() => handleResendSignatureLink(sig.id)}
                        >
                          {resendingLink === sig.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Reenviar por E-mail
                        </Button>
                      </div>
                    )}
                    {iSigned && (
                      <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Documento assinado com sucesso! Será salvo automaticamente na sua pasta.
                      </p>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" />
          Acesso Rápido
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action, i) => {
            const badgeCount =
              action.title === "Falar com Advogado" ? unreadMessages :
              action.title === "Assinatura Digital" ? pendingSignatures.filter(s => !s.signers?.find(sg => sg.email?.toLowerCase() === user?.email?.toLowerCase() && sg.status === "assinado")).length :
              action.title === "Notificações" ? unreadNotifs :
              action.title === "Meus Processos" ? myProcessos.length :
              action.title === "Consulta com IA" ? 0 :
              action.title === "Agendar Consulta" ? myConsultas.length :
              action.title === "Pagamentos" ? pendingInvoices :
              0;

            return (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className={`relative overflow-hidden border p-4 text-left hover-gold-glow transition-all group animate-fade-in-up ${
                action.highlight
                  ? "border-primary/30 bg-gradient-to-br from-card to-primary/5"
                  : "border-border bg-card"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Hover shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className={`relative h-10 w-10 border flex items-center justify-center flex-shrink-0 transition-colors ${
                  action.highlight ? "border-primary/30 bg-primary/10 group-hover:border-primary/50" : "border-border group-hover:border-primary/20"
                }`}>
                  <action.icon className={`h-4 w-4 ${action.highlight ? "text-primary icon-gold-glow" : "text-primary"}`} />
                  {badgeCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center animate-pulse" style={{ animationDuration: '2s' }}>
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{action.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{action.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
              {action.highlight && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] pointer-events-none" />
              )}
            </button>
            );
          })}
        </div>
      </div>

      {/* Received Documents from Lawyer */}
      {receivedDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Documentos Recebidos do Advogado
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => navigate("/dashboard/documentos")}
            >
              Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {receivedDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-primary/20 p-3 flex items-center justify-between hover-gold-glow transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 border border-border">
                        {({
                          upload: "Arquivo",
                          contrato: "Contrato",
                          procuracao: "Procuração",
                          peticao: "Petição",
                          parecer: "Parecer",
                          relatorio: "Relatório",
                          recibo: "Recibo",
                          notificacao: "Notificação",
                          outros: "Outros",
                        } as Record<string, string>)[doc.document_type] || doc.document_type}
                      </span>
                      <span>
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {doc.signatureStatus === "assinado" ? (
                        <span className="text-[8px] px-1 py-0 border border-accent/30 text-accent flex items-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5" />Assinado
                        </span>
                      ) : doc.signatureStatus === "pendente" ? (
                        <span className="text-[8px] px-1 py-0 border border-primary/30 text-primary flex items-center gap-0.5 animate-pulse">
                          <Clock className="h-2.5 w-2.5" />Pendente
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">Novo</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => navigate("/dashboard/documentos")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Documents Section with Upload */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif text-foreground">Meus Documentos</h2>
          <div className="flex items-center gap-2">
            {clientProfile && (
              <Button
                size="sm"
                className="btn-gold text-xs"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-3 w-3 mr-1" />
                Enviar Documento
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => navigate("/dashboard/documentos")}
            >
              Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
        
        {loadingDocs ? (
          <div className="bg-card border border-border p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : myDocuments.length === 0 ? (
          <div className="bg-card border border-border p-8 flex flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Nenhum documento enviado</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Envie documentos para o advogado ou visualize documentos compartilhados.
            </p>
            {clientProfile && (
              <Button
                size="sm"
                className="btn-gold text-xs"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-3 w-3 mr-1" />
                Enviar Primeiro Documento
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {myDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-border p-3 flex items-center justify-between hover-gold-glow transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 border border-border">
                        {getCategoriaLabel(doc.categoria)}
                      </span>
                      <span>
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownloadDoc(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Folders from Lawyer */}
      {sharedFolders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif text-foreground">Pastas Compartilhadas pelo Advogado</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => navigate("/dashboard/documentos")}
            >
              Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sharedFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate("/dashboard/documentos")}
                className="bg-card border border-border p-4 text-left hover-gold-glow transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 border flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: folder.color || '#d4af37' }}
                  >
                    <FolderOpen 
                      className="h-5 w-5" 
                      style={{ color: folder.color || '#d4af37' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {folder.documentCount} documento{folder.documentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Meus Processos Preview */}
      {myProcessos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Meus Processos
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/dashboard/processos")}>
              Ver Todos <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
             {myProcessos.map((p) => {
              const isExpanded = expandedProcesso === p.id;
              const andamentos = processoAndamentos[p.id] || [];
              return (
                <div
                  key={p.id}
                  className="bg-card border border-border p-4 hover-gold-glow transition-all space-y-3"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedProcesso(isExpanded ? null : p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">{p.numero_processo}</p>
                        <p className="text-sm font-medium text-foreground">{p.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {andamentos.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                          {andamentos.length} mov.
                        </span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 border border-border tracking-wider uppercase text-muted-foreground">
                        {p.status?.replace("_", " ")}
                      </span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  <ProcessStatusTracker
                    status={p.status || "novo"}
                    ultimaMovimentacao={p.ultima_movimentacao}
                    compact={!isExpanded}
                    andamentos={andamentos}
                    showTimeline={isExpanded}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Appointments - Real Data */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif text-foreground mb-0">Próximas Consultas</h2>
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/dashboard/consultas")}>
            Agendar <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {myConsultas.length === 0 ? (
          <div className="bg-card border border-border p-8 flex flex-col items-center justify-center text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Nenhuma consulta agendada</p>
            <p className="text-xs text-muted-foreground/60">
              Agende uma consulta para receber orientação jurídica personalizada.
            </p>
            <Button variant="outline" size="sm" className="text-xs mt-4 btn-outline-gold" onClick={() => navigate("/dashboard/consultas")}>
              <Calendar className="h-3 w-3 mr-1" />
              Agendar Consulta
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {myConsultas.map((c) => (
              <div key={c.id} className="bg-card border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.tipo}</p>
                    {c.data_hora && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.data_hora).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.valor && (
                    <span className="text-sm font-serif text-primary">
                      {Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  )}
                  <span className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${
                    c.status === "confirmado" ? "text-green-400 border-green-400/30" :
                    c.status === "pendente" ? "text-warning border-warning/30" :
                    "text-muted-foreground border-border"
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invoices Alert */}
      {pendingInvoices > 0 && (
        <div className="bg-card border border-warning/30 p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-warning/10 border border-warning/30 flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {pendingInvoices} fatura{pendingInvoices > 1 ? "s" : ""} pendente{pendingInvoices > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Acesse Pagamentos para visualizar e pagar.</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs btn-outline-gold" onClick={() => navigate("/dashboard/pagamentos")}>
            Ver Faturas
          </Button>
        </div>
      )}

      {/* Review Section */}
      {hasReview === false && !showReviewForm && (
        <div className="bg-card border border-primary/20 p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-0.5">
                Avalie nossos serviços
              </h3>
              <p className="text-xs text-muted-foreground">
                Sua opinião é importante! Deixe uma avaliação para ajudar outros clientes.
              </p>
            </div>
            <Button
              size="sm"
              className="btn-gold"
              onClick={() => setShowReviewForm(true)}
            >
              Avaliar
            </Button>
          </div>
        </div>
      )}

      {showReviewForm && (
        <AvaliacaoForm onSuccess={() => setHasReview(true)} />
      )}

      {hasReview === true && (
        <div className="bg-card border border-primary/20 p-5 flex items-center gap-4 animate-fade-in">
          <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Star className="h-5 w-5 text-primary fill-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Obrigado pela sua avaliação!
            </p>
            <p className="text-xs text-muted-foreground">
              Sua opinião ajuda outros clientes.
            </p>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {clientProfile && (
        <ClientUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          clientProfileId={clientProfile.id}
          onSuccess={() => {
            // Recarregar documentos
            supabase
              .from("client_documents")
              .select("*")
              .eq("client_profile_id", clientProfile.id)
              .order("created_at", { ascending: false })
              .limit(5)
              .then(({ data }) => {
                setMyDocuments((data as ClientDocument[]) || []);
              });
          }}
        />
      )}
    </div>
  );
}
