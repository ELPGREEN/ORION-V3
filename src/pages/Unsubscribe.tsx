import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === 'already_unsubscribed') setStatus('already');
        else if (data.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleConfirm = async () => {
    try {
      const { data } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">ORION</h1>
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-8">by ELP Global</p>

        {status === 'loading' && <p className="text-muted-foreground">Verificando...</p>}

        {status === 'valid' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Cancelar inscrição</h2>
            <p className="text-muted-foreground mb-6">
              Você não receberá mais e-mails da plataforma Orion. Tem certeza?
            </p>
            <button
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Confirmar cancelamento
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Inscrição cancelada</h2>
            <p className="text-muted-foreground">Você foi removido da nossa lista de e-mails com sucesso.</p>
          </>
        )}

        {status === 'already' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Já cancelado</h2>
            <p className="text-muted-foreground">Sua inscrição já foi cancelada anteriormente.</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Link inválido</h2>
            <p className="text-muted-foreground">Este link de cancelamento é inválido ou expirou.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Erro</h2>
            <p className="text-muted-foreground">Ocorreu um erro. Tente novamente mais tarde.</p>
          </>
        )}
      </div>
    </div>
  );
}
