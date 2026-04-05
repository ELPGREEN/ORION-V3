import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, Loader2, Zap, Brain, PenTool, Bot, Cpu, Plus, Trash2, UserPlus, Crown, Upload, BookOpen, Scale, X, ExternalLink, FileSignature, FileUp, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TribunalSelector } from "./TribunalSelector";
import { AreaJuridicaSelector } from "./AreaJuridicaSelector";
import { supabase } from "@/integrations/supabase/client";
import type { UploadSlot } from "@/lib/document-type-config";
import { getDocTypeConfig } from "@/lib/document-type-configs-map";
import type { FormData, DocumentType, UploadedDocument } from "@/types/document-types";
import { DocumentAnalysisPanel, type DocumentAnalysisResult } from "./DocumentAnalysisPanel";

const tomOptions = [
  { id: "formal", label: "Formal" },
  { id: "agressivo", label: "Assertivo" },
  { id: "conciliatorio", label: "Conciliatório" },
];

const watermarkOptions = [
  { id: "none", label: "Sem marca d'água" },
  { id: "confidencial", label: "Confidencial" },
  { id: "rascunho", label: "Rascunho" },
  { id: "oficial", label: "Oficial" },
];

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  triple: Crown,
  groq: Zap,
  anthropic: Brain,
  openai: Bot,
  gemini: Cpu,
  combined: Sparkles,
};

const providerDescriptions: Record<string, string> = {
  triple: "Alpha estrutura, Epsilon argumenta, Zeta revisa",
  groq: "⚡ Raciocínio Relâmpago — Motor Alpha",
  anthropic: "Motor Epsilon, raciocínio avançado",
  openai: "Motor Zeta, versátil e completo",
  gemini: "⚡ Raciocínio Relâmpago — Motor Beta",
  combined: "Epsilon gera + Zeta refina",
};

interface AIProvider {
  id: string;
  provider_name: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
  use_for: string[];
}


interface DocumentFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  selectedType: DocumentType | undefined;
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
  onSkipToEditor: () => void;
}

