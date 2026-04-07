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
// GlobalOrionListener moved to DashboardLayout — no mic prompts on public pages
import { PublicOrionListener } from "@/components/PublicOrionListener";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { PageLoader } from "@/components/common/PageLoader";
import { AuthGuard } from "@/components/common/AuthGuard";
import { lazy, Suspense } from "react";
import { MouseTrailEffect } from "@/components/dashboard/MouseTrailEffect";
import { CookieConsent } from "@/components/CookieConsent";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { lazyRetry } from "@/lib/lazyRetry";

// ─── Public Pages (no auth required) ───
const Index = lazy(lazyRetry(() => import("./pages/Index")));
const Privacidade = lazy(lazyRetry(() => import("./pages/Privacidade")));
const Termos = lazy(lazyRetry(() => import("./pages/Termos")));
const LGPD = lazy(lazyRetry(() => import("./pages/LGPD")));
const NotFound = lazy(lazyRetry(() => import("./pages/NotFound")));
const Auth = lazy(lazyRetry(() => import("./pages/Auth")));
const AuthCallback = lazy(lazyRetry(() => import("./pages/AuthCallback")));
const EsqueciSenha = lazy(lazyRetry(() => import("./pages/EsqueciSenha")));
const CadastroCliente = lazy(lazyRetry(() => import("./pages/CadastroCliente")));
const InstallApp = lazy(lazyRetry(() => import("./pages/InstallApp")));
const SpotifyCallback = lazy(lazyRetry(() => import("./pages/SpotifyCallback")));
const YouTubeMusicCallback = lazy(lazyRetry(() => import("./pages/callback/YouTubeMusicCallback")));
const AdvogadoSite = lazy(lazyRetry(() => import("./pages/AdvogadoSite")));
const Publicacoes = lazy(lazyRetry(() => import("./pages/Publicacoes")));
const PublicacaoDetalhe = lazy(lazyRetry(() => import("./pages/PublicacaoDetalhe")));
const ProBono = lazy(lazyRetry(() => import("./pages/ProBono")));
const Depoimentos = lazy(lazyRetry(() => import("./pages/Depoimentos")));
const Escritorio = lazy(lazyRetry(() => import("./pages/Escritorio")));
// ─── Public Showcase Pages ───
const Servicos = lazy(lazyRetry(() => import("./pages/Servicos")));
const Plataforma = lazy(lazyRetry(() => import("./pages/Plataforma")));
const Clientes = lazy(lazyRetry(() => import("./pages/Clientes")));
const Contato = lazy(lazyRetry(() => import("./pages/Contato")));
const InvestorTools = lazy(lazyRetry(() => import("./pages/InvestorTools")));

// ─── Auth-Required Pages (visible only after login) ───
const ConsultaIA = lazy(lazyRetry(() => import("./pages/ConsultaIA")));
const DocumentacaoRedeNeural = lazy(lazyRetry(() => import("./pages/DocumentacaoRedeNeural")));
const DocumentacaoNeuroCore = lazy(lazyRetry(() => import("./pages/DocumentacaoNeuroCore")));
const BiometricRegistration = lazy(lazyRetry(() => import("./pages/BiometricRegistration")));
const OrionDemo = lazy(lazyRetry(() => import("./pages/OrionDemo")));
const OrionExtensionPage = lazy(lazyRetry(() => import("./pages/OrionExtensionPage")));
const Loja = lazy(lazyRetry(() => import("./pages/Loja")));
const LojaOrion = lazy(lazyRetry(() => import("./pages/LojaOrion")));
const LojaSucesso = lazy(lazyRetry(() => import("./pages/LojaSucesso")));
const ProdutoDetalhe = lazy(lazyRetry(() => import("./pages/ProdutoDetalhe")));

