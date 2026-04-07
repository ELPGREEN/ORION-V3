import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Save, Eye, EyeOff, Undo, Redo, Loader2,
  Layout, Star, CheckCircle, Users, HelpCircle, DollarSign,
  Play, Type, Image, MousePointer, Shield, Clock, Minus, MoveVertical,
  ExternalLink, Settings2, Monitor, Smartphone, Tablet,
  Copy, Trash2, GripVertical, ChevronDown, ChevronUp, Layers,
  RefreshCw, PanelLeftClose, PanelLeft, Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Block, BlockType, BLOCK_TEMPLATES } from './BlockEditor/types';
import { BlockSettings } from './BlockEditor/BlockSettings';
import { createBlock, getDefaultLayout } from './BlockEditor/blockFactory';
import { toast } from 'sonner';

// ============= Preview Button Component =============
function PreviewButton({ productId }: { productId?: string }) {
  const { data: product } = useQuery({
    queryKey: ['product-slug', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data } = await supabase
        .from('products')
        .select('slug, status')
        .eq('id', productId)
        .maybeSingle();
      return data;
    },
    enabled: !!productId,
    staleTime: 60000,
  });

  if (!productId || !product?.slug) return null;

  // Use preview route for draft products, regular route for published
  const previewUrl = product.status === 'published' 
    ? `/produto/${product.slug}` 
    : `/preview/${product.slug}`;

  return (
    <Button variant="outline" size="sm" asChild className="gap-2">
      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4" />
        {product.status === 'published' ? 'Ver Página' : 'Preview'}
      </a>
    </Button>
  );
}

// ============= TIPOS E CONSTANTES =============

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type EditorState = 'editing' | 'preview' | 'syncing';
type LayoutCategory = 'digital_products' | 'courses' | 'funnels';

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: LayoutCategory;
  blocks: BlockType[];
  style: {
    heroStyle: 'gradient' | 'image' | 'video' | 'split';
    colorScheme: 'dark' | 'light' | 'vibrant';
    animation: boolean;
  };
}

// Modern 2025/2026 Layout Templates
const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  // ========== PRODUTOS DIGITAIS ==========
  {
    id: 'digital_neomorphic',
    name: 'Neomórfico 2025',
    description: 'Design com sombras suaves e bordas arredondadas, tendência 2025',
    icon: Layout,
    category: 'digital_products',
    blocks: ['hero', 'video', 'benefits', 'features', 'pricing', 'testimonials', 'guarantee', 'faq', 'cta'],
    style: { heroStyle: 'gradient', colorScheme: 'light', animation: true }
  },
  {
    id: 'digital_dark_premium',
    name: 'Dark Premium',
    description: 'Visual escuro luxuoso com acentos dourados, alta conversão',
    icon: Star,
    category: 'digital_products',
    blocks: ['hero', 'countdown', 'benefits', 'video', 'features', 'pricing', 'testimonials', 'guarantee', 'cta'],
    style: { heroStyle: 'image', colorScheme: 'dark', animation: true }
  },
  {
    id: 'digital_minimalist',
    name: 'Minimalista Tech',
    description: 'Clean e moderno, foco em conteúdo e conversão rápida',
    icon: Minus,
    category: 'digital_products',
    blocks: ['hero', 'benefits', 'pricing', 'testimonials', 'cta'],
    style: { heroStyle: 'gradient', colorScheme: 'light', animation: false }
  },
  {
    id: 'digital_glassmorphism',
    name: 'Glassmorphism 2026',
    description: 'Efeito vidro translúcido, ultra moderno',
    icon: Layers,
    category: 'digital_products',
    blocks: ['hero', 'video', 'features', 'benefits', 'pricing', 'testimonials', 'faq', 'cta'],
    style: { heroStyle: 'image', colorScheme: 'vibrant', animation: true }
  },
  // ========== CURSOS ==========
  {
    id: 'course_immersive',
    name: 'Imersivo Educacional',
    description: 'Layout completo para cursos com módulos e certificação',
    icon: Play,
    category: 'courses',
    blocks: ['hero', 'video', 'benefits', 'features', 'text', 'pricing', 'testimonials', 'guarantee', 'faq', 'cta'],
    style: { heroStyle: 'video', colorScheme: 'dark', animation: true }
  },
  {
    id: 'course_professional',
    name: 'Profissional Academy',
    description: 'Visual corporativo para cursos profissionalizantes',
    icon: CheckCircle,
    category: 'courses',
    blocks: ['hero', 'features', 'video', 'benefits', 'pricing', 'testimonials', 'guarantee', 'faq', 'cta'],
    style: { heroStyle: 'split', colorScheme: 'light', animation: false }
  },
  {
    id: 'course_creator',
    name: 'Creator Studio',
    description: 'Para criadores de conteúdo, visual dinâmico e engajador',
    icon: Users,
    category: 'courses',
    blocks: ['hero', 'countdown', 'video', 'benefits', 'testimonials', 'features', 'pricing', 'guarantee', 'cta'],
    style: { heroStyle: 'image', colorScheme: 'vibrant', animation: true }
  },
  {
    id: 'course_masterclass',
    name: 'Masterclass Premium',
    description: 'Luxuoso para cursos de alto ticket, converte premium',
    icon: DollarSign,
    category: 'courses',
    blocks: ['hero', 'video', 'text', 'benefits', 'features', 'testimonials', 'pricing', 'guarantee', 'faq', 'cta'],
    style: { heroStyle: 'video', colorScheme: 'dark', animation: true }
  },
  // ========== FUNIS DE VENDA ==========
  {
    id: 'funnel_urgency',
    name: 'Funil Urgência 2025',
    description: 'Escassez + countdown, alta conversão para lançamentos',
    icon: Clock,
    category: 'funnels',
    blocks: ['hero', 'countdown', 'video', 'benefits', 'testimonials', 'pricing', 'countdown', 'guarantee', 'cta'],
    style: { heroStyle: 'gradient', colorScheme: 'dark', animation: true }
  },
  {
    id: 'funnel_vsl',
    name: 'VSL Funil',
    description: 'Vídeo de vendas + CTA direto, otimizado para conversão',
    icon: Play,
    category: 'funnels',
    blocks: ['hero', 'video', 'cta', 'benefits', 'testimonials', 'pricing', 'guarantee', 'cta'],
    style: { heroStyle: 'video', colorScheme: 'dark', animation: true }
  },
  {
    id: 'funnel_tripwire',
    name: 'Tripwire Funil',
    description: 'Oferta irresistível, perfeito para produtos de entrada',
    icon: DollarSign,
    category: 'funnels',
    blocks: ['hero', 'countdown', 'pricing', 'benefits', 'guarantee', 'testimonials', 'cta'],
    style: { heroStyle: 'gradient', colorScheme: 'vibrant', animation: true }
  },
  {
    id: 'funnel_webinar',
    name: 'Webinar Funil 2026',
    description: 'Pós-webinar, aquecido para converter na hora',
    icon: Users,
    category: 'funnels',
    blocks: ['hero', 'video', 'countdown', 'benefits', 'features', 'pricing', 'testimonials', 'guarantee', 'faq', 'cta'],
    style: { heroStyle: 'video', colorScheme: 'dark', animation: true }
  },
];

