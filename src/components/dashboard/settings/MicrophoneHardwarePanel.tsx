import { useState } from "react";
import { Mic, Check, Radio, Wifi, Volume2, Settings2, ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MicDevice {
  id: string;
  name: string;
  type: "hat" | "usb" | "array";
  mics: number;
  description: string;
  features: string[];
  compatible: string[];
  ovosSupport: boolean;
}

const SUPPORTED_DEVICES: MicDevice[] = [
  {
    id: "respeaker-2mic",
    name: "ReSpeaker 2-Mic HAT",
    type: "hat",
    mics: 2,
    description: "Array compacto de 2 microfones para Raspberry Pi. Ideal para projetos básicos de wake word e comando de voz.",
    features: ["VAD integrado", "LEDs RGB", "Botão GPIO", "Driver I2S"],
    compatible: ["Raspberry Pi 3/4/5", "OVOS", "Mycroft"],
    ovosSupport: true,
  },
  {
    id: "respeaker-4mic",
    name: "ReSpeaker 4-Mic Array",
    type: "array",
    mics: 4,
    description: "Conjunto quadrado de 4 microfones com beamforming e detecção de direção de chegada (DOA).",
    features: ["Beamforming", "DOA 360°", "AEC", "NS integrado"],
    compatible: ["Raspberry Pi 3/4/5", "OVOS", "Mycroft"],
    ovosSupport: true,
  },
  {
    id: "respeaker-4mic-linear",
    name: "ReSpeaker 4-Mic Linear Array",
    type: "array",
    mics: 4,
    description: "Array linear de 4 microfones com beamforming direcional otimizado para ambientes ruidosos.",
    features: ["Beamforming linear", "DOA frontal", "AEC", "AGC"],
    compatible: ["Raspberry Pi 3/4/5", "OVOS"],
    ovosSupport: true,
  },
  {
    id: "respeaker-6mic",
    name: "ReSpeaker 6-Mic Circular Array",
    type: "array",
    mics: 6,
    description: "Array circular de 6 microfones de alta performance. Cobertura 360° com beamforming adaptativo.",
    features: ["Beamforming 360°", "DOA preciso", "AEC avançado", "NS + AGC", "12 LEDs RGB"],
    compatible: ["Raspberry Pi 3/4/5", "OVOS", "Mycroft"],
    ovosSupport: true,
  },
  {
    id: "rpi-proto",
    name: "RPI-Proto (Mark 1)",
    type: "hat",
    mics: 2,
    description: "Placa de som original do Mycroft Mark 1. Entrada/saída de áudio via I2S com amplificador integrado.",
    features: ["I2S DAC/ADC", "Amplificador 3W", "Jack 3.5mm"],
    compatible: ["Raspberry Pi 3/4", "OVOS", "Mycroft Mark 1"],
    ovosSupport: true,
  },
  {
    id: "sj201",
    name: "SJ-201 (Mark 2)",
    type: "hat",
    mics: 2,
    description: "Placa multifuncional do Mark 2 com LEDs, áudio e microfones. Inclui amplificador classe D.",
    features: ["LED ring 12px", "Amplificador 2x3W", "2 MEMS mics", "I2C control"],
    compatible: ["Raspberry Pi 4", "OVOS", "Mycroft Mark 2"],
    ovosSupport: true,
  },
  {
    id: "ps3-eye",
    name: "PS3-Eye (USB)",
    type: "usb",
    mics: 4,
    description: "Microfone USB de 4 canais repurposto da câmera PS3. Excelente custo-benefício para captura de voz.",
    features: ["4 microfones MEMS", "USB plug-and-play", "16kHz/48kHz", "Baixo custo"],
    compatible: ["Qualquer PC/RPi", "OVOS", "Linux"],
    ovosSupport: true,
  },
  {
    id: "google-aiy-v1",
    name: "Google AIY Voice v1 / Chatterbox HAT",
    type: "hat",
    mics: 2,
    description: "HAT de voz do Google AIY Kit v1, também compatível com Chatterbox. Microfone duplo com botão arcade.",
    features: ["2 MEMS mics", "Botão arcade", "Speaker driver", "GPIO breakout"],
    compatible: ["Raspberry Pi 3/4", "OVOS", "Chatterbox"],
    ovosSupport: true,
  },
];

const TYPE_LABELS: Record<string, string> = {
  hat: "HAT / Placa",
  usb: "USB",
  array: "Array Mic",
};

export default function MicrophoneHardwarePanel() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(
    () => localStorage.getItem("orion_mic_device") || null
  );
  const [gain, setGain] = useState(() => {
    const saved = localStorage.getItem("orion_mic_gain");
    return saved ? Number(saved) : 75;
  });
  const [noiseSuppression, setNoiseSuppression] = useState(() => {
    return localStorage.getItem("orion_mic_ns") !== "false";
  });
  const [aec, setAec] = useState(() => {
    return localStorage.getItem("orion_mic_aec") !== "false";
  });
  const [ovosEnabled, setOvosEnabled] = useState(() => {
    return localStorage.getItem("orion_ovos_enabled") === "true";
  });

  const handleSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    localStorage.setItem("orion_mic_device", deviceId);
    const device = SUPPORTED_DEVICES.find(d => d.id === deviceId);
    toast.success(`${device?.name} selecionado`, {
      description: "Configuração de microfone atualizada.",
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem("orion_mic_gain", String(gain));
    localStorage.setItem("orion_mic_ns", String(noiseSuppression));
    localStorage.setItem("orion_mic_aec", String(aec));
    localStorage.setItem("orion_ovos_enabled", String(ovosEnabled));
    toast.success("Configurações de áudio salvas");
  };

  const selected = SUPPORTED_DEVICES.find(d => d.id === selectedDevice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Hardware de Microfone
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione e configure seu array de microfones. Compatível com OpenVoiceOS.
        </p>
      </div>

      {/* OVOS Integration toggle */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">OpenVoiceOS (OVOS)</p>
              <p className="text-xs text-muted-foreground">
                Backend de voz open-source — STT, TTS e Wake Word local
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/OpenVoiceOS/ovos-installer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Instalar <ExternalLink className="h-3 w-3" />
            </a>
            <Switch checked={ovosEnabled} onCheckedChange={setOvosEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SUPPORTED_DEVICES.map((device) => {
          const isSelected = selectedDevice === device.id;
          return (
            <Card
              key={device.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40"
              )}
              onClick={() => handleSelect(device.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <CardTitle className="text-sm">{device.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {device.mics} mic{device.mics > 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {TYPE_LABELS[device.type]}
                    </Badge>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs mt-1">{device.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-wrap gap-1">
                  {device.features.map((f) => (
                    <span key={f} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                      {f}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Wifi className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {device.compatible.join(" · ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Audio Settings */}
      {selectedDevice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Calibração de Áudio — {selected?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Gain */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" />
                  Ganho do Microfone
                </Label>
                <span className="text-xs text-muted-foreground font-mono">{gain}%</span>
              </div>
              <Slider
                value={[gain]}
                onValueChange={([v]) => setGain(v)}
                min={10}
                max={100}
                step={5}
              />
            </div>

            {/* Noise Suppression */}
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Supressão de Ruído (NS)
              </Label>
              <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
            </div>

            {/* AEC */}
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Cancelamento de Eco (AEC)
              </Label>
              <Switch checked={aec} onCheckedChange={setAec} />
            </div>

            <Button onClick={handleSaveSettings} className="w-full" size="sm">
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
