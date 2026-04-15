import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

function getServiceAccount(): ServiceAccount {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }
  
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!raw) throw new Error("Firebase service account not configured");
  return JSON.parse(raw);
}

async function createServiceAccountJWT(sa: ServiceAccount, scope: string, impersonateEmail?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope,
  };
  // Only add 'sub' if impersonateEmail is explicitly provided AND differs from service account
  if (impersonateEmail && impersonateEmail !== sa.client_email) {
    payload.sub = impersonateEmail;
  }

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  let keyStr = sa.private_key.trim();
  while ((keyStr.startsWith('"') && keyStr.endsWith('"')) || (keyStr.startsWith("'") && keyStr.endsWith("'"))) {
    keyStr = keyStr.slice(1, -1);
  }
  keyStr = keyStr.replace(/\\n/g, "\n");
  
  const pemBody = keyStr
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[\n\r\s]/g, "");
  
  let keyData: Uint8Array;
  try {
    const binaryString = atob(pemBody);
    keyData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyData[i] = binaryString.charCodeAt(i);
    }
  } catch {
    const cleaned = pemBody.replace(/[^A-Za-z0-9+/=]/g, "");
    const binaryString = atob(cleaned);
    keyData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyData[i] = binaryString.charCodeAt(i);
    }
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

// Token cache to avoid re-generating tokens for same scope
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

async function getAccessToken(sa: ServiceAccount, scope: string, impersonateEmail?: string): Promise<string> {
  const cacheKey = `${scope}::${impersonateEmail || "self"}`;
  const cached = tokenCache[cacheKey];
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }

  const jwt = await createServiceAccountJWT(sa, scope, impersonateEmail);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`OAuth token error: ${await res.text()}`);
  const data = await res.json();
  
  tokenCache[cacheKey] = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  
  return data.access_token;
}

// ─── Storage Operations ───────────────────────────────────
async function storageUpload(sa: ServiceAccount, bucket: string, path: string, data: Uint8Array, contentType: string) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/devstorage.read_write");
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: data,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${await res.text()}`);
  return res.json();
}

async function storageDelete(sa: ServiceAccount, bucket: string, path: string) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/devstorage.read_write");
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed: ${await res.text()}`);
  return { deleted: true };
}

async function storageList(sa: ServiceAccount, bucket: string, prefix: string) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/devstorage.read_only");
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Storage list failed: ${await res.text()}`);
  return res.json();
}

async function storageGetSignedUrl(sa: ServiceAccount, bucket: string, path: string, expiresInMinutes = 60) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/devstorage.read_only");
  const expiration = new Date(Date.now() + expiresInMinutes * 60_000).toISOString();
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    url: `https://storage.googleapis.com/${bucket}/${path}`,
    authenticatedUrl: res.ok ? `Bearer token valid until ${expiration}` : null,
    accessToken: token,
  };
}

// ─── FCM (Push Notifications) ─────────────────────────────
async function sendPushNotification(sa: ServiceAccount, token: string, title: string, body: string, data?: Record<string, string>) {
  const accessToken = await getAccessToken(sa, "https://www.googleapis.com/auth/firebase.messaging");
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title, body }, ...(data ? { data } : {}) } }),
    }
  );
  if (!res.ok) throw new Error(`FCM send failed: ${await res.text()}`);
  return res.json();
}

async function sendTopicNotification(sa: ServiceAccount, topic: string, title: string, body: string, data?: Record<string, string>) {
  const accessToken = await getAccessToken(sa, "https://www.googleapis.com/auth/firebase.messaging");
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { topic, notification: { title, body }, ...(data ? { data } : {}) } }),
    }
  );
  if (!res.ok) throw new Error(`FCM topic send failed: ${await res.text()}`);
  return res.json();
}

// ─── Firebase Auth Verification ───────────────────────────
async function verifyFirebaseToken(sa: ServiceAccount, idToken: string) {
  const accessToken = await getAccessToken(sa, "https://www.googleapis.com/auth/firebase");
  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!verifyRes.ok) throw new Error(`Token verification failed: ${await verifyRes.text()}`);
  const data = await verifyRes.json();
  return data.users?.[0] || null;
}

// ═══════════════════════════════════════════════════════════
// ─── Google Workspace (Server-Side via Service Account) ───
// ═══════════════════════════════════════════════════════════

const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/cloud-vision",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/dialogflow"
].join(" ");

// ─── User OAuth2 Token Management ─────────────────────────

