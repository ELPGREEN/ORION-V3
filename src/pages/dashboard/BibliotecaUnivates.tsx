import { DataSourcesPanel } from "@/components/dashboard/neural/DataSourcesPanel";
import { SEO } from "@/components/SEO";

export default function BibliotecaUnivates() {
  return (
    <div className="space-y-6">
      <SEO
        title="Biblioteca Univates — E-books Jurídicos | ORION"
        description="Extração e indexação de doutrina jurídica de e-books acadêmicos da Biblioteca Univates"
      />
      <div>
        <h1 className="text-2xl font-serif text-foreground">Biblioteca Univates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Extração de doutrina comentada, conceitos e teses defensivas de e-books acadêmicos
        </p>
      </div>
      <DataSourcesPanel />
    </div>
  );
}
