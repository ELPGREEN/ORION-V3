import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepDataHoraProps {
  selectedData: string;
  selectedHora: string | null;
  horarios: string[];
  onDataChange: (data: string) => void;
  onHoraSelect: (hora: string) => void;
  onBack: () => void;
}

export default function StepDataHora({
  selectedData,
  selectedHora,
  horarios,
  onDataChange,
  onHoraSelect,
  onBack,
}: StepDataHoraProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-serif text-foreground">Selecione data e horário</h2>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Data</label>
        <input
          type="date"
          value={selectedData}
          onChange={(e) => onDataChange(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full h-12 bg-card border border-border px-4 text-foreground text-sm"
        />
      </div>
      {selectedData && (
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
            Horário
          </label>
          <div className="grid grid-cols-4 gap-2">
            {horarios.map((hora) => (
              <button
                key={hora}
                onClick={() => onHoraSelect(hora)}
                className={`py-3 border text-sm transition-all ${
                  selectedHora === hora
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <Clock className="h-3 w-3 mx-auto mb-1" />
                {hora}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={onBack}
      >
        ← Voltar
      </Button>
    </div>
  );
}
