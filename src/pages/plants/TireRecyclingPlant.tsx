import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Recycle, ArrowLeft, Gauge, Clock, DollarSign, TrendingUp, Package, Settings, ChevronRight, Check } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useLightbox } from '@/hooks/useLightbox';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { WatermarkImage } from '@/components/ui/watermark-image';
import { PlantQuoteForm } from '@/components/forms/PlantQuoteForm';
import { ROICalculator } from '@/components/plants/ROICalculator';

// Import plant images - Mix of existing and new real photos
import tireShredderImg from '@/assets/machines/tire-shredder.jpg';
import crackerMillImg from '@/assets/machines/cracker-mill.jpg';
import otrCuttingImg from '@/assets/plants/otr-cutting-machine.jpg';
import tyreSlittingImg from '@/assets/plants/tyre-slitting-machine.jpg';
import stripCuttingImg from '@/assets/plants/strip-cutting-machine.jpg';
import blockCuttingImg from '@/assets/plants/block-cutting-machine.jpg';
import debeaderImg from '@/assets/plants/debeader-machine.jpg';

// Import real photos from factory visits
import redShredderImg from '@/assets/otr/red-shredder-operation.jpg';
import shreddingLineImg from '@/assets/otr/shredding-line-interior.jpg';
import topsFactoryImg from '@/assets/otr/tops-factory-overview.jpg';

