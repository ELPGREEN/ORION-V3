import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  Zap,
  Activity,
  Shield,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  BarChart3,
  Atom,
} from "lucide-react";
import {
  listQPUs,
  getQPUStatus,
  createInstance,
  getInstanceMetrics,
  createJob,
  executeJob,
  getIBMQuantumCredentials,
} from "@/lib/neural/qiskit-runtime";
import type {
  QPUProfile,
  QiskitInstance,
  RuntimeJob,
  InstanceMetrics,
  QPUId,
  ErrorMitigationType,
} from "@/lib/neural/qiskit-runtime";
import { vqcForwardWithRuntime } from "@/lib/neural/vqc";
import type { RuntimeForwardResult } from "@/lib/neural/vqc";
import { DEFAULT_VQC_CONFIG } from "@/lib/neural/vqc";

interface JobHistoryEntry {
  id: string;
  qpuId: string;
  status: string;
  shots: number;
  mitigation: string;
  value: number;
  mitigatedValue: number;
  transpiledDepth: number;
  originalDepth: number;
  timestamp: Date;
}

const ACCENT = "#00D4FF";
const GOLD = "#D4AF37";
const GREEN = "#22c55e";
const RED = "#ef4444";

function cardStyle(accentColor: string) {
  return {
    backgroundColor: "rgba(10,10,15,0.6)",
    border: `1px solid ${accentColor}22`,
    boxShadow: `0 0 15px ${accentColor}08`,
  };
}

