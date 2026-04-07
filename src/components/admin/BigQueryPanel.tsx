import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Play, Table2, DollarSign } from "lucide-react";
import { bigqueryQuery, bigqueryDatasets } from "@/lib/google-server";
import { toast } from "sonner";

const PRESET_QUERIES = [
  {
    label: "Listar Datasets",
    action: "datasets",
    query: "",
  },
  {
    label: "Tabelas do Dataset ORION",
    action: "query",
    query: `SELECT table_name, row_count, size_bytes
FROM \`orion-d3734.ORION.INFORMATION_SCHEMA.TABLES\`
ORDER BY table_name`,
  },
  {
    label: "Custos por Serviço (últimos 30 dias)",
    action: "query",
    query: `SELECT
  service.description AS servico,
  ROUND(SUM(cost), 2) AS custo_total,
  currency
FROM \`orion-d3734.ORION.gcp_billing_export_v1_*\`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY servico, currency
ORDER BY custo_total DESC
LIMIT 20`,
  },
  {
    label: "Custos Diários (últimos 7 dias)",
    action: "query",
    query: `SELECT
  DATE(usage_start_time) AS dia,
  ROUND(SUM(cost), 4) AS custo_diario,
  currency
FROM \`orion-d3734.ORION.gcp_billing_export_v1_*\`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY dia, currency
ORDER BY dia DESC`,
  },
  {
    label: "Créditos Restantes",
    action: "query",
    query: `SELECT
  credits.name AS credito,
  ROUND(SUM(credits.amount), 2) AS valor_credito,
  currency
FROM \`orion-d3734.ORION.gcp_billing_export_v1_*\`,
UNNEST(credits) AS credits
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY credito, currency
ORDER BY valor_credito`,
  },
];

export function BigQueryPanel() {
  const [query, setQuery] = useState(PRESET_QUERIES[1].query);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const executeQuery = async (action: string, sql: string) => {
    setLoading(true);
    setResults(null);
    try {
      let data;
      if (action === "datasets") {
        data = await bigqueryDatasets();
      } else {
        data = await bigqueryQuery(sql, 100);
      }
      setResults(data);
      toast.success("Consulta executada com sucesso");
    } catch (err: any) {
      toast.error(err.message || "Erro na consulta BigQuery");
      setResults({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (!results) return null;
    if (results.error) {
      return (
        <div className="p-4 bg-destructive/10 rounded-lg text-destructive text-sm font-mono whitespace-pre-wrap">
          {results.error}
        </div>
      );
    }

    // Datasets response
    if (results.datasets) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.datasets.length} dataset(s) encontrado(s):
          </p>
          {results.datasets.map((ds: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm">{ds.datasetReference?.datasetId}</span>
              <Badge variant="outline" className="text-xs">
                {ds.location}
              </Badge>
            </div>
          ))}
        </div>
      );
    }

    // Query response with rows
    const schema = results.schema?.fields || [];
    const rows = results.rows || [];

    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground p-4">
          Nenhum resultado encontrado. Verifique se a tabela de billing export existe no dataset ORION.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {schema.map((col: any, i: number) => (
                <th key={i} className="text-left p-2 font-medium text-muted-foreground">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, ri: number) => (
              <tr key={ri} className="border-b border-border/50 hover:bg-muted/30">
                {row.f.map((cell: any, ci: number) => (
                  <td key={ci} className="p-2 font-mono text-xs">
                    {cell.v ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-2">
          {results.totalRows || rows.length} resultado(s)
        </p>
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          BigQuery — Custos GCP
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESET_QUERIES.map((pq, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (pq.action === "datasets") {
                  executeQuery("datasets", "");
                } else {
                  setQuery(pq.query);
                }
              }}
            >
              {pq.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM `orion-d3734.ORION.tabela` LIMIT 10"
            className="font-mono text-xs min-h-[100px] bg-muted/30"
          />
          <Button
            onClick={() => executeQuery("query", query)}
            disabled={loading || !query.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar
          </Button>
        </div>

        {results && (
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Resultados</span>
            </div>
            {renderTable()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