// ─── Dashboard ───
const DashboardLayout = lazy(lazyRetry(() => import("./components/dashboard/DashboardLayout")));
const DashboardRouter = lazy(lazyRetry(() => import("./pages/dashboard/DashboardRouter")));
import { RoleGuard } from "./components/dashboard/RoleGuard";
const GerarDocumento = lazy(lazyRetry(() => import("./pages/dashboard/GerarDocumento")));
const MeusDocumentos = lazy(lazyRetry(() => import("./pages/dashboard/MeusDocumentos")));
const PagamentosPage = lazy(lazyRetry(() => import("./pages/dashboard/PagamentosPage")));
const AgendarConsulta = lazy(lazyRetry(() => import("./pages/dashboard/AgendarConsulta")));
const PagamentoSucesso = lazy(lazyRetry(() => import("./pages/dashboard/PagamentoSucesso")));
const ClientesPage = lazy(lazyRetry(() => import("./pages/dashboard/ClientesPage")));
const ProcessosPage = lazy(lazyRetry(() => import("./pages/dashboard/ProcessosPage")));
const AssinaturaDigital = lazy(lazyRetry(() => import("./pages/dashboard/AssinaturaDigital")));
const TarefasPage = lazy(lazyRetry(() => import("./pages/dashboard/TarefasPage")));
const NotificacoesPage = lazy(lazyRetry(() => import("./pages/dashboard/NotificacoesPage")));
const CRMClientes = lazy(lazyRetry(() => import("./pages/dashboard/CRMClientes")));
const ChatHumano = lazy(lazyRetry(() => import("./pages/dashboard/ChatHumano")));
const RedeNeuralPage = lazy(lazyRetry(() => import("./pages/dashboard/RedeNeuralPage")));
const PublicacoesAdmin = lazy(lazyRetry(() => import("./pages/dashboard/PublicacoesAdmin")));
const UsuariosPage = lazy(lazyRetry(() => import("./pages/dashboard/UsuariosPage")));
const PesquisaUnificada = lazy(lazyRetry(() => import("./pages/dashboard/PesquisaUnificada")));
const PerfilCliente = lazy(lazyRetry(() => import("./pages/dashboard/PerfilCliente")));
const ConfiguracoesRouter = lazy(lazyRetry(() => import("./pages/dashboard/ConfiguracoesRouter")));
const ReformulacaoJuridica = lazy(lazyRetry(() => import("./pages/dashboard/ReformulacaoJuridica")));
const MeusProcessosCliente = lazy(lazyRetry(() => import("./pages/dashboard/MeusProcessosCliente")));
const AssinaturaCliente = lazy(lazyRetry(() => import("./pages/dashboard/AssinaturaCliente")));
const RecursosEU = lazy(lazyRetry(() => import("./pages/dashboard/RecursosEU")));
const FerramentasGoogle = lazy(lazyRetry(() => import("./pages/dashboard/FerramentasGoogle")));
const LaboratorioIA = lazy(lazyRetry(() => import("./pages/dashboard/LaboratorioIA")));
const MeusProdutos = lazy(lazyRetry(() => import("./pages/dashboard/MeusProdutos")));
const MarketplacePage = lazy(lazyRetry(() => import("./pages/dashboard/Marketplace")));
const AfiliadosPage = lazy(lazyRetry(() => import("./pages/dashboard/Afiliados")));
const PortalCliente = lazy(lazyRetry(() => import("./pages/dashboard/PortalCliente")));
const AdminOwnerDashboard = lazy(lazyRetry(() => import("./pages/dashboard/AdminOwnerDashboard")));
const VitrineAfiliado = lazy(lazyRetry(() => import("./pages/VitrineAfiliado")));
const MarketplaceModules = lazy(lazyRetry(() => import("./pages/dashboard/MarketplaceModules")));
const EditorPaginaVendas = lazy(lazyRetry(() => import("./pages/dashboard/EditorPaginaVendas")));
const CampanhasEmail = lazy(lazyRetry(() => import("./pages/dashboard/CampanhasEmail")));
const ProdutorAfiliados = lazy(lazyRetry(() => import("./pages/dashboard/ProdutorAfiliados")));
const DashboardDocumentosInternacionais = lazy(lazyRetry(() => import("./pages/dashboard/DashboardDocumentosInternacionais")));
const InstrucoesPlataforma = lazy(lazyRetry(() => import("./pages/dashboard/InstrucoesPlataforma")));
const ControleRobotico = lazy(lazyRetry(() => import("./pages/dashboard/ControleRobotico")));
const DeviceIntegrationPage = lazy(lazyRetry(() => import("./pages/dashboard/DeviceIntegrationPage")));
const MeusAcessos = lazy(lazyRetry(() => import("./pages/dashboard/MeusAcessos")));
const ExplorarLojas = lazy(lazyRetry(() => import("./pages/dashboard/ExplorarLojas")));
const ConfigurarIA = lazy(lazyRetry(() => import("./pages/dashboard/ConfigurarIA")));
const PlanoUsuario = lazy(lazyRetry(() => import("./pages/dashboard/PlanoUsuario")));
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
          {/* GlobalOrionListener lives inside DashboardLayout now */}
          {/* PublicOrionListener — lightweight orb for public pages */}
          <PublicOrionListener />
          <MouseTrailEffect />
          <CookieConsent />
          <AffiliateTracker />
          <PWAUpdateNotification />
          
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ═══ PUBLIC — Aberto a todos (vitrine + legal + auth) ═══ */}
                  <Route path="/" element={<Index />} />
                  <Route path="/publicacoes" element={<Publicacoes />} />
                  <Route path="/publicacoes/:slug" element={<PublicacaoDetalhe />} />
                  <Route path="/pro-bono" element={<ProBono />} />
                  <Route path="/depoimentos" element={<Depoimentos />} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/advogado/:advogadoId" element={<AdvogadoSite />} />
                  <Route path="/escritorio" element={<Escritorio />} />

                  {/* ═══ PUBLIC — Auth ═══ */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/cadastro" element={<CadastroCliente />} />
                  <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                  <Route path="/spotify-callback" element={<SpotifyCallback />} />
                  <Route path="/callback/youtube-music" element={<YouTubeMusicCallback />} />

                  {/* ═══ PUBLIC — Legal ═══ */}
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/termos" element={<Termos />} />
                  <Route path="/lgpd" element={<LGPD />} />

                  {/* ═══ PUBLIC — Páginas vitrine da plataforma ═══ */}
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/plataforma" element={<Plataforma />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/contato" element={<Contato />} />
                  <Route path="/investidor" element={<InvestorTools />} />
                  <Route path="/consulta" element={<AuthGuard><ConsultaIA /></AuthGuard>} />
                  <Route path="/demo" element={<AuthGuard><OrionDemo /></AuthGuard>} />
                  <Route path="/extension" element={<AuthGuard><OrionExtensionPage /></AuthGuard>} />
                  <Route path="/register/biometric" element={<AuthGuard><BiometricRegistration /></AuthGuard>} />

                  {/* ═══ AUTH REQUIRED — Docs técnicos ═══ */}
                  <Route path="/docs/rede-neural" element={<AuthGuard><DocumentacaoRedeNeural /></AuthGuard>} />
                  <Route path="/docs/neurocore" element={<AuthGuard><DocumentacaoNeuroCore /></AuthGuard>} />

                  {/* ═══ AUTH REQUIRED — Loja ═══ */}
                  <Route path="/loja/:creatorId" element={<AuthGuard><Loja /></AuthGuard>} />
                  <Route path="/loja-orion" element={<AuthGuard><LojaOrion /></AuthGuard>} />
                  <Route path="/loja/:creatorId/sucesso" element={<AuthGuard><LojaSucesso /></AuthGuard>} />
                  <Route path="/loja/:creatorId/produto/:productId" element={<AuthGuard><ProdutoDetalhe /></AuthGuard>} />

                  {/* ═══ PUBLIC — Vitrine do Afiliado ═══ */}
                  <Route path="/vitrine/:affiliateId" element={<VitrineAfiliado />} />

                  {/* ═══ REDIRECTS — Orphan pages → proper destinations ═══ */}
                  <Route path="/nova-pagina" element={<Navigate to="/" replace />} />
                  <Route path="/diferencial" element={<Navigate to="/plataforma" replace />} />
                  <Route path="/associado" element={<Navigate to="/contato" replace />} />
                  <Route path="/sobre" element={<Navigate to="/plataforma" replace />} />

                  {/* ═══ Dashboard Routes (DashboardLayout already guards auth) ═══ */}
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardRouter />} />

                    {/* Shared routes */}
                    <Route path="instrucoes" element={<InstrucoesPlataforma />} />
                    <Route path="documentos" element={<MeusDocumentos />} />
                    <Route path="pagamentos" element={<PagamentosPage />} />
                    <Route path="pagamento-sucesso" element={<PagamentoSucesso />} />
                    <Route path="notificacoes" element={<NotificacoesPage />} />
                    <Route path="perfil-cliente" element={<PerfilCliente />} />
                    <Route path="consultas" element={<AgendarConsulta />} />
                    <Route path="chat-ao-vivo" element={<ChatHumano />} />
                    <Route path="meus-processos" element={<MeusProcessosCliente />} />
                    <Route path="assinatura-cliente" element={<AssinaturaCliente />} />
                    <Route path="configuracoes" element={<ConfiguracoesRouter />} />
                    <Route path="portal-cliente" element={<PortalCliente />} />
                    <Route path="marketplace" element={<MarketplacePage />} />
                    <Route path="marketplace-modules" element={<MarketplaceModules />} />
                    <Route path="meus-acessos" element={<MeusAcessos />} />
                    <Route path="explorar-lojas" element={<ExplorarLojas />} />

                    {/* Admin */}
                    <Route path="admin" element={<RoleGuard allowedRoles={["advogado"]}><AdminOwnerDashboard /></RoleGuard>} />

                    {/* Marketplace & products */}
                    <Route path="meus-produtos" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade"]}><MeusProdutos /></RoleGuard>} />
                    <Route path="editor-vendas" element={<RoleGuard allowedRoles={["produtor", "nomade"]}><EditorPaginaVendas /></RoleGuard>} />
                    <Route path="campanhas-email" element={<RoleGuard allowedRoles={["produtor", "nomade"]}><CampanhasEmail /></RoleGuard>} />
                    <Route path="afiliados" element={<RoleGuard allowedRoles={["advogado", "afiliado", "nomade"]}><AfiliadosPage /></RoleGuard>} />
                    <Route path="produtor-afiliados" element={<RoleGuard allowedRoles={["produtor", "nomade"]}><ProdutorAfiliados /></RoleGuard>} />
                    <Route path="documentos-internacionais" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade"]}><DashboardDocumentosInternacionais /></RoleGuard>} />

                    {/* Advogado-only */}
                    <Route path="gerar-documento" element={<RoleGuard allowedRoles={["advogado"]}><GerarDocumento /></RoleGuard>} />
                    <Route path="pesquisa-unificada" element={<RoleGuard allowedRoles={["advogado"]}><PesquisaUnificada /></RoleGuard>} />
                    <Route path="processos" element={<RoleGuard allowedRoles={["advogado"]}><ProcessosPage /></RoleGuard>} />
                    <Route path="assinatura-digital" element={<RoleGuard allowedRoles={["advogado"]}><AssinaturaDigital /></RoleGuard>} />
                    <Route path="tarefas" element={<RoleGuard allowedRoles={["advogado"]}><TarefasPage /></RoleGuard>} />
                    <Route path="crm" element={<RoleGuard allowedRoles={["advogado", "produtor", "nomade", "afiliado"]}><CRMClientes /></RoleGuard>} />
                    <Route path="rede-neural" element={<RoleGuard allowedRoles={["advogado"]}><RedeNeuralPage /></RoleGuard>} />
                    <Route path="publicacoes-admin" element={<RoleGuard allowedRoles={["advogado"]}><PublicacoesAdmin /></RoleGuard>} />
                    <Route path="usuarios" element={<RoleGuard allowedRoles={["advogado"]}><UsuariosPage /></RoleGuard>} />
                    <Route path="reformulacao" element={<RoleGuard allowedRoles={["advogado"]}><ReformulacaoJuridica /></RoleGuard>} />
                    <Route path="recursos-eu" element={<RoleGuard allowedRoles={["advogado"]}><RecursosEU /></RoleGuard>} />
                    <Route path="ferramentas-google" element={<RoleGuard allowedRoles={["advogado"]}><FerramentasGoogle /></RoleGuard>} />
                    <Route path="laboratorio-ia" element={<RoleGuard allowedRoles={["advogado"]}><LaboratorioIA /></RoleGuard>} />
                    <Route path="controle-robotico" element={<RoleGuard allowedRoles={["advogado"]}><ControleRobotico /></RoleGuard>} />
                    <Route path="dispositivos-iot" element={<RoleGuard allowedRoles={["advogado"]}><DeviceIntegrationPage /></RoleGuard>} />
                    <Route path="extension" element={<RoleGuard allowedRoles={["advogado"]}><OrionExtensionPage /></RoleGuard>} />

                    {/* Dashboard redirects — consolidation */}
                    <Route path="chat" element={<Navigate to="/dashboard/gerar-documento" replace />} />
                    <Route path="chat-ia" element={<Navigate to="/dashboard/gerar-documento" replace />} />
                    <Route path="manual-assistente" element={<Navigate to="/consulta" replace />} />
                    <Route path="assistente-ia" element={<Navigate to="/consulta" replace />} />
                    <Route path="pesquisa" element={<Navigate to="/dashboard/pesquisa-unificada" replace />} />
                    <Route path="clientes" element={<Navigate to="/dashboard/crm" replace />} />
                    <Route path="contatos" element={<Navigate to="/dashboard/crm" replace />} />
                    <Route path="assinatura" element={<Navigate to="/dashboard/assinatura-digital" replace />} />
                    <Route path="escritorio" element={<Navigate to="/dashboard/configuracoes" replace />} />
                    <Route path="avaliacoes-admin" element={<Navigate to="/dashboard/publicacoes-admin" replace />} />
                    <Route path="metricas-ia" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="webhooks" element={<Navigate to="/dashboard/configuracoes" replace />} />
                    <Route path="biblioteca-univates" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="prazos" element={<Navigate to="/dashboard/tarefas" replace />} />
                    <Route path="configurar-ia" element={<ConfigurarIA />} />
                    <Route path="arquitetura-ia" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="dispositivos" element={<Navigate to="/dashboard/rede-neural" replace />} />
                    <Route path="plano" element={<PlanoUsuario />} />
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
