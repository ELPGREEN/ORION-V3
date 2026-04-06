import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import {
  HeroSection,
  WhyOrionSection,
  ComparisonSection,
  CtaSection,
  OrionVideoShowcase,
} from '@/components/home';
import { WhoIsItForSection } from '@/components/home/WhoIsItForSection';
import { useTranslation } from '@/contexts/LanguageContext';

export default function Index() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO
        title="ORION IA | Inteligência Artificial Empresarial — ELP® Green Technology"
        description="Plataforma de IA empresarial para automação de processos, gestão de documentos e clientes. Orion Shield com proteção de nível bancário. By ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-home.jpg"
        canonical="https://www.iasofthub.com"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "ORION - IA Empresarial",
          "url": "https://www.iasofthub.com",
          "description": "Plataforma de inteligência artificial empresarial para automação, gestão de documentos, clientes e processos.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "creator": {
            "@type": "Organization",
            "name": "ELP® Green Technology",
            "url": "https://www.iasofthub.com",
          },
        }}
      />

      <Header />

      {/* 1. Hero — proposta de valor */}
      <HeroSection t={t} />

      {/* 2. Vídeo showcase */}
      <OrionVideoShowcase />

      {/* 3. Para quem é — cards de perfil com link direto */}
      <WhoIsItForSection />

      {/* 4. Por que escolher o ORION — diferenciais */}
      <WhyOrionSection />

      {/* 5. Comparativo — ORION vs outros */}
      <ComparisonSection />

      {/* 6. CTA Final */}
      <CtaSection />

      {/* Privacy Note */}
      <section className="py-6 bg-muted/10 border-t border-border/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <p className="text-xs text-center text-muted-foreground">
            Seus dados são protegidos conforme nossa política.{' '}
            <Link to="/privacidade" className="underline hover:text-primary transition-colors">Privacidade</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}