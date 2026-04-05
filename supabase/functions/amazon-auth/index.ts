const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const AMAZON_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const AMAZON_PROFILE_URL = 'https://api.amazon.com/user/profile'
const AMAZON_API_BASE = 'https://api.amazon.com'

// ─── SSRF Protection: Only allow Amazon API domains ───
const ALLOWED_API_HOSTS = [
  'api.amazon.com',
  'api.amazonalexa.com',
  'layla.amazon.com',
  'alexa.amazon.com',
]

function isAllowedUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return ALLOWED_API_HOSTS.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase config')
  return createClient(url, key)
}

async function getStoredToken(serviceClient: any, userId: string) {
  const { data } = await serviceClient
    .from('user_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'amazon')
    .single()
  return data
}

async function refreshAmazonToken(
  serviceClient: any,
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const tokenRes = await fetch(AMAZON_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('Amazon token refresh failed:', tokenData)
    return null
  }

  await serviceClient.from('user_integrations').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken,
    expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'amazon')

  return tokenData.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const AMAZON_CLIENT_ID = Deno.env.get('AMAZON_CLIENT_ID')
    const AMAZON_CLIENT_SECRET = Deno.env.get('AMAZON_CLIENT_SECRET')
    if (!AMAZON_CLIENT_ID || !AMAZON_CLIENT_SECRET) {
      return jsonResponse({ error: 'Amazon credentials not configured' }, 500)
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid token' }, 401)
    }
    const userId = user.id

    // ─── Rate Limiting ───
    const serviceClient = getServiceClient()
    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      _user_id: userId,
      _function_name: 'amazon-auth',
      _max_requests: 60,
      _window_minutes: 5,
    })
    if (allowed === false) {
      return jsonResponse({ error: 'Rate limit exceeded. Try again in a few minutes.' }, 429)
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'exchange'

    // ─── CONFIG: Return client ID for frontend OAuth flow ───
    if (action === 'config') {
      return jsonResponse({
        client_id: AMAZON_CLIENT_ID,
        scopes: [
          'profile',
        ],
      })
    }

    // ─── EXCHANGE: Authorization code → tokens ───
    if (action === 'exchange') {
      let body: any
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }
      const { code, redirect_uri, state } = body

      if (!code || !redirect_uri) {
        return jsonResponse({ error: 'Missing code or redirect_uri' }, 400)
      }

      // ─── State validation (CSRF protection) ───
      if (state) {
        try {
          const decoded = JSON.parse(atob(state))
          const age = Date.now() - (decoded.ts || 0)
          if (age > 10 * 60 * 1000) { // 10 minute max
            return jsonResponse({ error: 'OAuth state expired' }, 400)
          }
        } catch {
          return jsonResponse({ error: 'Invalid OAuth state' }, 400)
        }
      }

      const tokenRes = await fetch(AMAZON_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id: AMAZON_CLIENT_ID,
          client_secret: AMAZON_CLIENT_SECRET,
        }),
      })

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) {
        console.error('Amazon token exchange failed:', tokenData)
        return jsonResponse({ error: 'Token exchange failed', details: tokenData }, 400)
      }

      // Get Amazon profile
      let profile = null
      try {
        const profileRes = await fetch(AMAZON_PROFILE_URL, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        if (profileRes.ok) {
          profile = await profileRes.json()
        }
      } catch (e) {
        console.warn('Profile fetch failed:', e)
      }

      const serviceClient = getServiceClient()
      await serviceClient.from('user_integrations').upsert({
        user_id: userId,
        provider: 'amazon',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        profile_data: profile,
        scopes: tokenData.scope?.split(' ') || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

      return jsonResponse({
        success: true,
        profile,
        scopes: tokenData.scope?.split(' ') || [],
        expires_in: tokenData.expires_in,
      })
    }

    // ─── REFRESH: Refresh token ───
    if (action === 'refresh') {
      const serviceClient = getServiceClient()
      const integration = await getStoredToken(serviceClient, userId)

      if (!integration?.refresh_token) {
        return jsonResponse({ error: 'No Amazon connection found' }, 404)
      }

      const newToken = await refreshAmazonToken(
        serviceClient, userId, integration.refresh_token,
        AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET
      )

      if (!newToken) {
        return jsonResponse({ error: 'Token refresh failed — reconnect required' }, 401)
      }

      return jsonResponse({ success: true })
    }

    // ─── STATUS: Check connection status ───
    if (action === 'status') {
      const serviceClient = getServiceClient()

      const { data: integration } = await serviceClient
        .from('user_integrations')
        .select('profile_data, scopes, expires_at, updated_at')
        .eq('user_id', userId)
        .eq('provider', 'amazon')
        .single()

      return jsonResponse({
        connected: !!integration,
        profile: integration?.profile_data,
        scopes: integration?.scopes || [],
        expires_at: integration?.expires_at,
        updated_at: integration?.updated_at,
      })
    }

    // ─── DISCONNECT: Remove integration ───
    if (action === 'disconnect') {
      const serviceClient = getServiceClient()
      await serviceClient.from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'amazon')

      return jsonResponse({ success: true })
    }

    // ─── ALEXA DEVICES: List Alexa-connected devices ───
    if (action === 'alexa_devices') {
      const serviceClient = getServiceClient()
      const integration = await getStoredToken(serviceClient, userId)

      if (!integration?.access_token) {
        return jsonResponse({ error: 'Not connected to Amazon' }, 401)
      }

      let accessToken = integration.access_token
      const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date()
      if (isExpired && integration.refresh_token) {
        const refreshed = await refreshAmazonToken(
          serviceClient, userId, integration.refresh_token,
          AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET
        )
        if (!refreshed) return jsonResponse({ error: 'Token expired' }, 401)
        accessToken = refreshed
      }

      try {
        const res = await fetch('https://api.amazonalexa.com/v2/appliances', {
          headers: { Authorization: `Bearer ${accessToken}`, 'Accept': 'application/json' },
        })
        if (!res.ok) {
          const errText = await res.text()
          return jsonResponse({ error: `Alexa API ${res.status}`, details: errText }, res.status)
        }
        const data = await res.json()
        return jsonResponse(data)
      } catch (e) {
        return jsonResponse({ error: `Alexa API unreachable: ${(e as Error).message}` }, 502)
      }
    }

    // ─── API: Proxy calls to Amazon services (with SSRF protection) ───
    if (action === 'api') {
      let body: any
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }
      const { endpoint, method: apiMethod, payload } = body

      if (!endpoint) {
        return jsonResponse({ error: 'Missing endpoint' }, 400)
      }

      // Build the full URL
      const apiUrl = endpoint.startsWith('http')
        ? endpoint
        : `${AMAZON_API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

      // ─── SSRF Protection: block non-Amazon URLs ───
      if (!isAllowedUrl(apiUrl)) {
        console.warn(`[SSRF BLOCKED] Attempted request to: ${apiUrl}`)
        return jsonResponse({ error: 'Requested URL is not an allowed Amazon API endpoint' }, 403)
      }

      const serviceClient = getServiceClient()
      const integration = await getStoredToken(serviceClient, userId)

      if (!integration?.access_token) {
        return jsonResponse({ error: 'Not connected to Amazon. Connect in Settings > Amazon.' }, 401)
      }

      // Auto-refresh if token is expired
      let accessToken = integration.access_token
      const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date()
      if (isExpired && integration.refresh_token) {
        const refreshed = await refreshAmazonToken(
          serviceClient, userId, integration.refresh_token,
          AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET
        )
        if (!refreshed) {
          return jsonResponse({ error: 'Token expired, reconnect required' }, 401)
        }
        accessToken = refreshed
      }

      try {
        const fetchOptions: RequestInit = {
          method: apiMethod || 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
        if (payload && ['POST', 'PUT', 'PATCH'].includes((apiMethod || 'GET').toUpperCase())) {
          fetchOptions.body = JSON.stringify(payload)
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
        fetchOptions.signal = controller.signal

        const apiRes = await fetch(apiUrl, fetchOptions)
        clearTimeout(timeout)
        
        const apiData = await apiRes.text()

        let parsed: any
        try {
          parsed = JSON.parse(apiData)
        } catch {
          parsed = { raw: apiData }
        }

        if (!apiRes.ok) {
          console.error(`Amazon API error [${apiRes.status}]:`, apiData.slice(0, 500))
        }

        return new Response(JSON.stringify(parsed), {
          status: apiRes.ok ? 200 : apiRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (fetchErr) {
        console.error('Amazon API fetch error:', fetchErr)
        const msg = (fetchErr as Error).name === 'AbortError'
          ? 'Amazon API timeout (15s)'
          : `Amazon API unreachable: ${(fetchErr as Error).message}`
        return jsonResponse({ error: msg }, 502)
      }
    }

    return jsonResponse({ error: `Invalid action: ${action}` }, 400)
  } catch (error) {
    console.error('Amazon auth error:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})
