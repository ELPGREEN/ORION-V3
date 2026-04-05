import React, { useState } from 'react';
import { SEO } from '@/components/SEO';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Target, Shield, Linkedin, Mail, Phone, FileCheck, FileText, Sparkles, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { WatermarkImage } from '@/components/ui/watermark-image';
import { Button } from '@/components/ui/button';
import { openExternal } from '@/lib/openExternal';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useLightbox } from '@/hooks/useLightbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import factoryBg from '@/assets/hero/factory-background.jpg';
import logoElp from '@/assets/logo-elp-new.png';
import {
  getGalleryImages,
  getCertificates,
  values,
  getLeadershipTeam,
  getHeadquarters,
  getTrademarks,
  topsPartnershipImg,
  factoryVisitImg,
} from '@/data/aboutData';

export default function About() {
  const { t } = useTranslation();
  const [selectedPdf, setSelectedPdf] = useState<{ name: string; file: string; description: string } | null>(null);
  const [galleryExpanded, setGalleryExpanded] = useState(false);

  const galleryImages = getGalleryImages(t);
  const certificates = getCertificates(t);
  const leadershipTeam = getLeadershipTeam(t);
  const headquarters = getHeadquarters(t);
  const trademarks = getTrademarks(t);

  const lightbox = useLightbox(galleryImages.length);

  return (
    <>
    <SEO title="Sobre Nós | ELP Green Technology" description="Conheça a ELP Green Technology: líder em tecnologia de pirólise e economia circular. Nossa missão, visão e equipe dedicada à sustentabilidade industrial." />
    <div className="min-h-screen bg-background/95">
      <Header />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[80vh] flex items-center pt-24 pb-16 overflow-hidden">
        
        <div className="absolute inset-0">
          <img src={factoryBg} alt={t('about.title')} className="w-full h-[120%] object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,40%,8%)] via-[hsl(220,40%,8%,0.95)] to-[hsl(220,35%,12%,0.85)]" />
          
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,40%,8%,0.6)] via-transparent to-[hsl(220,40%,8%,0.9)]" />
        </div>
        <div className="container-wide relative z-10">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-4xl">
            <div className="overflow-hidden mb-6">
              <motion.h1 initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.85, ease: [0.16, 1, 0.3, 1] }} className="text-white text-display drop-shadow-2xl text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t('about.title')}
              </motion.h1>
            </div>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.45, duration: 0.6, ease: 'easeOut' }} className="w-24 h-0.5 mb-6 origin-left" style={{ background: 'var(--gradient-gold)' }} />
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }} className="text-white/80 text-base md:text-lg leading-relaxed max-w-2xl">
              {t('about.heroSubtitle')}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══ VISION & MISSION ═══ */}
      <section className="py-20">
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <GlassCard className="p-8 md:p-12 text-center md:text-left">
              <div className="flex flex-col items-center md:flex-row md:items-center gap-4 mb-6">
                <Target className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-semibold text-foreground">{t('about.visionTitle')}</h3>
              </div>
              <p className="text-muted-foreground">{t('about.visionDescription')}</p>
            </GlassCard>
            <GlassCard className="p-8 md:p-12 text-center md:text-left">
              <div className="flex flex-col items-center md:flex-row md:items-center gap-4 mb-6">
                <Shield className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-semibold text-foreground">{t('about.missionTitle')}</h3>
              </div>
              <p className="text-muted-foreground">{t('about.missionDescription')}</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section className="py-20 bg-secondary/5">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.valuesTitle')}</h2>
            <p className="text-muted-foreground">{t('about.valuesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <GlassCard key={value.key} className="p-6 md:p-8 text-center">
                <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 bg-gradient-to-br ${value.color}`}>
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{t(`about.values.${value.key}`)}</h3>
                <p className="text-muted-foreground">{t(`about.values.${value.key}Desc`)}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TOPS PARTNERSHIP ═══ */}
      <section className="py-20">
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <GlassCard className="relative overflow-hidden">
              <img src={topsPartnershipImg} alt={t('about.topsPartnershipTitle')} className="w-full h-auto object-cover rounded-2xl" loading="lazy" />
              <WatermarkImage src={logoElp} alt="ELP Green" className="absolute bottom-4 right-4 w-20 opacity-60" />
            </GlassCard>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-foreground mb-6">{t('about.topsPartnershipTitle')}</h2>
              <p className="text-muted-foreground mb-6">{t('about.topsPartnershipDescription')}</p>
              <div className="flex justify-center md:justify-start">
                <Button asChild>
                  <Link to="/esg">{t('about.learnMore')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEADERSHIP TEAM ═══ */}
      <section className="py-20 bg-secondary/5">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.leadershipTitle')}</h2>
            <p className="text-muted-foreground">{t('about.leadershipSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {leadershipTeam.map((member, index) => (
              <GlassCard key={index} className="p-6 md:p-8">
                <div className="relative overflow-hidden rounded-xl mb-4 min-h-[120px] bg-muted/30 flex items-center justify-center">
                  <img src={member.image} alt={member.name} className="w-full h-auto min-h-[100px] object-contain rounded-xl" loading="lazy" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{member.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{member.role}</p>
                <p className="text-muted-foreground text-sm mb-3">{member.location}</p>
                <div className="flex items-center justify-between text-sm">
                  <Button variant="secondary" size="sm" onClick={() => window.alert(member.bio)}>
                    {t('about.viewBio')}
                  </Button>
                  <div className="flex gap-2">
                    {member.linkedin && (
                      <Button variant="ghost" size="icon" onClick={() => openExternal(member.linkedin)}>
                        <Linkedin className="w-4 h-4" />
                        <span className="sr-only">LinkedIn</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = `mailto:${member.email}`}>
                      <Mail className="w-4 h-4" />
                      <span className="sr-only">Email</span>
                    </Button>
                    {member.phone && (
                      <Button variant="ghost" size="icon" onClick={() => window.location.href = `tel:${member.phone}`}>
                        <Phone className="w-4 h-4" />
                        <span className="sr-only">Phone</span>
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL HEADQUARTERS ═══ */}
      <section className="py-20">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.officesTitle')}</h2>
            <p className="text-muted-foreground">{t('about.officesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {headquarters.map((hq, index) => (
              <GlassCard key={index} className="p-6 md:p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className={`inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br ${hq.color}`}>
                    <hq.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">{hq.country}</h3>
                <p className="text-muted-foreground text-sm mb-3">{hq.city}</p>
                <p className="text-foreground/80 text-sm mb-2">{hq.role}</p>
                <p className="text-muted-foreground text-sm mb-3">{hq.description}</p>
                {hq.phone && (
                  <Button variant="secondary" size="sm" onClick={() => window.location.href = `tel:${hq.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    {hq.phone}
                  </Button>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GALLERY ═══ */}
      <section className="py-20 bg-secondary/5">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.galleryTitle')}</h2>
            <p className="text-muted-foreground">{t('about.gallerySubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryImages.slice(0, galleryExpanded ? galleryImages.length : 3).map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index > 2 ? (index - 3) * 0.1 : 0 }}
              >
                <GlassCard className="relative overflow-hidden group cursor-pointer" onClick={() => lightbox.open(index)}>
                  <div className="aspect-[4/3]">
                    <img
                      src={image.src}
                      alt={image.title}
                      className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">{t('about.viewImage')}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {galleryImages.length > 3 && (
            <div className="text-center mt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setGalleryExpanded(!galleryExpanded)}
                className="w-auto"
              >
                {galleryExpanded ? t('about.showLess', 'Ver menos') : t('about.showMore', 'Ver mais')}
                <motion.span
                  animate={{ rotate: galleryExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="ml-2 inline-block"
                >
                  ▼
                </motion.span>
              </Button>
            </div>
          )}

          <ImageLightbox
            images={galleryImages}
            selectedIndex={lightbox.selectedIndex}
            onClose={lightbox.close}
            onNext={lightbox.next}
            onPrev={lightbox.prev}
            useWatermark={false}
          />
        </div>
      </section>

      {/* ═══ CERTIFICATES ═══ */}
      <section className="py-20">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.certificatesTitle')}</h2>
            <p className="text-muted-foreground">{t('about.certificatesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {certificates.map((certificate, index) => (
              <GlassCard key={index} className="p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{certificate.name}</h3>
                  <p className="text-muted-foreground mb-4">{certificate.description}</p>
                </div>
                <Button variant="secondary" onClick={() => setSelectedPdf(certificate)}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('about.viewCertificate')}
                </Button>
              </GlassCard>
            ))}
          </div>

          <Dialog open={selectedPdf !== null} onOpenChange={(open) => !open && setSelectedPdf(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border rounded-xl p-4 relative">
              <DialogHeader>
                <DialogTitle>{selectedPdf?.name}</DialogTitle>
              </DialogHeader>
              {selectedPdf && (
                <>
                  <iframe src={selectedPdf.file} title={selectedPdf.name} className="w-full h-[60vh]" />
                  <p className="text-muted-foreground mt-4">{selectedPdf.description}</p>
                </>
              )}
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setSelectedPdf(null)}>
                <X className="w-5 h-5" />
                <span className="sr-only">{t('close')}</span>
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* ═══ TRADEMARKS ═══ */}
      <section className="py-20 bg-secondary/5">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('about.trademarksTitle')}</h2>
            <p className="text-muted-foreground">{t('about.trademarksSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trademarks.map((trademark, index) => (
              <GlassCard key={index} className="p-6 md:p-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">{trademark.class}</h3>
                <p className="text-muted-foreground mb-3">{trademark.description}</p>
                <p className="text-muted-foreground mb-3">
                  {t('about.processNumber')}: {trademark.process}
                </p>
                <Button variant="secondary" onClick={() => window.alert(trademark.details)}>
                  {t('about.viewDetails')}
                </Button>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FACTORY VISIT CTA ═══ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={factoryVisitImg} alt={t('about.factoryVisitTitle')} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="container-wide relative z-10 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">{t('about.factoryVisitTitle')}</h2>
          <p className="text-lg text-white/80 mb-8">{t('about.factoryVisitSubtitle')}</p>
          <Button variant="outline" className="text-lg">
            <Link to="/contact">{t('about.scheduleVisit')}</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
