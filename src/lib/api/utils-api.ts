import { supabase } from "@/integrations/supabase/client";

export async function fetchCEP(cep: string) {
  const { data, error } = await supabase.functions.invoke("utils-api", {
    body: { action: "cep", params: { cep } },
  });
  if (error) throw error;
  return data as {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
}

export async function fetchCNPJ(cnpj: string) {
  const { data, error } = await supabase.functions.invoke("utils-api", {
    body: { action: "cnpj", params: { cnpj } },
  });
  if (error) throw error;
  return data as {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    porte: string;
    natureza_juridica: string;
    cnae_fiscal_descricao: string;
  };
}

export async function fetchCambio(from = "USD", to = "BRL", date?: string) {
  const { data, error } = await supabase.functions.invoke("utils-api", {
    body: { action: "cambio", params: { from, to, date } },
  });
  if (error) throw error;
  return data;
}

export async function fetchDicionario(word: string, lang = "pt") {
  const { data, error } = await supabase.functions.invoke("utils-api", {
    body: { action: "dicionario", params: { word, lang } },
  });
  if (error) throw error;
  return data;
}
