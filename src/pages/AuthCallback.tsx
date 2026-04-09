import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      try {
        // Check URL hash for recovery/email change tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // If it's a recovery link, set session and redirect to password reset
        if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Recovery session error:', sessionError);
            navigate('/auth', { replace: true, state: { error: 'Link de recuperação inválido ou expirado.' } });
            return;
          }

          // Redirect to password reset page with recovery flag
          navigate('/esqueci-senha?step=newPassword', { replace: true });
          return;
        }

        // If it's an email change confirmation
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

        // Default: check for existing session (OAuth, signup confirmation, etc.)
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
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
  }, [navigate]);

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
