import { useNavigate } from "react-router-dom";
import { Brain, Zap, Shield, Layers, Bot, BookOpen, ArrowRight, CheckCircle, FileText, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

const DocumentacaoRedeNeural = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <SEO
        title="Rede Neural ORION — Documentação | ELP® Green Technology"
        description="Documentação técnica da Rede Neural Conexão do sistema ORION IA. Arquitetura, módulos e capacidades. By ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-rede-neural.jpg"
        keywords="rede neural, documentação, ORION IA, arquitetura neural, ELP Green Technology"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b border-border print:bg-white print:border-gray-300">
        <div className="container mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-2 text-muted-foreground hover:text-foreground print:hidden">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Rede Neural "Conexão"</h1>
                <p className="text-muted-foreground">Documentação Técnica v2.0</p>
              </div>
            </div>
            <Button onClick={() => window.print()} className="print:hidden">
              <FileText className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* 1. Visão Geral */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            1. Visão Geral
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                A Rede Neural "Conexão" é um sistema proprietário de inteligência artificial
                projetado para potencializar operações empresariais através de busca semântica,
                geração inteligente de documentos, raciocínio avançado e aprendizado contínuo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Brain, title: "Raciocínio Neural", desc: "Múltiplas camadas de inteligência" },
                  { icon: FileText, title: "Documentos IA", desc: "Geração automática profissional" },
                  { icon: Zap, title: "Aprendizado", desc: "Melhoria contínua autônoma" },
                  { icon: Bot, title: "Multi-IA", desc: "Motor neural proprietário multicamada" },
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

        {/* 2. Arquitetura */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            2. Arquitetura em Camadas
          </h2>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Diagrama de Arquitetura Conceitual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Camada de Apresentação */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-3">CAMADA DE APRESENTAÇÃO</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Assistente IA", "Pesquisa Semântica", "Geração de Documentos", "Painel de Controle"].map((item, i) => (
                      <div key={i} className="p-3 bg-background rounded border text-center text-sm font-medium">{item}</div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camada de Orquestração */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-3">CAMADA DE ORQUESTRAÇÃO</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-background rounded border text-center text-sm">Roteamento Inteligente</div>
                    <div className="p-3 bg-background rounded border text-center text-sm">Gestão de Contexto</div>
                    <div className="p-3 bg-background rounded border text-center text-sm">Seleção de Motor</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camadas Neurais */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-bold text-green-600 dark:text-green-400 mb-3">CAMADAS NEURAIS DE IA</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: "Camada Alpha", role: "Raciocínio Rápido", priority: "1" },
                      { name: "Camada Beta", role: "Análise Profunda", priority: "2" },
                      { name: "Camada Gamma", role: "Raciocínio Lógico", priority: "3" },
                      { name: "Camada Delta", role: "Especialista", priority: "4" },
                    ].map((p, i) => (
                      <div key={i} className="p-3 bg-background rounded border text-center">
                        <Badge variant="outline" className="mb-2">P{p.priority}</Badge>
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.role}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                </div>

                {/* Camada de Dados */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-3">CAMADA DE DADOS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: "Base Neural", items: ["Conhecimento estruturado", "Especializações treináveis", "Dados de aprendizado"] },
                      { title: "Base Semântica", items: ["Embeddings vetoriais", "Cache inteligente", "Índices otimizados"] },
                      { title: "Configuração", items: ["Gestão de motores", "Métricas de performance", "Parâmetros do sistema"] },
                    ].map((group, i) => (
                      <div key={i} className="p-3 bg-background rounded border">
                        <div className="font-semibold text-sm mb-2">{group.title}</div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {group.items.map((item, j) => <li key={j}>• {item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* 3. Fluxo de Documentos */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            3. Fluxo de Geração de Documentos
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 overflow-x-auto pb-4">
                {[
                  { step: "1", title: "Entrada", desc: "Dados do usuário" },
                  { step: "2", title: "Validação", desc: "Verificação de dados" },
                  { step: "3", title: "Processamento", desc: "Motor neural ativo" },
                  { step: "4", title: "Enriquecimento", desc: "Contexto semântico" },
                  { step: "5", title: "Geração", desc: "IA gera documento" },
                  { step: "6", title: "Entrega", desc: "Documento formatado" },
                ].map((item, i, arr) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center min-w-[100px]">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{item.step}</div>
                      <div className="mt-2 text-center">
                        <div className="font-semibold text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* 4. Sistema de Fallback */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            4. Alta Disponibilidade & Fallback
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
                  Se um motor falhar, o sistema automaticamente tenta o próximo na ordem de prioridade — disponibilidade 99.9%
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="print:border-gray-300" />

        {/* 5. Capacidades do Sistema */}
        <section className="page-break-before print:break-before-page">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            5. Capacidades do Motor Neural
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "Orquestração Inteligente",
                desc: "Sistema central de roteamento e decisão para todas as operações de IA",
                features: ["Seleção dinâmica de motor", "Gestão de contexto neural", "Fallback automático", "Otimização de custos"]
              },
              {
                name: "Aprendizado Contínuo",
                desc: "Mecanismo de auto-melhoria baseado em feedback e interações",
                features: ["Captura de conhecimento", "Criação de especializações", "Processamento de feedback", "Indexação semântica"]
              },
              {
                name: "Geração de Documentos",
                desc: "Criação automatizada de documentos profissionais com IA",
                features: ["Contexto semântico", "Formatação profissional", "Citações verificadas", "100+ tipos suportados"]
              },
              {
                name: "Assistente Inteligente",
                desc: "Chat interativo com raciocínio avançado e memória contextual",
                features: ["Raciocínio multicamada", "Memória de conversa", "Aprendizado contínuo", "Personalidade adaptativa"]
              },
            ].map((cap, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary">{cap.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{cap.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {cap.features.map((f, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="print:border-gray-300" />

        {/* 6. Segurança */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            6. Segurança & Compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Controle de Acesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Políticas de acesso granulares por função",
                  "Isolamento completo entre organizações",
                  "Auditoria de todas as operações",
                  "Controle baseado em papéis (RBAC)",
                  "Dados criptografados em repouso e trânsito",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{item}</span>
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
                  "Chaves de API criptografadas e rotacionadas",
                  "Ambientes isolados por serviço",
                  "Rate limiting e proteção DDoS",
                  "Autenticação JWT com validação em runtime",
                  "Gestão de segredos em cofre seguro",
                  "Conformidade LGPD, GDPR e AI Act"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="print:border-gray-300" />

        {/* 7. Ciclo de Aprendizado */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            7. Ciclo de Aprendizado Contínuo
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="w-12 h-12 bg-blue-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">1</div>
                  <h4 className="font-bold mb-2">CAPTURA</h4>
                  <p className="text-sm text-muted-foreground">
                    Todas as interações são registradas automaticamente para análise e melhoria contínua
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <div className="w-12 h-12 bg-purple-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">2</div>
                  <h4 className="font-bold mb-2">ANÁLISE</h4>
                  <p className="text-sm text-muted-foreground">
                    Feedback do usuário alimenta o motor de qualidade — respostas de alta qualidade são internalizadas
                  </p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="w-12 h-12 bg-green-500 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3">3</div>
                  <h4 className="font-bold mb-2">INTEGRAÇÃO</h4>
                  <p className="text-sm text-muted-foreground">
                    Conhecimento aprendido enriquece a base semântica e melhora todas as futuras respostas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground print:border-gray-300">
          <p>ORION IA by ELP® Green Technology — Rede Neural "Conexão" v2.0</p>
          <p>© {new Date().getFullYear()} ELP® Green Technology S.R.L. — Todos os direitos reservados</p>
          <p className="text-xs mt-2 text-muted-foreground/60">Informações proprietárias — Reprodução proibida sem autorização</p>
        </div>
      </div>

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
