import { parseClientInput } from "@/lib/clients";
import { json, readJson, requireUser, serverError, unauthorized } from "@/lib/api";
import { createClient, getStorageMode, listClients } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const clients = await listClients();
    return json({ clients, storage: getStorageMode() });
  } catch (error) {
    return serverError(error, "The client list could not be loaded.");
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = parseClientInput(body.value);
  if (!parsed.ok) return json({ error: parsed.error, fields: parsed.fields }, 400);

  try {
    const client = await createClient(parsed.value);
    return json({ client }, 201);
  } catch (error) {
    return serverError(error, "That client could not be saved.");
  }
}
