import { useState, forwardRef } from "react";
import { MessageCircle, X, ExternalLink, UserPlus, MessageSquare, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export const FloatingChatButton = forwardRef<HTMLDivElement>(function FloatingChatButton(_, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {/* Menu expandido */}
      <div
        className={cn(
          "absolute bottom-16 right-0 w-72 bg-card border border-border rounded-lg shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-primary p-4">
          <h3 className="text-primary-foreground font-serif text-lg">
            Fale com a ELP
          </h3>
          <p className="text-primary-foreground/80 text-xs mt-1">
            Atendimento empresarial rápido e personalizado
          </p>
        </div>

        {/* Options */}
        <div className="p-3 space-y-2">
          {user ? (
            <Link
              to="/consulta"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors group"
            >
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Consultar Orion IA</p>
                <p className="text-xs text-muted-foreground">Assistente de IA empresarial</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ) : (
            <Link
              to="/cadastro"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors group"
            >
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Criar Conta</p>
                <p className="text-xs text-muted-foreground">Acesse a plataforma ORION</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          )}

          {/* Email */}
          <a
            href="mailto:info@elpgreen.com"
            className="flex items-center gap-3 p-3 rounded-md bg-accent/10 hover:bg-accent/20 transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">E-mail</p>
              <p className="text-xs text-muted-foreground">info@elpgreen.com</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          {/* Website ELP */}
          <a
            href="https://www.elpgreen.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-md bg-accent/10 hover:bg-accent/20 transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Globe className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Site ELP</p>
              <p className="text-xs text-muted-foreground">elpgreen.com</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-muted/50 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            ELP Green Technology S.R.L. • VAT IT02712340062 • +39 350 1021359
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <div className="relative">
        <Button
          onClick={handleButtonClick}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            isOpen 
              ? "bg-muted hover:bg-muted/80 rotate-0" 
              : "bg-primary hover:bg-primary/90 animate-pulse"
          )}
          size="icon"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          )}
        </Button>

        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
        )}
      </div>
    </div>
  );
});