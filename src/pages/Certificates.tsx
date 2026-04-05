import { useState } from 'react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, FileCheck, Shield, X, ChevronLeft, ChevronRight, Download, ExternalLink, Calendar, Building2, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

import { useParallax } from '@/hooks/useParallax';

// Lazy load 3D components


// Certificate data with PDF paths and detailed info
const certificates = [
  {
    id: 'classe-1',
    title: 'Registro de Marca - Classe 1',
    description: 'Produtos Químicos Industriais',
    details: 'Ácidos minerais, carvão ativado, plásticos não processados, substâncias químicas industriais para uso científico e fotográfico.',
    pdf: '/certificates/certificado-classe-1.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927739089',
    validity: '07/11/2023 - 07/11/2033',
  },
  {
    id: 'classe-7',
    title: 'Registro de Marca - Classe 7',
    description: 'Máquinas Industriais e Agrícolas',
    details: 'Máquinas agrícolas, trituradoras, compressores, moinhos, pulverizadores e equipamentos industriais.',
    pdf: '/certificates/certificado-classe-7.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927738945',
    validity: '07/11/2023 - 07/11/2033',
  },
  {
    id: 'classe-35',
    title: 'Registro de Marca - Classe 35',
    description: 'Comércio e Intermediação',
    details: 'Serviços de publicidade, gestão de negócios, administração comercial, comércio de matérias plásticas, borracha e energia elétrica.',
    pdf: '/certificates/certificado-classe-35.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927738996',
    validity: '07/11/2023 - 07/11/2033',
  },
  {
    id: 'classe-40',
    title: 'Registro de Marca - Classe 40',
    description: 'Tratamento de Materiais',
    details: 'Processamento de materiais, reciclagem, tratamento de resíduos e serviços de transformação industrial.',
    pdf: '/certificates/certificado-classe-40.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927739038',
    validity: '07/11/2023 - 07/11/2033',
  },
  {
    id: 'classe-40-1',
    title: 'Registro de Marca - Classe 40 (Adicional)',
    description: 'Tratamento de Materiais (Adicional)',
    details: 'Serviços de reciclagem e processamento de resíduos industriais.',
    pdf: '/certificates/certificado-classe-40-1.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927739038-1',
    validity: '07/11/2023 - 07/11/2033',
  },
  {
    id: 'classe-42',
    title: 'Registro de Marca - Classe 42',
    description: 'Pesquisa e Tecnologia',
    details: 'Desenvolvimento de software, pesquisa científica, automação industrial, controle ambiental e serviços tecnológicos.',
    pdf: '/certificates/certificado-classe-42.pdf',
    category: 'Marca Registrada',
    status: 'Ativo',
    registrationNumber: '927739054',
    validity: '07/11/2023 - 07/11/2033',
  },
];

const certificationBadges = [
  { icon: Shield, label: 'INPI Registrado', desc: 'Instituto Nacional da Propriedade Industrial' },
  { icon: FileCheck, label: 'ISO Compliance', desc: 'Padrões internacionais de qualidade' },
  { icon: Award, label: 'Marca Protegida', desc: 'Proteção legal em território nacional' },
];

