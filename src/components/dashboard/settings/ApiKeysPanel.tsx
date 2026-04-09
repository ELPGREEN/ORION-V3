import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encryptContent } from "@/lib/crypto/user-encryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Check, Trash2, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", placeholder: "AIza...", color: "text-blue-400" },
  { id: "groq", label: "Groq", placeholder: "gsk_...", color: "text-orange-400" },
  { id: "openai", label: "OpenAI", placeholder: "sk-...", color: "text-green-400" },
  { id: "mistral", label: "Mistral", placeholder: "...", color: "text-purple-400" },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", color: "text-amber-400" },
  { id: "huggingface", label: "HuggingFace", placeholder: "hf_...", color: "text-yellow-400" },
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
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
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
      toast.success(`Chave ${provider.toUpperCase()} salva com sucesso!`);
      await loadKeys();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSavingProvider(null);
    }
  }

  function clearInput(provider: string) {
    // Soft "delete": key stays active in DB, just clears UI so user can enter a new one
    setInputs(prev => ({ ...prev, [provider]: "" }));
    toast.info(`Campo liberado para nova chave ${provider.toUpperCase()}. A chave anterior continua ativa até ser substituída.`);
  }

  function maskKey(key: string) {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            Minhas Chaves API
          </CardTitle>
          <CardDescription>
            Cadastre suas próprias chaves para usar com o Orion. Sem chave cadastrada, o sistema usa as chaves compartilhadas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Chaves são criptografadas com AES-256 antes de salvar. Apenas seu usuário pode descriptografá-las.
            </p>
          </div>

          {PROVIDERS.map(p => {
            const saved = savedKeys.find(k => k.provider === p.id);
            const inputVal = inputs[p.id] || "";
            const isVisible = showKey[p.id];

            return (
              <div key={p.id} className="flex flex-col gap-2 p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center justify-between">
                  <Label className={`font-medium ${p.color}`}>{p.label}</Label>
                  {saved ? (
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                      <Check className="h-3 w-3 mr-1" /> Sua chave ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" /> Usando chave do sistema
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      placeholder={saved ? "••••••••••••" : p.placeholder}
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
                    className="shrink-0"
                  >
                    {savingProvider === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>

                  {saved && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteKey(p.id)}
                      disabled={deletingProvider === p.id}
                      className="shrink-0"
                    >
                      {deletingProvider === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
