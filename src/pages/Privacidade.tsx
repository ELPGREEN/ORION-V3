import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Shield, Lock, Eye, FileText, Mail, Trash2, Database, Globe, AlertTriangle, Users, RefreshCw } from "lucide-react";

export default function Privacidade() {
  return (
    <MainLayout hideFooterCta>
      <SEO title="Política de Privacidade — ORION IA by ELP® Green Technology" description="Como a ELP® Green Technology protege seus dados em conformidade com LGPD, GDPR e Google API Services User Data Policy." image="https://www.elpgreen.com/og-images/og-privacidade.jpg" keywords="privacidade, proteção de dados, LGPD, GDPR" />
      <section className="pt-32 pb-20 bg-background">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4 text-xs tracking-[0.3em] uppercase">
              <Shield className="h-4 w-4" />
              Política de Privacidade
            </div>
            <h1 className="text-4xl font-serif text-foreground mb-4">
              Política de <span className="text-primary">Privacidade</span>
            </h1>
            <p className="text-muted-foreground">
              Última atualização: 20 de março de 2026
            </p>
          </div>

          {/* App & Organization identification */}
          <div className="bg-primary/5 border border-primary/20 p-6 mb-8 text-sm text-muted-foreground leading-relaxed">
            <p>
              Esta Política de Privacidade se aplica ao site <strong className="text-foreground">elpgreen.com</strong> e 
              à plataforma <strong className="text-foreground">ORION IA</strong>, 
              desenvolvida e mantida por <strong className="text-foreground">ELP Green Technology S.R.L.</strong> (VAT IT02712340062), 
              com sede em Alessandria, Itália.
            </p>
          </div>

          <div className="prose max-w-none dark:prose-invert space-y-8">
            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                1. Introdução
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A ELP Green Technology S.R.L. ("nós", "nosso" ou "ORION") está comprometida 
                em proteger a privacidade e os dados pessoais de nossos clientes, visitantes do site e 
                usuários de nossos serviços. Esta Política de Privacidade explica como coletamos, usamos, 
                armazenamos, compartilhamos e protegemos suas informações pessoais, em conformidade com a Lei Geral 
                de Proteção de Dados (Lei nº 13.709/2018 - LGPD) e com a{" "}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google API Services User Data Policy
                </a>, 
                incluindo os requisitos de Uso Limitado (Limited Use).
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                2. Dados Coletados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Coletamos os seguintes tipos de dados pessoais:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Dados de identificação:</strong> nome completo, CPF, RG, data de nascimento</li>
                <li><strong>Dados de contato:</strong> endereço, telefone, e-mail</li>
                <li><strong>Dados profissionais:</strong> profissão, empresa, cargo</li>
                <li><strong>Dados processuais:</strong> informações relacionadas a processos judiciais</li>
                <li><strong>Dados de navegação:</strong> endereço IP, cookies, páginas visitadas</li>
                <li><strong>Dados de conta Google (quando autorizado):</strong> nome, endereço de e-mail, foto de perfil associados à sua conta Google</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                3. Uso de Dados do Google API Services
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Nosso aplicativo utiliza Google API Services para permitir a integração com serviços do Google Workspace. 
                O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo 
                seguirão a{" "}
                <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google API Services User Data Policy
                </a>, incluindo os requisitos de Uso Limitado.
              </p>

              <h3 className="text-lg font-serif text-foreground mb-3 mt-6">3.1 Escopos solicitados e sua finalidade</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Os escopos de acesso são solicitados de forma <strong>incremental e mínima</strong> — apenas quando o usuário acessa 
                a funcionalidade correspondente. Os escopos utilizados são:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>userinfo.email, userinfo.profile:</strong> Identificar o usuário para login via Google e personalização da experiência</li>
                <li><strong>documents (Google Docs):</strong> Criar e editar documentos jurídicos diretamente no Google Docs a partir do editor do sistema</li>
                <li><strong>drive (Google Drive):</strong> Salvar, acessar e organizar documentos criados pelo aplicativo no Google Drive do usuário</li>
                <li><strong>spreadsheets (Google Sheets):</strong> Ler planilhas para importação de dados em processos jurídicos</li>
                <li><strong>contacts.readonly (Google Contacts):</strong> Importar contatos para facilitar o preenchimento de dados em documentos e processos</li>
                <li><strong>gmail.readonly (Gmail):</strong> Ler e-mails para vincular comunicações a processos jurídicos do cliente</li>
                <li><strong>gmail.send (Gmail):</strong> Enviar e-mails diretamente pelo sistema em nome do usuário, com consentimento explícito</li>
                <li><strong>calendar (Google Calendar):</strong> Criar e gerenciar eventos de audiências, prazos e compromissos jurídicos</li>
              </ul>

              <h3 className="text-lg font-serif text-foreground mb-3 mt-6">3.2 Como os dados do Google são utilizados</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Os dados obtidos via Google APIs são utilizados <strong>exclusivamente</strong> para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Autenticação e identificação do usuário no sistema</li>
                <li>Criação e edição de documentos jurídicos integrados ao Google Docs</li>
                <li>Armazenamento de documentos no Google Drive do próprio usuário</li>
                <li>Importação de dados de planilhas para processos jurídicos</li>
                <li>Importação de contatos para preenchimento automático de documentos</li>
                <li>Leitura e envio de e-mails vinculados a processos</li>
                <li>Criação de eventos no calendário para acompanhamento de prazos</li>
              </ul>

              <h3 className="text-lg font-serif text-foreground mb-3 mt-6">3.3 Política de Uso Limitado (Limited Use Policy)</h3>
              <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  <strong className="text-foreground">Declaração de conformidade:</strong> O uso e a transferência para qualquer outro aplicativo 
                  de informações recebidas de Google APIs cumprirão a{" "}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google API Services User Data Policy
                  </a>, incluindo os requisitos de Uso Limitado.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Em conformidade com a política de Uso Limitado do Google, declaramos que:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Os dados obtidos via Google APIs são usados <strong>exclusivamente</strong> para fornecer e melhorar as funcionalidades do aplicativo visíveis e solicitadas pelo usuário</li>
                <li><strong>Não transferimos</strong> dados do Google para terceiros, exceto quando necessário para fornecer ou melhorar as funcionalidades do aplicativo, para cumprir leis aplicáveis, ou com consentimento explícito do usuário</li>
                <li><strong>Não vendemos</strong> dados de usuários do Google a terceiros, sob nenhuma circunstância</li>
                <li><strong>Não utilizamos</strong> dados do Google para veicular anúncios, incluindo anúncios personalizados ou retargeting</li>
                <li><strong>Não utilizamos</strong> dados do Google para fins não relacionados às funcionalidades do aplicativo</li>
                <li><strong>Não permitimos</strong> que seres humanos leiam os dados do usuário, exceto com consentimento explícito do usuário, para fins de segurança (como investigação de abuso), para cumprir leis aplicáveis, ou quando os dados forem agregados e anonimizados para operações internas</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                4. Finalidade do Tratamento
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Utilizamos seus dados pessoais para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Prestação de serviços jurídicos contratados</li>
                <li>Comunicação sobre andamento de processos e consultas</li>
                <li>Cumprimento de obrigações legais e regulatórias</li>
                <li>Melhoria de nossos serviços e experiência do usuário</li>
                <li>Envio de informações jurídicas relevantes (mediante consentimento)</li>
                <li>Integração com Google Workspace para criação e gestão de documentos jurídicos</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                5. Armazenamento e Segurança dos Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Seus dados são armazenados em servidores seguros com as seguintes medidas de proteção:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Criptografia em trânsito (TLS/HTTPS) e em repouso</li>
                <li>Controle de acesso baseado em funções (RBAC) com Row Level Security (RLS)</li>
                <li>Sanitização de dados contra ataques XSS via DOMPurify</li>
                <li>Tokens de acesso do Google são armazenados de forma segura pelo Supabase Auth e nunca expostos ou compartilhados com terceiros</li>
                <li>Rate limiting para proteção contra abuso de APIs</li>
                <li>Backups regulares e monitoramento de segurança</li>
                <li>Autenticação multifator disponível para contas de administrador</li>
              </ul>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                6. Compartilhamento de Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Seus dados pessoais podem ser compartilhados com:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Poder Judiciário e entidades administrativas:</strong> quando necessário para a prestação dos serviços jurídicos</li>
                <li><strong>Parceiros e correspondentes jurídicos:</strong> sob obrigação de confidencialidade</li>
                <li><strong>Prestadores de serviços de tecnologia:</strong> Supabase (banco de dados e autenticação) e provedores de infraestrutura, para operação do site e sistemas</li>
              </ul>
              <div className="bg-destructive/5 border border-destructive/20 p-4 mt-4">
                <p className="text-muted-foreground leading-relaxed text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Dados do Google:</strong> Dados obtidos via Google APIs <strong>não são vendidos, 
                    transferidos ou compartilhados com terceiros</strong> para fins de publicidade, mineração de dados, ou qualquer 
                    finalidade não relacionada às funcionalidades do aplicativo, conforme descrito na Seção 3.3 (Política de Uso Limitado).
                  </span>
                </p>
              </div>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                7. Retenção e Exclusão de Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Adotamos as seguintes práticas de retenção de dados:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Dados processuais:</strong> retidos conforme prazos legais obrigatórios (mínimo de 5 anos após encerramento do processo, conforme legislação brasileira)</li>
                <li><strong>Dados de conta:</strong> mantidos enquanto a conta estiver ativa; excluídos em até 30 dias após solicitação de exclusão</li>
                <li><strong>Dados de sessão do Google:</strong> mantidos apenas durante a sessão ativa do usuário; tokens são revogados no logout</li>
                <li><strong>Dados obtidos via Google APIs:</strong> excluídos em até 30 dias após revogação do acesso ou solicitação do usuário</li>
                <li><strong>Dados de navegação e analytics:</strong> retidos por até 12 meses, de forma anonimizada</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Para solicitar a exclusão de seus dados, envie um e-mail para{" "}
                <a href="mailto:info@elpgreen.com" className="text-primary hover:underline">info@elpgreen.com</a>. 
                Confirmaremos o recebimento e processaremos sua solicitação em até 15 dias úteis.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-primary" />
                8. Seus Direitos (LGPD e Google)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                De acordo com a LGPD e as políticas do Google, você tem direito a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Confirmar a existência de tratamento de seus dados</li>
                <li>Acessar seus dados pessoais armazenados em nossos sistemas</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Solicitar a portabilidade dos dados a outro prestador de serviço</li>
                <li>Revogar o consentimento a qualquer momento</li>
                <li><strong>Revogar o acesso do aplicativo à sua conta Google</strong> a qualquer momento através das{" "}
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    configurações de segurança da sua conta Google
                  </a>
                </li>
                <li><strong>Solicitar a exclusão de todos os seus dados</strong> armazenados em nossos sistemas, incluindo dados obtidos via Google APIs</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Ao revogar o acesso à conta Google ou solicitar exclusão de dados, removeremos todos os dados 
                associados à sua conta Google de nossos sistemas em até <strong>30 dias</strong>.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                9. Alterações nesta Política
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Reservamo-nos o direito de atualizar esta Política de Privacidade a qualquer momento. 
                Quando houver alterações significativas — especialmente na forma como utilizamos dados de usuários do Google — 
                notificaremos os usuários por meio de aviso no aplicativo e/ou por e-mail. 
                A data da última atualização será sempre indicada no topo desta página. 
                O uso continuado do aplicativo após as alterações constitui aceitação da nova política.
              </p>
            </section>

            <section className="bg-card border border-border p-8">
              <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                10. Contato e Encarregado de Dados (DPO)
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para exercer seus direitos, solicitar exclusão de dados, reportar incidentes de segurança 
                ou esclarecer dúvidas sobre esta política, entre em contato:
              </p>
              <ul className="list-none text-muted-foreground space-y-2 mt-4">
                <li><strong>E-mail:</strong>{" "}
                  <a href="mailto:info@elpgreen.com" className="text-primary hover:underline">info@elpgreen.com</a>
                </li>
                <li><strong>Responsável:</strong> Ericson Piccoli — Chairman & Founder</li>
                <li><strong>Empresa:</strong> ELP Green Technology S.R.L. — VAT IT02712340062</li>
                <li><strong>Endereço:</strong> Alessandria, Itália</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Responderemos sua solicitação em até <strong>15 dias úteis</strong>, conforme previsto na LGPD.
              </p>
            </section>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
