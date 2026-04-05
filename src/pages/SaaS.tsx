import { } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Database, TrendingUp, Users, Shield, Cpu, Globe, ArrowRight, CheckCircle, 
  Zap, Cloud, Lock, BarChart3, LineChart, PieChart, Workflow, 
  Server, Layers, GitBranch, Activity, Target, Boxes, Recycle,
  FileCheck, Bell, Settings, Eye, Truck, Factory, Leaf
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';

import { VideoBackground } from '@/components/ui/video-background';
const heroVideo = '/videos/hero-background.mp4';

// Lazy load particle effects only


// Platform Modules - now using translation keys
const getPlatformModules = (t: (key: string) => string) => [
  {
    key: 'traceability',
    title: t('saasModules.traceability'),
    description: t('saasModules.traceabilityDesc'),
    icon: Database,
    color: 'from-blue-600 to-cyan-500',
    features: [
      { icon: FileCheck, text: t('saasModules.autoCertification') },
      { icon: Eye, text: t('saasModules.realTimeAudit') },
      { icon: Lock, text: t('saasModules.immutability') },
      { icon: GitBranch, text: t('saasModules.fullHistory') },
    ]
  },
  {
    key: 'analytics',
    title: t('saasModules.analytics'),
    description: t('saasModules.analyticsDesc'),
    icon: TrendingUp,
    color: 'from-primary to-secondary',
    features: [
      { icon: BarChart3, text: t('saasModules.sustainabilityKpis') },
      { icon: LineChart, text: t('saasModules.autoReports') },
      { icon: PieChart, text: t('saasModules.benchmarking') },
      { icon: Bell, text: t('saasModules.smartAlerts') },
    ]
  },
  {
    key: 'marketplace',
    title: t('saasModules.marketplaceModule'),
    description: t('saasModules.marketplaceModuleDesc'),
    icon: Users,
    color: 'from-amber-500 to-orange-500',
    features: [
      { icon: Target, text: t('saasModules.supplyDemand') },
      { icon: Activity, text: t('saasModules.dynamicPricing') },
      { icon: FileCheck, text: t('saasModules.smartContracts') },
      { icon: Truck, text: t('saasModules.integratedLogistics') },
    ]
  },
];

// Tech Architecture - now using translation keys
const getTechArchitecture = (t: (key: string) => string) => [
  { 
    layer: t('techArch.dataCollection'),
    items: [
      { name: t('techArch.iotSensors'), icon: Zap, desc: t('techArch.monitoring247') },
      { name: t('techArch.externalApis'), icon: GitBranch, desc: t('techArch.erpIntegrations') },
      { name: t('techArch.mobileApps'), icon: Cpu, desc: t('techArch.manualInput') },
    ]
  },
  { 
    layer: t('techArch.processing'),
    items: [
      { name: t('techArch.aiMlEngine'), icon: Cpu, desc: t('techArch.predictionsOptimization') },
      { name: t('techArch.blockchain'), icon: Lock, desc: t('techArch.validationRegistry') },
      { name: t('techArch.realtimeAnalytics'), icon: Activity, desc: t('techArch.streamProcessing') },
    ]
  },
  { 
    layer: t('techArch.applications'),
    items: [
      { name: t('techArch.webDashboard'), icon: BarChart3, desc: t('techArch.visualizationManagement') },
      { name: t('techArch.marketplace'), icon: Users, desc: t('techArch.b2bNegotiation') },
      { name: t('techArch.reportsApi'), icon: FileCheck, desc: t('techArch.dataExport') },
    ]
  },
];

// Value Flow Diagram - now using translation keys
const getValueFlow = (t: (key: string) => string) => [
  { step: 1, title: t('valueFlow.collection'), icon: Boxes, desc: t('valueFlow.collectionDesc') },
  { step: 2, title: t('valueFlow.registration'), icon: Database, desc: t('valueFlow.registrationDesc') },
  { step: 3, title: t('valueFlow.processing'), icon: Factory, desc: t('valueFlow.processingDesc') },
  { step: 4, title: t('valueFlow.certification'), icon: FileCheck, desc: t('valueFlow.certificationDesc') },
  { step: 5, title: t('valueFlow.commercialization'), icon: Users, desc: t('valueFlow.commercializationDesc') },
  { step: 6, title: t('valueFlow.impact'), icon: Leaf, desc: t('valueFlow.impactDesc') },
];

