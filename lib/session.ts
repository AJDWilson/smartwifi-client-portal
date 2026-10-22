export const COOKIE_NAME = "smartwifi_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

const DEFAULT_USERNAME = "admin";

export function portalUsername(): string {
  const configured = process.env.PORTAL_USERNAME?.trim();
  return configured || DEFAULT_USERNAME;
}

function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured || "smartwifi-portal-session-key-v1";
}

export function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function signSession(
  username: string,
  expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ u: username, exp: expiresAt })),
  );
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function readSession(
  token: string | undefined | null,
): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = await signPayload(payload);
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as { u?: unknown; exp?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    if (parsed.u !== portalUsername()) return null;
    return { username: parsed.u };
  } catch {
    return null;
  }
}
