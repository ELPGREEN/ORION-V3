import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Menu, X, LogIn, UserPlus, LogOut, User, Download,
  Home, BookOpen, LayoutDashboard,
  Zap, Terminal, ChevronDown,
  Scale, ShoppingBag, Briefcase,
  Cpu,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface SubItem {
  href: string;
  label: string;
  icon: React.ElementType;
  desc?: string;
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  children?: SubItem[];
}

const navLinks: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  {
    label: "Soluções",
    icon: Zap,
    children: [
      { href: "/solucoes/advogados", label: "Para Advogados", icon: Scale, desc: "IA jurídica, petições e gestão processual" },
      { href: "/solucoes/produtores", label: "Para Produtores Digitais", icon: ShoppingBag, desc: "Loja, checkout, páginas de venda" },
      { href: "/solucoes/afiliados", label: "Para Afiliados", icon: Briefcase, desc: "Links rastreáveis e comissões automáticas" },
      { href: "/solucoes/industria", label: "Para Indústria", icon: Cpu, desc: "Robótica, automação e Indústria 4.0" },
      { href: "/servicos", label: "Visão Geral", icon: Zap, desc: "Todos os perfis e funcionalidades" },
      { href: "/depoimentos", label: "Casos de Sucesso", icon: BookOpen, desc: "Depoimentos e resultados reais" },
    ],
  },
  { href: "/plataforma", label: "Plataforma", icon: LayoutDashboard },
  { href: "/contato", label: "Planos", icon: CreditCard },
  { href: "/publicacoes", label: "Blog", icon: BookOpen },
  { href: "/investidor", label: "Investidores", icon: Briefcase },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { canInstall, isInstalled, isIOS, triggerInstall } = useInstallPrompt();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setAtTop(currentScrollY < 50);
      const delta = currentScrollY - lastScrollY;
      if (delta > 15 && currentScrollY > 300) {
        setVisible(false);
        setMobileMenuOpen(false);
        setOpenDropdown(null);
      } else if (delta < -5) {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t.common.logoutSuccess, description: t.common.seeYou });
    navigate("/");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 200);
  };

  const isLinkActive = (item: NavItem): boolean => {
    if (item.href) return location.pathname === item.href;
    if (item.children) return item.children.some(c => location.pathname === c.href?.split("?")[0]?.split("#")[0]);
    return false;
  };

  const headerElement = (
    <header
      role="banner"
      aria-label="Navegação principal"
      className={`fixed top-0 left-0 right-0 transition-all duration-500 ease-out ${
        mobileMenuOpen ? "z-[10001]" : "z-50"
      } ${visible ? "translate-y-0" : "-translate-y-full"}`}
    >
      {/* Background */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          atTop
            ? "bg-background/60 backdrop-blur-md"
            : "backdrop-blur-2xl bg-background/90"
        }`}
      />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative flex h-14 items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group relative z-10 mr-auto">
          <div className="relative flex items-center justify-center h-8 w-8 border border-primary/20 group-hover:border-primary/50 transition-all duration-500">
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-primary/40" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-primary/40" />
            <Terminal className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="leading-none">
            <h1 className="text-foreground tracking-[0.35em] text-[13px] font-bold font-mono">
              ORION
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="h-[3px] w-[3px] bg-primary animate-pulse" />
              <p className="text-[6px] text-primary/50 tracking-[0.25em] font-mono uppercase">
                SYSTEM ACTIVE
              </p>
            </div>
          </div>
        </Link>

        {/* Desktop Nav with dropdowns */}
        <nav className="hidden xl:flex items-center absolute left-1/2 -translate-x-1/2" aria-label="Menu principal">
          <div className="flex items-center">
            {navLinks.map((link, i) => {
              const isActive = isLinkActive(link);
              const hasChildren = !!link.children;
              const isOpen = openDropdown === link.label;

              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => hasChildren && handleDropdownEnter(link.label)}
                  onMouseLeave={() => hasChildren && handleDropdownLeave()}
                >
                  {/* Connector line */}
                  {i > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-3 h-px bg-primary/10" />
                  )}

                  {hasChildren ? (
                    <button
                      className={`relative flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-mono transition-all duration-300 ${
                        isActive || isOpen
                          ? "text-primary"
                          : "text-muted-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {(isActive || isOpen) && (
                        <motion.div
                          layoutId="orion-nav"
                          className="absolute inset-0 border border-primary/30 bg-primary/5"
                          style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.1)" }}
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        >
                          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-4 h-px bg-primary/60" />
                          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4 h-px bg-primary/60" />
                        </motion.div>
                      )}
                      <span className="relative">{link.label}</span>
                      <ChevronDown className={`relative h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <Link
                      to={link.href!}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex items-center px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-mono transition-all duration-300 ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="orion-nav"
                          className="absolute inset-0 border border-primary/30 bg-primary/5"
                          style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.1)" }}
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        >
                          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-4 h-px bg-primary/60" />
                          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4 h-px bg-primary/60" />
                        </motion.div>
                      )}
                      <span className="relative">{link.label}</span>
                    </Link>
                  )}

                  {/* Dropdown panel */}
                  <AnimatePresence>
                    {hasChildren && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2 z-50"
                        onMouseEnter={() => handleDropdownEnter(link.label)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <div
                          className="min-w-[260px] border border-primary/15 bg-background/95 backdrop-blur-2xl p-1.5"
                          style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.5), 0 0 30px -8px hsl(var(--primary) / 0.08)" }}
                        >
                          {/* Top accent */}
                          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/25" />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/25" />

                          {link.children!.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = location.pathname === child.href?.split("?")[0]?.split("#")[0];
                            return (
                              <Link
                                key={child.href}
                                to={child.href}
                                className={`flex items-start gap-3 px-3 py-2.5 transition-all duration-200 group/item ${
                                  childActive
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-primary/5 text-foreground"
                                }`}
                              >
                                <div className={`h-8 w-8 border flex items-center justify-center flex-shrink-0 transition-colors ${
                                  childActive ? "border-primary/40 bg-primary/10" : "border-primary/15 group-hover/item:border-primary/30"
                                }`}>
                                  <ChildIcon className={`h-4 w-4 ${childActive ? "text-primary" : "text-primary/60 group-hover/item:text-primary"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-mono tracking-[0.15em] uppercase font-medium leading-tight">
                                    {child.label}
                                  </p>
                                  {child.desc && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-snug">
                                      {child.desc}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Right actions */}
        <div className="hidden xl:flex items-center gap-2 ml-auto relative z-10">
          {!isInstalled && (
            <button
              className="h-7 px-2 flex items-center gap-1.5 text-muted-foreground/40 hover:text-primary transition-colors text-[9px] tracking-[0.1em] uppercase font-mono"
              onClick={async () => {
                if (canInstall) {
                  const accepted = await triggerInstall();
                  if (accepted) toast({ title: "App instalado!", description: "Procure ORION IA na tela inicial." });
                } else {
                  navigate("/install");
                }
              }}
              title="Instalar App"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Download</span>
            </button>
          )}
          <LanguageSelector />
          
          <div className="w-px h-5 bg-primary/10 mx-1" />

          {user ? (
            <>
              <button
                className="h-7 px-3 text-[9px] tracking-[0.15em] uppercase font-mono text-muted-foreground hover:text-foreground border border-border/30 hover:border-primary/20 transition-all"
                onClick={() => navigate("/dashboard")}
              >
                {t.common.panel}
              </button>
              <button
                className="h-7 px-2 text-muted-foreground/40 hover:text-primary transition-colors"
                onClick={handleSignOut}
                title={t.common.logout}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                className="h-7 px-3 text-[9px] tracking-[0.15em] uppercase font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => navigate("/auth")}
              >
                {t.common.login}
              </button>
              <button
                className="relative h-7 px-4 text-[9px] tracking-[0.2em] uppercase font-mono text-primary bg-primary/5 border border-primary/25 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex items-center gap-1.5"
                onClick={() => navigate("/auth?tab=cadastro")}
              >
                <Zap className="h-3 w-3" />
                {t.common.register}
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <motion.div className="xl:hidden relative z-10 ml-auto" whileTap={{ scale: 0.9 }}>
          <button
            className={`relative h-10 w-10 flex items-center justify-center transition-all duration-300 ${
              mobileMenuOpen ? "text-primary" : "text-foreground"
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="flex flex-col gap-1.5">
                    <div className="w-5 h-px bg-current" />
                    <div className="w-3.5 h-px bg-current ml-auto" />
                    <div className="w-5 h-px bg-current" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </div>
    </header>
  );

  // ─── Mobile Menu ───
  const mobileMenu = createPortal(
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          className="xl:hidden fixed inset-0 top-14 z-[10000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-background/99 backdrop-blur-xl"
            onClick={() => setMobileMenuOpen(false)}
          />

          <motion.nav
            id="mobile-menu"
            className="relative min-h-full py-8 px-6 overflow-y-auto max-h-[calc(100vh-3.5rem)]"
            aria-label="Menu mobile"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Status */}
            <div className="flex items-center gap-2 mb-8">
              <div className="h-1 w-1 bg-primary animate-pulse" />
              <span className="text-[7px] text-muted-foreground/30 uppercase tracking-[0.4em] font-mono">
                NAVIGATION MODULE
              </span>
            </div>

            {/* Links */}
            <div className="space-y-px">
              {navLinks.map((link, index) => {
                const isActive = isLinkActive(link);
                const hasChildren = !!link.children;
                const isExpanded = mobileExpanded === link.label;

                return (
                  <motion.div
                    key={link.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                  >
                    {hasChildren ? (
                      <>
                        <button
                          onClick={() => setMobileExpanded(isExpanded ? null : link.label)}
                          className={`relative flex items-center justify-between w-full py-4 text-[12px] tracking-[0.25em] uppercase font-mono border-b transition-all duration-300 ${
                            isActive
                              ? "text-primary border-primary/20"
                              : "text-muted-foreground/50 border-border/10 hover:text-foreground hover:border-primary/10"
                          }`}
                        >
                          <span>{link.label}</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-primary" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="py-2 pl-4 space-y-1 border-l border-primary/10 ml-2">
                                {link.children!.map((child) => {
                                  const ChildIcon = child.icon;
                                  return (
                                    <Link
                                      key={child.href}
                                      to={child.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="flex items-center gap-3 py-3 px-3 text-[11px] tracking-[0.15em] uppercase font-mono text-muted-foreground/60 hover:text-foreground hover:bg-primary/5 transition-all"
                                    >
                                      <ChildIcon className="h-3.5 w-3.5 text-primary/50" />
                                      <div>
                                        <span className="block">{child.label}</span>
                                        {child.desc && (
                                          <span className="block text-[9px] text-muted-foreground/40 tracking-[0.1em] mt-0.5 normal-case">
                                            {child.desc}
                                          </span>
                                        )}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        to={link.href!}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center justify-between w-full py-4 text-[12px] tracking-[0.25em] uppercase font-mono border-b transition-all duration-300 ${
                          isActive
                            ? "text-primary border-primary/20"
                            : "text-muted-foreground/50 border-border/10 hover:text-foreground hover:border-primary/10"
                        }`}
                      >
                        <span>{link.label}</span>
                        {isActive && (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 w-1 bg-primary" />
                            <span className="text-[7px] text-primary/40">ACTIVE</span>
                          </div>
                        )}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Utils */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              {!isInstalled && (
                <button
                  onClick={async () => {
                    if (canInstall) {
                      setMobileMenuOpen(false);
                      const accepted = await triggerInstall();
                      if (accepted) toast({ title: "App instalado!", description: "Procure ORION IA na tela inicial." });
                    } else {
                      setMobileMenuOpen(false);
                      navigate("/install");
                    }
                  }}
                  className="flex items-center gap-2 py-3 text-[10px] tracking-[0.2em] uppercase font-mono text-primary hover:text-primary/80 transition-colors w-full"
                >
                  <Download className="h-3 w-3" />
                  Download App
                </button>
              )}
            </motion.div>

            {/* Divider */}
            <div className="my-8 h-px bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />

            {/* Auth */}
            <motion.div
              className="space-y-3"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[7px] text-muted-foreground/20 uppercase tracking-[0.4em] font-mono">
                  ACCESS
                </span>
                <LanguageSelector />
              </div>

              {user ? (
                <>
                  <button
                    className="w-full py-3.5 text-[10px] uppercase tracking-[0.3em] font-mono text-primary border border-primary/20 hover:bg-primary/5 transition-all"
                    onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}
                  >
                    {t.common.myPanel}
                  </button>
                  <button
                    className="w-full py-3 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground/40 hover:text-primary transition-colors"
                    onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  >
                    {t.common.logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full py-3.5 text-[10px] uppercase tracking-[0.3em] font-mono text-primary border border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    onClick={() => { setMobileMenuOpen(false); navigate("/auth?tab=cadastro"); }}
                  >
                    <Zap className="h-3 w-3" />
                    {t.common.register}
                  </button>
                  <button
                    className="w-full py-3 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground/40 hover:text-foreground transition-colors"
                    onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                  >
                    {t.common.haveAccount}
                  </button>
                </>
              )}
            </motion.div>

            {/* Footer */}
            <div className="mt-12 text-center">
              <p className="text-[6px] text-muted-foreground/15 uppercase tracking-[0.4em] font-mono">
                ORION • ELP GREEN TECHNOLOGY
              </p>
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      {headerElement}
      {mobileMenu}
    </>
  );
}