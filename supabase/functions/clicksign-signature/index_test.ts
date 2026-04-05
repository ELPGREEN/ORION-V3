import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("Clicksign API v3 - test connection by creating and deleting an envelope", async () => {
  // We'll test by calling the edge function with a simple list action
  // But since it requires auth, let's test the Clicksign API directly
  const CLICKSIGN_API_KEY = Deno.env.get("CLICKSIGN_API_KEY");
  
  if (!CLICKSIGN_API_KEY) {
    console.log("CLICKSIGN_API_KEY not set, skipping direct API test");
    return;
  }

  // Test: Create a test envelope on Clicksign v3
  const baseUrl = "https://app.clicksign.com/api/v3";
  
  const response = await fetch(`${baseUrl}/envelopes`, {
    method: "POST",
    headers: {
      "Authorization": CLICKSIGN_API_KEY,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "envelopes",
        attributes: {
          name: "Teste de Conexão - Lovable",
        },
      },
    }),
  });

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${text.substring(0, 500)}`);

  if (response.ok) {
    const data = JSON.parse(text);
    const envelopeId = data.data?.id;
    console.log(`✅ Envelope criado com sucesso! ID: ${envelopeId}`);
    
    // Cleanup: delete the test envelope
    if (envelopeId) {
      const deleteRes = await fetch(`${baseUrl}/envelopes/${envelopeId}`, {
        method: "DELETE",
        headers: {
          "Authorization": CLICKSIGN_API_KEY,
          "Accept": "application/json",
        },
      });
      await deleteRes.text();
      console.log(`🗑️ Envelope de teste removido (status: ${deleteRes.status})`);
    }
  } else {
    console.error(`❌ Falha na conexão: ${response.status}`);
    throw new Error(`Clicksign API connection failed: ${response.status} - ${text.substring(0, 300)}`);
  }
});
