import React, { useState, Suspense } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { motion } from 'framer-motion';
import { ShoppingCart, Factory, Droplets, Package, CheckCircle, Globe, TrendingUp, Shield, ArrowRight, Building2, Mail, Phone, User, MapPin, MessageSquare, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateLOIPDF } from '@/lib/pdf/generators/generateLOI';

const countries = [
  'Brasil', 'Alemanha', 'Itália', 'China', 'Estados Unidos', 'México', 
  'Argentina', 'Chile', 'Colômbia', 'Peru', 'Portugal', 'Espanha', 
  'França', 'Reino Unido', 'Índia', 'Japão', 'Coreia do Sul', 'Outro'
];

export default function Marketplace() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    companyType: '',
    estimatedVolume: '',
    message: ''
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Products with translations
  const products = [
    {
      id: 'rcb',
      nameKey: 'marketplace.products.rcb.title',
      descKey: 'marketplace.products.rcb.description',
      icon: Package,
      specs: [
        { key: 'purity', value: '95%+' },
        { key: 'ashContent', value: '<8%' },
        { key: 'specificSurface', value: '60-80 m²/g' },
        { key: 'applications', value: t('marketplace.products.rcb.applications') }
      ],
      color: 'from-gray-700 to-gray-900'
    },
    {
      id: 'pyrolytic-oil',
      nameKey: 'marketplace.products.pyrolyticOil.title',
      descKey: 'marketplace.products.pyrolyticOil.description',
      icon: Droplets,
      specs: [
        { key: 'calorificValue', value: '42-44 MJ/kg' },
        { key: 'sulfurContent', value: '<0.5%' },
        { key: 'density', value: '0.85-0.95 g/cm³' },
        { key: 'applications', value: t('marketplace.products.pyrolyticOil.applications') }
      ],
      color: 'from-amber-600 to-amber-800'
    },
    {
      id: 'steel-wire',
      nameKey: 'marketplace.products.greenSteel.title',
      descKey: 'marketplace.products.greenSteel.description',
      icon: Factory,
      specs: [
        { key: 'purity', value: '98%+' },
        { key: 'carbon', value: '0.6-0.8%' },
        { key: 'format', value: t('marketplace.products.greenSteel.format') },
        { key: 'applications', value: t('marketplace.products.greenSteel.applications') }
      ],
      color: 'from-slate-600 to-slate-800'
    },
    {
      id: 'rubber-blocks',
      nameKey: 'marketplace.products.rubberBlocks.title',
      descKey: 'marketplace.products.rubberBlocks.description',
      icon: Package,
      specs: [
        { key: 'density', value: '1.1-1.3 g/cm³' },
        { key: 'size', value: t('marketplace.products.rubberBlocks.size') },
        { key: 'applications', value: t('marketplace.products.rubberBlocks.applications') }
      ],
      color: 'from-stone-600 to-stone-800'
    },
    {
      id: 'rubber-granules',
      nameKey: 'marketplace.products.rubberGranules.title',
      descKey: 'marketplace.products.rubberGranules.description',
      icon: Package,
      specs: [
        { key: 'granulometry', value: '0.5-4mm' },
        { key: 'purity', value: '99%+' },
        { key: 'applications', value: t('marketplace.products.rubberGranules.applications') }
      ],
      color: 'from-emerald-700 to-emerald-900'
    },
    {
      id: 'reclaimed-rubber',
      nameKey: 'marketplace.products.reclaimedRubber.title',
      descKey: 'marketplace.products.reclaimedRubber.description',
      icon: Package,
      specs: [
        { key: 'viscosity', value: '40-60 Mooney' },
        { key: 'ashContent', value: '50-60%' },
        { key: 'applications', value: t('marketplace.products.reclaimedRubber.applications') }
      ],
      color: 'from-zinc-600 to-zinc-800'
    }
  ];

  // Benefits with translations
  const benefits = [
    { 
      icon: Globe, 
      titleKey: 'marketplace.benefits.globalReach.title',
      descKey: 'marketplace.benefits.globalReach.description'
    },
    { 
      icon: Shield, 
      titleKey: 'marketplace.benefits.traceability.title',
      descKey: 'marketplace.benefits.traceability.description'
    },
    { 
      icon: TrendingUp, 
      titleKey: 'marketplace.benefits.competitivePrices.title',
      descKey: 'marketplace.benefits.competitivePrices.description'
    },
    { 
      icon: CheckCircle, 
      titleKey: 'marketplace.benefits.certifications.title',
      descKey: 'marketplace.benefits.certifications.description'
    }
  ];

  // Spec label translations
  const specLabels: Record<string, string> = {
    purity: t('marketplace.specs.purity', 'Pureza'),
    ashContent: t('marketplace.specs.ashContent', 'Teor de cinzas'),
    specificSurface: t('marketplace.specs.specificSurface', 'Superfície específica'),
    applications: t('marketplace.specs.applications', 'Aplicações'),
    calorificValue: t('marketplace.specs.calorificValue', 'Poder calorífico'),
    sulfurContent: t('marketplace.specs.sulfurContent', 'Teor de enxofre'),
    density: t('marketplace.specs.density', 'Densidade'),
    carbon: t('marketplace.specs.carbon', 'Carbono'),
    format: t('marketplace.specs.format', 'Formato'),
    size: t('marketplace.specs.size', 'Tamanho'),
    granulometry: t('marketplace.specs.granulometry', 'Granulometria'),
    viscosity: t('marketplace.specs.viscosity', 'Viscosidade')
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(p => p !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      toast({
        title: t('marketplace.form.selectProduct', 'Selecione ao menos um produto'),
        description: t('marketplace.form.selectProductDesc', 'Por favor, selecione os produtos de seu interesse.'),
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check for duplicate email
      const { data: existingRegistration, error: checkError } = await supabase
        .from('marketplace_registrations')
        .select('id, email')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (checkError) {
        console.error('Check error:', checkError);
      }

      if (existingRegistration) {
        toast({
          title: t('marketplace.form.duplicateEmail'),
          description: t('marketplace.form.duplicateEmailDesc', 'Este email já possui um pré-registro. Nossa equipe entrará em contato em breve.'),
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Save to database
      const { data: registrationData, error } = await supabase.from('marketplace_registrations').insert({
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone || null,
        country: formData.country,
        company_type: formData.companyType,
        products_interest: selectedProducts,
        estimated_volume: formData.estimatedVolume || null,
        message: formData.message || null
      }).select().single();

      if (error) throw error;

      const currentLang = i18n.language as 'pt' | 'en' | 'es' | 'zh';

      // Send confirmation email with LOI link
      const emailResponse = await supabase.functions.invoke('notifications', {
        body: {
          action: 'send_marketplace_email',
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone || undefined,
          country: formData.country,
          companyType: formData.companyType,
          productsInterest: selectedProducts,
          estimatedVolume: formData.estimatedVolume || undefined,
          message: formData.message || undefined,
          registrationId: registrationData?.id,
          language: currentLang
        }
      });

      if (emailResponse.error) {
        console.error('Email error:', emailResponse.error);
      }

      toast({
        title: t('marketplace.form.success'),
        description: t('marketplace.form.successDesc', 'Entraremos em contato em breve para dar continuidade ao seu cadastro.'),
      });

      // Generate LOI PDF (auto-download)
      generateLOIPDF({
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone || undefined,
        country: formData.country,
        companyType: formData.companyType,
        productsInterest: selectedProducts,
        estimatedVolume: formData.estimatedVolume || undefined,
        message: formData.message || undefined,
        language: currentLang
      });

      // Reset form
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        country: '',
        companyType: '',
        estimatedVolume: '',
        message: ''
      });
      setSelectedProducts([]);
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast({
        title: t('marketplace.form.error'),
        description: t('marketplace.form.errorDesc', 'Por favor, tente novamente ou entre em contato conosco.'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <SEO title="Marketplace | ELP Green Technology" description="Compre RCB, óleo de pirólise, granulado de borracha e aço recuperado diretamente da ELP Green Technology." />
    <div className="min-h-screen bg-background/95">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-24 pb-16 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
              <ShoppingCart className="h-4 w-4 text-white/70" />
              <span className="text-sm text-white/70 font-medium">{t('marketplace.comingSoon', 'Em Breve')}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white">
              {t('marketplace.title')}
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
              {t('marketplace.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('marketplace.heroTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('marketplace.heroSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 h-full hover:border-secondary/40 transition-all group">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <product.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t(product.nameKey)}</h3>
                  <p className="text-muted-foreground mb-4">{t(product.descKey)}</p>
                  <ul className="space-y-2">
                    {product.specs.map((spec, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-secondary flex-shrink-0" />
                        {specLabels[spec.key]}: {spec.value}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('marketplace.whyUse', 'Por que usar nosso Marketplace?')}</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t(benefit.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(benefit.descKey)}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-Registration Form */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">{t('marketplace.form.title')}</h2>
              <p className="text-muted-foreground">
                {t('marketplace.form.subtitle', 'Seja um dos primeiros a acessar o marketplace e receba condições exclusivas de lançamento.')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Info */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.companyName')} *
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder={t('marketplace.form.companyNamePlaceholder', 'Nome da sua empresa')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.contactName')} *
                      </Label>
                      <Input
                        id="contactName"
                        value={formData.contactName}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                        placeholder={t('marketplace.form.contactNamePlaceholder', 'Seu nome completo')}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.email')} *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t('marketplace.form.emailPlaceholder', 'seu@empresa.com')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.phone')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+55 (11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.country')} *
                      </Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('marketplace.form.countryPlaceholder', 'Selecione o país')} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-secondary" />
                        {t('marketplace.form.companyType')} *
                      </Label>
                      <Select
                        value={formData.companyType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, companyType: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('marketplace.form.companyTypePlaceholder', 'Selecione o tipo')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">{t('marketplace.form.buyer')}</SelectItem>
                          <SelectItem value="seller">{t('marketplace.form.seller')}</SelectItem>
                          <SelectItem value="both">{t('marketplace.form.both')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Products Interest */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-secondary" />
                      {t('marketplace.form.productsInterest')} *
                    </Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                            selectedProducts.includes(product.id)
                              ? 'border-secondary bg-secondary/10'
                              : 'border-border hover:border-secondary/50'
                          }`}
                          onClick={() => handleProductToggle(product.id)}
                        >
                          <Checkbox
                            id={product.id}
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => handleProductToggle(product.id)}
                          />
                          <label htmlFor={product.id} className="text-sm cursor-pointer flex-1">
                            {t(product.nameKey)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedVolume" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      {t('marketplace.form.estimatedVolume')}
                    </Label>
                    <Select
                      value={formData.estimatedVolume}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, estimatedVolume: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('marketplace.form.volumePlaceholder', 'Selecione o volume estimado')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-50">1-50 {t('marketplace.form.tons', 'toneladas')}</SelectItem>
                        <SelectItem value="50-200">50-200 {t('marketplace.form.tons', 'toneladas')}</SelectItem>
                        <SelectItem value="200-500">200-500 {t('marketplace.form.tons', 'toneladas')}</SelectItem>
                        <SelectItem value="500+">500+ {t('marketplace.form.tons', 'toneladas')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-secondary" />
                      {t('marketplace.form.message')}
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder={t('marketplace.form.messagePlaceholder', 'Conte-nos mais sobre suas necessidades ou requisitos específicos...')}
                      rows={4}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      t('common.loading')
                    ) : (
                      <>
                        {t('marketplace.form.submit')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    {t('marketplace.form.terms', 'Ao se registrar, você concorda com nossa')}{' '}
                    <a href="/privacy" className="text-secondary hover:underline">{t('footer.privacy')}</a>
                    {' '}{t('marketplace.form.and', 'e')}{' '}
                    <a href="/terms" className="text-secondary hover:underline">{t('footer.terms')}</a>.
                  </p>
                </form>
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
