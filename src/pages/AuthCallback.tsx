import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handle = async () => {
      try {
        const provider = searchParams.get('provider');

        // ─── Amazon OAuth Callback ───
        if (provider === 'amazon') {
          const code = searchParams.get('code');
          const errorParam = searchParams.get('error');

          if (errorParam) {
            navigate('/auth', {
              replace: true,
              state: { error: 'Login com Amazon cancelado ou falhou.' },
            });
            return;
          }

          if (!code) {
            navigate('/auth', { replace: true, state: { error: 'Código Amazon não recebido.' } });
            return;
          }

          const redirectUri = `${window.location.origin}/auth/callback?provider=amazon`;

          const res = await fetch(`${BASE_URL}/functions/v1/amazon-auth?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            navigate('/auth', {
              replace: true,
              state: { error: err.error || 'Falha no login com Amazon.' },
            });
            return;
          }

          const data = await res.json();

          if (data.token_hash) {
            // Verify OTP to establish Supabase session
            const { error: otpError } = await supabase.auth.verifyOtp({
              type: 'magiclink',
              token_hash: data.token_hash,
            });

            if (otpError) {
              console.error('Amazon OTP verification error:', otpError);
              navigate('/auth', {
                replace: true,
                state: { error: 'Falha ao estabelecer sessão. Tente novamente.' },
              });
              return;
            }
          }

          navigate('/dashboard', { replace: true });
          return;
        }

        // ─── Standard Supabase OAuth Callback ───
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const type = hashParams.get('type') || searchParams.get('type');
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const errorParam = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

        // Handle error from Supabase (expired link, etc.)
        if (errorParam) {
          console.error('Auth callback error param:', errorParam, errorDescription);
          navigate('/auth', {
            replace: true,
            state: { error: errorDescription || 'Link inválido ou expirado. Tente novamente.' },
          });
          return;
        }

        // Recovery flow
        if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Recovery session error:', sessionError);
            navigate('/esqueci-senha', {
              replace: true,
              state: { error: 'Link de recuperação inválido ou expirado. Solicite um novo.' },
            });
            return;
          }

          navigate('/esqueci-senha?step=newPassword', { replace: true });
          return;
        }

        // Email change confirmation
        if (type === 'email_change' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Email change session error:', sessionError);
            navigate('/auth', { replace: true, state: { error: 'Link de confirmação inválido ou expirado.' } });
            return;
          }

          navigate('/dashboard', { replace: true, state: { emailChanged: true } });
          return;
        }

        // Signup confirmation — Supabase may auto-set session via PKCE
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          // Try exchanging code if present (PKCE flow)
          const code = searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeError) {
              navigate('/dashboard', { replace: true });
              return;
            }
          }
          navigate('/auth', { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/auth', { replace: true });
      }
    };

    handle();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm tracking-wider">
          Processando... redirecionando em breve.
        </p>
      </div>
    </div>
  );
}
