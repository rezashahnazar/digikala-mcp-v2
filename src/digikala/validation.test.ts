import test from "node:test";
import assert from "node:assert/strict";
import { validateKeyword, validateCategoryId } from "./validation.js";

test("validateKeyword rejects empty", () => {
  const r = validateKeyword("  ");
  assert.equal(r.isValid, false);
});

test("validateCategoryId rejects zero", () => {
  const r = validateCategoryId(0);
  assert.equal(r.isValid, false);
});
