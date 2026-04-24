import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";

export default function Index() {
  return (
    <MainLayout>
      <SEO
        title="Orion Intelligence Platform"
        description="Plataforma de inteligência artificial empresarial."
        canonical="https://www.iasofthub.com"
      />

      <section className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center space-y-6">
          <p className="text-xs tracking-[0.4em] uppercase text-primary/70">
            by ELP® Green Technology
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold text-foreground tracking-tight">
            Orion
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Espaço pronto para receber o conteúdo da nova landing page.
          </p>
          <div className="pt-8">
            <div className="mx-auto h-px w-24 bg-border/60" />
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
