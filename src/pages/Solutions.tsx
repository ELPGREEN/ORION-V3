import { useState } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Cpu, Recycle, Flame, ArrowRight, X, ChevronLeft, ChevronRight, Images, Sparkles, Zap, TrendingUp, DollarSign, Clock, Settings, Package, Gauge, Truck, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { WatermarkImage } from '@/components/ui/watermark-image';

import { PlantComparison } from '@/components/plants/PlantComparison';

// Import gallery images
import partnershipTeamImg from '@/assets/gallery/partnership-team.jpg';
import productionBagsImg from '@/assets/gallery/production-bags.jpg';
import pyrolysisPipesImg from '@/assets/gallery/pyrolysis-pipes.jpg';
import factoryFloorImg from '@/assets/gallery/factory-floor.jpg';
import factoryInspectionImg from '@/assets/gallery/factory-inspection.jpg';
import rubberPowderBagsImg from '@/assets/gallery/rubber-powder-bags.jpg';
import topsRecyclingTeamImg from '@/assets/gallery/tops-recycling-team.jpg';
import partnershipHandshakeImg from '@/assets/gallery/partnership-handshake.jpg';

// Import machine images
import pyrolysisPlantImg from '@/assets/machines/pyrolysis-plant.jpg';
import tireShredderImg from '@/assets/machines/tire-shredder.jpg';
import crackerMillImg from '@/assets/machines/cracker-mill.jpg';

// Lazy load particle effects only


// Gallery images with i18n
const getGalleryImages = (t: (key: string) => string) => [
  { src: topsRecyclingTeamImg, title: t('solutionsPage.galleryImages.topsTeam.title'), description: t('solutionsPage.galleryImages.topsTeam.description') },
  { src: partnershipHandshakeImg, title: t('solutionsPage.galleryImages.partnershipHandshake.title'), description: t('solutionsPage.galleryImages.partnershipHandshake.description') },
  { src: partnershipTeamImg, title: t('solutionsPage.galleryImages.partnershipTeam.title'), description: t('solutionsPage.galleryImages.partnershipTeam.description') },
  { src: pyrolysisPipesImg, title: t('solutionsPage.galleryImages.pyrolysisPipes.title'), description: t('solutionsPage.galleryImages.pyrolysisPipes.description') },
  { src: factoryFloorImg, title: t('solutionsPage.galleryImages.factoryFloor.title'), description: t('solutionsPage.galleryImages.factoryFloor.description') },
  { src: factoryInspectionImg, title: t('solutionsPage.galleryImages.factoryInspection.title'), description: t('solutionsPage.galleryImages.factoryInspection.description') },
  { src: rubberPowderBagsImg, title: t('solutionsPage.galleryImages.rubberPowderBags.title'), description: t('solutionsPage.galleryImages.rubberPowderBags.description') },
  { src: productionBagsImg, title: t('solutionsPage.galleryImages.productionBags.title'), description: t('solutionsPage.galleryImages.productionBags.description') },
];

// OTR Products with i18n
const getOtrProducts = (t: (key: string) => string) => [
  { name: t('solutionsPage.otrProducts.rubberBlocks.name'), description: t('solutionsPage.otrProducts.rubberBlocks.description'), gradient: 'from-gray-600 to-gray-800' },
  { name: t('solutionsPage.otrProducts.steel.name'), description: t('solutionsPage.otrProducts.steel.description'), gradient: 'from-slate-500 to-slate-700' },
  { name: t('solutionsPage.otrProducts.fibers.name'), description: t('solutionsPage.otrProducts.fibers.description'), gradient: 'from-amber-500 to-orange-600' },
  { name: t('solutionsPage.otrProducts.powder.name'), description: t('solutionsPage.otrProducts.powder.description'), gradient: 'from-cyan-400 to-blue-500' },
];

