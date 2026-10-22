import assert from "node:assert/strict";
import test from "node:test";
import { storageModeFromEnv } from "./messages";

test("a Vercel deployment with a connected Blob store uses that store", () => {
  assert.equal(storageModeFromEnv({ VERCEL: "1", BLOB_STORE_ID: "store_abc" }), "blob");
});

test("an OIDC token with a store id uses Blob outside Vercel too", () => {
  assert.equal(
    storageModeFromEnv({ BLOB_STORE_ID: "store_abc", VERCEL_OIDC_TOKEN: "token" }),
    "blob",
  );
});

test("a read-write token uses Blob", () => {
  assert.equal(storageModeFromEnv({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" }), "blob");
});

test("Vercel without a store does not pretend records are kept", () => {
  assert.equal(storageModeFromEnv({ VERCEL: "1" }), "unconfigured");
});

test("local development keeps records in a file", () => {
  assert.equal(storageModeFromEnv({}), "file");
  assert.equal(storageModeFromEnv({ BLOB_STORE_ID: "store_abc" }), "file");
});
