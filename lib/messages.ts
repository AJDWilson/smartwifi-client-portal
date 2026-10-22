export type StorageMode = "blob" | "file" | "unconfigured";

export const STORAGE_SETUP_MESSAGE =
  "In the Vercel project, open Storage, create a Blob store and connect it to this project, then redeploy. Vercel adds BLOB_READ_WRITE_TOKEN, and client records are then kept for every signed-in browser.";
