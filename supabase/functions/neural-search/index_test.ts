import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const invoke = async (body: Record<string, unknown>, expectStatus = 200) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  assertEquals(res.status, expectStatus, `Expected ${expectStatus}, got ${res.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text);
};

// ═══ v17 Lacuna 5: Adversarial Query Detection ═══
Deno.test("v17 Adversarial: SQL injection blocked", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/neural-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ query: "SELECT informações DROP tabela", mode: "search" }),
  });
  const text = await res.text();
  // Either 400 (our filter) or 403 (CDN/WAF) is acceptable
  assert(res.status === 400 || res.status === 403, `Expected 400 or 403, got ${res.status}`);
  await Promise.resolve(); // ensure body consumed
});

Deno.test("v17 Adversarial: short query blocked", async () => {
  const data = await invoke({ query: "ab", mode: "search" }, 400);
  assert(data.reason.includes("curta"), `Expected 'curta' in reason, got: ${data.reason}`);
});

Deno.test("v17 Adversarial: JSON injection blocked", async () => {
  const data = await invoke({ query: '{"key": "value"}', mode: "search" }, 400);
  assert(data.reason.includes("JSON") || data.reason.includes("injection"), `Got: ${data.reason}`);
});

Deno.test("v17 Adversarial: valid query passes", async () => {
  const data = await invoke({ query: "habeas corpus", mode: "search", matchCount: 2, hybrid: false }, 200);
  assertExists(data.results);
  assertExists(data.pipeline);
});

// ═══ v17 Pipeline stages verification ═══
Deno.test("v17 Pipeline includes GNN and Cross-Attention stages", async () => {
  const data = await invoke({ query: "direito penal", mode: "search", matchCount: 3, hybrid: false }, 200);
  const pipeline = data.pipeline as string[];
  assert(pipeline.includes("gnn_message_passing"), `Missing gnn_message_passing in pipeline: ${pipeline.join(", ")}`);
  assert(pipeline.includes("cross_result_attention"), `Missing cross_result_attention`);
  assert(pipeline.includes("shap_interpretability"), `Missing shap_interpretability`);
  assert(pipeline.includes("privacy_sanitization"), `Missing privacy_sanitization`);
});

// ═══ v17 SHAP Interpretability ═══
Deno.test("v17 SHAP explanation present in results", async () => {
  const data = await invoke({ query: "código civil artigo 927", mode: "search", matchCount: 2, hybrid: false }, 200);
  if (data.results.length > 0) {
    const first = data.results[0];
    assertExists(first.shap_explanation, "Result should have shap_explanation");
  }
});

// ═══ v17 Privacy Sanitization ═══
Deno.test("v17 Privacy score present in results", async () => {
  const data = await invoke({ query: "processo civil", mode: "search", matchCount: 2, hybrid: false }, 200);
  if (data.results.length > 0) {
    const first = data.results[0];
    assertExists(first.privacy_score, "Result should have privacy_score");
    assert(first.privacy_score >= 0 && first.privacy_score <= 1, `Privacy score should be 0-1, got ${first.privacy_score}`);
  }
});

// ═══ v17 Version string ═══
Deno.test("v17 version string present", async () => {
  const data = await invoke({ query: "constituição federal", mode: "search", matchCount: 1, hybrid: false }, 200);
  assertExists(data.version);
  assert(data.version.includes("v18"), `Expected v18 in version, got: ${data.version}`);
});

// ═══ RLVR mode ═══
Deno.test("RLVR mode returns score and checks", async () => {
  const data = await invoke({
    mode: "rlvr",
    content: "Conforme Art. 5º da CF/88, o STF decidiu no RE 123456-78.2024.1.00.0000 que...",
    source_query: "direitos fundamentais",
  }, 200);
  assertExists(data.rlvr_score);
  assertExists(data.checks);
  assert(data.rlvr_score >= 0 && data.rlvr_score <= 1, `RLVR score should be 0-1`);
});
