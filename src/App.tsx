import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { CopyProtection } from "@/components/CopyProtection";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OrionShield } from "@/components/common/OrionShield";
import { OrionGlobalListener } from "@/components/OrionGlobalListener";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { PageLoader } from "@/components/common/PageLoader";
import { lazy, Suspense } from "react";
import { MouseTrailEffect } from "@/components/dashboard/MouseTrailEffect";
import { CookieConsent } from "@/components/CookieConsent";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { lazyRetry } from "@/lib/lazyRetry";

// Lazy load all pages with retry for stale chunk recovery
const Index = lazy(lazyRetry(() => import("./pages/Index")));
const ConsultaIA = lazy(lazyRetry(() => import("./pages/ConsultaIA")));
const Publicacoes = lazy(lazyRetry(() => import("./pages/Publicacoes")));
const PublicacaoDetalhe = lazy(lazyRetry(() => import("./pages/PublicacaoDetalhe")));
const Privacidade = lazy(lazyRetry(() => import("./pages/Privacidade")));
const Termos = lazy(lazyRetry(() => import("./pages/Termos")));
const LGPD = lazy(lazyRetry(() => import("./pages/LGPD")));
const NotFound = lazy(lazyRetry(() => import("./pages/NotFound")));
const Auth = lazy(lazyRetry(() => import("./pages/Auth")));
const AuthCallback = lazy(lazyRetry(() => import("./pages/AuthCallback")));
const EsqueciSenha = lazy(lazyRetry(() => import("./pages/EsqueciSenha")));
const CadastroCliente = lazy(lazyRetry(() => import("./pages/CadastroCliente")));
const DocumentacaoRedeNeural = lazy(lazyRetry(() => import("./pages/DocumentacaoRedeNeural")));
const DocumentacaoNeuroCore = lazy(lazyRetry(() => import("./pages/DocumentacaoNeuroCore")));
const Associado = lazy(lazyRetry(() => import("./pages/Associado")));
const Diferencial = lazy(lazyRetry(() => import("./pages/Diferencial")));
const Servicos = lazy(lazyRetry(() => import("./pages/Servicos")));
const DeviceIntegrationPage = lazy(lazyRetry(() => import("./pages/dashboard/DeviceIntegrationPage")));
const NovaPagina = lazy(lazyRetry(() => import("./pages/NovaPagina")));
const Plataforma = lazy(lazyRetry(() => import("./pages/Plataforma")));
const InstallApp = lazy(lazyRetry(() => import("./pages/InstallApp")));
const OrionExtensionPage = lazy(lazyRetry(() => import("./pages/OrionExtensionPage")));
const Loja = lazy(lazyRetry(() => import("./pages/Loja")));
const LojaSucesso = lazy(lazyRetry(() => import("./pages/LojaSucesso")));
const ProdutoDetalhe = lazy(lazyRetry(() => import("./pages/ProdutoDetalhe")));
const AdvogadoSite = lazy(lazyRetry(() => import("./pages/AdvogadoSite")));
const Clientes = lazy(lazyRetry(() => import("./pages/Clientes")));
const Contato = lazy(lazyRetry(() => import("./pages/Contato")));
const InvestorTools = lazy(lazyRetry(() => import("./pages/InvestorTools")));
const BiometricRegistration = lazy(lazyRetry(() => import("./pages/BiometricRegistration")));
const SpotifyCallback = lazy(lazyRetry(() => import("./pages/SpotifyCallback")));
const YouTubeMusicCallback = lazy(lazyRetry(() => import("./pages/callback/YouTubeMusicCallback")));
const OrionDemo = lazy(lazyRetry(() => import("./pages/OrionDemo")));

