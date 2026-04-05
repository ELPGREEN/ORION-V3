import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import {
  Leaf, Recycle, Droplets, Wind, TreePine, Globe, ArrowRight,
  CheckCircle, Sparkles, Factory, Zap, BarChart3, Target, Users,
  Heart, Award, CloudRain, Sun, Building2, TrendingUp, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { lazyRetry } from '@/lib/lazyRetry';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

export default function Sustainability() {
  const { t } = useTranslation();

  const pillars = [
    {
      icon: Recycle,
      titleKey: 'sustainability.pillars.circularEconomy.title',
      descKey: 'sustainability.pillars.circularEconomy.desc',
      stats: '95-100%',
      statsLabel: 'sustainability.pillars.circularEconomy.stat',
    },
    {
      icon: CloudRain,
      titleKey: 'sustainability.pillars.carbonReduction.title',
      descKey: 'sustainability.pillars.carbonReduction.desc',
      stats: '125,000',
      statsLabel: 'sustainability.pillars.carbonReduction.stat',
    },
    {
      icon: Droplets,
      titleKey: 'sustainability.pillars.zeroWaste.title',
      descKey: 'sustainability.pillars.zeroWaste.desc',
      stats: '0%',
      statsLabel: 'sustainability.pillars.zeroWaste.stat',
    },
    {
      icon: Users,
      titleKey: 'sustainability.pillars.socialImpact.title',
      descKey: 'sustainability.pillars.socialImpact.desc',
      stats: '2,500+',
      statsLabel: 'sustainability.pillars.socialImpact.stat',
    },
  ];

  const sdgs = [
    { number: 7, color: '#FCC30B', icon: Sun, key: 'sdg7' },
    { number: 9, color: '#FD6925', icon: Building2, key: 'sdg9' },
    { number: 12, color: '#BF8B2E', icon: Recycle, key: 'sdg12' },
    { number: 13, color: '#3F7E44', icon: CloudRain, key: 'sdg13' },
  ];

  const lifecycle = [
    { icon: Factory, key: 'collection' },
    { icon: Zap, key: 'processing' },
    { icon: Recycle, key: 'recovery' },
    { icon: TrendingUp, key: 'reuse' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO
        title="Sustainability | ELP Green Technology"
        description="Transforming OTR tire waste into circular economy value. 125,000 tons CO₂ avoided. Smart Robotic Line technology for sustainable mining worldwide."
        url="https://www.iasofthub.com/sustainability"
      />
      <Header />

      {/* ═══ HERO — Alien Core + Particles ═══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-black/30 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-md rounded-full px-5 py-2.5 mb-8 border border-primary/30"
            >
              <Leaf className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium tracking-wide">
                {t('sustainability.badge')}
              </span>
            </motion.div>

            <h1 className="text-white mb-6 leading-[1.1] text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {t('sustainability.heroTitle')}
            </h1>

            <p className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('sustainability.heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" variant="elp-white">
                <Link to="/contact">
                  {t('sustainability.partnerCta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <Link to="/certificates">
                  {t('sustainability.esgReport')}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2"
            >
              <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CIRCULAR LIFECYCLE ═══ */}
      <section className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('sustainability.lifecycle.title')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('sustainability.lifecycle.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {lifecycle.map((step, i) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5 }}
              >
                <GlassCard className="p-8 text-center h-full relative overflow-hidden">
                  <div className="absolute top-3 right-4 text-6xl font-bold text-primary/5">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-5 border border-primary/20">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {t(`sustainability.lifecycle.${step.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t(`sustainability.lifecycle.${step.key}.desc`)}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOUR PILLARS ═══ */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('sustainability.pillarsTitle')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.titleKey}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <GlassCard className="p-8 h-full">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <pillar.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{t(pillar.titleKey)}</h3>
                      <p className="text-muted-foreground mb-4">{t(pillar.descKey)}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary">{pillar.stats}</span>
                        <span className="text-sm text-muted-foreground">{t(pillar.statsLabel)}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ENVIRONMENTAL IMPACT INFOGRAPHIC ═══ */}
      <section className="py-24 bg-gradient-to-br from-[hsl(var(--elp-navy-900))] via-[hsl(var(--elp-navy-800))] to-[hsl(var(--elp-navy-900))] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              {t('sustainability.impact.title')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              {t('sustainability.impact.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '125,000', unit: 'ton', label: t('sustainability.impact.co2'), icon: Wind },
              { value: '450,000', unit: 'ton', label: t('sustainability.impact.waste'), icon: Recycle },
              { value: '100', unit: '%', label: t('sustainability.impact.recovery'), icon: Leaf },
              { value: '17-18', unit: '', label: t('sustainability.impact.plants'), icon: Globe },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
              >
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-3 opacity-80" />
                <p className="text-4xl font-bold mb-1">
                  {stat.value}<span className="text-2xl text-white/60">{stat.unit}</span>
                </p>
                <p className="text-white/50 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ UN SDGs ALIGNMENT ═══ */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('sustainability.sdgs.title')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('sustainability.sdgs.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sdgs.map((sdg, i) => (
              <motion.div
                key={sdg.number}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.03 }}
                className="rounded-xl p-6 text-white text-center cursor-pointer transition-shadow hover:shadow-xl"
                style={{ backgroundColor: sdg.color }}
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <sdg.icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-3xl font-bold mb-1">SDG {sdg.number}</p>
                <p className="text-sm opacity-90 font-medium">{t(`sustainability.sdgs.${sdg.key}.title`)}</p>
                <p className="text-xs opacity-75 mt-2">{t(`sustainability.sdgs.${sdg.key}.desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NET ZERO ROADMAP ═══ */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Target className="h-12 w-12 text-primary mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t('sustainability.netZero.title')}
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                {t('sustainability.netZero.desc')}
              </p>
              <ul className="space-y-4">
                {['item1', 'item2', 'item3', 'item4'].map(key => (
                  <li key={key} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t(`sustainability.netZero.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-10 text-white"
            >
              <h3 className="text-2xl font-bold mb-8">{t('sustainability.netZero.roadmapTitle')}</h3>
              <div className="space-y-6">
                {[
                  { year: '2025', progress: 30, key: 'r2025' },
                  { year: '2027', progress: 55, key: 'r2027' },
                  { year: '2030', progress: 75, key: 'r2030' },
                  { year: '2040', progress: 100, key: 'r2040' },
                ].map(item => (
                  <div key={item.year}>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-semibold">{item.year}</span>
                      <span className="opacity-80">{t(`sustainability.netZero.${item.key}`)}</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-2 bg-white rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CERTIFICATIONS (from ESG) ═══ */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <Award className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('esg.certifications.title')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('esg.certifications.description')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'B-Corp', descKey: 'esgCerts.bcorp' },
              { name: 'EU Taxonomy', descKey: 'esgCerts.euTaxonomyDesc' },
              { name: 'ISO 14001', descKey: 'esgCerts.iso14001' },
              { name: 'ISO 45001', descKey: 'esgCerts.iso45001' },
            ].map((cert, i) => (
              <motion.div
                key={cert.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{cert.name}</h3>
                  <p className="text-sm text-muted-foreground">{t(cert.descKey)}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline">
              <a href="/certificates/certificado-classe-1.pdf" target="_blank">
                <Download className="mr-2 h-5 w-5" />
                {t('esg.certificates')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL IMPACT (from ESG) ═══ */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-6 text-center">
                  <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold mb-1">2,500+</p>
                  <p className="text-sm text-muted-foreground">{t('esgSocial.directJobs')}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold mb-1">10,000+</p>
                  <p className="text-sm text-muted-foreground">{t('esgSocial.indirectJobs')}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                  <Award className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold mb-1">500+</p>
                  <p className="text-sm text-muted-foreground">{t('esgSocial.trainings')}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                  <Globe className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold mb-1">50+</p>
                  <p className="text-sm text-muted-foreground">{t('esgSocial.communities')}</p>
                </GlassCard>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Users className="h-12 w-12 text-primary mb-6" />
              <h2 className="text-3xl font-bold mb-6">{t('esg.social.title')}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {t('esg.social.description')}
              </p>
              <ul className="space-y-3">
                {[0, 1, 2, 3].map(i => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{t(`esg.social.items.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <TreePine className="h-16 w-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('sustainability.cta.title')}
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {t('sustainability.cta.desc')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg">
                <Link to="/contact">
                  {t('sustainability.cta.contact')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <Link to="/otr-sources">
                  {t('sustainability.cta.indicateSource')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
