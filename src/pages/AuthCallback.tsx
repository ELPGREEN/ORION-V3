import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          navigate('/auth', { replace: true });
          return;
        }

        if (!data.session) {
          navigate('/auth', { replace: true });
          return;
        }

        // Sessão válida — redireciona para dashboard
        navigate('/dashboard', { replace: true });
      } catch (err) {
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
          Processando login... redirecionando em breve.
        </p>
      </div>
    </div>
  );
}
