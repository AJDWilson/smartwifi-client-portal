import { parseClientInput } from "@/lib/clients";
import { isClientId, json, readJson, requireUser, serverError, unauthorized } from "@/lib/api";
import { deleteClient, updateClient } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  if (!isClientId(id)) return json({ error: "That client could not be found." }, 404);

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = parseClientInput(body.value);
  if (!parsed.ok) return json({ error: parsed.error, fields: parsed.fields }, 400);

  try {
    const client = await updateClient(id, parsed.value);
    if (!client) return json({ error: "That client could not be found." }, 404);
    return json({ client });
  } catch (error) {
    return serverError(error, "Those changes could not be saved.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  if (!isClientId(id)) return json({ error: "That client could not be found." }, 404);

  try {
    const removed = await deleteClient(id);
    if (!removed) return json({ error: "That client could not be found." }, 404);
    return json({ ok: true });
  } catch (error) {
    return serverError(error, "That client could not be removed.");
  }
}
