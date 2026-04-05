import { useState, useMemo } from "react";
import { Building2, MapPin, Scale, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getAllTribunais,
  varasPrimeiraInstancia,
  getTribunalConfig,
  formatarEnderecamento,
  comarcasPorUF,
  UFS_BRASIL,
  UF_NOMES,
  type TribunalConfig,
  type VaraConfig,
} from "@/lib/tribunais-config";

interface TribunalSelectorProps {
  tribunalId: string;
  tipoVara: string;
  comarca: string;
  numeroVara: string;
  onTribunalChange: (value: string) => void;
  onTipoVaraChange: (value: string) => void;
  onComarcaChange: (value: string) => void;
  onNumeroVaraChange: (value: string) => void;
  isJudicial: boolean;
}

export function TribunalSelector({
  tribunalId,
  tipoVara,
  comarca,
  numeroVara,
  onTribunalChange,
  onTipoVaraChange,
  onComarcaChange,
  onNumeroVaraChange,
  isJudicial,
}: TribunalSelectorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTribunal, setSearchTribunal] = useState("");
  const [selectedUF, setSelectedUF] = useState("RS");
  const [searchComarca, setSearchComarca] = useState("");

  const allTribunais = useMemo(() => getAllTribunais(), []);
  const varas = Object.entries(varasPrimeiraInstancia);

  const filteredTribunais = useMemo(() => {
    if (!searchTribunal) return allTribunais;
    const term = searchTribunal.toLowerCase();
    return allTribunais.filter(
      (t) =>
        t.nome.toLowerCase().includes(term) ||
        t.sigla.toLowerCase().includes(term)
    );
  }, [allTribunais, searchTribunal]);

  const filteredComarcas = useMemo(() => {
    const comarcas = comarcasPorUF[selectedUF] || [];
    if (!searchComarca) return comarcas;
    const term = searchComarca.toLowerCase();
    return comarcas.filter((c) => c.toLowerCase().includes(term));
  }, [selectedUF, searchComarca]);

  const selectedTribunal = useMemo(
    () => getTribunalConfig(tribunalId),
    [tribunalId]
  );

  const selectedVara = useMemo(
    () => (tipoVara ? varasPrimeiraInstancia[tipoVara] : undefined),
    [tipoVara]
  );

  const enderecamentoPreview = useMemo(() => {
    if (selectedTribunal) {
      return formatarEnderecamento(selectedTribunal);
    }
    if (selectedVara && comarca) {
      return formatarEnderecamento(
        undefined,
        selectedVara,
        comarca,
        numeroVara ? parseInt(numeroVara) : undefined
      );
    }
    return "Selecione o tribunal ou vara para ver o endereçamento";
  }, [selectedTribunal, selectedVara, comarca, numeroVara]);

  const tipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      superior: "Tribunal Superior",
      federal: "Tribunal Federal",
      estadual: "Tribunal Estadual",
      trabalhista: "Tribunal Trabalhista",
    };
    return labels[tipo] || tipo;
  };

  if (!isJudicial) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-foreground tracking-wider uppercase w-full hover:text-primary transition-colors">
        <Building2 className="h-4 w-4" />
        <span>TRIBUNAL / FORO</span>
        <ChevronDown
          className={`h-4 w-4 ml-auto transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 animate-fade-in">
        {/* Instância Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Tribunais (2ª instância+) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Tribunal (2ª instância ou Superior)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar tribunal..."
                value={searchTribunal}
                onChange={(e) => setSearchTribunal(e.target.value)}
                className="pl-9 h-9 text-xs bg-card border-border"
              />
            </div>
            <Select value={tribunalId || "none"} onValueChange={(v) => {
              const val = v === "none" ? "" : v;
              onTribunalChange(val);
              if (val) onTipoVaraChange("");
            }}>
              <SelectTrigger className="bg-card border-border h-10">
                <SelectValue placeholder="Selecione o tribunal" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="none">Nenhum (1ª instância)</SelectItem>
                {["superior", "federal", "estadual", "trabalhista"].map((tipo) => {
                  const tribunaisTipo = filteredTribunais.filter((t) => t.tipo === tipo);
                  if (tribunaisTipo.length === 0) return null;
                  return (
                    <SelectGroup key={tipo}>
                      <SelectLabel className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {tipoLabel(tipo)}
                      </SelectLabel>
                      {tribunaisTipo.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <Scale className="h-3 w-3 text-primary" />
                            <span>{t.sigla}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {t.nome.replace("Tribunal ", "").slice(0, 30)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Varas (1ª instância) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Vara / Juízo (1ª instância)
            </label>
            <Select 
              value={tipoVara || "none"} 
              onValueChange={(v) => {
                const val = v === "none" ? "" : v;
                onTipoVaraChange(val);
                if (val) onTribunalChange("");
              }}
              disabled={!!tribunalId}
            >
              <SelectTrigger className="bg-card border-border h-10">
                <SelectValue placeholder="Selecione o tipo de vara" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (recurso em tribunal)</SelectItem>
                {varas.map(([key, vara]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{vara.enderecamento.orgao.split(" DA ")[0].replace("DA ", "").replace("DO ", "")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estado, Comarca e Número da Vara (only for 1ª instância) */}
        {tipoVara && !tribunalId && (
          <div className="grid md:grid-cols-3 gap-4">
            {/* UF */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Estado (UF)</label>
              <Select value={selectedUF} onValueChange={(v) => {
                setSelectedUF(v);
                setSearchComarca("");
                onComarcaChange(""); // reset comarca on state change
              }}>
                <SelectTrigger className="bg-card border-border h-10">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {UFS_BRASIL.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf} — {UF_NOMES[uf]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comarca */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Comarca <span className="text-muted-foreground/60">(digite qualquer cidade)</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                <Input
                  placeholder="Digite o nome da comarca..."
                  value={comarca}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchComarca(val);
                    onComarcaChange(val);
                  }}
                  onFocus={() => {
                    if (comarca) setSearchComarca(comarca);
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setSearchComarca(""), 200);
                  }}
                  className="pl-9 h-10 text-xs bg-card border-border"
                />
              </div>
              {(searchComarca && filteredComarcas.length > 0) && (
                <div className="max-h-[200px] overflow-y-auto border border-border rounded-sm bg-card shadow-md">
                  {filteredComarcas.slice(0, 15).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onComarcaChange(c);
                        setSearchComarca("");
                      }}
                    >
                      {c}
                    </button>
                  ))}
                  {filteredComarcas.length > 15 && (
                    <p className="px-3 py-1 text-[10px] text-muted-foreground">
                      +{filteredComarcas.length - 15} resultados — continue digitando...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Número da Vara */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Nº da Vara (opcional)
              </label>
              <Input
                placeholder="Ex: 1, 2, 3..."
                value={numeroVara}
                onChange={(e) => onNumeroVaraChange(e.target.value)}
                className="bg-card border-border h-10"
                type="number"
                min="1"
                max="99"
              />
            </div>
          </div>
        )}

        {/* Endereçamento Preview */}
        <div className="p-3 bg-muted/30 border border-border rounded-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Prévia do Endereçamento
          </p>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-serif leading-relaxed">
            {enderecamentoPreview}
          </pre>
        </div>

        {/* Tribunal Info */}
        {selectedTribunal && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] px-2 py-1 border border-primary/30 text-primary bg-primary/5">
              Estilo: {selectedTribunal.estiloArgumentacao}
            </span>
            <span className="text-[10px] px-2 py-1 border border-border text-muted-foreground">
              Citação: {selectedTribunal.formatacao.citacaoEstilo.toUpperCase()}
            </span>
            {selectedTribunal.legislacaoPrioritaria.slice(0, 3).map((leg) => (
              <span
                key={leg}
                className="text-[10px] px-2 py-1 border border-border text-muted-foreground"
              >
                {leg}
              </span>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
