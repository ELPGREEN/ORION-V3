/**
 * ─── TensorFlow Responsible AI: Data Tools ───
 * Browser-adapted implementations for data quality, bias detection, 
 * and transparency in ML datasets.
 *
 * 1. Know Your Data (KYD) — interactive dataset investigation
 * 2. TF Data Validation (TFDV) — schema inference, anomaly detection, skew/drift
 * 3. Data Cards — transparency reports for datasets
 * 4. Monk Skin Tone (MST) Scale — inclusive skin tone classification
 *
 * Ref: tensorflow.org/responsible_ai
 *      knowyourdata.withgoogle.com
 *      Gebru et al. (2021) — Datasheets for Datasets
 *      Monk (2019) — Monk Skin Tone Scale
 */

// ═══════════════════════════════════════════
// KNOW YOUR DATA (KYD)
// ═══════════════════════════════════════════

export interface DatasetProfile {
  name: string;
  totalSamples: number;
  features: FeatureProfile[];
  labelDistribution: Record<string, number>;
  missingRates: Record<string, number>;
  duplicateCount: number;
  correlationMatrix: number[][];
  biasIndicators: BiasIndicator[];
  qualityScore: number; // 0-1
  profiledAt: string;
}

export interface FeatureProfile {
  name: string;
  dtype: "numeric" | "categorical" | "text" | "image" | "boolean";
  count: number;
  missing: number;
  missingRate: number;
  unique: number;
  // Numeric stats
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  skewness?: number;
  kurtosis?: number;
  // Categorical stats
  topValues?: { value: string; count: number; percentage: number }[];
  // Distribution
  histogram?: { binStart: number; binEnd: number; count: number }[];
}

export interface BiasIndicator {
  feature: string;
  type: "representation" | "correlation" | "label_imbalance" | "stereotypical_association";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedGroups: string[];
  recommendation: string;
}

/** Profile a dataset — Know Your Data style analysis */
export function profileDataset(
  data: Record<string, unknown>[],
  labelColumn?: string
): DatasetProfile {
  if (data.length === 0) {
    return {
      name: "empty_dataset", totalSamples: 0, features: [], labelDistribution: {},
      missingRates: {}, duplicateCount: 0, correlationMatrix: [], biasIndicators: [],
      qualityScore: 0, profiledAt: new Date().toISOString(),
    };
  }

  const columns = Object.keys(data[0]);
  const features: FeatureProfile[] = [];
  const missingRates: Record<string, number> = {};

  for (const col of columns) {
    const values = data.map(row => row[col]);
    const missing = values.filter(v => v === null || v === undefined || v === "").length;
    const missingRate = missing / values.length;
    missingRates[col] = missingRate;

    const nonNull = values.filter(v => v !== null && v !== undefined && v !== "");
    const isNumeric = nonNull.length > 0 && nonNull.every(v => typeof v === "number" || !isNaN(Number(v)));

    const profile: FeatureProfile = {
      name: col,
      dtype: isNumeric ? "numeric" : typeof nonNull[0] === "boolean" ? "boolean" : "categorical",
      count: values.length,
      missing,
      missingRate: Math.round(missingRate * 10000) / 10000,
      unique: new Set(nonNull.map(String)).size,
    };

    if (isNumeric) {
      const nums = nonNull.map(Number).sort((a, b) => a - b);
      const sum = nums.reduce((s, n) => s + n, 0);
      const mean = sum / nums.length;
      const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
      const std = Math.sqrt(variance);
      const skewness = nums.length > 2
        ? nums.reduce((s, n) => s + ((n - mean) / std) ** 3, 0) / nums.length
        : 0;
      const kurtosis = nums.length > 3
        ? nums.reduce((s, n) => s + ((n - mean) / std) ** 4, 0) / nums.length - 3
        : 0;

      profile.mean = Math.round(mean * 1000) / 1000;
      profile.std = Math.round(std * 1000) / 1000;
      profile.min = nums[0];
      profile.max = nums[nums.length - 1];
      profile.median = nums.length % 2 === 0
        ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
        : nums[Math.floor(nums.length / 2)];
      profile.skewness = Math.round(skewness * 1000) / 1000;
      profile.kurtosis = Math.round(kurtosis * 1000) / 1000;

      // Histogram
      const binCount = Math.min(20, Math.ceil(Math.sqrt(nums.length)));
      const binWidth = (profile.max - profile.min) / binCount || 1;
      profile.histogram = [];
      for (let i = 0; i < binCount; i++) {
        const binStart = profile.min + i * binWidth;
        const binEnd = binStart + binWidth;
        const count = nums.filter(n => n >= binStart && (i === binCount - 1 ? n <= binEnd : n < binEnd)).length;
        profile.histogram.push({ binStart: Math.round(binStart * 100) / 100, binEnd: Math.round(binEnd * 100) / 100, count });
      }
    } else {
      // Categorical top values
      const counts = new Map<string, number>();
      for (const v of nonNull) { const s = String(v); counts.set(s, (counts.get(s) ?? 0) + 1); }
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      profile.topValues = sorted.slice(0, 10).map(([value, count]) => ({
        value, count, percentage: Math.round(count / nonNull.length * 10000) / 100,
      }));
    }

    features.push(profile);
  }

  // Label distribution
  const labelDistribution: Record<string, number> = {};
  if (labelColumn && columns.includes(labelColumn)) {
    for (const row of data) {
      const label = String(row[labelColumn] ?? "unknown");
      labelDistribution[label] = (labelDistribution[label] ?? 0) + 1;
    }
  }

  // Duplicate detection (via string hash)
  const rowHashes = new Set<string>();
  let duplicateCount = 0;
  for (const row of data) {
    const h = JSON.stringify(row);
    if (rowHashes.has(h)) duplicateCount++;
    else rowHashes.add(h);
  }

  // Bias indicators
  const biasIndicators = detectDataBias(features, labelDistribution, data.length);

  // Simple correlation matrix for numeric features
  const numericFeatures = features.filter(f => f.dtype === "numeric");
  const correlationMatrix = computeCorrelationMatrix(
    numericFeatures.map(f => data.map(row => Number(row[f.name]) || 0))
  );

  // Quality score
  const avgMissing = Object.values(missingRates).reduce((s, r) => s + r, 0) / Math.max(columns.length, 1);
  const dupRate = duplicateCount / Math.max(data.length, 1);
  const biasScore = biasIndicators.filter(b => b.severity === "critical" || b.severity === "high").length;
  const qualityScore = Math.max(0, Math.min(1, 1 - avgMissing * 0.3 - dupRate * 0.3 - biasScore * 0.1));

  return {
    name: "dataset", totalSamples: data.length, features, labelDistribution,
    missingRates, duplicateCount, correlationMatrix, biasIndicators,
    qualityScore: Math.round(qualityScore * 1000) / 1000,
    profiledAt: new Date().toISOString(),
  };
}