const LAYOUT_CATEGORIES: Record<LayoutCategory, { name: string; description: string; icon: React.ElementType }> = {
  digital_products: {
    name: 'Produtos Digitais',
    description: 'E-books, softwares, templates, ferramentas',
    icon: Layout
  },
  courses: {
    name: 'Cursos Online',
    description: 'Cursos, mentorias, treinamentos',
    icon: Play
  },
  funnels: {
    name: 'Funis de Venda',
    description: 'Lançamentos, VSL, webinars, tripwire',
    icon: MousePointer
  }
};

interface AdvancedProductEditorProps {
  productId?: string;
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  productOriginalPrice?: number | null;
  productImage?: string;
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
  isLoading?: boolean;
  onSwitchToSimple?: () => void;
  canSwitchEditor?: boolean;
}

const BLOCK_CATEGORIES = {
  essenciais: { 
    label: 'Essenciais',
    icon: Star,
    blocks: ['hero', 'pricing', 'cta'] as BlockType[]
  },
  conteudo: {
    label: 'Conteúdo',
    icon: Type,
    blocks: ['text', 'image', 'video'] as BlockType[]
  },
  conversao: {
    label: 'Conversão',
    icon: DollarSign,
    blocks: ['benefits', 'features', 'guarantee', 'countdown'] as BlockType[]
  },
  social: {
    label: 'Prova Social',
    icon: Users,
    blocks: ['testimonials', 'faq'] as BlockType[]
  },
  layout: {
    label: 'Layout',
    icon: Layout,
    blocks: ['divider', 'spacer'] as BlockType[]
  },
};

const ICONS: Record<string, React.ElementType> = {
  Layout, Star, CheckCircle, Users, HelpCircle, DollarSign,
  Play, Type, Image, MousePointer, Shield, Clock, Minus, MoveVertical, Layers
};

const VIEW_WIDTHS: Record<ViewMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px'
};

// ============= UTILITÁRIOS =============

function getEmbedUrl(url: string): string {
  if (!url) return '';
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}

// ============= COMPONENTE PRINCIPAL =============

