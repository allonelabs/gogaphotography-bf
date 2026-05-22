/**
 * PBKDF2-SHA256 password hashing for client gallery deliveries.
 * Format: `pbkdf2:<base64-salt>:<base64-hash>` (100k iterations, 16-byte salt).
 *
 * Lighter than full user auth — the URL token is the primary access factor;
 * the password is a second wall for couples sharing the URL on a household
 * network.
 */

const enc = new TextEncoder();

function b64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2:${b64(salt.buffer)}:${b64(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = fromB64(parts[1]!);
  const expected = fromB64(parts[2]!);
  const computed = new Uint8Array(await pbkdf2(password, salt));
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed[i]! ^ expected[i]!;
  return diff === 0;
}
