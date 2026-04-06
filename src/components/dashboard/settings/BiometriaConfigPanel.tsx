import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanFace, Mic, ShieldCheck, Trash2, RefreshCw } from "lucide-react";
import { FaceAuthEnroll } from "@/components/auth/FaceAuthEnroll";
import { VoiceIDPanel } from "@/components/dashboard/neural/VoiceIDPanel";
import { GuestSessionsLog } from "@/components/dashboard/neural/GuestSessionsLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BiometriaConfigPanel() {
  const [showFaceEnroll, setShowFaceEnroll] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Identificação Biométrica
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure reconhecimento facial e identificação vocal para segurança avançada
        </p>
      </div>

      <Tabs defaultValue="facial" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="facial" className="text-xs gap-1.5">
            <ScanFace className="h-3.5 w-3.5" />
            Reconhecimento Facial
          </TabsTrigger>
          <TabsTrigger value="vocal" className="text-xs gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            Identificação Vocal
          </TabsTrigger>
          <TabsTrigger value="visitantes" className="text-xs gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Visitantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facial" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-primary" />
                Cadastro Facial
              </CardTitle>
              <CardDescription>
                Registre ou atualize seu rosto para login biométrico e verificações de identidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFaceEnroll ? (
                <div className="space-y-3">
                  <FaceAuthEnroll onComplete={() => setShowFaceEnroll(false)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFaceEnroll(false)}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <ScanFace className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Cadastro facial</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Verificar status
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowFaceEnroll(true)}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Cadastrar / Atualizar Rosto
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocal" className="mt-4">
          <VoiceIDPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
