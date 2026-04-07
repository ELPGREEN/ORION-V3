import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Type, Image, MousePointer, Minus, Square, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Palette, Save, Eye, Undo, Plus, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailEditorProps {
  initialHtml?: string;
  onSave: (html: string) => void;
}

interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer';
  content: Record<string, any>;
}

function createEmailBlock(type: EmailBlock['type']): EmailBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'text':
      return { id, type, content: { text: 'Seu texto aqui...', fontSize: '16', color: '#475569', align: 'left', bold: false, italic: false } };
    case 'image':
      return { id, type, content: { url: '', alt: '', width: '100' } };
    case 'button':
      return { id, type, content: { text: 'Clique Aqui', url: '#', bgColor: '#3b82f6', textColor: '#ffffff', borderRadius: '8', align: 'center' } };
    case 'divider':
      return { id, type, content: { color: '#e2e8f0', thickness: '1' } };
    case 'spacer':
      return { id, type, content: { height: '24' } };
  }
}

function blocksToHtml(blocks: EmailBlock[], bgColor: string): string {
  const inner = blocks.map(block => {
    switch (block.type) {
      case 'text': {
        const { text, fontSize, color, align, bold, italic } = block.content;
        return `<p style="color:${color};font-size:${fontSize}px;text-align:${align};${bold ? 'font-weight:700;' : ''}${italic ? 'font-style:italic;' : ''}line-height:1.6;margin:0 0 16px">${text}</p>`;
      }
      case 'image': {
        const { url, alt, width } = block.content;
        if (!url) return '<div style="background:#f1f5f9;border-radius:8px;padding:40px;text-align:center;color:#94a3b8;margin:0 0 16px">📷 Adicione uma URL de imagem</div>';
        return `<img src="${url}" alt="${alt}" style="max-width:${width}%;height:auto;display:block;margin:0 auto 16px;border-radius:8px" />`;
      }
      case 'button': {
        const { text, url, bgColor: bg, textColor, borderRadius, align } = block.content;
        return `<div style="text-align:${align};margin:0 0 16px"><a href="${url}" style="display:inline-block;background:${bg};color:${textColor};padding:14px 32px;border-radius:${borderRadius}px;text-decoration:none;font-weight:600;font-size:16px">${text}</a></div>`;
      }
      case 'divider':
        return `<hr style="border:none;border-top:${block.content.thickness}px solid ${block.content.color};margin:16px 0" />`;
      case 'spacer':
        return `<div style="height:${block.content.height}px"></div>`;
      default:
        return '';
    }
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:${bgColor}"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">\n${inner}\n</div></div></body></html>`;
}

const BLOCK_TYPES = [
  { type: 'text' as const, icon: Type, label: 'Texto' },
  { type: 'image' as const, icon: Image, label: 'Imagem' },
  { type: 'button' as const, icon: MousePointer, label: 'Botão' },
  { type: 'divider' as const, icon: Minus, label: 'Divisor' },
  { type: 'spacer' as const, icon: Square, label: 'Espaço' },
];

export default function EmailEditor({ initialHtml, onSave }: EmailEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    if (!initialHtml) return [createEmailBlock('text')];
    return [{ id: crypto.randomUUID(), type: 'text', content: { text: 'Template carregado — edite visualmente acima', fontSize: '16', color: '#475569', align: 'left', bold: false, italic: false } }];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#f8fafc');
  const [showPreview, setShowPreview] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId);
  const generatedHtml = blocksToHtml(blocks, bgColor);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock = createEmailBlock(type);
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, content: Record<string, any>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...content } } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = () => {
    onSave(generatedHtml);
    toast.success('Conteúdo salvo no editor');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
            <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)} className="gap-1.5 text-xs">
              <Icon className="w-3.5 h-3.5" /> {label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Editor' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" /> Aplicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Block list + Canvas */}
        <div className="lg:col-span-2 space-y-2">
          {showPreview ? (
            <Card className="overflow-hidden">
              <iframe srcDoc={generatedHtml} className="w-full h-[500px] border-0" title="Email Preview" />
            </Card>
          ) : (
            <div className="space-y-2 min-h-[400px]">
              {blocks.map((block) => (
                <Card
                  key={block.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all",
                    selectedId === block.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"
                  )}
                  onClick={() => setSelectedId(block.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {block.type === 'text' && (
                        <p className="text-sm" style={{ color: block.content.color, fontWeight: block.content.bold ? 700 : 400, fontStyle: block.content.italic ? 'italic' : 'normal', textAlign: block.content.align }}>
                          {block.content.text}
                        </p>
                      )}
                      {block.type === 'image' && (
                        block.content.url
                          ? <img src={block.content.url} alt={block.content.alt} className="max-h-20 rounded" />
                          : <div className="bg-muted/50 rounded p-4 text-center text-xs text-muted-foreground">📷 Imagem</div>
                      )}
                      {block.type === 'button' && (
                        <div style={{ textAlign: block.content.align }}>
                          <span className="inline-block px-4 py-2 rounded text-sm font-semibold" style={{ background: block.content.bgColor, color: block.content.textColor, borderRadius: `${block.content.borderRadius}px` }}>
                            {block.content.text}
                          </span>
                        </div>
                      )}
                      {block.type === 'divider' && <hr className="border-border" />}
                      {block.type === 'spacer' && <div className="text-center text-xs text-muted-foreground py-2">Espaço ({block.content.height}px)</div>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0 ml-2" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              {blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Plus className="w-8 h-8 mb-2" />
                  <p className="text-sm">Adicione blocos usando a barra acima</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings panel */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Configurações Gerais</Label>
            <div>
              <Label className="text-xs">Cor de Fundo</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                <Input value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </Card>

          {selectedBlock && (
            <Card className="p-4 space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Bloco: {selectedBlock.type === 'text' ? 'Texto' : selectedBlock.type === 'image' ? 'Imagem' : selectedBlock.type === 'button' ? 'Botão' : selectedBlock.type === 'divider' ? 'Divisor' : 'Espaço'}
              </Label>

              {selectedBlock.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Texto</Label>
                    <Textarea value={selectedBlock.content.text} onChange={e => updateBlock(selectedBlock.id, { text: e.target.value })} rows={3} className="text-xs mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tamanho</Label>
                      <Input type="number" value={selectedBlock.content.fontSize} onChange={e => updateBlock(selectedBlock.id, { fontSize: e.target.value })} className="h-8 text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Cor</Label>
                      <div className="flex gap-1 mt-1">
                        <input type="color" value={selectedBlock.content.color} onChange={e => updateBlock(selectedBlock.id, { color: e.target.value })} className="h-8 w-8 rounded cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant={selectedBlock.content.align === 'left' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateBlock(selectedBlock.id, { align: 'left' })}><AlignLeft className="w-3 h-3" /></Button>
                    <Button variant={selectedBlock.content.align === 'center' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateBlock(selectedBlock.id, { align: 'center' })}><AlignCenter className="w-3 h-3" /></Button>
                    <Button variant={selectedBlock.content.align === 'right' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateBlock(selectedBlock.id, { align: 'right' })}><AlignRight className="w-3 h-3" /></Button>
                    <Button variant={selectedBlock.content.bold ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateBlock(selectedBlock.id, { bold: !selectedBlock.content.bold })}><Bold className="w-3 h-3" /></Button>
                    <Button variant={selectedBlock.content.italic ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateBlock(selectedBlock.id, { italic: !selectedBlock.content.italic })}><Italic className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}

              {selectedBlock.type === 'image' && (
                <div className="space-y-3">
                  <div><Label className="text-xs">URL da Imagem</Label><Input value={selectedBlock.content.url} onChange={e => updateBlock(selectedBlock.id, { url: e.target.value })} placeholder="https://..." className="h-8 text-xs mt-1" /></div>
                  <div><Label className="text-xs">Texto Alt</Label><Input value={selectedBlock.content.alt} onChange={e => updateBlock(selectedBlock.id, { alt: e.target.value })} className="h-8 text-xs mt-1" /></div>
                  <div><Label className="text-xs">Largura (%)</Label><Slider value={[parseInt(selectedBlock.content.width)]} onValueChange={v => updateBlock(selectedBlock.id, { width: String(v[0]) })} min={20} max={100} className="mt-1" /></div>
                </div>
              )}

              {selectedBlock.type === 'button' && (
                <div className="space-y-3">
                  <div><Label className="text-xs">Texto</Label><Input value={selectedBlock.content.text} onChange={e => updateBlock(selectedBlock.id, { text: e.target.value })} className="h-8 text-xs mt-1" /></div>
                  <div><Label className="text-xs">URL</Label><Input value={selectedBlock.content.url} onChange={e => updateBlock(selectedBlock.id, { url: e.target.value })} className="h-8 text-xs mt-1" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Cor Fundo</Label><input type="color" value={selectedBlock.content.bgColor} onChange={e => updateBlock(selectedBlock.id, { bgColor: e.target.value })} className="h-8 w-full rounded cursor-pointer mt-1" /></div>
                    <div><Label className="text-xs">Cor Texto</Label><input type="color" value={selectedBlock.content.textColor} onChange={e => updateBlock(selectedBlock.id, { textColor: e.target.value })} className="h-8 w-full rounded cursor-pointer mt-1" /></div>
                  </div>
                </div>
              )}

              {selectedBlock.type === 'spacer' && (
                <div><Label className="text-xs">Altura (px)</Label><Input type="number" value={selectedBlock.content.height} onChange={e => updateBlock(selectedBlock.id, { height: e.target.value })} className="h-8 text-xs mt-1" /></div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