// Dashboard
const DashboardLayout = lazy(lazyRetry(() => import("./components/dashboard/DashboardLayout")));
const DashboardRouter = lazy(lazyRetry(() => import("./pages/dashboard/DashboardRouter")));
import { RoleGuard } from "./components/dashboard/RoleGuard";
const GerarDocumento = lazy(lazyRetry(() => import("./pages/dashboard/GerarDocumento")));
const MeusDocumentos = lazy(lazyRetry(() => import("./pages/dashboard/MeusDocumentos")));
const ChatJuridico = lazy(lazyRetry(() => import("./pages/dashboard/ChatJuridico")));
const PagamentosPage = lazy(lazyRetry(() => import("./pages/dashboard/PagamentosPage")));
const AgendarConsulta = lazy(lazyRetry(() => import("./pages/dashboard/AgendarConsulta")));
const PagamentoSucesso = lazy(lazyRetry(() => import("./pages/dashboard/PagamentoSucesso")));
const ClientesPage = lazy(lazyRetry(() => import("./pages/dashboard/ClientesPage")));
const ProcessosPage = lazy(lazyRetry(() => import("./pages/dashboard/ProcessosPage")));
const AssinaturaDigital = lazy(lazyRetry(() => import("./pages/dashboard/AssinaturaDigital")));
const ContatosPage = lazy(lazyRetry(() => import("./pages/dashboard/ContatosPage")));
const TarefasPage = lazy(lazyRetry(() => import("./pages/dashboard/TarefasPage")));
const PerfilAdmin = lazy(lazyRetry(() => import("./pages/dashboard/PerfilAdmin")));
const NotificacoesPage = lazy(lazyRetry(() => import("./pages/dashboard/NotificacoesPage")));
const ConfiguracoesEscritorio = lazy(lazyRetry(() => import("./pages/dashboard/ConfiguracoesEscritorio")));
const CRMClientes = lazy(lazyRetry(() => import("./pages/dashboard/CRMClientes")));
const ChatHumano = lazy(lazyRetry(() => import("./pages/dashboard/ChatHumano")));
const RedeNeuralPage = lazy(lazyRetry(() => import("./pages/dashboard/RedeNeuralPage")));
const PublicacoesAdmin = lazy(lazyRetry(() => import("./pages/dashboard/PublicacoesAdmin")));
const AvaliacoesAdmin = lazy(lazyRetry(() => import("./pages/dashboard/AvaliacoesAdmin")));
const UsuariosPage = lazy(lazyRetry(() => import("./pages/dashboard/UsuariosPage")));
const MetricasIA = lazy(lazyRetry(() => import("./pages/dashboard/MetricasIA")));
const WebhooksPage = lazy(lazyRetry(() => import("./pages/dashboard/WebhooksPage")));
const PesquisaUnificada = lazy(lazyRetry(() => import("./pages/dashboard/PesquisaUnificada")));
const ChatIARouter = lazy(lazyRetry(() => import("./pages/dashboard/ChatIARouter")));
const PerfilCliente = lazy(lazyRetry(() => import("./pages/dashboard/PerfilCliente")));
const PrazosCalculadora = lazy(lazyRetry(() => import("./pages/dashboard/PrazosCalculadora")));
// AssistenteIA removido — unificado no Orion (/consulta)
const ConfiguracoesRouter = lazy(lazyRetry(() => import("./pages/dashboard/ConfiguracoesRouter")));
const ReformulacaoJuridica = lazy(lazyRetry(() => import("./pages/dashboard/ReformulacaoJuridica")));
const MeusProcessosCliente = lazy(lazyRetry(() => import("./pages/dashboard/MeusProcessosCliente")));
const AssinaturaCliente = lazy(lazyRetry(() => import("./pages/dashboard/AssinaturaCliente")));
const RecursosEU = lazy(lazyRetry(() => import("./pages/dashboard/RecursosEU")));
const ConfigurarIA = lazy(lazyRetry(() => import("./pages/dashboard/ConfigurarIA")));
const ArquiteturaIA = lazy(lazyRetry(() => import("./pages/dashboard/ArquiteturaIA")));
const FerramentasGoogle = lazy(lazyRetry(() => import("./pages/dashboard/FerramentasGoogle")));
const LaboratorioIA = lazy(lazyRetry(() => import("./pages/dashboard/LaboratorioIA")));
const MeusProdutos = lazy(lazyRetry(() => import("./pages/dashboard/MeusProdutos")));
const MarketplacePage = lazy(lazyRetry(() => import("./pages/dashboard/Marketplace")));
const AfiliadosPage = lazy(lazyRetry(() => import("./pages/dashboard/Afiliados")));
const PlanoUsuario = lazy(lazyRetry(() => import("./pages/dashboard/PlanoUsuario")));
const PortalCliente = lazy(lazyRetry(() => import("./pages/dashboard/PortalCliente")));
const AdminOwnerDashboard = lazy(lazyRetry(() => import("./pages/dashboard/AdminOwnerDashboard")));
const MarketplaceModules = lazy(lazyRetry(() => import("./pages/dashboard/MarketplaceModules")));
const DashboardDocumentosInternacionais = lazy(lazyRetry(() => import("./pages/dashboard/DashboardDocumentosInternacionais")));
const InstrucoesPlataforma = lazy(lazyRetry(() => import("./pages/dashboard/InstrucoesPlataforma")));
const ControleRobotico = lazy(lazyRetry(() => import("./pages/dashboard/ControleRobotico")));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <AuthProvider>
        <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <CopyProtection />
          <OrionShield />
          <OrionGlobalListener />
          <MouseTrailEffect />
          <CookieConsent />
          <AffiliateTracker />
          <PWAUpdateNotification />
          
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/consulta" element={<ConsultaIA />} />
                  
                  <Route path="/publicacoes" element={<Publicacoes />} />
                  <Route path="/publicacoes/:slug" element={<PublicacaoDetalhe />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/termos" element={<Termos />} />
                  <Route path="/lgpd" element={<LGPD />} />
                  <Route path="/cadastro" element={<CadastroCliente />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/register/biometric" element={<BiometricRegistration />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                  <Route path="/docs/rede-neural" element={<DocumentacaoRedeNeural />} />
                  <Route path="/docs/neurocore" element={<DocumentacaoNeuroCore />} />
                  <Route path="/associado" element={<Associado />} />
                  <Route path="/diferencial" element={<Diferencial />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/nova-pagina" element={<NovaPagina />} />
                  <Route path="/plataforma" element={<Plataforma />} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/extension" element={<OrionExtensionPage />} />
                  <Route path="/loja/:creatorId" element={<Loja />} />
                  <Route path="/loja/:creatorId/sucesso" element={<LojaSucesso />} />
                  <Route path="/loja/:creatorId/produto/:productId" element={<ProdutoDetalhe />} />
                  <Route path="/advogado/:advogadoId" element={<AdvogadoSite />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/contato" element={<Contato />} />
                  <Route path="/investidor" element={<InvestorTools />} />
                  <Route path="/spotify-callback" element={<SpotifyCallback />} />
                  <Route path="/callback/youtube-music" element={<YouTubeMusicCallback />} />
                  <Route path="/demo" element={<OrionDemo />} />

                  {/* Dashboard Routes - Role-based */}
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardRouter />} />

                    {/* Shared routes (both advogado and cliente) */}
                    <Route path="instrucoes" element={<InstrucoesPlataforma />} />
                    <Route path="documentos" element={<MeusDocumentos />} />
                    <Route path="pagamentos" element={<PagamentosPage />} />
                    <Route path="pagamento-sucesso" element={<PagamentoSucesso />} />
                    <Route path="notificacoes" element={<NotificacoesPage />} />
                    <Route path="chat" element={<Navigate to="/dashboard/gerar-documento" replace />} />
                    <Route path="chat-ia" element={<Navigate to="/dashboard/gerar-documento" replace />} />
                    <Route path="perfil-cliente" element={<PerfilCliente />} />
                    <Route path="manual-assistente" element={<Navigate to="/consulta" replace />} />
                    <Route path="assistente-ia" element={<Navigate to="/consulta" replace />} />
                    <Route path="consultas" element={<AgendarConsulta />} />
                    <Route path="chat-ao-vivo" element={<ChatHumano />} />
                    <Route path="meus-processos" element={<MeusProcessosCliente />} />
                    <Route path="assinatura-cliente" element={<AssinaturaCliente />} />
                    <Route path="configuracoes" element={<ConfiguracoesRouter />} />
                    <Route path="portal-cliente" element={<PortalCliente />} />
                    <Route path="admin" element={<RoleGuard allowedRoles={["advogado"]}><AdminOwnerDashboard /></RoleGuard>} />
                    <Route path="marketplace-modules" element={<MarketplaceModules />} />

                    {/* Marketplace routes (role-protected) */}
                    <Route path="meus-produtos" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade"]}><MeusProdutos /></RoleGuard>} />
                    <Route path="marketplace" element={<MarketplacePage />} />
                    <Route path="afiliados" element={<RoleGuard allowedRoles={["advogado", "afiliado", "nomade"]}><AfiliadosPage /></RoleGuard>} />
                    <Route path="plano" element={<Navigate to="/dashboard/configuracoes" replace />} />
                    <Route path="documentos-internacionais" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade"]}><DashboardDocumentosInternacionais /></RoleGuard>} />

                    {/* Advogado-only routes */}
                    <Route path="gerar-documento" element={<RoleGuard allowedRoles={["advogado"]}><GerarDocumento /></RoleGuard>} />
                    <Route path="pesquisa" element={<Navigate to="/dashboard/pesquisa-unificada" replace />} />
                    <Route path="pesquisa-unificada" element={<RoleGuard allowedRoles={["advogado"]}><PesquisaUnificada /></RoleGuard>} />
                    <Route path="clientes" element={<Navigate to="/dashboard/crm" replace />} />
                    <Route path="processos" element={<RoleGuard allowedRoles={["advogado"]}><ProcessosPage /></RoleGuard>} />
                    <Route path="assinatura-digital" element={<RoleGuard allowedRoles={["advogado"]}><AssinaturaDigital /></RoleGuard>} />
                    <Route path="assinatura" element={<Navigate to="/dashboard/assinatura-digital" replace />} />
                    <Route path="contatos" element={<Navigate to="/dashboard/crm" replace />} />
                    <Route path="tarefas" element={<RoleGuard allowedRoles={["advogado"]}><TarefasPage /></RoleGuard>} />
                    <Route path="escritorio" element={<Navigate to="/dashboard/configuracoes" replace />} />
                    <Route path="crm" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade", "afiliado"]}><CRMClientes /></RoleGuard>} />
                    <Route path="rede-neural" element={<RoleGuard allowedRoles={["advogado"]}><RedeNeuralPage /></RoleGuard>} />
                    <Route path="publicacoes-admin" element={<RoleGuard allowedRoles={["advogado"]}><PublicacoesAdmin /></RoleGuard>} />
                    <Route path="avaliacoes-admin" element={<Navigate to="/dashboard/publicacoes-admin" replace />} />
                    <Route path="usuarios" element={<RoleGuard allowedRoles={["advogado"]}><UsuariosPage /></RoleGuard>} />
                    <Route path="metricas-ia" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="webhooks" element={<Navigate to="/dashboard/configuracoes" replace />} />
                    <Route path="biblioteca-univates" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="extension" element={<OrionExtensionPage />} />
                    <Route path="reformulacao" element={<RoleGuard allowedRoles={["advogado"]}><ReformulacaoJuridica /></RoleGuard>} />
                    <Route path="prazos" element={<Navigate to="/dashboard/tarefas" replace />} />
                    <Route path="recursos-eu" element={<RoleGuard allowedRoles={["advogado"]}><RecursosEU /></RoleGuard>} />
                    <Route path="configurar-ia" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="arquitetura-ia" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="ferramentas-google" element={<RoleGuard allowedRoles={["advogado"]}><FerramentasGoogle /></RoleGuard>} />
                    <Route path="laboratorio-ia" element={<RoleGuard allowedRoles={["advogado"]}><LaboratorioIA /></RoleGuard>} />
                    <Route path="dispositivos" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="controle-robotico" element={<RoleGuard allowedRoles={["advogado"]}><ControleRobotico /></RoleGuard>} />
                    <Route path="orion" element={<Navigate to="/consulta" replace />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          
        </BrowserRouter>
      </CartProvider>
      </AuthProvider>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
