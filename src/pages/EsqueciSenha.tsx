import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle, ScanFace } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoElp from "@/assets/logo-elp.webp";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { HCAPTCHA_SITE_KEY } from "@/lib/hcaptcha-config";

type Step = "email" | "method" | "otp" | "face" | "newPassword";

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

    // Get hCaptcha token
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoElp} alt="ORION IA" className="h-14 w-14 object-cover" />
            <div>
              <h1 className="text-lg font-serif text-foreground tracking-[0.15em]">ORION</h1>
              <p className="text-[10px] text-primary tracking-[0.25em]">IA PLATFORM</p>
            </div>
          </Link>
        </div>

        <div className="bg-secondary border border-border p-8 space-y-6">
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
              <div className="text-center space-y-2">
                <Mail className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-serif text-foreground">Recuperar Senha</h2>
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail para verificação de identidade.
                </p>
              </div>
              <form onSubmit={handleCheckEmail} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground tracking-wider uppercase">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-background border-border text-foreground focus:border-primary"
                  />
                </div>
                <Button type="submit" className="w-full h-12 btn-gold text-sm">
                  CONTINUAR
                </Button>
              </form>
              <div className="text-center">
                <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Voltar ao login
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Method Selection */}
          {step === "method" && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <KeyRound className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-serif text-foreground">Método de Verificação</h2>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja verificar sua identidade para <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="w-full h-14 btn-gold text-sm flex items-center justify-center gap-3"
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
                  className="w-full h-14 border-border text-foreground hover:bg-accent text-sm flex items-center justify-center gap-3"
                >
                  <ScanFace className="h-5 w-5 text-primary" />
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
                  className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Alterar e-mail
                </button>
              </div>
            </div>
          )}

          {/* Step: Face Recognition */}
          {step === "face" && (
            <div className="animate-fade-in">
              <FaceAuthLoginLazy
                onSuccess={() => setStep("newPassword")}
                onCancel={() => setStep("method")}
              />
            </div>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <KeyRound className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-serif text-foreground">Código de Verificação</h2>
                <p className="text-sm text-muted-foreground">
                  Digite o código de 6 dígitos enviado para <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full h-12 btn-gold text-sm" disabled={loading || otp.length !== 6}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "VERIFICAR CÓDIGO"}
                </Button>
              </form>
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => { setOtp(""); handleSendOtp(); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider"
                >
                  Reenviar código
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Outro método
                </button>
              </div>
            </div>
          )}

          {/* Step: New Password */}
          {step === "newPassword" && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-serif text-foreground">Nova Senha</h2>
                <p className="text-sm text-muted-foreground">Defina sua nova senha de acesso.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground tracking-wider uppercase">Nova Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-12 bg-background border-border text-foreground focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground tracking-wider uppercase">Confirmar Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-12 bg-background border-border text-foreground focus:border-primary"
                  />
                </div>
                <Button type="submit" className="w-full h-12 btn-gold text-sm" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "REDEFINIR SENHA"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
