/**
 * Google Server-Side API Client
 * Routes all Google Workspace calls through firebase-admin Edge Function
 * using the service account — no per-user OAuth needed.
 */
import { supabase } from "@/integrations/supabase/client";

export async function callGoogleServer(
  action: string,
  params: Record<string, unknown> = {}
): Promise<any> {
  const { data, error } = await supabase.functions.invoke("firebase-admin", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Google server call failed");
  if (data?.error) throw new Error(data.error);
  return data?.data ?? data;
}

// ─── Calendar ─────────────────────────────────────────────

export async function googleCalendarList(timeMin: string, timeMax: string, maxResults = 50) {
  return callGoogleServer("google.calendar.list", { timeMin, timeMax, maxResults });
}

export async function googleCalendarCreate(eventData: Record<string, unknown>) {
  return callGoogleServer("google.calendar.create", { eventData });
}

export async function googleCalendarDelete(eventId: string) {
  return callGoogleServer("google.calendar.delete", { eventId });
}

// ─── Gmail ────────────────────────────────────────────────

export async function googleGmailProfile() {
  return callGoogleServer("google.gmail.profile");
}

export async function googleGmailList(maxResults = 15) {
  return callGoogleServer("google.gmail.list", { maxResults });
}

export async function googleGmailGet(messageId: string) {
  return callGoogleServer("google.gmail.get", { messageId });
}

export async function googleGmailSend(to: string, subject: string, bodyText: string) {
  return callGoogleServer("google.gmail.send", { to, subject, bodyText });
}

export async function googleGmailTrash(messageId: string) {
  return callGoogleServer("google.gmail.trash", { messageId });
}

// ─── Contacts ─────────────────────────────────────────────

export async function googleContactsList(pageSize = 200) {
  return callGoogleServer("google.contacts.list", { pageSize });
}

// ─── Drive ────────────────────────────────────────────────

export async function googleDriveList(pageSize = 10) {
  return callGoogleServer("google.drive.list", { pageSize });
}

export async function googleDriveSearch(query: string, pageSize = 10) {
  return callGoogleServer("google.drive.search", { query, pageSize });
}

// ─── Sheets ───────────────────────────────────────────────

export async function googleSheetsCreate(title: string) {
  return callGoogleServer("google.sheets.create", { title });
}

// ─── Docs ─────────────────────────────────────────────────

export async function googleDocsGet(documentId: string) {
  return callGoogleServer("google.docs.get", { documentId });
}

// ─── Tasks ────────────────────────────────────────────────

export async function googleTasksListLists() {
  return callGoogleServer("google.tasks.lists");
}

export async function googleTasksList(taskListId: string) {
  return callGoogleServer("google.tasks.list", { taskListId });
}

export async function googleTasksCreate(taskListId: string, title: string, notes?: string, due?: string) {
  return callGoogleServer("google.tasks.create", { taskListId, title, notes, due });
}

export async function googleTasksComplete(taskListId: string, taskId: string) {
  return callGoogleServer("google.tasks.complete", { taskListId, taskId });
}

export async function googleTasksDelete(taskListId: string, taskId: string) {
  return callGoogleServer("google.tasks.delete", { taskListId, taskId });
}

// ─── Slides ───────────────────────────────────────────────

export async function googleSlidesCreate(title: string) {
  return callGoogleServer("google.slides.create", { title });
}

export async function googleSlidesGet(presentationId: string) {
  return callGoogleServer("google.slides.get", { presentationId });
}

// ─── Forms ────────────────────────────────────────────────

export async function googleFormsCreate(title: string) {
  return callGoogleServer("google.forms.create", { title });
}

export async function googleFormsGet(formId: string) {
  return callGoogleServer("google.forms.get", { formId });
}

export async function googleFormsResponses(formId: string) {
  return callGoogleServer("google.forms.responses", { formId });
}

// ─── Chat ─────────────────────────────────────────────────

export async function googleChatSpaces() {
  return callGoogleServer("google.chat.spaces");
}

export async function googleChatSend(spaceName: string, text: string) {
  return callGoogleServer("google.chat.send", { spaceName, text });
}

export async function googleChatMessages(spaceName: string, pageSize = 25) {
  return callGoogleServer("google.chat.messages", { spaceName, pageSize });
}

// ─── Cloud Vision ─────────────────────────────────────────

export async function cloudVisionAnnotate(base64Image: string, features: string[], celebrityRecognition = false) {
  return callGoogleServer("google.vision.annotate", { base64Image, features, celebrityRecognition });
}

// ─── Dialogflow ───────────────────────────────────────────

export async function dialogflowDetectIntent(sessionId: string, text: string, languageCode = "pt-BR") {
  return callGoogleServer("google.dialogflow.detect", { sessionId, text, languageCode });
}

// ─── Cloud Firestore ──────────────────────────────────────

export async function firestoreGet(collection: string, documentId?: string) {
  return callGoogleServer("google.firestore.get", { collection, documentId });
}

export async function firestoreSet(collection: string, documentId: string, fields: Record<string, unknown>) {
  return callGoogleServer("google.firestore.set", { collection, documentId, fields });
}

// ─── Google Analytics ─────────────────────────────────────

export async function analyticsRunReport(
  propertyId: string,
  dateRange: { startDate: string; endDate: string },
  metrics: string[],
  dimensions?: string[]
) {
  return callGoogleServer("google.analytics.report", { propertyId, dateRange, metrics, dimensions });
}

// ─── Cloud Pub/Sub ────────────────────────────────────────

export async function pubsubPublish(topic: string, data: string, attributes?: Record<string, string>) {
  return callGoogleServer("google.pubsub.publish", { topic, data, attributes });
}

export async function pubsubTopics() {
  return callGoogleServer("google.pubsub.topics");
}

// ─── BigQuery ─────────────────────────────────────────────

export async function bigqueryQuery(query: string, maxResults = 100) {
  return callGoogleServer("google.bigquery.query", { query, maxResults });
}

export async function bigqueryDatasets() {
  return callGoogleServer("google.bigquery.datasets");
}
