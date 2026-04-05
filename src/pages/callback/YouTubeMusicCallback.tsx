import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleYTMusicCallback } from "@/lib/youtube-music/youtube-music-service";
import { Loader2 } from "lucide-react";

export default function YouTubeMusicCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Google retornou erro: ${errorParam}`);
      setTimeout(() => navigate("/install"), 3000);
      return;
    }

    if (!code || !state) {
      setError("Parâmetros de callback inválidos");
      setTimeout(() => navigate("/install"), 3000);
      return;
    }

    handleYTMusicCallback(code, state).then((success) => {
      if (success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError("Falha ao conectar YouTube Music");
        setTimeout(() => navigate("/install"), 3000);
      }
    });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-muted-foreground text-xs">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">Conectando YouTube Music...</p>
      </div>
    </div>
  );
}
