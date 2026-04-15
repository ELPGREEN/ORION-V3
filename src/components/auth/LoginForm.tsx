import React from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2, Mail, ScanFace, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  loginForm: { email: string; senha: "" | string };
  setLoginForm: (val: any) => void;
  handleLogin: (e: React.FormEvent) => void;
  loading: boolean;
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  emailNotConfirmed: string | null;
  handleResendConfirmation: () => void;
  resendLoading: boolean;
  renderDivider: () => React.ReactNode;
  renderGoogleButton: (text: string) => React.ReactNode;
  setShowFaceLogin: (val: boolean) => void;
  googleLoading: boolean;
  toast: any;
}

const inputClass = "h-12 bg-[#161b22] border-[#1e2533] text-white placeholder:text-[#4a5568] focus:border-[#d4a853] focus:ring-[#d4a853]/20";
const labelClass = "text-xs font-medium text-[#c0c8d4] tracking-wider uppercase";
const errorClass = "text-xs text-red-400";

export const LoginForm = React.memo(({
  loginForm, setLoginForm, handleLogin, loading, errors,
  showPassword, setShowPassword, emailNotConfirmed,
  handleResendConfirmation, resendLoading, renderDivider,
  renderGoogleButton, setShowFaceLogin, googleLoading, toast
}: LoginFormProps) => {
  return (
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

      {emailNotConfirmed && (
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
      )}

      <Button type="submit" disabled={loading}
        className="w-full h-12 bg-gradient-to-r from-[#d4a853] to-[#b8942e] hover:from-[#e0b65e] hover:to-[#c9a33a] text-[#0a0a0f] font-semibold text-sm tracking-wider">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" />ENTRAR</>}
      </Button>

      {renderDivider()}
      {renderGoogleButton("ENTRAR COM GOOGLE")}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 border-[#1e2533] text-white hover:bg-[#161b22] text-xs gap-2 bg-transparent"
          disabled={loading || googleLoading}
          onClick={async () => {
            try {
              const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
              const configRes = await fetch(`${BASE_URL}/functions/v1/amazon-auth?action=config`);
              if (!configRes.ok) throw new Error("Config failed");
              const config = await configRes.json();
              const redirectUri = `${window.location.origin}/auth/callback?provider=amazon`;
              const authUrl = new URL("https://www.amazon.com/ap/oa");
              authUrl.searchParams.set("client_id", config.client_id);
              authUrl.searchParams.set("scope", "profile");
              authUrl.searchParams.set("response_type", "code");
              authUrl.searchParams.set("redirect_uri", redirectUri);
              window.location.href = authUrl.toString();
            } catch {
              toast({ title: "Erro", description: "Falha ao iniciar login Amazon", variant: "destructive" });
            }
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705c-.209.189-.512.201-.748.074-1.051-.872-1.238-1.276-1.814-2.106-1.736 1.77-2.962 2.3-5.209 2.3-2.66 0-4.731-1.641-4.731-4.923 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095v-.41c0-.753.058-1.642-.383-2.294-.385-.579-1.124-.82-1.775-.82-1.205 0-2.277.618-2.54 1.897-.054.285-.261.566-.549.58l-3.074-.331c-.259-.058-.548-.266-.473-.66C5.746 2.116 8.538.816 11.032.816c1.276 0 2.941.339 3.949 1.303 1.276 1.218 1.154 2.839 1.154 4.606v4.171c0 1.252.52 1.802 1.009 2.479.171.239.209.526-.009.703-.545.456-1.518 1.304-2.053 1.779l-.037-.062z"/>
            <path d="M21.7 18.17c-1.607 1.188-3.94 1.822-5.95 1.822-2.818 0-5.349-1.041-7.267-2.774-.151-.136-.016-.322.165-.217 2.069 1.204 4.63 1.927 7.275 1.927 1.783 0 3.745-.369 5.551-1.135.272-.117.501.179.226.377z"/>
            <path d="M22.382 17.213c-.205-.263-1.358-.124-1.875-.063-.157.019-.182-.117-.04-.217 .918-.646 2.425-.459 2.601-.243.176.221-.046 1.742-.908 2.469-.132.112-.258.052-.199-.096.193-.482.627-1.587.421-1.85z"/>
          </svg>
          AMAZON
        </Button>

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
  );
});
