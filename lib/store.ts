import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, head, put } from "@vercel/blob";
import { isClientRecord, type ClientInput, type ClientRecord } from "./clients";
import { STORAGE_SETUP_MESSAGE, storageModeFromEnv, type StorageMode } from "./messages";

const BLOB_PATH = "portal/clients.json";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(STORAGE_SETUP_MESSAGE);
    this.name = "StorageNotConfiguredError";
  }
}

export function getStorageMode(): StorageMode {
  return storageModeFromEnv({
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    VERCEL: process.env.VERCEL,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
  });
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

function isNotFound(error: unknown): boolean {
  return (
    error instanceof BlobNotFoundError ||
    (error instanceof Error && /not found/i.test(error.message))
  );
}

// get() reports the CDN's ETag. ifMatch has to use the storage ETag from head(),
// otherwise the write is rejected once the file is cached.
async function readStorageEtag(): Promise<string | undefined> {
  try {
    const metadata = await head(BLOB_PATH);
    const etag = metadata.etag?.trim().replace(/^W\//i, "");
    return etag || undefined;
  } catch (error) {
    if (isNotFound(error)) return undefined;
    console.error(error);
    return undefined;
  }
}

async function readBlobStore(): Promise<Snapshot> {
  try {
    const [etag, result] = await Promise.all([
      readStorageEtag(),
      get(BLOB_PATH, { access: "private", useCache: false }),
    ]);
    if (!result || result.statusCode !== 200 || !result.stream) {
      if (etag) throw new Error("Client database could not be read.");
      return { clients: [] };
    }
    const raw = await new Response(result.stream).text();
    return { clients: parseDatabase(raw), etag };
  } catch (error) {
    if (isNotFound(error)) return { clients: [] };
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
    let usedCondition = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const snapshot = await readSnapshot();
        const next = change(snapshot.clients);
        if (!next.write) return next.result;
        // A cached ETag does not match the blob store, so the version check
        // fails after the first clients are saved. The second attempt writes
        // the record anyway.
        const etag = attempt === 0 ? snapshot.etag : undefined;
        usedCondition = Boolean(etag);
        await writeSnapshot(next.clients, etag);
        return next.result;
      } catch (error) {
        if (error instanceof StorageNotConfiguredError) throw error;
        if (attempt === 1 || !usedCondition) throw error;
      }
    }
    throw new Error("Client database could not be saved.");
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
