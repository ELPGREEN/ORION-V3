import { useState, useCallback } from "react";
import { Plus, Loader2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCNPJ } from "@/lib/api";

interface NewContactDialogProps {
  onCreated: () => void;
}

export default function NewContactDialog({ onCreated }: NewContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    empresa: "",
    telefone: "",
    cnpj: "",
    notas: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCnpjBlur = useCallback(async () => {
    const cnpj = formData.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const d = await fetchCNPJ(cnpj);
      setFormData((prev) => ({
        ...prev,
        empresa: prev.empresa || d.razao_social || d.nome_fantasia || "",
        email: prev.email || d.email || "",
        telefone: prev.telefone || d.telefone || "",
      }));
      toast({ title: "CNPJ encontrado", description: d.razao_social || d.nome_fantasia });
    } catch {
      /* silently ignore */
    }
    setLoadingCnpj(false);
  }, [formData.cnpj, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.nome || !formData.email) {
      toast({
        title: "Erro",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      name: formData.nome,
      email: formData.email,
      company: formData.empresa || null,
      message: formData.notas || formData.telefone || "",
    });

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: "Erro ao criar contato.", variant: "destructive" });
    } else {
      toast({ title: "Contato criado!", description: formData.nome });
      setFormData({ nome: "", email: "", empresa: "", telefone: "", cnpj: "", notas: "" });
      setOpen(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gold text-[10px] h-9">
          <Plus className="h-3.5 w-3.5 mr-2" />
          NOVO CONTATO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Contato</DialogTitle>
          <DialogDescription className="sr-only">Preencha os dados do novo contato</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome completo"
              className="h-9"
              required
            />
          </div>
          <div>
            <Label className="text-xs">E-mail *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              className="h-9"
              required
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" />
              CNPJ (preenche empresa)
            </Label>
            <div className="relative">
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="h-9"
              />
              {loadingCnpj && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-2.5 text-primary" />}
            </div>
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              placeholder="Preenchido via CNPJ"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observações sobre o contato..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="btn-gold" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Criar Contato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
