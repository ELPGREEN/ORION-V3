import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  content?: string;
  citations?: string[];
};

type SearchOptions = {
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  scrapeOptions?: { formats?: ('markdown' | 'html')[] };
};

export const firecrawlApi = {
  async search(query: string, options?: SearchOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-search', {
      body: { query, options },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async webSearch(query: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('pesquisa-unificada', {
      body: { query, sources: ['web'] },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },
};
