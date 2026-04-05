import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-google-token, x-google-service, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const PEOPLE_API = "https://people.googleapis.com/v1";
const DOCS_API = "https://docs.googleapis.com/v1";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function googleHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function assertOk(res: Response, context: string) {
  if (!res.ok) {
    const body = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    const msg = parsed?.error?.message || parsed?.error || body;
    throw new Error(`${context}: ${msg}`);
  }
  return res;
}

// ═══════════════════════════════════════
// GMAIL
// ═══════════════════════════════════════
async function handleGmail(body: any, googleToken: string) {
  const { action, messageId, query, maxResults = 15, labelIds, to, subject, bodyText } = body;
  let url: string;
  let method = "GET";
  let requestBody: string | undefined;

  switch (action) {
    case "list_messages": {
      const params = new URLSearchParams({ maxResults: String(maxResults) });
      if (query) params.set("q", query);
      if (labelIds?.length) labelIds.forEach((l: string) => params.append("labelIds", l));
      url = `${GMAIL_API}/users/me/messages?${params}`;
      break;
    }
    case "get_message":
      if (!messageId) throw new Error("messageId is required");
      url = `${GMAIL_API}/users/me/messages/${messageId}?format=full`;
      break;
    case "get_profile":
      url = `${GMAIL_API}/users/me/profile`;
      break;
    case "list_labels":
      url = `${GMAIL_API}/users/me/labels`;
      break;
    case "send_email": {
      if (!to || !subject) throw new Error("to and subject are required");
      url = `${GMAIL_API}/users/me/messages/send`;
      method = "POST";
      const email = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: text/plain; charset=utf-8`, "", bodyText || ""].join("\r\n");
      const encoder = new TextEncoder();
      const bytes = encoder.encode(email);
      const base64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      requestBody = JSON.stringify({ raw: base64 });
      break;
    }
    case "trash_message":
      if (!messageId) throw new Error("messageId is required");
      url = `${GMAIL_API}/users/me/messages/${messageId}/trash`;
      method = "POST";
      break;
    default:
      throw new Error(`Unknown gmail action: ${action}`);
  }

  const response = await fetch(url, { method, headers: googleHeaders(googleToken), body: requestBody });
  if (!response.ok) {
    const errorText = await response.text();
    return json({ error: `Gmail API error [${response.status}]`, details: errorText }, response.status);
  }
  return json(await response.json());
}

// ═══════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════
async function handleCalendar(body: any, googleToken: string) {
  const { action, calendarId = "primary", eventData, eventId, timeMin, timeMax, maxResults = 20 } = body;
  let url: string;
  let method = "GET";
  let requestBody: string | undefined;

  switch (action) {
    case "list_calendars":
      url = `${CALENDAR_API}/users/me/calendarList`;
      break;
    case "list_events": {
      const params = new URLSearchParams({ maxResults: String(maxResults), singleEvents: "true", orderBy: "startTime" });
      if (timeMin) params.set("timeMin", timeMin);
      if (timeMax) params.set("timeMax", timeMax);
      url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
      break;
    }
    case "create_event":
      url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;
      method = "POST";
      requestBody = JSON.stringify(eventData);
      break;
    case "update_event":
      if (!eventId) throw new Error("eventId is required for update");
      url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
      method = "PUT";
      requestBody = JSON.stringify(eventData);
      break;
    case "delete_event":
      if (!eventId) throw new Error("eventId is required for delete");
      url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
      method = "DELETE";
      break;
    default:
      throw new Error(`Unknown calendar action: ${action}`);
  }

  const response = await fetch(url, { method, headers: googleHeaders(googleToken), body: requestBody });
  if (method === "DELETE" && response.status === 204) return json({ success: true });
  if (!response.ok) {
    const errorText = await response.text();
    return json({ error: `Calendar API error [${response.status}]`, details: errorText }, response.status);
  }
  return json(await response.json());
}

// ═══════════════════════════════════════
// CONTACTS (People API)
// ═══════════════════════════════════════
async function handleContacts(body: any, googleToken: string) {
  const { action, pageToken, pageSize = 100 } = body;
  if (action === "list") {
    const params = new URLSearchParams({
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      pageSize: String(pageSize), sortOrder: "FIRST_NAME_ASCENDING",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`${PEOPLE_API}/people/me/connections?${params}`, {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `People API error: ${response.status}`);
    }
    const data = await response.json();
    const contacts = (data.connections || []).map((person: any) => ({
      name: person.names?.[0]?.displayName || "",
      email: person.emailAddresses?.[0]?.value || "",
      phone: person.phoneNumbers?.[0]?.value || "",
      company: person.organizations?.[0]?.name || "",
    })).filter((c: any) => c.email);
    return json({ contacts, nextPageToken: data.nextPageToken || null, totalPeople: data.totalPeople || contacts.length });
  }
  throw new Error(`Unknown contacts action: ${action}`);
}

// ═══════════════════════════════════════
// DOCS
// ═══════════════════════════════════════
async function handleDocs(body: any, googleToken: string) {
  const { action, documentId, title, content, requests: batchRequests, query, pageToken, pageSize, fileId, role, email: shareEmail } = body;
  const headers = googleHeaders(googleToken);
  let result: unknown;

  switch (action) {
    case "create": {
      const res = await fetch(`${DOCS_API}/documents`, { method: "POST", headers, body: JSON.stringify({ title: title || "Novo Documento" }) });
      await assertOk(res, "create");
      result = await res.json();
      break;
    }
    case "get": {
      if (!documentId) throw new Error("documentId is required");
      const res = await fetch(`${DOCS_API}/documents/${documentId}`, { headers });
      await assertOk(res, "get");
      result = await res.json();
      break;
    }
    case "batch_update": {
      if (!documentId || !batchRequests?.length) throw new Error("documentId and requests required");
      const res = await fetch(`${DOCS_API}/documents/${documentId}:batchUpdate`, { method: "POST", headers, body: JSON.stringify({ requests: batchRequests }) });
      await assertOk(res, "batch_update");
      result = await res.json();
      break;
    }
    case "insert_text": {
      if (!documentId || !content) throw new Error("documentId and content required");
      const res = await fetch(`${DOCS_API}/documents/${documentId}:batchUpdate`, { method: "POST", headers, body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] }) });
      await assertOk(res, "insert_text");
      result = await res.json();
      break;
    }
    case "export_pdf":
    case "export_docx": {
      if (!documentId) throw new Error("documentId is required");
      const exportMime = action === "export_pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const ext = action === "export_pdf" ? "pdf" : "docx";
      const res = await fetch(`${DRIVE_API}/files/${documentId}/export?mimeType=${encodeURIComponent(exportMime)}`, { headers: { Authorization: `Bearer ${googleToken}` } });
      await assertOk(res, action);
      const buffer = await res.arrayBuffer();
      return new Response(buffer, { headers: { ...corsHeaders, "Content-Type": exportMime, "Content-Disposition": `attachment; filename="document.${ext}"` } });
    }
    case "drive_list": {
      const q = query || "mimeType='application/vnd.google-apps.document'";
      const params = new URLSearchParams({ q, fields: "nextPageToken,files(id,name,mimeType,modifiedTime,iconLink,webViewLink,owners,shared)", pageSize: String(pageSize || 20), orderBy: "modifiedTime desc" });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`${DRIVE_API}/files?${params}`, { headers });
      await assertOk(res, "drive_list");
      result = await res.json();
      break;
    }
    case "drive_get": {
      const id = fileId || documentId;
      if (!id) throw new Error("fileId or documentId required");
      const res = await fetch(`${DRIVE_API}/files/${id}?fields=id,name,mimeType,modifiedTime,webViewLink,owners,shared,permissions`, { headers });
      await assertOk(res, "drive_get");
      result = await res.json();
      break;
    }
    case "drive_share": {
      const id = fileId || documentId;
      if (!id || !shareEmail) throw new Error("fileId/documentId and email required");
      const res = await fetch(`${DRIVE_API}/files/${id}/permissions`, { method: "POST", headers, body: JSON.stringify({ type: "user", role: role || "writer", emailAddress: shareEmail }) });
      await assertOk(res, "drive_share");
      result = await res.json();
      break;
    }
    case "drive_copy": {
      const id = fileId || documentId;
      if (!id) throw new Error("fileId or documentId required");
      const res = await fetch(`${DRIVE_API}/files/${id}/copy`, { method: "POST", headers, body: JSON.stringify({ name: title || "Cópia" }) });
      await assertOk(res, "drive_copy");
      result = await res.json();
      break;
    }
    case "upload_html": {
      if (!content) throw new Error("content is required");
      const metadata = JSON.stringify({ name: title || "Documento", mimeType: "application/vnd.google-apps.document" });
      const boundary = "boundary_" + Date.now();
      const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`, {
        method: "POST", headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipartBody,
      });
      await assertOk(res, "upload_html");
      result = await res.json();
      break;
    }
    case "download_html": {
      const id = documentId || fileId;
      if (!id) throw new Error("documentId or fileId required");
      const res = await fetch(`${DRIVE_API}/files/${id}/export?mimeType=text/html`, { headers: { Authorization: `Bearer ${googleToken}` } });
      await assertOk(res, "download_html");
      const html = await res.text();
      result = { html, documentId: id };
      break;
    }
    case "list_revisions": {
      const id = documentId || fileId;
      if (!id) throw new Error("documentId or fileId required");
      const params = new URLSearchParams({ fields: "revisions(id,modifiedTime,lastModifyingUser,size)", pageSize: String(pageSize || 50) });
      const res = await fetch(`${DRIVE_API}/files/${id}/revisions?${params}`, { headers });
      await assertOk(res, "list_revisions");
      result = await res.json();
      break;
    }
    case "get_revision": {
      const id = documentId || fileId;
      if (!id || !body.revisionId) throw new Error("documentId/fileId and revisionId required");
      const res = await fetch(`${DRIVE_API}/files/${id}/revisions/${body.revisionId}?fields=id,modifiedTime,lastModifyingUser,size,exportLinks`, { headers });
      await assertOk(res, "get_revision");
      result = await res.json();
      break;
    }
    case "export_revision_html": {
      const id = documentId || fileId;
      if (!id || !body.revisionId) throw new Error("documentId/fileId and revisionId required");
      const res = await fetch(`${DRIVE_API}/files/${id}/export?mimeType=text/html&revision=${body.revisionId}`, { headers: { Authorization: `Bearer ${googleToken}` } });
      await assertOk(res, "export_revision_html");
      const html = await res.text();
      result = { html, revisionId: body.revisionId };
      break;
    }
    case "check_modified": {
      const id = documentId || fileId;
      if (!id) throw new Error("documentId or fileId required");
      const res = await fetch(`${DRIVE_API}/files/${id}?fields=id,name,modifiedTime,version`, { headers });
      await assertOk(res, "check_modified");
      result = await res.json();
      break;
    }
    default:
      throw new Error(`Unknown docs action: ${action}`);
  }
  return json(result);
}

