import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encryptContent } from "@/lib/crypto/user-encryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Key, Check, Trash2, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle,
  ExternalLink, Zap, Battery, ChevronDown, ChevronUp, RefreshCw, Sparkles
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    placeholder: "AIza...",
    color: "text-blue-400",
    guideUrl: "https://aistudio.google.com/app/apikey",
    steps: [
      "Acesse o Google AI Studio no link abaixo",
      'Clique em "Create API Key"',
      "Selecione ou crie um projeto Google Cloud",
      "Copie a chave gerada e cole aqui",
    ],
    tip: "Gratuito! Gemini oferece modelos poderosos sem custo. Ideal para começar.",
  },
  {
    id: "groq",
    label: "Groq",
    placeholder: "gsk_...",
    color: "text-orange-400",
    guideUrl: "https://console.groq.com/keys",
    steps: [
      "Crie uma conta em console.groq.com",
      'Vá em "API Keys" no menu lateral',
      'Clique em "Create API Key"',
      "Copie a chave e cole aqui",
    ],
    tip: "Ultra-rápido! Groq oferece inferência acelerada com free tier generoso.",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    color: "text-green-400",
    guideUrl: "https://platform.openai.com/api-keys",
    steps: [
      "Acesse platform.openai.com e faça login",
      'Vá em "API Keys" no menu',
      'Clique em "Create new secret key"',
      "Copie imediatamente — ela só aparece uma vez!",
    ],
    tip: "GPT-4o e Whisper. Requer plano pago da OpenAI.",
  },
  {
    id: "mistral",
    label: "Mistral",
    placeholder: "...",
    color: "text-purple-400",
    guideUrl: "https://console.mistral.ai/api-keys",
    steps: [
      "Acesse console.mistral.ai",
      'Vá em "API Keys"',
      'Clique em "Create new key"',
      "Copie e cole aqui",
    ],
    tip: "Modelos europeus de alta qualidade com free tier.",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    color: "text-amber-400",
    guideUrl: "https://console.anthropic.com/settings/keys",
    steps: [
      "Acesse console.anthropic.com",
      'Vá em "Settings" → "API Keys"',
      'Clique em "Create Key"',
      "Copie e cole aqui",
    ],
    tip: "Claude 3.5 Sonnet — excelente para análise e redação.",
  },
  {
    id: "huggingface",
    label: "HuggingFace",
    placeholder: "hf_...",
    color: "text-yellow-400",
    guideUrl: "https://huggingface.co/settings/tokens",
    steps: [
      "Acesse huggingface.co e faça login",
      'Vá em "Settings" → "Access Tokens"',
      'Clique em "New token"',
      'Selecione permissão "Read" e copie',
    ],
    tip: "Acesso a milhares de modelos open-source. Free tier disponível.",
  },
];

interface SavedKey {
  id: string;
  provider: string;
  is_active: boolean;
  label: string;
  updated_at: string;
}

