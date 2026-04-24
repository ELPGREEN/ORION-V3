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
  getRevenueDashboard as getFullRevenueDashboard,
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
import { getConsciousnessDiagnostics } from "@/lib/neural/rag-consciousness";
import { getGatewayDiagnostics } from "@/lib/neural/arc-gateway";

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
    return <div className="p-4 tron-panel text-center text-[hsl(var(--tron-muted))]">Carregando...</div>;
  }

  const totalValue = (revenue?.totalEarned || 0) / 100;
  const googleValue = (googleStats?.totalSpent || 0);

  return (
    <div className="p-4 tron-panel space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[hsl(var(--tron-neon))]">💰 Monetização Orion</h3>
        <div className="text-xs text-[hsl(var(--tron-muted))]">ARC-AGI-3 Powered</div>
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
                : "bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] text-[hsl(var(--tron-muted))] hover:bg-[hsl(var(--tron-surface-2))]"
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
              <div className="text-[hsl(var(--tron-warn))] font-bold">⚠️ Configure seu Stripe Connect</div>
              <ul className="text-xs text-yellow-200 mt-1 space-y-1">
                {paymentSetup.issues.map((issue: string, i: number) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
              <button
                onClick={handleSetupStripe}
                className="mt-2 px-3 py-1 bg-[hsl(var(--tron-warn)/0.18)] hover:bg-[hsl(var(--tron-warn)/0.3)] border border-[hsl(var(--tron-warn)/0.5)] text-[hsl(var(--tron-warn))] rounded text-sm"
              >
                Configurar Agora
              </button>
            </div>
          )}

          {/* Total Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
              <div className="text-[hsl(var(--tron-muted))] text-xs">Receita Total</div>
              <div className="text-2xl font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]">R$ {totalValue.toFixed(2)}</div>
            </div>
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
              <div className="text-[hsl(var(--tron-muted))] text-xs">Serviços</div>
              <div className="text-2xl font-mono text-[hsl(var(--tron-info))]">{revenue?.servicesSold || 0}</div>
            </div>
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
              <div className="text-[hsl(var(--tron-muted))] text-xs">Google API</div>
              <div className="text-2xl font-mono text-[hsl(var(--tron-neon-soft))]">R$ {googleValue.toFixed(2)}</div>
            </div>
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
              <div className="text-[hsl(var(--tron-muted))] text-xs">Sacado</div>
              <div className="text-2xl font-mono text-[hsl(var(--tron-warn))]">R$ {((revenue?.totalPayout || 0) / 100).toFixed(2)}</div>
            </div>
          </div>

          {/* Revenue by Type */}
          <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
            <div className="text-sm font-bold text-[hsl(var(--tron-muted))] mb-2">Receita por Tipo</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(revenue?.summary?.byType || {}).map(([type, amount]) => (
                <div key={type} className="flex justify-between bg-[hsl(var(--tron-surface-2))] px-2 py-1 rounded">
                  <span className="text-[hsl(var(--tron-muted))]">{type}</span>
                  <span className="text-[hsl(var(--tron-neon))]">R$ {((amount as number) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-[hsl(var(--tron-muted))]">Serviços que posso cobrar</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {SERVICES_CATALOG.map(service => (
              <div key={service.id} className="flex justify-between bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-3 py-2 rounded">
                <div>
                  <div className="text-[hsl(var(--tron-muted))] text-sm">{service.name}</div>
                  <div className="text-[hsl(var(--tron-muted))] text-xs">{service.description}</div>
                </div>
                <div className="text-[hsl(var(--tron-neon))] font-mono">{service.price_display}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Tab */}
      {activeTab === "google" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-[hsl(var(--tron-muted))]">Google API Services</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto text-xs">
            {GOOGLE_SERVICES.slice(0, 15).map(service => (
              <div key={service.id} className="flex justify-between bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-2 py-1 rounded">
                <span className="text-[hsl(var(--tron-muted))] truncate">{service.name}</span>
                <span className="text-[hsl(var(--tron-neon-soft))]">{service.price_display}</span>
              </div>
            ))}
          </div>
          
          {googleStats && (
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded">
              <div className="text-xs text-[hsl(var(--tron-muted))]">Uso este mês</div>
              <div className="text-lg text-[hsl(var(--tron-neon-soft))]">{googleStats.totalUsed} chamadas</div>
              <div className="text-xs text-[hsl(var(--tron-muted))]">R$ {googleStats.totalSpent.toFixed(2)} em custos</div>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <>
          {paymentSetup?.canReceivePayout ? (
            <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-3 rounded space-y-3">
              <div className="text-sm font-bold text-[hsl(var(--tron-muted))]">Solicitar Saque</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Valor em R$"
                  className="flex-1 px-2 py-1 bg-[hsl(var(--tron-surface-2))] border border-[hsl(var(--tron-neon)/0.25)] rounded text-sm"
                />
                <button
                  onClick={handlePayout}
                  disabled={!payoutAmount || totalValue <= 0}
                  className="px-3 py-1 bg-[hsl(var(--tron-neon)/0.18)] hover:bg-[hsl(var(--tron-neon)/0.3)] border border-[hsl(var(--tron-neon)/0.5)] text-[hsl(var(--tron-neon))] rounded text-sm disabled:opacity-50"
                >
                  Sacar
                </button>
              </div>
              <div className="text-xs text-[hsl(var(--tron-muted))]">
                Máximo disponível: R$ {totalValue.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="bg-red-900/50 border border-red-600 p-3 rounded text-center">
              <div className="text-[hsl(var(--tron-danger))]">Configure Stripe Connect para receber saques</div>
              <button
                onClick={handleSetupStripe}
                className="mt-2 px-3 py-1 bg-[hsl(var(--tron-danger)/0.18)] hover:bg-[hsl(var(--tron-danger)/0.3)] border border-[hsl(var(--tron-danger)/0.5)] text-[hsl(var(--tron-danger))] rounded text-sm"
              >
                Configurar
              </button>
            </div>
          )}

          {/* Recent Payouts */}
          {revenue?.recentPayouts?.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-[hsl(var(--tron-muted))]">Saques Recentes</div>
              {revenue.recentPayouts.map((payout: any, i: number) => (
                <div key={i} className="flex justify-between bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-2 py-1 rounded text-xs">
                  <span className="text-[hsl(var(--tron-muted))]">
                    {new Date(payout.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className={payout.status === "paid" ? "text-[hsl(var(--tron-neon))]" : "text-[hsl(var(--tron-warn))]"}>
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