import { useParams, Link, Navigate } from 'react-router-dom';
import { sanitizeHtml } from '@/lib/sanitize';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Share2, Building2, Loader2, ChevronRight, Globe, Mail, Phone } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';

interface PressReleaseData {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_zh: string;
  content_pt: string;
  content_en: string;
  content_es: string;
  content_zh: string;
  is_published: boolean | null;
  published_at: string | null;
}

export default function PressRelease() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'pt' | 'en' | 'es' | 'zh';

  const { data: pressRelease, isLoading, error } = useQuery({
    queryKey: ['press-release', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('press_releases')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data as PressReleaseData;
    },
    enabled: !!slug,
  });

  // Fetch other press releases
  const { data: otherReleases = [] } = useQuery({
    queryKey: ['other-press-releases', pressRelease?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('press_releases')
        .select('id, slug, title_pt, title_en, title_es, title_zh, published_at')
        .eq('is_published', true)
        .neq('id', pressRelease?.id)
        .order('published_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!pressRelease?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando press release...</p>
        </div>
      </div>
    );
  }

  if (error || !pressRelease) {
    return <Navigate to="/media" replace />;
  }

  const getLocalizedField = (field: 'title' | 'content') => {
    const key = `${field}_${lang}` as keyof PressReleaseData;
    const value = pressRelease[key] as string;
    if (value) return value;
    return pressRelease[`${field}_pt` as keyof PressReleaseData] as string;
  };

  const title = getLocalizedField('title');
  const content = getLocalizedField('content');

  const shareUrl = window.location.href;

  const parseContent = (text: string) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  const labels = {
    back: lang === 'pt' ? 'Voltar para Mídia' : lang === 'en' ? 'Back to Media' : lang === 'es' ? 'Volver a Medios' : '返回媒体中心',
    share: lang === 'pt' ? 'Compartilhar' : lang === 'en' ? 'Share' : lang === 'es' ? 'Compartir' : '分享',
    pressContact: lang === 'pt' ? 'Contato para Imprensa' : lang === 'en' ? 'Press Contact' : lang === 'es' ? 'Contacto de Prensa' : '媒体联系',
    pressContactText: lang === 'pt' ? 'Para mais informações, entrevistas ou materiais de imprensa, entre em contato.' : lang === 'en' ? 'For more information, interviews or press materials, please contact us.' : lang === 'es' ? 'Para más información, entrevistas o materiales de prensa, contáctenos.' : '如需更多信息、采访或新闻材料，请联系我们。',
    contactUs: lang === 'pt' ? 'Fale Conosco' : lang === 'en' ? 'Contact Us' : lang === 'es' ? 'Contáctenos' : '联系我们',
    moreReleases: lang === 'pt' ? 'Mais Press Releases' : lang === 'en' ? 'More Press Releases' : lang === 'es' ? 'Más Comunicados' : '更多新闻稿',
    aboutCompany: lang === 'pt' ? 'Sobre a ELP Green' : lang === 'en' ? 'About ELP Green' : lang === 'es' ? 'Sobre ELP Green' : '关于ELP Green',
    companyDesc: lang === 'pt' ? 'Líder global em reciclagem de pneus OTR (Off-The-Road), com parceria estratégica com a TOPS Recycling (China). Focamos em sustentabilidade, economia circular e inovação industrial.' : lang === 'en' ? 'Global leader in OTR (Off-The-Road) tire recycling, with strategic partnership with TOPS Recycling (China). We focus on sustainability, circular economy and industrial innovation.' : lang === 'es' ? 'Líder global en reciclaje de neumáticos OTR, con asociación estratégica con TOPS Recycling (China). Nos enfocamos en sostenibilidad, economía circular e innovación industrial.' : 'OTR轮胎回收全球领导者，与中国TOPS Recycling建立战略合作伙伴关系。专注于可持续发展、循环经济和工业创新。',
  };

  const getOtherTitle = (item: any) => {
    const key = `title_${lang}` as keyof typeof item;
    return (item[key] as string) || item.title_pt;
  };

  return (
    <>
      <SEO 
        title={`${title} | ELP Green Technology - Press Release`}
        description={content?.substring(0, 160)}
      />
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section */}
        <section className="relative pt-24 pb-16 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-background" />
          
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-20 h-20 border-2 border-primary/20 rounded-full" />
          <div className="absolute bottom-10 right-20 w-32 h-32 border-2 border-green-500/20 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-primary rounded-full" />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-green-500/50 rounded-full" />

          <div className="container-wide relative z-10">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
            >
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/media" className="hover:text-foreground transition-colors">Media</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">Press Release</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-full px-4 py-2 mb-6 border border-primary/20">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">PRESS RELEASE</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8">
                {pressRelease.published_at && (
                  <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                    <Calendar className="h-4 w-4" />
                    {new Date(pressRelease.published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                )}
                <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Globe className="h-4 w-4" />
                  ELP Green Technology
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="default"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title, url: shareUrl });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                    }
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {labels.share}
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:info@iasofthub.com">
                    <Mail className="h-4 w-4 mr-2" />
                    info@iasofthub.com
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container-wide">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-8 md:p-10">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      {parseContent(content).map((paragraph, idx) => {
                        // H1
                        if (paragraph.startsWith('# ') && !paragraph.startsWith('## ')) {
                          return (
                            <h1 key={idx} className="text-3xl font-bold mt-6 mb-4 text-foreground">
                              {paragraph.replace('# ', '')}
                            </h1>
                          );
                        }
                        // H2
                        if (paragraph.startsWith('## ')) {
                          return (
                            <h2 key={idx} className="text-2xl font-bold mt-10 mb-4 text-foreground flex items-center gap-2">
                              <span className="w-1 h-6 bg-primary rounded-full" />
                              {paragraph.replace('## ', '')}
                            </h2>
                          );
                        }
                        // H3
                        if (paragraph.startsWith('### ')) {
                          return (
                            <h3 key={idx} className="text-xl font-semibold mt-8 mb-3 text-foreground">
                              {paragraph.replace('### ', '')}
                            </h3>
                          );
                        }
                        // Horizontal rule
                        if (paragraph === '---') {
                          return <Separator key={idx} className="my-8" />;
                        }
                        // Bullet points
                        if (paragraph.startsWith('• ') || paragraph.startsWith('- ')) {
                          return (
                            <div
                              key={idx}
                              className="flex gap-3 my-3 pl-2"
                            >
                              <span className="text-primary mt-1">●</span>
                              <span
                                className="text-foreground/90"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeHtml(paragraph
                                    .replace(/^[•-]\s/, '')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')),
                                }}
                              />
                            </div>
                          );
                        }
                        // Regular paragraph
                        return (
                          <p
                            key={idx}
                            className="mb-4 leading-relaxed text-foreground/90"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')),
                            }}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Press Contact CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-2">
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2">{labels.pressContact}</h3>
                          <p className="text-muted-foreground">{labels.pressContactText}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button asChild>
                            <Link to="/contact">{labels.contactUs}</Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <a href="tel:+55-51-99688-0045" className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              +55 51 99688-0045
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.article>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* About Company */}
                <Card className="bg-gradient-to-br from-primary/5 to-green-500/5 border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {labels.aboutCompany}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {labels.companyDesc}
                    </p>
                    <Separator className="my-4" />
                    <div className="space-y-2 text-sm">
                      <a href="https://www.iasofthub.com" className="flex items-center gap-2 text-primary hover:underline">
                        <Globe className="h-4 w-4" />
                        iasofthub.com
                      </a>
                      <a href="mailto:info@iasofthub.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4" />
                        info@iasofthub.com
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* More Press Releases */}
                {otherReleases.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-4">{labels.moreReleases}</h3>
                      <div className="space-y-4">
                        {otherReleases.map((release: any) => (
                          <Link
                            key={release.id}
                            to={`/press/${release.slug}`}
                            className="block group"
                          >
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                {getOtherTitle(release)}
                              </h4>
                              {release.published_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(release.published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'pt-BR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Back to Media */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <Link
                      to="/media"
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {labels.back}
                    </Link>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
