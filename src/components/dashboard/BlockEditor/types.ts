// ─── Block Editor Types ───

export type BlockType = 
  | 'hero' | 'benefits' | 'features' | 'pricing' | 'testimonials' 
  | 'faq' | 'cta' | 'video' | 'text' | 'image' | 'guarantee' 
  | 'countdown' | 'divider' | 'spacer';

export interface Block {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  content: any;
  settings?: Record<string, any>;
}

export interface BlockTemplate {
  name: string;
  description: string;
  icon: string;
  defaultContent: any;
}

export const BLOCK_TEMPLATES: Record<BlockType, BlockTemplate> = {
  hero: {
    name: 'Hero',
    description: 'Seção principal com título e chamada',
    icon: 'Layout',
    defaultContent: {
      headline: '',
      subheadline: '',
      cta_text: 'COMPRAR AGORA',
      backgroundImage: '',
      overlayOpacity: 50,
      alignment: 'center',
      background_style: 'gradient',
    },
  },
  benefits: {
    name: 'Benefícios',
    description: 'Lista de benefícios do produto',
    icon: 'CheckCircle',
    defaultContent: {
      title: 'Por que escolher?',
      subtitle: '',
      items: [],
      columns: 3,
    },
  },
  features: {
    name: 'Funcionalidades',
    description: 'Lista de funcionalidades incluídas',
    icon: 'Star',
    defaultContent: {
      title: 'O que está incluído',
      items: [],
    },
  },
  pricing: {
    name: 'Preço',
    description: 'Seção de preço e compra',
    icon: 'DollarSign',
    defaultContent: {
      highlightText: 'OFERTA ESPECIAL',
      showOriginalPrice: true,
      showDiscount: true,
      showInstallments: true,
    },
  },
  testimonials: {
    name: 'Depoimentos',
    description: 'Depoimentos de clientes',
    icon: 'Users',
    defaultContent: {
      title: 'O que dizem nossos clientes',
      items: [],
      layout: 'grid',
    },
  },
  faq: {
    name: 'FAQ',
    description: 'Perguntas frequentes',
    icon: 'HelpCircle',
    defaultContent: {
      title: 'Perguntas Frequentes',
      items: [],
    },
  },
  cta: {
    name: 'Call to Action',
    description: 'Botão de ação',
    icon: 'MousePointer',
    defaultContent: {
      text: 'Não perca essa oportunidade!',
      subtext: '',
      buttonText: 'COMPRAR AGORA',
      style: 'default',
    },
  },
  video: {
    name: 'Vídeo',
    description: 'Vídeo de apresentação',
    icon: 'Play',
    defaultContent: {
      url: '',
      title: '',
    },
  },
  text: {
    name: 'Texto',
    description: 'Bloco de texto livre',
    icon: 'Type',
    defaultContent: {
      text: '',
      alignment: 'left',
      size: 'medium',
    },
  },
  image: {
    name: 'Imagem',
    description: 'Imagem com legenda',
    icon: 'Image',
    defaultContent: {
      url: '',
      alt: '',
      caption: '',
      fullWidth: false,
    },
  },
  guarantee: {
    name: 'Garantia',
    description: 'Selo de garantia',
    icon: 'Shield',
    defaultContent: {
      title: 'Garantia Incondicional',
      text: 'Se não ficar satisfeito, devolvemos 100% do seu dinheiro.',
      days: 7,
    },
  },
  countdown: {
    name: 'Countdown',
    description: 'Temporizador de urgência',
    icon: 'Clock',
    defaultContent: {
      title: 'Oferta por tempo limitado!',
      endDate: '',
      style: 'boxed',
    },
  },
  divider: {
    name: 'Divisor',
    description: 'Linha divisória',
    icon: 'Minus',
    defaultContent: {
      style: 'line',
    },
  },
  spacer: {
    name: 'Espaço',
    description: 'Espaçamento vertical',
    icon: 'MoveVertical',
    defaultContent: {
      height: 'medium',
    },
  },
};
