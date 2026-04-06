/**
 * OrionAccessGate — Conversational gate for Orion access control
 * Shows a mini-chat with Orion explaining access requirements
 * Modes: not_logged | not_premium | blocked
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, UserPlus, ShieldCheck, Sparkles, Mic, Eye, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlasmaCore } from "@/components/home/PlasmaCore";

type GateMode = "not_logged" | "not_premium" | "blocked";

interface OrionAccessGateProps {
  mode: GateMode;
  onClose?: () => void;
  /** If true, renders as overlay inside parent container */
  inline?: boolean;
}

const MESSAGES: Record<GateMode, { intro: string; question: string; benefits: string[] }> = {
  not_logged: {
    intro: "Olá! Eu sou o Orion, seu assistente com inteligência artificial avançada. Para que eu possa te ajudar com visão computacional, análise profunda e comandos de voz, você precisa criar sua conta na plataforma.",
    question: "Gostaria de fazer seu cadastro agora?",
    benefits: [
      "Comando de voz inteligente",
      "Visão computacional com IA",
      "Análise profunda de documentos",
      "Assistente jurídico personalizado",
    ],
  },
  not_premium: {
    intro: "Este recurso é exclusivo para assinantes Premium. Com um plano ativo, você desbloqueia todo o potencial do Orion: visão computacional em tempo real, análise profunda de páginas e painéis, e muito mais.",
    question: "Quer que eu te direcione para os planos de assinatura?",
    benefits: [
      "Visão neural em tempo real",
      "Análise profunda com IA",
      "Comandos de voz avançados",
      "Suporte prioritário",
    ],
  },
  blocked: {
    intro: "Desculpe, mas esta funcionalidade está disponível apenas para usuários cadastrados na plataforma.",
    question: "Posso te redirecionar para o cadastro?",
    benefits: [],
  },
};

function speakText(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1.30;
  utterance.pitch = 0.95;
  // Try to pick a good pt-BR voice
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith("pt") && v.name.toLowerCase().includes("google")) 
    || voices.find(v => v.lang.startsWith("pt"));
  if (ptVoice) utterance.voice = ptVoice;
  window.speechSynthesis.speak(utterance);
}

export function OrionAccessGate({ mode, onClose, inline = false }: OrionAccessGateProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "question" | "declined">("intro");
  const messages = MESSAGES[mode];

  // Speak intro on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speakText(messages.intro);
    }, 600);

    const questionTimer = setTimeout(() => {
      setStep("question");
      speakText(messages.question);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(questionTimer);
      window.speechSynthesis?.cancel();
    };
  }, [messages.intro, messages.question]);

  // Auto-redirect after declining (15s)
  useEffect(() => {
    if (step !== "declined") return;
    const timer = setTimeout(() => {
      if (mode === "not_logged" || mode === "blocked") {
        navigate("/cadastro");
      } else {
        navigate("/dashboard/plano");
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [step, mode, navigate]);

  const handleAccept = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (mode === "not_logged" || mode === "blocked") {
      navigate("/cadastro");
    } else {
      navigate("/dashboard/plano");
    }
    onClose?.();
  }, [mode, navigate, onClose]);

  const handleDecline = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStep("declined");
    const declineMsg = mode === "not_logged" || mode === "blocked"
      ? "Desculpe, mas estou disponível apenas para usuários cadastrados. Vou te redirecionar para o cadastro em instantes."
      : "Sem problemas! Mas lembre-se que os recursos premium fazem toda a diferença. Vou te redirecionar aos planos em instantes.";
    speakText(declineMsg);
  }, [mode]);

  const iconForMode = mode === "not_premium" ? Crown : mode === "not_logged" ? UserPlus : ShieldCheck;
  const Icon = iconForMode;

  const containerClass = inline
    ? "w-full h-full flex items-center justify-center p-4"
    : "fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md";

  return (
    <div className={containerClass}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-card border border-border/50 rounded-2xl shadow-2xl max-w-md w-[95vw] overflow-hidden"
      >
        {/* Plasma Header */}
        <div className="relative bg-gradient-to-b from-primary/10 to-transparent p-6 pb-4 flex flex-col items-center gap-3">
          <div className="relative w-16 h-16">
            <PlasmaCore className="w-full h-full" />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.3em] text-primary/70 uppercase">
              Orion IA
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="px-6 pb-4 space-y-4">
          {/* Intro message */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-muted/50 rounded-xl rounded-tl-sm p-4 text-sm text-foreground/90 leading-relaxed"
          >
            {messages.intro}
          </motion.div>

          {/* Benefits grid */}
          {messages.benefits.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-2"
            >
              {messages.benefits.map((b, i) => {
                const icons = [Mic, Eye, Brain, Crown];
                const BIcon = icons[i % icons.length];
                return (
                  <div key={b} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <BIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px] text-foreground/80">{b}</span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Question */}
          <AnimatePresence>
            {(step === "question" || step === "declined") && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="bg-muted/50 rounded-xl rounded-tl-sm p-4 text-sm text-foreground/90"
              >
                {step === "question" ? messages.question : (
                  mode === "not_logged" || mode === "blocked"
                    ? "Entendi. Vou te redirecionar para o cadastro em instantes..."
                    : "Sem problemas. Redirecionando aos planos em instantes..."
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          {step === "question" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3"
            >
              <Button variant="outline" className="flex-1" onClick={handleDecline}>
                Agora não
              </Button>
              <Button className="flex-1 btn-gold shimmer" onClick={handleAccept}>
                <Icon className="h-4 w-4 mr-2" />
                {mode === "not_premium" ? "Ver Planos" : "Cadastrar"}
              </Button>
            </motion.div>
          )}

          {/* Declined — countdown hint */}
          {step === "declined" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  className="h-full bg-primary/50 rounded-full"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Redirecionando automaticamente...
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