export function DocumentForm({
  formData,
  setFormData,
  selectedType,
  generating,
  onGenerate,
  onBack,
  onSkipToEditor,
}: DocumentFormProps) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Record<string, DocumentAnalysisResult | null>>({});
  const [analyzingSlots, setAnalyzingSlots] = useState<Set<string>>(new Set());

  // Get specialized config for this document type
  const config = getDocTypeConfig(formData.tipo);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data } = await supabase
        .from("ai_providers")
        .select("id, provider_name, display_name, is_enabled, priority, use_for")
        .eq("is_enabled", true)
        .order("priority");

      if (data) {
        const docProviders = data.filter((p) => {
          const useFor = p.use_for as unknown as string[];
          return Array.isArray(useFor) && useFor.includes("documents");
        }) as unknown as AIProvider[];

        const hasAnthropic = docProviders.some((p) => p.provider_name === "anthropic");
        const hasOpenai = docProviders.some((p) => p.provider_name === "openai");
        const hasGroq = docProviders.some((p) => p.provider_name === "groq");
        const finalProviders = [...docProviders];

        if (hasGroq && hasAnthropic && hasOpenai) {
          finalProviders.unshift({
            id: "triple-mode",
            provider_name: "triple",
            display_name: "Profissional Máximo (3-IAs)",
            is_enabled: true,
            priority: -1,
            use_for: ["documents"],
          });
        }

        if (hasAnthropic && hasOpenai) {
          finalProviders.push({
            id: "combined-mode",
            provider_name: "combined",
            display_name: "Combinado (Máximo)",
            is_enabled: true,
            priority: 0,
            use_for: ["documents"],
          });
        }

        setProviders(finalProviders);

        if (!formData.modelo && finalProviders.length > 0) {
          update("modelo", finalProviders[0].provider_name);
        }
      }
    };
    fetchProviders();
  }, []);

  const correus = formData.correus ?? [];
  const testemunhas = formData.testemunhas ?? [];

  const isJudicial = selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false;
  const update = (field: keyof FormData, value: string | boolean | any) =>
    setFormData((p) => ({ ...p, [field]: value }));

  // Helper to check if a field should be hidden
  const isHidden = (field: string) => config.hideFields.includes(field);

  // File upload handler for "melhorar-documento" and similar tools
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "docx") {
        const { extractStructuredTextFromDocx } = await import("@/lib/document/structured-text-extractor");
        const result = await extractStructuredTextFromDocx(file);
        if (result.structured && result.wordCount > 5) {
          setFormData((p) => ({ ...p, fatos: result.structured }));
          toast.success(`Documento carregado — ${result.wordCount} palavras (formatação preservada)`);
        } else {
          toast.error("Não foi possível extrair texto. Converta para .txt e tente novamente.");
        }
      } else if (ext === "doc") {
        toast.error("Formato .doc não suportado. Salve como .docx e tente novamente.");
      } else if (ext === "pdf") {
        const { extractStructuredTextFromPdf } = await import("@/lib/document/structured-text-extractor");
        const result = await extractStructuredTextFromPdf(file);
        if (result) {
          setFormData((p) => ({ ...p, fatos: result.structured }));
          toast.success(`PDF carregado — ${result.wordCount} palavras (formatação preservada)`);
        } else {
          toast.info("PDF parece ser digitalizado. Use a ferramenta OCR no chat do editor.");
        }
      } else {
        // Plain text files (.txt, .md, etc.)
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (text) {
            setFormData((p) => ({ ...p, fatos: text }));
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      toast.error("Erro ao processar arquivo. Verifique se não está corrompido.");
    }
  };

  // Consume pesquisa_contexts (array) from sessionStorage
  interface PesquisaContext {
    title: string;
    source: string;
    sourceLabel: string;
    description: string;
    url?: string;
  }
  const [importedContexts, setImportedContexts] = useState<PesquisaContext[]>([]);

  useEffect(() => {
    // New array format
    const ctxArr = sessionStorage.getItem("pesquisa_contexts");
    if (ctxArr) {
      try {
        const parsed = JSON.parse(ctxArr) as PesquisaContext[];
        if (parsed.length > 0) {
          setImportedContexts(parsed);
          sessionStorage.removeItem("pesquisa_contexts");
          // Build structured text for fatos
          const structured = parsed.map((c, i) =>
            `[${i + 1}] ${c.sourceLabel} — ${c.title}\n${c.description}${c.url ? `\nFonte: ${c.url}` : ""}`
          ).join("\n\n");
          setFormData((p) => ({
            ...p,
            fatos: p.fatos
              ? `${p.fatos}\n\n━━━ Fundamentação da Pesquisa ━━━\n${structured}`
              : `━━━ Fundamentação da Pesquisa ━━━\n${structured}`,
            incluirJurisprudencia: true,
          }));
        }
      } catch { /* ignore parse errors */ }
    }
    // Legacy single format fallback
    const ctx = sessionStorage.getItem("pesquisa_context");
    if (ctx) {
      sessionStorage.removeItem("pesquisa_context");
      setFormData((p) => ({
        ...p,
        fatos: p.fatos
          ? `${p.fatos}\n\n--- Contexto da Pesquisa Jurisprudencial ---\n${ctx}`
          : `--- Contexto da Pesquisa Jurisprudencial ---\n${ctx}`,
        incluirJurisprudencia: true,
      }));
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Selected Type Badge */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Tipo:</span>
        <span className="text-primary font-medium">{selectedType?.label}</span>
        <span className="text-[10px] text-muted-foreground/60 border border-border px-2 py-0.5 ml-1">
          {isJudicial ? "JUDICIAL" : "EXTRAJUDICIAL"}
        </span>
        {config.autoAreaJuridica && (
          <span className="text-[10px] text-primary/80 border border-primary/20 bg-primary/5 px-2 py-0.5 ml-1 uppercase">
            {config.autoAreaJuridica}
          </span>
        )}
      </div>

      {/* Area Selector - NEW */}
      <AreaJuridicaSelector
        value={formData.areaJuridica || config.autoAreaJuridica || ""}
        onChange={(val) => update("areaJuridica", val)}
        isJudicial={isJudicial}
      />

      {/* Parties - only show if config allows */}
      {(config.showParteAutora || config.showParteRe) && (
        <div className="grid md:grid-cols-2 gap-4">
          {config.showParteAutora && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground tracking-wider uppercase">
                {config.parteAutoraLabel}
              </label>
              <Input
                placeholder={config.parteAutoraPlaceholder || "Nome completo"}
                value={formData.parteAutora}
                onChange={(e) => update("parteAutora", e.target.value)}
                className="bg-card border-border h-10"
              />
              <Textarea
                placeholder={config.qualificacaoAutoraPlaceholder || "RG, CPF/CNPJ, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone (art. 319, II, CPC)"}
                value={formData.qualificacaoAutora}
                onChange={(e) => update("qualificacaoAutora", e.target.value)}
                className="bg-card border-border min-h-[70px] text-xs"
              />
            </div>
          )}
          {config.showParteRe && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground tracking-wider uppercase">
                {config.parteReLabel}
              </label>
              <Input
                placeholder={config.parteRePlaceholder || "Nome completo"}
                value={formData.parteRe}
                onChange={(e) => update("parteRe", e.target.value)}
                className="bg-card border-border h-10"
              />
              <Textarea
                placeholder={config.qualificacaoRePlaceholder || "RG, CPF/CNPJ, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone (art. 319, II, CPC)"}
                value={formData.qualificacaoRe}
                onChange={(e) => update("qualificacaoRe", e.target.value)}
                className="bg-card border-border min-h-[70px] text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Corréus / Additional Defendants (Judicial only, unless hidden) */}
      {isJudicial && !isHidden("correus") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
              Corréus / Outros Acusados
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-7 px-2"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  correus: [...(p.correus ?? []), { nome: "", qualificacao: "" }],
                }))
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
          {correus.length === 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              Nenhum corréu adicionado. Clique em "Adicionar" se houver mais acusados.
            </p>
          )}
          {correus.map((correu, idx) => (
            <div key={idx} className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Input
                placeholder={`Nome do corréu ${idx + 1}`}
                value={correu.nome}
                onChange={(e) => {
                  const updated = [...correus];
                  updated[idx] = { ...updated[idx], nome: e.target.value };
                  setFormData((p) => ({ ...p, correus: updated }));
                }}
                className="bg-card border-border h-9 text-xs"
              />
              <Input
                placeholder="CPF, qualificação, endereço..."
                value={correu.qualificacao}
                onChange={(e) => {
                  const updated = [...correus];
                  updated[idx] = { ...updated[idx], qualificacao: e.target.value };
                  setFormData((p) => ({ ...p, correus: updated }));
                }}
                className="bg-card border-border h-9 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive h-9 w-9 p-0"
                onClick={() => {
                  const updated = correus.filter((_, i) => i !== idx);
                  setFormData((p) => ({ ...p, correus: updated }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Testemunhas (Judicial only, unless hidden) */}
      {isJudicial && !isHidden("testemunhas") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
              Testemunhas
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-7 px-2"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  testemunhas: [...(p.testemunhas ?? []), { nome: "", qualificacao: "" }],
                }))
              }
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
          {testemunhas.length === 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              Nenhuma testemunha adicionada. Clique em "Adicionar" para incluir testemunhas.
            </p>
          )}
          {testemunhas.map((testemunha, idx) => (
            <div key={idx} className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Input
                placeholder={`Nome da testemunha ${idx + 1}`}
                value={testemunha.nome}
                onChange={(e) => {
                  const updated = [...testemunhas];
                  updated[idx] = { ...updated[idx], nome: e.target.value };
                  setFormData((p) => ({ ...p, testemunhas: updated }));
                }}
                className="bg-card border-border h-9 text-xs"
              />
              <Input
                placeholder="Endereço, profissão, relação com o caso..."
                value={testemunha.qualificacao}
                onChange={(e) => {
                  const updated = [...testemunhas];
                  updated[idx] = { ...updated[idx], qualificacao: e.target.value };
                  setFormData((p) => ({ ...p, testemunhas: updated }));
                }}
                className="bg-card border-border h-9 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive h-9 w-9 p-0"
                onClick={() => {
                  const updated = testemunhas.filter((_, i) => i !== idx);
                  setFormData((p) => ({ ...p, testemunhas: updated }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Extra Fields from config */}
      {config.extraFields && config.extraFields.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {config.extraFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-xs font-medium text-foreground tracking-wider uppercase">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <Textarea
                  placeholder={field.placeholder}
                  value={(formData as any)[field.key] || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="bg-card border-border min-h-[80px] text-xs"
                />
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={(formData as any)[field.key] || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="bg-card border-border h-10"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ Upload de Documentos de Referência ═══ */}
      {(() => {
        const allSlots = config.uploadSlots ?? [];
        if (allSlots.length === 0) return null;

        const handleSlotUpload = async (slot: UploadSlot, file: File) => {
          const ext = file.name.split(".").pop()?.toLowerCase();
          try {
            if (ext === "doc") {
              toast.error("Formato .doc não suportado. Salve como .docx e tente novamente.");
              return;
            }

            let text = "";

            if (ext === "docx") {
              const { extractStructuredTextFromDocx } = await import("@/lib/document/structured-text-extractor");
              const result = await extractStructuredTextFromDocx(file);
              text = result.structured;
            } else if (ext === "pdf") {
              const { extractStructuredTextFromPdf } = await import("@/lib/document/structured-text-extractor");
              const result = await extractStructuredTextFromPdf(file);
              if (!result) {
                toast.info("PDF parece ser digitalizado. Use a ferramenta OCR no chat do editor.");
                return;
              }
              text = result.structured;
            } else {
              // Plain text files (.txt, .md, etc.)
              text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
              });
            }

            if (!text || text.length < 20) {
              toast.error("Não foi possível extrair texto suficiente do arquivo.");
              return;
            }

            const newDoc: UploadedDocument = {
              key: slot.key,
              fileName: file.name,
              content: text,
              promptRole: slot.promptRole,
            };

            setFormData((p) => ({
              ...p,
              uploadedDocuments: [
                ...(p.uploadedDocuments ?? []).filter((d) => d.key !== slot.key),
                newDoc,
              ],
            }));
            toast.success(`"${file.name}" carregado com sucesso!`);

            // Trigger Deep Learning analysis
            setAnalyzingSlots(prev => new Set(prev).add(slot.key));
            try {
              const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-reference-doc", {
                body: {
                  content: text.substring(0, 15000),
                  fileName: file.name,
                  promptRole: slot.promptRole,
                  documentType: formData.tipo,
                },
              });
              if (!analysisError && analysisData && !analysisData.error) {
                setAnalysisResults(prev => ({ ...prev, [slot.key]: analysisData }));
                // Store analysis in formData for prompt enrichment
                setFormData(p => ({
                  ...p,
                  documentAnalyses: { ...(p as any).documentAnalyses, [slot.key]: analysisData },
                }));
                toast.success("Análise profunda concluída!");
              }
            } catch (err) {
            } finally {
              setAnalyzingSlots(prev => { const n = new Set(prev); n.delete(slot.key); return n; });
            }
          } catch (err) {
            toast.error("Erro ao processar arquivo.");
          }
        };

        const removeSlotDoc = (key: string) => {
          setFormData((p) => ({
            ...p,
            uploadedDocuments: (p.uploadedDocuments ?? []).filter((d) => d.key !== key),
          }));
        };

        return (
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase flex items-center gap-1.5">
              <FileUp className="h-3.5 w-3.5" />
              Documentos de Referência para Análise
            </label>
            <p className="text-[10px] text-muted-foreground">
              A Rede Neural analisará estes documentos antes de gerar a peça.
            </p>
            <div className="grid gap-2">
              {allSlots.map((slot) => {
                const uploaded = (formData.uploadedDocuments ?? []).find((d) => d.key === slot.key);
                const inputId = `upload-slot-${slot.key}`;

                return (
                  <div
                    key={slot.key}
                    className={`border rounded-lg p-3 transition-all ${
                      uploaded
                        ? "border-primary/40 bg-primary/5"
                        : slot.required
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {uploaded ? (
                            <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs font-medium text-foreground truncate">
                            {slot.label}
                          </span>
                          {slot.required && !uploaded && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-5">
                          {slot.description}
                        </p>
                      </div>

                      {uploaded ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-7 w-7 p-0 shrink-0"
                          onClick={() => removeSlotDoc(slot.key)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <>
                          <label
                            htmlFor={inputId}
                            className="cursor-pointer shrink-0 inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <Upload className="h-3 w-3" />
                            Upload
                          </label>
                          <input
                            id={inputId}
                            type="file"
                            accept={slot.accept}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleSlotUpload(slot, f);
                              e.target.value = "";
                            }}
                          />
                        </>
                      )}
                    </div>

                    {/* Preview of uploaded content */}
                    {uploaded && (
                      <div className="mt-2 ml-5">
                        <div className="flex items-center gap-1.5 text-[10px] text-primary mb-1">
                          <CheckCircle className="h-3 w-3" />
                          <span className="font-medium truncate">{uploaded.fileName}</span>
                          <span className="text-muted-foreground">
                            ({Math.round(uploaded.content.length / 1000)}k caracteres)
                          </span>
                        </div>
                        <div className="bg-muted/50 border border-border rounded p-2 text-[10px] text-muted-foreground font-mono max-h-20 overflow-hidden relative">
                          {uploaded.content.substring(0, 300)}
                          {uploaded.content.length > 300 && (
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/80 to-transparent" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deep Learning Analysis Panel */}
                    {(uploaded || analyzingSlots.has(slot.key)) && (
                      <DocumentAnalysisPanel
                        analysis={analysisResults[slot.key] || null}
                        loading={analyzingSlots.has(slot.key)}
                        fileName={uploaded?.fileName || ""}
                        onReanalyze={uploaded ? () => {
                          setAnalyzingSlots(prev => new Set(prev).add(slot.key));
                          supabase.functions.invoke("analyze-reference-doc", {
                            body: {
                              content: uploaded.content.substring(0, 15000),
                              fileName: uploaded.fileName,
                              promptRole: slot.promptRole,
                              documentType: formData.tipo,
                            },
                          }).then(({ data }) => {
                            if (data && !data.error) {
                              setAnalysisResults(prev => ({ ...prev, [slot.key]: data }));
                              setFormData(p => ({
                                ...p,
                                documentAnalyses: { ...(p as any).documentAnalyses, [slot.key]: data },
                              }));
                            }
                          }).finally(() => {
                            setAnalyzingSlots(prev => { const n = new Set(prev); n.delete(slot.key); return n; });
                          });
                        } : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Imported Research Contexts as Visual Cards */}
      {importedContexts.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground tracking-wider uppercase flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Pesquisa Vinculada ({importedContexts.length})
          </label>
          <div className="grid gap-2">
            {importedContexts.map((ctx, i) => (
              <div key={i} className="bg-muted/30 border border-dashed border-border rounded p-3 text-xs flex gap-2">
                <Scale className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{ctx.title}</div>
                  <div className="text-muted-foreground truncate">{ctx.sourceLabel}</div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => {
                  const newCtx = importedContexts.filter((_, idx) => idx !== i);
                  setImportedContexts(newCtx);
                  // Rebuild fatos text
                  if (newCtx.length === 0) {
                    setFormData(p => ({ ...p, fatos: p.fatos?.split("━━━ Fundamentação")[0].trim() || "" }));
                  } else {
                    const structured = newCtx.map((c, idx) =>
                      `[${idx + 1}] ${c.sourceLabel} — ${c.title}\n${c.description}${c.url ? `\nFonte: ${c.url}` : ""}`
                    ).join("\n\n");
                    setFormData(p => ({
                      ...p,
                      fatos: `${p.fatos?.split("━━━ Fundamentação")[0].trim()}\n\n━━━ Fundamentação da Pesquisa ━━━\n${structured}`
                    }));
                  }
                }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Tribunal Selector */}
        {isJudicial && !isHidden("tribunal") && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
              Tribunal / Foro
            </label>
            <TribunalSelector
              tribunalId={formData.tribunalId}
              tipoVara={formData.tipoVara}
              comarca={formData.comarca}
              numeroVara={formData.numeroVara}
              onTribunalChange={(val) => update("tribunalId", val)}
              onTipoVaraChange={(val) => update("tipoVara", val)}
              onComarcaChange={(val) => update("comarca", val)}
              onNumeroVaraChange={(val) => update("numeroVara", val)}
              isJudicial={isJudicial}
            />
          </div>
        )}

        {/* Comarca / Vara — only show standalone when TribunalSelector is hidden */}
        {isJudicial && !isHidden("comarca") && isHidden("tribunal") && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
              Comarca / Vara
            </label>
            <Input
              placeholder="Ex: Porto Alegre, 1ª Vara Cível"
              value={formData.comarca}
              onChange={(e) => update("comarca", e.target.value)}
              className="bg-card border-border h-10"
            />
          </div>
        )}
      </div>

      {/* Facts / Description (The main input) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground tracking-wider uppercase flex items-center gap-2">
            <PenTool className="h-3.5 w-3.5" />
            Fatos e Argumentos (ou cole sua petição aqui)
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="file-upload" className="cursor-pointer text-[10px] text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-1 rounded border border-primary/10 hover:bg-primary/10 transition-colors">
              <Upload className="h-3 w-3" />
              Carregar Arquivo (.docx/.txt)
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        <Textarea
          placeholder="Descreva os fatos detalhadamente, cole ementas de jurisprudência ou o texto que você já escreveu para ser aprimorado..."
          value={formData.fatos}
          onChange={(e) => update("fatos", e.target.value)}
          className="bg-card border-border min-h-[200px] font-mono text-sm leading-relaxed"
        />
      </div>

      {/* Generation Options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Modelo IA</label>
          <select
            className="w-full h-8 text-xs bg-card border border-border rounded px-2"
            value={formData.modelo}
            onChange={(e) => update("modelo", e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.provider_name} value={p.provider_name}>
                {p.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tom de Voz</label>
          <select
            className="w-full h-8 text-xs bg-card border border-border rounded px-2"
            value={formData.tom}
            onChange={(e) => update("tom", e.target.value)}
          >
            {tomOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Marca D'água</label>
          <select
            className="w-full h-8 text-xs bg-card border border-border rounded px-2"
            value={formData.watermark}
            onChange={(e) => update("watermark", e.target.value)}
          >
            {watermarkOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs cursor-pointer h-8 px-1">
            <input
              type="checkbox"
              checked={formData.incluirJurisprudencia}
              onChange={(e) => update("incluirJurisprudencia", e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Incluir Jurisprudência</span>
          </label>
        </div>
      </div>

      {/* Provider Description */}
      {formData.modelo && providerDescriptions[formData.modelo] && (() => {
        const IconComp = providerIcons[formData.modelo];
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
            {IconComp && <IconComp className="h-3.5 w-3.5 text-primary" />}
            <span>{providerDescriptions[formData.modelo]}</span>
          </div>
        );
      })()}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} disabled={generating} className="w-full">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button 
          onClick={onGenerate} 
          disabled={generating || !formData.fatos?.trim()} 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando com IA...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Documento
            </>
          )}
        </Button>
      </div>
      
      {/* Skip Button (if user just wants to use the editor) */}
      <div className="flex justify-center">
        <button 
          onClick={onSkipToEditor}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <FileSignature className="h-3 w-3" />
          Pular para o editor em branco
        </button>
      </div>
    </div>
  );
}