// OTR Process Steps with i18n
const getOtrProcessSteps = (t: (key: string) => string) => [
  { step: 1, title: t('solutionsPage.process.steps.1.title'), description: t('solutionsPage.process.steps.1.description') },
  { step: 2, title: t('solutionsPage.process.steps.2.title'), description: t('solutionsPage.process.steps.2.description') },
  { step: 3, title: t('solutionsPage.process.steps.3.title'), description: t('solutionsPage.process.steps.3.description') },
  { step: 4, title: t('solutionsPage.process.steps.4.title'), description: t('solutionsPage.process.steps.4.description') },
  { step: 5, title: t('solutionsPage.process.steps.5.title'), description: t('solutionsPage.process.steps.5.description') },
  { step: 6, title: t('solutionsPage.process.steps.6.title'), description: t('solutionsPage.process.steps.6.description') },
];

// Industrial Plants Data - OTR First (Main Focus)
const industrialPlants = [
  {
    id: 'otr',
    title: 'Smart OTR – Reciclagem de Pneus Gigantes',
    subtitle: 'Linha Robótica Automática',
    description: 'Sistema especializado com robô automático para reciclagem de pneus gigantes de mineração, portos e construção. Processa pneus de até 4,5 toneladas. NÃO VENDEMOS – buscamos fontes OTR para parcerias.',
    capacity: '10-20 ton/hora',
    investment: 'Parceria/Joint Venture',
    payback: '34 meses',
    roi: '35%',
    isHighlight: true,
    products: [
      { name: 'Blocos de Borracha', percentage: '65%', price: '$0.35/kg', applications: 'TDF, pirólise, granulação' },
      { name: 'Aço de Alta Qualidade', percentage: '25%', price: '$0.55/kg', applications: 'Siderúrgicas, fundições' },
      { name: 'Fibras Têxteis', percentage: '10%', price: '$0.20/kg', applications: 'Isolamento, geotêxteis' },
    ],
    specs: [
      { label: 'Diâmetro Máximo', value: '4500mm' },
      { label: 'Peso Máximo', value: '4,5 toneladas' },
      { label: 'Automação', value: 'Smart Robot + PLC' },
      { label: 'Certificação', value: 'CE / ISO 12100' },
    ],
    icon: Truck,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'pyrolysis',
    title: 'Planta de Pirólise Contínua',
    subtitle: 'Conversão Termoquímica Avançada',
    description: 'Tecnologia de pirólise em circuito fechado para conversão de pneus e plásticos em óleo combustível, negro de fumo recuperado e gás de síntese.',
    capacity: '10-50 ton/dia',
    investment: 'A partir de USD 7.8M',
    payback: '36 meses',
    roi: '95%',
    products: [
      { name: 'Óleo de Pirólise', percentage: '45%', price: '$0.55/L', applications: 'Combustível industrial, refinarias, navios' },
      { name: 'Negro de Fumo (rCB)', percentage: '35%', price: '$0.40/kg', applications: 'Indústria de borracha, tintas, plásticos' },
      { name: 'Gás de Síntese', percentage: '10%', price: 'Autoconsumo', applications: 'Alimentação do próprio processo' },
      { name: 'Aço Recuperado', percentage: '10%', price: '$0.48/kg', applications: 'Siderúrgicas' },
    ],
    specs: [
      { label: 'Emissões', value: 'Zero (circuito fechado)' },
      { label: 'Recuperação Energética', value: '95%+' },
      { label: 'Vida Útil', value: '20+ anos' },
      { label: 'Certificação', value: 'CE / ISO' },
    ],
    icon: Flame,
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'tire-recycling',
    title: 'Planta de Reciclagem de Pneus',
    subtitle: 'Sistema Completo de Processamento',
    description: 'Sistema totalmente automático para reciclagem de pneus usados, produzindo grânulos e pó de borracha de alta qualidade, aço e fibras têxteis.',
    capacity: '2-10 ton/hora',
    investment: 'A partir de USD 5.8M',
    payback: '55 meses',
    roi: '85%',
    products: [
      { name: 'Grânulos de Borracha', percentage: '70%', price: '$0.30/kg', applications: 'Asfalto ecológico, gramados sintéticos, pisos industriais' },
      { name: 'Fibras Têxteis (Nylon)', percentage: '10%', price: '$0.41/kg', applications: 'Isolamento, capacetes, materiais compostos' },
      { name: 'Fragmentos de Aço', percentage: '20%', price: '$0.48/kg', applications: 'Siderúrgicas, fundições, fabricação de aço' },
    ],
    specs: [
      { label: 'Produção Diária', value: '160-240 ton' },
      { label: 'Operação', value: '16-24h/dia' },
      { label: 'Área Necessária', value: '20.000+ m²' },
      { label: 'Automação', value: '100% automatizada' },
    ],
    icon: Recycle,
    color: 'from-green-500 to-emerald-600',
  },
];

