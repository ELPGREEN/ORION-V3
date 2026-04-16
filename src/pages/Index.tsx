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
  SystemArchitectureSection,
  SmartOtrSection,
  TechStackSection,
  SecurityShieldSection,
} from '@/components/home';
import { WhoIsItForSection } from '@/components/home/WhoIsItForSection';
import { ImpactMetricsSection } from '@/components/home/ImpactMetricsSection';
import { WelcomeSplash } from '@/components/home/WelcomeSplash';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const alreadySeen = sessionStorage.getItem('orion_splash_seen') === '1';
  const [showSplash, setShowSplash] = useState(!user && !alreadySeen);

  if (showSplash) {
    return <WelcomeSplash onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO
        title="Orion Intelligence Platform | Enterprise AI by ELP® Green Technology"
        description="Orion Intelligence Platform — enterprise AI with 17+ integrated modules for workflow automation, document management, computer vision, and business optimization. Bank-grade security by ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-home.jpg"
        canonical="https://www.iasofthub.com"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Orion Intelligence Platform",
          "url": "https://www.iasofthub.com",
          "description": "Plataforma de inteligência artificial empresarial com 17+ módulos integrados para automação, gestão de documentos, visão computacional e otimização de processos.",
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
      <section id="about" className="relative py-8 sm:py-10 bg-muted/5 border-y border-border/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Orion Intelligence Platform
          </h2>
          <p className="text-xs text-primary/70 tracking-[0.3em] uppercase mb-6">by ELP® Green Technology</p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            <strong>Orion Intelligence Platform</strong> is a comprehensive enterprise artificial intelligence solution by ELP® Green Technology.
            Our platform integrates <strong>17+ specialized neural modules</strong> to help legal professionals, businesses, and developers
            automate complex workflows, manage high-volume documentation, and gain real-time insights through computer vision and predictive analytics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left my-8">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h3 className="font-semibold text-primary mb-2">How it works</h3>
              <p className="text-sm text-muted-foreground">
                Users can connect their tools to automate document generation, perform legal research, and manage client relationships via a unified dashboard or voice commands.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h3 className="font-semibold text-primary mb-2">Core Features</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>AI-Powered Legal CRM & Document Drafting</li>
                <li>Real-time Computer Vision & IoT Integration</li>
                <li>Secure Cloud Synchronization & Audit Logging</li>
              </ul>
            </div>
          </div>
          <div className="bg-background/50 border border-border/20 rounded-md p-6 max-w-2xl mx-auto text-left">
            <h3 className="text-sm font-semibold mb-3">Google Data Transparency & Usage</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              To provide a seamless experience, Orion requests access to your Google account data for the following specific purposes:
            </p>
            <ul className="text-xs text-muted-foreground space-y-2 mb-4">
              <li>• <strong className="text-foreground/70">Authentication:</strong> We use your email and profile picture to create and secure your Orion account.</li>
              <li>• <strong className="text-foreground/70">Integration (Optional):</strong> If you explicitly choose to enable Google Workspace integrations, Orion will request incremental permissions to read/write documents or sync calendars directly to your dashboard. This data is never shared with third parties or used for model training.</li>
            </ul>
            <p className="text-xs text-muted-foreground/80 italic border-t border-border/10 pt-3">
              We adhere strictly to Google's Limited Use Policy. No sensitive data is accessed without your direct action and explicit consent.
              For more details, please review our <Link to="/privacidade" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>

      <OrionVideoShowcase />
      <ImpactMetricsSection />
      <WhoIsItForSection />
      <SystemArchitectureSection />
      <SmartOtrSection />
      <TechStackSection />
      <SecurityShieldSection />
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
