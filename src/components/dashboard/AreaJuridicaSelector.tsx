import { Scale, Briefcase, Heart, Building, Landmark, Shield, Trees, Gavel } from "lucide-react";

interface AreaJuridicaSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isJudicial: boolean;
}

const areasJuridicas = [
  { id: "civil", label: "Cível", icon: Scale, desc: "Contratos, obrigações, responsabilidade civil" },
  { id: "consumidor", label: "Consumidor", icon: Briefcase, desc: "CDC, relações de consumo" },
  { id: "trabalhista", label: "Trabalhista", icon: Building, desc: "CLT, rescisão, verbas" },
  { id: "familia", label: "Família", icon: Heart, desc: "Divórcio, guarda, alimentos" },
  { id: "previdenciario", label: "Previdenciário", icon: Shield, desc: "INSS, aposentadoria, benefícios" },
  { id: "tributario", label: "Tributário", icon: Landmark, desc: "Impostos, execução fiscal" },
  { id: "administrativo", label: "Administrativo", icon: Building, desc: "Licitações, servidores" },
  { id: "penal", label: "Penal", icon: Gavel, desc: "Crimes, defesa criminal" },
  { id: "ambiental", label: "Ambiental", icon: Trees, desc: "Meio ambiente, licenciamento" },
];

export function AreaJuridicaSelector({
  value,
  onChange,
  isJudicial,
}: AreaJuridicaSelectorProps) {
  if (!isJudicial) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground tracking-wider uppercase">
        Área Jurídica (para pesquisa RAG)
      </label>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {areasJuridicas.map((area) => {
          const Icon = area.icon;
          const selected = value === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onChange(selected ? "" : area.id)}
              className={`p-2 border text-left transition-all group ${
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon
                  className={`h-3.5 w-3.5 ${
                    selected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    selected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {area.label}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground line-clamp-1">
                {area.desc}
              </p>
            </button>
          );
        })}
      </div>
      {value && (
        <p className="text-[10px] text-muted-foreground">
          💡 O sistema RAG priorizará jurisprudência e legislação de{" "}
          <strong>{areasJuridicas.find((a) => a.id === value)?.label}</strong>
        </p>
      )}
    </div>
  );
}
