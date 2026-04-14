import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Flame, ArrowLeft, Gauge, Clock, DollarSign, TrendingUp, Package, Settings, ChevronRight, Check, Zap, Thermometer, Play } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useLightbox } from '@/hooks/useLightbox';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { WatermarkImage } from '@/components/ui/watermark-image';
import { PlantQuoteForm } from '@/components/forms/PlantQuoteForm';
import { ProtectedVideoPlayer } from '@/components/media/ProtectedVideoPlayer';
import { ROICalculator } from '@/components/plants/ROICalculator';

// Plant images - using placeholders until real photos are added
const pyrolysisPlantImg = '/placeholder.svg';
const pyrolysisReactorImg = '/placeholder.svg';
const pyrolysisPipesImg = '/placeholder.svg';
const pyrolysisVideo = '/videos/pyrolysis-process.mp4';
const pyrolysisReactorRealImg = '/placeholder.svg';
const pyrolysisPlantRealImg = '/placeholder.svg';
const pyrolysisMotorRealImg = '/placeholder.svg';

export default function PyrolysisPlant() {
  const { t } = useTranslation();

  const plantImages = [
    { src: pyrolysisReactorRealImg, title: t('plants.pyrolysis.gallery.reactor'), desc: t('plants.pyrolysis.gallery.reactorDesc') },
    { src: pyrolysisPlantRealImg, title: t('plants.pyrolysis.gallery.completeLine'), desc: t('plants.pyrolysis.gallery.completeLineDesc') },
    { src: pyrolysisMotorRealImg, title: t('plants.pyrolysis.gallery.motor'), desc: t('plants.pyrolysis.gallery.motorDesc') },
    { src: pyrolysisPipesImg, title: t('plants.pyrolysis.gallery.condensation'), desc: t('plants.pyrolysis.gallery.condensationDesc') },
  ];

  const lightbox = useLightbox(plantImages.length);

  const getApplications = (key: string): string[] => {
    const apps = t(key, { returnObjects: true });
    if (Array.isArray(apps)) return apps as string[];
    if (typeof apps === 'string') return (apps as string).split(', ');
    return [];
  };

  const products = [
    { 
      name: t('plants.pyrolysis.products.pyrolysisOil'), 
      percentage: '45%', 
      price: '$0.55/L', 
      color: 'from-slate-600 to-slate-700', 
      applications: getApplications('plants.pyrolysis.products.pyrolysisOilApps')
    },
    { 
      name: t('plants.pyrolysis.products.carbonBlack'), 
      percentage: '35%', 
      price: '$0.40/kg', 
      color: 'from-gray-600 to-gray-800', 
      applications: getApplications('plants.pyrolysis.products.carbonBlackApps')
    },
    { 
      name: t('plants.pyrolysis.products.synGas'), 
      percentage: '10%', 
      price: t('plants.pyrolysis.products.selfConsumption'), 
      color: 'from-cyan-500 to-blue-600', 
      applications: getApplications('plants.pyrolysis.products.synGasApps')
    },
    { 
      name: t('plants.pyrolysis.products.recoveredSteel'), 
      percentage: '10%', 
      price: '$0.48/kg', 
      color: 'from-slate-500 to-zinc-600', 
      applications: getApplications('plants.pyrolysis.products.recoveredSteelApps')
    },
  ];

  const specs = [
    { label: t('plants.pyrolysis.specs.model'), value: 'DY-50 Contínuo' },
    { label: t('plants.pyrolysis.specs.capacityLine'), value: '50T/dia' },
    { label: t('plants.pyrolysis.specs.feedstock'), value: t('plants.pyrolysis.specs.feedstockValue') },
    { label: t('plants.pyrolysis.specs.processing'), value: '≈2.08 T/hora' },
    { label: t('plants.pyrolysis.specs.reactorSize'), value: 'Ø2.0m × 24m' },
    { label: t('plants.pyrolysis.specs.heatingMethod'), value: t('plants.pyrolysis.specs.heatingMethodValue') },
    { label: t('plants.pyrolysis.specs.powerConsumption'), value: '45kW médio' },
    { label: t('plants.pyrolysis.specs.areaPerLine'), value: '1.200 m²' },
    { label: t('plants.pyrolysis.specs.operators'), value: t('plants.pyrolysis.specs.operatorsValue') },
    { label: t('plants.pyrolysis.specs.lifespan'), value: '10-12 anos' },
    { label: t('plants.pyrolysis.specs.sealing'), value: t('plants.pyrolysis.specs.sealingValue') },
    { label: t('plants.pyrolysis.specs.certifications'), value: 'CE / ISO 12100' },
  ];

  const reactorComponents = [
    { name: t('plants.pyrolysis.components.pyrolysisReactor'), spec: '2000mm x 24000mm x δ16mm', qty: t('plants.pyrolysis.components.perLine', { count: 1 }) },
    { name: t('plants.pyrolysis.components.condensationTank'), spec: '1400mm x δ5mm x H3000mm', qty: t('plants.pyrolysis.components.perLine', { count: 3 }) },
    { name: t('plants.pyrolysis.components.verticalCondenser'), spec: '1000mm x δ5mm x H2050mm', qty: t('plants.pyrolysis.components.perLine', { count: 3 }) },
    { name: t('plants.pyrolysis.components.screwFeeder'), spec: '325mm x L7500mm', qty: t('plants.pyrolysis.components.perLine', { count: 1 }) },
    { name: t('plants.pyrolysis.components.desulfurizationTower'), spec: '2000mm x δ12mm x H10000mm', qty: t('plants.pyrolysis.components.perLine', { count: 1 }) },
    { name: t('plants.pyrolysis.components.odorRemoval'), spec: '5030mm x 1800mm x 2580mm', qty: t('plants.pyrolysis.components.perLine', { count: 1 }) },
  ];

  const economicData = {
    investment: {
      equipment7Lines: 'USD 5.236.000',
      smellDisposal: 'USD 77.000',
      desulfurizationSystem: 'USD 374.000',
      total: 'USD 5.687.000',
    },
    production: {
      dailyCapacity: '350T (7 linhas)',
      oilYield: '45-55%',
      monthlyRevenue: 'USD 1.087.050',
      yearlyRevenue: 'USD 13M',
    }
  };

  const advantages = [
    { icon: Thermometer, title: t('plants.pyrolysis.advantages.zeroEmissions'), desc: t('plants.pyrolysis.advantages.zeroEmissionsDesc') },
    { icon: Zap, title: t('plants.pyrolysis.advantages.selfSufficient'), desc: t('plants.pyrolysis.advantages.selfSufficientDesc') },
    { icon: Clock, title: t('plants.pyrolysis.advantages.operation247'), desc: t('plants.pyrolysis.advantages.operation247Desc') },
    { icon: Settings, title: t('plants.pyrolysis.advantages.plcControl'), desc: t('plants.pyrolysis.advantages.plcControlDesc') },
  ];

  return (
    <>
      <SEO 
        title="Pyrolysis Plant | ELP Green Technology"
        description="Advanced pyrolysis plants converting waste tires into recovered carbon black, pyrolysis oil and steel. Sustainable circular economy solutions."
      />
      <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        <div className="container-wide relative z-10">
          <Link to="/solutions" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('plants.backToSolutions')}
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="text-primary text-sm font-medium">{t('plants.pyrolysis.subtitle')}</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2">
                  <Settings className="h-4 w-4 text-secondary" />
                  <span className="text-secondary text-sm font-medium">{t('plants.poweredByTops', 'Technology by TOPS Recycling')}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {t('plants.pyrolysis.title')}
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
                {t('plants.pyrolysis.description')}
              </p>

              {/* TOPS Credit */}
              <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 mb-8">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-secondary">{t('plants.topsCredit', 'TOPS Recycling Group:')}</strong>{' '}
                  {t('plants.topsCreditDesc', 'All pyrolysis equipment is designed and manufactured by TOPS, our strategic technology partner with 15+ years of experience in 60+ countries.')}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Gauge className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">50T/{t('plants.day')}</span>
                  <span className="text-xs text-muted-foreground">{t('plants.perLine')}</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">36 {t('plants.months')}</span>
                  <span className="text-xs text-muted-foreground">Payback</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">USD 5.7M</span>
                  <span className="text-xs text-muted-foreground">7 {t('plants.lines')}</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <span className="font-bold block text-green-500">95%</span>
                  <span className="text-xs text-muted-foreground">{t('plants.recovery')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" variant="elp-solid">
                  <a href="#quote-form">
                    {t('plants.requestQuote')}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contact">{t('plants.talkToEngineer')}</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="overflow-hidden">
                <WatermarkImage src={pyrolysisPlantRealImg} alt={t('plants.pyrolysis.title')} className="h-80 md:h-96" />
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Advantages */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <div className="grid md:grid-cols-4 gap-6">
            {advantages.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <item.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Video */}
      <section className="py-16">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <Play className="h-4 w-4 text-primary" />
              <span className="text-primary text-sm font-medium">{t('plants.processVideo')}</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">{t('plants.pyrolysis.videoTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('plants.pyrolysis.videoDesc')}
            </p>
          </motion.div>
          
          <div className="max-w-4xl mx-auto">
            <ProtectedVideoPlayer 
              src={pyrolysisVideo} 
              title={t('plants.pyrolysis.videoTitle')}
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-6">
            {plantImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group cursor-pointer relative rounded-xl overflow-hidden aspect-video shadow-lg"
                onClick={() => lightbox.open(index)}
              >
                <WatermarkImage src={image.src} alt={image.title} className="group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="text-white font-semibold">{image.title}</h4>
                    <p className="text-white/70 text-sm">{image.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('plants.pyrolysis.productsTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('plants.pyrolysis.productsSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} mb-4`}>
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-muted rounded px-2 py-1 text-sm font-bold">{product.percentage}</span>
                    <span className="text-green-600 font-semibold text-sm">{product.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {product.applications.map((app) => (
                      <li key={app} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-500" />
                        {app}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specs & Components */}
      <section className="py-16">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold mb-6">{t('plants.technicalSpecs')}</h2>
              <div className="space-y-2">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">{spec.label}</span>
                    <span className="font-semibold text-sm">{spec.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold mb-6">{t('plants.pyrolysis.systemComponents')}</h2>
              <div className="space-y-3">
                {reactorComponents.map((comp) => (
                  <GlassCard key={comp.name} className="p-4">
                    <h4 className="font-semibold text-sm">{comp.name}</h4>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{comp.spec}</span>
                      <span className="font-medium">{comp.qty}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Investment Summary */}
      <section className="py-16 bg-gradient-to-br from-orange-900/10 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">{t('plants.pyrolysis.investment7Lines')}</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">{t('plants.pyrolysis.equipmentCost')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>7x {t('plants.pyrolysis.plantDY50')}</span>
                      <span className="font-bold">{economicData.investment.equipment7Lines}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>{t('plants.pyrolysis.odorRemovalSystem')}</span>
                      <span className="font-bold">{economicData.investment.smellDisposal}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>{t('plants.pyrolysis.smokeDesulfurization')}</span>
                      <span className="font-bold">{economicData.investment.desulfurizationSystem}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-primary/10 rounded-lg px-3 mt-4">
                      <span className="font-bold">{t('plants.totalFOB')}</span>
                      <span className="font-bold text-primary text-lg">{economicData.investment.total}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">{t('plants.pyrolysis.productionEstimates')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>{t('plants.pyrolysis.dailyCapacity')}</span>
                      <span className="font-bold">{economicData.production.dailyCapacity}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>{t('plants.pyrolysis.oilYield')}</span>
                      <span className="font-bold">{economicData.production.oilYield}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span>{t('plants.pyrolysis.monthlyRevenue')}</span>
                      <span className="font-bold text-green-600">{economicData.production.monthlyRevenue}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-green-500/10 rounded-lg px-3 mt-4">
                      <span className="font-bold">{t('plants.pyrolysis.yearlyRevenue')}</span>
                      <span className="font-bold text-green-600 text-lg">{economicData.production.yearlyRevenue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-16">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <ROICalculator plantType="pyrolysis" />
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote-form" className="py-16 bg-muted/30">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('plants.requestYourQuote')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('plants.quoteFormDescription')}
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <PlantQuoteForm plantType="pyrolysis" plantTitle={t('plants.pyrolysis.title')} />
          </div>
        </div>
      </section>

      <ImageLightbox
        images={plantImages}
        selectedIndex={lightbox.selectedIndex}
        onClose={lightbox.close}
        onNext={lightbox.next}
        onPrev={lightbox.prev}
      />

      <Footer />
    </div>
    </>
  );
}
