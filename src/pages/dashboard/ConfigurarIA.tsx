import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// [REMOVED] import { VoiceIDPanel } from "@/components/dashboard/neural/VoiceIDPanel";
// [REMOVED] import { FaceAuthEnroll } from "@/components/auth/FaceAuthEnroll";
import { OrionVoiceStudio } from "@/components/dashboard/neural/OrionVoiceStudio";
// [REMOVED] import { useNeuralConfig, VisionRule, CustomCommand } from "@/hooks/useNeuralConfig";
import { useVoiceInput } from "@/hooks/useVoiceInput";
// [REMOVED] import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mic, MicOff, Brain, Eye, Volume2, Settings2, Sparkles,
  Plus, Trash2, ChevronRight, ChevronLeft, Check, Zap,
  Command, Ear, Camera, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════
// Configurar IA — Onboarding guiado por voz estilo Alexa
// ═══════════════════════════════════════════════════════════

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Pagamento Confirmado!",
    description: "Seu plano foi ativado com sucesso. Vamos configurar o Orion para você.",
    icon: Brain,
    voicePrompt: "Pagamento confirmado! Eu sou o Orion, sua inteligência artificial. Vamos iniciar as configurações do seu perfil. Diga 'próximo' para começar.",
  },
  {
    id: "voice_register",
    title: "Comando de Voz",
    description: "Grave uma amostra da sua voz para que o Orion possa reconhecer você.",
    icon: Mic,
    voicePrompt: "Primeiro, vou cadastrar sua voz. Grave uma amostra falando normalmente para que eu aprenda a te reconhecer. Clique no botão de gravar.",
  },
  {
    id: "face_register",
    title: "Escaneamento Facial",
    description: "Registre seu rosto para autenticação segura e identificação personalizada.",
    icon: Camera,
    voicePrompt: "Agora vamos fazer o escaneamento facial. Posicione-se de frente para a câmera. Isso me permite reconhecer você e personalizar sua experiência.",
  },
  {
    id: "profile_info",
    title: "Nome do Proprietário",
    description: "Como devo chamar você? Complete seus dados para uma experiência personalizada.",
    icon: Settings2,
    voicePrompt: "Como você gostaria que eu te chamasse? Diga seu nome ou apelido preferido. Isso me ajuda a personalizar nossas interações.",
  },
  {
    id: "persona",
    title: "Personalidade do Orion",
    description: "Como você quer que o Orion se comunique com você?",
    icon: Sparkles,
    voicePrompt: "Agora vou detectar seu estilo de comunicação. Qual personalidade você prefere? Profissional, amigável, técnica ou personalizada? Diga sua escolha.",
  },
  {
    id: "wake_word",
    title: "Palavra de Ativação",
    description: "Escolha o nome que vai usar para chamar o Orion.",
    icon: Ear,
    voicePrompt: "Qual nome você quer usar para me chamar? O padrão é Orion. Você também pode escolher outro nome. Diga o nome que preferir.",
  },
  {
    id: "voice",
    title: "Configuração de Voz",
    description: "Ajuste velocidade e tom da voz do Orion.",
    icon: Volume2,
    voicePrompt: "Agora vamos ajustar minha voz. Você pode alterar a velocidade e o tom. Diga 'próximo' quando estiver satisfeito.",
  },
  {
    id: "vision",
    title: "Sistema de Visão",
    description: "Configure como o Orion analisa imagens e câmera.",
    icon: Eye,
    voicePrompt: "Quer ativar meu sistema de visão computacional? Eu posso identificar objetos, ler documentos e muito mais. Diga sim ou não.",
  },
  {
    id: "instructions",
    title: "Protocolos de Ativação",
    description: "Defina regras de comportamento e protocolos padrão do Orion.",
    icon: Command,
    voicePrompt: "Por último, você pode definir protocolos especiais. Por exemplo: sempre responder em tópicos, focar numa área específica, ou ajustar meu nível de detalhe. Diga suas instruções ou pule esta etapa.",
  },
  {
    id: "complete",
    title: "Orion Ativado!",
    description: "Todas as configurações foram salvas. O Orion está pronto para uso.",
    icon: Check,
    voicePrompt: "Protocolos de ativação completos! Todas as suas preferências foram salvas. Eu sou o Orion, e estou pronto para te ajudar. Bom trabalho, proprietário!",
  },
];

