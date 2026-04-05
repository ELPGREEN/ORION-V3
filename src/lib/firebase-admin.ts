/**
 * Firebase Admin client — calls the firebase-admin Edge Function
 * for server-side Firebase operations (Storage, FCM, Auth).
 */
import { supabase } from "@/integrations/supabase/client";

async function callFirebaseAdmin<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("firebase-admin", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Firebase admin call failed");
  if (!data?.success) throw new Error(data?.error || "Unknown error");
  return data.data as T;
}

// ─── Storage ──────────────────────────────────────────────

/** Upload a file to Firebase Storage */
export async function firebaseStorageUpload(
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer,
  contentType = "application/octet-stream"
) {
  const buffer = file instanceof Blob ? await file.arrayBuffer() : file;
  const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return callFirebaseAdmin("storage.upload", { bucket, path, base64Data, contentType });
}

/** Delete a file from Firebase Storage */
export async function firebaseStorageDelete(bucket: string, path: string) {
  return callFirebaseAdmin("storage.delete", { bucket, path });
}

/** List files in Firebase Storage */
export async function firebaseStorageList(bucket: string, prefix = "") {
  return callFirebaseAdmin("storage.list", { bucket, prefix });
}

/** Get a signed download URL */
export async function firebaseStorageSignedUrl(bucket: string, path: string, expiresInMinutes = 60) {
  return callFirebaseAdmin<{ url: string; accessToken: string }>("storage.signedUrl", {
    bucket, path, expiresInMinutes,
  });
}

// ─── FCM (Push Notifications) ─────────────────────────────

/** Send push notification to a device */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body?: string,
  data?: Record<string, string>
) {
  return callFirebaseAdmin("fcm.send", { deviceToken, title, body, data });
}

/** Send push notification to a topic */
export async function sendTopicNotification(
  topic: string,
  title: string,
  body?: string,
  data?: Record<string, string>
) {
  return callFirebaseAdmin("fcm.topic", { topic, title, body, data });
}

// ─── Firebase Auth ────────────────────────────────────────

/** Verify a Firebase ID token server-side */
export async function verifyFirebaseToken(firebaseToken: string) {
  return callFirebaseAdmin<{
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }>("auth.verify", { firebaseToken });
}