function detectDataBias(
  features: FeatureProfile[],
  labelDist: Record<string, number>,
  totalSamples: number
): BiasIndicator[] {
  const indicators: BiasIndicator[] = [];

  // Check label imbalance
  const labelValues = Object.values(labelDist);
  if (labelValues.length >= 2) {
    const maxLabel = Math.max(...labelValues);
    const minLabel = Math.min(...labelValues);
    const imbalanceRatio = maxLabel / Math.max(minLabel, 1);
    if (imbalanceRatio > 5) {
      indicators.push({
        feature: "label", type: "label_imbalance",
        severity: imbalanceRatio > 20 ? "critical" : imbalanceRatio > 10 ? "high" : "medium",
        description: `Desequilíbrio de classes: razão ${imbalanceRatio.toFixed(1)}:1 entre maioria e minoria`,
        affectedGroups: Object.entries(labelDist).filter(([, c]) => c === minLabel).map(([l]) => l),
        recommendation: "Aplicar oversampling (SMOTE), undersampling ou class weights para balancear",
      });
    }
  }

  // Check representation bias in categorical features
  for (const feat of features) {
    if (feat.dtype === "categorical" && feat.topValues && feat.topValues.length >= 2) {
      const maxPct = feat.topValues[0].percentage;
      if (maxPct > 80) {
        indicators.push({
          feature: feat.name, type: "representation",
          severity: maxPct > 95 ? "critical" : "high",
          description: `Feature '${feat.name}' dominada por '${feat.topValues[0].value}' (${maxPct}%)`,
          affectedGroups: feat.topValues.slice(1).map(v => v.value),
          recommendation: "Coletar mais dados de grupos sub-representados ou aplicar data augmentation",
        });
      }
    }

    // Check high missing rate
    if (feat.missingRate > 0.3) {
      indicators.push({
        feature: feat.name, type: "representation",
        severity: feat.missingRate > 0.7 ? "high" : "medium",
        description: `Feature '${feat.name}' tem ${(feat.missingRate * 100).toFixed(1)}% de valores ausentes`,
        affectedGroups: [],
        recommendation: "Investigar se dados ausentes são MCAR/MAR/MNAR e aplicar imputação adequada",
      });
    }

    // Check extreme skewness in numeric features
    if (feat.dtype === "numeric" && feat.skewness !== undefined && Math.abs(feat.skewness) > 2) {
      indicators.push({
        feature: feat.name, type: "representation",
        severity: Math.abs(feat.skewness) > 5 ? "high" : "medium",
        description: `Feature '${feat.name}' altamente assimétrica (skewness=${feat.skewness})`,
        affectedGroups: [],
        recommendation: "Considerar transformação log/Box-Cox para normalizar distribuição",
      });
    }
  }

  return indicators;
}

