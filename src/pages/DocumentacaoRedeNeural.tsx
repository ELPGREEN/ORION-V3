import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Database, Zap, Shield, GitBranch, Layers, Server, Bot, BookOpen, ArrowRight, CheckCircle, Settings, FileText, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

const DocumentacaoRedeNeural = () => {
  const navigate = useNavigate();


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <SEO
        title="Rede Neural ORION — Documentação | ELP® Green Technology"
        description="Documentação técnica da Rede Neural Conexão do sistema ORION IA. Arquitetura, módulos e APIs. By ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-rede-neural.jpg"
        keywords="rede neural, documentação, ORION IA, arquitetura neural, API, ELP Green Technology"
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b border-border print:bg-white print:border-gray-300">
        <div className="container mx-auto px-6 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground print:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Rede Neural "Conexão"</h1>
                <p className="text-muted-foreground">Documentação Técnica v1.0.0</p>
              </div>
            </div>
            <Button onClick={handlePrint} className="print:hidden">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Visão Geral */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            1. Visão Geral
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                A Rede Neural "Conexão" é um sistema integrado de inteligência artificial 
                projetado para potencializar operações jurídicas através de busca semântica, 
                geração inteligente de documentos e aprendizado contínuo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Database, title: "Jurisprudência", desc: "STF, STJ, TST, TJ-RS" },
                  { icon: FileText, title: "Documentos", desc: "Geração automática" },
                  { icon: Brain, title: "Aprendizado", desc: "Melhoria contínua" },
                  { icon: Bot, title: "Multi-IA", desc: "Motor neural proprietário multicamadas" },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-muted/50 rounded-lg">
                    <item.icon className="h-8 w-8 text-primary mb-2" />
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Arquitetura */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            2. Arquitetura do Sistema
          </h2>
          
          {/* Diagrama Visual */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Diagrama de Arquitetura em Camadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Camada de Apresentação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-3">CAMADA DE APRESENTAÇÃO</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Chat IA Jurídico", "Pesquisa Jurisprud.", "Geração Documentos", "Painel Admin"].map((item, i) => (
                      <div key={i} className="p-3 bg-background rounded border text-center text-sm font-medium">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seta */}
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camada de Orquestração */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-3">CAMADA DE ORQUESTRAÇÃO</h4>
                  <div className="flex justify-center">
                    <div className="p-4 bg-background rounded border text-center">
                      <Server className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="font-bold">AI ORCHESTRATOR</div>
                      <div className="text-sm text-muted-foreground">Edge Function Central</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-2 bg-background rounded border text-center text-sm">Context Fetcher</div>
                    <div className="p-2 bg-background rounded border text-center text-sm">Neural Training</div>
                    <div className="p-2 bg-background rounded border text-center text-sm">Provider Selector</div>
                  </div>
                </div>

                {/* Seta */}
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camada de Provedores */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-bold text-green-600 dark:text-green-400 mb-3">CAMADAS NEURAIS DE IA</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: "Camada Alpha", model: "Raciocínio Rápido", priority: "1" },
                      { name: "Camada Beta", model: "Análise Profunda", priority: "2" },
                      { name: "Camada Gamma", model: "Raciocínio Lógico", priority: "3" },
                      { name: "Camada Delta", model: "Especialista", priority: "4" },
                    ].map((p, i) => (
                      <div key={i} className="p-3 bg-background rounded border text-center">
                        <Badge variant="outline" className="mb-2">P{p.priority}</Badge>
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.model}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seta */}
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camada de Dados */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-3">CAMADA DE DADOS (SUPABASE)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded border">
                      <Database className="h-6 w-6 text-amber-500 mb-2" />
                      <div className="font-semibold text-sm">Rede Neural</div>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• neural_knowledge_base</li>
                        <li>• neural_specializations</li>
                        <li>• neural_learning_data</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-background rounded border">
                      <Database className="h-6 w-6 text-amber-500 mb-2" />
                      <div className="font-semibold text-sm">Jurisprudência</div>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• legal_embeddings</li>
                        <li>• api_cache</li>
                        <li>• query_embedding_cache</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-background rounded border">
                      <Database className="h-6 w-6 text-amber-500 mb-2" />
                      <div className="font-semibold text-sm">Configuração</div>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• ai_providers</li>
                        <li>• ai_metrics</li>
                        <li>• escritorio_config</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Fluxo de Dados */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            3. Fluxo de Geração de Documentos
          </h2>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 overflow-x-auto pb-4">
                {[
                  { step: "1", title: "Usuário", desc: "Preenche formulário" },
                  { step: "2", title: "Frontend", desc: "Envia requisição" },
                  { step: "3", title: "Edge Function", desc: "Processa dados" },
                  { step: "4", title: "Contexto Neural", desc: "Busca jurisprudência" },
                  { step: "5", title: "Provedor IA", desc: "Gera documento" },
                  { step: "6", title: "Resposta", desc: "Retorna documento" },
                ].map((item, i, arr) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center min-w-[100px]">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {item.step}
                      </div>
                      <div className="mt-2 text-center">
                        <div className="font-semibold text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Sistema de Fallback */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            4. Sistema de Fallback de IA
          </h2>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="font-semibold">Requisição de IA</div>
                </div>
                
                {[
                  { name: "Camada Alpha — Raciocínio Rápido", priority: 1, color: "bg-blue-500" },
                  { name: "Camada Beta — Análise Profunda", priority: 2, color: "bg-purple-500" },
                  { name: "Camada Gamma — Raciocínio Lógico", priority: 3, color: "bg-amber-500" },
                  { name: "Camada Delta — Especialista", priority: 4, color: "bg-green-500" },
                ].map((provider, i) => (
                  <div key={i} className="flex items-center gap-4 w-full max-w-lg">
                    <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                    <div className="flex-1 p-4 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                        <span className="font-medium">{provider.name}</span>
                        <Badge variant="secondary">Prioridade {provider.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Sucesso</span>
                        <ArrowRight className="h-4 w-4" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="text-sm text-muted-foreground mt-2">
                  Se um provedor falhar, o sistema automaticamente tenta o próximo na ordem de prioridade
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Tabelas do Banco */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            5. Estrutura do Banco de Dados
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "neural_knowledge_base",
                desc: "Base de conhecimento com embeddings vetoriais",
                columns: ["id (UUID)", "title (TEXT)", "content (TEXT)", "source_type (TEXT)", "embedding (VECTOR 768)", "is_processed (BOOL)"]
              },
              {
                name: "neural_specializations",
                desc: "Especializações treináveis da rede neural",
                columns: ["id (UUID)", "name (TEXT)", "category (TEXT)", "training_data (JSONB)", "training_status (TEXT)", "accuracy_score (NUMERIC)"]
              },
              {
                name: "neural_learning_data",
                desc: "Dados de aprendizado contínuo",
                columns: ["id (UUID)", "interaction_type (TEXT)", "input_text (TEXT)", "output_text (TEXT)", "quality_score (NUMERIC)", "learned (BOOL)"]
              },
              {
                name: "legal_embeddings",
                desc: "Jurisprudência indexada com vetores",
                columns: ["id (UUID)", "title (TEXT)", "source (TEXT)", "content_type (TEXT)", "embedding (VECTOR 768)", "published_date (TEXT)"]
              },
              {
                name: "ai_providers",
                desc: "Configuração dos provedores de IA",
                columns: ["id (UUID)", "provider_name (TEXT)", "is_enabled (BOOL)", "priority (INT)", "use_for (JSONB)", "fallback_to (TEXT)"]
              },
              {
                name: "ai_metrics",
                desc: "Métricas de performance das IAs",
                columns: ["id (UUID)", "provider (TEXT)", "total_duration_ms (INT)", "success (BOOL)", "tokens_estimated (INT)", "complexity (TEXT)"]
              },
            ].map((table, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono text-primary">{table.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{table.desc}</p>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-1 font-mono">
                    {table.columns.map((col, j) => (
                      <li key={j} className="text-muted-foreground">• {col}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Edge Functions */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            6. Edge Functions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "ai-orchestrator",
                path: "supabase/functions/ai-orchestrator/index.ts",
                desc: "Orquestração central de todas as chamadas de IA",
                features: ["Busca contexto neural", "Seleciona provedor", "Gerencia fallback", "Registra aprendizado"]
              },
              {
                name: "neural-training",
                path: "supabase/functions/neural-training/index.ts",
                desc: "Gerenciamento do aprendizado da rede neural",
                features: ["add_knowledge", "create_specialization", "process_feedback", "generate_embedding"]
              },
              {
                name: "gerar-documento",
                path: "supabase/functions/gerar-documento/index.ts",
                desc: "Geração de documentos jurídicos com IA",
                features: ["Busca jurisprudência", "Formatação profissional", "Citações reais", "Fallback automático"]
              },
              {
                name: "chat-juridico",
                path: "supabase/functions/chat-juridico/index.ts",
                desc: "Chat interativo com contexto jurídico",
                features: ["Contexto neural", "Histórico de conversas", "Aprendizado contínuo", "Multi-provedor"]
              },
            ].map((fn, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono text-green-600 dark:text-green-400">{fn.name}</CardTitle>
                  <p className="text-xs font-mono text-muted-foreground">{fn.path}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{fn.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {fn.features.map((f, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Segurança */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            7. Segurança e RLS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Políticas RLS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { table: "neural_knowledge_base", policy: "Advogados podem CRUD completo" },
                  { table: "neural_specializations", policy: "Apenas advogados podem gerenciar" },
                  { table: "neural_learning_data", policy: "Service role INSERT/UPDATE" },
                  { table: "ai_providers", policy: "Apenas advogados podem gerenciar" },
                  { table: "legal_embeddings", policy: "Leitura pública, escrita service role" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <span className="font-mono text-sm text-primary">{item.table}</span>
                      <p className="text-xs text-muted-foreground">{item.policy}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Infraestrutura de Segurança</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Chaves de API criptografadas",
                  "Service Role isolado",
                  "Rate limiting por usuário",
                  "Tokens JWT validados em runtime",
                  "Secrets gerenciados via Vault"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="print:border-gray-300" />

        {/* Aprendizado Contínuo */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            8. Ciclo de Aprendizado Contínuo
          </h2>
          
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="w-12 h-12 bg-blue-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">
                    1
                  </div>
                  <h4 className="font-bold mb-2">CAPTURA</h4>
                  <p className="text-sm text-muted-foreground">
                    Todas as interações são logadas automaticamente na tabela neural_learning_data
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <div className="w-12 h-12 bg-purple-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">
                    2
                  </div>
                  <h4 className="font-bold mb-2">ANÁLISE</h4>
                  <p className="text-sm text-muted-foreground">
                    Feedback do usuário define quality_score. Score ≥ 0.7 marca como "learned"
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="w-12 h-12 bg-green-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">
                    3
                  </div>
                  <h4 className="font-bold mb-2">INTEGRAÇÃO</h4>
                  <p className="text-sm text-muted-foreground">
                    Conhecimento aprendido enriquece embeddings e melhora futuras respostas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground print:border-gray-300">
          <p>ORION IA by ELP Green Technology - Rede Neural "Conexão" v1.0.0</p>
          <p>Última atualização: 08/02/2026</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break-before { page-break-before: always; }
        }
      `}</style>
    </div>
  );
};

export default DocumentacaoRedeNeural;
