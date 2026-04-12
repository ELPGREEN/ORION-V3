import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Fingerprint, Eye, EyeOff, LogIn, UserPlus, Loader2, Mail, Brain, Shield, Zap, Users, Briefcase, Link2, Scale, ScanFace, CheckCircle, Music } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FaceAuthLogin } from "@/components/auth/FaceAuthLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { z } from "zod";
import logoElp from "@/assets/logo-elp.webp";
import { FaceAuthEnroll } from "@/components/auth/FaceAuthEnroll";

// ═══════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════

type AccountType = "cliente" | "advogado" | "produtor" | "afiliado";
type AuthStep = "form" | "face_enroll" | "done";

interface CadastroForm {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  cpf: string;
  tipoCaso: string;
  descricaoProblema: string;
  oabNumero: string;
  oabUf: string;
  areasAtuacao: string[];
  descricaoNegocio: string;
}

const INITIAL_FORM: CadastroForm = {
  nome: "", email: "", telefone: "", senha: "", confirmarSenha: "",
  cpf: "", tipoCaso: "", descricaoProblema: "",
  oabNumero: "", oabUf: "", areasAtuacao: [],
  descricaoNegocio: "",
};

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(8, "Senha deve ter no mínimo 8 caracteres");
const nomeSchema = z.string().min(2, "Nome deve ter no mínimo 2 caracteres");

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "cliente", label: "Cliente", icon: Users, desc: "Buscar assistência jurídica" },
  { value: "advogado", label: "Advogado", icon: Scale, desc: "Gerenciar clientes e processos" },
  { value: "produtor", label: "Produtor", icon: Briefcase, desc: "Criar e vender produtos digitais" },
  { value: "afiliado", label: "Afiliado", icon: Link2, desc: "Ganhar comissões por indicações" },
];

const TIPOS_CASO = [
  "Direito Penal", "Direito Civil", "Direito de Família", "Direito Trabalhista",
  "Direito Internacional", "Direito Empresarial", "Direito do Consumidor",
  "Direitos Humanos", "Imigração", "Outro"
];

const AREAS_ATUACAO = [
  "Penal", "Civil", "Família", "Trabalhista", "Tributário",
  "Empresarial", "Consumidor", "Internacional", "Imobiliário",
  "Ambiental", "Digital", "Previdenciário"
];

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

// ═══════════════════════════════════════
// Formatters
// ═══════════════════════════════════════

const formatCPF = (value: string) => {
  const n = value.replace(/\D/g, "");
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
};

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, "");
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
};

// ═══════════════════════════════════════
// Tron CSS (injected once)
// ═══════════════════════════════════════

