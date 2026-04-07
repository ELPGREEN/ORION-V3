import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Shield, Database, UserCheck, Lock, FileSearch, Mail, AlertCircle } from "lucide-react";

export default function LGPD() {
  return (
    <MainLayout hideFooterCta>
      <SEO title="LGPD | Proteção de Dados — ELP® Green Technology" description="Compromisso da ELP® Green Technology com a LGPD e GDPR. Transparência no tratamento de dados pessoais na plataforma ORION IA." image="https://www.iasofthub.com/og-images/og-lgpd.jpg" keywords="LGPD, proteção de dados, GDPR, privacidade, compliance" />
      <section className="pt-32 pb-20 bg-background">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4 text-xs tracking-[0.3em] uppercase">
              <Shield className="h-4 w-4" />
              LGPD
            </div>
            <h1 className="text-4xl font-serif text-foreground mb-4">
              Lei Geral de <span className="text-primary">Proteção de Dados</span>
            </h1>
            <p className="text-muted-foreground">
              Compromisso com a Lei nº 13.709/2018
            </p>
          </div>

          <div className="prose max-w-none dark:prose-invert space-y-8">
            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                O que é a LGPD?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) é a legislação 
                brasileira que regula as atividades de tratamento de dados pessoais. Inspirada 
                no Regulamento Geral de Proteção de Dados europeu (GDPR), a LGPD estabelece 
                regras sobre coleta, armazenamento, tratamento e compartilhamento de dados 
                pessoais, impondo mais proteção e penalidades para o não cumprimento.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-primary" />
                Nosso Compromisso
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O escritório ELP Green Technology está comprometido com a conformidade à LGPD 
                e adota as seguintes práticas:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Tratamento de dados apenas para finalidades legítimas e informadas</li>
                <li>Coleta mínima de dados, limitada ao necessário</li>
                <li>Transparência sobre como seus dados são utilizados</li>
                <li>Medidas de segurança técnicas e administrativas adequadas</li>
                <li>Respeito aos direitos dos titulares de dados</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                Bases Legais para Tratamento
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Tratamos seus dados pessoais com base nas seguintes hipóteses legais previstas 
                na LGPD:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Execução de contrato:</strong> para prestação dos serviços jurídicos contratados</li>
                <li><strong>Cumprimento de obrigação legal:</strong> obrigações impostas por lei ou regulamentos</li>
                <li><strong>Exercício regular de direitos:</strong> em processos judiciais ou administrativos</li>
                <li><strong>Legítimo interesse:</strong> para melhoria de nossos serviços</li>
                <li><strong>Consentimento:</strong> quando aplicável, para finalidades específicas</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <FileSearch className="h-5 w-5 text-primary" />
                Seus Direitos como Titular
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A LGPD garante aos titulares de dados os seguintes direitos:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Confirmação e Acesso</h4>
                  <p className="text-sm text-muted-foreground">
                    Saber se tratamos seus dados e acessá-los
                  </p>
                </div>
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Correção</h4>
                  <p className="text-sm text-muted-foreground">
                    Corrigir dados incompletos ou desatualizados
                  </p>
                </div>
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Eliminação</h4>
                  <p className="text-sm text-muted-foreground">
                    Solicitar exclusão de dados desnecessários
                  </p>
                </div>
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Portabilidade</h4>
                  <p className="text-sm text-muted-foreground">
                    Receber seus dados em formato estruturado
                  </p>
                </div>
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Revogação</h4>
                  <p className="text-sm text-muted-foreground">
                    Revogar consentimento a qualquer momento
                  </p>
                </div>
                <div className="bg-muted/30 p-4">
                  <h4 className="text-foreground font-medium mb-2">Oposição</h4>
                  <p className="text-sm text-muted-foreground">
                    Opor-se a tratamento irregular
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                Sigilo Profissional
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Além das obrigações impostas pela LGPD, o escritório está sujeito ao dever de 
                sigilo profissional previsto no Estatuto da Advocacia (Lei nº 8.906/1994) e no 
                Código de Ética e Disciplina da OAB. As informações confiadas por clientes são 
                protegidas pelo sigilo profissional, que é inviolável, constituindo direito e 
                dever do advogado.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                Encarregado de Dados (DPO)
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas relacionadas à LGPD, entre em 
                contato com nosso Encarregado de Proteção de Dados:
              </p>
              <div className="mt-4 p-4 bg-muted/30">
                <p className="text-foreground font-medium">ELP® Green Technology</p>
                <p className="text-muted-foreground text-sm">Encarregado de Proteção de Dados</p>
                <a href="mailto:info@iasofthub.com" className="text-primary hover:underline text-sm">
                  info@elpgreen.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
