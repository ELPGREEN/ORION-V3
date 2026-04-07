import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Search, ShoppingCart, UserPlus, Gift, Bell, Star, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  category: string;
  description: string;
  icon: React.ElementType;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    subject: '🎉 Bem-vindo(a) à nossa comunidade!',
    category: 'onboarding',
    description: 'Email de boas-vindas para novos clientes',
    icon: UserPlus,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><h1 style="color:#1e293b;font-size:24px;margin:0 0 16px">Bem-vindo(a)! 🎉</h1><p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px">Estamos muito felizes em ter você conosco. Sua jornada de sucesso começa agora!</p><a href="#" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Começar Agora</a><p style="color:#94a3b8;font-size:14px;margin:32px 0 0">Se tiver dúvidas, responda este email.</p></div></div></body></html>`,
  },
  {
    id: 'purchase_confirmation',
    name: 'Confirmação de Compra',
    subject: '✅ Compra confirmada! Acesse seu produto',
    category: 'transacional',
    description: 'Confirmação automática após compra',
    icon: ShoppingCart,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><div style="text-align:center;margin-bottom:24px"><div style="display:inline-block;background:#dcfce7;border-radius:50%;padding:16px"><span style="font-size:32px">✅</span></div></div><h1 style="color:#1e293b;font-size:24px;margin:0 0 16px;text-align:center">Compra Confirmada!</h1><p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">Seu pagamento foi processado com sucesso. Acesse seu produto agora.</p><div style="text-align:center"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Acessar Produto</a></div></div></div></body></html>`,
  },
  {
    id: 'upsell',
    name: 'Oferta Especial (Upsell)',
    subject: '🎁 Oferta exclusiva para você!',
    category: 'marketing',
    description: 'Oferta de upsell pós-compra',
    icon: Gift,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.2)"><h1 style="color:#fff;font-size:28px;margin:0 0 8px;text-align:center">🎁 Oferta Exclusiva</h1><p style="color:#c7d2fe;font-size:14px;text-align:center;margin:0 0 24px">Somente para quem já é cliente</p><div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:24px;margin:0 0 24px"><p style="color:#e0e7ff;font-size:16px;line-height:1.6;margin:0">Como agradecimento pela sua confiança, preparamos uma oferta especial com <strong style="color:#fbbf24">50% de desconto</strong> no nosso produto premium.</p></div><div style="text-align:center"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1e1b4b;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">APROVEITAR OFERTA →</a></div><p style="color:#818cf8;font-size:12px;text-align:center;margin:24px 0 0">Oferta válida por 48 horas</p></div></div></body></html>`,
  },
  {
    id: 'abandoned_cart',
    name: 'Carrinho Abandonado',
    subject: '😕 Você esqueceu algo...',
    category: 'automação',
    description: 'Recuperação de carrinho abandonado',
    icon: Bell,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><h1 style="color:#1e293b;font-size:24px;margin:0 0 16px">Esqueceu algo? 😕</h1><p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px">Notamos que você deixou itens no carrinho. Finalize sua compra antes que a oferta expire!</p><div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 24px"><p style="color:#92400e;font-size:14px;margin:0;font-weight:600">⏰ Sua oferta expira em 24 horas!</p></div><a href="#" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Finalizar Compra</a></div></div></body></html>`,
  },
  {
    id: 'review_request',
    name: 'Pedir Avaliação',
    subject: '⭐ O que achou do produto?',
    category: 'engajamento',
    description: 'Solicitar avaliação após entrega',
    icon: Star,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><h1 style="color:#1e293b;font-size:24px;margin:0 0 16px;text-align:center">Como foi sua experiência? ⭐</h1><p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">Sua opinião é muito importante! Deixe uma avaliação e ajude outros clientes.</p><div style="text-align:center;margin:0 0 24px"><span style="font-size:40px">⭐⭐⭐⭐⭐</span></div><div style="text-align:center"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#eab308);color:#1e1b4b;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Deixar Avaliação</a></div></div></div></body></html>`,
  },
  {
    id: 'launch',
    name: 'Lançamento',
    subject: '🚀 NOVIDADE: Produto novo no ar!',
    category: 'marketing',
    description: 'Anúncio de lançamento de produto',
    icon: Rocket,
    html_content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:12px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.3)"><div style="text-align:center;margin-bottom:24px"><span style="font-size:48px">🚀</span></div><h1 style="color:#fff;font-size:28px;margin:0 0 8px;text-align:center">Lançamento Exclusivo!</h1><p style="color:#94a3b8;font-size:16px;text-align:center;margin:0 0 24px">Nosso novo produto acaba de ser lançado. Seja um dos primeiros a garantir!</p><div style="text-align:center"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px">GARANTIR AGORA →</a></div><p style="color:#64748b;font-size:12px;text-align:center;margin:24px 0 0">Vagas limitadas • Primeiro lote com desconto</p></div></div></body></html>`,
  },
];

const CATEGORIES = ['todos', 'onboarding', 'transacional', 'marketing', 'automação', 'engajamento'];

interface EmailTemplateLibraryProps {
  onSelectTemplate: (template: EmailTemplate) => void;
}

export default function EmailTemplateLibrary({ onSelectTemplate }: EmailTemplateLibraryProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todos');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = TEMPLATES.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'todos' || t.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar templates..." className="pl-9 bg-muted/50" />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)} className="capitalize text-xs">
            {cat}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(template => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className={cn("border-border/50 hover:border-primary/40 transition-all cursor-pointer group", previewId === template.id && "border-primary/60 ring-1 ring-primary/20")}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{template.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{template.category}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewId(previewId === template.id ? null : template.id); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <p className="text-xs text-muted-foreground/80 truncate italic">Assunto: {template.subject}</p>

                  {previewId === template.id && (
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <iframe srcDoc={template.html_content} className="w-full h-[200px] border-0" title={`Preview ${template.name}`} />
                    </div>
                  )}

                  <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => onSelectTemplate(template)}>
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}


