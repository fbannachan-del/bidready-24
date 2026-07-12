import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  constantTimeSecretEqual,
  createAdminSessionToken,
  isSameOriginRequest,
  publicRequestUrl,
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
      "www.bidready24.com",
      "https",
    ), true);
    assert.equal(isSameOriginRequest(
      "https://bidready-24.onrender.com/api/admin/session",
      "https://evil.example",
      "https://bidready24.com",
      "www.bidready24.com",
      "https",
    ), false);
  });

  it("keeps post-authentication redirects on the public forwarded host", () => {
    assert.equal(
      publicRequestUrl("/admin", "https://bidready-24.onrender.com/api/admin/session", "www.bidready24.com", "https").href,
      "https://www.bidready24.com/admin",
    );
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
    assert.equal(response.headers.get("location"), "https://bidready24.com/admin/projects/proj_1");
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
    assert.equal((await POST(loginRequest("test admin password", { origin: "https://evil.example" }))).status, 403);
    assert.equal((await POST(loginRequest("test admin password", { contentType: "application/json" }))).status, 400);
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
  const previousPassword = process.env.ADMIN_PASSWORD;
  before(() => { process.env.ADMIN_PASSWORD = password; });
  after(() => {
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });

  it("redirects an unauthenticated request and never accepts a query password", () => {
    const response = proxy(new NextRequest(`https://bidready24.com/admin?key=${encodeURIComponent(password)}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://bidready24.com/admin/locked");
    assert.doesNotMatch(response.headers.get("location") ?? "", /key|proxy%20password/);
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
});
