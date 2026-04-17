import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useVoiceAuth } from "@/hooks/useVoiceAuth";
import { Mic, MicOff, ShieldCheck, ShieldAlert, Trash2, Fingerprint, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const REQUIRED_SAMPLES = 3;
const PHRASES = [
  "Olá, sou eu. Confirme minha identidade.",
  "A segurança da informação é prioridade.",
  "Minha voz é minha senha digital.",
];

export function VoiceIDPanel() {
  const {
    enrollment,
    loading,
    recording,
    loadEnrollment,
    startRecording,
    stopRecording,
    enroll,
    verify,
    deleteEnrollment,
  } = useVoiceAuth();

  const [mode, setMode] = useState<"idle" | "enrolling" | "verifying">("idle");
  const [samples, setSamples] = useState<Blob[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [verifyResult, setVerifyResult] = useState<{ match: boolean; confidence: number } | null>(null);
  const [pulseAnim, setPulseAnim] = useState(false);

  useEffect(() => {
    loadEnrollment();
  }, [loadEnrollment]);

  const handleRecordSample = useCallback(async () => {
    setPulseAnim(true);
    try {
      const blob = await startRecording();
      const newSamples = [...samples, blob];
      setSamples(newSamples);
      setCurrentStep(newSamples.length);

      if (newSamples.length >= REQUIRED_SAMPLES) {
        await enroll(newSamples);
        setMode("idle");
        setSamples([]);
        setCurrentStep(0);
      }
    } catch (e) {
      console.error("Recording error:", e);
    } finally {
      setPulseAnim(false);
    }
  }, [samples, startRecording, enroll]);

  const handleVerify = useCallback(async () => {
    setMode("verifying");
    setPulseAnim(true);
    try {
      const blob = await startRecording();
      const result = await verify(blob);
      setVerifyResult(result);
    } catch (e) {
      console.error("Verify error:", e);
    } finally {
      setPulseAnim(false);
    }
  }, [startRecording, verify]);

  const handleDelete = useCallback(async () => {
    await deleteEnrollment();
    setVerifyResult(null);
  }, [deleteEnrollment]);

  const isEnrolled = !!enrollment?.is_active;
  const isLocked = enrollment?.locked_until
    ? new Date(enrollment.locked_until) > new Date()
    : false;

  return (
    <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" />
          Voice ID — Biometria Vocal
          {isEnrolled && (
            <Badge variant="default" className="ml-auto text-[10px]">
              <ShieldCheck className="h-3 w-3 mr-1" /> Cadastrado
            </Badge>
          )}
          {isLocked && (
            <Badge variant="destructive" className="ml-auto text-[10px]">
              <ShieldAlert className="h-3 w-3 mr-1" /> Bloqueado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Not enrolled */}
        {!isEnrolled && mode === "idle" && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Volume2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastre sua voz para confirmar sua identidade por áudio.
              Você gravará {REQUIRED_SAMPLES} amostras curtas.
            </p>
            <Button onClick={() => { setMode("enrolling"); setSamples([]); setCurrentStep(0); }}>
              <Mic className="h-4 w-4 mr-2" /> Cadastrar Voice ID
            </Button>
          </div>
        )}

        {/* Enrolling */}
        {mode === "enrolling" && (
          <div className="space-y-4">
            <Progress value={(currentStep / REQUIRED_SAMPLES) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Amostra {currentStep + 1} de {REQUIRED_SAMPLES}
            </p>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm font-medium italic">
                "{PHRASES[currentStep] || PHRASES[0]}"
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Leia a frase acima em voz alta
              </p>
            </div>

            <div className="flex justify-center">
              <AnimatePresence>
                <motion.div
                  animate={pulseAnim ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Button
                    size="lg"
                    variant={recording ? "destructive" : "default"}
                    onClick={recording ? stopRecording : handleRecordSample}
                    disabled={loading}
                    className="rounded-full w-16 h-16"
                  >
                    {recording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              {recording ? "Gravando... (5s máx)" : "Toque para gravar"}
            </p>
          </div>
        )}

        {/* Enrolled — verify or delete */}
        {isEnrolled && mode !== "enrolling" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground">Qualidade</p>
                <p className="font-bold text-primary">{Math.round((enrollment?.enrollment_quality || 0) * 100)}%</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground">Verificações</p>
                <p className="font-bold">{enrollment?.verification_count || 0}</p>
              </div>
            </div>

            {verifyResult && (
              <div className={cn(
                "p-3 rounded-lg border text-center",
                verifyResult.match ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
              )}>
                {verifyResult.match ? (
                  <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-1" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-1" />
                )}
                <p className="text-sm font-medium">
                  {verifyResult.match ? "Identidade Confirmada ✓" : "Voz Não Reconhecida ✗"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Confiança: {Math.round(verifyResult.confidence * 100)}%
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleVerify}
                disabled={loading || isLocked || mode === "verifying"}
                className="flex-1"
                variant="outline"
              >
                <Mic className="h-4 w-4 mr-2" /> Verificar Identidade
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => { setMode("enrolling"); setSamples([]); setCurrentStep(0); }}
            >
              Recadastrar Voice ID
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
