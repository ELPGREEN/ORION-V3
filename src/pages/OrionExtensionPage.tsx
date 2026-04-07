import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import orionIcon from "@/assets/logo-main.png";

const OrionExtensionPage = () => {
  const handleDownload = () => {
    fetch("/orion-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "orion-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  const features = [
    {
      icon: "V",
      title: "Resumir Páginas",
      desc: "Extraia o conteúdo principal de qualquer site e receba um resumo inteligente gerado pelo motor neural do Orion.",
    },
    {
      icon: "A",
      title: "Análise de Conteúdo",
      desc: "Analise textos selecionados, imagens e páginas inteiras diretamente pelo menu de contexto do navegador.",
    },
    {
      icon: "F",
      title: "Leitura em Voz Alta",
      desc: "Converta qualquer página em áudio com TTS nativo. Ideal para acessibilidade e multitarefa.",
    },
    {
      icon: "R",
      title: "Wake Word 'Orion'",
      desc: "Ative o assistente por voz em qualquer aba. Diga 'Orion' seguido do seu comando.",
    },
    {
      icon: "E",
      title: "Extração de Dados",
      desc: "Extraia títulos, links, imagens e metadados estruturados de qualquer página web.",
    },
    {
      icon: "P",
      title: "Perguntas em Contexto",
      desc: "Faça perguntas sobre o conteúdo da página atual e receba respostas contextualizadas via IA.",
    },
  ];

  const steps = [
    "Baixe o arquivo .zip clicando no botão abaixo",
    "Descompacte o arquivo em uma pasta no seu computador",
    "Abra chrome://extensions no Chrome (ou navegador Chromium)",
    "Ative o Modo do Desenvolvedor (toggle no canto superior direito)",
    "Clique em 'Carregar sem compactação' e selecione a pasta descompactada",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6">
            <img
              src={orionIcon}
              alt="Orion"
              className="w-14 h-14 rounded-xl object-contain"
            />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground tracking-wide">
                Orion Extension
              </h1>
              <p className="text-sm text-muted-foreground">
                Assistente Neural para Chrome — v2.0
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Transforme qualquer aba do navegador em um espaço de trabalho inteligente.
            Resumos, análises, leitura por voz e perguntas contextuais — tudo com o
            motor neural do Orion.
          </p>

          <Button onClick={handleDownload} size="lg" className="gap-2 px-8">
            <Download className="w-5 h-5" />
            Baixar Extensão
          </Button>

          <p className="text-xs text-muted-foreground mt-3">
            Compatível com Chrome, Edge, Brave, Arc e Opera
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
            O que a extensão faz
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1.5 text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Install Steps */}
        <div className="p-6 rounded-xl bg-card border border-border mb-8">
          <h2 className="text-lg font-semibold mb-5 text-foreground">
            Como Instalar
          </h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4 items-start text-sm">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <a
            href="https://www.elpgreen.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            IASoft Hub
            <ExternalLink className="w-3 h-3" />
          </a>
          {" "}— ELP Green Technology S.R.L.
        </div>
      </div>
    </div>
  );
};

export default OrionExtensionPage;
