/**
 * ═══ ARC-AGI-2 Gateway Panel ═══
 * Painel de diagnóstico e controle do Gateway de Internet e API Learning
 */

import { useState, useEffect } from "react";
import {
  getGatewayState, getGatewayDiagnostics, activateGateway, scanAllAPIs, resetGateway,
  getDiscoveredAPIs, queryInternet,
} from "@/lib/neural/arc-gateway";
import {
  getLearnedAPIs, getFrameworkKnowledge,
  getAPILearnerDiagnostics as getAPILearnerDiag,
} from "@/lib/neural/arc-api-learner";

// Local no-op stubs for legacy buttons
const resetAPIKnowledge = () => {
  try {
    localStorage.removeItem("orion_arc_learned_apis");
    localStorage.removeItem("orion_arc_framework_knowledge");
  } catch { /* empty */ }
};

export default function ARCGatewayPanel() {
  const [gatewayState, setGatewayState] = useState(getGatewayState());
  const [gatewayDiag, setGatewayDiag] = useState(getGatewayDiagnostics());
  const [apiLearnerDiag, setAPILearnerDiag] = useState(getAPILearnerDiag());
  const [discoveredAPIs, setDiscoveredAPIs] = useState(getDiscoveredAPIs());
  const [learnedAPIs, setLearnedAPIs] = useState(getLearnedAPIs());
  const [frameworkKnowledge, setFrameworkKnowledge] = useState(getFrameworkKnowledge());
  const [isScanning, setIsScanning] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testQuery, setTestQuery] = useState("");

  const refresh = () => {
    setGatewayState(getGatewayState());
    setGatewayDiag(getGatewayDiagnostics());
    setAPILearnerDiag(getAPILearnerDiag());
    setDiscoveredAPIs(getDiscoveredAPIs());
    setLearnedAPIs(getLearnedAPIs());
    setFrameworkKnowledge(getFrameworkKnowledge());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleActivate = async () => {
    const state = await activateGateway();
    setGatewayState(state);
    refresh();
  };

  const handleScan = async () => {
    setIsScanning(true);
    const results = await scanAllAPIs();
    setDiscoveredAPIs(results);
    setIsScanning(false);
    refresh();
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;
    const result = await queryInternet(testQuery, "auto");
    setTestResult(result.success 
      ? `✅ Sucesso (${result.latency}ms)\nFonte: ${result.source}\n${result.reasoning}\n\n${JSON.stringify(result.data).slice(0, 500)}`
      : `❌ Falhou: ${result.reasoning}`
    );
  };

  const handleReset = () => {
    resetGateway();
    resetAPIKnowledge();
    refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-400";
      case "learning": return "text-yellow-400";
      case "connecting": return "text-blue-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cyan-400">🌐 ARC-AGI-2 Gateway</h3>
        <span className={`font-mono ${getStatusColor(gatewayState.status)}`}>
          [{gatewayState.status.toUpperCase()}]
        </span>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">APIs Ativas</div>
          <div className="text-xl font-mono text-green-400">{gatewayState.activeAPIs}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Descobertas</div>
          <div className="text-xl font-mono text-blue-400">{gatewayState.discoveredAPIs}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Padrões Aprendidos</div>
          <div className="text-xl font-mono text-yellow-400">{gatewayState.learnedPatterns}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Requisições</div>
          <div className="text-xl font-mono text-purple-400">{gatewayState.totalRequests}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleActivate}
          disabled={gatewayState.status === "active"}
          className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm disabled:opacity-50"
        >
          Ativar Gateway
        </button>
        <button
          onClick={handleScan}
          disabled={isScanning || gatewayState.status !== "active"}
          className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-sm disabled:opacity-50"
        >
          {isScanning ? "Escaneando..." : "Escanear APIs"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Test Query */}
      <div className="flex gap-2">
        <input
          type="text"
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="Testar: 'tempo em sp', 'bitcoin', 'notícia'..."
          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
        />
        <button
          onClick={handleTestQuery}
          disabled={!testQuery.trim() || gatewayState.status !== "active"}
          className="px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-sm disabled:opacity-50"
        >
          Testar
        </button>
      </div>
      {testResult && (
        <pre className="bg-gray-950 p-2 rounded text-xs text-green-300 overflow-x-auto max-h-32">
          {testResult}
        </pre>
      )}

      {/* API List */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-300">APIs Disponíveis</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {discoveredAPIs.slice(0, 8).map((api) => (
            <div key={api.name} className="flex justify-between bg-gray-800 px-2 py-1 rounded">
              <span className="text-gray-300">{api.name}</span>
              <span className={api.status === "working" ? "text-green-400" : api.status === "failed" ? "text-red-400" : "text-gray-500"}>
                {api.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API Learner Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">APIs Aprendidas</div>
          <div className="text-lg font-mono text-cyan-400">{apiLearnerDiag.learnedAPIs}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Frameworks Conhecidos</div>
          <div className="text-lg font-mono text-cyan-400">{apiLearnerDiag.frameworkKnowledge}</div>
        </div>
      </div>

      {/* Learned APIs */}
      {learnedAPIs.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gray-400">APIs Aprendidas</h4>
          {learnedAPIs.slice(0, 3).map((api) => (
            <div key={api.name} className="text-xs bg-gray-800 px-2 py-1 rounded flex justify-between">
              <span className="text-cyan-300">{api.name}</span>
              <span className="text-gray-500">{api.category} • {api.usageCount}x</span>
            </div>
          ))}
        </div>
      )}

      {/* Frameworks */}
      {frameworkKnowledge.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gray-400">Frameworks Conhecidos</h4>
          {frameworkKnowledge.slice(0, 3).map((fw) => (
            <div key={fw.name} className="text-xs bg-gray-800 px-2 py-1 rounded flex justify-between">
              <span className="text-yellow-300">{fw.name}</span>
              <span className="text-gray-500">{fw.language}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}