const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/tasks"
].join(" ");

async function exchangeOAuthCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth client credentials not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth exchange failed: ${errText}`);
  }
  return res.json();
}

async function refreshOAuthToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth client credentials not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth refresh failed: ${errText}`);
  }
  return res.json();
}

async function getUserGoogleToken(supabaseClient: any, userId: string): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  // Check if token is still valid (with 2 min buffer)
  const expiresAt = new Date(data.token_expires_at);
  if (expiresAt.getTime() > Date.now() + 120000) {
    return data.access_token;
  }

  // Token expired — refresh it
  if (!data.refresh_token) return null;

  try {
    const refreshed = await refreshOAuthToken(data.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    // Use service role to update (RLS would block since we're in edge function context)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await adminClient
      .from("user_google_tokens")
      .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
      .eq("user_id", userId);

    return refreshed.access_token;
  } catch (err) {
    console.error("[firebase-admin] Token refresh failed:", (err as Error).message);
    return null;
  }
}

async function getGoogleWorkspaceToken(sa: ServiceAccount): Promise<string> {
  const impersonateEmail = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL")?.trim();
  if (impersonateEmail) {
    return getAccessToken(sa, GOOGLE_WORKSPACE_SCOPES, impersonateEmail);
  }
  return getAccessToken(sa, GOOGLE_WORKSPACE_SCOPES);
}

// (GOOGLE_WORKSPACE_SCOPES already defined above)

// Helper: get effective token (user OAuth > service account fallback)
async function getEffectiveToken(sa: ServiceAccount, supabaseClient: any, userId: string): Promise<string> {
  const userToken = await getUserGoogleToken(supabaseClient, userId);
  if (userToken) return userToken;
  return getGoogleWorkspaceToken(sa);
}

// ─── Google Calendar ──────────────────────────────────────

async function googleCalendarList(token: string, timeMin: string, timeMax: string, maxResults = 50) {
  const calendarId = "primary";
  const params = new URLSearchParams({
    timeMin, timeMax, maxResults: String(maxResults),
    singleEvents: "true", orderBy: "startTime",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar list failed: ${await res.text()}`);
  return res.json();
}

async function googleCalendarCreate(token: string, eventData: Record<string, unknown>) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventData),
  });
  if (!res.ok) throw new Error(`Calendar create failed: ${await res.text()}`);
  return res.json();
}

async function googleCalendarDelete(token: string, eventId: string) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Calendar delete failed: ${await res.text()}`);
  return { deleted: true };
}

// ─── Gmail ────────────────────────────────────────────────

async function googleGmailProfile(token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail profile failed: ${await res.text()}`);
  return res.json();
}

async function googleGmailList(token: string, maxResults = 15) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail list failed: ${await res.text()}`);
  return res.json();
}

async function googleGmailGet(token: string, messageId: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail get failed: ${await res.text()}`);
  return res.json();
}

async function googleGmailSend(token: string, to: string, subject: string, bodyText: string) {
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    bodyText
  ].join("\r\n");
  
  const encodedMessage = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodedMessage }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
  return res.json();
}

async function googleGmailTrash(token: string, messageId: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail trash failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Contacts ──────────────────────────────────────

async function googleContactsList(token: string, pageSize = 200) {
  const res = await fetch(
    `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Contacts list failed: ${await res.text()}`);
  const data = await res.json();
  const contacts = (data.connections || []).map((p: any) => ({
    name: p.names?.[0]?.displayName || "",
    email: p.emailAddresses?.[0]?.value || "",
    phone: p.phoneNumbers?.[0]?.value || "",
    company: p.organizations?.[0]?.name || "",
  })).filter((c: any) => c.email);
  return { contacts, totalPeople: data.totalPeople || contacts.length };
}

// ─── Google Drive ─────────────────────────────────────────

async function googleDriveList(token: string, pageSize = 10) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`);
  return res.json();
}

async function googleDriveSearch(token: string, query: string, pageSize = 10) {
  const q = encodeURIComponent(`name contains '${query}'`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive search failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Sheets ────────────────────────────────────────

async function googleSheetsCreate(token: string, title: string) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) throw new Error(`Sheets create failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Docs ──────────────────────────────────────────

async function googleDocsGet(token: string, documentId: string) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Docs get failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Tasks ─────────────────────────────────────────

async function googleTasksListLists(token: string) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Tasks list-lists failed: ${await res.text()}`);
  return res.json();
}