export default function Certificates() {
  const { t } = useTranslation();
  const [selectedCert, setSelectedCert] = useState<number | null>(null);
  const parallaxOffset = useParallax(0.3);

  const openCertificate = (index: number) => setSelectedCert(index);
  const closeCertificate = () => setSelectedCert(null);
  const nextCert = () => setSelectedCert((prev) => (prev !== null ? (prev + 1) % certificates.length : 0));
  const prevCert = () => setSelectedCert((prev) => (prev !== null ? (prev - 1 + certificates.length) % certificates.length : 0));

  const handleDownload = (pdf: string) => {
    window.open(pdf, '_blank');
  };

  return (
    <>
    <SEO title="Certificados | ELP Green Technology" description="Certificações e registros de marca da ELP Green Technology. Qualidade e conformidade em todas as operações." />
    <div className="min-h-screen bg-background/95 overflow-hidden">
      <Header />

      {/* Hero Section with Particles */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />
        
        <div 
          className="container-wide relative z-10"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/30"
            >
              <Sparkles className="w-4 h-4 text-white/90" />
              <span className="text-white/90 text-sm font-medium">{t('certificates.badge', 'Propriedade Intelectual')}</span>
            </motion.div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {t('certificates.title', 'Certificações e Registros de Marca')}
            </h1>

            <p className="text-xl text-white/70 leading-relaxed max-w-xl mx-auto">
              {t('certificates.subtitle', 'Marcas registradas no INPI que garantem a autenticidade e qualidade da ELP Green Technology.')}
            </p>
          </motion.div>

          {/* Certification Badges */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-4 mt-12"
          >
            {certificationBadges.map((badge, index) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <GlassCard className="p-5 text-center bg-white/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-3 border border-primary/20">
                    <badge.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{badge.label}</h3>
                  <p className="text-xs text-white/60">{badge.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
        
        {/* Gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Owner Info */}
      <section className="py-8 bg-muted/30 border-y border-border/50">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 text-center md:text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('certificates.holder', 'Titular')}</p>
                <p className="font-semibold">Ericson Rodrigues Piccoli</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('certificates.validity', 'Vigência')}</p>
                <p className="font-semibold">07/11/2023 - 07/11/2033</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('certificates.registrations', 'Registros')}</p>
                <p className="font-semibold">6 {t('certificates.classes', 'Classes INPI')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Certificates Grid */}
      <section className="py-20">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('certificates.registeredMarks', 'Registros de Marca')}</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-6" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('certificates.clickToView', 'Clique em qualquer certificado para visualizar os detalhes e acessar o documento oficial')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <GlassCard 
                  className="p-6 h-full cursor-pointer transition-all duration-300 group"
                  onClick={() => openCertificate(index)}
                >
                  {/* Certificate Icon */}
                  <div className="flex items-start gap-4 mb-4">
                    <motion.div 
                      whileHover={{ rotate: 5 }}
                      className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 border border-primary/30 group-hover:border-primary/50 transition-colors"
                    >
                      <FileCheck className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                          {cert.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">
                        {cert.title}
                      </h3>
                    </div>
                  </div>

                  {/* Certificate Info */}
                  <p className="text-sm font-medium text-foreground mb-2">{cert.description}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{cert.details}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Award className="h-3 w-3" />
                      <span>Nº {cert.registrationNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                      <ExternalLink className="h-3 w-3" />
                      {t('certificates.view', 'Ver Certificado')}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox for Certificate viewing */}
      <AnimatePresence>
        {selectedCert !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={closeCertificate}
          >
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-50 bg-white/10 rounded-full backdrop-blur-sm" 
              onClick={closeCertificate}
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 bg-white/10 rounded-full z-50 backdrop-blur-sm hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); prevCert(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 bg-white/10 rounded-full z-50 backdrop-blur-sm hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); nextCert(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Certificate Viewer */}
            <motion.div
              key={selectedCert}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-5xl bg-background rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col lg:flex-row">
                {/* PDF Embed / Viewer */}
                <div className="lg:w-2/3 bg-muted/50 min-h-[60vh] lg:min-h-[80vh] relative">
                  <object
                    data={`${certificates[selectedCert].pdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    className="w-full h-full absolute inset-0"
                  >
                    {/* Fallback when PDF cannot be displayed */}
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-primary/10 to-secondary/10">
                      <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                        <FileCheck className="h-16 w-16 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{certificates[selectedCert].title}</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {certificates[selectedCert].details}
                      </p>
                      <div className="bg-card rounded-lg p-4 mb-6">
                        <p className="text-sm text-muted-foreground mb-1">{t('certificates.processNumber', 'Número do Processo')}</p>
                        <p className="text-lg font-mono font-bold">{certificates[selectedCert].registrationNumber}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('certificates.pdfNotSupported', 'Seu navegador não suporta visualização direta de PDF.')}
                      </p>
                      <Button
                        onClick={() => handleDownload(certificates[selectedCert].pdf)}
                        variant="elp-solid"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('certificates.openPdf', 'Abrir PDF em Nova Aba')}
                      </Button>
                    </div>
                  </object>
                </div>

                {/* Certificate Details */}
                <div className="lg:w-1/3 p-6 lg:p-8 bg-card">
                  <div className="mb-6">
                    <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                      {certificates[selectedCert].status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold mb-2">{certificates[selectedCert].title}</h3>
                  <p className="text-lg text-primary font-medium mb-4">{certificates[selectedCert].description}</p>
                  <p className="text-muted-foreground mb-6">{certificates[selectedCert].details}</p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Award className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('certificates.processNumber', 'Número do Processo')}</p>
                        <p className="font-mono font-semibold">{certificates[selectedCert].registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('certificates.validity', 'Vigência')}</p>
                        <p className="font-semibold">{certificates[selectedCert].validity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('certificates.holder', 'Titular')}</p>
                        <p className="font-semibold">Ericson Rodrigues Piccoli</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownload(certificates[selectedCert].pdf)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('certificates.openPdf', 'Abrir PDF em Nova Aba')}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {t('certificates.inpiNote', 'Documento oficial do INPI - Instituto Nacional da Propriedade Industrial do Brasil')}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
    </>
  );
}
