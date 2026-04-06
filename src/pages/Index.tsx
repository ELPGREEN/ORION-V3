import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { TechDivider } from '@/components/ui/TechDivider';
import {
  HeroSection,
  ImpactStatsSection,
  WhyOrionSection,
  BenefitsSection,
  SystemArchitectureSection,
  TechStackSection,
  ComparisonSection,
  CtaSection,
  SecurityShieldSection,
  OrionVideoShowcase,
} from '@/components/home';
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

      {/* Hero + Impact Stats */}
      <HeroSection t={t} />
      <OrionVideoShowcase />
      <ImpactStatsSection />

      {/* Why Choose ORION */}
      <WhyOrionSection />

      {/* Features & Benefits */}
      <BenefitsSection />

      {/* Neon divider */}
      <TechDivider />

      {/* System Architecture */}
      <SystemArchitectureSection />

      {/* Tech Stack */}
      <TechStackSection />

      {/* Comparison */}
      <ComparisonSection />

      {/* Security Shield */}
      <SecurityShieldSection />

      {/* Privacy Note */}
      <section className="py-6 bg-muted/10 border-t border-border/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <p className="text-xs text-center text-muted-foreground">
            Seus dados são protegidos conforme nossa política.{' '}
            <Link to="/privacidade" className="underline hover:text-primary transition-colors">Privacidade</Link>
          </p>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </div>
  );
}
