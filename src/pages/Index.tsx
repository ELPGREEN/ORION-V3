import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import {
  HeroSection,
  ComparisonSection,
  CtaSection,
  SystemArchitectureSection,
  SmartOtrSection,
  TechStackSection,
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
        title="Orion Intelligence Platform | Enterprise AI by ELP® Green Technology"
        description="Orion Intelligence Platform — enterprise AI for workflow automation, document management, client organization, and business process optimization. Bank-grade security by ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-home.jpg"
        canonical="https://www.iasofthub.com"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Orion Intelligence Platform",
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
      <section id="about" className="relative py-10 sm:py-14 bg-muted/5 border-y border-border/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Orion Intelligence Platform
          </h2>
          <p className="text-xs text-primary/70 tracking-[0.3em] uppercase mb-6">by ELP® Green Technology</p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            <strong>Orion Intelligence Platform</strong> is an enterprise artificial intelligence platform that helps businesses 
            automate workflows, manage documents, organize clients, and optimize processes. 
            It features <strong>Orion IA</strong> — an advanced AI assistant with natural language understanding, 
            voice interaction, document generation, and real-time analytics — all protected by bank-grade security (<em>Orion Shield</em>).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The platform is designed for professionals, law firms, businesses, and enterprises that need intelligent automation, 
            CRM capabilities, legal document drafting, financial analysis, and AI-powered decision support — accessible from any device.
          </p>
          <div className="bg-background/50 border border-border/20 rounded-md p-4 max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              <strong className="text-foreground/70">Google Sign-In disclosure:</strong> Orion Intelligence Platform uses your Google account 
              solely for secure authentication. We only access your name and email address to create your account. 
              No email content, contacts, Drive files, or other sensitive data is accessed, collected, or stored.
            </p>
          </div>
        </div>
      </section>

      <WhoIsItForSection />
      <SystemArchitectureSection />
      <SmartOtrSection />
      <TechStackSection />
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
