import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { FileText, Calendar, Video, ArrowRight, ExternalLink, Cog, Factory, Recycle, Settings, X, ChevronLeft, ChevronRight, Images, Play, Youtube, Sparkles, Search, Tag, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { GlassCard } from '@/components/ui/glass-card';
import { VideoPlayer } from '@/components/media/VideoPlayer';
import { WatermarkImage } from '@/components/ui/watermark-image';
import { supabase } from '@/integrations/supabase/client';
import { openExternal } from '@/lib/openExternal';
import { useParallax } from '@/hooks/useParallax';

// pyrolysis video removed from hero

interface Article {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_zh: string;
  excerpt_pt: string;
  excerpt_en: string;
  excerpt_es: string;
  excerpt_zh: string;
  category: string;
  image_url: string | null;
  published_at: string | null;
}
interface PressReleaseData {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_zh: string;
  published_at: string | null;
}

// Lazy load particle effects only

// Import real gallery images
import partnershipTeamImg from '@/assets/gallery/partnership-team.jpg';
import productionBagsImg from '@/assets/gallery/production-bags.jpg';
import pyrolysisPipesImg from '@/assets/gallery/pyrolysis-pipes.jpg';
import factoryFloorImg from '@/assets/gallery/factory-floor.jpg';
import factoryInspectionImg from '@/assets/gallery/factory-inspection.jpg';
import rubberPowderBagsImg from '@/assets/gallery/rubber-powder-bags.jpg';
import topsRecyclingTeamImg from '@/assets/gallery/tops-recycling-team.jpg';
import partnershipHandshakeImg from '@/assets/gallery/partnership-handshake.jpg';
import factoryImg from '@/assets/team/factory.jpg';
import factoryVisitImg from '@/assets/team/factory-visit.jpg';
import partnershipChinaImg from '@/assets/team/partnership-china.jpg';

// Import machine product images
import tireShredderImg from '@/assets/machines/tire-shredder.jpg';
import rubberGranulatorImg from '@/assets/machines/rubber-granulator.jpg';
import crackerMillImg from '@/assets/machines/cracker-mill.jpg';
import debeaderImg from '@/assets/machines/debeader.jpg';
import otrTireCutterImg from '@/assets/machines/otr-tire-cutter.jpg';
import pyrolysisPlantImg from '@/assets/machines/pyrolysis-plant.jpg';
import rubberPowderLineImg from '@/assets/machines/rubber-powder-line.jpg';
import reclaimedRubberLineImg from '@/assets/machines/reclaimed-rubber-line.jpg';

// Import real OTR photos from factory visits
import otrTirePartnershipImg from '@/assets/otr/otr-tire-partnership.jpg';
import redShredderImg from '@/assets/otr/red-shredder-operation.jpg';
import otrProcessingAreaImg from '@/assets/otr/otr-processing-area.jpg';
import shreddingLineImg from '@/assets/otr/shredding-line-interior.jpg';
import topsFactoryOtrImg from '@/assets/otr/tops-factory-overview.jpg';
import beadRingsImg from '@/assets/otr/bead-rings-stacked.jpg';

// Machine solutions from TOPS Recycling - Source: www.topsrecycling.com
const getMachineSolutions = (t: (key: string, options?: {
  returnObjects?: boolean;
}) => string | string[]) => [{
  id: 'tire-shredder',
  name: String(t('mediaPage.machines.tireShredder.name')),
  model: String(t('mediaPage.machines.tireShredder.model')),
  category: String(t('mediaPage.machines.tireShredder.category')),
  description: String(t('mediaPage.machines.tireShredder.description')),
  specs: t('mediaPage.machines.tireShredder.specs', {
    returnObjects: true
  }) as string[],
  image: tireShredderImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'rubber-granulator',
  name: String(t('mediaPage.machines.rubberGranulator.name')),
  model: String(t('mediaPage.machines.rubberGranulator.model')),
  category: String(t('mediaPage.machines.rubberGranulator.category')),
  description: String(t('mediaPage.machines.rubberGranulator.description')),
  specs: t('mediaPage.machines.rubberGranulator.specs', {
    returnObjects: true
  }) as string[],
  image: rubberGranulatorImg,
  source: 'www.topsindustry.com'
}, {
  id: 'cracker-mill',
  name: String(t('mediaPage.machines.crackerMill.name')),
  model: String(t('mediaPage.machines.crackerMill.model')),
  category: String(t('mediaPage.machines.crackerMill.category')),
  description: String(t('mediaPage.machines.crackerMill.description')),
  specs: t('mediaPage.machines.crackerMill.specs', {
    returnObjects: true
  }) as string[],
  image: crackerMillImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'debeader',
  name: String(t('mediaPage.machines.debeader.name')),
  model: String(t('mediaPage.machines.debeader.model')),
  category: String(t('mediaPage.machines.debeader.category')),
  description: String(t('mediaPage.machines.debeader.description')),
  specs: t('mediaPage.machines.debeader.specs', {
    returnObjects: true
  }) as string[],
  image: debeaderImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'otr-tire-cutter',
  name: String(t('mediaPage.machines.otrTireCutter.name')),
  model: String(t('mediaPage.machines.otrTireCutter.model')),
  category: String(t('mediaPage.machines.otrTireCutter.category')),
  description: String(t('mediaPage.machines.otrTireCutter.description')),
  specs: t('mediaPage.machines.otrTireCutter.specs', {
    returnObjects: true
  }) as string[],
  image: otrTireCutterImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'pyrolysis-plant',
  name: String(t('mediaPage.machines.pyrolysisPlant.name')),
  model: String(t('mediaPage.machines.pyrolysisPlant.model')),
  category: String(t('mediaPage.machines.pyrolysisPlant.category')),
  description: String(t('mediaPage.machines.pyrolysisPlant.description')),
  specs: t('mediaPage.machines.pyrolysisPlant.specs', {
    returnObjects: true
  }) as string[],
  image: pyrolysisPlantImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'rubber-powder-line',
  name: String(t('mediaPage.machines.rubberPowderLine.name')),
  model: String(t('mediaPage.machines.rubberPowderLine.model')),
  category: String(t('mediaPage.machines.rubberPowderLine.category')),
  description: String(t('mediaPage.machines.rubberPowderLine.description')),
  specs: t('mediaPage.machines.rubberPowderLine.specs', {
    returnObjects: true
  }) as string[],
  image: rubberPowderLineImg,
  source: 'www.topsrecycling.com'
}, {
  id: 'reclaimed-rubber-line',
  name: String(t('mediaPage.machines.reclaimedRubberLine.name')),
  model: String(t('mediaPage.machines.reclaimedRubberLine.model')),
  category: String(t('mediaPage.machines.reclaimedRubberLine.category')),
  description: String(t('mediaPage.machines.reclaimedRubberLine.description')),
  specs: t('mediaPage.machines.reclaimedRubberLine.specs', {
    returnObjects: true
  }) as string[],
  image: reclaimedRubberLineImg,
  source: 'www.topsrecycling.com'
}];

// OTR Tire Solutions - Giant Mining & Agricultural Tires from TOPS Recycling - Real Photos with i18n
const getOtrSolutions = (t: (key: string, options?: {
  returnObjects?: boolean;
}) => string | string[]) => [{
  id: 'otr-giant-tire',
  key: 'giantTire',
  image: otrTirePartnershipImg,
  source: 'TOPS Recycling / ELP Green'
}, {
  id: 'otr-shredder',
  key: 'shredder',
  image: redShredderImg,
  source: 'TOPS Recycling'
}, {
  id: 'otr-processing',
  key: 'processing',
  image: otrProcessingAreaImg,
  source: 'TOPS Recycling'
}, {
  id: 'otr-bead-wire',
  key: 'beadWire',
  image: beadRingsImg,
  source: 'TOPS Recycling'
}, {
  id: 'otr-factory',
  key: 'factory',
  image: topsFactoryOtrImg,
  source: 'TOPS Recycling'
}, {
  id: 'otr-shredding-line',
  key: 'shreddingLine',
  image: shreddingLineImg,
  source: 'TOPS Recycling'
}].map(item => ({
  id: item.id,
  name: String(t(`mediaPage.otr.${item.key}.name`)),
  model: String(t(`mediaPage.otr.${item.key}.model`)),
  category: String(t(`mediaPage.otr.${item.key}.category`)),
  description: String(t(`mediaPage.otr.${item.key}.description`)),
  specs: t(`mediaPage.otr.${item.key}.specs`, {
    returnObjects: true
  }) as string[],
  applications: t(`mediaPage.otr.${item.key}.applications`, {
    returnObjects: true
  }) as string[],
  capacity: String(t(`mediaPage.otr.${item.key}.capacity`)),
  image: item.image,
  source: item.source
}));

// Gallery images with translation keys - using mediaPage namespace
const getGalleryImages = (t: (key: string) => string) => [{
  src: topsRecyclingTeamImg,
  title: t('mediaPage.galleryImages.topsTeam.title'),
  description: t('mediaPage.galleryImages.topsTeam.description')
}, {
  src: partnershipHandshakeImg,
  title: t('mediaPage.galleryImages.partnershipHandshake.title'),
  description: t('mediaPage.galleryImages.partnershipHandshake.description')
}, {
  src: partnershipTeamImg,
  title: t('mediaPage.galleryImages.partnershipTeam.title'),
  description: t('mediaPage.galleryImages.partnershipTeam.description')
}, {
  src: pyrolysisPipesImg,
  title: t('mediaPage.galleryImages.pyrolysisPipes.title'),
  description: t('mediaPage.galleryImages.pyrolysisPipes.description')
}, {
  src: factoryFloorImg,
  title: t('mediaPage.galleryImages.factoryFloor.title'),
  description: t('mediaPage.galleryImages.factoryFloor.description')
}, {
  src: factoryInspectionImg,
  title: t('mediaPage.galleryImages.factoryInspection.title'),
  description: t('mediaPage.galleryImages.factoryInspection.description')
}, {
  src: rubberPowderBagsImg,
  title: t('mediaPage.galleryImages.rubberPowderBags.title'),
  description: t('mediaPage.galleryImages.rubberPowderBags.description')
}, {
  src: productionBagsImg,
  title: t('mediaPage.galleryImages.productionBags.title'),
  description: t('mediaPage.galleryImages.productionBags.description')
}, {
  src: factoryImg,
  title: t('mediaPage.galleryImages.factory.title'),
  description: t('mediaPage.galleryImages.factory.description')
}, {
  src: factoryVisitImg,
  title: t('mediaPage.galleryImages.factoryVisit.title'),
  description: t('mediaPage.galleryImages.factoryVisit.description')
}, {
  src: partnershipChinaImg,
  title: t('mediaPage.galleryImages.partnershipChina.title'),
  description: t('mediaPage.galleryImages.partnershipChina.description')
}];

// Video tags for filtering
type VideoTag = 'mining' | 'recycling' | 'pyrolysis' | 'partnership' | 'equipment' | 'sustainability';

// YouTube Videos from @elpgreen channel with translation keys
const youtubeVideos: Array<{
  id: string;
  titleKey: string;
  tags: VideoTag[];
}> = [{
  id: 'NlEC0WsEkvQ',
  titleKey: 'videos.conveyorBelt',
  tags: ['mining', 'equipment']
}, {
  id: 'DmMLBxClxsA',
  titleKey: 'videos.crushers',
  tags: ['mining', 'equipment']
}, {
  id: 'gdYwtaHa_t8',
  titleKey: 'videos.compactMining',
  tags: ['mining', 'equipment']
}, {
  id: 'fM1MeM1z1tA',
  titleKey: 'videos.fullMiningPlant',
  tags: ['mining', 'equipment', 'sustainability']
}, {
  id: 'PqibTFch3dU',
  titleKey: 'videos.customMachinery',
  tags: ['mining', 'equipment']
}, {
  id: 'e1GNubpCQhI',
  titleKey: 'videos.ecoMining',
  tags: ['mining', 'sustainability']
}, {
  id: 'LBcEd3kyZb4',
  titleKey: 'videos.heavyDuty',
  tags: ['mining', 'equipment']
}, {
  id: 'ZAHAtvfAg_Q',
  titleKey: 'videos.mineralSeparation',
  tags: ['mining', 'equipment']
}, {
  id: 'kbQBlp6mifg',
  titleKey: 'videos.ecoMining2',
  tags: ['mining', 'sustainability']
}, {
  id: '41srIwFLM4k',
  titleKey: 'videos.miningAutomation',
  tags: ['mining', 'equipment']
}, {
  id: 'qrGsiNGR9-k',
  titleKey: 'videos.mobileCrushing',
  tags: ['mining', 'equipment']
}, {
  id: 'xyhDhGfiRYg',
  titleKey: 'videos.smartRecycling',
  tags: ['recycling', 'sustainability']
}, {
  id: 'Th4KQR0lBCc',
  titleKey: 'videos.pyrolysisTech',
  tags: ['pyrolysis', 'sustainability']
}, {
  id: 'akEev-QNwTM',
  titleKey: 'videos.globalSupplyChain',
  tags: ['recycling', 'partnership']
}, {
  id: 'CBM9BZyVEUs',
  titleKey: 'videos.completeSolutions',
  tags: ['recycling', 'equipment']
}, {
  id: '4l0E0tL_tNw',
  titleKey: 'videos.devulcanized',
  tags: ['recycling', 'sustainability']
}, {
  id: 'SxAFs5r-Ok4',
  titleKey: 'videos.builtToLast',
  tags: ['recycling', 'equipment']
}, {
  id: 'G8mYBzeM9zo',
  titleKey: 'videos.tireRevolution',
  tags: ['recycling', 'sustainability']
}, {
  id: 'JgTcFyazprU',
  titleKey: 'videos.websiteElp',
  tags: ['partnership']
}, {
  id: 'e2hDpbvc7_U',
  titleKey: 'videos.partnershipAnnouncement',
  tags: ['partnership']
}, {
  id: 'lz9xhOyjbcc',
  titleKey: 'videos.wasteToResources',
  tags: ['recycling', 'sustainability']
}, {
  id: 'qPvKUvHSIIo',
  titleKey: 'videos.otrRecycler',
  tags: ['recycling', 'equipment']
}, {
  id: 'cu2br5U8rzM',
  titleKey: 'videos.revolutionizeTire',
  tags: ['recycling', 'partnership', 'sustainability']
}, {
  id: 'Re6PEoVeu3o',
  titleKey: 'videos.tireSlicePro',
  tags: ['recycling', 'equipment']
}, {
  id: 'nOpldaABq7M',
  titleKey: 'videos.samuelXu',
  tags: ['partnership']
}, {
  id: 'ZSPuzTPJtXU',
  titleKey: 'videos.chinaBrazil',
  tags: ['partnership', 'sustainability']
}, {
  id: 't45w_QdDwro',
  titleKey: 'videos.topsCollaboration',
  tags: ['partnership', 'recycling']
}, {
  id: '83D7EGDob6A',
  titleKey: 'videos.strategicAlliance',
  tags: ['partnership']
}];

// Articles and press releases are now fetched from the database

const getEvents = (t: (key: string) => string) => [{
  name: t('mediaPage.events.cop29.name'),
  location: t('mediaPage.events.cop29.location'),
  date: t('mediaPage.events.cop29.date'),
  type: t('mediaPage.events.cop29.type')
}, {
  name: t('mediaPage.events.circularSummit.name'),
  location: t('mediaPage.events.circularSummit.location'),
  date: t('mediaPage.events.circularSummit.date'),
  type: t('mediaPage.events.circularSummit.type')
}, {
  name: t('mediaPage.events.rubberConference.name'),
  location: t('mediaPage.events.rubberConference.location'),
  date: t('mediaPage.events.rubberConference.date'),
  type: t('mediaPage.events.rubberConference.type')
}];
export default function Media() {
  const {
    t,
    i18n
  } = useTranslation();
  const lang = i18n.language as 'pt' | 'en' | 'es' | 'zh';
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get translated data
  const machineSolutions = getMachineSolutions(t);
  const galleryImages = getGalleryImages(t);
  const events = getEvents(t);
  const otrSolutions = getOtrSolutions(t);

  // Parallax effect
  const parallaxOffset = useParallax(0.3);

  // Video search & filter state
  const [videoSearch, setVideoSearch] = useState('');
  const [selectedVideoTags, setSelectedVideoTags] = useState<VideoTag[]>([]);

  // Dynamic videos from edge function
  const [dynamicVideos, setDynamicVideos] = useState<Array<{
    id: string;
    title: string;
    tags: VideoTag[];
  }>>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videoSource, setVideoSource] = useState<string>('static');

  // Fetch articles from database
  const {
    data: articles = [],
    isLoading: articlesLoading
  } = useQuery({
    queryKey: ['media-articles'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('articles').select('id, slug, title_pt, title_en, title_es, title_zh, excerpt_pt, excerpt_en, excerpt_es, excerpt_zh, category, image_url, published_at').eq('is_published', true).order('published_at', {
        ascending: false
      }).limit(6);
      if (error) throw error;
      return data as Article[];
    }
  });

  // Fetch press releases from database
  const {
    data: pressReleases = [],
    isLoading: pressLoading
  } = useQuery({
    queryKey: ['media-press-releases'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('press_releases').select('id, slug, title_pt, title_en, title_es, title_zh, published_at').eq('is_published', true).order('published_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      return data as PressReleaseData[];
    }
  });

  // Helper to get localized field
  const getLocalizedTitle = (item: Article | PressReleaseData) => {
    const key = `title_${lang}` as keyof typeof item;
    return item[key] as string || item.title_pt;
  };
  const getLocalizedExcerpt = (item: Article) => {
    const key = `excerpt_${lang}` as keyof typeof item;
    return item[key] as string || item.excerpt_pt;
  };

  // Fetch videos from edge function
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoadingVideos(true);
        const {
          data,
          error
        } = await supabase.functions.invoke('utils-api', { body: { action: 'fetch-youtube-videos' } });
        if (error) {
          console.error('Error fetching videos:', error);
          setVideoSource('fallback');
          return;
        }
        if (data?.videos && Array.isArray(data.videos) && data.videos.length > 0) {
          setDynamicVideos(data.videos);
          setVideoSource(data.source || 'api');
        } else {
          setVideoSource('static');
        }
      } catch (err) {
        console.error('Error:', err);
        setVideoSource('fallback');
      } finally {
        setIsLoadingVideos(false);
      }
    };
    fetchVideos();
  }, []);

  // Use dynamic videos if available, otherwise fall back to static
  const allVideos = useMemo(() => {
    if (dynamicVideos.length > 0) {
      return dynamicVideos.map(v => ({
        id: v.id,
        titleKey: '',
        // Not used for dynamic
        title: v.title,
        tags: v.tags || ['equipment' as VideoTag]
      }));
    }
    // Fall back to static videos with translations
    return youtubeVideos.map(v => ({
      id: v.id,
      titleKey: v.titleKey,
      title: t(`mediaPage.${v.titleKey}`) as string,
      tags: v.tags
    }));
  }, [dynamicVideos, t]);
  const categories = ['all', ...new Set(machineSolutions.map(m => m.category))];
  const filteredMachines = selectedCategory === 'all' ? machineSolutions : machineSolutions.filter(m => m.category === selectedCategory);

  // Get translated tag labels
  const getTagLabel = (tag: VideoTag): string => {
    const labels: Record<VideoTag, string> = {
      mining: t('media.tags.mining'),
      recycling: t('media.tags.recycling'),
      pyrolysis: t('media.tags.pyrolysis'),
      partnership: t('media.tags.partnership'),
      equipment: t('media.tags.equipment'),
      sustainability: t('media.tags.sustainability')
    };
    return labels[tag];
  };
  const TAG_COLORS: Record<VideoTag, string> = {
    mining: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
    recycling: 'bg-green-500/20 text-green-600 border-green-500/30',
    pyrolysis: 'bg-slate-600/20 text-slate-700 border-slate-600/30',
    partnership: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    equipment: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    sustainability: 'bg-teal-500/20 text-teal-600 border-teal-500/30'
  };

  // Filtered videos based on search and tags
  const filteredVideos = useMemo(() => {
    return allVideos.filter(video => {
      const matchesSearch = videoSearch.trim() === '' || video.title.toLowerCase().includes(videoSearch.toLowerCase());
      const matchesTags = selectedVideoTags.length === 0 || selectedVideoTags.some(tag => video.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [videoSearch, selectedVideoTags, allVideos]);
  const toggleVideoTag = (tag: VideoTag) => {
    setSelectedVideoTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const openLightbox = (index: number) => setSelectedImage(index);
  const closeLightbox = () => setSelectedImage(null);
  const nextImage = () => setSelectedImage(prev => prev !== null ? (prev + 1) % galleryImages.length : 0);
  const prevImage = () => setSelectedImage(prev => prev !== null ? (prev - 1 + galleryImages.length) % galleryImages.length : 0);
  return <div className="min-h-screen bg-background/95 overflow-hidden">
      <SEO title={t('media.seo.title')} description={t('media.seo.description')} url="https://www.iasofthub.com/media" />
      <Header />

      {/* Hero Section with 3D Effects - No Video */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 overflow-hidden">
        {/* Background with Parallax */}
        <div className="absolute inset-0" style={{
        transform: `translateY(${parallaxOffset}px)`
      }}>
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,8%)] via-[hsl(220,35%,12%)] to-[hsl(220,40%,8%)]" />
          
          
          {/* Animated Gradient Orbs */}
          <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl" animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }} transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
          <motion.div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/20 to-primary/10 blur-3xl" animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.2, 0.4]
        }} transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }} />
          
          {/* Dark overlays with gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,40%,8%,0.95)] via-[hsl(220,35%,12%,0.85)] to-[hsl(220,40%,8%,0.7)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,40%,8%)] via-transparent to-[hsl(220,40%,8%,0.5)]" />
        </div>


        {/* Animated floating elements - like Index */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating geometric shapes */}
          {[...Array(6)].map((_, i) => <motion.div key={i} className="absolute" style={{
          left: `${15 + i * 15}%`,
          top: `${20 + i % 3 * 25}%`
        }} animate={{
          y: [0, -30, 0],
          rotate: [0, 360],
          opacity: [0.1, 0.3, 0.1]
        }} transition={{
          duration: 8 + i * 2,
          repeat: Infinity,
          delay: i * 0.5,
          ease: "easeInOut"
        }}>
              <div className="border border-primary/20 rounded-lg backdrop-blur-sm" style={{
            width: `${32 + i * 16}px`,
            height: `${32 + i * 16}px`,
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.1), transparent)`
          }} />
            </motion.div>)}

          {/* Glowing orbs */}
          <motion.div className="absolute right-[20%] top-[30%] w-64 h-64 rounded-full" style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }} animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }} transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
          <motion.div className="absolute left-[10%] bottom-[20%] w-96 h-96 rounded-full" style={{
          background: 'radial-gradient(circle, hsl(142 76% 36% / 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }} animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }} transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
        </div>
        
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
              <span className="text-sm font-medium text-primary-foreground">{t('media.mediaResources')}</span>
            </motion.div>
            
            <h1 className="text-white mb-6 leading-tight text-3xl md:text-4xl lg:text-5xl font-bold">
              {t('media.title')}
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
              {t('media.subtitle')}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" variant="elp-white">
                <a href="https://www.youtube.com/@elpgreen/videos" target="_blank" rel="noopener noreferrer" onClick={e => {
                e.preventDefault();
                openExternal('https://www.youtube.com/@elpgreen/videos');
              }}>
                  <Youtube className="mr-2 h-5 w-5" />
                  {t('media.youtubeChannel')}
                </a>
              </Button>
              <Button asChild size="lg" variant="elp-white-outline">
                <Link to="/contact">
                  {t('media.requestMedia')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
          
          {/* Video controls */}
            {/* Scroll indicator */}
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 1
        }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
              <motion.div animate={{
            y: [0, 10, 0]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }} className="flex flex-col items-center gap-2">
                <span className="text-white/60 text-sm">{t('hero.scrollDown') || 'Scroll'}</span>
                <ChevronLeft className="h-5 w-5 text-white/60 rotate-[-90deg]" />
              </motion.div>
            </motion.div>
          </div>
        </section>

      {/* Machine Solutions - TOPS Recycling */}
      <section className="py-24">
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
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Cog className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">{t('media.machineSolutions')}</span>
            </div>
            <h2 className="mb-4">{t('media.topsEquipment')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('media.topsDesc')}
            </p>
            <a href="https://www.topsrecycling.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline mt-4">
              <ExternalLink className="h-4 w-4" />
              www.topsrecycling.com
            </a>
          </motion.div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {cat === 'all' ? t('media.all') : cat}
              </button>)}
          </div>

          {/* Machines Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMachines.map((machine, index) => <motion.div key={machine.id} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.05
          }} className="bg-card rounded-2xl overflow-hidden shadow-lg border border-border group">
                <div className="aspect-video overflow-hidden relative">
                  <WatermarkImage src={machine.image} alt={machine.name} className="group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 z-20">
                    <span className="bg-primary/90 text-white text-xs px-3 py-1 rounded-full">
                      {machine.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-1">{machine.name}</h3>
                  <p className="text-primary text-sm font-medium mb-3">{machine.model}</p>
                  <p className="text-muted-foreground text-sm mb-4">{machine.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {machine.specs.map((spec, i) => <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Settings className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                        <span>{spec}</span>
                      </div>)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground/60 border-t border-border pt-3">
                    {t('media.source')}: {machine.source}
                  </p>
                </div>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* OTR Giant Tire Solutions Section */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
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
            <div className="inline-flex items-center gap-2 bg-orange-500/10 rounded-full px-4 py-2 mb-6">
              <Factory className="h-5 w-5 text-orange-500" />
              <span className="text-orange-500 font-medium">{t('media.otrSolutions')}</span>
            </div>
            <h2 className="mb-4">{t('media.otrTitle')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('media.otrDesc')}
            </p>
          </motion.div>

          {/* OTR Solutions Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {otrSolutions.map((solution, index) => <motion.div key={solution.id} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} className="bg-card rounded-2xl overflow-hidden shadow-xl border border-border group">
                <div className="grid md:grid-cols-2">
                  <div className="aspect-square md:aspect-auto overflow-hidden relative">
                    <WatermarkImage src={solution.image} alt={solution.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        {solution.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-1">{solution.name}</h3>
                    <p className="text-orange-500 text-sm font-semibold mb-3">{solution.model}</p>
                    <p className="text-muted-foreground text-sm mb-4 flex-grow">{solution.description}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">{t('media.otrSpecs')}</p>
                        <div className="space-y-1">
                          {solution.specs.map((spec, i) => <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Cog className="h-3 w-3 mt-0.5 text-orange-500 flex-shrink-0" />
                              <span>{spec}</span>
                            </div>)}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">{t('media.otrApplications')}</p>
                        <div className="flex flex-wrap gap-1">
                          {solution.applications.map((app, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                              {app}
                            </span>)}
                        </div>
                      </div>
                      
                      <div className="bg-orange-500/10 rounded-lg p-2">
                        <p className="text-xs font-semibold text-orange-600">{t('media.otrCapacity')}: {solution.capacity}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground/60 border-t border-border pt-3">
                      {t('media.source')}: {solution.source}
                    </p>
                  </div>
                </div>
              </motion.div>)}
          </div>

          {/* CTA for OTR */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center">
            <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-orange-500/10 rounded-2xl p-8 border border-orange-500/20">
              <h3 className="text-xl font-bold mb-2">{t('media.otrCta')}</h3>
              <p className="text-muted-foreground mb-6">{t('media.otrCtaDesc')}</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Link to="/quote">
                    {t('solutions.requestQuote')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                  <a href="https://www.topsrecycling.com/Waste-OTR-Tires-Recycling-Machines-pl3795729.html" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('media.visitPartner')}
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* YouTube Videos Section */}
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
        }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-500/10 rounded-full px-4 py-2 mb-6">
              <Youtube className="h-5 w-5 text-red-500" />
              <span className="text-red-500 font-medium">{t('media.youtubeChannel')}</span>
            </div>
            <h2 className="mb-4">{t('media.videoGallery')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('media.videoGalleryDesc')}
            </p>
            <a href="https://www.youtube.com/@elpgreen/videos" target="_blank" rel="noopener noreferrer" onClick={e => {
            e.preventDefault();
            openExternal('https://www.youtube.com/@elpgreen/videos');
          }} className="inline-flex items-center gap-2 text-red-500 hover:underline mt-4 font-medium">
              <ExternalLink className="h-4 w-4" />
              {t('media.subscribeChannel')}
            </a>
          </motion.div>

          {/* Search & Filter Controls */}
          <div className="mb-8 space-y-4">
            {/* Search input */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder={t('media.searchVideos') || 'Buscar vídeos...'} value={videoSearch} onChange={e => setVideoSearch(e.target.value)} className="pl-10 rounded-full border-primary/20 focus:border-primary/40" />
            </div>

            {/* Tag filters */}
            <div className="flex flex-wrap justify-center gap-2">
              {(['mining', 'recycling', 'pyrolysis', 'partnership', 'equipment', 'sustainability'] as VideoTag[]).map(tag => <button key={tag} onClick={() => toggleVideoTag(tag)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedVideoTags.includes(tag) ? `${TAG_COLORS[tag]} ring-2 ring-offset-1 ring-current` : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}>
                  <Tag className="h-3 w-3" />
                  {getTagLabel(tag)}
                </button>)}
              {selectedVideoTags.length > 0 && <button onClick={() => setSelectedVideoTags([])} className="px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors">
                  {t('media.clearFilters')}
                </button>}
            </div>

            {/* Results count with loading state */}
            <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              {isLoadingVideos && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{filteredVideos.length} {t('media.videosOf')} {allVideos.length} {t('media.videos')}</span>
              {videoSource !== 'static' && <span className="text-xs text-primary/60">
                  ({videoSource === 'youtube_api' ? t('media.live') : videoSource === 'cache' ? t('media.cache') : t('media.fallback')})
                </span>}
            </div>
          </div>

          {/* Video Grid - Using VideoPlayer with expand/sound */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.slice(0, 12).map(video => <VideoPlayer key={video.id} videoId={video.id} title={video.title} tagColors={TAG_COLORS[video.tags[0]] || TAG_COLORS.equipment} tags={<div className="flex flex-wrap gap-1 mb-2">
                    {video.tags.slice(0, 3).map(tag => <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_COLORS[tag]}`}>
                        {getTagLabel(tag)}
                      </span>)}
                  </div>} />)}
          </div>

          {filteredVideos.length === 0 && <div className="text-center py-12">
              <p className="text-muted-foreground">{t('media.noVideosFound')}</p>
              <Button variant="outline" onClick={() => {
            setVideoSearch('');
            setSelectedVideoTags([]);
          }} className="mt-4">
                {t('media.clearFilters')}
              </Button>
            </div>}

          <div className="text-center mt-12">
            <a href="https://www.youtube.com/@elpgreen/videos" target="_blank" rel="noopener noreferrer" onClick={e => {
            e.preventDefault();
            openExternal('https://www.youtube.com/@elpgreen/videos');
          }} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-colors">
              <Play className="h-5 w-5" />
              {t('media.viewAllVideos')}
            </a>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-24">
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
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Images className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">{t('media.gallery')}</span>
            </div>
            <h2 className="mb-4">{t('media.partnershipsGallery')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('media.partnershipsDesc')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => <motion.div key={index} initial={{
            opacity: 0,
            scale: 0.9
          }} whileInView={{
            opacity: 1,
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.03
          }} className="group cursor-pointer relative rounded-xl overflow-hidden aspect-[4/3] shadow-lg" onClick={() => openLightbox(index)}>
                <WatermarkImage src={image.src} alt={image.title} className="group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="text-white font-semibold text-sm">{image.title}</h4>
                    <p className="text-white/70 text-xs">{image.description}</p>
                  </div>
                </div>
              </motion.div>)}
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-8">
            {t('media.photoCredits')}
          </p>
        </div>
      </section>

      {/* Blog Section - Articles & Press Releases Side by Side */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container-wide">
          {/* Section Header */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">{t('media.blog')}</span>
            </div>
            <h2 className="mb-4">{t('media.latestContent')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('media.latestContentDesc')}
            </p>
          </motion.div>

          {/* Two Column Blog Layout */}
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Articles Column */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('media.articlesTitle')}</h3>
                  <p className="text-sm text-muted-foreground">{t('media.articlesInsights')}</p>
                </div>
              </div>

              {articlesLoading ? <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div> : articles.length === 0 ? <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('media.noArticles')}</p>
                </div> : <div className="space-y-6">
                  {/* Featured Article - First one larger */}
                  {articles[0] && <motion.article initial={{
                opacity: 0,
                y: 20
              }} whileInView={{
                opacity: 1,
                y: 0
              }} viewport={{
                once: true
              }} className="bg-card rounded-2xl overflow-hidden shadow-xl border border-border group">
                      {articles[0].image_url && <div className="aspect-[16/9] overflow-hidden relative">
                          <img src={articles[0].image_url} alt={getLocalizedTitle(articles[0])} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <span className="text-xs font-medium text-white/90 bg-primary/80 px-3 py-1 rounded-full">
                              {articles[0].category}
                            </span>
                          </div>
                        </div>}
                      <div className="p-6">
                        {articles[0].published_at && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(articles[0].published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                            </span>
                          </div>}
                        <h4 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {getLocalizedTitle(articles[0])}
                        </h4>
                        <p className="text-muted-foreground line-clamp-3 mb-4">{getLocalizedExcerpt(articles[0])}</p>
                        <Button asChild variant="default" size="sm">
                          <Link to={`/blog/${articles[0].slug}`}>
                            {t('common.readMore')} <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </motion.article>}

                  {/* Other Articles - Compact list */}
                  {articles.slice(1).map((article, index) => <motion.article key={article.id} initial={{
                opacity: 0,
                x: -20
              }} whileInView={{
                opacity: 1,
                x: 0
              }} viewport={{
                once: true
              }} transition={{
                delay: index * 0.1
              }} className="bg-card rounded-xl overflow-hidden shadow-lg border border-border group">
                      <Link to={`/blog/${article.slug}`} className="flex gap-4 p-4 hover:bg-muted/50 transition-colors">
                        {article.image_url && <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={article.image_url} alt={getLocalizedTitle(article)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {article.category}
                            </span>
                            {article.published_at && <span className="text-xs text-muted-foreground">
                                {new Date(article.published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR')}
                              </span>}
                          </div>
                          <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {getLocalizedTitle(article)}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {getLocalizedExcerpt(article)}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 self-center" />
                      </Link>
                    </motion.article>)}
                </div>}
            </div>

            {/* Press Releases Column */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('media.press')}</h3>
                  <p className="text-sm text-muted-foreground">{t('media.pressDesc')}</p>
                </div>
              </div>

              {pressLoading ? <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div> : pressReleases.length === 0 ? <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('media.noPressReleases')}</p>
                </div> : <div className="space-y-4">
                  {/* Press releases timeline-style */}
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-orange-500 via-orange-500/50 to-transparent" />
                    
                    {pressReleases.map((pr, index) => <motion.div key={pr.id} initial={{
                  opacity: 0,
                  x: 20
                }} whileInView={{
                  opacity: 1,
                  x: 0
                }} viewport={{
                  once: true
                }} transition={{
                  delay: index * 0.1
                }} className="relative pl-12 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div className="absolute left-3 top-2 w-4 h-4 rounded-full bg-orange-500 border-4 border-background shadow-md" />
                        
                        <Link to={`/press/${pr.slug}`} className="block bg-card rounded-xl p-5 shadow-lg border border-border hover:border-orange-500/30 hover:shadow-orange-500/10 transition-all group">
                          {pr.published_at && <div className="flex items-center gap-2 text-xs text-orange-500 font-medium mb-2">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {new Date(pr.published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                              </span>
                            </div>}
                          <h4 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors line-clamp-2">
                            {getLocalizedTitle(pr)}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                            <span>{t('common.readMore')}</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </Link>
                      </motion.div>)}
                  </div>
                </div>}

              {/* Corporate Info Card */}
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} className="mt-8 bg-gradient-to-br from-muted/80 to-muted/40 rounded-2xl p-6 border border-border">
                <h4 className="font-bold text-lg mb-3">{t('media.pressContact')}</h4>
                <p className="text-sm text-muted-foreground mb-4">{t('media.pressContactDesc')}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('media.pressEmail')}:</span>
                    <a href="mailto:press@iasofthub.com" className="text-primary hover:underline">press@iasofthub.com</a>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                  <Link to="/contact">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('media.contactPress')}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="py-24">
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
            <Calendar className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="mb-4">{t('media.events')}</h2>
            <div className="section-divider mx-auto mb-6" />
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('media.eventsDesc')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {events.map((event, index) => <motion.div key={event.name} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.1
          }} className="bg-card rounded-2xl p-6 shadow-lg border border-border text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-4">
                  <span className="text-xs font-medium text-primary">{event.type}</span>
                </div>
                <h3 className="font-bold mb-2">{event.name}</h3>
                <p className="text-muted-foreground mb-1">{event.location}</p>
                <p className="text-sm text-primary font-medium">{event.date}</p>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Partner CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-secondary text-white">
        <div className="container-wide text-center">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }}>
            <Factory className="h-16 w-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-white mb-6">{t('media.strategicPartner')}</h2>
            <p className="text-xl text-white/80 mb-4 max-w-3xl mx-auto">
              {t('media.partnerDesc')}
            </p>
            <p className="text-white/60 mb-8">
              Zhangjiagang City, Jiangsu Province, P.R. China
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg">
                <a href="https://www.topsrecycling.com" target="_blank" rel="noopener noreferrer">
                  {t('media.visitPartner')}
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button asChild size="lg" className="bg-white/20 text-white border border-white/30 hover:bg-white/30 font-semibold">
                <Link to="/contact">
                  {t('solutions.requestQuote')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lightbox for Gallery */}
      <AnimatePresence>
        {selectedImage !== null && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2" onClick={closeLightbox}>
              <X className="h-8 w-8" />
            </button>
            
            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full" onClick={e => {
          e.stopPropagation();
          prevImage();
        }}>
              <ChevronLeft className="h-8 w-8" />
            </button>
            
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full" onClick={e => {
          e.stopPropagation();
          nextImage();
        }}>
              <ChevronRight className="h-8 w-8" />
            </button>

            <motion.div key={selectedImage} initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.9
        }} className="max-w-5xl max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
              <div className="max-w-full max-h-[80vh] rounded-lg overflow-hidden">
                <WatermarkImage src={galleryImages[selectedImage].src} alt={galleryImages[selectedImage].title} className="max-w-full max-h-[80vh] object-contain" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                <h3 className="text-white text-xl font-bold">{galleryImages[selectedImage].title}</h3>
                <p className="text-white/80">{galleryImages[selectedImage].description}</p>
                <p className="text-white/50 text-sm mt-2">{selectedImage + 1} / {galleryImages.length}</p>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>

      <Footer />
    </div>;
}