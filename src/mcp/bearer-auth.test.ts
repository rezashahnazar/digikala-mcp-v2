import test from "node:test";
import assert from "node:assert/strict";
import { isBearerRequestAllowed, tokenMatchesAuthorizationHeader } from "./bearer-auth.js";

test("tokenMatchesAuthorizationHeader accepts valid Bearer token", () => {
  assert.equal(
    tokenMatchesAuthorizationHeader("Bearer my-secret", "my-secret"),
    true
  );
});

test("tokenMatchesAuthorizationHeader rejects wrong token or format", () => {
  assert.equal(tokenMatchesAuthorizationHeader("Bearer wrong", "my-secret"), false);
  assert.equal(tokenMatchesAuthorizationHeader(undefined, "my-secret"), false);
  assert.equal(tokenMatchesAuthorizationHeader("Basic x", "my-secret"), false);
});

test("isBearerRequestAllowed allows all requests when no token configured", () => {
  assert.equal(isBearerRequestAllowed(undefined, undefined), true);
  assert.equal(isBearerRequestAllowed(undefined, ""), true);
  assert.equal(isBearerRequestAllowed("Bearer x", undefined), true);
});

test("isBearerRequestAllowed requires valid Bearer when token is set", () => {
  assert.equal(isBearerRequestAllowed(undefined, "tok"), false);
  assert.equal(isBearerRequestAllowed("Bearer tok", "tok"), true);
});