// Security Features - now using translation keys
const getSecurityFeatures = (t: (key: string) => string) => [
  { title: t('security.encryption'), desc: t('security.encryptionDesc') },
  { title: t('security.soc2'), desc: t('security.soc2Desc') },
  { title: t('security.gdpr'), desc: t('security.gdprDesc') },
  { title: t('security.sla'), desc: t('security.slaDesc') },
];

export default function SaaS() {
  const { t } = useTranslation();
  const platformModules = getPlatformModules(t);
  const techArchitecture = getTechArchitecture(t);
  const valueFlow = getValueFlow(t);
  const securityFeatures = getSecurityFeatures(t);

  return (
    <>
    <SEO title="SaaS Platform | ELP Green Technology" description="Plataforma SaaS de gestão para economia circular. Rastreamento, analytics e compliance para operações de reciclagem." />
    <div className="min-h-screen bg-background/95 overflow-hidden">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden min-h-[60vh] flex items-center">
        
        <VideoBackground 
          src={heroVideo} 
          overlayClassName="bg-gradient-to-br from-primary/85 via-primary/75 to-secondary/85"
        />
        
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/30"
            >
              <Database className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">{t('saas.digitalPlatform')}</span>
            </motion.div>
            
            <h1 className="text-white mb-6 text-3xl md:text-4xl lg:text-5xl font-bold">
              {t('saas.title')}
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-xl mx-auto">{t('saas.subtitle')}</p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" variant="elp-white">
                <Link to="/contact">
                  {t('saas.requestDemo')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <a href="https://www.iasofthub.com" target="_blank" rel="noopener noreferrer">
                  www.iasofthub.com
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Modules */}
      <section className="py-24 relative">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">{t('saas.platformModules')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('saas.completeSolution')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {platformModules.map((module, index) => (
              <motion.div
                key={module.key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-8 h-full bg-card hover:shadow-xl transition-shadow text-center md:text-left">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-6 shadow-lg mx-auto md:mx-0`}>
                    <module.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{module.title}</h3>
                  <p className="text-muted-foreground mb-6">{module.description}</p>
                  
                  <div className="space-y-3">
                    {module.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <feature.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Flow Diagram */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2 mb-6">
              <Workflow className="w-4 h-4 text-secondary" />
              <span className="text-secondary text-sm font-medium">{t('saas.valueFlow')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('saas.valueFlowTitle')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-secondary to-primary mx-auto rounded-full mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('saas.valueFlowSubtitle')}
            </p>
          </motion.div>

          {/* Flow Diagram */}
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary transform -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative z-10">
              {valueFlow.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-card border-4 border-primary shadow-lg flex items-center justify-center mb-4 relative">
                    <step.icon className="h-8 w-8 text-primary" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h4 className="font-bold text-center mb-1">{step.title}</h4>
                  <p className="text-xs text-muted-foreground text-center">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Architecture */}
      <section className="py-24 relative">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">{t('saas.architecture')}</span>
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('saas.cloudNative')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
          </motion.div>

          {/* Architecture Diagram */}
          <div className="space-y-6">
            {techArchitecture.map((layer, layerIndex) => (
              <motion.div
                key={layer.layer}
                initial={{ opacity: 0, x: layerIndex % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: layerIndex * 0.15 }}
              >
                <GlassCard className="p-6 bg-card">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="lg:w-48 flex-shrink-0">
                      <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-primary">{layer.layer}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 grid sm:grid-cols-3 gap-4">
                      {layer.items.map((item, itemIndex) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: layerIndex * 0.15 + itemIndex * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                            <item.icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Data Flow Arrow */}
          <div className="flex justify-center my-8">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ArrowRight className="h-8 w-8 rotate-90" />
              <span className="text-sm font-medium">{t('saas.dataFlow')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security & CTA */}
      <section className="py-24 bg-muted/30 relative">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('saas.enterpriseSecurity')}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                {t('saas.securityDesc')}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {securityFeatures.map((item) => (
                  <div key={item.title} className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="font-semibold">{item.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-10 bg-gradient-to-br from-primary to-secondary text-white">
                <Globe className="h-12 w-12 mb-6" />
                <h3 className="text-2xl font-bold mb-4">{t('saas.preRegisterCta')}</h3>
                <p className="text-white/80 leading-relaxed mb-6">
                  {t('saas.preRegisterDesc')}
                </p>
                <div className="space-y-2 mb-6 text-sm text-white/70">
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    www.iasofthub.com
                  </p>
                  <p className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    info@iasofthub.com
                  </p>
                </div>
                <Button asChild size="lg" variant="elp-white" className="w-full font-semibold">
                  <Link to="/contact">
                    {t('saas.requestDemo')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
