'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  Eye, EyeOff, Save, ExternalLink, Image, Type,
  CheckCircle, Star, HelpCircle, Plus, Trash2, GripVertical,
  Loader2, FileText, Video, Users, Shield, LayoutGrid, FileEdit, Sparkles,
  MessageSquare, AlertTriangle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullscreenWixEditor } from './BlockEditor/FullscreenWixEditor';
import SortableItem from '@/components/admin/SortableItem';

// ============= Schemas Zod =============

const benefitSchema = z.object({
  id: z.string(),
  icon: z.string().min(1, 'Escolha um ícone'),
  title: z.string().min(1, 'Título obrigatório').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

const testimonialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome obrigatório').max(100),
  text: z.string().min(10, 'Mínimo 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
  avatar: z.string().url().optional().or(z.literal('')),
  role: z.string().max(100).optional(),
  rating: z.number().min(1).max(5).optional(),
});

const faqSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Pergunta obrigatória').max(300),
  answer: z.string().min(1, 'Resposta obrigatória').max(2000),
});

const salesPageSchema = z.object({
  headline: z.string().min(1, 'Headline obrigatória').max(200),
  subheadline: z.string().max(500).optional(),
  urgencyHeadline: z.string().max(200).optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  benefits: z.array(benefitSchema),
  features: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, 'Texto obrigatório').max(200),
  })),
  testimonials: z.array(testimonialSchema),
  faq: z.array(faqSchema),
  cta_text: z.string().min(1, 'Texto do CTA obrigatório').max(50),
  guarantee_text: z.string().max(300).optional(),
  urgency_text: z.string().max(200).optional(),
  urgency_date: z.string().optional(),
  scarcity_message: z.string().max(200).optional(),
  stock_left: z.number().min(0).optional(),
});

type SalesPageFormData = z.infer<typeof salesPageSchema>;

interface SalesPageEditorProps {
  productId: string;
}

const DEFAULT_ICONS = ['CheckCircle', 'Star', 'Shield', 'Users', 'Video', 'FileText', 'Sparkles', 'Clock'];

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  Star,
  Shield,
  Users,
  Video,
  FileText,
  Sparkles,
  Clock,
};