async function googleTasksList(token: string, taskListId: string) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Tasks list failed: ${await res.text()}`);
  return res.json();
}

async function googleTasksCreate(token: string, taskListId: string, title: string, notes?: string, due?: string) {
  const body: Record<string, unknown> = { title };
  if (notes) body.notes = notes;
  if (due) body.due = due;
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tasks create failed: ${await res.text()}`);
  return res.json();
}

async function googleTasksComplete(token: string, taskListId: string, taskId: string) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  if (!res.ok) throw new Error(`Tasks complete failed: ${await res.text()}`);
  return res.json();
}

async function googleTasksDelete(token: string, taskListId: string, taskId: string) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Tasks delete failed: ${await res.text()}`);
  return { deleted: true };
}

// ─── Google Slides ────────────────────────────────────────

async function googleSlidesCreate(token: string, title: string) {
  const res = await fetch(`https://slides.googleapis.com/v1/presentations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Slides create failed: ${await res.text()}`);
  return res.json();
}

async function googleSlidesGet(token: string, presentationId: string) {
  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slides get failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Forms ─────────────────────────────────────────

async function googleFormsCreate(token: string, title: string) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ info: { title } }),
  });
  if (!res.ok) throw new Error(`Forms create failed: ${await res.text()}`);
  return res.json();
}

async function googleFormsGet(token: string, formId: string) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Forms get failed: ${await res.text()}`);
  return res.json();
}

async function googleFormsResponses(token: string, formId: string) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Forms responses failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Chat ──────────────────────────────────────────

async function googleChatSpaces(token: string) {
  const res = await fetch(`https://chat.googleapis.com/v1/spaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Chat spaces failed: ${await res.text()}`);
  return res.json();
}

async function googleChatSend(token: string, spaceName: string, text: string) {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Chat send failed: ${await res.text()}`);
  return res.json();
}

async function googleChatMessages(token: string, spaceName: string, pageSize = 25) {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Chat messages failed: ${await res.text()}`);
  return res.json();
}

// ─── Cloud Vision ─────────────────────────────────────────

async function cloudVisionAnnotate(sa: ServiceAccount, base64Image: string, features: string[], celebrityRecognition = false) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/cloud-vision");
  const featureList = features.map(f => ({ type: f }));
  
  // Use v1p4beta1 endpoint when celebrity recognition is enabled
  const apiVersion = celebrityRecognition ? "v1p4beta1" : "v1";
  const requestBody: any = { image: { content: base64Image }, features: featureList };
  
  if (celebrityRecognition) {
    requestBody.imageContext = {
      faceRecognitionParams: {
        celebritySet: ["builtin/default"]
      }
    };
  }
  
  const res = await fetch(`https://vision.googleapis.com/${apiVersion}/images:annotate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [requestBody] }),
  });
  if (!res.ok) throw new Error(`Vision annotate failed: ${await res.text()}`);
  return res.json();
}

// ─── Dialogflow ───────────────────────────────────────────

async function dialogflowDetectIntent(sa: ServiceAccount, sessionId: string, text: string, languageCode = "pt-BR") {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/dialogflow");
  const projectId = sa.project_id;
  const res = await fetch(
    `https://dialogflow.googleapis.com/v2/projects/${projectId}/agent/sessions/${sessionId}:detectIntent`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ queryInput: { text: { text, languageCode } } }),
    }
  );
  if (!res.ok) throw new Error(`Dialogflow detect failed: ${await res.text()}`);
  return res.json();
}

// ─── Cloud Firestore ──────────────────────────────────────

async function firestoreGet(sa: ServiceAccount, collection: string, documentId?: string) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/datastore");
  const basePath = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${collection}`;
  const url = documentId ? `${basePath}/${documentId}` : basePath;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Firestore get failed: ${await res.text()}`);
  return res.json();
}

async function firestoreSet(sa: ServiceAccount, collection: string, documentId: string, fields: Record<string, unknown>) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/datastore");
  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") firestoreFields[k] = { stringValue: v };
    else if (typeof v === "number") firestoreFields[k] = { doubleValue: v };
    else if (typeof v === "boolean") firestoreFields[k] = { booleanValue: v };
    else firestoreFields[k] = { stringValue: JSON.stringify(v) };
  }
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${collection}/${documentId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: firestoreFields }),
    }
  );
  if (!res.ok) throw new Error(`Firestore set failed: ${await res.text()}`);
  return res.json();
}