const PERSONAS = [
  { value: "profissional", label: "Profissional", desc: "Formal e objetivo" },
  { value: "amigavel", label: "Amigável", desc: "Casual e acolhedor" },
  { value: "tecnica", label: "Técnica", desc: "Preciso e detalhado" },
  { value: "custom", label: "Personalizada", desc: "Defina seu próprio estilo" },
];

const MODULES = [
  { id: "chat", label: "Chat IA", icon: MessageSquare },
  { id: "vision", label: "Visão", icon: Camera },
  { id: "voice", label: "Voz", icon: Volume2 },
  { id: "identification", label: "Identificação", icon: Eye },
];

export default function ConfigurarIA() {
  const { config, loading, updateConfig } = useNeuralConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fromPayment] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("from") === "payment";
  });
  const [localConfig, setLocalConfig] = useState({
    persona: "profissional",
    custom_instructions: "",
    wake_word: "Orion",
    voice_enabled: true,
    voice_language: "pt-BR",
    voice_speed: 0.92,
    voice_pitch: 0.85,
    vision_enabled: true,
    vision_auto_describe: false,
    vision_rules: [] as VisionRule[],
    custom_commands: [] as CustomCommand[],
    active_modules: ["chat", "vision", "voice", "identification"],
    response_length: "medium",
    speech_style: "formal",
    formality_level: 7,
    humor_mode: "neutro",
    proactive_vision: false,
    nickname: "",
    mirroring_enabled: true,
    personality_prompt: "",
  });

  const { isListening, isSupported, isSpeaking, toggleListening, stopSpeaking } = useVoiceInput({
    lang: "pt-BR",
    onResult: handleVoiceCommand,
  });

  // Gemini TTS only
  const speak = async (text: string) => {
    try {
      const r = await speakWithGeminiTTS(text, "Charon");
      if (r.played) return;
    } catch {}
  };

  // Load config into local state
  useEffect(() => {
    if (config) {
      setLocalConfig({
        persona: config.persona,
        custom_instructions: config.custom_instructions,
        wake_word: config.wake_word,
        voice_enabled: config.voice_enabled,
        voice_language: config.voice_language,
        voice_speed: config.voice_speed,
        voice_pitch: config.voice_pitch,
        vision_enabled: config.vision_enabled,
        vision_auto_describe: config.vision_auto_describe,
        vision_rules: config.vision_rules || [],
        custom_commands: config.custom_commands || [],
        active_modules: config.active_modules || ["chat", "vision", "voice", "identification"],
        response_length: config.response_length,
        speech_style: config.speech_style || "formal",
        formality_level: config.formality_level ?? 7,
        humor_mode: config.humor_mode || "neutro",
        proactive_vision: config.proactive_vision || false,
        nickname: config.nickname || "",
        mirroring_enabled: config.mirroring_enabled !== false,
        personality_prompt: config.personality_prompt || "",
      });
      // Auto-start onboarding: either first time OR coming from payment
      if (!config.onboarding_completed || fromPayment) {
        setShowOnboarding(true);
        setCurrentStep(0);
        // Auto-speak welcome when coming from payment
        if (fromPayment) {
          setTimeout(() => {
            speak(ONBOARDING_STEPS[0].voicePrompt);
          }, 1000);
        }
      }
    }
  }, [config]);

  function handleVoiceCommand(text: string) {
    const lower = text.toLowerCase().trim();

    // Navigation commands
    if (lower.includes("próximo") || lower.includes("proximo") || lower.includes("avançar")) {
      nextStep();
      return;
    }
    if (lower.includes("voltar") || lower.includes("anterior")) {
      prevStep();
      return;
    }

    // Step-specific voice commands
    const step = ONBOARDING_STEPS[currentStep];
    if (step.id === "persona") {
      const match = PERSONAS.find(p =>
        lower.includes(p.value) || lower.includes(p.label.toLowerCase())
      );
      if (match) {
        setLocalConfig(prev => ({ ...prev, persona: match.value }));
        speak(`Personalidade ${match.label} selecionada. Diga próximo para continuar.`);
        return;
      }
    }

    if (step.id === "wake_word") {
      // Use whatever the user said as the wake word
      const word = text.trim().split(" ").pop() || "Orion";
      setLocalConfig(prev => ({ ...prev, wake_word: word }));
      speak(`Entendido! Agora você pode me chamar de ${word}. Diga próximo para continuar.`);
      return;
    }

    if (step.id === "vision") {
      if (lower.includes("sim") || lower.includes("ativar")) {
        setLocalConfig(prev => ({ ...prev, vision_enabled: true }));
        speak("Sistema de visão ativado! Diga próximo para continuar.");
        return;
      }
      if (lower.includes("não") || lower.includes("desativar")) {
        setLocalConfig(prev => ({ ...prev, vision_enabled: false }));
        speak("Sistema de visão desativado. Diga próximo para continuar.");
        return;
      }
    }

    if (step.id === "instructions") {
      if (lower.includes("pular") || lower.includes("skip")) {
        nextStep();
        return;
      }
      setLocalConfig(prev => ({
        ...prev,
        custom_instructions: prev.custom_instructions
          ? prev.custom_instructions + "\n" + text
          : text,
      }));
      speak("Instrução registrada! Diga mais instruções ou diga próximo para finalizar.");
      return;
    }

    // Default: speak the current step prompt
    speak("Não entendi. " + step.voicePrompt);
  }

  const nextStep = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTimeout(() => {
        speak(ONBOARDING_STEPS[next].voicePrompt);
      }, 500);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const navigate = useNavigate();

  const finishOnboarding = async () => {
    const saved = await updateConfig({
      ...localConfig,
      onboarding_completed: true,
    } as any);
    if (saved) {
      setShowOnboarding(false);
      toast.success("Configuração salva com sucesso!");
      speak("Configuração completa! Estou pronta para te ajudar.");
      navigate("/dashboard");
    }
  };

  const saveConfig = async () => {
    const saved = await updateConfig(localConfig as any);
    if (saved) {
      toast.success("Configurações atualizadas!");
    }
  };

  const addVisionRule = () => {
    setLocalConfig(prev => ({
      ...prev,
      vision_rules: [...prev.vision_rules, { trigger: "", action: "", enabled: true }],
    }));
  };

  const removeVisionRule = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      vision_rules: prev.vision_rules.filter((_, i) => i !== index),
    }));
  };

  const addCustomCommand = () => {
    setLocalConfig(prev => ({
      ...prev,
      custom_commands: [...prev.custom_commands, { gatilho: "", instrucao: "", enabled: true }],
    }));
  };

  const removeCustomCommand = (index: number) => {
    setLocalConfig(prev => ({
      ...prev,
      custom_commands: prev.custom_commands.filter((_, i) => i !== index),
    }));
  };

  const toggleModule = (moduleId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      active_modules: prev.active_modules.includes(moduleId)
        ? prev.active_modules.filter(m => m !== moduleId)
        : [...prev.active_modules, moduleId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ONBOARDING MODE — Step-by-step guided setup
  // ═══════════════════════════════════════════════════════════
  if (showOnboarding) {
    const step = ONBOARDING_STEPS[currentStep];
    const StepIcon = step.icon;
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/20 bg-card/80 backdrop-blur">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <StepIcon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{step.title}</CardTitle>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* === NEW: Voice Registration Step === */}
                {step.id === "voice_register" && (
                  <div className="space-y-4">
                    <VoiceIDPanel />
                    <p className="text-xs text-muted-foreground text-center">
                      Grave uma amostra de voz para identificação. Clique em próximo quando terminar.
                    </p>
                  </div>
                )}

                {/* === NEW: Face Registration Step === */}
                {step.id === "face_register" && (
                  <div className="space-y-4">
                    <FaceAuthEnroll onComplete={() => nextStep()} />
                    <p className="text-xs text-muted-foreground text-center">
                      Posicione seu rosto na câmera. O cadastro é automático.
                    </p>
                  </div>
                )}

                {/* === NEW: Profile Info Step === */}
                {step.id === "profile_info" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Apelido / Como quer ser chamado</Label>
                      <Input
                        value={localConfig.nickname}
                        onChange={e => setLocalConfig(prev => ({ ...prev, nickname: e.target.value }))}
                        placeholder="Ex: Dr. Silva, Maria, João"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Área de atuação / Interesse</Label>
                      <Input
                        placeholder="Ex: Direito Trabalhista, Logística, Robótica"
                        onChange={e => setLocalConfig(prev => ({
                          ...prev,
                          custom_instructions: prev.custom_instructions
                            ? prev.custom_instructions + `\nÁrea: ${e.target.value}`
                            : `Área: ${e.target.value}`,
                        }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Esses dados ajudam a personalizar suas respostas.
                    </p>
                  </div>
                )}

                {/* Step-specific content */}
                {step.id === "persona" && (
                  <div className="grid grid-cols-2 gap-3">
                    {PERSONAS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setLocalConfig(prev => ({ ...prev, persona: p.value }))}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          localConfig.persona === p.value
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium text-sm">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                )}

                {step.id === "wake_word" && (
                  <div className="space-y-3">
                    <Input
                      value={localConfig.wake_word}
                      onChange={e => setLocalConfig(prev => ({ ...prev, wake_word: e.target.value }))}
                      placeholder="Nome da IA (ex: Orion, Jarvis, Nova)"
                      className="text-center text-lg"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Diga o nome em voz alta ou digite acima
                    </p>
                  </div>
                )}

                {step.id === "voice" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Velocidade: {localConfig.voice_speed.toFixed(2)}</Label>
                      <Slider
                        value={[localConfig.voice_speed]}
                        onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, voice_speed: v }))}
                        min={0.5}
                        max={1.5}
                        step={0.05}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Tom: {localConfig.voice_pitch.toFixed(2)}</Label>
                      <Slider
                        value={[localConfig.voice_pitch]}
                        onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, voice_pitch: v }))}
                        min={0.5}
                        max={1.5}
                        step={0.05}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speak("Olá! Esta é a minha voz com as configurações atuais.")}
                      className="w-full"
                    >
                      <Volume2 className="h-4 w-4 mr-2" /> Testar Voz
                    </Button>
                  </div>
                )}

                {step.id === "vision" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Sistema de Visão</div>
                        <div className="text-xs text-muted-foreground">Identificação de objetos, OCR, câmera</div>
                      </div>
                      <Switch
                        checked={localConfig.vision_enabled}
                        onCheckedChange={v => setLocalConfig(prev => ({ ...prev, vision_enabled: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Auto-descrição</div>
                        <div className="text-xs text-muted-foreground">Descrever automaticamente o que a câmera vê</div>
                      </div>
                      <Switch
                        checked={localConfig.vision_auto_describe}
                        onCheckedChange={v => setLocalConfig(prev => ({ ...prev, vision_auto_describe: v }))}
                      />
                    </div>
                  </div>
                )}

                {step.id === "instructions" && (
                  <Textarea
                    value={localConfig.custom_instructions}
                    onChange={e => setLocalConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
                    placeholder="Ex: Sempre responda em tópicos. Foque em direito trabalhista. Seja direto e conciso."
                    rows={5}
                  />
                )}

                {step.id === "complete" && (
                  <div className="text-center space-y-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="secondary">Persona: {localConfig.persona}</Badge>
                      <Badge variant="secondary">Wake Word: {localConfig.wake_word}</Badge>
                      <Badge variant="secondary">Visão: {localConfig.vision_enabled ? "Ativada" : "Desativada"}</Badge>
                    </div>
                    {localConfig.custom_instructions && (
                      <p className="text-xs text-muted-foreground border rounded p-2 max-h-20 overflow-auto">
                        {localConfig.custom_instructions}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation + Voice */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          {/* Voice button */}
          {isSupported && (
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="lg"
              onClick={toggleListening}
              className={cn("rounded-full h-14 w-14 p-0 relative", isListening && "animate-pulse")}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              {isListening && (
                <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-30" />
              )}
            </Button>
          )}

          {isLastStep ? (
            <Button onClick={finishOnboarding}>
              <Check className="h-4 w-4 mr-1" /> Finalizar
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip onboarding */}
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setShowOnboarding(false);
              updateConfig({ onboarding_completed: true } as any);
            }}
            className="text-muted-foreground"
          >
            Pular configuração
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SETTINGS MODE — Full configuration panel
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Configurar IA
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie persona, voz, visão e comandos personalizados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowOnboarding(true); setCurrentStep(0); }}>
            <Zap className="h-4 w-4 mr-1" /> Refazer Onboarding
          </Button>
          <Button size="sm" onClick={saveConfig}>
            <Check className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Persona & Instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Persona & Instruções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Personalidade</Label>
              <Select
                value={localConfig.persona}
                onValueChange={v => setLocalConfig(prev => ({ ...prev, persona: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONAS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label} — {p.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wake Word</Label>
              <Input
                value={localConfig.wake_word}
                onChange={e => setLocalConfig(prev => ({ ...prev, wake_word: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tamanho das Respostas</Label>
              <Select
                value={localConfig.response_length}
                onValueChange={v => setLocalConfig(prev => ({ ...prev, response_length: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Curta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="long">Longa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instruções Mestras</Label>
              <Textarea
                value={localConfig.custom_instructions}
                onChange={e => setLocalConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
                placeholder="Regras de comportamento da IA..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Persona Humana */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Persona Humana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estilo de Fala</Label>
              <Select value={localConfig.speech_style} onValueChange={v => setLocalConfig(prev => ({ ...prev, speech_style: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal — Profissional e cordial</SelectItem>
                  <SelectItem value="casual">Casual — Descontraído e amigável</SelectItem>
                  <SelectItem value="urbano">Urbano — Gírias e linguagem de rua</SelectItem>
                  <SelectItem value="tecnico">Técnico — Direto e preciso</SelectItem>
                  <SelectItem value="empatico">Empático — Caloroso e acolhedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível de Formalidade: {localConfig.formality_level}/10</Label>
              <Slider
                value={[localConfig.formality_level]}
                onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, formality_level: v }))}
                min={1} max={10} step={1}
              />
              <p className="text-[10px] text-muted-foreground">
                {localConfig.formality_level <= 3 ? "Muito informal — gírias e expressões coloquiais" :
                 localConfig.formality_level <= 5 ? "Informal — conversa entre amigos" :
                 localConfig.formality_level <= 7 ? "Moderado — profissional mas acessível" :
                 "Formal — linguagem culta e técnica"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Modo de Humor</Label>
              <Select value={localConfig.humor_mode} onValueChange={v => setLocalConfig(prev => ({ ...prev, humor_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutro">Neutro — Tom equilibrado</SelectItem>
                  <SelectItem value="bem_humorado">Bem-humorado — Leve e divertido</SelectItem>
                  <SelectItem value="sarcastico">Sarcástico — Espirituoso e irônico</SelectItem>
                  <SelectItem value="zueiro">Zueiro — Memes e humor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Como a IA deve te chamar</Label>
              <Input
                value={localConfig.nickname}
                onChange={e => setLocalConfig(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Ex: Mano, Chefe, Doutor, seu nome..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Espelhamento Linguístico</Label>
                <p className="text-[10px] text-muted-foreground">A IA adapta o vocabulário ao seu estilo</p>
              </div>
              <Switch
                checked={localConfig.mirroring_enabled}
                onCheckedChange={v => setLocalConfig(prev => ({ ...prev, mirroring_enabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Visão Proativa</Label>
                <p className="text-[10px] text-muted-foreground">A IA comenta o que vê sem perguntar</p>
              </div>
              <Switch
                checked={localConfig.proactive_vision}
                onCheckedChange={v => setLocalConfig(prev => ({ ...prev, proactive_vision: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt de Personalidade</Label>
              <Textarea
                value={localConfig.personality_prompt}
                onChange={e => setLocalConfig(prev => ({ ...prev, personality_prompt: e.target.value }))}
                placeholder='Ex: "Você é um parça. Se eu mandar e aí, responda salve. Se eu estiver rindo, ria junto."'
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" /> Configuração de Voz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Voz Ativada</Label>
              <Switch
                checked={localConfig.voice_enabled}
                onCheckedChange={v => setLocalConfig(prev => ({ ...prev, voice_enabled: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Velocidade: {localConfig.voice_speed.toFixed(2)}</Label>
              <Slider
                value={[localConfig.voice_speed]}
                onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, voice_speed: v }))}
                min={0.5} max={1.5} step={0.05}
              />
            </div>
            <div className="space-y-2">
              <Label>Tom: {localConfig.voice_pitch.toFixed(2)}</Label>
              <Slider
                value={[localConfig.voice_pitch]}
                onValueChange={([v]) => setLocalConfig(prev => ({ ...prev, voice_pitch: v }))}
                min={0.5} max={1.5} step={0.05}
              />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => speak("Teste de voz com as configurações atuais.")}>
              <Volume2 className="h-4 w-4 mr-2" /> Testar Voz
            </Button>
          </CardContent>
        </Card>

        {/* Vision */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Sistema de Visão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Visão Ativada</Label>
              <Switch
                checked={localConfig.vision_enabled}
                onCheckedChange={v => setLocalConfig(prev => ({ ...prev, vision_enabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-descrição</Label>
              <Switch
                checked={localConfig.vision_auto_describe}
                onCheckedChange={v => setLocalConfig(prev => ({ ...prev, vision_auto_describe: v }))}
              />
            </div>

            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Regras Visuais</Label>
                <Button variant="ghost" size="sm" onClick={addVisionRule}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
              </div>
              {localConfig.vision_rules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    placeholder="Gatilho (ex: apontar objeto)"
                    value={rule.trigger}
                    onChange={e => {
                      const rules = [...localConfig.vision_rules];
                      rules[i] = { ...rules[i], trigger: e.target.value };
                      setLocalConfig(prev => ({ ...prev, vision_rules: rules }));
                    }}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Ação (ex: informar preço)"
                    value={rule.action}
                    onChange={e => {
                      const rules = [...localConfig.vision_rules];
                      rules[i] = { ...rules[i], action: e.target.value };
                      setLocalConfig(prev => ({ ...prev, vision_rules: rules }));
                    }}
                    className="text-xs"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeVisionRule(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Commands */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Command className="h-4 w-4 text-primary" /> Comandos Personalizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Comandos de Voz</Label>
              <Button variant="ghost" size="sm" onClick={addCustomCommand}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
            </div>
            {localConfig.custom_commands.map((cmd, i) => (
              <div key={i} className="space-y-1 p-3 rounded-lg border">
                <Input
                  placeholder='Gatilho (ex: "Modo estudo")'
                  value={cmd.gatilho}
                  onChange={e => {
                    const cmds = [...localConfig.custom_commands];
                    cmds[i] = { ...cmds[i], gatilho: e.target.value };
                    setLocalConfig(prev => ({ ...prev, custom_commands: cmds }));
                  }}
                  className="text-xs"
                />
                <Textarea
                  placeholder="Instrução (ex: falar baixo, focar em resumos)"
                  value={cmd.instrucao}
                  onChange={e => {
                    const cmds = [...localConfig.custom_commands];
                    cmds[i] = { ...cmds[i], instrucao: e.target.value };
                    setLocalConfig(prev => ({ ...prev, custom_commands: cmds }));
                  }}
                  rows={2}
                  className="text-xs"
                />
                <Button variant="ghost" size="sm" onClick={() => removeCustomCommand(i)} className="w-full">
                  <Trash2 className="h-3 w-3 text-destructive mr-1" /> Remover
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Módulos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MODULES.map(mod => {
              const Icon = mod.icon;
              const active = localConfig.active_modules.includes(mod.id);
              return (
                <button
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={cn(
                    "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{mod.label}</span>
                  <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                    {active ? "Ativo" : "Inativo"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Voice ID */}
      <VoiceIDPanel />

      {/* Orion Voice Studio */}
      <OrionVoiceStudio />

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} size="lg">
          <Check className="h-4 w-4 mr-2" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
