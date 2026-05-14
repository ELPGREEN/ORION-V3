import { PentagonLayer, PentagonPillar } from '../types';
import { supabase } from '@/integrations/supabase/client';

export class ActionAdapter implements PentagonLayer {
  public pillar: PentagonPillar = 'action';

  public async process(input: unknown): Promise<unknown> {
    const data = input as { text: string; compressedContext: string; intent: string; routing?: { selectedProvider?: { id: string } } };
    const { data: response, error } = await supabase.functions.invoke('neural-ops', {
      body: {
        question: data.text,
        context: data.compressedContext,
        intentType: data.intent,
        provider: data.routing?.selectedProvider?.id
      }
    });
    if (error) throw error;
    return { ...data, response: response.content || '', status: 'COMPLETE' };
  }
}
