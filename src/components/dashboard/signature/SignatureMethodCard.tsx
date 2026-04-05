import { LucideIcon } from "lucide-react";

interface SignatureMethodCardProps {
  id: string;
  label: string;
  desc: string;
  badge: string;
  icon: LucideIcon;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function SignatureMethodCard({
  id,
  label,
  desc,
  badge,
  icon: Icon,
  selected,
  onClick,
  disabled = false,
}: SignatureMethodCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 border text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          selected ? "text-primary" : "text-muted-foreground"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-[9px] px-1.5 py-0.5 border border-primary/30 text-primary">
            {badge}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
