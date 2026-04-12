import { useState, useRef } from "react";
import { Star, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

interface AvaliacaoFormProps {
  onSuccess?: () => void;
}

export function AvaliacaoForm({ onSuccess }: AvaliacaoFormProps) {
  const { user } = useAuth();
  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [nome, setNome] = useState(user?.user_metadata?.nome || "");
  const [depoimento, setDepoimento] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas imagens.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setFotoUrl(publicUrl.publicUrl);
      toast.success("Foto enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado.");
      return;
    }

    if (nota === 0) {
      toast.error("Por favor, selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    if (!nome.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    if (!depoimento.trim()) {
      toast.error("Por favor, escreva seu depoimento.");
      return;
    }

    if (depoimento.trim().length < 20) {
      toast.error("O depoimento deve ter pelo menos 20 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("avaliacoes").insert({
        user_id: user.id,
        nome: nome.trim(),
        nota,
        depoimento: depoimento.trim(),
        foto_url: fotoUrl,
      });

      if (error) throw error;

      // ─── Neural Feedback: registra avaliação no pipeline RLHF ───
      void(0); // logNeural({
        interaction_type: "avaliacao",
        input_text: `Avaliação de ${nome.trim()} — ${nota} estrelas`,
        output_text: depoimento.trim(),
        quality_score: nota / 5,
        user_id: user.id,
        metadata: { nota, nome: nome.trim(), aprovado: false, source: "avaliacao_form" },
      });

      setSubmitted(true);
      toast.success("Avaliação enviada! Aguarde aprovação para aparecer no site.");
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card border border-primary/20 p-8 text-center animate-fade-in">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-serif text-foreground mb-2">
          Obrigado pela sua avaliação!
        </h3>
        <p className="text-sm text-muted-foreground">
          Sua avaliação foi enviada e será exibida no site após aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border p-6 space-y-6 animate-fade-in">
      <div className="text-center">
        <h3 className="text-lg font-serif text-foreground mb-1">
          Avalie nossos serviços
        </h3>
        <p className="text-sm text-muted-foreground">
          Sua opinião é muito importante para nós
        </p>
      </div>

      {/* Estrelas */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setNota(star)}
            onMouseEnter={() => setHoverNota(star)}
            onMouseLeave={() => setHoverNota(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoverNota || nota)
                  ? "text-primary fill-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Foto (opcional) */}
      <div className="flex flex-col items-center gap-3">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-20 w-20 border-2 border-dashed border-border rounded-full flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
        >
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt="Sua foto"
              className="w-full h-full object-cover"
            />
          ) : uploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Adicionar foto (opcional)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="nome">Seu nome</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como você gostaria de ser chamado"
          maxLength={100}
        />
      </div>

      {/* Depoimento */}
      <div className="space-y-2">
        <Label htmlFor="depoimento">Seu depoimento</Label>
        <Textarea
          id="depoimento"
          value={depoimento}
          onChange={(e) => setDepoimento(e.target.value)}
          placeholder="Conte como foi sua experiência com nossos serviços..."
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {depoimento.length}/500
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || nota === 0 || !nome.trim() || !depoimento.trim()}
        className="w-full btn-gold"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar Avaliação"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Sua avaliação será publicada após aprovação
      </p>
    </div>
  );
}
