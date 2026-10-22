import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, readSession } from "./session";
import { StorageNotConfiguredError } from "./store";

export function json(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function requireUser() {
  const cookieStore = await cookies();
  return readSession(cookieStore.get(COOKIE_NAME)?.value);
}

export function unauthorized() {
  return json({ error: "Sign in required." }, 401);
}

export async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  const advertised = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(advertised) && advertised > 100_000) {
    return { ok: false, response: json({ error: "That request is too large." }, 413) };
  }
  try {
    const text = await request.text();
    if (text.length > 100_000) {
      return { ok: false, response: json({ error: "That request is too large." }, 413) };
    }
    return { ok: true, value: text ? (JSON.parse(text) as unknown) : {} };
  } catch {
    return { ok: false, response: json({ error: "Could not read that request." }, 400) };
  }
}

function describeServerError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const detail = error.message.replace(/^Vercel Blob:\s*/, "").trim();
  const exposed =
    error.name.startsWith("Blob") ||
    error.message.startsWith("Vercel Blob:") ||
    detail.startsWith("Client database");
  if (!exposed || !detail || detail === fallback) return fallback;
  return `${fallback} ${detail}`;
}

export function serverError(error: unknown, fallback: string) {
  if (error instanceof StorageNotConfiguredError) {
    return json({ error: error.message }, 503);
  }
  console.error(error);
  return json({ error: describeServerError(error, fallback) }, 500);
}

export function isClientId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
