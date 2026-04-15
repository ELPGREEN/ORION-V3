import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Brain, Shield, Zap, ScanFace, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FaceAuthLogin } from "@/components/auth/FaceAuthLogin";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { z } from "zod";
import logoElp from "@/assets/logo-elp.webp";
import { FaceAuthEnroll } from "@/components/auth/FaceAuthEnroll";
import {
  AccountType, AuthStep, CadastroForm, INITIAL_FORM,
  ACCOUNT_TYPES, emailSchema, passwordSchema, nomeSchema
} from "@/components/auth/auth-constants";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

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
  const [authStep, setAuthStep] = useState<AuthStep>("form");

  const returnTo = searchParams.get("returnTo") || "/dashboard";

  useEffect(() => {
    if (user) navigate(returnTo);
  }, [user, navigate, returnTo]);

  useEffect(() => {
    const tipo = searchParams.get("tipo") as AccountType | null;
    if (tipo && ACCOUNT_TYPES.some(t => t.value === tipo)) setAccountType(tipo);
    const tab = searchParams.get("tab");
    if (tab === "cadastro" || tab === "login") setActiveTab(tab);
  }, [searchParams]);

  const validateLogin = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    try { emailSchema.parse(loginForm.email); } catch (e) { if (e instanceof z.ZodError) errs.loginEmail = e.errors[0].message; }
    try { passwordSchema.parse(loginForm.senha); } catch (e) { if (e instanceof z.ZodError) errs.loginSenha = e.errors[0].message; }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [loginForm]);

  const validateCadastro = useCallback((): boolean => {
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
  }, [cadastroForm, accountType]);

  const handleResendConfirmation = useCallback(async () => {
    if (!emailNotConfirmed) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: emailNotConfirmed });
    toast(error
      ? { title: "Erro ao reenviar", description: error.message.includes('rate') ? "Aguarde 1 minuto." : "Não foi possível reenviar.", variant: "destructive" as const }
      : { title: "E-mail reenviado!", description: "Verifique sua caixa de entrada e spam." }
    );
    setResendLoading(false);
  }, [emailNotConfirmed, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    setEmailNotConfirmed(null);

    const token = await verifyRecaptcha("login");
    if (token) {
      try {
        await supabase.functions.invoke("verify-recaptcha", { body: { token, action: "login" } });
      } catch { /* ignore */ }
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

    const token = await verifyRecaptcha("signup");
    if (token) {
      try {
        await supabase.functions.invoke("verify-recaptcha", { body: { token, action: "signup" } });
      } catch { /* ignore */ }
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

  const handleFaceEnrollComplete = useCallback(() => {
    setAuthStep("done");
    toast({ title: "Cadastro completo!", description: "Conta de advogado criada com verificação facial." });
    setTimeout(() => navigate(returnTo), 1500);
  }, [navigate, returnTo, toast]);

  const handleSkipFaceEnroll = useCallback(() => {
    toast({ title: "Cadastro criado!", description: "Você poderá configurar o reconhecimento facial depois nas configurações." });
    navigate(returnTo);
  }, [navigate, returnTo, toast]);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    const typeToPass = activeTab === "cadastro" ? accountType : "cliente";
    const { error } = await signInWithGoogle(typeToPass);
    if (error) {
      toast({ title: "Erro com Google", description: "Não foi possível iniciar o login.", variant: "destructive" });
      setGoogleLoading(false);
    }
  }, [activeTab, accountType, signInWithGoogle, toast]);

  const renderGoogleButton = useCallback((text: string) => (
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
  ), [googleLoading, loading, handleGoogleLogin]);

  const renderDivider = useCallback(() => (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#1e2533]" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-[#0d1117] px-3 text-[#4a5568] tracking-widest">ou</span>
      </div>
    </div>
  ), []);

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
          <Button variant="ghost" className="w-full text-[#4a5568] hover:text-[#8b95a5] text-xs" onClick={handleSkipFaceEnroll}>
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

            {activeTab === "login" && (
              <LoginForm
                loginForm={loginForm} setLoginForm={setLoginForm}
                handleLogin={handleLogin} loading={loading} errors={errors}
                showPassword={showPassword} setShowPassword={setShowPassword}
                emailNotConfirmed={emailNotConfirmed}
                handleResendConfirmation={handleResendConfirmation}
                resendLoading={resendLoading}
                renderDivider={renderDivider}
                renderGoogleButton={renderGoogleButton}
                setShowFaceLogin={setShowFaceLogin}
                googleLoading={googleLoading}
                toast={toast}
              />
            )}

            {showFaceLogin && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <FaceAuthLogin
                  onSuccess={() => { setShowFaceLogin(false); navigate(returnTo); }}
                  onCancel={() => setShowFaceLogin(false)}
                />
              </div>
            )}

            {activeTab === "cadastro" && (
              <RegisterForm
                cadastroForm={cadastroForm} setCadastroForm={setCadastroForm}
                handleCadastro={handleCadastro} loading={loading} errors={errors}
                accountType={accountType} setAccountType={setAccountType}
                showPassword={showPassword} setShowPassword={setShowPassword}
                renderDivider={renderDivider}
                renderGoogleButton={renderGoogleButton}
                navigate={navigate}
              />
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
