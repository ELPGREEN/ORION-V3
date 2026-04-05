import type { HonorarioOption } from "@/pages/dashboard/AgendarConsulta";

interface StepTipoProps {
  honorarios: HonorarioOption[];
  selectedTipo: string | null;
  onSelect: (tipo: string) => void;
}

const duracaoMap: Record<string, string> = {
  consulta_inicial: "1 hora",
  consulta_retorno: "45 min",
  parecer_juridico: "Sob demanda",
};

export default function StepTipo({ honorarios, selectedTipo, onSelect }: StepTipoProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-serif text-foreground">Selecione o tipo de consulta</h2>
      {honorarios.map((h) => (
        <button
          key={h.tipo_servico}
          onClick={() => onSelect(h.tipo_servico)}
          className={`w-full bg-card border p-5 text-left hover-gold-glow transition-all ${
            selectedTipo === h.tipo_servico ? "border-primary" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{h.descricao}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Duração: {duracaoMap[h.tipo_servico] || "Variável"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-serif text-primary">
                R$ {h.valor.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[9px] text-muted-foreground">PIX, cartão ou boleto</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
