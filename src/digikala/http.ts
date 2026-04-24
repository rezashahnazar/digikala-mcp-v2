const HTTP_TIMEOUT = 60_000;

interface AbortControllerWithTimer extends AbortController {
  __timer: ReturnType<typeof setTimeout>;
}

function withTimeout(signal: AbortSignal, ms: number): AbortControllerWithTimer {
  const controller = new AbortController() as AbortControllerWithTimer;
  const timer = setTimeout(() => controller.abort("timeout"), ms);
  if (signal?.aborted) controller.abort("upstream aborted");
  else signal?.addEventListener?.("abort", () => controller.abort("upstream aborted"));
  controller.__timer = timer;
  return controller;
}

let cachedDigiCdnCookie: string | null = null;

function extractDigiCdnCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/digicdn_cookie=([^;\s]+)/);
  return match?.[1] ?? null;
}

export async function fetchJson(
  url: string,
  init?: RequestInit & {
    query?: Record<string, string | number | boolean | (string | number | boolean)[] | undefined>;
  }
): Promise<unknown> {
  const u = new URL(url);
  if (init?.query) {
    const qp = init.query;
    Object.entries(qp).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((vv) => u.searchParams.append(k, String(vv)));
      } else if (v !== undefined && v !== null) {
        u.searchParams.set(k, String(v));
      }
    });
  }

  const outerSignal = init?.signal ?? new AbortController().signal;
  const controller = withTimeout(outerSignal, HTTP_TIMEOUT);

  const buildHeaders = (cookie?: string) => ({
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "X-Web-Client-Id": "web",
    "X-Web-Client": "desktop",
    "X-Web-Optimize-Response": "1",
    Referer: "https://www.digikala.com/",
    "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    ...(cookie ? { Cookie: `digicdn_cookie=${cookie};` } : {}),
    ...init?.headers,
  });

  const doFetch = async (cookie?: string) => {
    return fetch(u.toString(), {
      ...init,
      signal: controller.signal,
      redirect: "manual",
      headers: buildHeaders(cookie),
    });
  };

  const updateCookieFromResponse = (res: Response) => {
    const setCookie = res.headers.get("set-cookie");
    const newCookie = extractDigiCdnCookie(setCookie);
    if (newCookie) cachedDigiCdnCookie = newCookie;
  };

  let res = await doFetch(cachedDigiCdnCookie ?? undefined);

  if (res.status === 307) {
    updateCookieFromResponse(res);
    if (cachedDigiCdnCookie) {
      res = await doFetch(cachedDigiCdnCookie);
    }
  }

  if (res.status === 307) {
    const location = res.headers.get("location");
    clearTimeout(controller.__timer);
    throw new Error(`Redirect loop detected. Location: ${location}`);
  }

  updateCookieFromResponse(res);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    clearTimeout(controller.__timer);
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  const json = await res.json();
  clearTimeout(controller.__timer);
  return json;
}
