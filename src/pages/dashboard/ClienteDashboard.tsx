import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Scale,
  MessageSquare,
  Calendar,
  Clock,
  ChevronRight,
  Star,
  CreditCard,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Activity,
  Zap,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClientUploadDialog } from "@/components/dashboard/clients/ClientUploadDialog";
import { ProcessStatusTracker } from "@/components/dashboard/ProcessStatusTracker";
import { AvaliacaoForm } from "@/components/dashboard/AvaliacaoForm";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";

interface ClientDocument {
  id: string;
  nome: string;
  created_at: string;
  file_path: string;
}

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [myDocuments, setMyDocuments] = useState<ClientDocument[]>([]);
  const [myProcessos, setMyProcessos] = useState<any[]>([]);
  const [myConsultas, setMyConsultas] = useState<any[]>([]);
  const [processoAndamentos, setProcessoAndamentos] = useState<Record<string, any[]>>({});
  const [documentFolders, setDocumentFolders] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [hasReview, setHasReview] = useState<boolean | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      
      if (profile) {
        setClientProfile(profile);

        const { data: docs } = await supabase
          .from("client_documents")
          .select("*")
          .eq("client_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setMyDocuments((docs as ClientDocument[]) || []);

        const { data: folders } = await supabase
          .from("document_folders")
          .select("*, documents(count)")
          .eq("client_profile_id", profile.id)
          .is("parent_id", null);
        
        if (folders) {
          const formattedFolders = folders.map(f => ({
            id: f.id,
            name: f.name,
            color: f.color,
            documentCount: f.documents?.[0]?.count || 0
          }));
          setDocumentFolders(formattedFolders);
        }

        const { data: processos } = await supabase
          .from("processos")
          .select("*")
          .eq("client_profile_id", profile.id)
          .order("updated_at", { ascending: false });
        setMyProcessos(processos || []);

        if (processos && processos.length > 0) {
          const andamentosMap: Record<string, any[]> = {};
          for (const p of processos) {
            const { data: andamentos } = await supabase
              .from("andamentos")
              .select("*")
              .eq("processo_id", p.id)
              .order("data_ocorrencia", { ascending: false })
              .limit(3);
            andamentosMap[p.id] = andamentos || [];
          }
          setProcessoAndamentos(andamentosMap);
        }

        const { data: consultas } = await supabase
          .from("consultas")
          .select("*")
          .eq("cliente_id", profile.id)
          .order("data_hora", { ascending: true })
          .limit(3);
        setMyConsultas(consultas || []);

        const { count: invoicesCount } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("client_profile_id", profile.id)
          .eq("status", "pending");
        setPendingInvoices(invoicesCount || 0);

        const { data: review } = await supabase
          .from("avaliacoes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setHasReview(!!review);
      }
    };

    fetchData();
  }, [user]);

  const greeting = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      <ThemedHeader
        role="cliente"
        greeting={greeting}
        userName={user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente"}
        subtitle="Portal de Transparência & Acompanhamento de Infraestrutura Jurídica"
        icon={ShieldCheck}
        badgeLabel="PORTAL DO CLIENTE"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="SISTEMA PROTEGIDO" />
          <StatusLED status={myProcessos.length > 0 ? "online" : "offline"} label="PROCESSOS" />
        </div>
      </ThemedHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ThemedStatCard
          role="cliente"
          label="Processos Ativos"
          value={myProcessos.length}
          icon={Scale}
          onClick={() => navigate("/dashboard/processos")}
        />
        <ThemedStatCard
          role="cliente"
          label="Documentos"
          value={myDocuments.length + (documentFolders.reduce((acc, f) => acc + f.documentCount, 0))}
          icon={FileText}
          onClick={() => navigate("/dashboard/documentos")}
        />
        <ThemedStatCard
          role="cliente"
          label="Faturas Pendentes"
          value={pendingInvoices}
          icon={CreditCard}
          onClick={() => navigate("/dashboard/pagamentos")}
          highlight={pendingInvoices > 0}
        />
        <ThemedStatCard
          role="cliente"
          label="Próximas Consultas"
          value={myConsultas.length}
          icon={Calendar}
          onClick={() => navigate("/dashboard/consultas")}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ThemedSection role="cliente" title="Status de Processos & Infraestrutura" icon={Activity}>
             {myProcessos.length === 0 ? (
               <Card className="bg-card/80 border-border/40 p-12 text-center">
                  <Info className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-widest">Nenhum processo em monitoramento</p>
               </Card>
             ) : (
               <div className="space-y-3">
                  {myProcessos.map((p) => {
                    const isExpanded = expandedProcesso === p.id;
                    const andamentos = processoAndamentos[p.id] || [];
                    return (
                      <Card key={p.id} className="bg-card/80 border-border/40 hover:border-primary/30 transition-all overflow-hidden">
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer group"
                          onClick={() => setExpandedProcesso(isExpanded ? null : p.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded bg-primary/5 group-hover:bg-primary/10">
                               <Scale className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">{p.numero_processo}</p>
                               <p className="text-sm font-bold uppercase">{p.tipo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <Badge variant="outline" className="text-[9px] uppercase h-5">{p.status?.replace("_", " ")}</Badge>
                             <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border/20 pt-4 animate-in slide-in-from-top-2">
                             <ProcessStatusTracker
                                status={p.status || "novo"}
                                ultimaMovimentacao={p.ultima_movimentacao}
                                andamentos={andamentos}
                                showTimeline={true}
                             />
                             <Button variant="link" size="sm" className="mt-4 text-[10px] uppercase tracking-widest p-0" onClick={() => navigate("/dashboard/processos")}>
                                Ver Detalhes Completos <ArrowRight className="h-3 w-3 ml-1" />
                             </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
               </div>
             )}
          </ThemedSection>

          <ThemedSection role="cliente" title="Canais de Comunicação" icon={MessageSquare}>
             <div className="grid sm:grid-cols-2 gap-3">
                <Card className="bg-card/80 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => navigate("/dashboard/chat")}>
                   <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2.5 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                         <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-sm font-bold uppercase">Chat com Escritório</p>
                         <p className="text-[10px] text-muted-foreground uppercase">Suporte em tempo real</p>
                      </div>
                   </CardContent>
                </Card>
                <Card className="bg-card/80 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => navigate("/dashboard/consultas")}>
                   <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2.5 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                         <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-sm font-bold uppercase">Agendar Consulta</p>
                         <p className="text-[10px] text-muted-foreground uppercase">Vídeo ou Presencial</p>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </ThemedSection>
        </div>

        <div className="space-y-6">
           <ThemedSection role="cliente" title="Repositório de Dados" icon={FolderOpen}>
              <div className="bg-card/80 border border-border/50 rounded-lg p-4 space-y-3">
                 {documentFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => navigate(`/dashboard/documentos?folder=${folder.id}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group text-left"
                    >
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border-l-2" style={{ borderLeftColor: folder.color || 'var(--primary)' }}>
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase truncate">{folder.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{folder.documentCount} arquivos</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                 ))}
                 <Button variant="outline" className="w-full text-[10px] uppercase tracking-widest gap-2 h-9" onClick={() => setUploadOpen(true)}>
                    <Zap className="h-3 w-3" /> Upload de Ativos
                 </Button>
              </div>
           </ThemedSection>

           <ThemedSection role="cliente" title="Próximos Marcos" icon={Clock}>
              <div className="bg-card/80 border border-border/50 rounded-lg p-4 space-y-2 h-[260px]">
                 <ScrollArea className="h-full">
                    {myConsultas.length === 0 ? (
                      <div className="py-12 text-center opacity-30">
                         <Calendar className="h-8 w-8 mx-auto mb-2" />
                         <p className="text-[10px] uppercase tracking-widest">Sem consultas agendadas</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myConsultas.map((c) => (
                          <div key={c.id} className="p-3 rounded border border-border/20 bg-muted/5 flex items-center justify-between">
                            <div>
                               <p className="text-xs font-bold uppercase">{c.tipo}</p>
                               <p className="text-[10px] text-muted-foreground uppercase">{new Date(c.data_hora).toLocaleDateString("pt-BR")} | {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <Badge variant="outline" className="text-[8px] h-4 uppercase">{c.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                 </ScrollArea>
              </div>
           </ThemedSection>

           <ThemedSection role="cliente" title="NPS & Qualidade" icon={Star}>
              {!hasReview && !showReviewForm ? (
                <Card className="bg-primary/5 border-primary/20">
                   <CardContent className="p-4 text-center space-y-3">
                      <p className="text-xs font-medium leading-relaxed">Sua avaliação técnica é fundamental para a melhoria de nossa infraestrutura jurídica.</p>
                      <Button size="sm" className="w-full text-[10px] uppercase tracking-widest gap-2" onClick={() => setShowReviewForm(true)}>
                         <Star className="h-3 w-3" /> Avaliar Experiência
                      </Button>
                   </CardContent>
                </Card>
              ) : showReviewForm ? (
                <AvaliacaoForm onSuccess={() => { setHasReview(true); setShowReviewForm(false); }} />
              ) : (
                <div className="p-4 rounded border border-green-500/20 bg-green-500/5 text-center">
                   <p className="text-[10px] text-green-500 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" /> Feedback Processado
                   </p>
                </div>
              )}
           </ThemedSection>
        </div>
      </div>

      {clientProfile && (
        <ClientUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          clientProfileId={clientProfile.id}
          onSuccess={() => {
             // Refresh check
          }}
        />
      )}
    </div>
  );
}
