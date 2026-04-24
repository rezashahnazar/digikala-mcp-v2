import { get } from "node:http";
import { createServer } from "node:net";
import { test } from "node:test";
import assert from "node:assert/strict";
import { startStreamableHttpServer } from "./streamable-http.js";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      s.close((err) => {
        if (err) reject(err);
        else if (a && typeof a === "object") resolve(a.port);
        else reject(new Error("no port"));
      });
    });
    s.on("error", reject);
  });
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (res) => {
      res.resume();
      resolve({ status: res.statusCode ?? 0 });
    }).on("error", reject);
  });
}

test("Streamable HTTP guard returns 401 without Bearer when token is required", async () => {
  const port = await getFreePort();
  const path = "/mcp";
  const { address, close } = await startStreamableHttpServer({
    host: "127.0.0.1",
    port,
    path,
    bearerToken: "test-secret-token",
  });
  try {
    const p = typeof address.port === "number" ? address.port : port;
    const base = `http://127.0.0.1:${p}${path}`;
    const noAuth = await httpGet(base);
    assert.equal(noAuth.status, 401);

    const bad = await httpGet(base, { Authorization: "Bearer wrong" });
    assert.equal(bad.status, 401);

    const ok = await httpGet(base, { Authorization: "Bearer test-secret-token" });
    assert.notEqual(ok.status, 401);
  } finally {
    await close();
  }
});
