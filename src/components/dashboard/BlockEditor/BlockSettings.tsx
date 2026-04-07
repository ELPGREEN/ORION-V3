import { Block, BLOCK_TEMPLATES } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface BlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
  const updateContent = (key: string, value: any) => {
    onUpdate({ content: { ...block.content, [key]: value } });
  };

  const addItem = (defaultItem: any) => {
    const items = [...(block.content.items || []), defaultItem];
    updateContent('items', items);
  };

  const removeItem = (index: number) => {
    const items = block.content.items.filter((_: any, i: number) => i !== index);
    updateContent('items', items);
  };

  const updateItem = (index: number, key: string, value: any) => {
    const items = [...block.content.items];
    items[index] = { ...items[index], [key]: value };
    updateContent('items', items);
  };

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.headline || ''} onChange={e => updateContent('headline', e.target.value)} placeholder="Título principal" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Textarea value={block.content.subheadline || ''} onChange={e => updateContent('subheadline', e.target.value)} placeholder="Subtítulo" />
          </div>
          <div>
            <Label>Texto do CTA</Label>
            <Input value={block.content.cta_text || ''} onChange={e => updateContent('cta_text', e.target.value)} />
          </div>
          <div>
            <Label>Imagem de Fundo (URL)</Label>
            <Input value={block.content.backgroundImage || ''} onChange={e => updateContent('backgroundImage', e.target.value)} placeholder="https://..." />
          </div>
          {block.content.backgroundImage && (
            <div>
              <Label>Opacidade do Overlay ({block.content.overlayOpacity}%)</Label>
              <Slider value={[block.content.overlayOpacity || 50]} onValueChange={v => updateContent('overlayOpacity', v[0])} min={0} max={100} step={5} />
            </div>
          )}
          <div>
            <Label>Alinhamento</Label>
            <Select value={block.content.alignment || 'center'} onValueChange={v => updateContent('alignment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'benefits':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título da Seção</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={block.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
          </div>
          <div>
            <Label>Colunas</Label>
            <Select value={String(block.content.columns || 3)} onValueChange={v => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <Label>Itens</Label>
          {(block.content.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-2 p-3 border rounded-lg relative">
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
              <Input value={item.title || ''} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Título" />
              <Textarea value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Descrição" rows={2} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem({ title: '', description: '' })} className="w-full gap-1"><Plus className="w-3 h-3" /> Adicionar Benefício</Button>
        </div>
      );

    case 'features':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <Separator />
          <Label>Itens</Label>
          {(block.content.items || []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Input value={typeof item === 'string' ? item : item.text || ''} onChange={e => {
                const items = [...block.content.items];
                items[i] = e.target.value;
                updateContent('items', items);
              }} placeholder="Funcionalidade" />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem('')} className="w-full gap-1"><Plus className="w-3 h-3" /> Adicionar Item</Button>
        </div>
      );

    case 'pricing':
      return (
        <div className="space-y-4">
          <div>
            <Label>Texto de Destaque</Label>
            <Input value={block.content.highlightText || ''} onChange={e => updateContent('highlightText', e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mostrar Preço Original</Label>
            <Switch checked={block.content.showOriginalPrice} onCheckedChange={v => updateContent('showOriginalPrice', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mostrar Desconto</Label>
            <Switch checked={block.content.showDiscount} onCheckedChange={v => updateContent('showDiscount', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mostrar Parcelas</Label>
            <Switch checked={block.content.showInstallments} onCheckedChange={v => updateContent('showInstallments', v)} />
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div>
            <Label>Layout</Label>
            <Select value={block.content.layout || 'grid'} onValueChange={v => updateContent('layout', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">Carrossel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <Label>Depoimentos</Label>
          {(block.content.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-2 p-3 border rounded-lg relative">
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
              <Input value={item.name || ''} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Nome" />
              <Input value={item.role || ''} onChange={e => updateItem(i, 'role', e.target.value)} placeholder="Cargo / Profissão" />
              <Textarea value={item.text || ''} onChange={e => updateItem(i, 'text', e.target.value)} placeholder="Depoimento" rows={2} />
              <Input value={item.avatar || ''} onChange={e => updateItem(i, 'avatar', e.target.value)} placeholder="URL do Avatar" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem({ name: '', text: '', role: '', avatar: '' })} className="w-full gap-1"><Plus className="w-3 h-3" /> Adicionar Depoimento</Button>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <Separator />
          <Label>Perguntas</Label>
          {(block.content.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-2 p-3 border rounded-lg relative">
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
              <Input value={item.question || ''} onChange={e => updateItem(i, 'question', e.target.value)} placeholder="Pergunta" />
              <Textarea value={item.answer || ''} onChange={e => updateItem(i, 'answer', e.target.value)} placeholder="Resposta" rows={2} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem({ question: '', answer: '' })} className="w-full gap-1"><Plus className="w-3 h-3" /> Adicionar Pergunta</Button>
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título (opcional)</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div>
            <Label>URL do Vídeo</Label>
            <Input value={block.content.url || ''} onChange={e => updateContent('url', e.target.value)} placeholder="YouTube ou Vimeo URL" />
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <div>
            <Label>Texto</Label>
            <Textarea value={block.content.text || ''} onChange={e => updateContent('text', e.target.value)} rows={6} />
          </div>
          <div>
            <Label>Alinhamento</Label>
            <Select value={block.content.alignment || 'left'} onValueChange={v => updateContent('alignment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tamanho</Label>
            <Select value={block.content.size || 'medium'} onValueChange={v => updateContent('size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeno</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <div>
            <Label>URL da Imagem</Label>
            <Input value={block.content.url || ''} onChange={e => updateContent('url', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Texto Alternativo</Label>
            <Input value={block.content.alt || ''} onChange={e => updateContent('alt', e.target.value)} />
          </div>
          <div>
            <Label>Legenda</Label>
            <Input value={block.content.caption || ''} onChange={e => updateContent('caption', e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Largura Total</Label>
            <Switch checked={block.content.fullWidth} onCheckedChange={v => updateContent('fullWidth', v)} />
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <div>
            <Label>Texto Principal</Label>
            <Input value={block.content.text || ''} onChange={e => updateContent('text', e.target.value)} />
          </div>
          <div>
            <Label>Subtexto</Label>
            <Input value={block.content.subtext || ''} onChange={e => updateContent('subtext', e.target.value)} />
          </div>
          <div>
            <Label>Texto do Botão</Label>
            <Input value={block.content.buttonText || ''} onChange={e => updateContent('buttonText', e.target.value)} />
          </div>
          <div>
            <Label>Estilo</Label>
            <Select value={block.content.style || 'default'} onValueChange={v => updateContent('style', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão</SelectItem>
                <SelectItem value="glow">Brilho</SelectItem>
                <SelectItem value="outline">Contorno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'guarantee':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div>
            <Label>Texto</Label>
            <Textarea value={block.content.text || ''} onChange={e => updateContent('text', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Dias de Garantia</Label>
            <Input type="number" value={block.content.days || 7} onChange={e => updateContent('days', parseInt(e.target.value) || 7)} />
          </div>
        </div>
      );

    case 'countdown':
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={block.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
          </div>
          <div>
            <Label>Data Limite</Label>
            <Input type="datetime-local" value={block.content.endDate || ''} onChange={e => updateContent('endDate', e.target.value)} />
          </div>
          <div>
            <Label>Estilo</Label>
            <Select value={block.content.style || 'boxed'} onValueChange={v => updateContent('style', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boxed">Caixa</SelectItem>
                <SelectItem value="inline">Inline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-4">
          <div>
            <Label>Estilo</Label>
            <Select value={block.content.style || 'line'} onValueChange={v => updateContent('style', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Linha</SelectItem>
                <SelectItem value="gradient">Gradiente</SelectItem>
                <SelectItem value="dots">Pontos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-4">
          <div>
            <Label>Altura</Label>
            <Select value={block.content.height || 'medium'} onValueChange={v => updateContent('height', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeno (24px)</SelectItem>
                <SelectItem value="medium">Médio (48px)</SelectItem>
                <SelectItem value="large">Grande (96px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Configurações não disponíveis para este bloco.</p>;
  }
}
