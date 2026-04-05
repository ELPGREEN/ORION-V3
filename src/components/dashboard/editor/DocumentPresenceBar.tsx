/**
 * DocumentPresenceBar – Shows avatars of users currently viewing the document
 * and lock status indicator.
 */
import { Lock, Unlock, Users, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { PresenceUser } from "@/hooks/useDocumentPresence";
import { cn } from "@/lib/utils";

interface DocumentPresenceBarProps {
  presentUsers: PresenceUser[];
  otherUsers: PresenceUser[];
  totalViewers: number;
  isConnected: boolean;
  connectedPeers: number;
  // Lock state
  isLockedByOther: boolean;
  isMyLock: boolean;
  lockOwnerName: string | null;
  onAcquireLock: () => void;
  onReleaseLock: () => void;
}

export function DocumentPresenceBar({
  otherUsers,
  totalViewers,
  isConnected,
  connectedPeers,
  isLockedByOther,
  isMyLock,
  lockOwnerName,
  onAcquireLock,
  onReleaseLock,
}: DocumentPresenceBarProps) {
  const maxAvatars = 4;
  const visibleUsers = otherUsers.slice(0, maxAvatars);
  const extraCount = otherUsers.length - maxAvatars;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/50">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[9px] text-muted-foreground">
                {connectedPeers + 1}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {isConnected
                ? `${connectedPeers + 1} conectado${connectedPeers !== 0 ? "s" : ""} (P2P)`
                : "Modo offline"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Presence avatars */}
        {otherUsers.length > 0 && (
          <div className="flex items-center gap-0.5">
            <Users className="h-3 w-3 text-muted-foreground mr-0.5" />
            <div className="flex -space-x-1.5">
              {visibleUsers.map((u) => (
                <Tooltip key={u.userId}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border border-background flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-110 hover:z-10 presence-avatar-enter",
                        u.isEditing && "ring-1 ring-offset-1 ring-primary"
                      )}
                      style={{ backgroundColor: u.color }}
                      role="img"
                      aria-label={`${u.name} ${u.isEditing ? "editando" : "visualizando"}`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {u.name}
                      {u.isEditing ? " (editando)" : " (visualizando)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {extraCount > 0 && (
                <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                  +{extraCount}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Viewers count */}
        {totalViewers > 1 && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
            {totalViewers} no documento
          </Badge>
        )}

        {/* Lock control */}
        {isLockedByOther && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-1">
                <Lock className="h-2.5 w-2.5" />
                Bloqueado por {lockOwnerName}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Outro usuário está editando. Aguarde para editar.</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isMyLock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] gap-1"
                onClick={onReleaseLock}
              >
                <Unlock className="h-2.5 w-2.5" />
                Liberar edição
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para liberar o documento para outros editores.</p>
            </TooltipContent>
          </Tooltip>
        )}

        {!isLockedByOther && !isMyLock && otherUsers.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] gap-1"
                onClick={onAcquireLock}
              >
                <Lock className="h-2.5 w-2.5" />
                Bloquear edição
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bloquear documento para edição exclusiva.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