// Equipment specifications from technical documents
const equipmentSpecs = [
  {
    img: tireShredderImg,
    title: 'Triturador de Duplo Eixo',
    desc: 'Sistema de trituração primária com lâminas intercambiáveis',
    capacity: '2-10 ton/hora',
    power: '22kW - 500kW (duplo motor)',
    features: ['Controle PLC', 'Proteção contra sobrecarga', 'Lâminas personalizáveis', 'Manutenção facilitada'],
    applications: ['Pneus de carro e caminhão', 'Pneus OTR (fora de estrada)', 'Plásticos industriais', 'Resíduos eletrônicos'],
  },
  {
    img: crackerMillImg,
    title: 'Cracker Mill (Moinho Refinador)',
    desc: 'Produção de pó de borracha superfino',
    capacity: '500-2000 kg/hora',
    power: '55-110kW',
    features: ['Granulometria 0.6-3mm', 'Baixa geração de calor', 'Alta durabilidade', 'Operação contínua'],
    applications: ['Pó para asfalto modificado', 'Grânulos coloridos', 'Borracha regenerada', 'Pisos esportivos'],
  },
  {
    img: pyrolysisPlantImg,
    title: 'Reator de Pirólise',
    desc: 'Conversão termoquímica em ambiente controlado',
    capacity: '10-50 ton/dia',
    power: 'Autossuficiente (gás de síntese)',
    features: ['Circuito fechado', 'Zero emissões', 'Recuperação de calor', 'Operação contínua 24/7'],
    applications: ['Pneus', 'Plásticos mistos', 'Resíduos químicos', 'Biomassa'],
  },
];

// Economic viability scenarios
const economicScenarios = [
  {
    scenario: 'Pessimista',
    production: '50%',
    monthlyRevenue: 'USD 808.704',
    yearlyRevenue: 'USD 9.7M',
    profit: '89%',
    color: 'text-yellow-500',
  },
  {
    scenario: 'Provável',
    production: '70%',
    monthlyRevenue: 'USD 1.087.050',
    yearlyRevenue: 'USD 13M',
    profit: '85%',
    color: 'text-green-500',
  },
  {
    scenario: 'Otimista',
    production: '100%',
    monthlyRevenue: 'USD 1.617.408',
    yearlyRevenue: 'USD 19.4M',
    profit: '92%',
    color: 'text-emerald-500',
  },
];