export default function TireRecyclingPlant() {
  const { t } = useTranslation();
  const plantImages = [
    { src: redShredderImg, title: t('plants.tireRecycling.gallery.industrialShredder'), desc: t('plants.tireRecycling.gallery.industrialShredderDesc') },
    { src: shreddingLineImg, title: t('plants.tireRecycling.gallery.shreddingLine'), desc: t('plants.tireRecycling.gallery.shreddingLineDesc') },
    { src: topsFactoryImg, title: t('plants.tireRecycling.gallery.topsFactory'), desc: t('plants.tireRecycling.gallery.topsFactoryDesc') },
    { src: tyreSlittingImg, title: t('plants.tireRecycling.gallery.tyreSlitting'), desc: t('plants.tireRecycling.gallery.tyreSlittingDesc') },
    { src: stripCuttingImg, title: t('plants.tireRecycling.gallery.stripCutter'), desc: t('plants.tireRecycling.gallery.stripCutterDesc') },
    { src: blockCuttingImg, title: t('plants.tireRecycling.gallery.blockCutter'), desc: t('plants.tireRecycling.gallery.blockCutterDesc') },
    { src: debeaderImg, title: t('plants.tireRecycling.gallery.debeader'), desc: t('plants.tireRecycling.gallery.debeaderDesc') },
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
      name: t('plants.tireRecycling.products.rubberGranules'), 
      percentage: '70%', 
      price: '$0.30/kg', 
      color: 'from-emerald-500 to-green-600', 
      applications: getApplications('plants.tireRecycling.products.rubberGranulesApps')
    },
    { 
      name: t('plants.tireRecycling.products.textileFibers'), 
      percentage: '10%', 
      price: '$0.41/kg', 
      color: 'from-blue-500 to-indigo-600', 
      applications: getApplications('plants.tireRecycling.products.textileFibersApps')
    },
    { 
      name: t('plants.tireRecycling.products.steelFragments'), 
      percentage: '20%', 
      price: '$0.48/kg', 
      color: 'from-slate-500 to-gray-600', 
      applications: getApplications('plants.tireRecycling.products.steelFragmentsApps')
    },
  ];

  const specs = [
    { label: t('plants.tireRecycling.specs.capacity'), value: '2-10 ton/hora' },
    { label: t('plants.tireRecycling.specs.dailyProduction'), value: '160-240 ton' },
    { label: t('plants.tireRecycling.specs.operation'), value: '16-24h/dia' },
    { label: t('plants.tireRecycling.specs.requiredArea'), value: '20.000+ m²' },
    { label: t('plants.tireRecycling.specs.automation'), value: t('plants.tireRecycling.specs.automationValue') },
    { label: t('plants.tireRecycling.specs.operators'), value: t('plants.tireRecycling.specs.operatorsValue') },
    { label: t('plants.tireRecycling.specs.lifespan'), value: '20+ anos' },
    { label: t('plants.tireRecycling.specs.certifications'), value: 'CE / ISO 12100' },
  ];

  const equipmentList = [
    { name: t('plants.tireRecycling.equipment.tyreSlitting'), power: '22.5kW', capacity: t('plants.tireRecycling.equipment.tyreSlittingCap'), weight: '4000 kg' },
    { name: t('plants.tireRecycling.equipment.stripCutting'), power: '29.5kW', capacity: '3-5 ton/hora', weight: '2500 kg' },
    { name: t('plants.tireRecycling.equipment.blockCutting'), power: '98kW', capacity: '3-5 ton/hora', weight: '5500 kg' },
    { name: t('plants.tireRecycling.equipment.beadWire'), power: '40kW', capacity: t('plants.tireRecycling.equipment.beadWireCap'), weight: '2000 kg' },
    { name: t('plants.tireRecycling.equipment.dualShredder'), power: '22-500kW', capacity: '2-10 ton/hora', weight: '5-25 ton' },
    { name: t('plants.tireRecycling.equipment.crackerMill'), power: '55-110kW', capacity: '0.5-2 ton/hora', weight: '8 ton' },
  ];

  return (
    <>
      <SEO 
        title="Tire Recycling Plant | ELP Green Technology"
        description="Complete tire recycling plants with smart robotic lines. Process up to 40,000 tons/year of end-of-life tires into rubber granules, steel wire and textile fiber."
      />
      <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-background to-background" />
        
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
                <div className="inline-flex items-center gap-2 bg-green-500/10 rounded-full px-4 py-2">
                  <Recycle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 text-sm font-medium">{t('plants.tireRecycling.subtitle')}</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2">
                  <Package className="h-4 w-4 text-secondary" />
                  <span className="text-secondary text-sm font-medium">{t('plants.poweredByTops', 'Technology by TOPS Recycling')}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {t('plants.tireRecycling.title')}
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
                {t('plants.tireRecycling.description')}
              </p>

              {/* TOPS Credit */}
              <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 mb-8">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-secondary">{t('plants.topsCredit', 'TOPS Recycling Group:')}</strong>{' '}
                  {t('plants.topsCreditDesc', 'All tire recycling equipment is designed and manufactured by TOPS, our strategic technology partner with 15+ years of experience in 60+ countries.')}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Gauge className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">2-10 ton/h</span>
                  <span className="text-xs text-muted-foreground">{t('plants.capacity')}</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">55 {t('plants.months')}</span>
                  <span className="text-xs text-muted-foreground">Payback</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                  <span className="font-bold block">USD 5.8M+</span>
                  <span className="text-xs text-muted-foreground">{t('plants.investment')}</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <span className="font-bold block text-green-500">85%</span>
                  <span className="text-xs text-muted-foreground">{t('plants.profitability')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
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
              className="relative"
            >
              <GlassCard className="overflow-hidden">
                <WatermarkImage 
                  src={otrCuttingImg} 
                  alt={t('plants.tireRecycling.title')} 
                  className="h-80 md:h-96"
                />
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Equipment Gallery */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('plants.tireRecycling.equipmentTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('plants.tireRecycling.equipmentSubtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plantImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group cursor-pointer relative rounded-xl overflow-hidden aspect-[4/3] shadow-lg"
                onClick={() => lightbox.open(index)}
              >
                <WatermarkImage src={image.src} alt={image.title} className="group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="text-white font-semibold text-sm">{image.title}</h4>
                    <p className="text-white/70 text-xs">{image.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Generated */}
      <section className="py-16">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-primary text-sm font-medium">{t('plants.marketableProducts')}</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">{t('plants.productsGenerated')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('plants.tireRecycling.productsSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
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
                  
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-muted rounded-lg px-3 py-1">
                      <span className="font-bold text-primary">{product.percentage}</span>
                      <span className="text-xs text-muted-foreground ml-1">{t('plants.ofTire')}</span>
                    </div>
                    <div className="bg-green-500/10 rounded-lg px-3 py-1">
                      <span className="font-bold text-green-600">{product.price}</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold mb-2">{t('plants.applications')}:</h4>
                  <ul className="space-y-1">
                    {product.applications.map((app) => (
                      <li key={app} className="flex items-center gap-2 text-sm text-muted-foreground">
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

      {/* Technical Specs */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-primary text-sm font-medium">{t('plants.technicalData')}</span>
              </div>
              <h2 className="text-3xl font-bold mb-6">{t('plants.plantSpecs')}</h2>
              
              <div className="space-y-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="font-bold">{spec.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold mb-6">{t('plants.equipmentList')}</h3>
              <div className="space-y-3">
                {equipmentList.map((equip) => (
                  <GlassCard key={equip.name} className="p-4">
                    <h4 className="font-semibold mb-2">{equip.name}</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('plants.power')}:</span>
                        <span className="block font-medium">{equip.power}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('plants.capacity')}:</span>
                        <span className="block font-medium">{equip.capacity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('plants.weight')}:</span>
                        <span className="block font-medium">{equip.weight}</span>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-16">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <ROICalculator plantType="tire-recycling" />
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote-form" className="py-16">
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
            <PlantQuoteForm plantType="tire-recycling" plantTitle={t('plants.tireRecycling.title')} />
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
