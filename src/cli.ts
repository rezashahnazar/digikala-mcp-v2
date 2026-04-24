#!/usr/bin/env node
import "dotenv/config";
import { createDigikalaMcpServer } from "./mcp/create-server.js";
import { runStdioTransport } from "./transports/stdio.js";
import { startStreamableHttpServer } from "./transports/streamable-http.js";

function envString(name: string, defaultValue: string): string {
  const v = process.env[name];
  return v != null && v !== "" ? v : defaultValue;
}

function envPort(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : defaultValue;
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "stdio";

  if (mode === "stdio") {
    const mcp = createDigikalaMcpServer();
    await runStdioTransport(mcp);
    return;
  }

  if (mode === "http") {
    const host = envString("DIGIKALA_MCP_HTTP_HOST", "127.0.0.1");
    const port = envPort("DIGIKALA_MCP_HTTP_PORT", 33445);
    const path = envString("DIGIKALA_MCP_HTTP_PATH", "/mcp");
    const bearerToken = process.env.DIGIKALA_MCP_HTTP_BEARER_TOKEN?.trim() || undefined;

    const { address: addr } = await startStreamableHttpServer({
      host,
      port,
      path,
      bearerToken,
    });
    console.error(
      `[digikala-mcp] Streamable HTTP listening on http://${addr.address}:${addr.port}${path} (bind ${host}:${port})`
    );
    if (bearerToken) {
      console.error("[digikala-mcp] Bearer token authentication is enabled.");
    } else {
      console.error("[digikala-mcp] No DIGIKALA_MCP_HTTP_BEARER_TOKEN — local development only.");
    }
    return;
  }

  console.error(`Usage: digikala-mcp [stdio|http] (default: stdio)`);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
