export const RIAL_TO_TOOMAN = 10;

export const toomanToRial = (t: number) => t * RIAL_TO_TOOMAN;

/** Extracts plain URL from markdown link format [text](url). Returns input unchanged if not markdown. */
export function extractPlainUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  const match = url.match(/^\[.*?\]\(([^)]+)\)$/);
  return match ? match[1] : url;
}

/** Ensures a Digikala URL ends with a trailing slash (before any query or hash). */
export function ensureDigikalaUrlTrailingSlash(url: string): string {
  if (!url) return url;
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const endOfPath = hashIdx >= 0 ? hashIdx : queryIdx >= 0 ? queryIdx : url.length;
  const path = url.slice(0, endOfPath);
  const rest = url.slice(endOfPath);
  const pathWithSlash = path.endsWith("/") ? path : path + "/";
  return pathWithSlash + rest;
}
export const rialToTooman = (r: number) => Math.floor(r / RIAL_TO_TOOMAN);

export function toSafeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (Number.isInteger(value)) return value;
  return Math.floor(value);
}
