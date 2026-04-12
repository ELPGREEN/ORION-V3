import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { Settings, Save, Upload, DollarSign, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PerfilCliente from "./PerfilCliente";

interface HonorarioItem {
  id?: string;
  tipo_servico: string;
  descricao: string;
  valor: number;
  ativo: boolean;
}

const defaultHonorarios: HonorarioItem[] = [
  { tipo_servico: "consulta_inicial", descricao: "Consulta Inicial (até 1h)", valor: 200.00, ativo: true },
  { tipo_servico: "consulta_retorno", descricao: "Consulta de Retorno", valor: 150.00, ativo: true },
  { tipo_servico: "parecer_juridico", descricao: "Parecer Jurídico", valor: 500.00, ativo: true },
  { tipo_servico: "contrato_simples", descricao: "Elaboração de Contrato Simples", valor: 800.00, ativo: true },
  { tipo_servico: "contrato_complexo", descricao: "Elaboração de Contrato Complexo", valor: 1500.00, ativo: true },
  { tipo_servico: "peticao_inicial", descricao: "Petição Inicial", valor: 1200.00, ativo: true },
  { tipo_servico: "recurso", descricao: "Recurso / Apelação", valor: 1500.00, ativo: true },
  { tipo_servico: "acompanhamento_mensal", descricao: "Acompanhamento Processual Mensal", valor: 400.00, ativo: true },
];

export default function PerfilAdmin() {
  const { user } = useAuth();
  const { isAdvogado, isCliente } = useUserRole();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [honorarios, setHonorarios] = useState<HonorarioItem[]>(defaultHonorarios);
  const [perfil, setPerfil] = useState({
    nomeCompleto: user?.user_metadata?.nome || "",
    oab: "",
    email: user?.email || "",
    telefone: "",
    endereco: "",
    timbreLogo: "",
    timbrehEnderecoBase: "",
    timbreContatos: "",
  });

  useEffect(() => {
    loadHonorarios();
  }, [user]);

  useRefreshOnFocus(useCallback(() => { loadHonorarios(); }, [user]));

  // Redirect clients to their own profile page
  if (isCliente) {
    return <PerfilCliente />;
  }

  const loadHonorarios = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("honorarios_config")
      .select("*")
      .eq("user_id", user.id)
      .order("tipo_servico");

    if (data && data.length > 0) {
      setHonorarios(data.map(d => ({
        id: d.id,
        tipo_servico: d.tipo_servico,
        descricao: d.descricao || "",
        valor: Number(d.valor),
        ativo: d.ativo,
      })));
    }
  };

  const saveHonorarios = async () => {
    if (!user) return;
    setSaving(true);
    
    for (const h of honorarios) {
      if (h.id) {
        await supabase
          .from("honorarios_config")
          .update({ valor: h.valor, descricao: h.descricao, ativo: h.ativo })
          .eq("id", h.id);
      } else {
        await supabase
          .from("honorarios_config")
          .insert({
            user_id: user.id,
            tipo_servico: h.tipo_servico,
            descricao: h.descricao,
            valor: h.valor,
            ativo: h.ativo,
          });
      }
    }

    // ─── Neural: atualização de honorários = sinal administrativo ───
    logNeural({
      interaction_type: "crm_client_event",
      input_text: `Honorários atualizados (${honorarios.length} itens)`,
      output_text: honorarios.map(h => `${h.tipo_servico}: R$ ${h.valor}`).join("; "),
      quality_score: 0.8,
      user_id: user.id,
      metadata: {
        source: "perfil_admin_honorarios",
        total_items: honorarios.length,
        status_novo: "config_atualizada",
      },
    });

    toast({ title: "Honorários salvos!", description: "Valores atualizados no sistema e chat IA." });
    setSaving(false);
    loadHonorarios();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          {isAdvogado ? "Perfil & Administração" : "Meu Perfil"}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAdvogado
            ? "Configure timbre, honorários, dados do escritório e preferências."
            : "Edite seus dados pessoais e qualificação para documentos."}
        </p>
      </div>

      {/* Profile Info */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Dados Pessoais
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Nome Completo</label>
            <Input
              value={perfil.nomeCompleto}
              onChange={(e) => setPerfil({ ...perfil, nomeCompleto: e.target.value })}
              className="bg-background border-border h-10"
            />
          </div>
          {isAdvogado && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">OAB</label>
              <Input
                value={perfil.oab}
                onChange={(e) => setPerfil({ ...perfil, oab: e.target.value })}
                className="bg-background border-border h-10"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">E-mail</label>
            <Input value={perfil.email} disabled className="bg-muted border-border h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Telefone</label>
            <Input
              value={perfil.telefone}
              onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })}
              className="bg-background border-border h-10"
            />
          </div>
        </div>
      </div>

      {/* Timbre Config - Advogado only */}
      {isAdvogado && (
        <div className="bg-card border border-border p-6 space-y-4">
          <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Configuração do Timbre
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Configure o papel timbrado para documentos gerados — logo central, OAB, contatos na base com linha dourada.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Endereço (Base do Timbre)</label>
              <Input
                value={perfil.timbrehEnderecoBase}
                onChange={(e) => setPerfil({ ...perfil, timbrehEnderecoBase: e.target.value })}
                className="bg-background border-border h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Contatos (Base do Timbre)</label>
              <Input
                value={perfil.timbreContatos}
                onChange={(e) => setPerfil({ ...perfil, timbreContatos: e.target.value })}
                className="bg-background border-border h-10"
              />
            </div>
          </div>
          <Button variant="outline" className="btn-outline-gold text-[10px] h-9">
            <Upload className="h-3.5 w-3.5 mr-2" />
            Upload Logo para Timbre
          </Button>
        </div>
      )}

      {/* Honorários Config - Advogado only */}
      {isAdvogado && (
        <div className="bg-card border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Tabela de Honorários
            </h2>
            <Button
              onClick={saveHonorarios}
              disabled={saving}
              className="btn-gold text-[10px] h-8"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  SALVAR
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Valores usados no chat IA e nos formulários de pagamento Stripe. Alterações refletem dinamicamente.
          </p>

          <div className="space-y-2">
            {honorarios.map((h, i) => (
              <div
                key={h.tipo_servico}
                className="flex items-center gap-3 p-3 bg-background border border-border"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{h.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">{h.tipo_servico}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.valor}
                    onChange={(e) => {
                      const updated = [...honorarios];
                      updated[i].valor = parseFloat(e.target.value) || 0;
                      setHonorarios(updated);
                    }}
                    className="w-28 h-8 bg-card border-border text-right text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LGPD Notice */}
      <div className="bg-card border border-border p-4">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          <strong className="text-muted-foreground/80">LGPD:</strong> Seus dados são protegidos conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). 
          Você pode solicitar exportação ou exclusão dos seus dados a qualquer momento. Conformidade OAB Provimento 205/2021.
        </p>
      </div>
    </div>
  );
}
