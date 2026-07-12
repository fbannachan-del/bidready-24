import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CHECKOUT_ACCESS_COOKIE = "br24_checkout_access";
export const CHECKOUT_ACCESS_SECONDS = 60 * 60 * 2;

function signingSecret() {
  const secret = process.env.CHECKOUT_SESSION_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Checkout access signing is not configured");
  return secret;
}

function signature(sessionId: string, nonce: string) {
  return createHmac("sha256", signingSecret()).update(`${sessionId}:${nonce}`).digest("base64url");
}

export function createCheckoutAccessToken(sessionId: string) {
  const nonce = randomBytes(24).toString("base64url");
  return `${sessionId}.${nonce}.${signature(sessionId, nonce)}`;
}

export function verifyCheckoutAccessToken(token: string | undefined, sessionId: string) {
  if (!token) return false;
  const [boundSession, nonce, suppliedSignature, ...rest] = token.split(".");
  if (rest.length || boundSession !== sessionId || !nonce || !suppliedSignature) return false;
  const expected = Buffer.from(signature(sessionId, nonce));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
