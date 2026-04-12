import { useOrionVoiceClone } from "@/hooks/useOrionVoiceClone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic, MicOff, Volume2, Trash2, Sparkles, CheckCircle2,
  Loader2, Play, AudioWaveform, Upload, Crown, CloudOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function OrionVoiceStudio() {
  const {
    samples,
    isRecording,
    isCloning,
    isTesting,
    isUploading,
    isLoadingSamples,
    isCreator,
    hasClonedVoice,
    currentPhrase,
    guideTotal,
    startRecording,
    stopRecording,
    removeSample,
    cloneVoice,
    testVoice,
    deleteClonedVoice,
  } = useOrionVoiceClone();

  const progress = Math.round((samples.length / guideTotal) * 100);
  const canClone = samples.length >= 3;

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AudioWaveform className="h-4 w-4 text-primary" />
          Voz do Orion
          {isCreator && (
            <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/50 text-amber-400">
              <Crown className="h-3 w-3 mr-1" /> Criador Ericson Piccoli
            </Badge>
          )}
          {hasClonedVoice ? (
            <Badge variant="default" className="ml-auto text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Voz Ativa
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Sem voz própria
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasClonedVoice ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium">
                {isCreator
                  ? "O Orion fala com a voz do seu criador, Ericson Piccoli!"
                  : "O Orion tem sua própria voz!"}
              </p>
              <p className="text-xs text-muted-foreground">
                A voz clonada será usada automaticamente em todas as respostas de voz.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => testVoice()}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Testar Voz
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteClonedVoice}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Creator message */}
            {isCreator && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-300 font-medium">
                  <Crown className="h-3 w-3 inline mr-1" />
                  Grave sua voz para dar identidade ao Orion, Ericson.
                </p>
              </div>
            )}

            {/* Loading indicator */}
            {isLoadingSamples && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando amostras salvas...
              </div>
            )}

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Amostras gravadas</span>
                <span>{samples.length}/{guideTotal} (mín. 3)</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Guide phrase */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Leia em voz alta:
              </p>
              <p className="text-sm font-medium italic">"{currentPhrase}"</p>
            </div>

            {/* Upload indicator */}
            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Upload className="h-3 w-3 animate-pulse" />
                Salvando amostra no servidor...
              </div>
            )}

            {/* Record button */}
            <div className="flex justify-center">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "rounded-full h-16 w-16 p-0 relative",
                  isRecording && "animate-pulse"
                )}
              >
                {isRecording ? (
                  <MicOff className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
                {isRecording && (
                  <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-30" />
                )}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {isRecording ? "Gravando... Clique para parar" : "Clique para gravar"}
            </p>

            {/* Samples list */}
            <AnimatePresence>
              {samples.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  {samples.map((sample, i) => (
                    <motion.div
                      key={sample.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                    >
                      <Volume2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs flex-1">
                        Amostra {i + 1} ({(sample.duration / 1000).toFixed(1)}s)
                      </span>
                      {sample.persisted ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <CloudOff className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {sample.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const audio = new Audio(sample.url);
                            audio.play();
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeSample(sample.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clone button */}
            <Button
              className="w-full"
              disabled={!canClone || isCloning || isUploading}
              onClick={cloneVoice}
            >
              {isCloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clonando voz...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isCreator ? "Clonar Voz do Ericson para o Orion" : "Clonar Voz do Orion"}
                  {!canClone && ` (faltam ${3 - samples.length})`}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