// ─── Google Analytics Data ────────────────────────────────

async function analyticsRunReport(sa: ServiceAccount, propertyId: string, dateRange: { startDate: string; endDate: string }, metrics: string[], dimensions?: string[]) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/analytics.readonly");
  const body: Record<string, unknown> = {
    dateRanges: [dateRange],
    metrics: metrics.map(m => ({ name: m })),
  };
  if (dimensions?.length) body.dimensions = dimensions.map(d => ({ name: d }));
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Analytics report failed: ${await res.text()}`);
  return res.json();
}

// ─── Cloud Pub/Sub ────────────────────────────────────────

async function pubsubPublish(sa: ServiceAccount, topic: string, data: string, attributes?: Record<string, string>) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/pubsub");
  const message: Record<string, unknown> = { data: btoa(data) };
  if (attributes) message.attributes = attributes;
  const res = await fetch(
    `https://pubsub.googleapis.com/v1/projects/${sa.project_id}/topics/${topic}:publish`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [message] }),
    }
  );
  if (!res.ok) throw new Error(`Pub/Sub publish failed: ${await res.text()}`);
  return res.json();
}

async function pubsubTopics(sa: ServiceAccount) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/pubsub");
  const res = await fetch(`https://pubsub.googleapis.com/v1/projects/${sa.project_id}/topics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Pub/Sub topics failed: ${await res.text()}`);
  return res.json();
}

// ─── BigQuery ─────────────────────────────────────────────

async function bigqueryQuery(sa: ServiceAccount, query: string, maxResults = 100) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/bigquery");
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${sa.project_id}/queries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, useLegacySql: false, maxResults }),
  });
  if (!res.ok) throw new Error(`BigQuery query failed: ${await res.text()}`);
  return res.json();
}

