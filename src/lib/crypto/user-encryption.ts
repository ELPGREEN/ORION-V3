/**
 * AES-256-GCM Client-Side Encryption for Per-User Private Knowledge
 * Keys derived via PBKDF2 from user ID + static salt
 */

const SALT_PREFIX = "elp-neural-kb-v1";
const PBKDF2_ITERATIONS = 100000;

// Derive AES-256 key from user ID
async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const salt = encoder.encode(`${SALT_PREFIX}:${userId}`);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt content → { ciphertext (base64), iv (base64) }
export async function encryptContent(
  userId: string,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt content from base64 ciphertext + iv
export async function decryptContent(
  userId: string,
  ciphertext: string,
  iv: string
): Promise<string> {
  const key = await deriveKey(userId);

  const encryptedBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decrypted);
}
