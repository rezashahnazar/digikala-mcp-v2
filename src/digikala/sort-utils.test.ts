import test from "node:test";
import assert from "node:assert/strict";
import { getApiSortId, getSortName } from "./sort-utils.js";

test("getApiSortId maps UI sort to API id", () => {
  assert.equal(getApiSortId(2), 20);
  assert.equal(getApiSortId(1), 22);
});

test("getSortName returns label", () => {
  assert.equal(getSortName(1), "Relevance");
});
