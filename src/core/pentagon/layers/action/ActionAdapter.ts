import { PentagonLayer, PentagonPillar } from '../types';
import { supabase } from '@/integrations/supabase/client';

export class ActionAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'action';

  public async process(input: any): Promise<unknown> {
    const { data, error } = await supabase.functions.invoke('neural-ops', {
      body: {
        question: input.text,
        context: input.compressedContext,
        intentType: input.intent,
        provider: input.routing?.selectedProvider?.id
      }
    });
    if (error) throw error;
    return { ...input, response: data.content || '', status: 'COMPLETE' };
  }
}
