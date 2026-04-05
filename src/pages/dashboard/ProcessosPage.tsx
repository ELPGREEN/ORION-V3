import { useState, useEffect, useRef, useCallback } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  FileText,
  Search,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  Save,
  User,
  Upload,
  Download,
  FolderOpen,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Paperclip,
  BellRing,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Processo {
  id: string;
  numero_processo: string;
  tipo: string;
  cliente_nome: string;
  status: string;
  vara: string | null;
  comarca: string | null;
  descricao: string | null;
  valor_causa: number | null;
  data_distribuicao: string | null;
  ultima_movimentacao: string | null;
  client_profile_id: string | null;
  created_at: string;
}

interface Andamento {
  id: string;
  processo_id: string;
  user_id: string;
  descricao: string;
  tipo: string;
  data_ocorrencia: string;
  created_at: string;
  attachment_storage_path: string | null;
  attachment_file_name: string | null;
}

interface ClientProfile {
  id: string;
  nome: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  em_andamento: { label: "Em Andamento", icon: Clock, color: "text-blue-400 border-blue-400/30" },
  aguardando_prazo: { label: "Aguardando Prazo", icon: AlertCircle, color: "text-warning border-warning/30" },
  suspenso: { label: "Suspenso", icon: AlertCircle, color: "text-orange-400 border-orange-400/30" },
  arquivado: { label: "Arquivado", icon: CheckCircle, color: "text-muted-foreground border-border" },
  concluido: { label: "Concluído", icon: CheckCircle, color: "text-green-400 border-green-400/30" },
};

const tipoOptions = [
  { value: "civel", label: "Cível" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "criminal", label: "Criminal" },
  { value: "familia", label: "Família" },
  { value: "consumidor", label: "Consumidor" },
  { value: "tributario", label: "Tributário" },
  { value: "administrativo", label: "Administrativo" },
  { value: "outros", label: "Outros" },
];

const andamentoTipos = [
  { value: "despacho", label: "Despacho" },
  { value: "peticao", label: "Petição" },
  { value: "audiencia", label: "Audiência" },
  { value: "decisao", label: "Decisão" },
  { value: "sentenca", label: "Sentença" },
  { value: "recurso", label: "Recurso" },
  { value: "outros", label: "Outros" },
];

async function vincularDocumentosIniciais(processoId: string, clientProfileId: string, userId: string) {
  // Link ALL client documents (any category) to the process
  const { data: docs } = await supabase
    .from("client_documents")
    .select("*")
    .eq("client_profile_id", clientProfileId);

  if (!docs || docs.length === 0) return;

  // Check existing to avoid duplicates
  const { data: existing } = await supabase
    .from("processo_documents")
    .select("storage_path")
    .eq("processo_id", processoId);

  const existingPaths = new Set((existing || []).map((e: any) => e.storage_path));

  const toInsert = docs
    .filter((doc: any) => !existingPaths.has(doc.storage_path))
    .map((doc: any) => ({
      processo_id: processoId,
      file_name: doc.file_name,
      storage_path: doc.storage_path,
      file_type: doc.file_type,
      file_size: doc.file_size,
      user_id: userId,
      notas: "Documento vinculado automaticamente",
      categoria: `pessoal_${doc.categoria}`,
    }));

  if (toInsert.length > 0) {
    await supabase.from("processo_documents").insert(toInsert);
  }
}

