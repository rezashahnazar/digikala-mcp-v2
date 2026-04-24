import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { AddressInfo } from "node:net";
import type { Request, Response, NextFunction } from "express";
import { createDigikalaMcpServer } from "../mcp/create-server.js";
import { isBearerRequestAllowed } from "../mcp/bearer-auth.js";

const SESSION_HEADER = "mcp-session-id";

export interface StreamableHttpConfig {
  host: string;
  port: number;
  path: string;
  bearerToken?: string;
}

function getSessionId(req: Request): string | undefined {
  const h = req.headers[SESSION_HEADER];
  if (Array.isArray(h)) return h[0];
  return typeof h === "string" ? h : undefined;
}

export type StreamableHttpServerHandle = {
  address: AddressInfo;
  close: () => Promise<void>;
};

export function startStreamableHttpServer(config: StreamableHttpConfig): Promise<StreamableHttpServerHandle> {
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const app = createMcpExpressApp({ host: config.host });
  const mcpPath = config.path.startsWith("/") ? config.path : `/${config.path}`;

  const guard = (req: Request, res: Response, next: NextFunction) => {
    if (
      !isBearerRequestAllowed(req.header("authorization") ?? undefined, config.bearerToken)
    ) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  };

  const postHandler = async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    let transport: StreamableHTTPServerTransport | undefined;
    try {
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport!;
          },
        });
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports[sid]) delete transports[sid];
        };
        const mcp = createDigikalaMcpServer();
        await mcp.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32_000, message: "Bad Request: no valid Mcp-Session-Id" },
          id: null,
        });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error("MCP HTTP error", e);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32_603, message: e instanceof Error ? e.message : "Internal error" },
          id: null,
        });
      }
    }
  };

  const getHandler = async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing Mcp-Session-Id");
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  const deleteHandler = async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({ error: "unknown session" });
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.post(mcpPath, guard, postHandler);
  app.get(mcpPath, guard, getHandler);
  app.delete(mcpPath, guard, deleteHandler);

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve({
          address: addr,
          close: () =>
            new Promise((res, rej) => {
              server.close((err) => (err ? rej(err) : res()));
            }),
        });
      } else reject(new Error("Could not read server address"));
    });
    server.on("error", reject);
  });
}