function computeCorrelationMatrix(columns: number[][]): number[][] {
  const n = columns.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(columns[i], columns[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  return matrix;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den > 0 ? Math.round(num / den * 1000) / 1000 : 0;
}

// ═══════════════════════════════════════════
// TF DATA VALIDATION (TFDV)
// ═══════════════════════════════════════════

export interface DataSchema {
  features: SchemaFeature[];
  inferredAt: string;
  datasetSize: number;
}

export interface SchemaFeature {
  name: string;
  type: "INT" | "FLOAT" | "BYTES" | "BOOL";
  presence: { minFraction: number };
  shape: { dim: number[] };
  domain?: { min?: number; max?: number; values?: string[] };
  skewComparator?: { infinity_norm: { threshold: number } };
  driftComparator?: { infinity_norm: { threshold: number } };
}

export interface DataAnomaly {
  feature: string;
  anomalyType: "missing_data" | "unexpected_value" | "schema_mismatch" | "distribution_skew" | "data_drift" | "out_of_range";
  severity: "warning" | "error";
  description: string;
  shortDescription: string;
}

export interface ValidationResult {
  valid: boolean;
  anomalies: DataAnomaly[];
  schema: DataSchema;
  skewResults: SkewDriftResult[];
  driftResults: SkewDriftResult[];
  timestamp: string;
}

export interface SkewDriftResult {
  feature: string;
  type: "skew" | "drift";
  lInfinityNorm: number;
  threshold: number;
  passed: boolean;
}

/** Infer schema from data */
export function inferSchema(data: Record<string, unknown>[]): DataSchema {
  if (data.length === 0) return { features: [], inferredAt: new Date().toISOString(), datasetSize: 0 };

  const columns = Object.keys(data[0]);
  const features: SchemaFeature[] = columns.map(col => {
    const values = data.map(row => row[col]);
    const nonNull = values.filter(v => v !== null && v !== undefined);
    const isNumeric = nonNull.length > 0 && nonNull.every(v => typeof v === "number");
    const isBool = nonNull.length > 0 && nonNull.every(v => typeof v === "boolean");

    const feature: SchemaFeature = {
      name: col,
      type: isBool ? "BOOL" : isNumeric ? "FLOAT" : "BYTES",
      presence: { minFraction: nonNull.length / Math.max(values.length, 1) },
      shape: { dim: [1] },
    };

    if (isNumeric) {
      const nums = nonNull.map(Number);
      feature.domain = { min: Math.min(...nums), max: Math.max(...nums) };
      feature.skewComparator = { infinity_norm: { threshold: 0.01 } };
      feature.driftComparator = { infinity_norm: { threshold: 0.01 } };
    } else if (!isBool) {
      const uniqueValues = [...new Set(nonNull.map(String))];
      if (uniqueValues.length <= 100) {
        feature.domain = { values: uniqueValues.slice(0, 50) };
      }
    }

    return feature;
  });

  return { features, inferredAt: new Date().toISOString(), datasetSize: data.length };
}

/** Validate data against a schema */
export function validateData(
  data: Record<string, unknown>[],
  schema: DataSchema
): ValidationResult {
  const anomalies: DataAnomaly[] = [];
  const schemaMap = new Map(schema.features.map(f => [f.name, f]));

  for (const [colName, feature] of schemaMap) {
    const values = data.map(row => row[colName]);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== "");
    const presence = nonNull.length / Math.max(values.length, 1);

    // Check presence
    if (presence < feature.presence.minFraction * 0.8) {
      anomalies.push({
        feature: colName, anomalyType: "missing_data", severity: "error",
        description: `Feature '${colName}' tem ${(presence * 100).toFixed(1)}% de presença, abaixo do mínimo ${(feature.presence.minFraction * 100).toFixed(1)}%`,
        shortDescription: "Dados ausentes acima do esperado",
      });
    }

    // Check domain for numeric features
    if (feature.type === "FLOAT" && feature.domain) {
      const nums = nonNull.map(Number).filter(n => !isNaN(n));
      const outOfRange = nums.filter(n =>
        (feature.domain!.min !== undefined && n < feature.domain!.min) ||
        (feature.domain!.max !== undefined && n > feature.domain!.max)
      );
      if (outOfRange.length > 0) {
        anomalies.push({
          feature: colName, anomalyType: "out_of_range", severity: "warning",
          description: `${outOfRange.length} valores fora do intervalo [${feature.domain.min}, ${feature.domain.max}]`,
          shortDescription: "Valores fora do domínio",
        });
      }
    }

    // Check domain for categorical features
    if (feature.type === "BYTES" && feature.domain?.values) {
      const allowedSet = new Set(feature.domain.values);
      const unexpected = nonNull.filter(v => !allowedSet.has(String(v)));
      if (unexpected.length > 0) {
        const uniqueUnexpected = [...new Set(unexpected.map(String))].slice(0, 5);
        anomalies.push({
          feature: colName, anomalyType: "unexpected_value", severity: "warning",
          description: `${unexpected.length} valores inesperados: ${uniqueUnexpected.join(", ")}`,
          shortDescription: "Valores fora do vocabulário",
        });
      }
    }
  }

  // Check for columns in data not in schema
  if (data.length > 0) {
    for (const col of Object.keys(data[0])) {
      if (!schemaMap.has(col)) {
        anomalies.push({
          feature: col, anomalyType: "schema_mismatch", severity: "warning",
          description: `Coluna '${col}' presente nos dados mas não no schema`,
          shortDescription: "Coluna não definida no schema",
        });
      }
    }
  }

  return {
    valid: anomalies.filter(a => a.severity === "error").length === 0,
    anomalies,
    schema,
    skewResults: [],
    driftResults: [],
    timestamp: new Date().toISOString(),
  };
}

/** Detect distribution skew between training and serving data */
export function detectSkew(
  trainingData: Record<string, unknown>[],
  servingData: Record<string, unknown>[],
  schema: DataSchema
): SkewDriftResult[] {
  return _compareDistributions(trainingData, servingData, schema, "skew");
}

/** Detect data drift between two time periods */
export function detectDrift(
  baselineData: Record<string, unknown>[],
  currentData: Record<string, unknown>[],
  schema: DataSchema
): SkewDriftResult[] {
  return _compareDistributions(baselineData, currentData, schema, "drift");
}

function _compareDistributions(
  dataA: Record<string, unknown>[],
  dataB: Record<string, unknown>[],
  schema: DataSchema,
  type: "skew" | "drift"
): SkewDriftResult[] {
  const results: SkewDriftResult[] = [];

  for (const feature of schema.features) {
    const comparator = type === "skew" ? feature.skewComparator : feature.driftComparator;
    if (!comparator) continue;

    const valsA = dataA.map(row => row[feature.name]).filter(v => v !== null && v !== undefined);
    const valsB = dataB.map(row => row[feature.name]).filter(v => v !== null && v !== undefined);

    let lInfNorm = 0;

    if (feature.type === "FLOAT") {
      // Compare histograms
      const numsA = valsA.map(Number), numsB = valsB.map(Number);
      const allNums = [...numsA, ...numsB];
      const min = Math.min(...allNums), max = Math.max(...allNums);
      const bins = 20;
      const binWidth = (max - min) / bins || 1;

      for (let i = 0; i < bins; i++) {
        const lo = min + i * binWidth, hi = lo + binWidth;
        const pA = numsA.filter(n => n >= lo && n < hi).length / Math.max(numsA.length, 1);
        const pB = numsB.filter(n => n >= lo && n < hi).length / Math.max(numsB.length, 1);
        lInfNorm = Math.max(lInfNorm, Math.abs(pA - pB));
      }
    } else {
      // Compare categorical distributions
      const countsA = new Map<string, number>(), countsB = new Map<string, number>();
      for (const v of valsA) countsA.set(String(v), (countsA.get(String(v)) ?? 0) + 1);
      for (const v of valsB) countsB.set(String(v), (countsB.get(String(v)) ?? 0) + 1);
      const allKeys = new Set([...countsA.keys(), ...countsB.keys()]);
      for (const k of allKeys) {
        const pA = (countsA.get(k) ?? 0) / Math.max(valsA.length, 1);
        const pB = (countsB.get(k) ?? 0) / Math.max(valsB.length, 1);
        lInfNorm = Math.max(lInfNorm, Math.abs(pA - pB));
      }
    }

    results.push({
      feature: feature.name,
      type,
      lInfinityNorm: Math.round(lInfNorm * 10000) / 10000,
      threshold: comparator.infinity_norm.threshold,
      passed: lInfNorm <= comparator.infinity_norm.threshold,
    });
  }

  return results;
}

// ═══════════════════════════════════════════
// DATA CARDS
// ═══════════════════════════════════════════

export interface DataCard {
  datasetName: string;
  version: string;
  description: string;
  source: {
    creators: string[];
    fundedBy?: string[];
    collectionMethod: string;
    collectionPeriod: string;
    dataType: string;
  };
  composition: {
    totalSamples: number;
    featureCount: number;
    labelCount: number;
    missingDataSummary: string;
    sensitiveFeatures: string[];
    personalData: boolean;
    subpopulations: { name: string; count: number; percentage: number }[];
  };
  preprocessing: {
    steps: string[];
    cleaningRules: string[];
    normalization: string;
  };
  useCases: {
    intendedUses: string[];
    outOfScopeUses: string[];
    knownLimitations: string[];
  };
  distribution: {
    license: string;
    format: string;
    accessRequirements: string[];
  };
  ethicalReview: {
    reviewBoard?: string;
    consentProcess: string;
    privacyMeasures: string[];
    potentialHarms: string[];
  };
  generatedAt: string;
}

/** Generate a Data Card for a dataset */
export function generateDataCard(params: {
  name: string;
  description: string;
  profile: DatasetProfile;
  sensitiveFeatures?: string[];
  intendedUses?: string[];
  license?: string;
}): DataCard {
  const subpopulations = params.profile.features
    .filter(f => f.dtype === "categorical" && f.topValues)
    .slice(0, 3)
    .flatMap(f => f.topValues!.map(v => ({
      name: `${f.name}=${v.value}`,
      count: v.count,
      percentage: v.percentage,
    })));

  return {
    datasetName: params.name,
    version: "1.0",
    description: params.description,
    source: {
      creators: ["Orion AI System"],
      collectionMethod: "Automated collection and manual curation",
      collectionPeriod: new Date().toISOString().split("T")[0],
      dataType: "Tabular",
    },
    composition: {
      totalSamples: params.profile.totalSamples,
      featureCount: params.profile.features.length,
      labelCount: Object.keys(params.profile.labelDistribution).length,
      missingDataSummary: Object.entries(params.profile.missingRates)
        .filter(([, r]) => r > 0)
        .map(([f, r]) => `${f}: ${(r * 100).toFixed(1)}%`)
        .join("; ") || "Sem dados ausentes",
      sensitiveFeatures: params.sensitiveFeatures ?? [],
      personalData: (params.sensitiveFeatures?.length ?? 0) > 0,
      subpopulations,
    },
    preprocessing: {
      steps: ["Remoção de duplicatas", "Validação de schema", "Detecção de anomalias"],
      cleaningRules: ["Remoção de valores nulos em features obrigatórias", "Clipping de outliers (3σ)"],
      normalization: "StandardScaler (z-score)",
    },
    useCases: {
      intendedUses: params.intendedUses ?? ["Treinamento de modelos de ML supervisionados"],
      outOfScopeUses: ["Decisões autônomas sem supervisão humana", "Identificação biométrica individual"],
      knownLimitations: params.profile.biasIndicators.map(b => b.description),
    },
    distribution: {
      license: params.license ?? "Proprietário",
      format: "CSV/JSON",
      accessRequirements: ["Autenticação", "Aprovação do comitê de dados"],
    },
    ethicalReview: {
      consentProcess: "Consentimento informado conforme LGPD/GDPR",
      privacyMeasures: ["Anonimização de PII", "Differential Privacy quando aplicável", "Controle de acesso granular"],
      potentialHarms: params.profile.biasIndicators
        .filter(b => b.severity === "high" || b.severity === "critical")
        .map(b => b.description),
    },
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════
// MONK SKIN TONE (MST) SCALE
// ═══════════════════════════════════════════

export interface MSTTone {
  id: number;           // 1-10
  hexColor: string;
  label: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;
  labL: number;         // CIE-Lab luminance
}

/** 10-point Monk Skin Tone Scale (Dr. Ellis Monk, 2019) */
export const MONK_SKIN_TONE_SCALE: MSTTone[] = [
  { id: 1, hexColor: "#f6ede4", label: "MST-01", rgbR: 246, rgbG: 237, rgbB: 228, labL: 94 },
  { id: 2, hexColor: "#f3e7db", label: "MST-02", rgbR: 243, rgbG: 231, rgbB: 219, labL: 92 },
  { id: 3, hexColor: "#f7d7c4", label: "MST-03", rgbR: 247, rgbG: 215, rgbB: 196, labL: 88 },
  { id: 4, hexColor: "#eadaba", label: "MST-04", rgbR: 234, rgbG: 218, rgbB: 186, labL: 87 },
  { id: 5, hexColor: "#d7bd96", label: "MST-05", rgbR: 215, rgbG: 189, rgbB: 150, labL: 78 },
  { id: 6, hexColor: "#a07e56", label: "MST-06", rgbR: 160, rgbG: 126, rgbB: 86, labL: 56 },
  { id: 7, hexColor: "#825c43", label: "MST-07", rgbR: 130, rgbG: 92, rgbB: 67, labL: 43 },
  { id: 8, hexColor: "#604134", label: "MST-08", rgbR: 96, rgbG: 65, rgbB: 52, labL: 31 },
  { id: 9, hexColor: "#3a312a", label: "MST-09", rgbR: 58, rgbG: 49, rgbB: 42, labL: 22 },
  { id: 10, hexColor: "#292420", label: "MST-10", rgbR: 41, rgbG: 36, rgbB: 32, labL: 16 },
];

/** Classify a skin tone pixel (RGB) to nearest MST tone */
export function classifyMSTTone(r: number, g: number, b: number): MSTTone {
  let bestTone = MONK_SKIN_TONE_SCALE[0];
  let bestDist = Infinity;

  for (const tone of MONK_SKIN_TONE_SCALE) {
    // CIE-Lab distance would be more perceptually accurate,
    // but Euclidean RGB is acceptable for browser use
    const dist = Math.sqrt(
      (r - tone.rgbR) ** 2 + (g - tone.rgbG) ** 2 + (b - tone.rgbB) ** 2
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestTone = tone;
    }
  }

  return bestTone;
}

/** Analyze skin tone distribution in an image dataset */
export function analyzeMSTDistribution(
  pixelSamples: { r: number; g: number; b: number }[]
): { tone: MSTTone; count: number; percentage: number }[] {
  const counts = new Map<number, number>();
  for (let i = 1; i <= 10; i++) counts.set(i, 0);

  for (const px of pixelSamples) {
    const tone = classifyMSTTone(px.r, px.g, px.b);
    counts.set(tone.id, (counts.get(tone.id) ?? 0) + 1);
  }

  return MONK_SKIN_TONE_SCALE.map(tone => ({
    tone,
    count: counts.get(tone.id) ?? 0,
    percentage: pixelSamples.length > 0
      ? Math.round((counts.get(tone.id) ?? 0) / pixelSamples.length * 10000) / 100
      : 0,
  }));
}

/** Check if a dataset has inclusive skin tone representation */
export function checkMSTInclusivity(
  distribution: { tone: MSTTone; percentage: number }[],
  minRepresentationPct = 5
): { inclusive: boolean; underrepresented: MSTTone[]; recommendation: string } {
  const underrepresented = distribution
    .filter(d => d.percentage < minRepresentationPct && d.percentage > 0)
    .map(d => d.tone);

  const absent = distribution.filter(d => d.percentage === 0).map(d => d.tone);

  const inclusive = underrepresented.length === 0 && absent.length <= 2;

  return {
    inclusive,
    underrepresented: [...underrepresented, ...absent],
    recommendation: inclusive
      ? "Distribuição de tons de pele adequada segundo a escala MST."
      : `${underrepresented.length + absent.length} tons sub-representados na escala MST. Coletar mais amostras dos tons ${[...underrepresented, ...absent].map(t => t.label).join(", ")} para melhorar inclusividade.`,
  };
}

// ═══ STATE ═══

export function getResponsibleAIDataState() {
  return {
    knowYourData: ["Dataset Profiling", "Bias Detection", "Correlation Matrix", "Quality Score", "Feature Statistics"],
    dataValidation: ["Schema Inference", "Anomaly Detection", "Skew Detection", "Drift Detection", "Domain Validation"],
    dataCards: ["Transparency Reports", "Composition", "Ethical Review", "Use Cases", "Gebru 2021"],
    monkSkinTone: ["MST 10-Point Scale", "RGB Classification", "Distribution Analysis", "Inclusivity Check"],
  };
}