export default function ProcessosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isCliente } = useUserRole();
  const { logNeural } = useNeuralFeedback();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [clientes, setClientes] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<Processo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Processo | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [processoDocs, setProcessoDocs] = useState<Record<string, any[]>>({});
  const [processoAndamentos, setProcessoAndamentos] = useState<Record<string, Andamento[]>>({});
  const [uploadingProcesso, setUploadingProcesso] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadProcessoIdRef = useRef<string | null>(null);

  // Link client documents dialog state
  const [linkDocDialogOpen, setLinkDocDialogOpen] = useState(false);
  const [linkDocProcesso, setLinkDocProcesso] = useState<Processo | null>(null);
  const [clientDocsAvailable, setClientDocsAvailable] = useState<any[]>([]);
  const [linkingDocs, setLinkingDocs] = useState(false);
  const [selectedClientDocs, setSelectedClientDocs] = useState<Set<string>>(new Set());

  // Andamento dialog state
  const [andamentoDialogOpen, setAndamentoDialogOpen] = useState(false);
  const [editingAndamento, setEditingAndamento] = useState<Andamento | null>(null);
  const [andamentoProcessoId, setAndamentoProcessoId] = useState<string | null>(null);
  const [andamentoProcessoClientId, setAndamentoProcessoClientId] = useState<string | null>(null);
  const [savingAndamento, setSavingAndamento] = useState(false);
  const [andamentoForm, setAndamentoForm] = useState({
    tipo: "despacho",
    data_ocorrencia: new Date().toISOString().slice(0, 10),
    descricao: "",
  });
  const [deleteAndamentoTarget, setDeleteAndamentoTarget] = useState<Andamento | null>(null);
  const [andamentoFile, setAndamentoFile] = useState<File | null>(null);
  const andamentoFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newAndamentoBadges, setNewAndamentoBadges] = useState<Record<string, number>>({});
  // Docs da pasta do cliente por processo (para aba "Recebidos do Cliente")
  const [clienteFolderDocs, setClienteFolderDocs] = useState<Record<string, any[]>>({});

  const [formData, setFormData] = useState({
    numero_processo: "",
    tipo: "civel",
    cliente_nome: "",
    client_profile_id: "",
    status: "em_andamento",
    vara: "",
    comarca: "",
    descricao: "",
    valor_causa: "",
    data_distribuicao: "",
  });

  useEffect(() => {
    if (user) {
      fetchProcessos();
      fetchClientes();
    }
  }, [user]);

  useRefreshOnFocus(useCallback(() => { if (user) { fetchProcessos(); fetchClientes(); } }, [user]));

  // Realtime: notify clients when lawyer adds an andamento
  useEffect(() => {
    if (!user || !isCliente || processos.length === 0) return;

    const processoIds = new Set(processos.map((p) => p.id));

    const channel = supabase
      .channel("andamentos-client-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "andamentos" },
        (payload) => {
          const newAndamento = payload.new as Andamento;
          const processoId = newAndamento.processo_id;

          // Only handle if it belongs to one of our processes
          if (!processoIds.has(processoId)) return;

          // If the process is currently expanded, append to its list
          setProcessoAndamentos((prev) => {
            const existing = prev[processoId] || [];
            if (existing.some((a) => a.id === newAndamento.id)) return prev;
            return { ...prev, [processoId]: [newAndamento, ...existing] };
          });

          // Increment badge counter for that process
          setNewAndamentoBadges((prev) => ({
            ...prev,
            [processoId]: (prev[processoId] || 0) + 1,
          }));

          // Show toast
          const processo = processos.find((p) => p.id === processoId);
          toast({
            title: "Novo andamento registrado",
            description: `Processo ${processo?.numero_processo || ""}: ${newAndamento.descricao.slice(0, 80)}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCliente, processos, toast]);

  const fetchProcessos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("processos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
    } else {
      setProcessos(data || []);
    }
    setLoading(false);
  };

  const fetchClientes = async () => {
    const { data } = await supabase
      .from("client_profiles")
      .select("id, nome")
      .order("nome");
    if (data) setClientes(data);
  };

  const loadProcessoDocs = async (processoId: string) => {
    const { data } = await supabase
      .from("processo_documents")
      .select("*")
      .eq("processo_id", processoId)
      .order("created_at", { ascending: false });
    setProcessoDocs((prev) => ({ ...prev, [processoId]: data || [] }));
  };

  const loadProcessoAndamentos = async (processoId: string) => {
    const { data } = await supabase
      .from("andamentos")
      .select("*")
      .eq("processo_id", processoId)
      .order("data_ocorrencia", { ascending: false });
    setProcessoAndamentos((prev) => ({ ...prev, [processoId]: data || [] }));
  };

  const loadClienteFolderDocs = async (processoId: string, clientProfileId: string) => {
    const { data } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_profile_id", clientProfileId)
      .order("created_at", { ascending: false });
    setClienteFolderDocs((prev) => ({ ...prev, [processoId]: data || [] }));
  };

  const toggleExpand = (processoId: string) => {
    if (expandedProcesso === processoId) {
      setExpandedProcesso(null);
    } else {
      const processo = processos.find((p) => p.id === processoId);
      setExpandedProcesso(processoId);
      loadProcessoDocs(processoId);
      loadProcessoAndamentos(processoId);
      if (processo?.client_profile_id) {
        loadClienteFolderDocs(processoId, processo.client_profile_id);
      }
      // Clear new-andamento badge when user expands to see them
      if (newAndamentoBadges[processoId]) {
        setNewAndamentoBadges((prev) => {
          const next = { ...prev };
          delete next[processoId];
          return next;
        });
      }
    }
  };

  const handleFileUploadForProcesso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const processoId = uploadProcessoIdRef.current;
    if (!file || !user || !processoId) return;

    // Validate processoId is a proper UUID to prevent path traversal
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(processoId)) {
      toast({ title: "ID de processo inválido", variant: "destructive" });
      return;
    }

    setUploadingProcesso(processoId);
    const sanitized = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `processos/${processoId}/${Date.now()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
    if (uploadError) {
      toast({ title: "Erro no upload", variant: "destructive" });
      setUploadingProcesso(null);
      return;
    }

    const { error: insertError } = await supabase.from("processo_documents").insert({
      processo_id: processoId,
      file_name: file.name,
      storage_path: fileName,
      file_type: file.type,
      file_size: file.size,
      user_id: user.id,
    });

    if (insertError) {
      toast({ title: "Erro ao registrar documento", variant: "destructive" });
    } else {
      toast({ title: "Documento adicionado!" });
      loadProcessoDocs(processoId);
    }
    setUploadingProcesso(null);
    e.target.value = "";
  };

  const openLinkDocDialog = async (processo: Processo) => {
    if (!processo.client_profile_id) {
      toast({ title: "Este processo não tem cliente vinculado", variant: "destructive" });
      return;
    }
    setLinkDocProcesso(processo);
    setSelectedClientDocs(new Set());

    const [{ data: clientDocs }, { data: alreadyLinked }] = await Promise.all([
      supabase.from("client_documents").select("*").eq("client_profile_id", processo.client_profile_id),
      supabase.from("processo_documents").select("storage_path").eq("processo_id", processo.id),
    ]);

    const linkedPaths = new Set((alreadyLinked || []).map((d: any) => d.storage_path));
    const available = (clientDocs || []).filter((d: any) => !linkedPaths.has(d.storage_path));
    setClientDocsAvailable(available);
    setLinkDocDialogOpen(true);
  };

  const handleLinkSelectedDocs = async () => {
    if (!linkDocProcesso || !user || selectedClientDocs.size === 0) return;
    setLinkingDocs(true);

    const PESSOAL_CATEGORIAS = new Set([
      "rg", "cnh", "cpf", "passaporte", "ctps",
      "comprovante_residencia", "certidao_nascimento", "certidao_casamento", "certidao_obito",
      "identidade",
    ]);

    const toInsert = clientDocsAvailable
      .filter((d: any) => selectedClientDocs.has(d.id))
      .map((doc: any) => ({
        processo_id: linkDocProcesso.id,
        file_name: doc.file_name,
        storage_path: doc.storage_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
        user_id: user.id,
        notas: "Vinculado manualmente da pasta do cliente",
        categoria: PESSOAL_CATEGORIAS.has(doc.categoria)
          ? `pessoal_${doc.categoria}`
          : doc.categoria || "geral",
      }));

    const { error } = await supabase.from("processo_documents").insert(toInsert);
    if (error) {
      toast({ title: "Erro ao vincular documentos", variant: "destructive" });
    } else {
      toast({ title: `${toInsert.length} documento(s) vinculado(s) com sucesso!` });
      setLinkDocDialogOpen(false);
      loadProcessoDocs(linkDocProcesso.id);
    }
    setLinkingDocs(false);
  };

  const handleDownloadProcessoDoc = async (doc: any) => {
    if (!doc.storage_path) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDownloadAndamentoAttachment = async (andamento: Andamento) => {
    if (!andamento.attachment_storage_path) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(andamento.attachment_storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDeleteProcessoDoc = async (doc: any) => {
    // Only delete from storage if it's NOT auto-linked (categoria starts with 'pessoal_')
    if (doc.storage_path && (!doc.categoria || !doc.categoria.startsWith("pessoal_"))) {
      await supabase.storage.from("documents").remove([doc.storage_path]);
    }
    await supabase.from("processo_documents").delete().eq("id", doc.id);
    toast({ title: "Documento removido" });
    if (expandedProcesso) loadProcessoDocs(expandedProcesso);
  };

  const openNewDialog = () => {
    setEditingProcesso(null);
    setFormData({
      numero_processo: "",
      tipo: "civel",
      cliente_nome: "",
      client_profile_id: "",
      status: "em_andamento",
      vara: "",
      comarca: "",
      descricao: "",
      valor_causa: "",
      data_distribuicao: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (processo: Processo) => {
    setEditingProcesso(processo);
    setFormData({
      numero_processo: processo.numero_processo,
      tipo: processo.tipo,
      cliente_nome: processo.cliente_nome,
      client_profile_id: processo.client_profile_id || "",
      status: processo.status,
      vara: processo.vara || "",
      comarca: processo.comarca || "",
      descricao: processo.descricao || "",
      valor_causa: processo.valor_causa?.toString() || "",
      data_distribuicao: processo.data_distribuicao || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.numero_processo.trim() || !formData.cliente_nome.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSaving(true);

    const payload = {
      numero_processo: formData.numero_processo.trim(),
      tipo: formData.tipo,
      cliente_nome: formData.cliente_nome.trim(),
      client_profile_id: formData.client_profile_id || null,
      status: formData.status,
      vara: formData.vara.trim() || null,
      comarca: formData.comarca.trim() || null,
      descricao: formData.descricao.trim() || null,
      valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : null,
      data_distribuicao: formData.data_distribuicao || null,
    };

    if (editingProcesso) {
      const { error } = await supabase
        .from("processos")
        .update(payload)
        .eq("id", editingProcesso.id);

      if (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      } else {
        toast({ title: "Processo atualizado!" });
        setDialogOpen(false);
        fetchProcessos();
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("processos")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();

      if (error || !inserted) {
        toast({ title: "Erro ao criar", variant: "destructive" });
      } else {
        // Auto-link personal documents if client is selected
        if (formData.client_profile_id) {
          await vincularDocumentosIniciais(inserted.id, formData.client_profile_id, user.id);
        }
        toast({ title: "Processo cadastrado!" });
        setDialogOpen(false);
        fetchProcessos();

        // 🧠 Neural: novo processo = evento de alta relevância jurídica
        logNeural({
          interaction_type: "crm_client_event",
          input_text: `Novo processo: ${payload.numero_processo} — ${payload.tipo} — ${payload.cliente_nome}`,
          output_text: `Status: ${payload.status} | Vara: ${payload.vara || "N/A"} | Valor: ${payload.valor_causa || 0}`,
          quality_score: 0.88,
          user_id: user.id,
          metadata: {
            module: "processos",
            tipo: payload.tipo,
            status_novo: payload.status,
            valor_causa: payload.valor_causa,
            client_profile_id: payload.client_profile_id,
          },
        });
      }
    }

    setSaving(false);
  };

  const handleDelete = async (processo: Processo) => {
    const { error } = await supabase.from("processos").delete().eq("id", processo.id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Processo excluído" });
      fetchProcessos();
    }
    setDeleteTarget(null);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clientes.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      client_profile_id: clientId,
      cliente_nome: client?.nome || formData.cliente_nome,
    });
  };

  const openAddAndamento = (processoId: string, clientProfileId: string | null) => {
    setEditingAndamento(null);
    setAndamentoProcessoId(processoId);
    setAndamentoProcessoClientId(clientProfileId);
    setAndamentoForm({
      tipo: "despacho",
      data_ocorrencia: new Date().toISOString().slice(0, 10),
      descricao: "",
    });
    setAndamentoFile(null);
    setAndamentoDialogOpen(true);
  };

  const openEditAndamento = (andamento: Andamento) => {
    setEditingAndamento(andamento);
    setAndamentoProcessoId(andamento.processo_id);
    setAndamentoForm({
      tipo: andamento.tipo,
      data_ocorrencia: andamento.data_ocorrencia,
      descricao: andamento.descricao,
    });
    setAndamentoFile(null);
    setAndamentoDialogOpen(true);
  };

  const handleSaveAndamento = async () => {
    if (!andamentoForm.descricao.trim() || !andamentoProcessoId || !user) return;

    setSavingAndamento(true);
    try {
      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;

      // Upload attachment if provided (only for new andamentos)
      if (andamentoFile && !editingAndamento) {
        setUploadingAttachment(true);
        const sanitized = andamentoFile.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `andamentos/${andamentoProcessoId}/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, andamentoFile);
        if (uploadError) throw uploadError;
        attachmentPath = storagePath;
        attachmentName = andamentoFile.name;
        setUploadingAttachment(false);
      }

      if (editingAndamento) {
        const { error } = await supabase
          .from("andamentos")
          .update({
            tipo: andamentoForm.tipo,
            data_ocorrencia: andamentoForm.data_ocorrencia,
            descricao: andamentoForm.descricao.trim(),
          })
          .eq("id", editingAndamento.id);
        if (error) throw error;
        toast({ title: "Andamento atualizado!" });
      } else {
        const { error } = await supabase.from("andamentos").insert({
          processo_id: andamentoProcessoId,
          user_id: user.id,
          tipo: andamentoForm.tipo,
          data_ocorrencia: andamentoForm.data_ocorrencia,
          descricao: andamentoForm.descricao.trim(),
          ...(attachmentPath ? {
            attachment_storage_path: attachmentPath,
            attachment_file_name: attachmentName,
          } : {}),
        } as any);
        if (error) throw error;

        // Notify the client if linked
        if (andamentoProcessoClientId) {
          const processo = processos.find((p) => p.id === andamentoProcessoId);
          const { data: cp } = await supabase
            .from("client_profiles")
            .select("user_id")
            .eq("id", andamentoProcessoClientId)
            .single();

          if (cp?.user_id) {
            await supabase.from("notificacoes").insert({
              user_id: cp.user_id,
              tipo: "andamento",
              titulo: "Novo andamento no processo",
              descricao: `Processo ${processo?.numero_processo || ""}: ${andamentoForm.descricao.trim().slice(0, 100)}`,
              referencia_id: andamentoProcessoId,
              referencia_tipo: "processo",
            });
          }
        }

        toast({ title: "Andamento adicionado!" });

        // 🧠 Neural: andamento processual = dado jurídico de alta relevância
        logNeural({
          interaction_type: "document_generation",
          input_text: `Andamento processual: ${andamentoForm.tipo} — ${andamentoForm.data_ocorrencia}`,
          output_text: andamentoForm.descricao.trim(),
          quality_score: 0.82,
          user_id: user.id,
          metadata: {
            module: "processos_andamento",
            tipo: andamentoForm.tipo,
            processo_id: andamentoProcessoId,
            hasAttachment: !!attachmentPath,
          },
        });
      }

      setAndamentoDialogOpen(false);
      setAndamentoFile(null);
      loadProcessoAndamentos(andamentoProcessoId);
    } catch (err: any) {
      toast({ title: "Erro ao salvar andamento", description: err.message, variant: "destructive" });
    } finally {
      setSavingAndamento(false);
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAndamento = async (andamento: Andamento) => {
    const { error } = await supabase.from("andamentos").delete().eq("id", andamento.id);
    if (error) {
      toast({ title: "Erro ao excluir andamento", variant: "destructive" });
    } else {
      toast({ title: "Andamento excluído" });
      loadProcessoAndamentos(andamento.processo_id);
    }
    setDeleteAndamentoTarget(null);
  };

  const filtrados = processos.filter(
    (p) =>
      p.numero_processo.toLowerCase().includes(busca.toLowerCase()) ||
      p.tipo.toLowerCase().includes(busca.toLowerCase()) ||
      p.cliente_nome.toLowerCase().includes(busca.toLowerCase())
  );

  // ─── CLIENT VIEW ──────────────────────────────────────────────────────────
  if (isCliente) {
    const statusProgress: Record<string, number> = {
      em_andamento: 50,
      aguardando_prazo: 40,
      suspenso: 30,
      arquivado: 100,
      concluido: 100,
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            Meus Processos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o andamento dos seus processos.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou tipo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum processo vinculado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Seus processos aparecerão aqui quando vinculados pelo advogado.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtrados.map((p) => {
              const status = statusConfig[p.status] || statusConfig.em_andamento;
              const StatusIcon = status.icon;
              const progress = statusProgress[p.status] || 50;
              const isExpanded = expandedProcesso === p.id;
              const andamentos = processoAndamentos[p.id] || [];
              const docs = processoDocs[p.id] || [];
              const docsProcesso = docs.filter((d: any) => !d.categoria || !d.categoria.startsWith("pessoal_"));
              const docsPessoais = docs.filter((d: any) => d.categoria && d.categoria.startsWith("pessoal_"));

              return (
                <div key={p.id} className="bg-card border border-border p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">{p.numero_processo}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {tipoOptions.find((t) => t.value === p.tipo)?.label || p.tipo}
                      </p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <div className="flex items-center gap-6 text-[10px] text-muted-foreground flex-wrap">
                    {p.vara && <span>Vara: <span className="text-foreground">{p.vara}</span></span>}
                    {p.comarca && <span>Comarca: <span className="text-foreground">{p.comarca}</span></span>}
                    {p.valor_causa && (
                      <span>Valor: <span className="text-foreground">
                        {p.valor_causa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span></span>
                    )}
                  </div>

                  {p.descricao && (
                    <p className="text-xs text-muted-foreground">{p.descricao}</p>
                  )}

                  {/* Expand button with new-andamento badge */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? "Ocultar detalhes" : "Ver andamentos e documentos"}
                    </button>
                    {newAndamentoBadges[p.id] && !isExpanded && (
                      <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-primary text-primary-foreground font-bold animate-pulse">
                        <BellRing className="h-2.5 w-2.5" />
                        {newAndamentoBadges[p.id]} novo{newAndamentoBadges[p.id] > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Expanded unified view */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border">
                      {/* Partes / Processo info */}
                      <div className="mb-3 p-2 bg-muted/20 border border-border/50 rounded-sm">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Partes Envolvidas</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="text-foreground font-medium">{p.cliente_nome}</span>
                          </span>
                          {p.vara && (
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">Vara:</span>
                              <span className="text-foreground">{p.vara}</span>
                            </span>
                          )}
                          {p.comarca && (
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">Comarca:</span>
                              <span className="text-foreground">{p.comarca}</span>
                            </span>
                          )}
                          {p.data_distribuicao && (
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">Distribuição:</span>
                              <span className="text-foreground">{new Date(p.data_distribuicao).toLocaleDateString("pt-BR")}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <Tabs defaultValue="andamentos">
                        <TabsList className="h-8 text-[10px]">
                          <TabsTrigger value="andamentos" className="text-[10px]">
                            <ListChecks className="h-3 w-3 mr-1" />
                            Andamentos ({andamentos.length})
                          </TabsTrigger>
                          <TabsTrigger value="documentos" className="text-[10px]">
                            <FileText className="h-3 w-3 mr-1" />
                            Documentos ({docsProcesso.length})
                          </TabsTrigger>
                          <TabsTrigger value="pessoais" className="text-[10px]">
                            <User className="h-3 w-3 mr-1" />
                            Meus Docs ({docsPessoais.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="andamentos" className="mt-3 space-y-2">
                          {andamentos.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-4">Nenhum andamento registrado</p>
                          ) : (
                            andamentos.map((a) => (
                              <div key={a.id} className="border-l-2 border-primary/30 pl-3 py-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                    {andamentoTipos.find((t) => t.value === a.tipo)?.label || a.tipo}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(a.data_ocorrencia + "T12:00:00").toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground mt-1">{a.descricao}</p>
                                {a.attachment_storage_path && (
                                  <button
                                    onClick={() => handleDownloadAndamentoAttachment(a)}
                                    className="flex items-center gap-1 text-[9px] text-primary hover:underline mt-1"
                                  >
                                    <Paperclip className="h-2.5 w-2.5" />
                                    {a.attachment_file_name || "Anexo"}
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="documentos" className="mt-3 space-y-2">
                          {docsProcesso.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-4">Nenhum documento anexado pelo advogado</p>
                          ) : (
                            docsProcesso.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/20 border border-border">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-xs font-medium">{doc.file_name}</p>
                                    <p className="text-[9px] text-muted-foreground">
                                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                                      {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadProcessoDoc(doc)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="pessoais" className="mt-3 space-y-2">
                          {docsPessoais.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-4">Nenhum documento pessoal vinculado</p>
                          ) : (
                            docsPessoais.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/20 border border-border">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs font-medium">{doc.file_name}</p>
                                    <p className="text-[9px] text-muted-foreground capitalize">
                                      {(doc.categoria || "").replace("pessoal_", "").replace(/_/g, " ")}
                                      {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadProcessoDoc(doc)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>

                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── ADVOGADO VIEW ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            Processos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe todos os processos ativos e arquivados.
          </p>
        </div>
        <Button className="btn-gold text-[10px] h-9" onClick={openNewDialog}>
          <Plus className="h-3.5 w-3.5 mr-2" />
          NOVO PROCESSO
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, tipo ou cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-card border-border h-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum processo encontrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo Processo" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const status = statusConfig[p.status] || statusConfig.em_andamento;
            const StatusIcon = status.icon;
            const isExpanded = expandedProcesso === p.id;
            const andamentos = processoAndamentos[p.id] || [];
            const docs = processoDocs[p.id] || [];
            const docsProcesso = docs.filter((d: any) => !d.categoria || !d.categoria.startsWith("pessoal_"));
            const docsPessoais = docs.filter((d: any) => d.categoria && d.categoria.startsWith("pessoal_"));
            const docsRecebidos = clienteFolderDocs[p.id] || [];

            return (
              <div
                key={p.id}
                className="bg-card border border-border p-5 hover-gold-glow transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{p.numero_processo}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {tipoOptions.find((t) => t.value === p.tipo)?.label || p.tipo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase flex items-center gap-1 ${status.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleExpand(p.id)}
                        title="Documentos e Andamentos"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(p)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-[10px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {p.cliente_nome}
                  </span>
                  {p.vara && <span>Vara: <span className="text-foreground">{p.vara}</span></span>}
                  {p.comarca && <span>Comarca: <span className="text-foreground">{p.comarca}</span></span>}
                  {p.valor_causa && (
                    <span>
                      Valor:{" "}
                      <span className="text-foreground">
                        {p.valor_causa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </span>
                  )}
                  {p.ultima_movimentacao && (
                    <span>Última mov.: <span className="text-foreground">{p.ultima_movimentacao}</span></span>
                  )}
                </div>

                {/* Expanded section with tabs */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <Tabs defaultValue="andamentos">
                      <TabsList className="h-8 text-[10px]">
                        <TabsTrigger value="andamentos" className="text-[10px]">
                          <ListChecks className="h-3 w-3 mr-1" />
                          Andamentos ({andamentos.length})
                        </TabsTrigger>
                        <TabsTrigger value="documentos" className="text-[10px]">
                          <FileText className="h-3 w-3 mr-1" />
                          Documentos ({docsProcesso.length})
                        </TabsTrigger>
                        <TabsTrigger value="pessoais" className="text-[10px]">
                          <User className="h-3 w-3 mr-1" />
                          Docs Pessoais ({docsPessoais.length})
                        </TabsTrigger>
                        {p.client_profile_id && (
                          <TabsTrigger value="recebidos" className="text-[10px]">
                            <Download className="h-3 w-3 mr-1" />
                            Recebidos ({docsRecebidos.length})
                          </TabsTrigger>
                        )}
                      </TabsList>

                      {/* ANDAMENTOS TAB */}
                      <TabsContent value="andamentos" className="mt-3">
                        <div className="flex justify-end mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => openAddAndamento(p.id, p.client_profile_id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Andamento
                          </Button>
                        </div>
                        {andamentos.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 text-center py-4">Nenhum andamento registrado</p>
                        ) : (
                          <div className="space-y-2">
                            {andamentos.map((a) => (
                              <div key={a.id} className="border-l-2 border-primary/40 pl-3 py-1 group/and flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                      {andamentoTipos.find((t) => t.value === a.tipo)?.label || a.tipo}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      {new Date(a.data_ocorrencia).toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground mt-1">{a.descricao}</p>
                                  {a.attachment_storage_path && (
                                    <button
                                      onClick={() => handleDownloadAndamentoAttachment(a)}
                                      className="flex items-center gap-1 text-[9px] text-primary hover:underline mt-1"
                                    >
                                      <Paperclip className="h-2.5 w-2.5" />
                                      {a.attachment_file_name || "Anexo"}
                                    </button>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/and:opacity-100 transition-opacity ml-2">
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditAndamento(a)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setDeleteAndamentoTarget(a)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* DOCUMENTOS DO PROCESSO TAB */}
                      <TabsContent value="documentos" className="mt-3">
                        <div className="flex justify-end gap-2 mb-2">
                          {p.client_profile_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] border-primary/40 text-primary hover:bg-primary/10"
                              onClick={() => openLinkDocDialog(p)}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Vincular Doc
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            disabled={uploadingProcesso === p.id}
                            onClick={() => {
                              uploadProcessoIdRef.current = p.id;
                              fileInputRef.current?.click();
                            }}
                          >
                            {uploadingProcesso === p.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3 mr-1" />
                            )}
                            Adicionar Doc
                          </Button>
                        </div>
                        {docsProcesso.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 text-center py-4">Nenhum documento anexado</p>
                        ) : (
                          docsProcesso.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/20 border border-border mb-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-xs font-medium">{doc.file_name}</p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                                    {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadProcessoDoc(doc)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteProcessoDoc(doc)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </TabsContent>

                      {/* DOCS PESSOAIS TAB */}
                      <TabsContent value="pessoais" className="mt-3 space-y-1">
                        <div className="flex justify-end mb-2">
                          {p.client_profile_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] border-primary/40 text-primary hover:bg-primary/10"
                              onClick={() => openLinkDocDialog(p)}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Vincular Doc Pessoal
                            </Button>
                          )}
                        </div>
                        {docsPessoais.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 text-center py-4">
                            Nenhum documento pessoal vinculado
                          </p>
                        ) : (
                          docsPessoais.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/10 border border-border/50 mb-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs font-medium">{doc.file_name}</p>
                                  <p className="text-[9px] text-muted-foreground capitalize">
                                    {(doc.categoria || "").replace("pessoal_", "").replace(/_/g, " ")}
                                    {" "}• {doc.notas?.includes("manualmente") ? "vinculado manualmente" : "vinculado automaticamente"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadProcessoDoc(doc)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteProcessoDoc(doc)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </TabsContent>

                      {/* RECEBIDOS DO CLIENTE TAB */}
                      {p.client_profile_id && (
                        <TabsContent value="recebidos" className="mt-3 space-y-1">
                          <p className="text-[9px] text-muted-foreground/70 mb-2">
                            Documentos enviados pelo cliente para a pasta dele. Clique em "Vincular" para associar ao processo.
                          </p>
                          {docsRecebidos.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-4">
                              Nenhum documento recebido do cliente
                            </p>
                          ) : (
                            docsRecebidos.map((doc: any) => {
                              const alreadyLinked = (processoDocs[p.id] || []).some(
                                (d: any) => d.storage_path === doc.storage_path
                              );
                              return (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/10 border border-border/50 mb-1">
                                  <div className="flex items-center gap-2">
                                    <Download className="h-4 w-4 text-primary/60" />
                                    <div>
                                      <p className="text-xs font-medium">{doc.file_name}</p>
                                      <p className="text-[9px] text-muted-foreground capitalize">
                                        {(doc.categoria || "geral").replace(/_/g, " ")}
                                        {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                                        {" "}• {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 items-center">
                                    {alreadyLinked ? (
                                      <span className="text-[9px] text-primary px-2 py-0.5 border border-primary/30 bg-primary/10">
                                        Vinculado ✓
                                      </span>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[9px] border-primary/40 text-primary hover:bg-primary/10"
                                        onClick={async () => {
                                          const PESSOAL_CATEGORIAS = new Set([
                                            "rg", "cnh", "cpf", "passaporte", "ctps",
                                            "comprovante_residencia", "certidao_nascimento",
                                            "certidao_casamento", "certidao_obito", "identidade",
                                          ]);
                                          await supabase.from("processo_documents").insert({
                                            processo_id: p.id,
                                            file_name: doc.file_name,
                                            storage_path: doc.storage_path,
                                            file_type: doc.file_type,
                                            file_size: doc.file_size,
                                            user_id: user!.id,
                                            notas: "Vinculado manualmente da pasta do cliente",
                                            categoria: PESSOAL_CATEGORIAS.has(doc.categoria)
                                              ? `pessoal_${doc.categoria}`
                                              : doc.categoria || "geral",
                                          });
                                          toast({ title: "Documento vinculado!" });
                                          loadProcessoDocs(p.id);
                                          loadClienteFolderDocs(p.id, p.client_profile_id!);
                                        }}
                                      >
                                        <Link2 className="h-2.5 w-2.5 mr-1" />
                                        Vincular
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadProcessoDoc(doc)}>
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUploadForProcesso}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
      />

      {/* Link Client Documents Dialog */}
      <Dialog open={linkDocDialogOpen} onOpenChange={setLinkDocDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Vincular Documentos da Pasta do Cliente
            </DialogTitle>
            <DialogDescription>
              Selecione os documentos da pasta do cliente para vincular a este processo.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-1 py-2">
            {clientDocsAvailable.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Todos os documentos do cliente já estão vinculados a este processo.
              </p>
            ) : (
              clientDocsAvailable.map((doc: any) => {
                const isSelected = selectedClientDocs.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-2.5 border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-muted/10 hover:bg-muted/20"
                    }`}
                    onClick={() => {
                      setSelectedClientDocs((prev) => {
                        const next = new Set(prev);
                        if (next.has(doc.id)) next.delete(doc.id);
                        else next.add(doc.id);
                        return next;
                      });
                    }}
                  >
                    <div className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{doc.file_name}</p>
                      <p className="text-[9px] text-muted-foreground capitalize">
                        {(doc.categoria || "geral").replace(/_/g, " ")}
                        {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkDocDialogOpen(false)} disabled={linkingDocs}>
              Cancelar
            </Button>
            <Button
              className="btn-gold"
              onClick={handleLinkSelectedDocs}
              disabled={linkingDocs || selectedClientDocs.size === 0}
            >
              {linkingDocs ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-1" />
              )}
              Vincular {selectedClientDocs.size > 0 ? `(${selectedClientDocs.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Processo Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingProcesso ? "Editar Processo" : "Novo Processo"}
            </DialogTitle>
            <DialogDescription>
              {editingProcesso ? "Atualize as informações do processo." : "Cadastre um novo processo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Número do Processo *</Label>
              <Input
                value={formData.numero_processo}
                onChange={(e) => setFormData({ ...formData, numero_processo: e.target.value })}
                placeholder="0001234-56.2025.8.21.0001"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Cliente *</Label>
              <div className="space-y-2">
                {clientes.length > 0 && (
                  <Select
                    value={formData.client_profile_id || "none"}
                    onValueChange={(v) => handleClientSelect(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (digitar manualmente)</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vara</Label>
                <Input
                  value={formData.vara}
                  onChange={(e) => setFormData({ ...formData, vara: e.target.value })}
                  placeholder="3ª Vara Cível"
                />
              </div>
              <div>
                <Label>Comarca</Label>
                <Input
                  value={formData.comarca}
                  onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
                  placeholder="Porto Alegre"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor da Causa</Label>
                <Input
                  type="number"
                  value={formData.valor_causa}
                  onChange={(e) => setFormData({ ...formData, valor_causa: e.target.value })}
                  placeholder="10000.00"
                />
              </div>
              <div>
                <Label>Data de Distribuição</Label>
                <Input
                  type="date"
                  value={formData.data_distribuicao}
                  onChange={(e) => setFormData({ ...formData, data_distribuicao: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes do processo..."
                rows={3}
              />
            </div>

            {!editingProcesso && formData.client_profile_id && (
              <div className="text-[10px] text-muted-foreground bg-primary/5 border border-primary/20 px-3 py-2">
                ✓ Documentos pessoais do cliente (identidade, CPF, comprovante de residência, procuração) serão vinculados automaticamente.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-gold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingProcesso ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Andamento Create/Edit Dialog */}
      <Dialog open={andamentoDialogOpen} onOpenChange={setAndamentoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {editingAndamento ? "Editar Andamento" : "Adicionar Andamento"}
            </DialogTitle>
            <DialogDescription>
              Registre uma movimentação processual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select
                  value={andamentoForm.tipo}
                  onValueChange={(v) => setAndamentoForm({ ...andamentoForm, tipo: v })}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {andamentoTipos.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data da Ocorrência *</Label>
                <Input
                  type="date"
                  value={andamentoForm.data_ocorrencia}
                  onChange={(e) => setAndamentoForm({ ...andamentoForm, data_ocorrencia: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Textarea
                value={andamentoForm.descricao}
                onChange={(e) => setAndamentoForm({ ...andamentoForm, descricao: e.target.value })}
                placeholder="Descreva o andamento processual..."
                rows={4}
                className="mt-1"
              />
            </div>
            {!editingAndamento && (
              <div>
                <Label className="text-xs">Anexo (opcional)</Label>
                <div className="mt-1">
                  {andamentoFile ? (
                    <div className="flex items-center justify-between p-2 bg-muted/20 border border-border text-xs">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Paperclip className="h-3 w-3 text-primary" />
                        {andamentoFile.name}
                      </span>
                      <button onClick={() => setAndamentoFile(null)} className="text-muted-foreground hover:text-destructive text-[10px]">
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => andamentoFileInputRef.current?.click()}
                      className="w-full h-9 border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="h-3 w-3" />
                      Clique para anexar arquivo (PDF, DOC, imagem)
                    </button>
                  )}
                  <input
                    ref={andamentoFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setAndamentoFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAndamentoDialogOpen(false)} disabled={savingAndamento}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAndamento}
              disabled={savingAndamento || !andamentoForm.descricao.trim()}
              className="btn-gold"
            >
              {savingAndamento || uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingAndamento ? "Atualizar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Processo Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente o processo "{deleteTarget?.numero_processo}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Andamento Confirmation */}
      <AlertDialog open={!!deleteAndamentoTarget} onOpenChange={() => setDeleteAndamentoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir andamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente este andamento processual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAndamentoTarget && handleDeleteAndamento(deleteAndamentoTarget)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
