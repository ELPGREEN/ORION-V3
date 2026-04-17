/**
 * ═══ Revenue & Payout Dashboard Panel ═══
 * 
 * Painel para o owner ver suas receitas e solicitar saques
 */

import { useState, useEffect } from "react";
import {
  getRevenueDashboard,
  checkOwnerPaymentSetup,
  requestPayout,
  SERVICES_CATALOG,
  initStripeConnect,
  getStripeConnectStatus,
} from "@/lib/neural/arc-revenue-system";

export default function RevenueDashboardPanel() {
  const [revenue, setRevenue] = useState<any>(null);
  const [paymentSetup, setPaymentSetup] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [revenueData, setupData] = await Promise.all([
        getRevenueDashboard(),
        checkOwnerPaymentSetup("current_user"),
      ]);
      setRevenue(revenueData);
      setPaymentSetup(setupData);
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

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setMessage("Digite um valor válido");
      return;
    }
    
    const amountCents = Math.round(amount * 100);
    if (amountCents > revenue.totalEarned) {
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
    return <div className="p-4 bg-gray-900 rounded-lg">Carregando...</div>;
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-green-400">💰 Sistema de Receitas Orion</h3>
      </div>

      {/* Payment Setup Status */}
      {paymentSetup && !paymentSetup.canReceivePayout && (
        <div className="bg-yellow-900/50 border border-yellow-600 p-3 rounded">
          <div className="text-yellow-400 font-bold">⚠️ Configuração Necessária</div>
          <ul className="text-xs text-yellow-200 mt-1 space-y-1">
            {paymentSetup.issues.map((issue: string, i: number) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
          <button
            onClick={handleSetupStripe}
            className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm"
          >
            Configurar Stripe Connect
          </button>
        </div>
      )}

      {/* Revenue Stats */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400 text-xs">Total Ganho</div>
          <div className="text-xl font-mono text-green-400">
            R$ {((revenue?.totalEarned || 0) / 100).toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400 text-xs">Sacado</div>
          <div className="text-xl font-mono text-blue-400">
            R$ {((revenue?.totalPayout || 0) / 100).toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400 text-xs">Pendente</div>
          <div className="text-xl font-mono text-yellow-400">
            R$ {((revenue?.pending || 0) / 100).toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400 text-xs">Serviços</div>
          <div className="text-xl font-mono text-purple-400">
            {revenue?.servicesSold || 0}
          </div>
        </div>
      </div>

      {/* Request Payout */}
      {paymentSetup?.canReceivePayout && (
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-sm font-bold text-gray-300 mb-2">Solicitar Saque</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Valor em R$"
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
            <button
              onClick={handleRequestPayout}
              disabled={!payoutAmount}
              className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm disabled:opacity-50"
            >
              Sacar
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Máximo disponível: R$ {((revenue?.totalEarned || 0) / 100).toFixed(2)}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-900/50 border border-blue-600 p-2 rounded text-sm text-blue-200">
          {message}
        </div>
      )}

      {/* Services Catalog */}
      <div className="space-y-2">
        <div className="text-sm font-bold text-gray-300">Serviços que posso cobrar</div>
        <div className="grid grid-cols-2 gap-1 text-xs max-h-48 overflow-y-auto">
          {SERVICES_CATALOG.slice(0, 10).map((service) => (
            <div key={service.id} className="flex justify-between bg-gray-800 px-2 py-1 rounded">
              <span className="text-gray-300 truncate">{service.name}</span>
              <span className="text-green-400">{service.price_display}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Charges */}
      {revenue?.recentCharges?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-gray-400">Últimas cobranças</div>
          {revenue.recentCharges.map((charge: any, i: number) => (
            <div key={i} className="flex justify-between text-xs bg-gray-800 px-2 py-1 rounded">
              <span className="text-gray-400">{charge.description || charge.type}</span>
              <span className={charge.status === "paid" ? "text-green-400" : "text-yellow-400"}>
                R$ {((charge.amount || 0) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}