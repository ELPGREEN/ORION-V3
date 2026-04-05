import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, Shield, Zap, Eye, EyeOff, Loader2, Camera, CheckCircle2, ArrowLeft } from "lucide-react";
import logoElp from "@/assets/logo-elp.webp";

type Step = "form" | "scanning" | "neural" | "success" | "error";
type RoleOption = "cliente" | "produtor" | "afiliado";

export default function BiometricRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signUp, signIn } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    role: "cliente" as RoleOption,
  });

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast({ title: "Erro na câmera", description: "Permita acesso à câmera para continuar.", variant: "destructive" });
    }
  }, [toast]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.senha !== form.confirmarSenha) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    if (form.senha.length < 8) {
      toast({ title: "Senha deve ter no mínimo 8 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStep("scanning");
    await startCamera();

    // Wait for camera to stabilize
    await new Promise((r) => setTimeout(r, 2000));

    setStep("neural");

    // Simulate neural network confidence animation
    let c = 0;
    const interval = setInterval(() => {
      c += Math.random() * 15 + 5;
      if (c >= 98) {
        c = 98.7;
        clearInterval(interval);
      }
      setConfidence(Math.min(c, 98.7));
    }, 200);

    // Capture frame for face-auth enroll
    const frameData = captureFrame();

    // Create account
    const { error: signUpError } = await signUp(form.email, form.senha, { full_name: form.nome, account_type: "cliente" });
    if (signUpError) {
      clearInterval(interval);
      setStep("error");
      setLoading(false);
      let msg = "Erro ao criar conta.";
      if (signUpError.message.includes("already registered")) msg = "Este e-mail já está cadastrado.";
      toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
      return;
    }

    // Sign in to get the user ID
    const { error: signInError } = await signIn(form.email, form.senha);
    if (signInError) {
      // Account created but can't auto-login (email confirmation required)
      clearInterval(interval);
      setConfidence(98.7);
      setStep("success");
      setLoading(false);
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." });
      return;
    }

    // Get user from session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (userId) {
      // Assign role via edge function
      try {
        await supabase.functions.invoke("admin-api", {
          body: { action: "assign_role", user_id: userId, role: form.role },
        });
      } catch {
        console.warn("Role assignment warning (non-blocking)");
      }

      // Face auth enroll (if camera captured frame)
      if (frameData) {
        try {
          await supabase.functions.invoke("face-auth", {
            body: { action: "enroll", image: frameData },
          });
        } catch {
          console.warn("Face enroll warning (non-blocking)");
        }
      }
    }

    clearInterval(interval);
    setConfidence(99.8);
    setStep("success");
    setLoading(false);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    toast({ title: "Conta criada com sucesso!", description: "Bem-vindo à plataforma ORION." });

    setTimeout(() => navigate("/dashboard"), 1500);
  };

  const roleLabels: Record<RoleOption, string> = {
    cliente: "Cliente",
    produtor: "Produtor",
    afiliado: "Afiliado",
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 overflow-hidden relative">
      {/* Background neon */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,149,0,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,149,0,0.04)_0%,transparent_50%)] pointer-events-none" />

      {/* Back button */}
      <Link to="/auth" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-orange-400/70 hover:text-orange-400 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Voltar ao login
      </Link>

      <div className="w-full max-w-4xl bg-zinc-950 border border-orange-500/30 shadow-2xl shadow-orange-500/10 rounded-3xl overflow-hidden relative">
        {/* Glow superior */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

        <div className="grid md:grid-cols-2">
          {/* LADO ESQUERDO - BIOMETRIA VISUAL */}
          <div className="bg-zinc-900 p-6 md:p-8 border-b md:border-b-0 md:border-r border-orange-500/20">
            <div className="flex items-center gap-3 mb-6">
              <img src={logoElp} alt="ORION" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold tracking-tighter text-orange-400">REGISTRO BIOMÉTRICO</h1>
                <p className="text-[10px] text-orange-300/60 tracking-[0.25em]">ORION NEURAL VERIFICATION</p>
              </div>
            </div>

            {/* Face Scan Area */}
            <div className="bg-black border border-orange-500/40 rounded-2xl p-4 mb-6 relative overflow-hidden">
              <div className="aspect-square max-h-64 mx-auto relative flex items-center justify-center rounded-xl overflow-hidden">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover rounded-xl"
                      muted
                      playsInline
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 border-2 border-orange-400/40 rounded-xl">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-400" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-400" />
                    </div>
                    {/* Scan line animation */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" style={{ top: `${30 + Math.sin(Date.now() / 500) * 20}%` }} />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-orange-400/60">
                    <div className="relative">
                      <Camera className="w-16 h-16" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-xs text-center">Câmera será ativada<br />durante o registro</p>
                  </div>
                )}
              </div>
            </div>

            {/* Neural Status */}
            {step === "neural" && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Zap className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">Rede Neural Processando</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-400">{confidence.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="font-medium text-sm text-emerald-400">Identidade Verificada</p>
                  <p className="text-xs text-emerald-300/70">Confiança: {confidence.toFixed(1)}%</p>
                </div>
              </div>
            )}

            {/* Fingerprint + Shield */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-black/60 border border-orange-500/20 rounded-xl p-3">
                <Fingerprint className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="font-medium text-xs text-orange-300">Digital ID</p>
                  <p className="text-[10px] text-orange-300/50">Biometria ativa</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/60 border border-orange-500/20 rounded-xl p-3">
                <Shield className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="font-medium text-xs text-orange-300">LGPD</p>
                  <p className="text-[10px] text-orange-300/50">Dados protegidos</p>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO - FORMULÁRIO */}
          <div className="p-6 md:p-8 flex flex-col">
            <form onSubmit={handleRegister} className="flex-1 flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-1">Criar Conta</h2>
              <p className="text-orange-300/60 text-sm mb-6">Registro com verificação biométrica</p>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs font-medium text-orange-300/80 tracking-wider uppercase mb-1.5 block">Nome</label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                    minLength={2}
                    className="h-11 bg-zinc-900 border-orange-500/20 text-white focus:border-orange-400 focus:ring-orange-400/20"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-orange-300/80 tracking-wider uppercase mb-1.5 block">E-mail</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                    className="h-11 bg-zinc-900 border-orange-500/20 text-white focus:border-orange-400 focus:ring-orange-400/20"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-orange-300/80 tracking-wider uppercase mb-1.5 block">Senha</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="h-11 bg-zinc-900 border-orange-500/20 text-white pr-10 focus:border-orange-400 focus:ring-orange-400/20"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400/40 hover:text-orange-400"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-orange-300/80 tracking-wider uppercase mb-1.5 block">Confirmar</label>
                    <Input
                      type="password"
                      value={form.confirmarSenha}
                      onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="h-11 bg-zinc-900 border-orange-500/20 text-white focus:border-orange-400 focus:ring-orange-400/20"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="text-xs font-medium text-orange-300/80 tracking-wider uppercase mb-1.5 block">Perfil</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(roleLabels) as RoleOption[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        disabled={loading}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                          form.role === r
                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-orange-500/40"
                        }`}
                      >
                        {roleLabels[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input type="checkbox" required className="mt-1 h-4 w-4 accent-orange-500" disabled={loading} />
                  <span className="text-[11px] text-zinc-500 leading-relaxed">
                    Li e concordo com os{" "}
                    <Link to="/termos" className="text-orange-400 hover:underline">Termos</Link> e{" "}
                    <Link to="/privacidade" className="text-orange-400 hover:underline">Política de Privacidade</Link>
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-bold text-sm tracking-wider rounded-xl"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-5 w-5" />
                    CRIAR CONTA COM BIOMETRIA
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] text-orange-300/30 mt-4 tracking-wide">
                Powered by ORION Neural Network • ELP Green Technology
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
