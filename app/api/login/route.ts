import { NextResponse } from "next/server";
import { json, readJson } from "@/lib/api";
import { credentialsMatch } from "@/lib/credentials";
import { COOKIE_NAME, SESSION_MAX_AGE_SECONDS, portalUsername, signSession } from "@/lib/session";

const REJECTED = "That username or password is not recognised.";

function sessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const formPost =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let username = "";
  let password = "";
  if (formPost) {
    const form = await request.formData();
    username = String(form.get("username") ?? "");
    password = String(form.get("password") ?? "");
  } else {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const source = body.value && typeof body.value === "object" ? (body.value as Record<string, unknown>) : {};
    username = typeof source.username === "string" ? source.username : "";
    password = typeof source.password === "string" ? source.password : "";
  }

  if (!credentialsMatch(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (formPost) {
      return NextResponse.redirect(new URL("/?error=credentials", request.url), 303);
    }
    return json({ error: REJECTED }, 401);
  }

  const usernameForSession = portalUsername();
  const token = await signSession(usernameForSession);
  const response = formPost
    ? NextResponse.redirect(new URL("/portal", request.url), 303)
    : json({ ok: true, username: usernameForSession });
  return sessionCookie(response, token);
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