export default function Solutions() {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Get translated data
  const galleryImages = getGalleryImages(t);
  const otrProducts = getOtrProducts(t);
  const otrProcessSteps = getOtrProcessSteps(t);

  const openLightbox = (index: number) => setSelectedImage(index);
  const closeLightbox = () => setSelectedImage(null);
  const nextImage = () => setSelectedImage((prev) => (prev !== null ? (prev + 1) % galleryImages.length : 0));
  const prevImage = () => setSelectedImage((prev) => (prev !== null ? (prev - 1 + galleryImages.length) % galleryImages.length : 0));

  return (
    <>
    <SEO title="Soluções | ELP Green Technology" description="Plantas de pirólise, reciclagem de pneus e soluções OTR. Tecnologia avançada para transformar resíduos em recursos valiosos." />
    <div className="min-h-screen bg-background/95 overflow-hidden">
      <Header />

      {/* Hero Section - OTR Focus */}
      <section className="pt-24 pb-16 relative overflow-hidden min-h-[60vh] flex items-center bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]">
        
        
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-primary/40"
            >
              <Truck className="w-4 h-4 text-primary-foreground" />
              <span className="text-white text-sm font-medium">{t('solutionsPage.heroTag')}</span>
            </motion.div>
            
            <h1 className="text-white mb-4 text-3xl md:text-4xl lg:text-5xl font-bold">
              {t('solutionsPage.heroTitle')}
            </h1>
            <p className="text-lg text-white/70 mb-6 leading-relaxed max-w-xl mx-auto">
              {t('solutionsPage.heroDescription')}
              <strong className="text-white"> {t('solutionsPage.noSellEquipment')}</strong>
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
              {[t('solutionsPage.tags.smartLine'), t('solutionsPage.tags.tireWeight'), t('solutionsPage.tags.zeroEmissions'), t('solutionsPage.tags.globalPartnership')].map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20 text-white/80 text-xs">
                  <Sparkles className="w-3 h-3 text-white" />
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" variant="elp-white">
                <Link to="/otr-sources">
                  {t('solutionsPage.indicateSource')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <Link to="/plants/otr">
                  {t('solutionsPage.knowSmartLine')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Partnership Disclaimer - Updated to credit TOPS */}
      <section className="py-8 bg-accent/10 border-y border-accent/20">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary/20">
                <Factory className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-muted-foreground">
                <strong className="text-secondary">TOPS Recycling Group:</strong>{' '}
                {t('solutionsPage.disclaimer.topsCredit', 'All equipment and technology featured on this page is designed and manufactured by our strategic partner TOPS, with 15+ years of experience.')}{' '}
                <strong className="text-foreground">{t('solutionsPage.disclaimer.important')}</strong> {t('solutionsPage.disclaimer.description')}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10">
              <Link to="/global-expansion">{t('solutionsPage.disclaimer.viewExpansion')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Advanced Pyrolysis with Real Images */}
      <section className="py-24">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span 
              className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2 mb-6"
            >
              <Flame className="w-4 h-4 text-secondary" />
              <span className="text-secondary text-sm font-medium">{t('solutions.proprietaryTech')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('solutions.pyrolysis.title')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-muted-foreground text-lg leading-relaxed mb-6 text-center lg:text-left">
                {t('solutions.pyrolysis.description')}
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8 text-justify lg:text-left">
                {t('index.pyrolysisDesc')}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: t('common.zeroEmissions'), icon: Leaf },
                  { label: t('common.closedLoop'), icon: Recycle },
                  { label: t('common.recovery'), icon: TrendingUp },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-xl bg-muted/50">
                    <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Button asChild variant="default" className="shadow-lg font-semibold">
                  <Link to="/media">
                    {t('solutions.viewEquipment')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="font-semibold">
                  <a href="https://www.iasofthub.com" target="_blank" rel="noopener noreferrer">
                    www.iasofthub.com
                  </a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className="overflow-hidden bg-card/50">
                <img 
                  src={pyrolysisPlantImg} 
                  alt="Planta de Pirólise Industrial"
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-4">{t('solutionsPage.pyrolysis.generatedProducts')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {otrProducts.map((product) => (
                      <div 
                        key={product.name} 
                        className={`p-3 rounded-lg bg-gradient-to-r ${product.gradient} text-white`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{product.name.split(' ')[0]}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Equipment with Detailed Specs */}
          <div className="grid md:grid-cols-3 gap-6">
            {equipmentSpecs.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden h-full bg-card/80">
                  <WatermarkImage src={item.img} alt={item.title} className="h-48" />
                  <div className="p-5">
                    <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{item.desc}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Gauge className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{t('solutionsPage.equipment.capacity')}</span>
                        <span className="font-semibold">{item.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{t('solutionsPage.equipment.power')}</span>
                        <span className="font-semibold text-xs">{item.power}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {item.features.slice(0, 3).map((feature) => (
                        <span key={feature} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OTR Process Steps */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-secondary/5">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('solutionsPage.process.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('solutionsPage.process.subtitle')}
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {otrProcessSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <GlassCard className="p-4 text-center h-full bg-card/80">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-accent font-bold">{step.step}</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-2">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </GlassCard>
                {index < otrProcessSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <ArrowRight className="h-4 w-4 text-accent/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industrial Plants Section - OTR Highlighted */}
      <section className="py-24 bg-muted/50">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span 
              className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-2 mb-6"
            >
              <Truck className="w-4 h-4 text-accent" />
              <span className="text-accent text-sm font-medium">{t('solutionsPage.plants.badge')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('solutionsPage.plants.title')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('solutionsPage.plants.subtitle')}
            </p>
          </motion.div>

          <div className="space-y-12">
            {industrialPlants.map((plant, index) => (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-8 bg-card/90">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Header */}
                    <div className="lg:col-span-1 text-center lg:text-left">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${plant.color} mb-4 mx-auto lg:mx-0`}>
                        <plant.icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{plant.title}</h3>
                      <p className="text-primary font-medium mb-3">{plant.subtitle}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                        {plant.description}
                      </p>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Gauge className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">{t('solutions.capacity')}</span>
                          </div>
                          <span className="font-bold text-sm">{plant.capacity}</span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">{t('solutions.payback')}</span>
                          </div>
                          <span className="font-bold text-sm">{plant.payback}</span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">{t('solutions.investment')}</span>
                          </div>
                          <span className="font-bold text-xs">{plant.investment}</span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">{t('solutions.profitability')}</span>
                          </div>
                          <span className="font-bold text-sm text-primary">{plant.roi}</span>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="lg:col-span-1">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {t('solutions.productsGenerated')}
                      </h4>
                      <div className="space-y-3">
                        {plant.products.map((product) => (
                          <div key={product.name} className="bg-muted/30 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm">{product.name}</span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {product.percentage}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{product.applications}</p>
                            <span className="text-xs font-semibold text-primary">{product.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="lg:col-span-1">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        {t('solutions.technicalSpecs')}
                      </h4>
                      <div className="space-y-3">
                        {plant.specs.map((spec) => (
                          <div key={spec.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                            <span className="text-sm text-muted-foreground">{spec.label}</span>
                            <span className="font-semibold text-sm">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 mt-6">
                        <Button asChild className="flex-1" variant="default">
                          <Link to={`/plants/${plant.id}`}>
                            {t('solutions.viewDetails')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild className="flex-1" variant="outline">
                          <Link to="/quote">
                            {t('solutions.getQuote')}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Economic Viability Section */}
      <section className="py-24">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span 
              className="inline-flex items-center gap-2 bg-emerald-500/10 rounded-full px-4 py-2 mb-6"
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 text-sm font-medium">{t('solutions.economicTitle')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('solutions.economicSubtitle')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-green-500 mx-auto rounded-full mb-6" />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('solutions.economicDesc')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {economicScenarios.map((scenario, index) => (
              <motion.div
                key={scenario.scenario}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full bg-card/80">
                  <h4 className={`font-bold text-lg mb-2 ${scenario.color}`}>
                    {scenario.scenario === 'Pessimista' ? t('solutions.scenarioPessimist') : 
                     scenario.scenario === 'Provável' ? t('solutions.scenarioLikely') : 
                     t('solutions.scenarioOptimist')}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('solutions.productionAt', { percent: scenario.production })}
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-muted-foreground">{t('solutions.monthlyRevenue')}</span>
                      <p className="text-xl font-bold">{scenario.monthlyRevenue}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('solutions.yearlyRevenue')}</span>
                      <p className="text-2xl font-bold text-primary">{scenario.yearlyRevenue}</p>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground">{t('solutions.profitMargin')}</span>
                      <p className={`text-3xl font-bold ${scenario.color}`}>{scenario.profit}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Investment Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-8 bg-gradient-to-br from-card to-muted/50">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-xl mb-4">{t('solutions.investmentSummary')}</h4>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    {t('solutions.investmentDesc')}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">{t('solutions.recyclingMachines')}</span>
                      <span className="font-semibold">USD 6.8M (14%)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">{t('solutions.infrastructure')}</span>
                      <span className="font-semibold">USD 34M (68%)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">{t('solutions.solarEnergy')}</span>
                      <span className="font-semibold">USD 7.8M (15%)</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">{t('solutions.landOperating')}</span>
                      <span className="font-semibold">USD 1.9M (3%)</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-3 mt-4">
                      <span className="font-bold">{t('solutions.totalInvestment')}</span>
                      <span className="font-bold text-primary text-lg">USD 50.4M</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <div className="bg-muted/50 rounded-2xl p-6 text-center">
                    <h5 className="font-semibold mb-4">{t('solutions.viabilityIndicators')}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card rounded-xl p-4">
                        <span className="text-3xl font-bold text-primary">55</span>
                        <p className="text-xs text-muted-foreground">{t('solutions.paybackMonths')}</p>
                      </div>
                      <div className="bg-card rounded-xl p-4">
                        <span className="text-3xl font-bold text-green-500">85%</span>
                        <p className="text-xs text-muted-foreground">{t('solutions.profitability')}</p>
                      </div>
                      <div className="bg-card rounded-xl p-4">
                        <span className="text-3xl font-bold text-blue-500">1.8%</span>
                        <p className="text-xs text-muted-foreground">{t('solutions.monthlyYield')}</p>
                      </div>
                      <div className="bg-card rounded-xl p-4">
                        <span className="text-3xl font-bold text-amber-500">20+</span>
                        <p className="text-xs text-muted-foreground">{t('solutions.yearsLifespan')}</p>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full mt-6 bg-primary hover:bg-primary/90">
                      <Link to="/investors">
                        {t('solutions.viewInvestments')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Circular Economy */}
      <section className="py-24 brushed-metal text-white relative overflow-hidden">
        <div className="container-wide">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Recycle className="h-16 w-16 mx-auto mb-6 opacity-80" />
              <h2 className="text-white mb-6">{t('solutions.circular.title')}</h2>
              <p className="text-xl text-white/80 mb-8">
                {t('solutions.circular.description')}
              </p>
              <p className="text-white/70 leading-relaxed mb-8">
                {t('solutions.circular.description')}
              </p>
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg">
                <Link to="/esg">
                  {t('esg.viewCertificates')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Industrial Gallery */}
      <section className="py-24 bg-muted/50">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Images className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">{t('solutions.gallery.title')}</span>
            </div>
            <h2 className="mb-4">{t('solutions.gallery.title')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('solutions.gallery.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group cursor-pointer relative rounded-xl overflow-hidden aspect-[4/3] shadow-lg"
                onClick={() => openLightbox(index)}
              >
                <WatermarkImage
                  src={image.src}
                  alt={image.title}
                  className="group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="text-white font-semibold text-sm">{image.title}</h4>
                    <p className="text-white/70 text-xs">{image.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
              onClick={closeLightbox}
            >
              <X className="h-8 w-8" />
            </button>
            
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-5xl max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-full max-h-[80vh] rounded-lg overflow-hidden">
                <WatermarkImage
                  src={galleryImages[selectedImage].src}
                  alt={galleryImages[selectedImage].title}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                <h3 className="text-white text-xl font-bold">{galleryImages[selectedImage].title}</h3>
                <p className="text-white/80">{galleryImages[selectedImage].description}</p>
                <p className="text-white/50 text-sm mt-2">{selectedImage + 1} / {galleryImages.length}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plant Comparison Section */}
      <PlantComparison />

      <Footer />
    </div>
    </>
  );
}
