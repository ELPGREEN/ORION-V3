import { } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Scale, Globe, Shield, AlertCircle, Link2, Gavel, Mail, Sparkles } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';


import { useParallax } from '@/hooks/useParallax';

// Lazy load 3D components


const termsHighlights = [
  { icon: Scale, title: 'Termos Claros', desc: 'Linguagem acessível e transparente' },
  { icon: Shield, title: 'Proteção Legal', desc: 'Seus direitos garantidos' },
  { icon: Globe, title: 'Uso Global', desc: 'Válido em todas as jurisdições' },
  { icon: Gavel, title: 'Lei Brasileira', desc: 'Regido pela legislação do Brasil' },
];

const sectionIcons: Record<string, React.ElementType> = {
  acceptance: Scale,
  siteUsage: Globe,
  intellectualProperty: Shield,
  liability: AlertCircle,
  externalLinks: Link2,
  applicableLaw: Gavel,
  contact: Mail,
};

export default function Terms() {
  const { t } = useTranslation();
  const parallaxOffset = useParallax(0.3);

  const sections = [
    { key: 'acceptance', hasText2: false },
    { key: 'siteUsage', hasText2: false },
    { key: 'intellectualProperty', hasText2: true },
    { key: 'liability', hasText2: false },
    { key: 'externalLinks', hasText2: false },
    { key: 'applicableLaw', hasText2: false },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO 
        title="Termos de Uso | ELP Green Technology"
        description="Termos e condições de uso do site ELP Green Technology. Propriedade intelectual, responsabilidades e lei aplicável."
        url="https://www.iasofthub.com/terms"
      />
      <Header />

      {/* Hero Section with Particles */}
      <section className="relative min-h-[45vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        
        
        <div 
          className="container-wide relative z-10"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-primary/30"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">Documento Legal</span>
            </motion.div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/30">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">{t('legal.terms.title')}</h1>
            </div>
            <p className="text-xl text-white/70">{t('legal.terms.subtitle')}</p>
          </motion.div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Terms Highlights */}
      <section className="py-12 border-b border-border/50">
        <div className="container-wide">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {termsHighlights.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -3 }}
              >
                <GlassCard className="p-4 text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container-wide max-w-4xl">
          <Button asChild variant="ghost" className="mb-8">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('legal.backToHome')}
            </Link>
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {sections.map((section, index) => {
              const IconComponent = sectionIcons[section.key] || FileText;
              return (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <GlassCard className="p-8">
                    <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      {t(`legal.terms.${section.key}.title`)}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(`legal.terms.${section.key}.text`)}
                    </p>
                    {section.hasText2 && (
                      <p className="text-muted-foreground leading-relaxed mt-4">
                        {t(`legal.terms.${section.key}.text2`)}
                      </p>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}

            {/* Contact Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <GlassCard className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  {t('legal.terms.contact.title')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {t('legal.terms.contact.text')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-background/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('legal.terms.contact.email')}:</p>
                    <a href="mailto:info@iasofthub.com" className="font-medium text-primary hover:underline">info@iasofthub.com</a>
                  </div>
                  <div className="sm:border-l sm:pl-4 border-border">
                    <p className="text-sm text-muted-foreground">{t('legal.terms.contact.website')}:</p>
                    <a href="https://www.iasofthub.com" className="font-medium text-primary hover:underline">www.iasofthub.com</a>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <p className="text-sm text-muted-foreground border-t pt-6 mt-8 text-center">
              {t('legal.lastUpdate')}
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