export function AdvancedProductEditor({
  productId,
  productName = '',
  productDescription = '',
  productPrice = 0,
  productOriginalPrice = null,
  productImage = '',
  initialBlocks,
  onSave,
  isLoading: externalLoading,
  onSwitchToSimple,
  canSwitchEditor = true,
}: AdvancedProductEditorProps) {
  
  // ============= ESTADO =============
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [history, setHistory] = useState<Block[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [editorState, setEditorState] = useState<EditorState>('editing');
  const [showBlockPanel, setShowBlockPanel] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<string>('digital_neomorphic');
  
  const previewRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<Block[]>([]);

  // ============= INICIALIZAÇÃO =============
  
  useEffect(() => {
    if (!isInitialized) {
      const initial = initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length > 0
        ? [...initialBlocks] as Block[]
        : getDefaultLayout(productName, productDescription);
      
      setBlocks(initial);
      blocksRef.current = initial;
      setHistory([initial]);
      setHistoryIndex(0);
      setIsInitialized(true);
      console.log('[AdvancedEditor] Initialized with', initial.length, 'blocks');
    }
  }, [initialBlocks, productName, productDescription, isInitialized]);

  // Atualizar quando initialBlocks mudar (após reload externo)
  useEffect(() => {
    if (isInitialized && initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length > 0) {
      const blocksChanged = JSON.stringify(initialBlocks) !== JSON.stringify(blocksRef.current);
      if (blocksChanged) {
        console.log('[AdvancedEditor] External blocks update detected');
        setBlocks([...initialBlocks] as Block[]);
        blocksRef.current = [...initialBlocks] as Block[];
      }
    }
  }, [initialBlocks, isInitialized]);

  const selectedBlock = useMemo(() => 
    blocks.find(b => b.id === selectedBlockId), 
    [blocks, selectedBlockId]
  );

  // ============= GERENCIAMENTO DE HISTÓRICO =============
  
  const pushHistory = useCallback((newBlocks: Block[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newBlocks]);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks([...history[newIndex]]);
      blocksRef.current = [...history[newIndex]];
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks([...history[newIndex]]);
      blocksRef.current = [...history[newIndex]];
    }
  }, [historyIndex, history]);

  // ============= ATALHOS DE TECLADO =============
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Delete' && selectedBlockId && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        deleteBlock(selectedBlockId);
      }
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, selectedBlockId, undo, redo]);

  // ============= OPERAÇÕES DE BLOCOS =============
  
  const updateBlocks = useCallback((newBlocks: Block[], pushToHistory = true) => {
    const sortedBlocks = [...newBlocks].sort((a, b) => a.order - b.order);
    setBlocks(sortedBlocks);
    blocksRef.current = sortedBlocks;
    if (pushToHistory) {
      pushHistory(sortedBlocks);
    }
  }, [pushHistory]);

  const addBlock = useCallback((type: BlockType, afterId?: string) => {
    const insertIndex = afterId 
      ? blocks.findIndex(b => b.id === afterId) + 1 
      : blocks.length;
    
    const newBlock = createBlock(type, insertIndex);
    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, newBlock);
    newBlocks.forEach((b, i) => b.order = i);
    
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    toast.success(`Bloco "${BLOCK_TEMPLATES[type].name}" adicionado`);
  }, [blocks, updateBlocks]);

  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    ) as Block[];
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const deleteBlock = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    const newBlocks = blocks.filter(b => b.id !== blockId);
    newBlocks.forEach((b, i) => b.order = i);
    updateBlocks(newBlocks);
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    if (block) toast.success(`Bloco "${BLOCK_TEMPLATES[block.type].name}" removido`);
  }, [blocks, selectedBlockId, updateBlocks]);

  const duplicateBlock = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;
    
    const block = blocks[blockIndex];
    const newBlock: Block = {
      ...JSON.parse(JSON.stringify(block)),
      id: crypto.randomUUID(),
      order: blockIndex + 1,
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    newBlocks.forEach((b, i) => b.order = i);
    
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    toast.success('Bloco duplicado');
  }, [blocks, updateBlocks]);

  const toggleVisibility = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      updateBlock(blockId, { visible: !block.visible });
    }
  }, [blocks, updateBlock]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    newBlocks.forEach((b, i) => b.order = i);
    
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const handleReorder = useCallback((newOrder: Block[]) => {
    newOrder.forEach((block, index) => block.order = index);
    updateBlocks([...newOrder]);
  }, [updateBlocks]);

  // ============= SINCRONIZAÇÃO E SALVAMENTO =============
  
  // CRITICAL FIX: Update blocksRef whenever blocks change
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  
  const handleSync = useCallback(async () => {
    setEditorState('syncing');
    try {
      // CRITICAL: Use blocksRef to get latest blocks state
      const currentBlocks = blocksRef.current;
      
      if (onSave) {
        console.log('[AdvancedEditor] Syncing', currentBlocks.length, 'blocks');
        await onSave(currentBlocks);
        setLastSyncTime(new Date());
        toast.success('Sincronizado com sucesso!');
      }
    } catch (error: any) {
      console.error('[AdvancedEditor] Sync error:', error);
      toast.error('Erro ao sincronizar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setEditorState('editing');
    }
  }, [onSave]);

  const handleSave = useCallback(async () => {
    if (!onSave) {
      toast.error('Função de salvamento não configurada');
      return;
    }
    
    // CRITICAL: Use blocksRef to get latest blocks state
    const currentBlocks = blocksRef.current;
    
    setIsSaving(true);
    setSaveSuccess(false);
    setEditorState('syncing');
    console.log('[AdvancedEditor] Saving', currentBlocks.length, 'blocks');
    console.log('[AdvancedEditor] Blocks content preview:', JSON.stringify(currentBlocks).substring(0, 300));
    
    try {
      await onSave(currentBlocks);
      setLastSyncTime(new Date());
      setSaveSuccess(true);
      // Show success indicator for 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('[AdvancedEditor] Save error:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
      setEditorState('editing');
    }
  }, [onSave]);

  const applyLayoutTemplate = useCallback((templateId: string) => {
    const template = LAYOUT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    // Generate blocks based on template
    const baseBlocks: Block[] = [];
    let order = 0;
    
    for (const blockType of template.blocks) {
      const block = createBlock(blockType, order++);
      
      // Apply template style to hero block
      if (blockType === 'hero') {
        (block as any).content = {
          headline: productName || 'Seu Produto Incrível',
          subheadline: productDescription || 'Descrição do seu produto aqui',
          cta_text: template.category === 'courses' ? 'COMEÇAR AGORA' : 'COMPRAR AGORA',
          background_style: template.style.heroStyle,
        };
        (block as any).settings = {
          ...((block as any).settings || {}),
          colorScheme: template.style.colorScheme,
          animation: template.style.animation,
        };
      }
      
      baseBlocks.push(block);
    }
    
    updateBlocks(baseBlocks);
    setCurrentLayoutId(templateId);
    setSelectedBlockId(null);
    toast.success(`Layout "${template.name}" aplicado com sucesso!`);
  }, [productName, productDescription, updateBlocks]);

  const resetToDefault = useCallback(() => {
    const defaultBlocks = getDefaultLayout(productName, productDescription);
    updateBlocks(defaultBlocks);
    setSelectedBlockId(null);
    setCurrentLayoutId('digital_neomorphic');
    toast.success('Layout restaurado ao padrão');
  }, [productName, productDescription, updateBlocks]);

  // ============= AUTO-SAVE =============
  const previousBlocksRef = useRef<string>('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save after 5 seconds of inactivity
  useEffect(() => {
    if (!isInitialized || !onSave) return;

    const currentBlocksJson = JSON.stringify(blocks);
    
    // Skip if blocks haven't changed
    if (currentBlocksJson === previousBlocksRef.current) return;
    
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule auto-save after 5 seconds of no changes
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Double-check blocks changed
      if (currentBlocksJson !== previousBlocksRef.current && blocks.length > 0) {
        console.log('[AdvancedEditor] Auto-saving...');
        previousBlocksRef.current = currentBlocksJson;
        
        try {
          await onSave(blocks);
          setLastSyncTime(new Date());
          console.log('[AdvancedEditor] Auto-save complete');
        } catch (error) {
          console.error('[AdvancedEditor] Auto-save failed:', error);
        }
      }
    }, 5000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [blocks, isInitialized, onSave]);

  // ============= CONTROLES DE VISUALIZAÇÃO =============
  
  const togglePreview = useCallback(() => {
    const isCurrentlyPreview = editorState === 'preview';
    setEditorState(isCurrentlyPreview ? 'editing' : 'preview');
    setShowBlockPanel(isCurrentlyPreview);
    setShowSettingsPanel(isCurrentlyPreview);
    console.log('[AdvancedEditor] Preview mode:', !isCurrentlyPreview);
  }, [editorState]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // Ajusta zoom automaticamente para mobile/tablet
    if (mode === 'mobile' && zoom > 100) {
      setZoom(100);
    } else if (mode === 'tablet' && zoom > 120) {
      setZoom(100);
    }
    console.log('[AdvancedEditor] View mode changed to:', mode);
  }, [zoom]);

  const handleZoomChange = useCallback((newZoom: number[]) => {
    setZoom(newZoom[0]);
  }, []);

  // ============= RENDERIZAÇÃO =============

  if (externalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando editor...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-180px)] bg-background rounded-xl border shadow-sm overflow-hidden">
        {/* ============= TOOLBAR PRINCIPAL - LINHA 1 ============= */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-muted/50 to-background">
          {/* Controles da esquerda */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowBlockPanel(!showBlockPanel)}
                  className={cn(!showBlockPanel && "text-muted-foreground")}
                >
                  {showBlockPanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showBlockPanel ? 'Ocultar blocos' : 'Mostrar blocos'}</TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refazer (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Badge variant="secondary" className="font-mono text-xs">
              {blocks.length} blocos
            </Badge>
            
            {lastSyncTime && (
              <span className="text-xs text-muted-foreground">
                Salvo: {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Controles da direita */}
          <div className="flex items-center gap-2">
            {/* Switch to Simple Editor */}
            {canSwitchEditor && onSwitchToSimple && (
              <Button variant="ghost" size="sm" onClick={onSwitchToSimple} className="gap-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editor Simples</span>
              </Button>
            )}
            
            <Separator orientation="vertical" className="h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSync}
                  disabled={editorState === 'syncing'}
                >
                  <RefreshCw className={cn("w-4 h-4", editorState === 'syncing' && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sincronizar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={editorState === 'preview' ? 'default' : 'ghost'} 
                  size="icon" 
                  onClick={togglePreview}
                >
                  {editorState === 'preview' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{editorState === 'preview' ? 'Sair do Preview' : 'Visualizar'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={resetToDefault}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restaurar padrão</TooltipContent>
            </Tooltip>

            {/* Preview Link - Precisa buscar o slug do produto */}
            <PreviewButton productId={productId} />

            {/* Save Button with Success Indicator */}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || editorState === 'syncing'} 
              className={cn(
                "gap-2 min-w-[120px] transition-all",
                saveSuccess && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* ============= TOOLBAR SECUNDÁRIA - LAYOUTS E VISUALIZAÇÃO ============= */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          {/* Layouts Prontos - DESTACADO */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Layout:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[200px] justify-between bg-background hover:bg-primary/5 border-primary/30">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {LAYOUT_TEMPLATES.find(t => t.id === currentLayoutId)?.name || 'Escolher Layout'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-96 max-h-[500px] overflow-y-auto">
                {/* Header */}
                <div className="px-3 py-2 bg-primary/5 border-b">
                  <p className="text-sm font-semibold text-primary">🎨 Layouts Modernos 2025/2026</p>
                  <p className="text-xs text-muted-foreground">Escolha um layout pronto para começar</p>
                </div>
                
                {/* Produtos Digitais */}
                <div className="px-3 py-2 mt-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Layout className="w-4 h-4" />
                    {LAYOUT_CATEGORIES.digital_products.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {LAYOUT_CATEGORIES.digital_products.description}
                  </p>
                </div>
                {LAYOUT_TEMPLATES.filter(t => t.category === 'digital_products').map((template) => {
                  const IconComp = template.icon;
                  return (
                    <DropdownMenuItem 
                      key={template.id}
                      onClick={() => applyLayoutTemplate(template.id)}
                      className={cn(
                        "gap-3 cursor-pointer mx-2 rounded-lg p-3", 
                        currentLayoutId === template.id && "bg-primary/10 border border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        currentLayoutId === template.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.style.colorScheme}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.blocks.length} blocos
                          </Badge>
                        </div>
                      </div>
                      {currentLayoutId === template.id && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                
                <DropdownMenuSeparator className="my-2" />
                
                {/* Cursos */}
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Play className="w-4 h-4" />
                    {LAYOUT_CATEGORIES.courses.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {LAYOUT_CATEGORIES.courses.description}
                  </p>
                </div>
                {LAYOUT_TEMPLATES.filter(t => t.category === 'courses').map((template) => {
                  const IconComp = template.icon;
                  return (
                    <DropdownMenuItem 
                      key={template.id}
                      onClick={() => applyLayoutTemplate(template.id)}
                      className={cn(
                        "gap-3 cursor-pointer mx-2 rounded-lg p-3", 
                        currentLayoutId === template.id && "bg-primary/10 border border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        currentLayoutId === template.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.style.colorScheme}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.blocks.length} blocos
                          </Badge>
                        </div>
                      </div>
                      {currentLayoutId === template.id && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                
                <DropdownMenuSeparator className="my-2" />
                
                {/* Funis de Venda */}
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <MousePointer className="w-4 h-4" />
                    {LAYOUT_CATEGORIES.funnels.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {LAYOUT_CATEGORIES.funnels.description}
                  </p>
                </div>
                {LAYOUT_TEMPLATES.filter(t => t.category === 'funnels').map((template) => {
                  const IconComp = template.icon;
                  return (
                    <DropdownMenuItem 
                      key={template.id}
                      onClick={() => applyLayoutTemplate(template.id)}
                      className={cn(
                        "gap-3 cursor-pointer mx-2 rounded-lg p-3", 
                        currentLayoutId === template.id && "bg-primary/10 border border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        currentLayoutId === template.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.style.colorScheme}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.blocks.length} blocos
                          </Badge>
                        </div>
                      </div>
                      {currentLayoutId === template.id && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Controles de Visualização - Centralizados */}
          <div className="flex items-center gap-4">
            {/* Modo de Visualização */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Dispositivo:</span>
              <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
                {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map((mode) => {
                  const IconComponent = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
                  const modeLabels = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };
                  const modeWidths = { desktop: '1920px', tablet: '768px', mobile: '375px' };
                  return (
                    <Tooltip key={mode}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === mode ? 'default' : 'ghost'}
                          size="sm"
                          className={cn(
                            "h-8 px-3 gap-1.5 transition-all", 
                            viewMode === mode && "shadow-sm bg-primary text-primary-foreground"
                          )}
                          onClick={() => handleViewModeChange(mode)}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="hidden md:inline text-xs">{modeLabels[mode]}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{modeLabels[mode]} ({modeWidths[mode]})</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Controle de Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Zoom:</span>
              <div className="flex items-center gap-2 min-w-[160px]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={50}
                  max={150}
                  step={10}
                  className="w-24"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Badge variant="secondary" className="text-xs min-w-[45px] justify-center">
                  {zoom}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Indicador de Layout Atual */}
          <div className="flex items-center gap-2">
            {currentLayoutId && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-background">
                <span className="text-xs text-muted-foreground">Usando:</span>
                <span className="font-medium text-xs">
                  {LAYOUT_TEMPLATES.find(t => t.id === currentLayoutId)?.name}
                </span>
              </Badge>
            )}
          </div>
        </div>

        {/* ============= ÁREA DE TRABALHO ============= */}
        <div className="flex flex-1 overflow-hidden">
          {/* Painel de Blocos - Esquerda */}
          <AnimatePresence mode="wait">
            {showBlockPanel && editorState !== 'preview' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="border-r flex flex-col bg-muted/20 overflow-hidden"
              >
                <div className="p-3 border-b bg-background/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-full gap-2 shadow-sm" size="sm">
                        <Plus className="w-4 h-4" />
                        Adicionar Bloco
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="start">
                      {Object.entries(BLOCK_CATEGORIES).map(([key, category]) => (
                        <DropdownMenuSub key={key}>
                          <DropdownMenuSubTrigger className="gap-2">
                            <category.icon className="w-4 h-4" />
                            {category.label}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-56">
                            {category.blocks.map(type => {
                              const template = BLOCK_TEMPLATES[type];
                              const Icon = ICONS[template.icon] || Layout;
                              return (
                                <DropdownMenuItem 
                                  key={type} 
                                  onClick={() => addBlock(type)}
                                  className="gap-2"
                                >
                                  <Icon className="w-4 h-4 text-primary" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{template.name}</span>
                                    <span className="text-xs text-muted-foreground">{template.description}</span>
                                  </div>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    <Reorder.Group
                      axis="y"
                      values={blocks}
                      onReorder={handleReorder}
                      className="space-y-1"
                    >
                      <AnimatePresence mode="popLayout">
                        {blocks.sort((a, b) => a.order - b.order).map((block, index) => {
                          const template = BLOCK_TEMPLATES[block.type];
                          const Icon = ICONS[template.icon] || Layout;
                          
                          return (
                            <Reorder.Item key={block.id} value={block}>
                              <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                  "group flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-150",
                                  selectedBlockId === block.id 
                                    ? "border-primary bg-primary/10 shadow-sm" 
                                    : "border-transparent hover:border-border hover:bg-muted/50",
                                  !block.visible && "opacity-40"
                                )}
                                onClick={() => setSelectedBlockId(block.id)}
                              >
                                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                
                                <div className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  selectedBlockId === block.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{template.name}</p>
                                </div>

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                                    disabled={index === 0}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                                    disabled={index === blocks.length - 1}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); toggleVisibility(block.id); }}
                                  >
                                    {block.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            </Reorder.Item>
                          );
                        })}
                      </AnimatePresence>
                    </Reorder.Group>
                    
                    {blocks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Layers className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Adicione blocos para criar sua página
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview Central */}
          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-6">
            <motion.div 
              ref={previewRef}
              className="transition-all duration-300 ease-out"
              initial={false}
              animate={{
                width: viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px',
                scale: zoom / 100
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ 
                maxWidth: viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px',
                transformOrigin: 'top center'
              }}
            >
              <motion.div 
                className={cn(
                  "bg-background shadow-2xl overflow-hidden transition-all duration-300",
                  viewMode === 'desktop' && "rounded-lg border",
                  viewMode === 'mobile' && "rounded-[2.5rem] border-[14px] border-zinc-900",
                  viewMode === 'tablet' && "rounded-[1.5rem] border-[10px] border-zinc-800"
                )}
                layout
              >
                {/* Notch do Mobile - iPhone Style */}
                {viewMode === 'mobile' && (
                  <div className="h-10 bg-zinc-900 flex items-center justify-center relative">
                    <div className="absolute left-4 text-xs text-white/60 font-medium">9:41</div>
                    <div className="w-28 h-7 bg-black rounded-b-2xl flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700" />
                    </div>
                    <div className="absolute right-4 flex gap-1 items-center">
                      <div className="w-4 h-2.5 border border-white/60 rounded-sm">
                        <div className="w-3/4 h-full bg-white/60 rounded-sm" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Camera do Tablet - iPad Style */}
                {viewMode === 'tablet' && (
                  <div className="h-6 bg-zinc-800 flex items-center justify-center relative">
                    <div className="w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600" />
                  </div>
                )}
                
                <ScrollArea 
                  className={cn(
                    "bg-background",
                    viewMode === 'mobile' && "h-[580px]",
                    viewMode === 'tablet' && "h-[680px]",
                    viewMode === 'desktop' && "max-h-[calc(100vh-320px)]"
                  )}
                >
                  <LivePreview 
                    blocks={blocks} 
                    productName={productName}
                    productDescription={productDescription}
                    productPrice={productPrice}
                    productOriginalPrice={productOriginalPrice}
                    productImage={productImage}
                    selectedBlockId={editorState === 'preview' ? null : selectedBlockId}
                    onSelectBlock={editorState === 'preview' ? undefined : setSelectedBlockId}
                    viewMode={viewMode}
                    isPreviewMode={editorState === 'preview'}
                  />
                </ScrollArea>
                
                {/* Home Indicator do Mobile */}
                {viewMode === 'mobile' && (
                  <div className="h-8 bg-background flex items-end justify-center pb-2">
                    <div className="w-32 h-1 bg-foreground/30 rounded-full" />
                  </div>
                )}
                
                {/* Home Button do Tablet */}
                {viewMode === 'tablet' && (
                  <div className="h-4 bg-background flex items-center justify-center">
                    <div className="w-16 h-1 bg-foreground/20 rounded-full" />
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* Painel de Configurações - Direita */}
          <AnimatePresence mode="wait">
            {showSettingsPanel && editorState !== 'preview' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="border-l overflow-hidden flex flex-col bg-background"
              >
                <div className="p-3 border-b flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">
                    {selectedBlock ? BLOCK_TEMPLATES[selectedBlock.type].name : 'Configurações'}
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {selectedBlock ? (
                      <BlockSettings
                        block={selectedBlock}
                        onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Layers className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">Nenhum bloco selecionado</h4>
                        <p className="text-sm text-muted-foreground max-w-[220px]">
                          Clique em um bloco na lista ou no preview para editar suas configurações.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============= COMPONENTE DE PREVIEW =============

interface LivePreviewProps {
  blocks: Block[];
  productName: string;
  productDescription: string;
  productPrice: number;
  productOriginalPrice: number | null;
  productImage: string;
  selectedBlockId: string | null;
  onSelectBlock?: (id: string) => void;
  viewMode: ViewMode;
  isPreviewMode?: boolean;
}

function LivePreview({ 
  blocks, 
  productName,
  productDescription,
  productPrice,
  productOriginalPrice,
  productImage,
  selectedBlockId,
  onSelectBlock,
  viewMode,
  isPreviewMode = false
}: LivePreviewProps) {
  
  const isMobile = viewMode === 'mobile';
  const isTablet = viewMode === 'tablet';
  
  const renderBlock = useCallback((block: Block) => {
    if (!block.visible) return null;

    const isSelected = selectedBlockId === block.id && !isPreviewMode;
    
    const wrapperClass = cn(
      "relative transition-all duration-200",
      !isPreviewMode && "group cursor-pointer hover:bg-primary/5",
      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
    );

    const content = (() => {
      switch (block.type) {
        case 'hero':
          return (
            <div 
              className={cn("relative py-12 px-4 text-center bg-gradient-to-br from-primary/10 to-primary/5", isMobile && "py-8")}
              style={{ 
                backgroundImage: block.content.backgroundImage ? `url(${block.content.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {block.content.backgroundImage && (
                <div className="absolute inset-0 bg-black" style={{ opacity: block.content.overlayOpacity / 100 }} />
              )}
              <div className={cn(
                "relative z-10",
                block.content.alignment === 'left' && "text-left",
                block.content.alignment === 'right' && "text-right"
              )}>
                <h1 className={cn("font-bold mb-4", isMobile ? "text-2xl" : "text-3xl md:text-4xl")}>
                  {block.content.headline || productName || 'Seu Título Aqui'}
                </h1>
                <p className={cn("text-muted-foreground max-w-2xl mx-auto", isMobile ? "text-base" : "text-lg")}>
                  {block.content.subheadline || productDescription || 'Descrição do seu produto'}
                </p>
              </div>
            </div>
          );

        case 'benefits':
          const benefitsCols = isMobile ? 1 : isTablet ? 2 : Math.min(block.content.columns || 3, 4);
          return (
            <div className={cn("py-10 px-4", isMobile && "py-6 px-3")}>
              <h2 className={cn("font-bold text-center mb-2", isMobile ? "text-lg" : isTablet ? "text-xl" : "text-2xl")}>
                {block.content.title}
              </h2>
              {block.content.subtitle && (
                <p className={cn("text-center text-muted-foreground mb-6", isMobile && "text-sm mb-4")}>
                  {block.content.subtitle}
                </p>
              )}
              <div 
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${benefitsCols}, minmax(0, 1fr))` }}
              >
                {block.content.items.length > 0 ? block.content.items.map((item: any, i: number) => (
                  <Card key={i} className={cn("p-4", isMobile && "p-3")}>
                    <CheckCircle className={cn("text-primary mb-2", isMobile ? "w-5 h-5" : "w-7 h-7")} />
                    <h3 className={cn("font-semibold mb-1", isMobile && "text-sm")}>{item.title || 'Benefício'}</h3>
                    <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>{item.description}</p>
                  </Card>
                )) : (
                  <div className="col-span-full text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                    Adicione benefícios nas configurações
                  </div>
                )}
              </div>
            </div>
          );

        case 'features':
          return (
            <div className={cn("py-10 px-4 bg-muted/30", isMobile && "py-6")}>
              <h2 className={cn("font-bold text-center mb-6", isMobile ? "text-xl" : "text-2xl")}>{block.content.title}</h2>
              <div className="max-w-xl mx-auto space-y-2">
                {block.content.items.length > 0 ? block.content.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-background p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">{item || 'Item incluído'}</span>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                    Adicione itens nas configurações
                  </div>
                )}
              </div>
            </div>
          );

        case 'pricing':
          const discount = productOriginalPrice && productOriginalPrice > productPrice
            ? Math.round((1 - productPrice / productOriginalPrice) * 100)
            : 0;
          return (
            <div className={cn("py-10 px-4 text-center bg-gradient-to-br from-primary/5 to-background", isMobile && "py-6")}>
              {block.content.highlightText && (
                <Badge variant="destructive" className="mb-3">{block.content.highlightText}</Badge>
              )}
              {block.content.showOriginalPrice && productOriginalPrice && (
                <p className="text-lg text-muted-foreground line-through">{formatPrice(productOriginalPrice)}</p>
              )}
              <p className={cn("font-bold text-primary mb-1", isMobile ? "text-3xl" : "text-4xl")}>
                {formatPrice(productPrice)}
              </p>
              {block.content.showDiscount && discount > 0 && (
                <Badge className="mb-3">{discount}% OFF</Badge>
              )}
              {block.content.showInstallments && productPrice > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  ou 12x de {formatPrice(productPrice / 12)}
                </p>
              )}
              <Button size={isMobile ? "default" : "lg"} className="mt-2">COMPRAR AGORA</Button>
            </div>
          );

        case 'testimonials':
          return (
            <div className={cn("py-10 px-4", isMobile && "py-6")}>
              <h2 className={cn("font-bold text-center mb-6", isMobile ? "text-xl" : "text-2xl")}>{block.content.title}</h2>
              <div className={cn(
                block.content.layout === 'grid' ? (isMobile ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4") : "flex gap-4 overflow-x-auto pb-2"
              )}>
                {block.content.items.length > 0 ? block.content.items.map((item, i) => (
                  <Card key={i} className={cn("p-4", block.content.layout !== 'grid' && "min-w-[280px]")}>
                    <div className="flex items-center gap-3 mb-2">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{item.name || 'Cliente'}</p>
                        {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
                      </div>
                    </div>
                    <p className="text-sm italic text-muted-foreground">"{item.text || 'Depoimento'}"</p>
                  </Card>
                )) : (
                  <div className="col-span-full text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                    Adicione depoimentos nas configurações
                  </div>
                )}
              </div>
            </div>
          );

        case 'faq':
          return (
            <div className={cn("py-10 px-4", isMobile && "py-6")}>
              <h2 className={cn("font-bold text-center mb-6", isMobile ? "text-xl" : "text-2xl")}>{block.content.title}</h2>
              <div className="max-w-2xl mx-auto space-y-3">
                {block.content.items.length > 0 ? block.content.items.map((item, i) => (
                  <Card key={i} className="p-4">
                    <p className="font-semibold mb-1 text-sm">{item.question || 'Pergunta?'}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </Card>
                )) : (
                  <div className="text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
                    Adicione perguntas nas configurações
                  </div>
                )}
              </div>
            </div>
          );

        case 'video':
          const embedUrl = getEmbedUrl(block.content.url);
          return (
            <div className={cn("py-10 px-4", isMobile && "py-6")}>
              {block.content.title && (
                <h2 className={cn("font-bold text-center mb-4", isMobile ? "text-xl" : "text-2xl")}>{block.content.title}</h2>
              )}
              <div className="max-w-3xl mx-auto aspect-video bg-muted rounded-lg overflow-hidden">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Play className="w-12 h-12 mb-2" />
                    <p className="text-sm">Adicione um vídeo nas configurações</p>
                  </div>
                )}
              </div>
            </div>
          );

        case 'text':
          return (
            <div className={cn(
              "py-6 px-4",
              block.content.alignment === 'left' && "text-left",
              block.content.alignment === 'center' && "text-center",
              block.content.alignment === 'right' && "text-right"
            )}>
              <div className={cn(
                "max-w-3xl mx-auto whitespace-pre-wrap",
                block.content.size === 'small' && "text-sm",
                block.content.size === 'large' && "text-lg"
              )}>
                {block.content.text || <span className="text-muted-foreground italic">Adicione texto nas configurações...</span>}
              </div>
            </div>
          );

        case 'image':
          return (
            <div className="py-6 px-4">
              <div className={cn("mx-auto", !block.content.fullWidth && "max-w-3xl")}>
                {block.content.url ? (
                  <>
                    <img src={block.content.url} alt={block.content.alt} className="w-full rounded-lg" />
                    {block.content.caption && (
                      <p className="text-center text-sm text-muted-foreground mt-2">{block.content.caption}</p>
                    )}
                  </>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                    <Image className="w-12 h-12 mb-2" />
                    <p className="text-sm">Adicione uma imagem</p>
                  </div>
                )}
              </div>
            </div>
          );

        case 'cta':
          return (
            <div className={cn("py-10 px-4 text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10", isMobile && "py-6")}>
              <h2 className={cn("font-bold mb-2", isMobile ? "text-xl" : "text-2xl")}>{block.content.text}</h2>
              {block.content.subtext && (
                <p className="text-muted-foreground mb-4 text-sm">{block.content.subtext}</p>
              )}
              <Button 
                size={isMobile ? "default" : "lg"}
                className={cn(
                  block.content.style === 'glow' && "shadow-lg shadow-primary/50",
                  block.content.style === 'outline' && "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                )}
              >
                {block.content.buttonText}
              </Button>
            </div>
          );

        case 'guarantee':
          return (
            <div className={cn("py-10 px-4", isMobile && "py-6")}>
              <Card className="max-w-xl mx-auto p-5 text-center border-green-500/50 bg-green-500/5">
                <Shield className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">{block.content.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{block.content.text}</p>
                <Badge variant="outline" className="border-green-500 text-green-600">
                  {block.content.days} dias de garantia
                </Badge>
              </Card>
            </div>
          );

        case 'countdown':
          return (
            <div className={cn("py-6 px-4 text-center bg-destructive/10", isMobile && "py-4")}>
              <p className="font-semibold mb-3">{block.content.title}</p>
              <div className={cn("flex justify-center", isMobile ? "gap-2" : "gap-4")}>
                {['Dias', 'Horas', 'Min', 'Seg'].map((label, i) => (
                  <div key={label} className={cn(
                    "text-center",
                    block.content.style === 'boxed' && "bg-background p-2 rounded-lg min-w-[50px]"
                  )}>
                    <p className={cn("font-bold", isMobile ? "text-lg" : "text-2xl")}>
                      {String(Math.floor(Math.random() * (i === 0 ? 30 : i === 1 ? 24 : 60))).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          );

        case 'divider':
          return (
            <div className="py-4 px-6">
              {block.content.style === 'line' && <Separator />}
              {block.content.style === 'gradient' && (
                <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}
              {block.content.style === 'dots' && (
                <div className="flex justify-center gap-2">
                  {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary/50" />)}
                </div>
              )}
            </div>
          );

        case 'spacer':
          return (
            <div className={cn(
              block.content.height === 'small' && "h-6",
              block.content.height === 'medium' && "h-12",
              block.content.height === 'large' && "h-24"
            )} />
          );

        default:
          return null;
      }
    })();

    return (
      <div
        key={block.id}
        className={wrapperClass}
        onClick={(e) => {
          if (!isPreviewMode && onSelectBlock) {
            e.stopPropagation();
            onSelectBlock(block.id);
          }
        }}
      >
        {content}
        {isSelected && !isPreviewMode && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-sm z-10">
            {BLOCK_TEMPLATES[block.type].name}
          </div>
        )}
      </div>
    );
  }, [selectedBlockId, onSelectBlock, viewMode, productName, productDescription, productPrice, productOriginalPrice, isPreviewMode, isMobile, isTablet]);

  return (
    <div 
      className="divide-y" 
      onClick={() => !isPreviewMode && onSelectBlock?.('')}
    >
      {blocks.sort((a, b) => a.order - b.order).map(renderBlock)}
      {blocks.length === 0 && (
        <div className={cn("py-16 text-center text-muted-foreground", isMobile && "py-10")}>
          <Layers className={cn("mx-auto mb-4 opacity-50", isMobile ? "w-8 h-8" : "w-12 h-12")} />
          <p className={cn(isMobile ? "text-xs" : "text-sm")}>Adicione blocos para construir sua página</p>
        </div>
      )}
    </div>
  );
}

export default AdvancedProductEditor;
