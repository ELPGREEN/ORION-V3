import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle, ScanFace, Brain, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoElp from "@/assets/logo-elp.webp";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { HCAPTCHA_SITE_KEY } from "@/lib/hcaptcha-config";
import { FaceAuthLogin } from "@/components/auth/FaceAuthLogin";

type Step = "email" | "method" | "otp" | "face" | "newPassword";

const inputClass = "h-12 bg-[#161b22] border-[#1e2533] text-white focus:border-[#d4a853] focus:ring-[#d4a853]/20";
const labelClass = "text-xs font-medium text-[#8b95a5] tracking-[0.15em] uppercase";

export default function EsqueciSenha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const hcaptchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStep("method");
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    let hToken = captchaToken;
    if (!hToken) {
      try {
        const res = await hcaptchaRef.current?.execute({ async: true });
        hToken = res?.response ?? null;
      } catch { /* fallback */ }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
      captchaToken: hToken || undefined,
    } as any);

    if (error) {
      const isRateLimit = error.message?.toLowerCase().includes('rate') || error.status === 429;
      toast({
        title: isRateLimit ? "Aguarde um momento" : "Erro",
        description: isRateLimit
          ? "Muitas tentativas. Aguarde 1 minuto antes de solicitar um novo código."
          : "Não foi possível enviar o código. Verifique o e-mail informado.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Código enviado!",
        description: "Verifique seu e-mail para o código de 6 dígitos.",
      });
      setStep("otp");
    }
    hcaptchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (error) {
      toast({
        title: "Código inválido",
        description: "O código informado é inválido ou expirou. Tente novamente.",
        variant: "destructive",
      });
    } else {
      setStep("newPassword");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a senha. Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi redefinida com sucesso.",
      });
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#080b10] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4a853]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#d4a853]/3 rounded-full blur-[100px]" />
        </div>

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <img src={logoElp} alt="ORION IA" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-serif text-white tracking-[0.2em]">ORION</h1>
            <p className="text-[10px] text-[#d4a853] tracking-[0.25em]">IA PLATFORM</p>
          </div>
        </Link>

        <div className="animate-slide-right delay-200 relative z-10">
          <div className="h-px w-24 mb-8 bg-gradient-to-r from-[#d4a853] to-transparent" />
          <h2 className="text-4xl font-serif text-white leading-tight mb-6">
            Recuperação<span className="block text-[#d4a853] gold-glow-text">de Acesso</span>
          </h2>
          <p className="text-[#8b95a5] text-lg leading-relaxed max-w-md">
            Recupere o acesso à sua conta ORION de forma segura com verificação em múltiplos fatores.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5 animate-fade-in-up delay-400 relative z-10">
          {([
            { icon: Brain, label: "IA Avançada" },
            { icon: Shield, label: "Dados Seguros" },
            { icon: Zap, label: "Acesso Rápido" },
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

      {/* Right Panel — Form */}
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
            {/* Header */}
            <div className="mb-8 border-b border-[#1e2533]">
              <div className="py-4 text-sm font-medium tracking-[0.15em] uppercase text-[#d4a853] relative">
                RECUPERAR SENHA
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#d4a853] to-[#b8942e]" />
              </div>
            </div>

            {/* hCaptcha (invisible) */}
            <HCaptcha
              ref={hcaptchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              size="invisible"
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />

            {/* Step 1: Email */}
            {step === "email" && (
              <div className="animate-fade-in space-y-6">
                <div className="text-center space-y-3">
                  <div className="h-14 w-14 border border-[#d4a853]/30 flex items-center justify-center bg-[#d4a853]/5 mx-auto">
                    <Mail className="h-7 w-7 text-[#d4a853]" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Recuperar Senha</h2>
                  <p className="text-sm text-[#8b95a5]">
                    Informe seu e-mail para verificação de identidade.
                  </p>
                </div>
                <form onSubmit={handleCheckEmail} className="space-y-5">
                  <div className="space-y-2">
                    <label className={labelClass}>E-mail</label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider">
                    CONTINUAR
                  </Button>
                </form>
                <div className="text-center">
                  <Link to="/auth" className="text-xs text-[#8b95a5] hover:text-[#d4a853] transition-colors tracking-wider inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Voltar ao login
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Method Selection */}
            {step === "method" && (
              <div className="animate-fade-in space-y-6">
                <div className="text-center space-y-3">
                  <div className="h-14 w-14 border border-[#d4a853]/30 flex items-center justify-center bg-[#d4a853]/5 mx-auto">
                    <KeyRound className="h-7 w-7 text-[#d4a853]" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Método de Verificação</h2>
                  <p className="text-sm text-[#8b95a5]">
                    Escolha como deseja verificar sua identidade para <strong className="text-white">{email}</strong>
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        <Mail className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">CÓDIGO POR E-MAIL</div>
                          <div className="text-[10px] opacity-70">Receba um código de 6 dígitos</div>
                        </div>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setStep("face")}
                    variant="outline"
                    className="w-full h-14 border-[#1e2533] text-white hover:bg-[#161b22] bg-transparent text-sm flex items-center justify-center gap-3"
                  >
                    <ScanFace className="h-5 w-5 text-[#d4a853]" />
                    <div className="text-left">
                      <div className="font-semibold">RECONHECIMENTO FACIAL</div>
                      <div className="text-[10px] opacity-70">Verifique com sua câmera</div>
                    </div>
                  </Button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-xs text-[#8b95a5] hover:text-[#d4a853] transition-colors tracking-wider inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Alterar e-mail
                  </button>
                </div>
              </div>
            )}

            {/* Step: Face Recognition */}
            {step === "face" && (
              <div className="animate-fade-in">
                <FaceAuthLogin
                  onSuccess={() => setStep("newPassword")}
                  onCancel={() => setStep("method")}
                />
              </div>
            )}

            {/* Step: OTP */}
            {step === "otp" && (
              <div className="animate-fade-in space-y-6">
                <div className="text-center space-y-3">
                  <div className="h-14 w-14 border border-[#d4a853]/30 flex items-center justify-center bg-[#d4a853]/5 mx-auto">
                    <KeyRound className="h-7 w-7 text-[#d4a853]" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Código de Verificação</h2>
                  <p className="text-sm text-[#8b95a5]">
                    Digite o código de 6 dígitos enviado para <strong className="text-white">{email}</strong>
                  </p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-12 w-12 bg-[#161b22] border-[#1e2533] text-white text-lg font-mono first:rounded-none last:rounded-none rounded-none"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider" disabled={loading || otp.length !== 6}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "VERIFICAR CÓDIGO"}
                  </Button>
                </form>
                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => { setOtp(""); handleSendOtp(); }}
                    className="text-xs text-[#8b95a5] hover:text-[#d4a853] transition-colors tracking-wider"
                  >
                    Reenviar código
                  </button>
                  <br />
                  <button
                    type="button"
                    onClick={() => setStep("method")}
                    className="text-xs text-[#8b95a5] hover:text-[#d4a853] transition-colors tracking-wider inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Outro método
                  </button>
                </div>
              </div>
            )}

            {/* Step: New Password */}
            {step === "newPassword" && (
              <div className="animate-fade-in space-y-6">
                <div className="text-center space-y-3">
                  <div className="h-14 w-14 border border-[#d4a853]/30 flex items-center justify-center bg-[#d4a853]/5 mx-auto">
                    <CheckCircle className="h-7 w-7 text-[#d4a853]" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Nova Senha</h2>
                  <p className="text-sm text-[#8b95a5]">Defina sua nova senha de acesso.</p>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className={labelClass}>Nova Senha</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Confirmar Senha</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputClass}
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "REDEFINIR SENHA"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
