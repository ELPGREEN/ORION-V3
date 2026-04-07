import { useState } from 'react';
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
import { WelcomeSplash } from '@/components/home/WelcomeSplash';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Show splash only once per session and only for non-logged users
  const alreadySeen = sessionStorage.getItem('orion_splash_seen') === '1';
  const [showSplash, setShowSplash] = useState(!user && !alreadySeen);

  if (showSplash) {
    return <WelcomeSplash onDismiss={() => setShowSplash(false)} />;
  }

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
      <HeroSection t={t} />

      {/* App purpose section — required for Google OAuth verification */}
      <section id="about" className="py-16 sm:py-20 bg-muted/5 border-y border-border/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            What is Orion IA Platform?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
            <strong>Orion IA Platform</strong> is an enterprise artificial intelligence solution developed by <strong>ELP® Green Technology</strong>. 
            It helps businesses automate workflows, manage documents, organize client data, and streamline internal processes — 
            all powered by next-generation neural intelligence with bank-grade security (<em>Orion Shield</em>).
          </p>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            Orion IA Platform uses your Google account solely for secure authentication and sign-in. 
            No email content, contacts, or sensitive data is accessed or stored beyond basic profile information (name and email) 
            needed to create your account.
          </p>
        </div>
      </section>

      <OrionVideoShowcase />
      <WhoIsItForSection />
      <WhyOrionSection />
      <ComparisonSection />
      <CtaSection />

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
