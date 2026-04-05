import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyticsRunReport } from "@/lib/google-server";

export function AnalyticsPanel() {
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState("30daysAgo");
  const [endDate, setEndDate] = useState("today");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const { toast } = useToast();

  async function handleReport() {
    if (!propertyId.trim()) return;
    setLoading(true);
    try {
      const data = await analyticsRunReport(
        propertyId.trim(),
        { startDate, endDate },
        ["activeUsers", "sessions", "screenPageViews"],
        ["date"]
      );
      setReport(data);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Google Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Property ID (ex: 123456789)" value={propertyId} onChange={e => setPropertyId(e.target.value)} />
          <Input placeholder="Data início (30daysAgo)" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input placeholder="Data fim (today)" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button onClick={handleReport} disabled={loading || !propertyId.trim()} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          Gerar Relatório
        </Button>

        {report && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 max-h-96 overflow-y-auto">
            <p className="text-sm font-medium text-foreground">
              {report.rowCount || 0} registros
            </p>
            {report.rows?.slice(0, 20).map((row: any, i: number) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground border-t border-border pt-1">
                <span>{row.dimensionValues?.map((d: any) => d.value).join(" | ")}</span>
                <span>{row.metricValues?.map((m: any) => m.value).join(" / ")}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