async function bigqueryDatasets(sa: ServiceAccount) {
  const token = await getAccessToken(sa, "https://www.googleapis.com/auth/bigquery");
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${sa.project_id}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`BigQuery datasets failed: ${await res.text()}`);
  return res.json();
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Health check — no auth required
    if (req.method === "POST") {
      let peekBody: Record<string, unknown> | null = null;
      try {
        peekBody = await req.clone().json();
      } catch { /* not JSON */ }
      if (peekBody?.action === "health") {
        try {
          const sa = getServiceAccount();
          const token = await getAccessToken(sa, "https://www.googleapis.com/auth/devstorage.read_only");
          return new Response(JSON.stringify({
            success: true,
            data: { status: "ok", project_id: sa.project_id, token_obtained: !!token },
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (healthErr) {
          console.error("[firebase-admin] health check error:", (healthErr as Error)?.message || healthErr);
          return new Response(JSON.stringify({ success: false, error: (healthErr as Error)?.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Auth check — require Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sa = getServiceAccount();
    
    // Resolve Google's effective token only for actual Workspace API calls.
    // OAuth helper actions manage token state and must not depend on Workspace impersonation.
    const requiresGoogleWorkspaceToken =
      action.startsWith("google.") && !action.startsWith("google.oauth.");
    const gToken = requiresGoogleWorkspaceToken ? await getEffectiveToken(sa, supabase, user.id) : "";

    let result: unknown;

    switch (action) {
      // ── Storage ──
      case "storage.upload": {
        const { bucket, path, base64Data, contentType } = body;
        if (!bucket || !path || !base64Data) throw new Error("Missing bucket, path, or base64Data");
        const data = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        result = await storageUpload(sa, bucket, path, data, contentType || "application/octet-stream");
        break;
      }
      case "storage.delete": {
        const { bucket, path } = body;
        if (!bucket || !path) throw new Error("Missing bucket or path");
        result = await storageDelete(sa, bucket, path);
        break;
      }
      case "storage.list": {
        const { bucket, prefix } = body;
        if (!bucket) throw new Error("Missing bucket");
        result = await storageList(sa, bucket, prefix || "");
        break;
      }
      case "storage.signedUrl": {
        const { bucket, path, expiresInMinutes } = body;
        if (!bucket || !path) throw new Error("Missing bucket or path");
        result = await storageGetSignedUrl(sa, bucket, path, expiresInMinutes);
        break;
      }

      // ── FCM ──
      case "fcm.send": {
        const { deviceToken, title, body: msgBody, data } = body;
        if (!deviceToken || !title) throw new Error("Missing deviceToken or title");
        result = await sendPushNotification(sa, deviceToken, title, msgBody || "", data);
        break;
      }
      case "fcm.topic": {
        const { topic, title, body: msgBody, data } = body;
        if (!topic || !title) throw new Error("Missing topic or title");
        result = await sendTopicNotification(sa, topic, title, msgBody || "", data);
        break;
      }

      // ── Auth ──
      case "auth.verify": {
        const { firebaseToken } = body;
        if (!firebaseToken) throw new Error("Missing firebaseToken");
        result = await verifyFirebaseToken(sa, firebaseToken);
        break;
      }

      // ═══ Google OAuth2 ═══
      case "google.oauth.exchange": {
        const { code: authCode, redirectUri } = body;
        if (!authCode || !redirectUri) throw new Error("Missing code or redirectUri");
        const tokens = await exchangeOAuthCode(authCode, redirectUri);
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        
        // Get user email from Google
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profileData = profileRes.ok ? await profileRes.json() : {};
        
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await adminClient.from("user_google_tokens").upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          scopes: tokens.scope,
          connected_email: profileData.email || null,
        }, { onConflict: "user_id" });
        
        result = { connected: true, email: profileData.email };
        break;
      }
      case "google.oauth.disconnect": {
        const adminClient2 = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await adminClient2.from("user_google_tokens").delete().eq("user_id", user.id);
        result = { disconnected: true };
        break;
      }
      case "google.oauth.status": {
        const { data: tokenRow } = await supabase
          .from("user_google_tokens")
          .select("connected_email, scopes, token_expires_at")
          .eq("user_id", user.id)
          .maybeSingle();
        result = { connected: !!tokenRow, email: tokenRow?.connected_email || null };
        break;
      }

      // ═══ Google Workspace (User OAuth or Service Account fallback) ═══
      case "google.calendar.list": {
        const { timeMin, timeMax, maxResults } = body;
        if (!timeMin || !timeMax) throw new Error("Missing timeMin or timeMax");
        result = await googleCalendarList(gToken, timeMin, timeMax, maxResults || 50);
        break;
      }
      case "google.calendar.create": {
        const { eventData } = body;
        if (!eventData) throw new Error("Missing eventData");
        result = await googleCalendarCreate(gToken, eventData);
        break;
      }
      case "google.calendar.delete": {
        const { eventId } = body;
        if (!eventId) throw new Error("Missing eventId");
        result = await googleCalendarDelete(gToken, eventId);
        break;
      }
      case "google.gmail.profile": {
        result = await googleGmailProfile(gToken);
        break;
      }
      case "google.gmail.list": {
        result = await googleGmailList(gToken, body.maxResults || 15);
        break;
      }
      case "google.gmail.get": {
        const { messageId } = body;
        if (!messageId) throw new Error("Missing messageId");
        result = await googleGmailGet(gToken, messageId);
        break;
      }
      case "google.gmail.send": {
        const { to, subject, bodyText } = body;
        if (!to || !subject) throw new Error("Missing to or subject");
        result = await googleGmailSend(gToken, to, subject, bodyText || "");
        break;
      }
      case "google.gmail.trash": {
        const { messageId } = body;
        if (!messageId) throw new Error("Missing messageId");
        result = await googleGmailTrash(gToken, messageId);
        break;
      }
      case "google.contacts.list": {
        result = await googleContactsList(gToken, body.pageSize || 200);
        break;
      }
      case "google.drive.list": {
        result = await googleDriveList(gToken, body.pageSize || 10);
        break;
      }
      case "google.drive.search": {
        const { query, pageSize } = body;
        if (!query) throw new Error("Missing query");
        result = await googleDriveSearch(gToken, query, pageSize || 10);
        break;
      }
      case "google.sheets.create": {
        const { title } = body;
        if (!title) throw new Error("Missing title");
        result = await googleSheetsCreate(gToken, title);
        break;
      }
      case "google.docs.get": {
        const { documentId } = body;
        if (!documentId) throw new Error("Missing documentId");
        result = await googleDocsGet(gToken, documentId);
        break;
      }

      // ═══ Google Tasks ═══
      case "google.tasks.lists": {
        result = await googleTasksListLists(gToken);
        break;
      }
      case "google.tasks.list": {
        const { taskListId } = body;
        if (!taskListId) throw new Error("Missing taskListId");
        result = await googleTasksList(gToken, taskListId);
        break;
      }
      case "google.tasks.create": {
        const { taskListId, title, notes, due } = body;
        if (!taskListId || !title) throw new Error("Missing taskListId or title");
        result = await googleTasksCreate(gToken, taskListId, title, notes, due);
        break;
      }
      case "google.tasks.complete": {
        const { taskListId, taskId } = body;
        if (!taskListId || !taskId) throw new Error("Missing taskListId or taskId");
        result = await googleTasksComplete(gToken, taskListId, taskId);
        break;
      }
      case "google.tasks.delete": {
        const { taskListId, taskId } = body;
        if (!taskListId || !taskId) throw new Error("Missing taskListId or taskId");
        result = await googleTasksDelete(gToken, taskListId, taskId);
        break;
      }

      // ═══ Google Slides ═══
      case "google.slides.create": {
        const { title } = body;
        if (!title) throw new Error("Missing title");
        result = await googleSlidesCreate(gToken, title);
        break;
      }
      case "google.slides.get": {
        const { presentationId } = body;
        if (!presentationId) throw new Error("Missing presentationId");
        result = await googleSlidesGet(gToken, presentationId);
        break;
      }

      // ═══ Google Forms ═══
      case "google.forms.create": {
        const { title } = body;
        if (!title) throw new Error("Missing title");
        result = await googleFormsCreate(gToken, title);
        break;
      }
      case "google.forms.get": {
        const { formId } = body;
        if (!formId) throw new Error("Missing formId");
        result = await googleFormsGet(gToken, formId);
        break;
      }
      case "google.forms.responses": {
        const { formId } = body;
        if (!formId) throw new Error("Missing formId");
        result = await googleFormsResponses(gToken, formId);
        break;
      }

      // ═══ Google Chat ═══
      case "google.chat.spaces": {
        result = await googleChatSpaces(gToken);
        break;
      }
      case "google.chat.send": {
        const { spaceName, text } = body;
        if (!spaceName || !text) throw new Error("Missing spaceName or text");
        result = await googleChatSend(gToken, spaceName, text);
        break;
      }
      case "google.chat.messages": {
        const { spaceName, pageSize } = body;
        if (!spaceName) throw new Error("Missing spaceName");
        result = await googleChatMessages(gToken, spaceName, pageSize || 25);
        break;
      }

      // ═══ Cloud Vision ═══
      case "google.vision.annotate": {
        const { base64Image, features, celebrityRecognition } = body;
        if (!base64Image || !features) throw new Error("Missing base64Image or features");
        result = await cloudVisionAnnotate(sa, base64Image, features, celebrityRecognition || false);
        break;
      }

      // ═══ Dialogflow ═══
      case "google.dialogflow.detect": {
        const { sessionId, text, languageCode } = body;
        if (!sessionId || !text) throw new Error("Missing sessionId or text");
        result = await dialogflowDetectIntent(sa, sessionId, text, languageCode);
        break;
      }

      // ═══ Cloud Firestore ═══
      case "google.firestore.get": {
        const { collection, documentId } = body;
        if (!collection) throw new Error("Missing collection");
        result = await firestoreGet(sa, collection, documentId);
        break;
      }
      case "google.firestore.set": {
        const { collection, documentId, fields } = body;
        if (!collection || !documentId || !fields) throw new Error("Missing collection, documentId, or fields");
        result = await firestoreSet(sa, collection, documentId, fields);
        break;
      }

      // ═══ Google Analytics ═══
      case "google.analytics.report": {
        const { propertyId, dateRange, metrics, dimensions } = body;
        if (!propertyId || !dateRange || !metrics) throw new Error("Missing propertyId, dateRange, or metrics");
        result = await analyticsRunReport(sa, propertyId, dateRange, metrics, dimensions);
        break;
      }

      // ═══ Cloud Pub/Sub ═══
      case "google.pubsub.publish": {
        const { topic, data, attributes } = body;
        if (!topic || !data) throw new Error("Missing topic or data");
        result = await pubsubPublish(sa, topic, data, attributes);
        break;
      }
      case "google.pubsub.topics": {
        result = await pubsubTopics(sa);
        break;
      }

      // ═══ BigQuery ═══
      case "google.bigquery.query": {
        const { query, maxResults } = body;
        if (!query) throw new Error("Missing query");
        result = await bigqueryQuery(sa, query, maxResults || 100);
        break;
      }
      case "google.bigquery.datasets": {
        result = await bigqueryDatasets(sa);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[firebase-admin]", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
