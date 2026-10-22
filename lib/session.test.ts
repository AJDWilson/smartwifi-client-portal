import assert from "node:assert/strict";
import test from "node:test";
import { credentialsMatch } from "./credentials";
import { readSession, signSession } from "./session";

test("the portal accepts the SmartWifi admin login", () => {
  assert.equal(credentialsMatch("admin", "Pa55w0rd12#"), true);
  assert.equal(credentialsMatch(" admin ", "Pa55w0rd12#"), true);
});

test("a wrong username or password is rejected", () => {
  assert.equal(credentialsMatch("Admin", "Pa55w0rd12#"), false);
  assert.equal(credentialsMatch("admin", "password"), false);
  assert.equal(credentialsMatch("admin", "Pa55w0rd12"), false);
});

test("a signed session can be read back", async () => {
  const token = await signSession("admin");
  const session = await readSession(token);
  assert.deepEqual(session, { username: "admin" });
});

test("a tampered or expired session is rejected", async () => {
  const token = await signSession("admin");
  const [payload, signature] = token.split(".");
  assert.equal(await readSession(`${payload}.${signature}x`), null);
  assert.equal(await readSession("not-a-session"), null);
  const expired = await signSession("admin", Date.now() - 1000);
  assert.equal(await readSession(expired), null);
});
