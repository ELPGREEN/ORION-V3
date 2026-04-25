/**
 * ─── Evolution Sandbox & Proposal Pipeline ───
 * Ensures that autonomous self-improvement is supervised and safe.
 */

export interface EvolutionProposal {
  id: string;
  type: string;
  description: string;
  riskLevel: "safe" | "moderate" | "critical";
  subsystem: string;
  suggestedChanges: string;
  status: "pending" | "approved" | "rejected" | "implemented";
  createdAt: number;
}

let _proposals: EvolutionProposal[] = [];

export function createProposal(params: Omit<EvolutionProposal, "id" | "status" | "createdAt">): EvolutionProposal {
  const proposal: EvolutionProposal = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: Date.now(),
    ...params,
  };

  _proposals.push(proposal);
  console.log(`[EvolutionSandbox] Novo proposta registrada: ${proposal.description} [${proposal.riskLevel}]`);

  // Persist to localStorage for dashboard visibility
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("orion_evolution_proposals") || "[]";
      const list = JSON.parse(stored);
      list.push(proposal);
      localStorage.setItem("orion_evolution_proposals", JSON.stringify(list));
    } catch { /* empty */ }
  }

  return proposal;
}

export function getPendingProposals(): EvolutionProposal[] {
  return _proposals.filter(p => p.status === "pending");
}

export function updateProposalStatus(id: string, status: EvolutionProposal["status"]): void {
  const p = _proposals.find(p => p.id === id);
  if (p) p.status = status;
}
