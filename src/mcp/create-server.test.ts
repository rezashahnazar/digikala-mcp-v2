import test from "node:test";
import assert from "node:assert/strict";
import { createDigikalaMcpServer, TOOL_NAMES } from "./create-server.js";

test("createDigikalaMcpServer returns McpServer with expected tool names exported", () => {
  const s = createDigikalaMcpServer();
  assert.ok(s);
  assert.equal(TOOL_NAMES.length, 6);
  assert.ok(TOOL_NAMES.includes("get_search_suggestions"));
});