// ============= Gerador de ID único =============
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function SalesPageEditor({ productId }: SalesPageEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('headlines');
  const [editorMode, setEditorMode] = useState<'classic' | 'advanced'>('classic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form setup
  const form = useForm<SalesPageFormData>({
    resolver: zodResolver(salesPageSchema),
    defaultValues: {
      headline: '',
      subheadline: '',
      urgencyHeadline: '',
      video_url: '',
      benefits: [],
      features: [],
      testimonials: [],
      faq: [],
      cta_text: 'QUERO COMPRAR AGORA',
      guarantee_text: '',
      urgency_text: '',
      urgency_date: '',
      scarcity_message: '',
      stock_left: undefined,
    },
  });

  // Field arrays para listas dinâmicas
  const {
    fields: benefitsFields,
    append: appendBenefit,
    remove: removeBenefit,
    move: moveBenefit,
    replace: replaceBenefits,
  } = useFieldArray({ control: form.control, name: 'benefits' });

  const {
    fields: featuresFields,
    append: appendFeature,
    remove: removeFeature,
    move: moveFeature,
  } = useFieldArray({ control: form.control, name: 'features' });

  const {
    fields: testimonialsFields,
    append: appendTestimonial,
    remove: removeTestimonial,
    move: moveTestimonial,
  } = useFieldArray({ control: form.control, name: 'testimonials' });

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
    move: moveFaq,
  } = useFieldArray({ control: form.control, name: 'faq' });

  // Fetch product with retry and better error handling
  const { data: product, isLoading, error: productError, refetch } = useQuery({
    queryKey: ['product-sales-page', productId],
    queryFn: async () => {
      console.log('[SalesPageEditor] Fetching product:', productId);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      if (error) {
        console.error('[SalesPageEditor] Fetch error:', error);
        throw error;
      }
      console.log('[SalesPageEditor] Product loaded:', data?.name);
      return data;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  // Preencher form quando produto carregar
  useEffect(() => {
    if (product) {
      const savedContent = product.sales_page_content
        ? (typeof product.sales_page_content === 'string'
            ? JSON.parse(product.sales_page_content)
            : product.sales_page_content)
        : {};

      const existingTestimonials = Array.isArray(product.testimonials)
        ? (product.testimonials as any[])
        : [];
      const existingFaq = Array.isArray(product.faq) ? (product.faq as any[]) : [];

      form.reset({
        headline: savedContent.headline || product.name || '',
        subheadline: savedContent.subheadline || product.short_description || '',
        urgencyHeadline: savedContent.urgencyHeadline || '',
        video_url: savedContent.video_url || product.trailer_url || '',
        benefits: (savedContent.benefits || []).map((b: any) => ({
          id: b.id || generateId(),
          icon: b.icon || 'CheckCircle',
          title: b.title || '',
          description: b.description || '',
        })),
        features: (savedContent.features || []).map((f: any, i: number) => ({
          id: typeof f === 'string' ? generateId() : f.id || generateId(),
          text: typeof f === 'string' ? f : f.text || '',
        })),
        testimonials: (savedContent.testimonials || existingTestimonials).map((t: any) => ({
          id: t.id || generateId(),
          name: t.name || '',
          text: t.text || '',
          avatar: t.avatar || '',
          role: t.role || '',
          rating: t.rating || 5,
        })),
        faq: (savedContent.faq || existingFaq).map((f: any) => ({
          id: f.id || generateId(),
          question: f.question || '',
          answer: f.answer || '',
        })),
        cta_text: savedContent.cta_text || 'QUERO COMPRAR AGORA',
        guarantee_text:
          savedContent.guarantee_text ||
          (product.guarantee_days ? `${product.guarantee_days} dias de garantia incondicional` : ''),
        urgency_text: savedContent.urgency_text || '',
        urgency_date: savedContent.urgency_date || '',
        scarcity_message: savedContent.scarcity_message || '',
        stock_left: savedContent.stock_left || undefined,
      });
    }
  }, [product, form]);

  // Track unsaved changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Warn before leaving with unsaved changes - use toast instead of blocking alert
  // REMOVED: window.onbeforeunload blocking behavior that caused issues

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { formData: SalesPageFormData; publish?: boolean }) => {
      const { formData, publish } = data;
      
      const updateData: any = {
        sales_page_content: formData,
        testimonials: formData.testimonials,
        faq: formData.faq,
        trailer_url: formData.video_url || null,
      };

      if (publish !== undefined) {
        updateData.sales_page_published = publish;
      }

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-sales-page', productId] });
      setHasUnsavedChanges(false);
      toast.success(
        variables.publish === true
          ? 'Página publicada com sucesso!'
          : variables.publish === false
          ? 'Página despublicada!'
          : 'Alterações salvas!'
      );
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Handlers de drag-and-drop
  const handleBenefitsDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = benefitsFields.findIndex((f) => f.id === active.id);
        const newIndex = benefitsFields.findIndex((f) => f.id === over.id);
        moveBenefit(oldIndex, newIndex);
      }
    },
    [benefitsFields, moveBenefit]
  );

  const handleTestimonialsDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = testimonialsFields.findIndex((f) => f.id === active.id);
        const newIndex = testimonialsFields.findIndex((f) => f.id === over.id);
        moveTestimonial(oldIndex, newIndex);
      }
    },
    [testimonialsFields, moveTestimonial]
  );

  const handleFaqDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = faqFields.findIndex((f) => f.id === active.id);
        const newIndex = faqFields.findIndex((f) => f.id === over.id);
        moveFaq(oldIndex, newIndex);
      }
    },
    [faqFields, moveFaq]
  );

  const handleFeaturesDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = featuresFields.findIndex((f) => f.id === active.id);
        const newIndex = featuresFields.findIndex((f) => f.id === over.id);
        moveFeature(oldIndex, newIndex);
      }
    },
    [featuresFields, moveFeature]
  );

  // Submit handler
  const onSubmit = (data: SalesPageFormData, publish?: boolean) => {
    saveMutation.mutate({ formData: data, publish });
  };

  // Use preview route for draft products
  const productUrl = product 
    ? product.status === 'published' 
      ? `${window.location.origin}/produto/${product.slug}` 
      : `${window.location.origin}/preview/${product.slug}`
    : '';

  // IDs memoizados para DnD
  const benefitsIds = useMemo(() => benefitsFields.map((f) => f.id), [benefitsFields]);
  const testimonialsIds = useMemo(() => testimonialsFields.map((f) => f.id), [testimonialsFields]);
  const faqIds = useMemo(() => faqFields.map((f) => f.id), [faqFields]);
  const featuresIds = useMemo(() => featuresFields.map((f) => f.id), [featuresFields]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se estiver no modo avançado, renderiza FORA do form para evitar conflitos
  if (editorMode === 'advanced') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Editor da Página de Vendas</h3>
            <p className="text-sm text-muted-foreground">
              Personalize todos os elementos da sua página de vendas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Editor Mode Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditorMode('classic')}
                className="h-8"
              >
                <FileEdit className="w-4 h-4 mr-1" />
                Clássico
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setEditorMode('advanced')}
                className="h-8"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Avançado
              </Button>
            </div>

            {(product as any)?.sales_page_published ? (
              <Badge variant="default" className="bg-green-600">
                <Eye className="w-3 h-3 mr-1" />
                Publicada
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="w-3 h-3 mr-1" />
                Rascunho
              </Badge>
            )}

            <Button type="button" variant="outline" size="sm" asChild>
              <a href={productUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                {product?.status === 'published' ? 'Ver Página' : 'Preview'}
              </a>
            </Button>
          </div>
        </div>

        {/* URL Preview */}
        <Card className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">URL da página:</p>
          <code className="text-sm text-primary">{productUrl}</code>
        </Card>

        {/* Advanced Editor Mode - Fullscreen Wix-Style Editor - FORA do form */}
        <FullscreenWixEditor
          productId={productId}
          productName={product?.name || ''}
          productDescription={product?.short_description || ''}
          productPrice={product?.price || 0}
          productOriginalPrice={product?.original_price || null}
          productImage={product?.cover_image_url || ''}
          initialBlocks={(() => {
            // Carregar blocos existentes do produto
            if (product?.sales_page_content) {
              try {
                const content = typeof product.sales_page_content === 'string' 
                  ? JSON.parse(product.sales_page_content) 
                  : product.sales_page_content;
                if (content.blocks && Array.isArray(content.blocks)) {
                  return content.blocks;
                }
              } catch (e) {
                console.error('[FullscreenEditor] Error parsing blocks:', e);
              }
            }
            return [];
          })()}
          onSave={async (blocks) => {
            console.log('[SalesPageEditor] Saving blocks:', blocks.length);
            
            // Preserve existing simple editor data when saving blocks
            let existingContent: any = {};
            try {
              existingContent = product?.sales_page_content 
                ? (typeof product.sales_page_content === 'string' 
                    ? JSON.parse(product.sales_page_content) 
                    : product.sales_page_content)
                : {};
            } catch (parseError) {
              console.warn('[SalesPageEditor] Could not parse existing content, starting fresh:', parseError);
            }
            
            const newContent = { 
              ...existingContent,
              blocks // Only update blocks, keep other fields
            };
            
            console.log('[SalesPageEditor] Saving content to database...');
            
            const { error } = await supabase
              .from('products')
              .update({ 
                sales_page_content: JSON.stringify(newContent),
                updated_at: new Date().toISOString()
              })
              .eq('id', productId);
            
            if (error) {
              console.error('[SalesPageEditor] Save error:', error);
              throw error;
            }
            
            console.log('[SalesPageEditor] Save successful, invalidating cache...');
            await queryClient.invalidateQueries({ queryKey: ['product-sales-page', productId] });
            await queryClient.invalidateQueries({ queryKey: ['product', productId] });
            
            // Also refetch to get updated data
            await refetch();
            
            toast.success('Página salva com sucesso!');
          }}
          onClose={() => setEditorMode('classic')}
          isSaving={saveMutation.isPending}
        />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Editor da Página de Vendas</h3>
            <p className="text-sm text-muted-foreground">
              Personalize todos os elementos da sua página de vendas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Editor Mode Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setEditorMode('classic')}
                className="h-8"
              >
                <FileEdit className="w-4 h-4 mr-1" />
                Clássico
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditorMode('advanced')}
                className="h-8"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Avançado
              </Button>
            </div>

            {(product as any)?.sales_page_published ? (
              <Badge variant="default" className="bg-green-600">
                <Eye className="w-3 h-3 mr-1" />
                Publicada
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="w-3 h-3 mr-1" />
                Rascunho
              </Badge>
            )}

            <Button type="button" variant="outline" size="sm" asChild>
              <a href={productUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                {product?.status === 'published' ? 'Ver Página' : 'Preview'}
              </a>
            </Button>
          </div>
        </div>

        {/* URL Preview */}
        <Card className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">URL da página:</p>
          <code className="text-sm text-primary">{productUrl}</code>
        </Card>

        {/* Classic Editor Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="headlines">Headlines</TabsTrigger>
              <TabsTrigger value="benefits">Benefícios</TabsTrigger>
              <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="cta">CTA & Urgência</TabsTrigger>
            </TabsList>

            {/* ============= Headlines Tab ============= */}
            <TabsContent value="headlines" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Headline & Subheadline</CardTitle>
                  <CardDescription>O título principal e subtítulo da página</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headline Principal (H1)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Transforme sua vida com..."
                            className="text-lg font-semibold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subheadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subheadline</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descubra como milhares de pessoas já..."
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgencyHeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headline de Urgência</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Oferta por tempo limitado!"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vídeo de Apresentação</CardTitle>
                  <CardDescription>O vídeo que aparece no topo da página</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do Vídeo (YouTube/Vimeo)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://youtube.com/watch?v=..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Features com DnD */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>O que você vai receber</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendFeature({ id: generateId(), text: '' })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleFeaturesDragEnd}
                  >
                    <SortableContext items={featuresIds} strategy={verticalListSortingStrategy}>
                      {featuresFields.map((field, index) => (
                        <SortableItem key={field.id} id={field.id}>
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <FormField
                              control={form.control}
                              name={`features.${index}.text`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Ex: Acesso vitalício ao curso completo"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFeature(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                  {featuresFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Adicione itens que o cliente vai receber
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============= Benefits Tab ============= */}
            <TabsContent value="benefits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Benefícios</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendBenefit({
                          id: generateId(),
                          icon: 'CheckCircle',
                          title: '',
                          description: '',
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardTitle>
                  <CardDescription>Destaque os principais benefícios do produto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleBenefitsDragEnd}
                  >
                    <SortableContext items={benefitsIds} strategy={verticalListSortingStrategy}>
                      {benefitsFields.map((field, index) => (
                        <SortableItem key={field.id} id={field.id}>
                          <Card className="p-4 flex-1">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <FormLabel className="text-xs">Ícone:</FormLabel>
                                {DEFAULT_ICONS.map((iconName) => {
                                  const IconComp = ICON_COMPONENTS[iconName];
                                  return (
                                    <Button
                                      key={iconName}
                                      type="button"
                                      variant={
                                        form.watch(`benefits.${index}.icon`) === iconName
                                          ? 'default'
                                          : 'outline'
                                      }
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        form.setValue(`benefits.${index}.icon`, iconName)
                                      }
                                    >
                                      <IconComp className="w-4 h-4" />
                                    </Button>
                                  );
                                })}
                              </div>

                              <FormField
                                control={form.control}
                                name={`benefits.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Ex: Aprenda no seu ritmo" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`benefits.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Acesse as aulas quando e onde quiser..."
                                        rows={2}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removeBenefit(index)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </Card>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                  {benefitsFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Adicione benefícios para destacar na página
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============= Testimonials Tab ============= */}
            <TabsContent value="testimonials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Depoimentos</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTestimonial({
                          id: generateId(),
                          name: '',
                          text: '',
                          avatar: '',
                          role: '',
                          rating: 5,
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardTitle>
                  <CardDescription>Depoimentos de clientes aumentam a confiança</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleTestimonialsDragEnd}
                  >
                    <SortableContext items={testimonialsIds} strategy={verticalListSortingStrategy}>
                      {testimonialsFields.map((field, index) => (
                        <SortableItem key={field.id} id={field.id}>
                          <Card className="p-4 flex-1">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`testimonials.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nome</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Maria Silva" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`testimonials.${index}.role`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cargo/Profissão</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Streamer" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name={`testimonials.${index}.text`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Depoimento</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Esse curso mudou minha vida..."
                                        rows={3}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`testimonials.${index}.avatar`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL do Avatar (opcional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://..." />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`testimonials.${index}.rating`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Avaliação</FormLabel>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Button
                                          key={star}
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => field.onChange(star)}
                                        >
                                          <Star
                                            className={cn(
                                              'w-5 h-5',
                                              star <= (field.value || 5)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-muted-foreground'
                                            )}
                                          />
                                        </Button>
                                      ))}
                                    </div>
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removeTestimonial(index)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </Card>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                  {testimonialsFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Adicione depoimentos de clientes satisfeitos
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============= FAQ Tab ============= */}
            <TabsContent value="faq" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Perguntas Frequentes</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendFaq({
                          id: generateId(),
                          question: '',
                          answer: '',
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardTitle>
                  <CardDescription>Responda as dúvidas mais comuns dos clientes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleFaqDragEnd}
                  >
                    <SortableContext items={faqIds} strategy={verticalListSortingStrategy}>
                      {faqFields.map((field, index) => (
                        <SortableItem key={field.id} id={field.id}>
                          <Card className="p-4 flex-1">
                            <div className="space-y-3">
                              <FormField
                                control={form.control}
                                name={`faq.${index}.question`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pergunta</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Como funciona a garantia?"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`faq.${index}.answer`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Resposta</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Você tem X dias para testar..."
                                        rows={3}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removeFaq(index)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </Card>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                  {faqFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Adicione perguntas frequentes para ajudar seus clientes
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============= CTA & Urgency Tab ============= */}
            <TabsContent value="cta" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Call to Action</CardTitle>
                  <CardDescription>Configure o botão principal de compra</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cta_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto do Botão CTA</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="QUERO COMPRAR AGORA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guarantee_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto de Garantia</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="7 dias de garantia incondicional"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Urgência & Escassez
                  </CardTitle>
                  <CardDescription>
                    Crie senso de urgência para aumentar conversões
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="urgency_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Urgência</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Oferta por tempo limitado!" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgency_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Encerramento (Timer)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scarcity_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Escassez</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apenas X vagas restantes!" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_left"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade Restante</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            value={field.value ?? ''}
                            placeholder="Ex: 50"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        {/* Save Actions */}
        {editorMode === 'classic' && (
          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alterações não salvas
                </Badge>
              )}
              {Object.keys(form.formState.errors).length > 0 && (
                <Badge variant="destructive">
                  {Object.keys(form.formState.errors).length} erro(s) de validação
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={form.handleSubmit((data) => onSubmit(data))}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Rascunho
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Salva as alterações sem publicar a página</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {(product as any)?.sales_page_published ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={form.handleSubmit((data) => onSubmit(data, false))}
                        disabled={saveMutation.isPending}
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Despublicar
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        onClick={form.handleSubmit((data) => onSubmit(data, true))}
                        disabled={saveMutation.isPending}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Publicar Página
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{(product as any)?.sales_page_published ? 'Remove a página do ar' : 'Torna a página visível publicamente'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
