export type StorageMode = "blob" | "file" | "unconfigured";

export const STORAGE_SETUP_MESSAGE =
  "In the Vercel project, open Storage, create a Blob store and connect it to this project, then redeploy. Client records are then kept for every signed-in browser.";

type StorageEnv = {
  BLOB_READ_WRITE_TOKEN?: string;
  BLOB_STORE_ID?: string;
  VERCEL?: string;
  VERCEL_OIDC_TOKEN?: string;
};

export function storageModeFromEnv(env: StorageEnv): StorageMode {
  if (env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  // Stores connected from the Vercel dashboard use OIDC. Vercel sets
  // BLOB_STORE_ID on the project and supplies VERCEL_OIDC_TOKEN at runtime.
  if (env.BLOB_STORE_ID?.trim() && (env.VERCEL || env.VERCEL_OIDC_TOKEN?.trim())) return "blob";
  if (env.VERCEL) return "unconfigured";
  return "file";
}
