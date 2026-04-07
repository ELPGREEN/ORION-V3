import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { FileText, Scale, AlertTriangle, Users, Gavel, Mail, Shield, Globe } from "lucide-react";

export default function Termos() {
  return (
    <MainLayout hideFooterCta>
      <SEO title="Termos de Uso — ORION IA by ELP® Green Technology" description="Termos de uso da plataforma ORION IA. Condições gerais, propriedade intelectual ELP® PROPERTY e integração com Google API Services." image="https://www.elpgreen.com/og-images/og-termos.jpg" keywords="termos de uso, condições gerais, propriedade intelectual" />
      <section className="pt-32 pb-20 bg-background">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4 text-xs tracking-[0.3em] uppercase">
              <FileText className="h-4 w-4" />
              Termos de Uso
            </div>
            <h1 className="text-4xl font-serif text-foreground mb-4">
              Termos de <span className="text-primary">Uso</span>
            </h1>
            <p className="text-muted-foreground">
              Última atualização: 19 de março de 2026
            </p>
          </div>

          <div className="prose max-w-none dark:prose-invert space-y-8">
            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Scale className="h-5 w-5 text-primary" />
                1. Aceitação dos Termos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e utilizar o site e aplicativo da plataforma ORION by ELP Green Technology, você concorda 
                em cumprir e estar sujeito a estes Termos de Uso e à nossa{" "}
                <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>. 
                Se você não concordar com qualquer parte destes termos, não deverá utilizar nosso site ou serviços. O uso 
                continuado do site após alterações nestes termos constitui aceitação dessas mudanças.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                2. Serviços Oferecidos
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Este site e aplicativo oferecem informações e funcionalidades relacionadas aos serviços jurídicos 
                prestados pelo escritório, incluindo:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Informações sobre áreas de atuação</li>
                <li>Acesso à área do cliente mediante cadastro</li>
                <li>Agendamento de consultas online</li>
                <li>Chat jurídico com inteligência artificial</li>
                <li>Publicações e artigos jurídicos</li>
                <li>Editor de documentos jurídicos com integração ao Google Workspace</li>
                <li>Gestão de processos e andamentos</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                3. Integração com Google API Services
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Nosso aplicativo oferece integração com serviços do Google (Google Docs, Google Drive, Google Sheets) 
                para facilitar a criação e gestão de documentos jurídicos. Ao utilizar essas funcionalidades:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Você autoriza o acesso do aplicativo aos serviços do Google dentro dos escopos solicitados</li>
                <li>Os escopos de acesso são solicitados de forma mínima, apenas o necessário para cada funcionalidade</li>
                <li>Você pode revogar o acesso a qualquer momento nas <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">configurações da sua conta Google</a></li>
                <li>O uso dos dados do Google segue estritamente a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google API Services User Data Policy</a>, incluindo os requisitos de Uso Limitado</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                A integração com Google é opcional. Você pode utilizar todas as demais funcionalidades do sistema 
                sem conectar sua conta Google.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                4. Proteção de Dados e Privacidade
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                O tratamento de dados pessoais é realizado em conformidade com a Lei Geral de Proteção de 
                Dados (LGPD) e com as políticas do Google para dados de APIs. Para informações detalhadas sobre 
                coleta, uso, armazenamento e exclusão de dados, consulte nossa{" "}
                <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                5. Limitação de Responsabilidade
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                As informações disponibilizadas neste site têm caráter meramente informativo e 
                não constituem aconselhamento jurídico. O conteúdo não substitui a consulta 
                presencial com um advogado para análise do caso concreto. O escritório não se 
                responsabiliza por decisões tomadas com base exclusivamente nas informações 
                disponibilizadas neste site. Respostas geradas por inteligência artificial são 
                auxiliares e não substituem a orientação profissional de um advogado.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                6. Propriedade Intelectual — ELP® PROPERTY
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Todo o conteúdo deste site, incluindo textos, imagens, logotipos, marcas, 
                artigos, publicações, o sistema ORION IA, o motor NeuroCore, o Lumen7 Engine e o 
                sistema AquaMonkey® são de propriedade exclusiva da <strong className="text-foreground">ELP® Green Technology</strong> (CNPJ 42.501.190/0001-70), 
                protegidos por direitos autorais e propriedade intelectual. É proibida a reprodução, 
                distribuição ou modificação sem autorização prévia e expressa.
              </p>
              <div className="bg-muted/30 border border-border p-5 space-y-2">
                <p className="text-[11px] text-primary uppercase tracking-[0.2em] font-medium mb-3">Registros de Marca — INPI</p>
                <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                  <li>• Processo nº <strong className="text-foreground/80">927739054</strong> — Categoria 42 (Consultoria e Tecnologia)</li>
                  <li>• Processo nº <strong className="text-foreground/80">927739038</strong> — Categoria 40 (Tratamento de Materiais)</li>
                  <li>• Processo nº <strong className="text-foreground/80">927738945</strong> — Categoria 7 (Máquinas e Equipamentos)</li>
                  <li>• Processo nº <strong className="text-foreground/80">927738996</strong> — Categoria 35 (Publicidade e Negócios)</li>
                  <li>• Processo nº <strong className="text-foreground/80">927739089</strong> — Categoria 1 (Produtos Químicos)</li>
                </ul>
                <p className="text-[10px] text-muted-foreground/60 mt-3">
                  Copyright © 2023 ELP® Green Technology. All Rights Reserved.
                </p>
              </div>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4">
                7. Cadastro e Área do Cliente
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para acessar a área do cliente, é necessário realizar cadastro com informações 
                verdadeiras e atualizadas, seja por e-mail ou login via Google. Você é responsável 
                pela confidencialidade de suas credenciais de acesso e por todas as atividades 
                realizadas em sua conta. Comunique-nos imediatamente sobre qualquer uso não autorizado.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Gavel className="h-5 w-5 text-primary" />
                8. Lei Aplicável e Foro
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                Fica eleito o Foro da Comarca de Porto Alegre, Estado do Rio Grande do Sul, 
                para dirimir quaisquer questões oriundas destes termos, com renúncia expressa 
                a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                9. Contato
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Em caso de dúvidas sobre estes Termos de Uso, entre em contato através do e-mail: 
                <a href="mailto:info@elpgreen.com" className="text-primary hover:underline ml-1">
                info@elpgreen.com</a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
