import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Unlink } from "lucide-react";
import { useGoogleOAuth } from "@/hooks/useGoogleOAuth";

export function GoogleConnectButton() {
  const { connected, email, loading, connect, disconnect } = useGoogleOAuth();

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        Verificando...
      </Button>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <Link2 className="h-3 w-3 mr-1" />
          {email || "Conectado"}
        </Badge>
        <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs text-muted-foreground hover:text-destructive">
          <Unlink className="h-3.5 w-3.5 mr-1" />
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={connect} className="btn-gold">
      <Link2 className="h-3.5 w-3.5 mr-1" />
      Conectar Google
    </Button>
  );
}
