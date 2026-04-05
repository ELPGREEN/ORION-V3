/**
 * ─── Security & Compliance Protocols ───
 * OAuth2/OIDC, Zero Trust Architecture, mTLS, GDPR/AI Act Audit
 * Security protocol bridges and compliance monitoring
 */

// ═══════════════════════════════════════════════
// §1 — OAuth2 / OIDC (RFC 6749, OpenID Connect)
// ═══════════════════════════════════════════════

export type OAuth2GrantType = "authorization_code" | "client_credentials" | "refresh_token" | "device_code" | "urn:ietf:params:oauth:grant-type:jwt-bearer";

export interface OAuth2Client {
  clientId: string;
  clientName: string;
  grantTypes: OAuth2GrantType[];
  redirectUris: string[];
  scopes: string[];
  tokenEndpoint: string;
  authorizationEndpoint: string;
  issuer: string;
  jwksUri?: string;
  registered: boolean;
}

export interface OAuth2Token {
  accessToken: string;
  tokenType: "Bearer" | "DPoP";
  expiresIn: number;
  expiresAt: number;
  refreshToken?: string;
  scope: string;
  idToken?: string;
}

export interface OIDCClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  roles?: string[];
  groups?: string[];
}

export interface OAuth2Session {
  clientId: string;
  token?: OAuth2Token;
  claims?: OIDCClaims;
  state: "inactive" | "authenticating" | "authenticated" | "expired" | "error";
  lastRefresh: number | null;
  errorMessage?: string;
}

export class OAuth2OIDCBridge {
  private clients = new Map<string, OAuth2Client>();
  private sessions = new Map<string, OAuth2Session>();

  registerClient(client: OAuth2Client): void {
    this.clients.set(client.clientId, client);
    this.sessions.set(client.clientId, {
      clientId: client.clientId, state: "inactive", lastRefresh: null,
    });
  }

  get allClients(): OAuth2Client[] { return [...this.clients.values()]; }
  get allSessions(): OAuth2Session[] { return [...this.sessions.values()]; }

  getSession(clientId: string): OAuth2Session | undefined { return this.sessions.get(clientId); }

