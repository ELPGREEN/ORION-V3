import { useState, Suspense } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, ExternalLink, Linkedin, Globe, Cpu, CircuitBoard, Wifi, Handshake, Building2 } from 'lucide-react';
import { HQMiniMap } from '@/components/maps/HQMiniMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { useContactForm } from '@/hooks/useContactForm';

import { GlassCard } from '@/components/ui/glass-card';

// Lazy load 3D components

// Import team images
import xuShiheImg from '@/assets/team/xu-shihe.png';
import ericsonPiccoliImg from '@/assets/team/ericson-piccoli.png';
const contactVideo = '/videos/contact-background.mp4';

// Offices data with translation keys
const getOffices = (t: (key: string) => string) => [{
  city: t('contactPage.offices.italy.city'),
  country: t('contactPage.offices.italy.country'),
  address: 'Strada per Solero',
  phone: '+39 350 1021359',
  countryCode: 'IT',
  coordinates: [8.6424, 44.9767] as [number, number]
}, {
  city: t('contactPage.offices.brazil.city'),
  country: t('contactPage.offices.brazil.country'),
  address: 'Linha Saude S/N, PR - CEP 85884-000',
  phone: '+39 350 1021359',
  countryCode: 'BR',
  coordinates: [-54.0942, -25.2959] as [number, number]
}, {
  city: t('contactPage.offices.germany.city'),
  country: t('contactPage.offices.germany.country'),
  address: 'Financial District',
  countryCode: 'DE',
  coordinates: [8.6821, 50.1109] as [number, number]
}, {
  city: t('contactPage.offices.china.city'),
  country: t('contactPage.offices.china.country'),
  address: 'Provincial Economic Development Park, Zhangjiagang',
  phone: '+39 350 1021359',
  countryCode: 'CN',
  coordinates: [120.5536, 31.8756] as [number, number]
}, {
  city: t('contactPage.offices.australia.city'),
  country: t('contactPage.offices.australia.country'),
  address: 'Level 5, 100 Miller Street, North Sydney NSW 2060',
  countryCode: 'AU',
  coordinates: [151.2093, -33.8688] as [number, number]
}];

// ELP GREEN data
const elpGreen = {
  name: 'ELP GREEN TECHNOLOGY',
  fullName: 'ELP GREEN TECHNOLOGY S.R.L.',
  contact: 'Ericson Piccoli',
  role: 'Chairman of the Board & Founder',
  address: 'Strada per Solero, Alessandria, Piemonte, Italy',
  phone: '+39 350 1021359',
  email: 'info@iasofthub.com',
  linkedin: 'https://www.linkedin.com/company/elpgreen/posts/',
  website: 'https://www.iasofthub.com',
  businessLicense: 'IT02712340062'
};

