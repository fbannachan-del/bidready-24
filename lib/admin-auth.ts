import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "br24_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

function sessionSigningKey(password: string, sessionSecret?: string): Buffer {
  return createHash("sha256")
    .update("bidready24:admin-session:v2\0")
    .update(password)
    .update("\0")
    .update(sessionSecret ?? "")
    .digest();
}

/** Compares equal-length digests so the password comparison itself is constant-time. */
export function constantTimeSecretEqual(supplied: string, expected: string): boolean {
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

function signature(payload: string, password: string, sessionSecret?: string): string {
  return createHmac("sha256", sessionSigningKey(password, sessionSecret)).update(payload).digest("base64url");
}

export function createAdminSessionToken(params: {
  password: string;
  sessionSecret?: string;
  now?: number;
  nonce?: string;
}): string {
  const expiresAt = Math.floor((params.now ?? Date.now()) / 1_000) + ADMIN_SESSION_SECONDS;
  const payload = `v2.${expiresAt}.${params.nonce ?? randomBytes(18).toString("base64url")}`;
  return `${payload}.${signature(payload, params.password, params.sessionSecret)}`;
}

export function verifyAdminSessionToken(params: {
  token?: string | null;
  password: string;
  sessionSecret?: string;
  now?: number;
}): boolean {
  if (!params.token || params.token.length > 512) return false;
  const parts = params.token.split(".");
  if (parts.length !== 4 || parts[0] !== "v2" || !/^\d{10}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{16,128}$/.test(parts[2])) return false;
  const expiresAt = Number(parts[1]);
  const now = Math.floor((params.now ?? Date.now()) / 1_000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_SECONDS + 60) return false;
  const payload = parts.slice(0, 3).join(".");
  const expected = signature(payload, params.password, params.sessionSecret);
  return constantTimeSecretEqual(parts[3], expected);
}

/** Only permits local admin pages, preventing an open redirect after sign-in. */
export function sanitizeAdminRedirect(value?: string | null): string {
  if (!value || value.length > 500) return "/admin";
  if (value.startsWith("//") || value.includes("\\")) return "/admin";
  try {
    const parsed = new URL(value, "https://bidready24.invalid");
    const isAdminPage = parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/");
    if (parsed.origin !== "https://bidready24.invalid" || !isAdminPage || parsed.pathname.startsWith("/admin/locked")) return "/admin";
    // Query strings are deliberately dropped so credentials can never be
    // reflected into a post-authentication URL or an access log.
    return parsed.pathname;
  } catch {
    return "/admin";
  }
}

export function isSameOriginRequest(
  requestUrl: string,
  origin: string | null,
  configuredAppUrl?: string,
): boolean {
  if (!origin) return false;
  try {
    const requestOrigin = new URL(requestUrl).origin;
    const allowedOrigins = new Set([requestOrigin]);
    if (configuredAppUrl) {
      const configured = new URL(configuredAppUrl);
      allowedOrigins.add(configured.origin);
      const companion = new URL(configured.origin);
      companion.hostname = configured.hostname.startsWith("www.") ? configured.hostname.slice(4) : `www.${configured.hostname}`;
      allowedOrigins.add(companion.origin);
    }
    return allowedOrigins.has(origin);
  } catch {
    return false;
  }
}

/**
 * Validates a browser form POST without relying solely on Origin. Chromium can
 * send `Origin: null` after a same-site 307/308 domain canonicalisation, so a
 * trusted Referer or Fetch Metadata navigation is accepted as a fallback.
 */
export function isTrustedBrowserPost(
  requestUrl: string,
  headers: Pick<Headers, "get">,
  configuredAppUrl?: string,
): boolean {
  const origin = headers.get("origin");
  if (origin && origin !== "null") return isSameOriginRequest(requestUrl, origin, configuredAppUrl);

  const referer = headers.get("referer");
  if (referer) {
    try {
      if (isSameOriginRequest(requestUrl, new URL(referer).origin, configuredAppUrl)) return true;
    } catch {
      return false;
    }
  }

  const fetchSite = headers.get("sec-fetch-site");
  const fetchMode = headers.get("sec-fetch-mode");
  const fetchDest = headers.get("sec-fetch-dest");
  return (fetchSite === "same-origin" || fetchSite === "same-site")
    && fetchMode === "navigate"
    && fetchDest === "document";
}

function isLoopbackOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local")) return true;
  if (host === "::1" || host === "https://example.net/id/garnet") return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  return false;
}

/**
 * Builds an absolute public URL for browser redirects.
 * Never emits Render/internal loopback hosts (e.g. http://localhost:10000)
 * when APP_URL or a public request host is available.
 */
export function publicAppUrl(
  path: string,
  requestUrl: string,
  configuredAppUrl?: string,
) {
  const candidates = [configuredAppUrl, requestUrl, "https://www.bidready24.com"].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    try {
      const base = new URL(candidate);
      // Prefer configured public host; skip private/loopback unless that is the only option (local dev).
      if (isLoopbackOrPrivateHost(base.hostname) && candidate !== candidates[candidates.length - 1]) {
        const hasPublicAlternative = candidates.some((item) => {
          try {
            return !isLoopbackOrPrivateHost(new URL(item).hostname);
          } catch {
            return false;
          }
        });
        if (hasPublicAlternative) continue;
      }
      if (base.hostname === "bidready24.com") base.hostname = "www.bidready24.com";
      return new URL(path, base);
    } catch {
      // try next candidate
    }
  }

  return new URL(path, "https://www.bidready24.com");
}
