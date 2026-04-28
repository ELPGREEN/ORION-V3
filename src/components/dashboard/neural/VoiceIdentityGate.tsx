/**
 * VoiceIdentityGate — UI overlay for voice identity verification.
 * Shows when Orion detects a non-owner voice.
 */

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, ShieldAlert, UserCheck, Volume2, Loader2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { IdentityStatus } from "@/hooks/useVoiceIdentityGuard";

/** Master PIN that, combined with voice presence, unlocks creator/owner mode. */
const CREATOR_MASTER_PIN = "0911";

interface VoiceIdentityGateProps {
  identityStatus: IdentityStatus;
  isCheckingVoice: boolean;
  onGuestIdentify: (name: string) => void;
  onVerifyVoice: () => void;
  onSkipAsOwner: () => void;
  /** Called when the user enters the correct master PIN — should grant creator mode. */
  onUnlockWithPin?: () => void;
}

export function VoiceIdentityGate({
  identityStatus,
  isCheckingVoice,
  onGuestIdentify,
  onVerifyVoice,
  onSkipAsOwner,
  onUnlockWithPin,
}: VoiceIdentityGateProps) {
  const [guestName, setGuestName] = useState("");
  const [step, setStep] = useState<"challenge" | "identify" | "pin">("challenge");
  const [pin, setPin] = useState("");

  const handleSubmitName = useCallback(() => {
    if (guestName.trim().length < 2) return;
    onGuestIdentify(guestName.trim());
  }, [guestName, onGuestIdentify]);

  const handleSubmitPin = useCallback(() => {
    if (pin.trim() !== CREATOR_MASTER_PIN) {
      toast.error("Código incorreto");
      setPin("");
      return;
    }
    setPin("");
    onUnlockWithPin?.();
  }, [pin, onUnlockWithPin]);

  const [manuallyOpen, setManuallyOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setManuallyOpen(true);
    window.addEventListener("orion:show-identity-gate", handleOpen);
    return () => window.removeEventListener("orion:show-identity-gate", handleOpen);
  }, []);

  const showForUnknown = identityStatus === "unknown";
  const showForGuest = identityStatus === "guest";
  const showForOwner = identityStatus === "owner";
  const shouldShow = showForUnknown || showForGuest || showForOwner;

  if (!shouldShow && !manuallyOpen) return null;
  if (showForOwner && !manuallyOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <Card className="max-w-md w-full border-primary/30 shadow-2xl">
          <CardContent className="pt-6 space-y-4">
            {step === "challenge" && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                    <ShieldAlert className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <Badge variant="outline" className="text-[10px]">
                    <Volume2 className="h-3 w-3 mr-1" /> Orion — Verificação de Identidade
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">
                    Desculpa, mas sua voz não corresponde ao perfil cadastrado nesta conta.
                  </p>
                  <p className="text-sm text-primary font-medium">
                    Como você se chama?
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={() => setStep("identify")} className="w-full">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Me identificar como visitante
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onVerifyVoice}
                    disabled={isCheckingVoice}
                    className="w-full"
                  >
                    {isCheckingVoice ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4 mr-2" />
                    )}
                    Tentar verificar novamente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep("pin")}
                    className="w-full border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Sou o proprietário — usar código
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkipAsOwner}
                    className="text-xs text-muted-foreground"
                  >
                    Pular verificação
                  </Button>
                </div>
              </>
            )}

            {step === "identify" && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                    <UserCheck className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-sm text-foreground">
                    Olá! Por favor, digite seu nome para que eu registre sua visita.
                    O proprietário poderá ver esse registro depois.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Seu nome..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitName()}
                    autoFocus
                  />
                  <Button
                    onClick={handleSubmitName}
                    disabled={guestName.trim().length < 2}
                    className="w-full"
                  >
                    Continuar como visitante
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("challenge")}
                    className="w-full text-xs"
                  >
                    Voltar
                  </Button>
                </div>
              </>
            )}

            {step === "pin" && (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <Badge variant="outline" className="text-[10px]">
                    <ShieldAlert className="h-3 w-3 mr-1" /> Código do Proprietário
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">
                    Digite o código mestre para ativar o modo proprietário.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitPin()}
                    autoFocus
                    className="text-center tracking-[0.5em] text-lg"
                  />
                  <Button
                    onClick={handleSubmitPin}
                    disabled={pin.length < 4}
                    className="w-full"
                  >
                    Ativar modo proprietário
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPin(""); setStep("challenge"); }}
                    className="w-full text-xs"
                  >
                    Voltar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
