import { json } from "@/lib/api";
import { COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
