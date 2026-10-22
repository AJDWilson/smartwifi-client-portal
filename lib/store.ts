import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { isClientRecord, type ClientInput, type ClientRecord } from "./clients";
import { STORAGE_SETUP_MESSAGE, type StorageMode } from "./messages";

const BLOB_PATH = "portal/clients.json";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(STORAGE_SETUP_MESSAGE);
    this.name = "StorageNotConfiguredError";
  }
}

export function getStorageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  if (process.env.VERCEL) return "unconfigured";
  return "file";
}

const dataDirectory = path.join(process.cwd(), "data");
const clientFileName = "clients.json";

type Snapshot = { clients: ClientRecord[]; etag?: string };

function parseDatabase(raw: string): ClientRecord[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Client database is not valid JSON.");
  }
  if (!data || typeof data !== "object" || !("clients" in data) || !Array.isArray(data.clients)) {
    throw new Error("Client database is not in the expected format.");
  }
  return data.clients.filter(isClientRecord);
}

function isMissingFile(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "ENOENT",
  );
}

async function readFileStore(): Promise<Snapshot> {
  try {
    const raw = await readFile(path.join(dataDirectory, clientFileName), "utf8");
    return { clients: parseDatabase(raw) };
  } catch (error) {
    if (isMissingFile(error)) return { clients: [] };
    throw error;
  }
}

async function writeFileStore(clients: ClientRecord[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, clientFileName), `${JSON.stringify({ clients }, null, 2)}\n`, "utf8");
}

async function readBlobStore(): Promise<Snapshot> {
  try {
    const result = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return { clients: [] };
    const raw = await new Response(result.stream).text();
    return { clients: parseDatabase(raw), etag: result.blob.etag };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { clients: [] };
    throw error;
  }
}

async function writeBlobStore(clients: ClientRecord[], etag?: string): Promise<void> {
  await put(BLOB_PATH, JSON.stringify({ clients }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

async function readSnapshot(): Promise<Snapshot> {
  const mode = getStorageMode();
  if (mode === "unconfigured") return { clients: [] };
  if (mode === "file") return readFileStore();
  return readBlobStore();
}

async function writeSnapshot(clients: ClientRecord[], etag?: string): Promise<void> {
  const mode = getStorageMode();
  if (mode === "unconfigured") throw new StorageNotConfiguredError();
  if (mode === "file") {
    await writeFileStore(clients);
    return;
  }
  await writeBlobStore(clients, etag);
}

let queue: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function mutate<T>(
  change: (clients: ClientRecord[]) => { clients: ClientRecord[]; result: T; write: boolean },
): Promise<T> {
  if (getStorageMode() === "unconfigured") throw new StorageNotConfiguredError();

  return exclusive(async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const snapshot = await readSnapshot();
      const next = change(snapshot.clients);
      if (!next.write) return next.result;
      try {
        await writeSnapshot(next.clients, snapshot.etag);
        return next.result;
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError && attempt < 3) continue;
        throw error;
      }
    }
    throw new Error("Could not save the client database.");
  });
}

export async function listClients(): Promise<ClientRecord[]> {
  if (getStorageMode() === "unconfigured") return [];
  const snapshot = await readSnapshot();
  return snapshot.clients;
}

export function createClient(input: ClientInput): Promise<ClientRecord> {
  const now = new Date().toISOString();
  const record: ClientRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  return mutate((clients) => ({
    clients: [record, ...clients],
    result: record,
    write: true,
  }));
}

export function updateClient(id: string, input: ClientInput): Promise<ClientRecord | null> {
  return mutate((clients) => {
    const index = clients.findIndex((client) => client.id === id);
    if (index === -1) return { clients, result: null, write: false };
    const updated: ClientRecord = {
      ...input,
      id,
      createdAt: clients[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    const next = clients.slice();
    next[index] = updated;
    return { clients: next, result: updated, write: true };
  });
}

export function deleteClient(id: string): Promise<boolean> {
  return mutate((clients) => {
    const next = clients.filter((client) => client.id !== id);
    if (next.length === clients.length) return { clients, result: false, write: false };
    return { clients: next, result: true, write: true };
  });
}