export function QuantumRuntimeDashboard() {
  const [qpus, setQpus] = useState<(QPUProfile & { queueDepth: number; avgWaitSeconds: number })[]>([]);
  const [instance, setInstance] = useState<QiskitInstance | null>(null);
  const [instanceMetrics, setInstanceMetrics] = useState<InstanceMetrics | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(() => {
    const qpuList = listQPUs().map((qpu) => {
      const status = getQPUStatus(qpu.id);
      return { ...qpu, queueDepth: status.queueDepth, avgWaitSeconds: status.avgWaitSeconds };
    });
    setQpus(qpuList);

    if (!instance) {
      const inst = createInstance({ plan: "standard", region: "us-east" });
      setInstance(inst);
      setInstanceMetrics(getInstanceMetrics(inst));
    }
    setLastRefresh(new Date());
  }, [instance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runBenchmark = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const mitigations: ErrorMitigationType[] = ["zne", "m3", "pec"];
      const qpuIds: QPUId[] = ["simulator_stabilizer", "ibm_brisbane", "ibm_osaka"];
      const newJobs: JobHistoryEntry[] = [];

      for (const mitigation of mitigations) {
        const qpuId = qpuIds[Math.floor(Math.random() * qpuIds.length)];
        const input = Array.from({ length: 4 }, () => Math.random());
        const params = Array.from({ length: 3 }, () =>
          Array.from({ length: 4 }, () =>
            Array.from({ length: 3 }, () => (Math.random() - 0.5) * 2 * Math.PI)
          )
        );

        try {
          const result: RuntimeForwardResult = vqcForwardWithRuntime(input, params, {
            qpuId,
            errorMitigation: mitigation,
            shots: 1024,
          });

          newJobs.push({
            id: result.jobId,
            qpuId: result.qpuId,
            status: "completed",
            shots: result.shots,
            mitigation,
            value: result.value,
            mitigatedValue: result.mitigatedValue,
            transpiledDepth: result.transpiledDepth,
            originalDepth: result.originalDepth,
            timestamp: new Date(),
          });
        } catch {
          newJobs.push({
            id: `failed-${Date.now()}`,
            qpuId,
            status: "failed",
            shots: 1024,
            mitigation,
            value: 0,
            mitigatedValue: 0,
            transpiledDepth: 0,
            originalDepth: 0,
            timestamp: new Date(),
          });
        }
      }

      setJobHistory((prev) => [...newJobs, ...prev].slice(0, 20));
      if (instance) {
        setInstanceMetrics(getInstanceMetrics(instance));
      }
      setIsRunning(false);
    }, 800);
  }, [instance]);

  const creds = getIBMQuantumCredentials();
  const onlineQPUs = qpus.filter((q) => q.status === "online");
  const totalQubits = onlineQPUs.reduce((sum, q) => sum + q.nQubits, 0);
  const completedJobs = jobHistory.filter((j) => j.status === "completed");
  const avgMitigationDelta =
    completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + Math.abs(j.mitigatedValue - j.value), 0) / completedJobs.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${ACCENT}20, ${GOLD}20)` }}>
            <Atom className="h-6 w-6" style={{ color: ACCENT, filter: `drop-shadow(0 0 6px ${ACCENT}80)` }} />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono tracking-wider" style={{ color: ACCENT }}>
              QUANTUM RUNTIME
            </h2>
            <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
              IBM Quantum • {creds.iamId} • Qiskit Runtime v2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            {lastRefresh.toLocaleTimeString()}
          </span>
          <Button size="sm" variant="outline" onClick={loadData} className="h-7 gap-1 text-xs border-border">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={runBenchmark}
            disabled={isRunning}
            className="h-7 gap-1 text-xs"
            style={{ background: `linear-gradient(135deg, ${ACCENT}80, ${GOLD}80)` }}
          >
            {isRunning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {isRunning ? "Executando..." : "Run VQC Benchmark"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Cpu, label: "QPUs Online", value: onlineQPUs.length, sub: `${totalQubits} qubits totais`, color: GREEN },
          { icon: Server, label: "Instância", value: instance?.plan?.toUpperCase() || "—", sub: instance?.region || "", color: ACCENT },
          { icon: BarChart3, label: "Jobs Executados", value: jobHistory.length, sub: `${completedJobs.length} completos`, color: GOLD },
          { icon: Shield, label: "Δ Mitigação Média", value: (avgMitigationDelta * 100).toFixed(2) + "%", sub: "ZNE / M3 / PEC", color: "#a78bfa" },
        ].map((card, i) => (
          <Card key={i} className="relative overflow-hidden border-0" style={cardStyle(card.color)}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.color}40, transparent)` }} />
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] font-mono font-medium flex items-center gap-1.5 tracking-wider uppercase" style={{ color: `${card.color}90` }}>
                <card.icon className="h-3.5 w-3.5" style={{ color: card.color, filter: `drop-shadow(0 0 4px ${card.color}60)` }} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-2xl font-bold font-mono" style={{ color: card.color, textShadow: `0 0 15px ${card.color}40` }}>
                {card.value}
              </p>
              <p className="text-[9px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QPU Status Grid */}
      <Card className="border-0" style={cardStyle(ACCENT)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2" style={{ color: `${ACCENT}cc` }}>
            <Cpu className="h-4 w-4" style={{ color: ACCENT }} /> QPU STATUS REGISTRY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {qpus.map((qpu) => (
              <div
                key={qpu.id}
                className="rounded-lg p-3 space-y-2"
                style={{
                  backgroundColor: "rgba(0,0,0,0.3)",
                  border: `1px solid ${qpu.status === "online" ? GREEN : RED}20`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {qpu.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[8px] h-4 px-1.5 border-0"
                    style={{
                      backgroundColor: qpu.status === "online" ? `${GREEN}20` : `${RED}20`,
                      color: qpu.status === "online" ? GREEN : RED,
                    }}
                  >
                    {qpu.status === "online" ? "● ONLINE" : "● OFFLINE"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Qubits</span>
                    <p className="font-bold" style={{ color: ACCENT }}>{qpu.nQubits}</p>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Processor</span>
                    <p className="font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>{qpu.processor} {qpu.revision}</p>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Queue</span>
                    <p className="font-bold" style={{ color: qpu.queueDepth > 10 ? GOLD : GREEN }}>{qpu.queueDepth} jobs</p>
                  </div>
                </div>

                {!qpu.isSimulator && (
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>T1</span>
                      <p style={{ color: "rgba(255,255,255,0.6)" }}>{qpu.t1Microseconds}μs</p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>T2</span>
                      <p style={{ color: "rgba(255,255,255,0.6)" }}>{qpu.t2Microseconds}μs</p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Gate Err</span>
                      <p style={{ color: "rgba(255,255,255,0.6)" }}>{(qpu.gateErrorRate * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                )}

                {qpu.isSimulator && (
                  <p className="text-[9px] font-mono" style={{ color: `${ACCENT}60` }}>
                    ∞ coherence • Zero noise • Ideal gates
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instance & Metrics */}
      {instance && instanceMetrics && (
        <Card className="border-0" style={cardStyle(GOLD)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2" style={{ color: `${GOLD}cc` }}>
              <Server className="h-4 w-4" style={{ color: GOLD }} /> ACTIVE INSTANCE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
              <div>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Instance ID</span>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{instance.id.split(":").pop()}</p>
              </div>
              <div>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Plan</span>
                <Badge variant="outline" className="text-[9px] h-4 mt-0.5 border-0" style={{ backgroundColor: `${GOLD}20`, color: GOLD }}>
                  {instance.plan.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Region</span>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>{instance.region}</p>
              </div>
              <div>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>Max Qubits</span>
                <p style={{ color: ACCENT }}>{instance.maxQubits}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Utilization</span>
                <span style={{ color: GOLD }}>{instanceMetrics.utilizationPercent.toFixed(1)}%</span>
              </div>
              <Progress value={instanceMetrics.utilizationPercent} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card className="border-0" style={cardStyle(ACCENT)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2" style={{ color: `${ACCENT}cc` }}>
              <Activity className="h-4 w-4" style={{ color: ACCENT }} /> JOB HISTORY
              {jobHistory.length > 0 && (
                <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-0" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>
                  {jobHistory.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {jobHistory.length === 0 ? (
            <div className="text-center py-8">
              <Atom className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                Nenhum job executado. Clique "Run VQC Benchmark" para iniciar.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {jobHistory.map((job, i) => (
                <div
                  key={`${job.id}-${i}`}
                  className="rounded-lg p-3 flex items-center gap-3"
                  style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {job.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GREEN }} />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: RED }} />
                  )}

                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-6 gap-2 text-[9px] font-mono">
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Job</span>
                      <p className="truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{job.id.slice(-8)}</p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>QPU</span>
                      <p style={{ color: ACCENT }}>{job.qpuId.replace("_", " ")}</p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Mitigation</span>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-0 mt-0.5" style={{
                        backgroundColor: job.mitigation === "zne" ? `${ACCENT}15` : job.mitigation === "m3" ? `${GOLD}15` : `${GREEN}15`,
                        color: job.mitigation === "zne" ? ACCENT : job.mitigation === "m3" ? GOLD : GREEN,
                      }}>
                        {job.mitigation.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Raw → Mitigated</span>
                      <p>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>{job.value.toFixed(4)}</span>
                        <span style={{ color: "rgba(255,255,255,0.25)" }}> → </span>
                        <span style={{ color: GREEN }}>{job.mitigatedValue.toFixed(4)}</span>
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Depth</span>
                      <p>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>{job.originalDepth}</span>
                        <span style={{ color: "rgba(255,255,255,0.25)" }}> → </span>
                        <span style={{ color: ACCENT }}>{job.transpiledDepth}</span>
                        {job.originalDepth > 0 && (
                          <span style={{ color: GREEN }} className="ml-1">
                            (-{((1 - job.transpiledDepth / job.originalDepth) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>Time</span>
                      <p style={{ color: "rgba(255,255,255,0.5)" }}>
                        {job.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Mitigation Comparison */}
      {completedJobs.length > 0 && (
        <Card className="border-0" style={cardStyle("#a78bfa")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2" style={{ color: "#a78bfacc" }}>
              <Shield className="h-4 w-4" style={{ color: "#a78bfa" }} /> ERROR MITIGATION ANALYSIS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["zne", "m3", "pec"] as const).map((type) => {
                const jobs = completedJobs.filter((j) => j.mitigation === type);
                const avgDelta = jobs.length > 0
                  ? jobs.reduce((s, j) => s + Math.abs(j.mitigatedValue - j.value), 0) / jobs.length
                  : 0;
                const avgDepthReduction = jobs.length > 0
                  ? jobs.reduce((s, j) => s + (j.originalDepth > 0 ? (1 - j.transpiledDepth / j.originalDepth) * 100 : 0), 0) / jobs.length
                  : 0;
                const color = type === "zne" ? ACCENT : type === "m3" ? GOLD : GREEN;

                return (
                  <div
                    key={type}
                    className="rounded-lg p-3 space-y-2"
                    style={{ backgroundColor: "rgba(0,0,0,0.3)", border: `1px solid ${color}20` }}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] h-5 px-2 border-0 font-bold" style={{ backgroundColor: `${color}20`, color }}>
                        {type.toUpperCase()}
                      </Badge>
                      <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {jobs.length} jobs
                      </span>
                    </div>
                    <div className="text-[9px] font-mono space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Avg Correction</span>
                        <span style={{ color }}>{(avgDelta * 100).toFixed(3)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Depth Reduction</span>
                        <span style={{ color: GREEN }}>{avgDepthReduction.toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {type === "zne" && "Zero Noise Extrapolation — Richardson extrapolation"}
                      {type === "m3" && "Matrix-free Measurement Mitigation — Bayesian"}
                      {type === "pec" && "Probabilistic Error Cancellation — quasi-probability"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
