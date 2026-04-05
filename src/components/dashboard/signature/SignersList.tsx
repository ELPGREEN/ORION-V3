import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Signer {
  name: string;
  email: string;
  phone: string;
}

interface SignersListProps {
  signers: Signer[];
  onUpdate: (index: number, field: keyof Signer, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function SignersList({ signers, onUpdate, onAdd, onRemove }: SignersListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground tracking-wider uppercase">
          Signatários
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-primary"
          onClick={onAdd}
        >
          + Adicionar
        </Button>
      </div>

      {signers.map((signer, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 p-2 border border-border bg-secondary/30">
          <Input
            placeholder="Nome"
            value={signer.name}
            onChange={(e) => onUpdate(i, "name", e.target.value)}
            className="bg-card border-border h-8 text-xs"
          />
          <div className="relative">
            <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="E-mail"
              value={signer.email}
              onChange={(e) => onUpdate(i, "email", e.target.value)}
              className="bg-card border-border h-8 text-xs pl-7"
            />
          </div>
          <div className="relative flex gap-1">
            <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="WhatsApp"
              value={signer.phone}
              onChange={(e) => onUpdate(i, "phone", e.target.value)}
              className="bg-card border-border h-8 text-xs pl-7 flex-1"
            />
            {signers.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive/60 hover:text-destructive"
                onClick={() => onRemove(i)}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
