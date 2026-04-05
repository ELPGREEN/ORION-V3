import { useState } from "react";
import { Plus, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientSearchSelect } from "@/components/dashboard/ClientSearchSelect";

interface NewProcessoDialogProps {
  onCreated: () => void;
}

const tiposProcesso = [
  "Ação Indenizatória",
  "Ação de Cobrança",
  "Reclamação Trabalhista",
  "Ação de Divórcio",
  "Ação Penal",
  "Mandado de Segurança",
  "Habeas Corpus",
  "Ação Civil Pública",
  "Execução Fiscal",
  "Outro",
];

export default function NewProcessoDialog({ onCreated }: NewProcessoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero_processo: "",
    tipo: "",
    client_profile_id: "",
    cliente_nome: "",
    vara: "",
    comarca: "",
    descricao: "",
    valor_causa: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const handleClientSelect = (clientId: string | null, client: any) => {
    setFormData({
      ...formData,
      client_profile_id: clientId || "",
      cliente_nome: client?.nome || "",
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.numero_processo || !formData.tipo || !formData.cliente_nome) {
      toast({
        title: "Erro",
        description: "Número do processo, tipo e nome do cliente são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("processos").insert({
        user_id: user.id,
        numero_processo: formData.numero_processo,
        tipo: formData.tipo,
        client_profile_id: formData.client_profile_id || null,
        cliente_nome: formData.cliente_nome,
        vara: formData.vara || null,
        comarca: formData.comarca || null,
        descricao: formData.descricao || null,
        valor_causa: formData.valor_causa ? parseFloat(formData.valor_causa) : null,
        status: "em_andamento",
      }).select().single();

      if (error) throw error;

      // Auto-link ALL client documents to the new processo
      if (formData.client_profile_id && data) {
        const { data: clientDocs } = await supabase
          .from("client_documents")
          .select("*")
          .eq("client_profile_id", formData.client_profile_id);

        if (clientDocs && clientDocs.length > 0) {
          const PESSOAL_CATEGORIAS = new Set([
            "rg", "cnh", "cpf", "passaporte", "ctps",
            "comprovante_residencia", "certidao_nascimento", "certidao_casamento", "certidao_obito",
            "identidade",
          ]);
          const toInsert = clientDocs.map((doc: any) => ({
            processo_id: (data as any).id,
            file_name: doc.file_name,
            storage_path: doc.storage_path,
            file_type: doc.file_type,
            file_size: doc.file_size,
            user_id: user.id,
            notas: "Documento vinculado automaticamente",
            categoria: PESSOAL_CATEGORIAS.has(doc.categoria)
              ? `pessoal_${doc.categoria}`
              : doc.categoria || "geral",
          }));

          // Avoid duplicates: only insert if not already linked
          for (const insert of toInsert) {
            const { data: existing } = await supabase
              .from("processo_documents")
              .select("id")
              .eq("processo_id", insert.processo_id)
              .eq("storage_path", insert.storage_path)
              .maybeSingle();
            if (!existing) {
              await supabase.from("processo_documents").insert(insert);
            }
          }
        }
      }

      toast({
        title: "Processo cadastrado!",
        description: `Processo ${formData.numero_processo} foi adicionado.`,
      });

      setFormData({
        numero_processo: "",
        tipo: "",
        client_profile_id: "",
        cliente_nome: "",
        vara: "",
        comarca: "",
        descricao: "",
        valor_causa: "",
      });
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível cadastrar o processo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gold text-[10px] h-9">
          <Plus className="h-3.5 w-3.5 mr-2" />
          NOVO PROCESSO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-serif">
            <FileText className="h-5 w-5 text-primary" />
            Cadastrar Novo Processo
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do processo judicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs">Número do Processo *</Label>
              <Input
                value={formData.numero_processo}
                onChange={(e) =>
                  setFormData({ ...formData, numero_processo: e.target.value })
                }
                placeholder="0001234-56.2025.8.21.0001"
                className="h-9 mt-1 font-mono text-xs"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Tipo de Processo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposProcesso.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <ClientSearchSelect
                value={formData.client_profile_id || null}
                onSelect={handleClientSelect}
                label="Cliente *"
                allowClear={true}
              />
            </div>

            <div>
              <Label className="text-xs">Vara</Label>
              <Input
                value={formData.vara}
                onChange={(e) =>
                  setFormData({ ...formData, vara: e.target.value })
                }
                placeholder="3ª Vara Cível"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Comarca</Label>
              <Input
                value={formData.comarca}
                onChange={(e) =>
                  setFormData({ ...formData, comarca: e.target.value })
                }
                placeholder="Porto Alegre"
                className="h-9 mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Valor da Causa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_causa}
                onChange={(e) =>
                  setFormData({ ...formData, valor_causa: e.target.value })
                }
                placeholder="0,00"
                className="h-9 mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Breve descrição do processo..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="btn-gold" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
