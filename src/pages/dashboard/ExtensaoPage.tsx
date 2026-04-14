import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chrome, Download, Shield, Zap, Eye } from "lucide-react";

export default function ExtensaoPage() {
  const handleDownload = () => {
    fetch("/orion-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "orion-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        window.open("https://github.com/nicosolitana/AquaMonkey-Orion-Extension", "_blank");
      });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6 px-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 p-3 rounded-full bg-primary/10 mb-2">
          <Chrome className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-serif text-foreground">Extensão Orion para Chrome</h1>
        <p className="text-sm text-muted-foreground">
          Tenha o Orion disponível em qualquer aba do navegador
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Download e Instalação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDownload} className="w-full btn-gold shimmer gap-2">
            <Download className="h-4 w-4" /> Baixar Extensão (.zip)
          </Button>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como instalar:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Descompacte o arquivo <code className="text-primary">.zip</code> baixado</li>
              <li>Abra <code className="text-primary">chrome://extensions</code> no Chrome</li>
              <li>Ative o <strong className="text-foreground">Modo Desenvolvedor</strong> (canto superior direito)</li>
              <li>Clique em <strong className="text-foreground">Carregar sem compactação</strong></li>
              <li>Selecione a pasta descompactada</li>
            </ol>
            <p className="text-xs text-muted-foreground/70">
              Funciona em Chrome, Edge, Brave, Arc e Opera.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Zap, label: "Comandos de voz", desc: "Fale com Orion em qualquer site" },
          { icon: Eye, label: "Visão Neural", desc: "Análise visual direto do browser" },
          { icon: Shield, label: "Privacidade", desc: "Dados processados localmente" },
        ].map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 text-center space-y-1">
              <Icon className="h-5 w-5 text-primary mx-auto" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Badge variant="outline" className="mx-auto block w-fit text-[10px]">
        Compatível com Chromium v120+
      </Badge>
    </div>
  );
}
