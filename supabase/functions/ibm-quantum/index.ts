/**
 * IBM Quantum Edge Function — E2E Test
 * Supports both IBM Cloud IAM and IBM Quantum Platform auth flows.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const RUNTIME_API = 'https://us-east.quantum-computing.cloud.ibm.com';

async function getIAMToken(apiKey: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IAM auth failed [${res.status}]: ${text}`);
  }
  return await res.json();
}

async function listBackends(iamToken: string, serviceCRN?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${iamToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (serviceCRN) headers['Service-CRN'] = serviceCRN;
  
  const res = await fetch(`${RUNTIME_API}/backends`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backends failed [${res.status}]: ${text}`);
  }
  return await res.json();
}

async function listJobs(iamToken: string, limit = 5, serviceCRN?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${iamToken}`,
    'Accept': 'application/json',
  };
  if (serviceCRN) headers['Service-CRN'] = serviceCRN;
  
  const res = await fetch(`${RUNTIME_API}/jobs?limit=${limit}&sort_by=created_date:desc`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobs failed [${res.status}]: ${text}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('IBM_QUANTUM_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'IBM_QUANTUM_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const action = body.action || 'health';
    const serviceCRN = body.service_crn || Deno.env.get('IBM_QUANTUM_SERVICE_CRN') || 'crn:v1:bluemix:public:quantum-computing:us-east:a/0fe9f1dc12954b94b7a527d44d75b77e:5adbed5c-1f2c-46b0-bd19-adb9076f26ad::';
    console.log(`🔬 IBM Quantum: action=${action}, hasCRN=${!!serviceCRN}`);

    // IAM Auth
    const t0 = Date.now();
    const iam = await getIAMToken(apiKey);
    const authMs = Date.now() - t0;
    console.log(`✅ IAM OK (${authMs}ms)`);

    const authInfo = { authenticated: true, tokenExpiresIn: iam.expires_in, authLatencyMs: authMs };

    if (action === 'health') {
      return new Response(
        JSON.stringify({ success: true, action: 'health', auth: authInfo, hasCRN: !!serviceCRN, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'backends') {
      const t1 = Date.now();
      let backends: any = null;
      let error: string | null = null;
      try { backends = await listBackends(iam.access_token, serviceCRN); } catch (e) { error = (e as Error).message; }
      
      const items = Array.isArray(backends) ? backends
        : backends?.backends || backends?.devices || [];

      return new Response(
        JSON.stringify({
          success: true, action: 'backends', auth: authInfo,
          backends: items.slice(0, 25).map((b: any) => ({
            name: b.backend_name || b.name, status: b.status,
            qubits: b.n_qubits || b.num_qubits, simulator: b.simulator ?? false,
          })),
          total: items.length, error, latencyMs: Date.now() - t1,
          rawSample: backends ? JSON.stringify(backends).slice(0, 500) : null,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'jobs') {
      const t1 = Date.now();
      let jobs: any = null;
      let error: string | null = null;
      try { jobs = await listJobs(iam.access_token, 5, serviceCRN); } catch (e) { error = (e as Error).message; }

      return new Response(
        JSON.stringify({
          success: true, action: 'jobs', auth: authInfo,
          jobs: jobs?.jobs || jobs || [], error, latencyMs: Date.now() - t1,
          rawSample: jobs ? JSON.stringify(jobs).slice(0, 500) : null,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}. Use: health, backends, jobs` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ IBM Quantum error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
