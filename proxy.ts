import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, readSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await readSession(token);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/clients")) {
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/" && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/portal/:path*", "/api/clients", "/api/clients/:path*"],
};
