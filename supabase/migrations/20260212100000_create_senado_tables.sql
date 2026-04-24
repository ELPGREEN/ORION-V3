-- Create Senado data tables

CREATE TABLE IF NOT EXISTS public."Contrato" (
    "CODIGO" bigint,
    "NUMERO_FORMATADO" text,
    "NUMERO" bigint,
    "FUNDAMENTACAO_LEGAL" text,
    "DATA_ATUALIZACAO" text,
    "UNIDADE_GESTORA" text,
    "LICITACAO" text,
    "SUBESPECIE" text,
    "INICIO_VIGENCIA" text,
    "DATA_ASSINATURA" text,
    "DATA_PUBLICACAO" text,
    "FIM_VIGENCIA" text,
    "OBJETO" text,
    "MAO_DE_OBRA" boolean,
    "EMPRESA" text
);

ALTER TABLE public."Contrato" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.avencas (
    "CODIGO" bigint,
    "NUMERO" bigint,
    "FUNDAMENTACAO_LEGAL" text,
    "DATA_ATUALIZACAO" text,
    "GESTORES" text,
    "LICITACAO" bigint,
    "SUBESPECIE" text,
    "INICIO_VIGENCIA" text,
    "DATA_ASSINATURA" text,
    "DATA_PUBLICACAO" text,
    "FIM_VIGENCIA" text,
    "OBJETO" text,
    "MAO_DE_OBRA" boolean,
    "EMPRESA" text
);

ALTER TABLE public.avencas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."banco de dados senado" (
    "nom_categoria" text,
    "nom_sub_categoria" text,
    "des_grupo_dados" text,
    "cod_orgao_responsavel" text,
    "nom_orgao_responsavel" text,
    "nom_conjunto_dados" text,
    "des_conjunto_dados" text,
    "txt_url" text,
    "des_frequencia_atualizacao" text,
    "dth_ultima_atualizacao" text,
    "nom_dicionario_dados" text,
    "des_dicionario_dados" text,
    "des_tipo_campo" text,
    "num_ordem" text
);

ALTER TABLE public."banco de dados senado" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."empresa contratadas" (
    "CODIGO" bigint,
    "CNPJ_CPF" text,
    "NOME" text
);

ALTER TABLE public."empresa contratadas" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."licitações" (
    "CODIGO" bigint,
    "CNPJ_CPF" text,
    "NOME" text
);

ALTER TABLE public."licitações" ENABLE ROW LEVEL SECURITY;