const TRON_CSS = `
@keyframes tronPulse { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
@keyframes tronScanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
@keyframes floatParticle { 0%,100%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:0.6} 90%{opacity:0.6} 50%{transform:translateY(-40px) translateX(20px)} }
.tron-grid{background-image:linear-gradient(hsl(var(--primary),0.05) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--primary),0.05) 1px,transparent 1px);background-size:60px 60px;animation:tronPulse 4s ease-in-out infinite}
.tron-scanline{background:linear-gradient(to bottom,transparent,hsl(var(--primary),0.03),transparent);height:200px;animation:tronScanline 8s linear infinite}
.tron-glow{box-shadow:0 0 40px hsl(var(--primary),0.08),0 0 80px hsl(var(--primary),0.04)}
.gold-glow-text{text-shadow:0 0 20px rgba(212,168,83,0.3)}
.particle{position:absolute;width:2px;height:2px;background:rgba(212,168,83,0.5);border-radius:50%;animation:floatParticle 6s ease-in-out infinite}
`;

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { verify: verifyRecaptcha } = useRecaptcha();

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>(
    (searchParams.get("tipo") as AccountType) || "cliente"
  );
  const [cadastroForm, setCadastroForm] = useState<CadastroForm>(INITIAL_FORM);
  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  // Face enrollment step (advogado only)
  const [authStep, setAuthStep] = useState<AuthStep>("form");

  // Get returnTo destination from URL params
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  // Redirect if logged in
  useEffect(() => {
    if (user) navigate(returnTo);
  }, [user, navigate, returnTo]);

  // Sync URL params
  useEffect(() => {
    const tipo = searchParams.get("tipo") as AccountType | null;
    if (tipo && ACCOUNT_TYPES.some(t => t.value === tipo)) setAccountType(tipo);
    const tab = searchParams.get("tab");
    if (tab === "cadastro" || tab === "login") setActiveTab(tab);
  }, [searchParams]);

  // ═══════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════

  const validateLogin = (): boolean => {
    const errs: Record<string, string> = {};
    try { emailSchema.parse(loginForm.email); } catch (e) { if (e instanceof z.ZodError) errs.loginEmail = e.errors[0].message; }
    try { passwordSchema.parse(loginForm.senha); } catch (e) { if (e instanceof z.ZodError) errs.loginSenha = e.errors[0].message; }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCadastro = (): boolean => {
    const errs: Record<string, string> = {};
    try { nomeSchema.parse(cadastroForm.nome); } catch (e) { if (e instanceof z.ZodError) errs.nome = e.errors[0].message; }
    try { emailSchema.parse(cadastroForm.email); } catch (e) { if (e instanceof z.ZodError) errs.email = e.errors[0].message; }
    try { passwordSchema.parse(cadastroForm.senha); } catch (e) { if (e instanceof z.ZodError) errs.senha = e.errors[0].message; }
    if (cadastroForm.senha !== cadastroForm.confirmarSenha) errs.confirmarSenha = "As senhas não coincidem";
    if (accountType === "cliente") {
      if (cadastroForm.cpf.replace(/\D/g, "").length < 11) errs.cpf = "CPF inválido";
      if (!cadastroForm.tipoCaso) errs.tipoCaso = "Selecione o tipo de caso";
    }
    if (accountType === "advogado") {
      if (!cadastroForm.oabNumero || cadastroForm.oabNumero.length < 4) errs.oabNumero = "Número OAB inválido";
      if (!cadastroForm.oabUf) errs.oabUf = "Selecione a UF da OAB";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ═══════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════

  const handleResendConfirmation = async () => {
    if (!emailNotConfirmed) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: emailNotConfirmed });
    toast(error
      ? { title: "Erro ao reenviar", description: error.message.includes('rate') ? "Aguarde 1 minuto." : "Não foi possível reenviar.", variant: "destructive" as const }
      : { title: "E-mail reenviado!", description: "Verifique sua caixa de entrada e spam." }
    );
    setResendLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    setEmailNotConfirmed(null);

    // reCAPTCHA v3 — non-blocking (log only, never blocks login)
    const token = await verifyRecaptcha("login");
    if (token) {
      try {
        const { data: captchaResult } = await supabase.functions.invoke("verify-recaptcha", { body: { token, action: "login" } });
        if (captchaResult && !captchaResult.success) {
          console.warn("[Auth] reCAPTCHA low score — allowing login", captchaResult);
        }
      } catch {
        // Allow through if verification service is down
      }
    }

    const { error } = await signIn(loginForm.email, loginForm.senha);
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setEmailNotConfirmed(loginForm.email);
      } else {
        const msg = error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login. Tente novamente.";
        toast({ title: "Erro no login", description: msg, variant: "destructive" });
      }
    } else {
      toast({ title: "Login realizado!", description: "Bem-vindo à plataforma ORION." });
      navigate(returnTo);
    }
    setLoading(false);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCadastro()) return;
    setLoading(true);

    // reCAPTCHA v3 — non-blocking (log only, never blocks signup)
    const token = await verifyRecaptcha("signup");
    if (token) {
      try {
        const { data: captchaResult } = await supabase.functions.invoke("verify-recaptcha", { body: { token, action: "signup" } });
        if (captchaResult && !captchaResult.success) {
          console.warn("[Auth] reCAPTCHA low score — allowing signup", captchaResult);
        }
      } catch {
        // Allow through if verification service is down
      }
    }

    const metadata: Record<string, unknown> = {
      full_name: cadastroForm.nome,
      nome: cadastroForm.nome,
      account_type: accountType,
      telefone: cadastroForm.telefone || undefined,
    };

    if (accountType === "cliente") {
      metadata.cpf = cadastroForm.cpf.replace(/\D/g, "");
      metadata.tipo_caso = cadastroForm.tipoCaso;
      metadata.descricao_problema = cadastroForm.descricaoProblema;
    } else if (accountType === "advogado") {
      metadata.oab_number = cadastroForm.oabNumero;
      metadata.oab_uf = cadastroForm.oabUf;
      metadata.areas_atuacao = cadastroForm.areasAtuacao;
    }

    const { error } = await signUp(cadastroForm.email, cadastroForm.senha, metadata);
    if (error) {
      let msg = "Erro ao criar conta. Tente novamente.";
      if (error.message.includes("User already registered")) msg = "Este e-mail já está cadastrado. Tente fazer login.";
      else if (error.message.includes("Password")) msg = "Senha muito fraca. Use letras, números e símbolos.";
      toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(cadastroForm.email, cadastroForm.senha);
    if (!signInError) {
      if (accountType === "advogado") {
        setAuthStep("face_enroll");
        setLoading(false);
        return;
      }
      toast({ title: "Conta criada!", description: `Bem-vindo como ${ACCOUNT_TYPES.find(t => t.value === accountType)?.label}.` });
      navigate(returnTo);
    } else if (signInError.message.includes("Email not confirmed")) {
      setEmailNotConfirmed(cadastroForm.email);
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar a conta." });
    } else {
      setActiveTab("login");
      setLoginForm({ email: cadastroForm.email, senha: "" });
      toast({ title: "Conta criada!", description: "Faça login com suas credenciais." });
    }
    setLoading(false);
  };

  const handleFaceEnrollComplete = () => {
    setAuthStep("done");
    toast({ title: "Cadastro completo!", description: "Conta de advogado criada com verificação facial." });
    setTimeout(() => navigate(returnTo), 1500);
  };

  const handleSkipFaceEnroll = () => {
    toast({ title: "Cadastro criado!", description: "Você poderá configurar o reconhecimento facial depois nas configurações." });
    navigate(returnTo);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    // Pass the selected account type so the role is assigned correctly after OAuth
    const typeToPass = activeTab === "cadastro" ? accountType : "cliente";
    const { error } = await signInWithGoogle(typeToPass);
    if (error) {
      toast({ title: "Erro com Google", description: "Não foi possível iniciar o login.", variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // Shared styles
  // ═══════════════════════════════════════

  const inputClass = "h-12 bg-[#161b22] border-[#1e2533] text-white placeholder:text-[#4a5568] focus:border-[#d4a853] focus:ring-[#d4a853]/20";
  const labelClass = "text-xs font-medium text-[#c0c8d4] tracking-wider uppercase";
  const errorClass = "text-xs text-red-400";

  // ═══════════════════════════════════════
  // Sub-renders
  // ═══════════════════════════════════════

  const renderGoogleButton = (text: string) => (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 border-[#1e2533] text-white hover:bg-[#161b22] text-sm gap-3 bg-transparent"
      disabled={googleLoading || loading}
      onClick={handleGoogleLogin}
    >
      {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {text}
        </>
      )}
    </Button>
  );

  const renderDivider = () => (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#1e2533]" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-[#0d1117] px-3 text-[#4a5568] tracking-widest">ou</span>
      </div>
    </div>
  );

  const renderEmailConfirmation = () => emailNotConfirmed ? (
    <div className="rounded border border-[#d4a853]/30 bg-[#d4a853]/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 text-[#d4a853] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#d4a853]">E-mail não confirmado</p>
          <p className="text-xs text-[#8b95a5] mt-1">
            Verifique sua caixa de entrada (e spam) para <span className="text-white">{emailNotConfirmed}</span>.
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm"
        className="w-full border-[#d4a853]/40 text-[#d4a853] hover:bg-[#d4a853]/10 text-xs"
        onClick={handleResendConfirmation} disabled={resendLoading}
      >
        {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reenviar e-mail de confirmação"}
      </Button>
    </div>
  ) : null;

  // ═══════════════════════════════════════
  // Face Enrollment Step (advogados)
  // ═══════════════════════════════════════

  if (authStep === "face_enroll") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4a853]/30 bg-[#d4a853]/5">
              <ScanFace className="h-4 w-4 text-[#d4a853]" />
              <span className="text-xs text-[#d4a853] tracking-wider uppercase">Verificação Facial Obrigatória</span>
            </div>
            <h2 className="text-2xl font-serif text-white">Cadastro de Advogado</h2>
            <p className="text-sm text-[#8b95a5]">
              Por segurança, advogados devem registrar sua biometria facial para acesso à plataforma.
            </p>
          </div>

          <FaceAuthEnroll onComplete={handleFaceEnrollComplete} />

          <Button
            variant="ghost"
            className="w-full text-[#4a5568] hover:text-[#8b95a5] text-xs"
            onClick={handleSkipFaceEnroll}
          >
            Configurar depois (acesso limitado)
          </Button>
        </div>
      </div>
    );
  }

  if (authStep === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-4 animate-fade-in">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-serif text-white">Cadastro Completo!</h2>
          <p className="text-sm text-[#8b95a5]">Redirecionando para o painel...</p>
          <Loader2 className="h-6 w-6 animate-spin text-[#d4a853] mx-auto" />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      <SEO
        title="Acesso Seguro | ORION IA by ELP® Green Technology"
        description="Faça login ou crie sua conta na plataforma ORION IA. Acesso seguro com autenticação biométrica facial e por voz. ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-auth.jpg"
        keywords="login, cadastro, acesso seguro, autenticação, biometria, ORION IA"
        noIndex
      />
      <style>{TRON_CSS}</style>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#0a0a0f]">
        <div className="absolute inset-0 tron-grid" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="tron-scanline w-full" /></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary),0.03)_0%,transparent_70%)]" />
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="particle" style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%`, animationDelay: `${i * 0.8}s`, animationDuration: `${5 + i * 0.5}s` }} />
          ))}
        </div>
        <div className="absolute top-0 left-0 w-20 h-20 border-l border-t border-[#d4a853]/20" />
        <div className="absolute top-0 right-0 w-20 h-20 border-r border-t border-[#d4a853]/20" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-l border-b border-[#d4a853]/20" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r border-b border-[#d4a853]/20" />

        <Link to="/" className="flex items-center gap-4 group animate-fade-in relative z-10">
          <div className="tron-glow rounded-lg p-1">
            <img src={logoElp} alt="ORION IA" className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-white tracking-[0.15em]">ORION</h1>
            <p className="text-xs text-[#d4a853] tracking-[0.3em]">IA PLATFORM</p>
          </div>
        </Link>

        <div className="animate-slide-right delay-200 relative z-10">
          <div className="h-px w-24 mb-8 bg-gradient-to-r from-[#d4a853] to-transparent" />
          <h2 className="text-4xl font-serif text-white leading-tight mb-6">
            ORION<span className="block text-[#d4a853] gold-glow-text">IA Empresarial</span>
          </h2>
          <p className="text-[#8b95a5] text-lg leading-relaxed max-w-md">
            Acesse sua conta na plataforma ORION para gerenciar seus projetos, documentos e ferramentas de IA.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5 animate-fade-in-up delay-400 relative z-10">
          {([
            { icon: Brain, label: "IA Avançada" },
            { icon: Shield, label: "Dados Seguros" },
            { icon: Zap, label: "Gestão Inteligente" },
          ] as const).map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="h-10 w-10 border border-[#d4a853]/30 flex items-center justify-center bg-[#d4a853]/5">
                <Icon className="h-5 w-5 text-[#d4a853]" />
              </div>
              <span className="text-sm text-[#8b95a5]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-[#0d1117] flex flex-col">
        {/* Mobile Logo */}
        <div className="lg:hidden p-6 border-b border-[#1e2533]">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoElp} alt="ORION IA" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-serif text-white tracking-wider">ORION</h1>
              <p className="text-[10px] text-[#d4a853] tracking-[0.25em]">IA PLATFORM</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Tabs */}
            <div className="flex mb-8 border-b border-[#1e2533]">
              {(["login", "cadastro"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-medium tracking-[0.15em] uppercase transition-all relative ${
                    activeTab === tab ? "text-[#d4a853]" : "text-[#8b95a5] hover:text-white"
                  }`}
                >
                  {tab === "login" ? "ENTRAR" : "CADASTRAR"}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#d4a853] to-[#b8942e]" />
                  )}
                </button>
              ))}
            </div>

            {/* ═══ LOGIN FORM ═══ */}
            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label className={labelClass}>E-mail</label>
                  <Input type="email" placeholder="seu@email.com" value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required className={inputClass} />
                  {errors.loginEmail && <p className={errorClass}>{errors.loginEmail}</p>}
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Senha</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={loginForm.senha}
                      onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                      required className="h-12 bg-[#161b22] border-[#1e2533] text-white pr-12 focus:border-[#d4a853] focus:ring-[#d4a853]/20" />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.loginSenha && <p className={errorClass}>{errors.loginSenha}</p>}
                </div>

                <div className="flex justify-end">
                  <Link to="/esqueci-senha" className="text-xs text-[#8b95a5] hover:text-[#d4a853] transition-colors tracking-wider">
                    Esqueceu a senha?
                  </Link>
                </div>

                {renderEmailConfirmation()}


                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" />ENTRAR</>}
                </Button>

                {renderDivider()}
                {renderGoogleButton("ENTRAR COM GOOGLE")}

                <div className="grid grid-cols-2 gap-3 mt-3">
                  {/* Amazon Login */}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-[#1e2533] text-white hover:bg-[#161b22] text-xs gap-2 bg-transparent"
                    disabled={loading || googleLoading}
                    onClick={() => {
                      supabase.auth.signInWithOAuth({
                        provider: 'azure' as any,
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback`,
                          queryParams: { provider: 'amazon' }
                        }
                      });
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705c-.209.189-.512.201-.748.074-1.051-.872-1.238-1.276-1.814-2.106-1.736 1.77-2.962 2.3-5.209 2.3-2.66 0-4.731-1.641-4.731-4.923 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095v-.41c0-.753.058-1.642-.383-2.294-.385-.579-1.124-.82-1.775-.82-1.205 0-2.277.618-2.54 1.897-.054.285-.261.566-.549.58l-3.074-.331c-.259-.058-.548-.266-.473-.66C5.746 2.116 8.538.816 11.032.816c1.276 0 2.941.339 3.949 1.303 1.276 1.218 1.154 2.839 1.154 4.606v4.171c0 1.252.52 1.802 1.009 2.479.171.239.209.526-.009.703-.545.456-1.518 1.304-2.053 1.779l-.037-.062z"/>
                      <path d="M21.7 18.17c-1.607 1.188-3.94 1.822-5.95 1.822-2.818 0-5.349-1.041-7.267-2.774-.151-.136-.016-.322.165-.217 2.069 1.204 4.63 1.927 7.275 1.927 1.783 0 3.745-.369 5.551-1.135.272-.117.501.179.226.377z"/>
                      <path d="M22.382 17.213c-.205-.263-1.358-.124-1.875-.063-.157.019-.182-.117-.04-.217 .918-.646 2.425-.459 2.601-.243.176.221-.046 1.742-.908 2.469-.132.112-.258.052-.199-.096.193-.482.627-1.587.421-1.85z"/>
                    </svg>
                    AMAZON
                  </Button>

                  {/* Spotify Login */}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-[#1e2533] text-white hover:bg-[#1DB954]/10 text-xs gap-2 bg-transparent"
                    disabled={loading || googleLoading}
                    onClick={() => {
                      supabase.auth.signInWithOAuth({
                        provider: 'spotify' as any,
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback`,
                          scopes: 'user-read-email user-read-private streaming user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-public playlist-modify-private'
                        }
                      });
                    }}
                  >
                    <Music className="h-4 w-4 text-[#1DB954]" />
                    SPOTIFY
                  </Button>
                </div>

                {renderDivider()}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10 text-sm gap-3 bg-transparent tracking-wider"
                  onClick={() => setShowFaceLogin(true)}
                  disabled={loading || googleLoading}
                >
                  <ScanFace className="h-5 w-5" />
                  ENTRAR COM ROSTO
                </Button>
              </form>
            )}

            {/* Face Login Modal */}
            {showFaceLogin && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <FaceAuthLogin
                  onSuccess={() => {
                    setShowFaceLogin(false);
                    navigate(returnTo);
                  }}
                  onCancel={() => setShowFaceLogin(false)}
                />
              </div>
            )}

            {/* ═══ CADASTRO FORM ═══ */}
            {activeTab === "cadastro" && (
              <form onSubmit={handleCadastro} className="space-y-5 animate-fade-in max-h-[65vh] overflow-y-auto pr-1">
                {/* Account Type */}
                <div className="space-y-3">
                  <label className={labelClass}>Tipo de Conta</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map(({ value, label, icon: Icon, desc }) => (
                      <button key={value} type="button" onClick={() => setAccountType(value)}
                        className={`flex items-start gap-2.5 p-3 border text-left transition-all duration-200 ${
                          accountType === value
                            ? "border-[#d4a853]/60 bg-[#d4a853]/10 text-white"
                            : "border-[#1e2533] bg-[#161b22] text-[#8b95a5] hover:border-[#2a3140]"
                        }`}>
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${accountType === value ? "text-[#d4a853]" : "text-[#4a5568]"}`} />
                        <div>
                          <p className="text-xs font-medium">{label}</p>
                          <p className="text-[10px] text-[#4a5568] mt-0.5 leading-tight">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {accountType === "advogado" && (
                    <div className="flex items-center gap-2 p-2 rounded border border-[#d4a853]/20 bg-[#d4a853]/5">
                      <ScanFace className="h-4 w-4 text-[#d4a853] shrink-0" />
                      <p className="text-[10px] text-[#d4a853]">Advogados devem registrar biometria facial após o cadastro.</p>
                    </div>
                  )}
                </div>

                {/* Common Fields */}
                <div className="space-y-2">
                  <label className={labelClass}>Nome Completo</label>
                  <Input placeholder="Seu nome" value={cadastroForm.nome}
                    onChange={(e) => setCadastroForm({ ...cadastroForm, nome: e.target.value })}
                    required className={inputClass} />
                  {errors.nome && <p className={errorClass}>{errors.nome}</p>}
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>E-mail</label>
                  <Input type="email" placeholder="seu@email.com" value={cadastroForm.email}
                    onChange={(e) => setCadastroForm({ ...cadastroForm, email: e.target.value })}
                    required className={inputClass} />
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Telefone</label>
                  <Input placeholder="(00) 00000-0000" value={cadastroForm.telefone}
                    onChange={(e) => setCadastroForm({ ...cadastroForm, telefone: formatPhone(e.target.value) })}
                    maxLength={15} className={inputClass} />
                </div>

                {/* Cliente Fields */}
                {accountType === "cliente" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className={labelClass}>CPF</label>
                        <Input placeholder="000.000.000-00" value={cadastroForm.cpf}
                          onChange={(e) => setCadastroForm({ ...cadastroForm, cpf: formatCPF(e.target.value) })}
                          maxLength={14} className={inputClass} />
                        {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Tipo de Caso</label>
                        <Select value={cadastroForm.tipoCaso} onValueChange={(v) => setCadastroForm({ ...cadastroForm, tipoCaso: v })}>
                          <SelectTrigger className="h-12 bg-[#161b22] border-[#1e2533] text-white focus:ring-[#d4a853]/20">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CASO.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.tipoCaso && <p className={errorClass}>{errors.tipoCaso}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Descreva seu caso (opcional)</label>
                      <textarea placeholder="Explique brevemente sua situação jurídica..."
                        value={cadastroForm.descricaoProblema}
                        onChange={(e) => setCadastroForm({ ...cadastroForm, descricaoProblema: e.target.value })}
                        rows={2} className="w-full resize-none rounded-md bg-[#161b22] border border-[#1e2533] text-white text-sm p-3 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]/20 placeholder:text-[#4a5568]" />
                    </div>
                  </>
                )}

                {/* Advogado Fields */}
                {accountType === "advogado" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-2">
                        <label className={labelClass}>Nº OAB</label>
                        <Input placeholder="123456" value={cadastroForm.oabNumero}
                          onChange={(e) => setCadastroForm({ ...cadastroForm, oabNumero: e.target.value.replace(/\D/g, "").slice(0, 7) })}
                          className={inputClass} />
                        {errors.oabNumero && <p className={errorClass}>{errors.oabNumero}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>UF</label>
                        <Select value={cadastroForm.oabUf} onValueChange={(v) => setCadastroForm({ ...cadastroForm, oabUf: v })}>
                          <SelectTrigger className="h-12 bg-[#161b22] border-[#1e2533] text-white focus:ring-[#d4a853]/20">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.oabUf && <p className={errorClass}>{errors.oabUf}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Áreas de Atuação</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AREAS_ATUACAO.map((area) => (
                          <button key={area} type="button"
                            onClick={() => {
                              const areas = cadastroForm.areasAtuacao.includes(area)
                                ? cadastroForm.areasAtuacao.filter(a => a !== area)
                                : [...cadastroForm.areasAtuacao, area];
                              setCadastroForm({ ...cadastroForm, areasAtuacao: areas });
                            }}
                            className={`px-2.5 py-1 text-[10px] tracking-wider uppercase border transition-all ${
                              cadastroForm.areasAtuacao.includes(area)
                                ? "border-[#d4a853]/50 bg-[#d4a853]/15 text-[#d4a853]"
                                : "border-[#1e2533] bg-[#161b22] text-[#4a5568] hover:text-[#8b95a5]"
                            }`}>
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Produtor Fields */}
                {accountType === "produtor" && (
                  <div className="space-y-2">
                    <label className={labelClass}>Descrição do Negócio (opcional)</label>
                    <textarea placeholder="Descreva brevemente seus produtos ou serviços..."
                      value={cadastroForm.descricaoNegocio}
                      onChange={(e) => setCadastroForm({ ...cadastroForm, descricaoNegocio: e.target.value })}
                      rows={2} className="w-full resize-none rounded-md bg-[#161b22] border border-[#1e2533] text-white text-sm p-3 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853]/20 placeholder:text-[#4a5568]" />
                  </div>
                )}

                {/* Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelClass}>Senha</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••"
                        value={cadastroForm.senha}
                        onChange={(e) => setCadastroForm({ ...cadastroForm, senha: e.target.value })}
                        required minLength={8}
                        className="h-12 bg-[#161b22] border-[#1e2533] text-white pr-12 focus:border-[#d4a853] focus:ring-[#d4a853]/20" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.senha && <p className={errorClass}>{errors.senha}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Confirmar</label>
                    <Input type="password" placeholder="••••••••" value={cadastroForm.confirmarSenha}
                      onChange={(e) => setCadastroForm({ ...cadastroForm, confirmarSenha: e.target.value })}
                      required className={inputClass} />
                    {errors.confirmarSenha && <p className={errorClass}>{errors.confirmarSenha}</p>}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 py-2">
                  <input type="checkbox" required className="mt-1 h-4 w-4 border-[#1e2533] bg-[#161b22] accent-[#d4a853]" />
                  <span className="text-xs text-[#8b95a5] leading-relaxed">
                    Li e concordo com os{" "}
                    <Link to="/termos" className="text-[#d4a853] hover:underline">Termos de Uso</Link>{" "}e{" "}
                    <Link to="/privacidade" className="text-[#d4a853] hover:underline">Política de Privacidade</Link>
                  </span>
                </div>

                {/* Submit */}
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      CRIAR CONTA {ACCOUNT_TYPES.find(t => t.value === accountType)?.label.toUpperCase()}
                    </>
                  )}
                </Button>

                {renderDivider()}
                {renderGoogleButton("CADASTRAR COM GOOGLE")}
                {renderDivider()}

                <Button type="button" variant="outline"
                  className="w-full h-12 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-sm gap-3 bg-transparent"
                  onClick={() => navigate("/register/biometric")}>
                  <Fingerprint className="h-5 w-5" />REGISTRO BIOMÉTRICO
                </Button>
              </form>
            )}

            <p className="text-center text-xs text-[#4a5568] mt-8 tracking-wide">
              Plataforma ORION by ELP Green Technology
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
