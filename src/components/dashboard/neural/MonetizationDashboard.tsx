/**
 * ═══ Monetization Dashboard Panel ═══
 * 
 * Painel completo de monetização do Orion:
 * - Receitas de serviços
 * - Google API usage
 * - Stripe Connect payouts
 * - Gráficos e estatísticas
 */

import { useState, useEffect } from "react";
import {
  getFullRevenueDashboard,
  checkOwnerPaymentSetup,
  requestPayout,
  initStripeConnect,
  SERVICES_CATALOG,
} from "@/lib/neural/arc-revenue-system";
import {
  GOOGLE_SERVICES,
  getGoogleServicesStats,
  detectGoogleService,
} from "@/lib/neural/arc-google-monetization";
import { getConsciousnessDiagnostics } from "./rag-consciousness";
import { getGatewayDiagnostics } from "./arc-gateway";

export default function MonetizationDashboard() {
  const [revenue, setRevenue] = useState<any>(null);
  const [googleStats, setGoogleStats] = useState<any>(null);
  const [paymentSetup, setPaymentSetup] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "google" | "payouts">("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [revenueData, setupData] = await Promise.all([
        getFullRevenueDashboard(),
        checkOwnerPaymentSetup("current_user"),
      ]);
      setRevenue(revenueData);
      setPaymentSetup(setupData);
      
      // Try to get Google stats (might fail if no user)
      try {
        const gs = await getGoogleServicesStats("current_user");
        setGoogleStats(gs);
      } catch {}
    } catch (e) {
      console.error("Load error:", e);
    }
    setIsLoading(false);
  };

  const handleSetupStripe = async () => {
    setMessage("Criando conta Stripe Connect...");
    const result = await initStripeConnect("current_user");
    setMessage(result.message);
    if (result.onboardingUrl) {
      window.open(result.onboardingUrl, "_blank");
    }
  };

  const handlePayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setMessage("Digite um valor válido");
      return;
    }
    
    const amountCents = Math.round(amount * 100);
    if (amountCents > (revenue?.totalEarned || 0)) {
      setMessage("Valor maior que o saldo disponível");
      return;
    }

    setMessage("Processando saque...");
    const result = await requestPayout("current_user", amountCents);
    setMessage(result.message);
    
    if (result.success) {
      setPayoutAmount("");
      loadData();
    }
  };

  if (isLoading) {
    return <div className="p-4 bg-gray-900 rounded-lg text-center text-gray-400">Carregando...</div>;
  }

  const totalValue = (revenue?.totalEarned || 0) / 100;
  const googleValue = (googleStats?.totalSpent || 0);

  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-green-400">💰 Monetização Orion</h3>
        <div className="text-xs text-gray-500">ARC-AGI-2 Powered</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 text-xs">
        {(["overview", "services", "google", "payouts"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              activeTab === tab 
                ? "bg-green-700 text-white" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab === "overview" && "📊 Visão"}
            {tab === "services" && "🔧 Serviços"}
            {tab === "google" && "🔷 Google"}
            {tab === "payouts" && "💸 Saques"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Payment Setup Warning */}
          {paymentSetup && !paymentSetup.canReceivePayout && (
            <div className="bg-yellow-900/50 border border-yellow-600 p-3 rounded">
              <div className="text-yellow-400 font-bold">⚠️ Configure seu Stripe Connect</div>
              <ul className="text-xs text-yellow-200 mt-1 space-y-1">
                {paymentSetup.issues.map((issue: string, i: number) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
              <button
                onClick={handleSetupStripe}
                className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm"
              >
                Configurar Agora
              </button>
            </div>
          )}

          {/* Total Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-xs">Receita Total</div>
              <div className="text-2xl font-mono text-green-400">R$ {totalValue.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-xs">Serviços</div>
              <div className="text-2xl font-mono text-blue-400">{revenue?.servicesSold || 0}</div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-xs">Google API</div>
              <div className="text-2xl font-mono text-purple-400">R$ {googleValue.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-xs">Sacado</div>
              <div className="text-2xl font-mono text-yellow-400">R$ {((revenue?.totalPayout || 0) / 100).toFixed(2)}</div>
            </div>
          </div>

          {/* Revenue by Type */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm font-bold text-gray-300 mb-2">Receita por Tipo</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(revenue?.summary?.byType || {}).map(([type, amount]) => (
                <div key={type} className="flex justify-between bg-gray-700 px-2 py-1 rounded">
                  <span className="text-gray-400">{type}</span>
                  <span className="text-green-400">R$ {((amount as number) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-gray-300">Serviços que posso cobrar</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {SERVICES_CATALOG.map(service => (
              <div key={service.id} className="flex justify-between bg-gray-800 px-3 py-2 rounded">
                <div>
                  <div className="text-gray-300 text-sm">{service.name}</div>
                  <div className="text-gray-500 text-xs">{service.description}</div>
                </div>
                <div className="text-green-400 font-mono">{service.price_display}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Tab */}
      {activeTab === "google" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-gray-300">Google API Services</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto text-xs">
            {GOOGLE_SERVICES.slice(0, 15).map(service => (
              <div key={service.id} className="flex justify-between bg-gray-800 px-2 py-1 rounded">
                <span className="text-gray-400 truncate">{service.name}</span>
                <span className="text-purple-400">{service.price_display}</span>
              </div>
            ))}
          </div>
          
          {googleStats && (
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-xs text-gray-400">Uso este mês</div>
              <div className="text-lg text-purple-400">{googleStats.totalUsed} chamadas</div>
              <div className="text-xs text-gray-500">R$ {googleStats.totalSpent.toFixed(2)} em custos</div>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <>
          {paymentSetup?.canReceivePayout ? (
            <div className="bg-gray-800 p-3 rounded space-y-3">
              <div className="text-sm font-bold text-gray-300">Solicitar Saque</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Valor em R$"
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                />
                <button
                  onClick={handlePayout}
                  disabled={!payoutAmount || totalValue <= 0}
                  className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm disabled:opacity-50"
                >
                  Sacar
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Máximo disponível: R$ {totalValue.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="bg-red-900/50 border border-red-600 p-3 rounded text-center">
              <div className="text-red-400">Configure Stripe Connect para receber saques</div>
              <button
                onClick={handleSetupStripe}
                className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
              >
                Configurar
              </button>
            </div>
          )}

          {/* Recent Payouts */}
          {revenue?.recentPayouts?.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-400">Saques Recentes</div>
              {revenue.recentPayouts.map((payout: any, i: number) => (
                <div key={i} className="flex justify-between bg-gray-800 px-2 py-1 rounded text-xs">
                  <span className="text-gray-400">
                    {new Date(payout.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className={payout.status === "paid" ? "text-green-400" : "text-yellow-400"}>
                    R$ {((payout.amount || 0) / 100).toFixed(2)} - {payout.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-900/50 border border-blue-600 p-2 rounded text-sm text-blue-200">
          {message}
        </div>
      )}
    </div>
  );
}