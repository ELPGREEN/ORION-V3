import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Lock, ArrowUpRight, ChevronRight, Zap, Shield } from "lucide-react";
import logoElp from "@/assets/logo-elp.webp";
import { useTranslation } from "@/contexts/LanguageContext";

export function Footer({ hideCta = false }: { hideCta?: boolean }) {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/servicos", label: "Soluções" },
    { href: "/plataforma", label: t.nav.platform },
    { href: "/contato", label: "Planos" },
    { href: "/publicacoes", label: t.nav.publications },
    { href: "/investidor", label: "Investidores" },
    { href: "/depoimentos", label: "Casos de Sucesso" },
  ];

  return (
    <footer
      className="relative overflow-hidden bg-[hsl(240_20%_3%)] text-foreground"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      {/* Top neon line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Subtle grid bg */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* CTA — compact */}
      {!hideCta && (
        <div className="relative container px-4 sm:px-6 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 tron-border rounded-sm bg-card/30 backdrop-blur-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-1">COMECE AGORA</p>
              <p className="text-sm font-medium text-foreground">Transforme sua empresa com IA</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/cadastro"
                className="group inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-primary/90 transition-all"
              >
                Criar Conta
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="https://wa.me/393501021359"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-primary/30 text-primary px-4 py-2 text-[10px] uppercase tracking-[0.2em] hover:border-primary/60 transition-all"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main grid — compact */}
      <div className="relative container px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative">
                <img src={logoElp} alt="ELP" className="h-8 w-8 object-contain relative z-10" />
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-md" />
              </div>
              <div className="leading-none">
                <span className="font-serif text-foreground tracking-[0.15em] text-xs font-bold">ORION</span>
                <p className="text-[8px] text-primary/60 tracking-[0.15em] mt-0.5">IA EMPRESARIAL • BY ELP</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed max-w-[220px]">
              Plataforma de IA empresarial para automação, gestão e processos.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-[8px] text-primary/50 uppercase tracking-[0.3em] font-medium mb-3">Navegação</h4>
            <ul className="space-y-1.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    <ChevronRight className="h-2 w-2 text-primary/0 group-hover:text-primary/50 transition-all -ml-2.5 group-hover:ml-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[8px] text-primary/50 uppercase tracking-[0.3em] font-medium mb-3">Contato</h4>
            <ul className="space-y-2">
              <li>
                <p className="text-[10px] text-foreground/60 font-medium">Mr. Ericson Piccoli</p>
                <p className="text-[8px] text-muted-foreground/40">Founder & CEO</p>
              </li>
              <li>
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
                  <Phone className="h-2.5 w-2.5 text-primary/30" />+39 350 1021359
                </a>
              </li>
              <li>
                <a href="mailto:info@iasofthub.com" className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
                  <Mail className="h-2.5 w-2.5 text-primary/30" />info@iasofthub.com
                </a>
              </li>
              <li className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                <MapPin className="h-2.5 w-2.5 text-primary/30" />Alessandria, Italy
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[8px] text-primary/50 uppercase tracking-[0.3em] font-medium mb-3">Legal</h4>
            <ul className="space-y-1.5">
              <li><Link to="/privacidade" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">{t.footer.privacy}</Link></li>
              <li><Link to="/termos" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">{t.footer.terms}</Link></li>
              <li><Link to="/lgpd" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">{t.footer.lgpd}</Link></li>
            </ul>
            <div className="flex items-center gap-3 mt-3 text-[8px] text-muted-foreground/30">
              <div className="flex items-center gap-1"><Lock className="h-2 w-2" />TLS</div>
              <div className="flex items-center gap-1"><Shield className="h-2 w-2" />GDPR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — ultra slim */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/30 tracking-[0.1em]">
          <Zap className="h-2.5 w-2.5 text-primary/20" />
          <span>© {currentYear} ELP® Green Technology • CNPJ 42.501.190/0001-70 • ELP® PROPERTY</span>
        </div>
        <p className="text-[8px] text-muted-foreground/20 tracking-[0.15em] uppercase">
          Powered by Orion Neural Engine
        </p>
        <p className="text-[7px] text-muted-foreground/15 mt-1">
          Protegido por reCAPTCHA — <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground/30">Privacidade</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground/30">Termos</a>
        </p>
      </div>
    </footer>
  );
}