// Strategic Partner data
const strategicPartner = {
  name: 'TOPS RECYCLING',
  fullName: 'ZHANGJIAGANG SHILONG MACHINERY CO. LTD',
  contact: 'Xu Shihe (许世和)',
  role: 'Foreign Business Intermediary Agent',
  address: 'Provincial Economic Development Park, Zhangjiagang City, Jiangsu Province, P. R. China',
  phone: '+86 159 6237 8058',
  email: 'info@topsindustry.com',
  website: 'https://www.topsrecycling.com',
  businessLicense: '91320582565255473X'
};
export default function Contact() {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const contactMutation = useContactForm();

  // Get translated data
  const offices = getOffices(t);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contactMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        subject: formData.subject,
        message: formData.message,
        channel: formData.subject || 'general'
      });
      toast({
        title: t('contact.form.success'),
        description: t('contact.form.successDesc')
      });
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: t('contact.form.error'),
        description: t('contact.form.error'),
        variant: 'destructive'
      });
    }
  };
  return <><SEO title="Contato | ELP Green Technology" description="Entre em contato com a ELP Green Technology. Escritórios no Brasil, Europa e Ásia. Solicite informações sobre nossas soluções de pirólise e economia circular." /><div className="min-h-screen bg-background/95 overflow-hidden">
      <Header />

      {/* Hero Section with Video Background */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />
        
        <div className="container-wide relative z-10 rounded-sm shadow-sm">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.8
        }} className="max-w-3xl mx-auto text-center py-0 my-[20px]">
            <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            delay: 0.2
          }} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Cpu className="w-4 h-4 text-secondary" />
              <span className="text-white text-sm font-medium">{t('contact.badge', 'Fale Conosco')}</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
            
            {/* Tech decorative elements */}
            <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: 0.5
          }} className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <CircuitBoard className="w-4 h-4 text-secondary" />
                <span>Smart Technology</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Wifi className="w-4 h-4 text-secondary" />
                <span>Global Network</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Globe className="w-4 h-4 text-secondary" />
                <span>5 Continents</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive 3D Globe Section - MOVED TO TOP */}
      <section className="py-16 bg-background relative">
        <div className="container-wide relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">{t('contact.mapTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('contact.mapSubtitle')}</p>
          </motion.div>
          
          
          {/* Office Cards with Mini Maps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {offices.map((office, index) => (
              <motion.div
                key={office.city}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('global-locations-globe')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    window.dispatchEvent(new CustomEvent('globe:selectHQ', { detail: { index } }));
                  }
                }}
                onClick={() => {
                  document.getElementById('global-locations-globe')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  window.dispatchEvent(new CustomEvent('globe:selectHQ', { detail: { index } }));
                }}
                className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl overflow-hidden"
              >
                <div className="h-[280px]">
                  <HQMiniMap
                    lat={office.coordinates[1]}
                    lon={office.coordinates[0]}
                    title={office.city}
                    subtitle={`${office.country}${office.address ? ' • ' + office.address : ''}`}
                    zoom={13}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Channels Section */}
      <section className="py-16 bg-muted/30">
        <div className="container-wide">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('contact.channelsTitle', 'Canais de Contato')}</h2>
            <div className="section-divider mx-auto" />
          </motion.div>

          {/* Two Company Cards Side by Side */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* ELP GREEN TECHNOLOGY */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.1
          }}>
              <GlassCard className="p-8 h-full border-primary/30">
                <div className="flex flex-col items-center md:flex-row md:items-center gap-3 mb-6 text-center md:text-left">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">ELP GREEN TECHNOLOGY</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-xl text-primary">{elpGreen.name}</span>
                    <p className="text-sm text-muted-foreground mt-1">{elpGreen.fullName}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20 bg-white shadow-lg">
                      <img src={ericsonPiccoliImg} alt="Ericson Piccoli" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-primary font-bold text-lg">{elpGreen.contact}</p>
                      <p className="text-sm text-muted-foreground">{elpGreen.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="text-muted-foreground">{elpGreen.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={`tel:${elpGreen.phone}`} className="hover:text-primary transition-colors">
                        {elpGreen.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={`mailto:${elpGreen.email}`} className="hover:text-primary transition-colors">
                        {elpGreen.email}
                      </a>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <a href={elpGreen.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-semibold">
                      <ExternalLink className="h-4 w-4" />
                      www.iasofthub.com
                    </a>
                    <p className="text-xs text-muted-foreground/70">
                      VAT: {elpGreen.businessLicense}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Strategic Partner - TOPS RECYCLING */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.15
          }}>
              <GlassCard className="p-8 h-full border-secondary/30">
                <div className="flex flex-col items-center md:flex-row md:items-center gap-3 mb-6 text-center md:text-left">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                    <Handshake className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">{t('contact.strategicPartner', 'Strategic Partner')}</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-xl text-secondary">{strategicPartner.name}</span>
                    <p className="text-sm text-muted-foreground mt-1">{strategicPartner.fullName}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-secondary/20 bg-white shadow-lg">
                      <img src={xuShiheImg} alt="Xu Shihe" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-secondary font-bold text-lg">{strategicPartner.contact}</p>
                      <p className="text-sm text-muted-foreground">{strategicPartner.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-secondary" />
                      <span className="text-muted-foreground">{strategicPartner.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                      <a href={`tel:${strategicPartner.phone}`} className="hover:text-primary transition-colors">
                        {strategicPartner.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-secondary flex-shrink-0" />
                      <a href={`mailto:${strategicPartner.email}`} className="hover:text-primary transition-colors">
                        {strategicPartner.email}
                      </a>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <a href={strategicPartner.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-semibold">
                      <ExternalLink className="h-4 w-4" />
                      www.topsrecycling.com
                    </a>
                    <p className="text-xs text-muted-foreground/70">
                      License: {strategicPartner.businessLicense}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Contact Form - Centered and Wider */}
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: 0.2
        }} className="max-w-4xl mx-auto">
            <GlassCard className="p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8 justify-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{t('contact.sendMessage')}</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('contact.form.name')}</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData({
                    ...formData,
                    name: e.target.value
                  })} required className="bg-card/50 border-border focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('contact.form.email')}</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
                    ...formData,
                    email: e.target.value
                  })} required className="bg-card/50 border-border focus:border-primary" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">{t('contact.form.company')}</Label>
                    <Input id="company" value={formData.company} onChange={e => setFormData({
                    ...formData,
                    company: e.target.value
                  })} className="bg-card/50 border-border focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                    <Select value={formData.subject} onValueChange={value => setFormData({
                    ...formData,
                    subject: value
                  })}>
                      <SelectTrigger className="bg-card/50 border-border">
                        <SelectValue placeholder={t('contact.form.subject')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partnership">{t('contact.form.subjects.partnership')}</SelectItem>
                        <SelectItem value="investment">{t('contact.form.subjects.investment')}</SelectItem>
                        <SelectItem value="technology">{t('contact.form.subjects.technology')}</SelectItem>
                        <SelectItem value="media">{t('contact.form.subjects.media')}</SelectItem>
                        <SelectItem value="other">{t('contact.form.subjects.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('contact.form.message')}</Label>
                  <Textarea id="message" rows={5} value={formData.message} onChange={e => setFormData({
                  ...formData,
                  message: e.target.value
                })} required className="bg-card/50 border-border focus:border-primary" />
                </div>

                <Button type="submit" size="lg" variant="elp-solid" className="w-full md:w-auto md:px-12 mx-auto block" disabled={contactMutation.isPending}>
                  {contactMutation.isPending ? <>{t('contact.form.sending')}</> : <>
                      <Send className="mr-2 h-5 w-5" />
                      {t('contact.form.send')}
                    </>}
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div></>;
}