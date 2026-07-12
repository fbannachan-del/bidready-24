import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  constantTimeSecretEqual,
  createAdminSessionToken,
  isSameOriginRequest,
  isTrustedBrowserPost,
  publicAppUrl,
  sanitizeAdminRedirect,
  verifyAdminSessionToken,
} from "../lib/admin-auth";
import { POST } from "../app/api/admin/session/route";
import { proxy } from "../proxy";

describe("admin session cryptography", () => {
  it("compares the configured password without an early length branch", () => {
    assert.equal(constantTimeSecretEqual("correct horse", "correct horse"), true);
    assert.equal(constantTimeSecretEqual("correct horse", "correct Horse"), false);
    assert.equal(constantTimeSecretEqual("x", "a much longer secret"), false);
  });

  it("issues a bounded signed session and accepts it before expiry", () => {
    const now = Date.UTC(2026, 6, 12, 12);
    const token = createAdminSessionToken({ password: "a strong password", sessionSecret: "signing-secret", now, nonce: "abcdefghijklmnop" });
    assert.equal(verifyAdminSessionToken({ token, password: "a strong password", sessionSecret: "signing-secret", now: now + 1_000 }), true);
    assert.equal(verifyAdminSessionToken({ token, password: "a strong password", sessionSecret: "signing-secret", now: now + ADMIN_SESSION_SECONDS * 1_000 }), false);
  });

  it("rejects token tampering and secret rotation", () => {
    const now = Date.UTC(2026, 6, 12, 12);
    const token = createAdminSessionToken({ password: "original", now, nonce: "abcdefghijklmnop" });
    const tampered = token.replace("abcdefghijklmnop", "abcdefghijklmnox");
    assert.equal(verifyAdminSessionToken({ token: tampered, password: "original", now }), false);
    assert.equal(verifyAdminSessionToken({ token, password: "rotated", now }), false);
    assert.equal(verifyAdminSessionToken({ token: "malformed", password: "original", now }), false);
  });
});

describe("admin redirect and origin validation", () => {
  it("only permits local admin page paths and strips all query strings", () => {
    assert.equal(sanitizeAdminRedirect("/admin/projects/proj_1?key=secret#x"), "/admin/projects/proj_1");
    for (const unsafe of ["https://evil.example/admin", "//evil.example/admin", "/administrator", "/admin/locked", "/public", "/admin\\evil"]) {
      assert.equal(sanitizeAdminRedirect(unsafe), "/admin", unsafe);
    }
  });

  it("requires an explicit same-origin request", () => {
    assert.equal(isSameOriginRequest("https://bidready24.com/api/admin/session", "https://bidready24.com"), true);
    assert.equal(isSameOriginRequest("https://internal.example/api/admin/session", "https://bidready24.com", "https://bidready24.com"), true);
    assert.equal(isSameOriginRequest("https://bidready24.com/api/admin/session", "https://evil.example"), false);
    assert.equal(isSameOriginRequest("https://bidready24.com/api/admin/session", null), false);
  });

  it("accepts the public origin when Render forwards from its internal service host", () => {
    assert.equal(isSameOriginRequest(
      "https://bidready-24.onrender.com/api/admin/session",
      "https://www.bidready24.com",
      "https://bidready24.com",
    ), true);
    assert.equal(isSameOriginRequest(
      "https://bidready-24.onrender.com/api/admin/session",
      "https://evil.example",
      "https://bidready24.com",
    ), false);
    assert.equal(isSameOriginRequest(
      "https://bidready-24.onrender.com/api/admin/session",
      "https://bidready24.com",
      "https://www.bidready24.com",
    ), true);
    assert.equal(isSameOriginRequest(
      "https://bidready-24.onrender.com/api/admin/session",
      "https://evil.example",
      "https://www.bidready24.com",
    ), false);
  });

  it("uses the configured canonical public host for redirects", () => {
    assert.equal(
      publicAppUrl("/admin", "https://bidready-24.onrender.com/api/admin/session", "https://bidready24.com").href,
      "https://www.bidready24.com/admin",
    );
  });

  it("never redirects browsers to Render loopback hosts when APP_URL is set", () => {
    assert.equal(
      publicAppUrl("/admin/projects/proj_1", "http://localhost:10000/admin/projects/proj_1/actions", "https://www.bidready24.com").href,
      "https://www.bidready24.com/admin/projects/proj_1",
    );
    assert.equal(
      publicAppUrl("/checkout/success", "http://127.0.0.1:10000/api/checkout", "https://www.bidready24.com").href,
      "https://www.bidready24.com/checkout/success",
    );
  });

  it("accepts legitimate redirected browser posts without weakening cross-origin checks", () => {
    const configured = "https://www.bidready24.com";
    assert.equal(isTrustedBrowserPost("https://internal.example/api/admin/session", new Headers({
      origin: "null",
      referer: "https://bidready24.com/admin/locked",
    }), configured), true);
    assert.equal(isTrustedBrowserPost("https://internal.example/api/admin/session", new Headers({
      origin: "null",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    }), configured), true);
    assert.equal(isTrustedBrowserPost("https://internal.example/api/admin/session", new Headers({
      origin: "https://evil.example",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    }), configured), false);
  });
});

