import { Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

interface AITipCardProps {
  subject: string;
  htmlContent: string;
  recipientCount: number;
}

interface Tip {
  type: 'success' | 'warning' | 'info';
  text: string;
}

export default function AITipCard({ subject, htmlContent, recipientCount }: AITipCardProps) {
  const tips = useMemo(() => {
    const results: Tip[] = [];

    // Subject analysis
    if (subject.length > 0 && subject.length <= 50) {
      results.push({ type: 'success', text: `Assunto com ${subject.length} caracteres — tamanho ideal para mobile.` });
    } else if (subject.length > 50 && subject.length <= 70) {
      results.push({ type: 'info', text: `Assunto com ${subject.length} caracteres — pode ser cortado em mobile. Tente abaixo de 50.` });
    } else if (subject.length > 70) {
      results.push({ type: 'warning', text: `Assunto muito longo (${subject.length} chars). Será cortado na maioria dos dispositivos.` });
    }

    if (subject && /[🎉🚀✅🎁⭐💰❤️🔥]/.test(subject)) {
      results.push({ type: 'success', text: 'Emoji no assunto pode aumentar a taxa de abertura em até 15%.' });
    }

    if (subject && !subject.includes('!') && !/[🎉🚀✅🎁⭐💰❤️🔥]/.test(subject)) {
      results.push({ type: 'info', text: 'Considere adicionar um emoji ou pontuação para destacar na caixa de entrada.' });
    }

    // Content analysis
    if (htmlContent.length > 0) {
      const hasButton = htmlContent.includes('<a ') && htmlContent.includes('style=');
      if (hasButton) {
        results.push({ type: 'success', text: 'CTA (botão) detectado — essencial para conversão.' });
      } else {
        results.push({ type: 'warning', text: 'Nenhum botão de ação detectado. Adicione um CTA claro.' });
      }

      const hasImage = htmlContent.includes('<img ');
      if (hasImage) {
        results.push({ type: 'info', text: 'Imagens presentes. Adicione alt text para acessibilidade.' });
      }

      if (htmlContent.length > 10000) {
        results.push({ type: 'warning', text: 'Email muito extenso. Emails curtos têm maior taxa de leitura.' });
      }
    }

    // Recipients
    if (recipientCount > 0 && recipientCount <= 50) {
      results.push({ type: 'success', text: `${recipientCount} destinatários — boa segmentação para campanha.` });
    } else if (recipientCount > 50) {
      results.push({ type: 'info', text: `${recipientCount} destinatários — campanha em massa. Monitore as métricas.` });
    }

    if (results.length === 0) {
      results.push({ type: 'info', text: 'Preencha mais dados para receber dicas de otimização.' });
    }

    return results;
  }, [subject, htmlContent, recipientCount]);

  const getIcon = (type: Tip['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'info': return <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Dicas IA</span>
          <Badge variant="outline" className="text-[10px]">Análise automática</Badge>
        </div>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              {getIcon(tip.type)}
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
