import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Globe, Shield, Lock, ArrowUpRight, ChevronRight, Building2, Zap } from "lucide-react";
import logoElp from "@/assets/logo-elp.webp";
import { useTranslation } from "@/contexts/LanguageContext";

export function Footer({ hideCta = false }: { hideCta?: boolean }) {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/solucoes/advogados", label: "Para Advogados" },
    { href: "/solucoes/produtores", label: "Para Produtores" },
    { href: "/solucoes/afiliados", label: "Para Afiliados" },
    { href: "/solucoes/industria", label: "Para Indústria" },
    { href: "/servicos", label: "Visão Geral" },
    { href: "/plataforma", label: t.nav.platform },
    { href: "/contato", label: "Planos" },
    { href: "/publicacoes", label: t.nav.publications },
  ];

  const resourceLinks = [
    { href: "/investidor", label: "Investidores" },
    { href: "/depoimentos", label: "Casos de Sucesso" },
    { href: "/install", label: "Instalar App" },
  ];

  return (
    <footer
      className="relative overflow-hidden bg-[hsl(240_20%_3%)] text-foreground"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      {/* Tech grid background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--primary) / 0.2) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.2) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Top neon line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

      {/* CTA Section */}
      {!hideCta && (
        <div className="relative container px-4 sm:px-6 pt-16 pb-12">
          <div className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              COMECE AGORA
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Transforme sua empresa com IA
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
              Automatize processos, reduza custos e aumente a produtividade com a plataforma ORION.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/cadastro"
                className="group relative inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              >
                {/* Corner accents */}
                <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary-foreground/30" />
                <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary-foreground/30" />
                Criar Conta Grátis
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="https://wa.me/393501021359"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 border border-primary/30 text-primary px-6 py-3 text-xs uppercase tracking-[0.2em] font-medium hover:border-primary/70 hover:bg-primary/5 hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)] transition-all duration-500"
              >
                WhatsApp
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-12" />
        </div>
      )}

      <div className="relative container px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={logoElp} alt="ELP Global Company" className="h-10 w-10 object-contain relative z-10" />
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-md" />
              </div>
              <div className="leading-none">
                <h3 className="font-serif text-foreground tracking-[0.15em] text-sm font-bold">
                  ORION
                </h3>
                <p className="text-[9px] text-primary tracking-[0.15em] font-medium mt-0.5">
                  IA EMPRESARIAL • BY ELP
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs">
              Plataforma de inteligência artificial empresarial para automação, gestão de documentos,
              clientes e processos. Desenvolvida pela ELP® Green Technology.
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-primary/70">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="tracking-wider">ELP® Green Technology</span>
              </div>
              <p className="text-[9px] text-muted-foreground/50 pl-5">CNPJ 42.501.190/0001-70</p>
              <p className="text-[9px] text-muted-foreground/50 pl-5">ELP® PROPERTY — Trademark Registered</p>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[9px] text-primary uppercase tracking-[0.3em] font-medium mb-5 flex items-center gap-2">
              <span className="w-3 h-px bg-primary/40" />
              {t.nav.navigation}
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors duration-300"
                  >
                    <ChevronRight className="h-2.5 w-2.5 text-primary/0 group-hover:text-primary/60 transition-all duration-300 -ml-3 group-hover:ml-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[9px] text-primary uppercase tracking-[0.3em] font-medium mb-5 flex items-center gap-2">
              <span className="w-3 h-px bg-primary/40" />
              RECURSOS
            </h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors duration-300"
                  >
                    <ChevronRight className="h-2.5 w-2.5 text-primary/0 group-hover:text-primary/60 transition-all duration-300 -ml-3 group-hover:ml-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[9px] text-primary uppercase tracking-[0.3em] font-medium mb-5 flex items-center gap-2">
              <span className="w-3 h-px bg-primary/40" />
              EMPRESA & CONTATO
            </h4>
            <ul className="space-y-3">
              <li className="text-[11px] text-muted-foreground">
                <p className="text-foreground/80 font-medium">ELP® Green Technology</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">CNPJ 42.501.190/0001-70</p>
              </li>
              <li className="text-[11px] text-muted-foreground">
                <p className="text-foreground/80 font-medium">Mr. Ericson Piccoli</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">General Director & Founder</p>
              </li>
              <li>
                <a
                  href="https://wa.me/393501021359"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                >
                  <Phone className="h-3 w-3 text-primary/40 flex-shrink-0" />
                  +39 350 1021359
                </a>
              </li>
              <li className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <Mail className="h-3 w-3 text-primary/40 flex-shrink-0" />
                <a href="mailto:info@iasofthub.com" className="hover:text-primary transition-colors">
                  info@iasofthub.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <MapPin className="h-3 w-3 text-primary/40 flex-shrink-0" />
                <span>Alessandria, Italy</span>
              </li>
            </ul>
          </div>

          {/* Contact — merged into Empresa column */}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="container px-4 sm:px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em]">
            <Zap className="h-3 w-3 text-primary/30" />
            <span>© 2023-{currentYear} ELP® Green Technology<span className="hidden sm:inline"> • CNPJ 42.501.190/0001-70 • VAT IT02712340062</span> • ELP® PROPERTY</span>
          </div>

          <div className="flex items-center gap-6 text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em]">
            <Link to="/privacidade" className="hover:text-primary transition-colors duration-300">
              {t.footer.privacy}
            </Link>
            <Link to="/termos" className="hover:text-primary transition-colors duration-300">
              {t.footer.terms}
            </Link>
            <Link to="/lgpd" className="hover:text-primary transition-colors duration-300">
              {t.footer.lgpd}
            </Link>
          </div>

          <div className="flex items-center gap-4 text-[9px] text-muted-foreground/40">
            <div className="flex items-center gap-1">
              <Lock className="h-2.5 w-2.5 text-primary/30" />
              <span>TLS/HTTPS</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-2.5 w-2.5 text-primary/30" />
              <span>GDPR</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