describe("POST /api/admin/session", () => {
  const previous = {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  before(() => {
    process.env.ADMIN_PASSWORD = "test admin password";
    process.env.ADMIN_SESSION_SECRET = "test session secret";
    process.env.APP_URL = "https://bidready24.com";
    Reflect.set(process.env, "NODE_ENV", "production");
  });

  after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv];
      else process.env[key as keyof NodeJS.ProcessEnv] = value;
    }
  });

  function loginRequest(password: string, options: { origin?: string; next?: string; contentType?: string } = {}) {
    const body = new URLSearchParams({ password, next: options.next ?? "/admin/projects/proj_1" });
    return new NextRequest("https://bidready24.com/api/admin/session", {
      method: "POST",
      headers: {
        origin: options.origin ?? "https://bidready24.com",
        "content-type": options.contentType ?? "application/x-www-form-urlencoded",
      },
      body,
    });
  }

  it("sets a secure HTTP-only cookie and redirects without exposing the password", async () => {
    const response = await POST(loginRequest("test admin password"));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://www.bidready24.com/admin/projects/proj_1");
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\/admin/i);
    assert.doesNotMatch(`${response.headers.get("location")} ${cookie}`, /test admin password/);
  });

  it("rejects bad credentials without reflecting them", async () => {
    const response = await POST(loginRequest("wrong password"));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.match(response.headers.get("location") ?? "", /error=invalid/);
    assert.doesNotMatch(response.headers.get("location") ?? "", /wrong/);
  });

  it("rejects cross-origin and non-form requests", async () => {
    const crossOrigin = await POST(loginRequest("test admin password", { origin: "https://evil.example" }));
    assert.equal(crossOrigin.status, 303);
    assert.match(crossOrigin.headers.get("location") ?? "", /error=origin/);
    assert.equal(crossOrigin.headers.get("set-cookie"), null);
    assert.equal((await POST(loginRequest("test admin password", { contentType: "application/json" }))).status, 400);
  });

  it("accepts the apex form origin behind Render but ignores spoofed forwarding headers", async () => {
    process.env.APP_URL = "https://www.bidready24.com";
    try {
      const body = new URLSearchParams({ password: "wrong password", next: "/admin" });
      const accepted = await POST(new NextRequest("https://bidready-24.onrender.com/api/admin/session", {
        method: "POST",
        headers: {
          origin: "https://bidready24.com",
          "content-type": "application/x-www-form-urlencoded",
          "x-forwarded-host": "bidready24.com",
          "x-forwarded-proto": "https",
        },
        body,
      }));
      assert.equal(accepted.status, 303);
      assert.match(accepted.headers.get("location") ?? "", /^https:\/\/www\.bidready24\.com\/admin\/locked/);

      const rejected = await POST(new NextRequest("https://bidready-24.onrender.com/api/admin/session", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/x-www-form-urlencoded",
          "x-forwarded-host": "evil.example",
        },
        body: new URLSearchParams({ password: "wrong password" }),
      }));
      assert.equal(rejected.status, 303);
      assert.match(rejected.headers.get("location") ?? "", /error=origin/);
    } finally {
      process.env.APP_URL = "https://bidready24.com";
    }
  });

  it("fails closed when ADMIN_PASSWORD is not configured", async () => {
    const configured = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      const response = await POST(loginRequest("anything"));
      assert.equal(response.status, 303);
      assert.match(response.headers.get("location") ?? "", /error=configuration/);
      assert.equal(response.headers.get("set-cookie"), null);
    } finally {
      process.env.ADMIN_PASSWORD = configured;
    }
  });
});

describe("admin proxy", () => {
  const password = "proxy password";
  const previous = {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    APP_URL: process.env.APP_URL,
  };

  before(() => {
    process.env.ADMIN_PASSWORD = password;
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.APP_URL;
  });

  after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv];
      else process.env[key as keyof NodeJS.ProcessEnv] = value;
    }
  });

  it("redirects an unauthenticated request and never accepts a query password", () => {
    const response = proxy(new NextRequest(`https://www.bidready24.com/admin?key=${encodeURIComponent(password)}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://www.bidready24.com/admin/locked");
    assert.doesNotMatch(response.headers.get("location") ?? "", /key|proxy%20password/);
  });

  it("canonicalises the apex domain and removes a legacy key query", () => {
    const response = proxy(new NextRequest(`https://bidready24.com/admin?key=${encodeURIComponent(password)}`, {
      headers: { host: "bidready24.com" },
    }));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), "https://www.bidready24.com/admin");
  });

  it("does not redirect apex webhooks", () => {
    const response = proxy(new NextRequest("https://bidready24.com/api/webhooks/stripe", {
      method: "POST",
      headers: { host: "bidready24.com" },
    }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
  });

  it("uses the configured public host rather than a forwarded host for login", () => {
    process.env.APP_URL = "https://www.bidready24.com";
    try {
      const response = proxy(new NextRequest("https://bidready-24.onrender.com/admin/projects/proj_1", {
        headers: { "x-forwarded-host": "evil.example" },
      }));
      assert.equal(response.headers.get("location"), "https://www.bidready24.com/admin/locked?next=%2Fadmin%2Fprojects%2Fproj_1");
    } finally {
      delete process.env.APP_URL;
    }
  });

  it("permits a correctly signed unexpired cookie", () => {
    const token = createAdminSessionToken({ password });
    const response = proxy(new NextRequest("https://bidready24.com/admin/projects/proj_1", {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
  });

  it("rejects a tampered cookie", () => {
    const token = createAdminSessionToken({ password });
    const response = proxy(new NextRequest("https://bidready24.com/admin/projects/proj_1", {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token.slice(0, -1)}x` },
    }));
    assert.equal(response.status, 307);
    assert.match(response.headers.get("location") ?? "", /\/admin\/locked\?next=%2Fadmin%2Fprojects%2Fproj_1$/);
  });

  it("does not use ambient APP_URL from other test processes when unset", () => {
    assert.equal(process.env.APP_URL, undefined);
    const response = proxy(new NextRequest("https://www.bidready24.com/admin"));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://www.bidready24.com/admin/locked");
  });
});