// ═══════════════════════════════════════
// DRIVE
// ═══════════════════════════════════════
async function handleDrive(body: any, googleToken: string) {
  const { action, fileId, folderId, query, mimeType, fileName, permissions, pageSize = 20, pageToken } = body;
  const headers = googleHeaders(googleToken);
  let result: unknown;

  switch (action) {
    case "list": {
      const params = new URLSearchParams({ pageSize: String(pageSize), fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents, shared)", orderBy: "modifiedTime desc" });
      if (query) params.set("q", query);
      if (folderId) params.set("q", `'${folderId}' in parents`);
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`${DRIVE_API}/files?${params}`, { headers });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "get": {
      if (!fileId) throw new Error("fileId is required");
      const params = new URLSearchParams({ fields: "id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents, shared, description" });
      const res = await fetch(`${DRIVE_API}/files/${fileId}?${params}`, { headers });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "create_folder": {
      const res = await fetch(`${DRIVE_API}/files`, { method: "POST", headers, body: JSON.stringify({ name: fileName || "Nova Pasta", mimeType: "application/vnd.google-apps.folder", parents: folderId ? [folderId] : undefined }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "delete": {
      if (!fileId) throw new Error("fileId is required");
      const res = await fetch(`${DRIVE_API}/files/${fileId}`, { method: "DELETE", headers: { Authorization: `Bearer ${googleToken}` } });
      if (!res.ok) throw new Error(await res.text());
      result = { success: true };
      break;
    }
    case "share": {
      if (!fileId || !permissions) throw new Error("fileId and permissions required");
      const res = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, { method: "POST", headers, body: JSON.stringify(permissions) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "download": {
      if (!fileId) throw new Error("fileId is required");
      const exportMime = mimeType || "application/pdf";
      const isGoogleFile = body.isGoogleFile !== false;
      let res: Response;
      if (isGoogleFile) {
        res = await fetch(`${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`, { headers: { Authorization: `Bearer ${googleToken}` } });
      } else {
        res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${googleToken}` } });
      }
      if (!res.ok) throw new Error(await res.text());
      const buffer = await res.arrayBuffer();
      return new Response(buffer, { headers: { ...corsHeaders, "Content-Type": exportMime, "Content-Disposition": `attachment; filename="download"` } });
    }
    case "search": {
      if (!query) throw new Error("query is required");
      const params = new URLSearchParams({ q: `fullText contains '${query.replace(/'/g, "\\'")}'`, pageSize: String(pageSize), fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink)", orderBy: "modifiedTime desc" });
      const res = await fetch(`${DRIVE_API}/files?${params}`, { headers });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    default:
      throw new Error(`Unknown drive action: ${action}`);
  }
  return json(result);
}

// ═══════════════════════════════════════
// SHEETS
// ═══════════════════════════════════════
async function handleSheets(body: any, googleToken: string) {
  const { action, spreadsheetId, title, range, values, sheetId } = body;
  const headers = googleHeaders(googleToken);
  let result: unknown;

  switch (action) {
    case "create": {
      const res = await fetch(`${SHEETS_API}/spreadsheets`, { method: "POST", headers, body: JSON.stringify({ properties: { title: title || "Nova Planilha" } }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "get": {
      if (!spreadsheetId) throw new Error("spreadsheetId is required");
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}`, { headers });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "read": {
      if (!spreadsheetId || !range) throw new Error("spreadsheetId and range required");
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, { headers });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "write": {
      if (!spreadsheetId || !range || !values) throw new Error("spreadsheetId, range, and values required");
      const params = new URLSearchParams({ valueInputOption: "USER_ENTERED" });
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`, { method: "PUT", headers, body: JSON.stringify({ range, majorDimension: "ROWS", values }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "append": {
      if (!spreadsheetId || !range || !values) throw new Error("spreadsheetId, range, and values required");
      const params = new URLSearchParams({ valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS" });
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?${params}`, { method: "POST", headers, body: JSON.stringify({ range, majorDimension: "ROWS", values }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "add_sheet": {
      if (!spreadsheetId) throw new Error("spreadsheetId is required");
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}:batchUpdate`, { method: "POST", headers, body: JSON.stringify({ requests: [{ addSheet: { properties: { title: title || "Nova Aba" } } }] }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    case "delete_sheet": {
      if (!spreadsheetId || sheetId === undefined) throw new Error("spreadsheetId and sheetId required");
      const res = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}:batchUpdate`, { method: "POST", headers, body: JSON.stringify({ requests: [{ deleteSheet: { sheetId } }] }) });
      result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      break;
    }
    default:
      throw new Error(`Unknown sheets action: ${action}`);
  }
  return json(result);
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Autenticação obrigatória." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Não autorizado." }, 401);

    // Google token
    const googleToken = req.headers.get("x-google-token");
    if (!googleToken) return json({ error: "Google provider token is required. Please login with Google." }, 401);

    const body = await req.json();
    // Service can come from body.service or x-google-service header
    const service = body.service || req.headers.get("x-google-service") || "docs";

    switch (service) {
      case "gmail": return await handleGmail(body, googleToken);
      case "calendar": return await handleCalendar(body, googleToken);
      case "contacts": return await handleContacts(body, googleToken);
      case "docs": return await handleDocs(body, googleToken);
      case "drive": return await handleDrive(body, googleToken);
      case "sheets": return await handleSheets(body, googleToken);
      default:
        return json({ error: `Unknown service: ${service}. Valid: gmail, calendar, contacts, docs, drive, sheets` }, 400);
    }
  } catch (error: any) {
    console.error("[google-workspace] Error:", error);
    const errorMessage = error.message || "Internal error";
    const isScopeError = errorMessage.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("insufficient authentication scopes");
    return json({ error: errorMessage }, isScopeError ? 403 : 500);
  }
});