  async initiateAuth(clientId: string, scopes: string[]): Promise<string> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`Client ${clientId} not registered`);
    const session = this.sessions.get(clientId);
    if (session) session.state = "authenticating";
    const state = `state_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const nonce = `nonce_${Date.now()}`;
    const url = new URL(client.authorizationEndpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("redirect_uri", client.redirectUris[0] ?? "");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    return url.toString();
  }

  processTokenResponse(clientId: string, token: OAuth2Token, claims?: OIDCClaims): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.token = token;
      session.claims = claims;
      session.state = "authenticated";
      session.lastRefresh = Date.now();
    }
  }

  revokeSession(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.token = undefined;
      session.claims = undefined;
      session.state = "inactive";
    }
  }

  isTokenExpired(clientId: string): boolean {
    const session = this.sessions.get(clientId);
    if (!session?.token) return true;
    return Date.now() > session.token.expiresAt;
  }
}

// ═══════════════════════════════════════════════
// §2 — ZERO TRUST ARCHITECTURE (NIST SP 800-207)
// ═══════════════════════════════════════════════

export type TrustLevel = "untrusted" | "low" | "medium" | "high" | "verified";
export type AccessDecision = "allow" | "deny" | "challenge" | "step_up";

export interface ZeroTrustSubject {
  subjectId: string;
  subjectType: "user" | "service" | "device" | "robot";
  identity: string;
  trustLevel: TrustLevel;
  attributes: Record<string, unknown>;
  riskScore: number; // 0-100
  lastVerified: number;
  mfaCompleted: boolean;
  devicePosture: DevicePosture;
}

export interface DevicePosture {
  deviceId: string;
  osVersion?: string;
  patchLevel?: string;
  encryptionEnabled: boolean;
  firewallActive: boolean;
  antivirusActive: boolean;
  jailbroken: boolean;
  complianceScore: number; // 0-100
}

export interface ZeroTrustPolicy {
  policyId: string;
  name: string;
  description: string;
  priority: number;
  conditions: {
    minTrustLevel?: TrustLevel;
    maxRiskScore?: number;
    requiredAttributes?: Record<string, unknown>;
    allowedSubjectTypes?: ZeroTrustSubject["subjectType"][];
    requireMFA?: boolean;
    minDeviceCompliance?: number;
    timeWindow?: { start: string; end: string };
    geoRestrictions?: string[];
  };
  resources: string[];
  actions: string[];
  decision: AccessDecision;
  enabled: boolean;
}

export interface AccessRequest {
  requestId: string;
  subject: ZeroTrustSubject;
  resource: string;
  action: string;
  context: {
    timestamp: number;
    ipAddress?: string;
    geoLocation?: string;
    userAgent?: string;
  };
}

export interface AccessLog {
  requestId: string;
  subjectId: string;
  resource: string;
  action: string;
  decision: AccessDecision;
  policyId: string;
  timestamp: number;
  reason: string;
  riskScore: number;
}

export class ZeroTrustBridge {
  private subjects = new Map<string, ZeroTrustSubject>();
  private policies: ZeroTrustPolicy[] = [];
  private accessLog: AccessLog[] = [];

  registerSubject(subject: ZeroTrustSubject): void {
    this.subjects.set(subject.subjectId, subject);
  }

  get allSubjects(): ZeroTrustSubject[] { return [...this.subjects.values()]; }
  get allPolicies(): ZeroTrustPolicy[] { return [...this.policies]; }
  get recentAccessLog(): AccessLog[] { return this.accessLog.slice(-100); }

  addPolicy(policy: ZeroTrustPolicy): void {
    this.policies.push(policy);
    this.policies.sort((a, b) => a.priority - b.priority);
  }

  evaluate(request: AccessRequest): { decision: AccessDecision; policyId: string; reason: string } {
    const TRUST_LEVELS: TrustLevel[] = ["untrusted", "low", "medium", "high", "verified"];

    for (const policy of this.policies) {
      if (!policy.enabled) continue;
      if (!policy.resources.some(r => request.resource.startsWith(r) || r === "*")) continue;
      if (!policy.actions.includes(request.action) && !policy.actions.includes("*")) continue;

      const conds = policy.conditions;
      let matches = true;
      let reason = "";

      if (conds.allowedSubjectTypes && !conds.allowedSubjectTypes.includes(request.subject.subjectType)) {
        matches = false; reason = "Subject type not allowed";
      }
      if (matches && conds.minTrustLevel) {
        const required = TRUST_LEVELS.indexOf(conds.minTrustLevel);
        const actual = TRUST_LEVELS.indexOf(request.subject.trustLevel);
        if (actual < required) { matches = false; reason = "Insufficient trust level"; }
      }
      if (matches && conds.maxRiskScore !== undefined && request.subject.riskScore > conds.maxRiskScore) {
        matches = false; reason = `Risk score ${request.subject.riskScore} exceeds max ${conds.maxRiskScore}`;
      }
      if (matches && conds.requireMFA && !request.subject.mfaCompleted) {
        matches = false; reason = "MFA required";
      }
      if (matches && conds.minDeviceCompliance !== undefined && request.subject.devicePosture.complianceScore < conds.minDeviceCompliance) {
        matches = false; reason = "Device compliance below threshold";
      }

      if (matches) {
        const log: AccessLog = {
          requestId: request.requestId, subjectId: request.subject.subjectId,
          resource: request.resource, action: request.action, decision: policy.decision,
          policyId: policy.policyId, timestamp: Date.now(),
          reason: `Policy "${policy.name}" matched`, riskScore: request.subject.riskScore,
        };
        this.accessLog.push(log);
        if (this.accessLog.length > 1000) this.accessLog = this.accessLog.slice(-1000);
        return { decision: policy.decision, policyId: policy.policyId, reason: `Policy "${policy.name}" matched` };
      }
    }

    // Default deny
    const log: AccessLog = {
      requestId: request.requestId, subjectId: request.subject.subjectId,
      resource: request.resource, action: request.action, decision: "deny",
      policyId: "default", timestamp: Date.now(), reason: "No matching policy — default deny",
      riskScore: request.subject.riskScore,
    };
    this.accessLog.push(log);
    return { decision: "deny", policyId: "default", reason: "No matching policy — default deny" };
  }
}

// ═══════════════════════════════════════════════
// §3 — mTLS (Mutual TLS)
// ═══════════════════════════════════════════════

export interface X509Certificate {
  serialNumber: string;
  subject: { CN: string; O?: string; OU?: string; C?: string };
  issuer: { CN: string; O?: string };
  notBefore: number;
  notAfter: number;
  fingerprint: string;
  keyUsage: string[];
  extendedKeyUsage: string[];
  subjectAltNames: string[];
  revoked: boolean;
}

export interface MTLSConnection {
  connectionId: string;
  peerCertificate: X509Certificate;
  localCertificate: X509Certificate;
  protocol: "TLSv1.2" | "TLSv1.3";
  cipherSuite: string;
  established: boolean;
  establishedAt: number;
  bytesTransferred: number;
  lastActivity: number;
}

export interface CertificateAuthority {
  name: string;
  rootCertificate: X509Certificate;
  intermediates: X509Certificate[];
  crlDistributionPoints: string[];
  ocspResponder?: string;
  issuedCount: number;
  revokedCount: number;
}

export class MTLSBridge {
  private connections = new Map<string, MTLSConnection>();
  private cas: CertificateAuthority[] = [];
  private revokedSerials = new Set<string>();

  get allConnections(): MTLSConnection[] { return [...this.connections.values()]; }
  get allCAs(): CertificateAuthority[] { return [...this.cas]; }

  registerCA(ca: CertificateAuthority): void { this.cas.push(ca); }

  establishConnection(connId: string, peerCert: X509Certificate, localCert: X509Certificate, protocol: MTLSConnection["protocol"] = "TLSv1.3"): boolean {
    if (this.revokedSerials.has(peerCert.serialNumber)) return false;
    if (Date.now() > peerCert.notAfter || Date.now() < peerCert.notBefore) return false;

    this.connections.set(connId, {
      connectionId: connId, peerCertificate: peerCert, localCertificate: localCert,
      protocol, cipherSuite: "TLS_AES_256_GCM_SHA384", established: true,
      establishedAt: Date.now(), bytesTransferred: 0, lastActivity: Date.now(),
    });
    return true;
  }

  revokeCertificate(serialNumber: string): void {
    this.revokedSerials.add(serialNumber);
    for (const [id, conn] of this.connections) {
      if (conn.peerCertificate.serialNumber === serialNumber) {
        conn.established = false;
      }
    }
  }

  verifyCertChain(cert: X509Certificate): { valid: boolean; reason: string } {
    if (this.revokedSerials.has(cert.serialNumber)) return { valid: false, reason: "Certificate revoked" };
    if (Date.now() > cert.notAfter) return { valid: false, reason: "Certificate expired" };
    if (Date.now() < cert.notBefore) return { valid: false, reason: "Certificate not yet valid" };
    const issuerCA = this.cas.find(ca => ca.rootCertificate.subject.CN === cert.issuer.CN);
    if (!issuerCA) return { valid: false, reason: "Unknown issuer" };
    return { valid: true, reason: "Chain valid" };
  }
}

// ═══════════════════════════════════════════════
// §4 — GDPR / AI ACT AUDIT PROTOCOL
// ═══════════════════════════════════════════════

export type GDPRLawfulBasis = "consent" | "contract" | "legal_obligation" | "vital_interests" | "public_task" | "legitimate_interests";
export type DataSubjectRight = "access" | "rectification" | "erasure" | "restrict_processing" | "data_portability" | "object" | "automated_decision";
export type AIRiskLevel = "unacceptable" | "high" | "limited" | "minimal";

export interface DataProcessingRecord {
  id: string;
  controller: string;
  processor?: string;
  purpose: string;
  lawfulBasis: GDPRLawfulBasis;
  dataCategories: string[];
  dataSubjectCategories: string[];
  recipients: string[];
  retentionPeriod: string;
  technicalMeasures: string[];
  organizationalMeasures: string[];
  crossBorderTransfer: boolean;
  transferSafeguards?: string;
  dpia?: DataProtectionImpactAssessment;
  createdAt: number;
  updatedAt: number;
}

export interface DataProtectionImpactAssessment {
  id: string;
  necessityAssessment: string;
  proportionalityAssessment: string;
  riskAssessment: {
    severity: "low" | "medium" | "high" | "critical";
    likelihood: "unlikely" | "possible" | "likely" | "almost_certain";
    overallRisk: "low" | "medium" | "high" | "very_high";
    mitigationMeasures: string[];
  };
  approvedBy?: string;
  approvedAt?: number;
  status: "draft" | "pending_review" | "approved" | "rejected";
}

export interface DataSubjectRequest {
  id: string;
  subjectId: string;
  right: DataSubjectRight;
  status: "received" | "verified" | "processing" | "completed" | "rejected";
  receivedAt: number;
  deadline: number; // 30 days from receipt
  completedAt?: number;
  notes: string[];
}

export interface AIActComplianceRecord {
  systemId: string;
  systemName: string;
  riskLevel: AIRiskLevel;
  provider: string;
  deployer: string;
  intendedPurpose: string;
  prohibitedPracticesCheck: {
    socialScoring: boolean;
    subliminalManipulation: boolean;
    exploitingVulnerabilities: boolean;
    biometricCategorization: boolean;
    realTimeBiometricId: boolean;
  };
  highRiskRequirements?: {
    riskManagementSystem: boolean;
    dataGovernance: boolean;
    technicalDocumentation: boolean;
    recordKeeping: boolean;
    transparencyInfo: boolean;
    humanOversight: boolean;
    accuracyRobustnessCybersecurity: boolean;
    qualityManagement: boolean;
    conformityAssessment: boolean;
    euDeclarationOfConformity: boolean;
    ceMarking: boolean;
    registrationEUDatabase: boolean;
  };
  transparencyObligations: {
    disclosedAsAI: boolean;
    deepfakeDisclosure: boolean;
    emotionRecognitionDisclosure: boolean;
    biometricCategorizationDisclosure: boolean;
  };
  lastAudit: number;
  nextAudit: number;
  complianceScore: number; // 0-100
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  category: "gdpr" | "ai_act" | "security" | "access" | "data_breach";
  action: string;
  actor: string;
  details: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
  regulatoryReference?: string;
}

export class GDPRAIActBridge {
  private processingRecords = new Map<string, DataProcessingRecord>();
  private dsrQueue: DataSubjectRequest[] = [];
  private aiCompliance = new Map<string, AIActComplianceRecord>();
  private auditLog: AuditLogEntry[] = [];

  get allProcessingRecords(): DataProcessingRecord[] { return [...this.processingRecords.values()]; }
  get allDSRs(): DataSubjectRequest[] { return [...this.dsrQueue]; }
  get pendingDSRs(): DataSubjectRequest[] { return this.dsrQueue.filter(d => d.status !== "completed" && d.status !== "rejected"); }
  get allAICompliance(): AIActComplianceRecord[] { return [...this.aiCompliance.values()]; }
  get recentAuditLog(): AuditLogEntry[] { return this.auditLog.slice(-200); }

  addProcessingRecord(record: DataProcessingRecord): void {
    this.processingRecords.set(record.id, record);
    this.log("gdpr", "processing_record_added", "system", { recordId: record.id, purpose: record.purpose }, "info", "GDPR Art. 30");
  }

  submitDSR(subjectId: string, right: DataSubjectRight): string {
    const id = `dsr_${Date.now()}`;
    const dsr: DataSubjectRequest = {
      id, subjectId, right, status: "received", receivedAt: Date.now(),
      deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, notes: [],
    };
    this.dsrQueue.push(dsr);
    this.log("gdpr", "dsr_submitted", subjectId, { dsrId: id, right }, "info", `GDPR Art. ${this.getArticleForRight(right)}`);
    return id;
  }

  updateDSR(dsrId: string, status: DataSubjectRequest["status"], note?: string): void {
    const dsr = this.dsrQueue.find(d => d.id === dsrId);
    if (dsr) {
      dsr.status = status;
      if (note) dsr.notes.push(note);
      if (status === "completed") dsr.completedAt = Date.now();
    }
  }

  registerAISystem(record: AIActComplianceRecord): void {
    this.aiCompliance.set(record.systemId, record);
    this.log("ai_act", "ai_system_registered", "system", {
      systemId: record.systemId, riskLevel: record.riskLevel,
    }, record.riskLevel === "high" ? "warning" : "info", "AI Act Art. 6");
  }

  auditAISystem(systemId: string): { compliant: boolean; issues: string[]; score: number } {
    const record = this.aiCompliance.get(systemId);
    if (!record) return { compliant: false, issues: ["System not registered"], score: 0 };

    const issues: string[] = [];
    const checks = record.prohibitedPracticesCheck;

    if (checks.socialScoring) issues.push("AI Act Art. 5(1)(c): Social scoring detected");
    if (checks.subliminalManipulation) issues.push("AI Act Art. 5(1)(a): Subliminal manipulation");
    if (checks.realTimeBiometricId) issues.push("AI Act Art. 5(1)(h): Real-time biometric identification");

    if (record.riskLevel === "high" && record.highRiskRequirements) {
      const hr = record.highRiskRequirements;
      if (!hr.riskManagementSystem) issues.push("Art. 9: Missing risk management system");
      if (!hr.dataGovernance) issues.push("Art. 10: Missing data governance");
      if (!hr.technicalDocumentation) issues.push("Art. 11: Missing technical documentation");
      if (!hr.humanOversight) issues.push("Art. 14: Missing human oversight");
      if (!hr.accuracyRobustnessCybersecurity) issues.push("Art. 15: Accuracy/robustness issues");
    }

    if (!record.transparencyObligations.disclosedAsAI) issues.push("Art. 52: Not disclosed as AI system");

    const score = Math.max(0, 100 - issues.length * 12);
    record.complianceScore = score;
    record.lastAudit = Date.now();

    this.log("ai_act", "ai_system_audited", "auditor", { systemId, score, issueCount: issues.length },
      issues.length > 0 ? "warning" : "info", "AI Act Art. 61");

    return { compliant: issues.length === 0, issues, score };
  }

  private log(
    category: AuditLogEntry["category"], action: string, actor: string,
    details: Record<string, unknown>, severity: AuditLogEntry["severity"],
    regulatoryReference?: string,
  ): void {
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(), category, action, actor, details, severity, regulatoryReference,
    });
    if (this.auditLog.length > 2000) this.auditLog = this.auditLog.slice(-2000);
  }

  private getArticleForRight(right: DataSubjectRight): string {
    const map: Record<DataSubjectRight, string> = {
      access: "15", rectification: "16", erasure: "17",
      restrict_processing: "18", data_portability: "20",
      object: "21", automated_decision: "22",
    };
    return map[right];
  }
}

// ═══════════════════════════════════════════════
// SINGLETONS
// ═══════════════════════════════════════════════

export const oauth2Bridge = new OAuth2OIDCBridge();
export const zeroTrustBridge = new ZeroTrustBridge();
export const mtlsBridge = new MTLSBridge();
export const gdprAIActBridge = new GDPRAIActBridge();

// ─── Defaults ───

oauth2Bridge.registerClient({
  clientId: "orion-app", clientName: "Orion Application",
  grantTypes: ["authorization_code", "refresh_token"],
  redirectUris: ["https://orionelp.lovable.app/callback"],
  scopes: ["openid", "profile", "email", "robotics", "iot"],
  tokenEndpoint: "https://auth.orion.io/oauth/token",
  authorizationEndpoint: "https://auth.orion.io/oauth/authorize",
  issuer: "https://auth.orion.io", jwksUri: "https://auth.orion.io/.well-known/jwks.json",
  registered: true,
});

oauth2Bridge.registerClient({
  clientId: "orion-robot-service", clientName: "Robot Service Account",
  grantTypes: ["client_credentials"],
  redirectUris: [], scopes: ["robotics.control", "iot.telemetry"],
  tokenEndpoint: "https://auth.orion.io/oauth/token",
  authorizationEndpoint: "https://auth.orion.io/oauth/authorize",
  issuer: "https://auth.orion.io", registered: true,
});

zeroTrustBridge.addPolicy({
  policyId: "zt-01", name: "Robot Control Access", description: "High trust required for robot control",
  priority: 1, conditions: { minTrustLevel: "high", requireMFA: true, allowedSubjectTypes: ["user"] },
  resources: ["robot/*", "agv/*"], actions: ["control", "configure", "emergency_stop"],
  decision: "allow", enabled: true,
});
zeroTrustBridge.addPolicy({
  policyId: "zt-02", name: "Telemetry Read", description: "Medium trust for telemetry viewing",
  priority: 2, conditions: { minTrustLevel: "medium" },
  resources: ["telemetry/*", "sensor/*"], actions: ["read"],
  decision: "allow", enabled: true,
});
zeroTrustBridge.addPolicy({
  policyId: "zt-03", name: "AI System Access", description: "High trust + compliance for AI operations",
  priority: 1, conditions: { minTrustLevel: "high", maxRiskScore: 30, minDeviceCompliance: 80 },
  resources: ["ai/*", "inference/*"], actions: ["*"],
  decision: "allow", enabled: true,
});

mtlsBridge.registerCA({
  name: "Orion Root CA", issuedCount: 42, revokedCount: 2,
  rootCertificate: {
    serialNumber: "01", subject: { CN: "Orion Root CA", O: "Orion Technologies", C: "EU" },
    issuer: { CN: "Orion Root CA", O: "Orion Technologies" },
    notBefore: Date.now() - 365 * 24 * 60 * 60 * 1000, notAfter: Date.now() + 3650 * 24 * 60 * 60 * 1000,
    fingerprint: "SHA256:abc123...", keyUsage: ["keyCertSign", "cRLSign"],
    extendedKeyUsage: [], subjectAltNames: [], revoked: false,
  },
  intermediates: [], crlDistributionPoints: ["https://crl.orion.io/root.crl"],
  ocspResponder: "https://ocsp.orion.io",
});

gdprAIActBridge.addProcessingRecord({
  id: "proc-01", controller: "Orion Technologies", purpose: "Robot telemetry processing",
  lawfulBasis: "legitimate_interests", dataCategories: ["device_data", "location_data"],
  dataSubjectCategories: ["operators"], recipients: ["analytics_processor"],
  retentionPeriod: "24 months", technicalMeasures: ["encryption_at_rest", "encryption_in_transit", "access_controls"],
  organizationalMeasures: ["staff_training", "dpo_appointed", "privacy_by_design"],
  crossBorderTransfer: false, createdAt: Date.now(), updatedAt: Date.now(),
});

gdprAIActBridge.registerAISystem({
  systemId: "orion-ai-core", systemName: "Orion Neural Intelligence",
  riskLevel: "limited", provider: "Orion Technologies", deployer: "Orion Technologies",
  intendedPurpose: "Natural language processing, document generation, and robotic control assistance",
  prohibitedPracticesCheck: {
    socialScoring: false, subliminalManipulation: false, exploitingVulnerabilities: false,
    biometricCategorization: false, realTimeBiometricId: false,
  },
  transparencyObligations: {
    disclosedAsAI: true, deepfakeDisclosure: false,
    emotionRecognitionDisclosure: false, biometricCategorizationDisclosure: false,
  },
  lastAudit: Date.now(), nextAudit: Date.now() + 90 * 24 * 60 * 60 * 1000, complianceScore: 92,
});
