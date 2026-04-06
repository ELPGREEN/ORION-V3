/**
 * VoiceIdentityGate — UI overlay for voice identity verification.
 * Shows when Orion detects a non-owner voice.
 */

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, ShieldAlert, UserCheck, Volume2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IdentityStatus } from "@/hooks/useVoiceIdentityGuard";

interface VoiceIdentityGateProps {
  identityStatus: IdentityStatus;
  isCheckingVoice: boolean;
  onGuestIdentify: (name: string) => void;
  onVerifyVoice: () => void;
  onSkipAsOwner: () => void;
}

export function VoiceIdentityGate({
  identityStatus,
  isCheckingVoice,
  onGuestIdentify,
  onVerifyVoice,
  onSkipAsOwner,
}: VoiceIdentityGateProps) {
  const [guestName, setGuestName] = useState("");
  const [step, setStep] = useState<"challenge" | "identify">("challenge");

  const handleSubmitName = useCallback(() => {
    if (guestName.trim().length < 2) return;
    onGuestIdentify(guestName.trim());
  }, [guestName, onGuestIdentify]);

  if (identityStatus !== "guest") return null;

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
                {/* Orion avatar */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                    <ShieldAlert className="h-8 w-8 text-primary" />
                  </div>
                </div>

                {/* Orion message */}
                <div className="space-y-2 text-center">
                  <Badge variant="outline" className="text-[10px]">
                    <Volume2 className="h-3 w-3 mr-1" /> Orion — Verificação de Identidade
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">
                    Desculpa, mas você não é meu criador. Sua voz não corresponde ao perfil cadastrado nesta conta.
                  </p>
                  <p className="text-sm text-primary font-medium">
                    Como você se chama?
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setStep("identify")}
                    className="w-full"
                  >
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
                    variant="ghost"
                    size="sm"
                    onClick={onSkipAsOwner}
                    className="text-xs text-muted-foreground"
                  >
                    Sou o proprietário (pular verificação)
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
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
