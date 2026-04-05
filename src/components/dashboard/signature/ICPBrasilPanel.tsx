import { useState, useRef } from "react";
import { Usb, Upload, Shield, FileKey, AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ICPBrasilPanelProps {
  onCertificateReady: (certData: { type: "A1" | "A3"; file?: File; password?: string }) => void;
}

export function ICPBrasilPanel({ onCertificateReady }: ICPBrasilPanelProps) {
  const [certType, setCertType] = useState<"A1" | "A3" | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [usbStatus, setUsbStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith(".pfx") || file.name.endsWith(".p12"))) {
      setCertFile(file);
      onCertificateReady({ type: "A1", file, password });
    }
  };

  const handleCheckUSB = async () => {
    setUsbStatus("checking");

    // Check if WebUSB API is available
    if (!("usb" in navigator)) {
      setUsbStatus("not_found");
      return;
    }

    try {
      // Request USB device — this opens a native browser dialog.
      // If the user selects a device, we know one is present.
      // If they cancel or no devices match, we catch the error.
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          // Common smartcard/token vendor IDs
          { vendorId: 0x096e }, // Feitian
          { vendorId: 0x1050 }, // Yubico
          { vendorId: 0x04e6 }, // SCM Microsystems
          { vendorId: 0x076b }, // OmniKey
          { vendorId: 0x072f }, // ACS (Advanced Card Systems)
          { vendorId: 0x08e6 }, // Gemalto
          { vendorId: 0x0529 }, // Aladdin
          { vendorId: 0x20a0 }, // Clay Logic
        ],
      });

      if (device) {
        setUsbStatus("found");
        onCertificateReady({ type: "A3" });
      } else {
        setUsbStatus("not_found");
      }
    } catch (err: any) {
      // User cancelled the dialog or no device found
      setUsbStatus("not_found");
    }
  };

  return (
    <div className="space-y-4 bg-secondary/30 border border-border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Shield className="h-4 w-4 text-primary" />
        <span>Configurar Certificado ICP-Brasil</span>
      </div>

      {/* Certificate Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setCertType("A1"); setUsbStatus("idle"); }}
          className={`p-3 border text-left transition-all ${
            certType === "A1"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <FileKey className={`h-4 w-4 mb-1 ${certType === "A1" ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-xs font-medium text-foreground">Certificado A1</p>
          <p className="text-[10px] text-muted-foreground">Arquivo .pfx/.p12</p>
        </button>
        <button
          onClick={() => { setCertType("A3"); setUsbStatus("idle"); }}
          className={`p-3 border text-left transition-all ${
            certType === "A3"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <Usb className={`h-4 w-4 mb-1 ${certType === "A3" ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-xs font-medium text-foreground">Certificado A3</p>
          <p className="text-[10px] text-muted-foreground">Token USB / Smartcard</p>
        </button>
      </div>

      {/* A1 - File Upload */}
      {certType === "A1" && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pfx,.p12"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-2" />
            {certFile ? certFile.name : "Carregar Certificado (.pfx/.p12)"}
          </Button>
          
          {certFile && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-primary">
                <CheckCircle className="h-3.5 w-3.5" />
                Certificado carregado
              </div>
              <Input
                type="password"
                placeholder="Senha do certificado"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (certFile) {
                    onCertificateReady({ type: "A1", file: certFile, password: e.target.value });
                  }
                }}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* A3 - USB Detection */}
      {certType === "A3" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-card border border-border">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Instruções:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Conecte seu token USB ou smartcard ao computador</li>
                <li>Verifique se o driver do dispositivo está instalado</li>
                <li>Clique em "Detectar Dispositivo" e selecione o token na janela do navegador</li>
              </ol>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleCheckUSB}
            disabled={usbStatus === "checking"}
          >
            {usbStatus === "checking" ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Usb className="h-3.5 w-3.5 mr-2" />
            )}
            {usbStatus === "checking"
              ? "Detectando..."
              : usbStatus === "found"
              ? "Dispositivo Detectado ✓ (clique para trocar)"
              : "Detectar Dispositivo USB"}
          </Button>
          
          {usbStatus === "found" && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <CheckCircle className="h-3.5 w-3.5" />
              Token/Smartcard selecionado e pronto para uso
            </div>
          )}

          {usbStatus === "not_found" && (
            <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20">
              <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted-foreground">
                <p className="font-medium text-destructive mb-1">Nenhum dispositivo detectado</p>
                <p>Verifique se o token USB está conectado e se o driver está instalado. Se o navegador não suportar WebUSB, utilize o certificado A1 (arquivo .pfx/.p12).</p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/60">
        Assinatura qualificada com validade jurídica plena conforme ICP-Brasil e MP 2.200-2/2001.
      </p>
    </div>
  );
}
