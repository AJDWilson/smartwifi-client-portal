import { json, requireUser, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return json({ username: user.username });
}
