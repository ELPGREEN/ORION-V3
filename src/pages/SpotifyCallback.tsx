import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleSpotifyCallback } from "@/lib/spotify/spotify-service";
import { Disc3 } from "lucide-react";

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");

    if (err) {
      console.error("[SpotifyCallback] OAuth error:", err);
      setError(err);
      setTimeout(() => navigate("/dashboard/configuracoes"), 3000);
      return;
    }

    if (code) {
      console.log("[SpotifyCallback] Exchanging code...");
      handleSpotifyCallback(code, `${window.location.origin}/spotify-callback`)
        .then(() => {
          console.log("[SpotifyCallback] Login success!");
          navigate("/dashboard/configuracoes");
        })
        .catch((e) => {
          console.error("[SpotifyCallback] Exchange error:", e.message);
          setError(e.message);
          setTimeout(() => navigate("/dashboard/configuracoes"), 3000);
        });
    } else {
      console.warn("[SpotifyCallback] No code or error in URL");
      setError("Nenhum código de autorização recebido");
      setTimeout(() => navigate("/dashboard/configuracoes"), 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#060a10] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Disc3 className="h-12 w-12 text-[#1DB954] animate-spin mx-auto" />
        <p className="text-white/60 font-mono text-sm">
          {error ? `Erro: ${error}` : "Conectando ao Spotify..."}
        </p>
      </div>
    </div>
  );
}
