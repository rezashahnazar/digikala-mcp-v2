/**
 * HTTP bearer auth for Streamable HTTP transport. Used by tests and the guard middleware.
 */
export function tokenMatchesAuthorizationHeader(authorization: string | undefined, expected: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  return token === expected;
}

/** If no expected token is configured, all requests are allowed. */
export function isBearerRequestAllowed(authorization: string | undefined, expectedToken: string | undefined): boolean {
  if (expectedToken == null || expectedToken === "") return true;
  return tokenMatchesAuthorizationHeader(authorization, expectedToken);
}
