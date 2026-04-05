import { } from 'react'; // kept for potential future hooks
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { TrendingUp, PieChart, FileText, Globe, ArrowRight, CheckCircle, DollarSign, Target, Users, Sparkles, Shield, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { GlassCard } from '@/components/ui/glass-card';
import { VideoBackground } from '@/components/ui/video-background';
const heroVideo = '/videos/hero-background.mp4';

// Lazy load particle effects only

// Investment highlights with translation keys
const getInvestmentHighlights = (t: (key: string) => string) => [{
  label: t('investors.highlights.totalMarket'),
  value: 'US$ 4.5T',
  description: t('investors.highlights.totalMarketDesc'),
  icon: Globe
}, {
  label: t('investors.highlights.cagr'),
  value: '15%+',
  description: t('investors.highlights.cagrDesc'),
  icon: TrendingUp
}, {
  label: t('investors.highlights.ebitda'),
  value: '40%+',
  description: t('investors.highlights.ebitdaDesc'),
  icon: BarChart3
}, {
  label: t('investors.highlights.payback'),
  value: '36 ' + t('investors.highlights.months'),
  description: t('investors.highlights.paybackDesc'),
  icon: Target
}];
const getRevenueStreams = (t: (key: string) => string) => [{
  name: t('investors.revenue.gateFees'),
  description: t('investors.revenue.gateFeesDesc'),
  icon: DollarSign
}, {
  name: t('investors.revenue.commodities'),
  description: t('investors.revenue.commoditiesDesc'),
  icon: PieChart
}, {
  name: t('investors.revenue.carbonCredits'),
  description: t('investors.revenue.carbonCreditsDesc'),
  icon: Target
}, {
  name: t('investors.revenue.saas'),
  description: t('investors.revenue.saasDesc'),
  icon: Globe
}];
export default function Investors() {
  const {
    t
  } = useTranslation();
  const investmentHighlights = getInvestmentHighlights(t);
  const revenueStreams = getRevenueStreams(t);
  return <div className="min-h-screen bg-background/95 overflow-hidden">
      <SEO title="Investidores | ELP Green Technology" description="Invista na revolução da economia circular. Mercado de US$ 4.5T com CAGR de 15%+. EBITDA de 40%+ e payback em 36 meses. Oportunidades de investimento em reciclagem sustentável." url="https://www.iasofthub.com/investors" />
      <Header />

      {/* Hero Section with Video Background */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 overflow-hidden">
        <VideoBackground src={heroVideo} overlayClassName="bg-gradient-to-br from-[hsl(220,40%,8%,0.9)] via-[hsl(220,35%,12%,0.85)] to-[hsl(220,40%,8%,0.9)]" />
        
        
        <div className="container-wide relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.8
        }} className="max-w-3xl mx-auto text-center">
            <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            delay: 0.2
          }} className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary-foreground">{t('investors.investmentOpportunities')}</span>
            </motion.div>
            
            <h1 className="text-white mb-4 leading-tight text-3xl md:text-4xl lg:text-5xl font-bold">
              {t('investors.title')}
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
              {t('investors.subtitle')}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" variant="elp-white">
                <Link to="/contact">
                  {t('investors.accessDataRoom')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <Link to="/esg">{t('investors.viewEsg')}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Investment Highlights */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container-wide relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('investors.highlightsTitle')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {investmentHighlights.map((item, index) => <motion.div key={item.label} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} whileHover={{
            y: -5,
            scale: 1.02
          }}>
                <GlassCard className="p-6 text-center bg-card/50">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-4xl font-bold text-gradient mb-2">{item.value}</p>
                  <p className="font-semibold mb-1">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </GlassCard>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Investment Thesis */}
      <section className="py-24 bg-muted/50">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }}>
              <TrendingUp className="h-12 w-12 text-primary mb-6" />
              <h2 className="mb-6">{t('investors.thesis.title')}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {t('investors.thesis.description')}
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{t('investors.thesis.cbam')}:</span>
                    <span className="text-muted-foreground"> {t('investors.thesis.cbamDesc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{t('investors.thesis.rcbDemand')}:</span>
                    <span className="text-muted-foreground"> {t('investors.thesis.rcbDemandDesc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{t('investors.thesis.carbonCredits')}:</span>
                    <span className="text-muted-foreground"> {t('investors.thesis.carbonCreditsDesc')}</span>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }}>
              <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-6">{t('investors.revenueStreams')}</h3>
                <div className="space-y-4">
                  {revenueStreams.map(stream => <div key={stream.name} className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <stream.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{stream.name}</h4>
                        <p className="text-sm text-muted-foreground">{stream.description}</p>
                      </div>
                    </div>)}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SPV Structure */}
      <section className="py-24">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8">
                <GlassCard className="p-6 mb-4">
                  <h4 className="font-bold mb-2">ELP Holding</h4>
                  <p className="text-sm text-muted-foreground">Controle estratégico e governança</p>
                </GlassCard>
                <div className="grid grid-cols-3 gap-4">
                  <GlassCard className="p-4 text-center">
                    <p className="font-semibold text-sm">SPV 1</p>
                    <p className="text-xs text-muted-foreground">Frankfurt</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <p className="font-semibold text-sm">SPV 2</p>
                    <p className="text-xs text-muted-foreground">Shenzhen</p>
                  </GlassCard>
                  <GlassCard className="p-4 text-center">
                    <p className="font-semibold text-sm">SPV 3</p>
                    <p className="text-xs text-muted-foreground">São Paulo</p>
                  </GlassCard>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} className="order-1 lg:order-2">
              <PieChart className="h-12 w-12 text-primary mb-6" />
              <h2 className="mb-6">{t('investors.spv.title')}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {t('investors.spv.description')}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t('investors.spv.details')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Reports */}
      <section className="py-24 bg-muted/50">
        <div className="container-wide">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-16">
            <FileText className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="mb-4">{t('investors.reports.title')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('investors.reports.description')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[t('investors.reports.esg'), t('investors.reports.financialAudit'), t('investors.reports.impactReport')].map((report, index) => <motion.div key={report} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} whileHover={{
            y: -5
          }}>
                <GlassCard className="p-6 text-center h-full">
                  <FileText className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{report}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('investors.ctaDesc').split('.')[0]}</p>
                  <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/contact">{t('investors.cta')}</Link>
                  </Button>
                </GlassCard>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="container-wide text-center relative z-10">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }}>
            <Users className="h-16 w-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-white mb-6">{t('investors.accessDataRoom')}</h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {t('investors.ctaDesc')}
            </p>
            <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg">
              <Link to="/contact">
                {t('investors.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>;
}