export default function ApiKeysPanel() {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [expandedGuide, setExpandedGuide] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("user_api_keys")
      .select("id, provider, is_active, label, updated_at")
      .eq("user_id", user.id);

    setSavedKeys(data || []);
    setLoading(false);
  }

  async function saveKey(provider: string) {
    const rawKey = inputs[provider]?.trim();
    if (!rawKey || !userId) return;

    setSavingProvider(provider);
    try {
      const { ciphertext, iv } = await encryptContent(userId, rawKey);

      const existing = savedKeys.find(k => k.provider === provider);
      if (existing) {
        await supabase
          .from("user_api_keys")
          .update({ encrypted_key: ciphertext, iv, is_active: true, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_api_keys")
          .insert({ user_id: userId, provider, encrypted_key: ciphertext, iv, label: provider.toUpperCase() });
      }

      setInputs(prev => ({ ...prev, [provider]: "" }));
      toast.success(`Chave ${provider.toUpperCase()} ativada com sucesso! 🔋`);
      await loadKeys();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSavingProvider(null);
    }
  }

  function clearInput(provider: string) {
    setInputs(prev => ({ ...prev, [provider]: "" }));
    toast.info(`Campo liberado para nova chave ${provider.toUpperCase()}. A chave anterior continua ativa até ser substituída.`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = savedKeys.filter(k => k.is_active).length;

  return (
    <div className="space-y-6">
      {/* Hero / CTA Banner */}
      <Card className="bg-gradient-to-br from-primary/10 via-card to-primary/5 border-primary/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Battery className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Coloque bateria no seu Orion
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Use como quiser — sem limites, sem filas, velocidade máxima
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-primary" />
              Visão, Voz, Chat — tudo turbinado
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Criptografia AES-256 de ponta a ponta
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                <Battery className="h-3 w-3" />
                {activeCount} {activeCount === 1 ? "chave ativa" : "chaves ativas"}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Orion Activation Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">⚡ Ativação instantânea do Orion</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao adicionar uma chave de API, o <strong>Orion é ativado imediatamente</strong> — mesmo sem assinatura paga.
            Sua chave alimenta o Orion diretamente, sem intermediários.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se você remover a chave ou ela expirar, o Orion será desativado por essa via.
            Porém, <strong>a ativação via assinatura premium continua funcionando normalmente</strong> — são dois caminhos independentes.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Resumindo: <span className="text-primary">Chave API = Orion ligado</span>. Sem chave + sem assinatura = Orion no modo compartilhado.
          </p>
        </div>
      </div>

      {/* Security Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/40">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Segurança de nível bancário</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Suas chaves são criptografadas com <strong>AES-256-GCM</strong> diretamente no seu navegador antes de serem salvas.
            Ninguém — nem mesmo nossa equipe — consegue ler suas chaves. Apenas seu usuário autenticado pode descriptografá-las.
            Uma vez ativada, a chave permanece segura e funcional. Você pode substituí-la ou excluí-la quando quiser.
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          Provedores disponíveis
        </h3>

        {PROVIDERS.map(p => {
          const saved = savedKeys.find(k => k.provider === p.id);
          const inputVal = inputs[p.id] || "";
          const isVisible = showKey[p.id];
          const isGuideOpen = expandedGuide[p.id];

          return (
            <Card key={p.id} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Label className={`font-semibold text-sm ${p.color}`}>{p.label}</Label>
                  {saved ? (
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary gap-1">
                      <Check className="h-3 w-3" /> Ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <AlertCircle className="h-3 w-3" /> Sistema
                    </Badge>
                  )}
                </div>

                {/* Tip */}
                <p className="text-xs text-muted-foreground">{p.tip}</p>

                {/* Guide Collapsible */}
                <Collapsible
                  open={isGuideOpen}
                  onOpenChange={() => setExpandedGuide(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8 text-muted-foreground hover:text-foreground">
                      <span>📋 Como obter sua chave</span>
                      {isGuideOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                        {p.steps.map((step, i) => (
                          <li key={i} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                      <a
                        href={p.guideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ir para {p.label} — obter chave
                      </a>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      placeholder={saved ? "••••••••••••  (chave ativa — cole nova para substituir)" : p.placeholder}
                      value={inputVal}
                      onChange={e => setInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => saveKey(p.id)}
                    disabled={!inputVal || savingProvider === p.id}
                    className="shrink-0 gap-1"
                  >
                    {savingProvider === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <><RefreshCw className="h-3.5 w-3.5" /> Substituir</>
                    ) : (
                      <><Zap className="h-3.5 w-3.5" /> Ativar</>
                    )}
                  </Button>

                  {saved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearInput(p.id)}
                      className="shrink-0"
                      title="Limpar campo para nova chave"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground/60 text-center px-4">
        Sem chave cadastrada, o Orion usa o sistema compartilhado automaticamente.
        Adicione suas chaves para ter acesso prioritário, sem filas e sem limites de uso.
      </p>
    </div>
  );
}
