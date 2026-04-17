import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Lock, Key, FileCheck, AlertTriangle, Eye,
  CheckCircle, XCircle, Clock, Scale, Fingerprint, Search,
} from "lucide-react";
import {
  oauth2Bridge, zeroTrustBridge, mtlsBridge, gdprAIActBridge,
} from "@/lib/neural/security-compliance-protocols";
import { toast } from "sonner";

// ─── OAuth2/OIDC ───

function OAuth2Tab() {
  const clients = oauth2Bridge.allClients;
  const sessions = oauth2Bridge.allSessions;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Key className="h-4 w-4" /> OAuth2 / OpenID Connect
      </h3>
      {clients.map(c => {
        const session = sessions.find(s => s.clientId === c.clientId);
        return (
          <Card key={c.clientId}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{c.clientName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground ml-2">{c.clientId}</span>
                </div>
                <Badge variant={session?.state === "authenticated" ? "default" : "secondary"} className="text-[9px]">
                  {session?.state ?? "unknown"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.grantTypes.map(g => <Badge key={g} variant="outline" className="text-[8px]">{g}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {c.scopes.map(s => <Badge key={s} variant="secondary" className="text-[8px]">{s}</Badge>)}
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">Issuer: {c.issuer}</div>
              {session?.claims && (
                <div className="text-[9px] p-2 bg-muted rounded">
                  <div>Sub: {session.claims.sub}</div>
                  <div>Email: {session.claims.email}</div>
                  <div>Exp: {new Date(session.claims.exp * 1000).toLocaleString()}</div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Zero Trust ───

function ZeroTrustTab() {
  const policies = zeroTrustBridge.allPolicies;
  const log = zeroTrustBridge.recentAccessLog;

  const decisionColor: Record<string, string> = {
    allow: "default", deny: "destructive", challenge: "secondary", step_up: "outline",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Shield className="h-4 w-4" /> Zero Trust (NIST SP 800-207)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Políticas ({policies.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {policies.map(p => (
              <div key={p.policyId} className="border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 pb-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant={(decisionColor[p.decision] ?? "secondary") as any} className="text-[8px]">{p.decision}</Badge>
                </div>
                <div className="text-muted-foreground">{p.description}</div>
                <div className="flex gap-1 mt-1">
                  {p.resources.map(r => <Badge key={r} variant="outline" className="text-[8px] font-mono">{r}</Badge>)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Log de Acesso ({log.length})</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {log.slice(-20).reverse().map(l => (
                  <div key={l.requestId} className="flex items-center justify-between text-[9px] border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20 pb-1">
                    <div>
                      <span className="font-mono">{l.resource}</span>
                      <span className="text-muted-foreground ml-1">({l.action})</span>
                    </div>
                    <Badge variant={(decisionColor[l.decision] ?? "secondary") as any} className="text-[8px]">{l.decision}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── mTLS ───

function MTLSTab() {
  const cas = mtlsBridge.allCAs;
  const connections = mtlsBridge.allConnections;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Lock className="h-4 w-4" /> Mutual TLS (mTLS)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Certificate Authorities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cas.map(ca => (
              <div key={ca.name} className="text-[10px] border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 pb-2">
                <div className="font-medium flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" /> {ca.name}
                </div>
                <div className="text-muted-foreground mt-1">
                  Emitidos: {ca.issuedCount} • Revogados: {ca.revokedCount}
                </div>
                <div className="font-mono text-[9px]">
                  CN: {ca.rootCertificate.subject.CN}
                </div>
                {ca.ocspResponder && (
                  <div className="text-[9px] text-muted-foreground">OCSP: {ca.ocspResponder}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Conexões Ativas ({connections.length})</CardTitle></CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem conexões mTLS ativas</p>
            ) : (
              <div className="space-y-2">
                {connections.map(c => (
                  <div key={c.connectionId} className="text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{c.peerCertificate.subject.CN}</span>
                      <Badge variant={c.established ? "default" : "destructive"} className="text-[8px]">
                        {c.established ? c.protocol : "Closed"}
                      </Badge>
                    </div>
                    <div className="text-[9px] text-muted-foreground">{c.cipherSuite}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── GDPR / AI Act ───

function GDPRAIActTab() {
  const records = gdprAIActBridge.allProcessingRecords;
  const dsrs = gdprAIActBridge.allDSRs;
  const aiSystems = gdprAIActBridge.allAICompliance;
  const auditLog = gdprAIActBridge.recentAuditLog;

  const riskColor: Record<string, string> = {
    unacceptable: "destructive", high: "destructive", limited: "secondary", minimal: "outline",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Scale className="h-4 w-4" /> GDPR & AI Act Compliance
      </h3>

      {/* AI Systems */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs">Sistemas de IA Registrados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {aiSystems.map(sys => (
            <div key={sys.systemId} className="space-y-2 border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{sys.systemName}</span>
                <div className="flex gap-1">
                  <Badge variant={(riskColor[sys.riskLevel] ?? "outline") as any} className="text-[9px]">
                    Risco: {sys.riskLevel}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">Score: {sys.complianceScore}%</Badge>
                </div>
              </div>
              <Progress value={sys.complianceScore} className="h-1.5" />
              <div className="text-[10px] text-muted-foreground">{sys.intendedPurpose}</div>
              <div className="flex items-center gap-2 text-[9px]">
              {sys.transparencyObligations.disclosedAsAI ? (
                  <span className="flex items-center gap-1 text-primary"><CheckCircle className="h-3 w-3" /> Divulgado como IA</span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> Não divulgado</span>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => {
                const result = gdprAIActBridge.auditAISystem(sys.systemId);
                toast[result.compliant ? "success" : "warning"](
                  `Auditoria: ${result.score}% — ${result.issues.length} issues`
                );
              }}>
                <Search className="h-3 w-3 mr-1" /> Auditar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Processing Records */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Registros de Processamento (Art. 30)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="text-[10px] border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 pb-2">
                <div className="font-medium">{r.purpose}</div>
                <div className="text-muted-foreground">
                  Base: {r.lawfulBasis} • Retenção: {r.retentionPeriod}
                </div>
                <div className="flex gap-1 mt-1">
                  {r.technicalMeasures.slice(0, 3).map(m => (
                    <Badge key={m} variant="outline" className="text-[8px]">{m}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DSR Queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              Solicitações de Titulares
              {gdprAIActBridge.pendingDSRs.length > 0 && (
                <Badge variant="destructive" className="text-[9px]">{gdprAIActBridge.pendingDSRs.length} pendentes</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dsrs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Sem solicitações</p>
            ) : (
              <div className="space-y-1">
                {dsrs.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-[10px]">
                    <span>{d.right}</span>
                    <Badge variant="outline" className="text-[8px]">{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" className="h-6 text-[9px] w-full mt-2" onClick={() => {
              gdprAIActBridge.submitDSR("subject_test", "access");
              toast.success("DSR submetido: direito de acesso");
            }}>
              Simular DSR
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {auditLog.slice(-15).reverse().map(l => (
                <div key={l.id} className="flex items-center gap-2 text-[9px] border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20 pb-1">
                  <Badge variant={l.severity === "critical" ? "destructive" : l.severity === "warning" ? "secondary" : "outline"} className="text-[8px] shrink-0">
                    {l.category}
                  </Badge>
                  <span>{l.action}</span>
                  {l.regulatoryReference && (
                    <span className="text-muted-foreground font-mono">{l.regulatoryReference}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ───

export default function SecurityCompliancePanel() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="oauth2">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="oauth2" className="text-[11px] gap-1"><Key className="h-3 w-3" /> OAuth2/OIDC</TabsTrigger>
          <TabsTrigger value="zerotrust" className="text-[11px] gap-1"><Shield className="h-3 w-3" /> Zero Trust</TabsTrigger>
          <TabsTrigger value="mtls" className="text-[11px] gap-1"><Lock className="h-3 w-3" /> mTLS</TabsTrigger>
          <TabsTrigger value="gdpr" className="text-[11px] gap-1"><Scale className="h-3 w-3" /> GDPR/AI Act</TabsTrigger>
        </TabsList>
        <TabsContent value="oauth2"><OAuth2Tab /></TabsContent>
        <TabsContent value="zerotrust"><ZeroTrustTab /></TabsContent>
        <TabsContent value="mtls"><MTLSTab /></TabsContent>
        <TabsContent value="gdpr"><GDPRAIActTab /></TabsContent>
      </Tabs>
      <Card>
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {["RFC 6749 (OAuth2)", "OpenID Connect", "NIST SP 800-207", "mTLS/TLSv1.3", "GDPR", "AI Act (EU 2024/1689)"].map(b => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
