/**
 * Shared helpers for BidReady24 20-agent suite.
 * HTTP tests expect BASE_URL (default http://127.0.0.1:3010).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const BASE_URL = (process.env.AGENT_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "");
export const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

export async function get(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: { accept: "text/html,application/json,*/*", ...(init?.headers || {}) },
  });
  const text = await res.text();
  return { res, text, status: res.status, headers: res.headers };
}

export async function getOk(path: string) {
  const result = await get(path);
  assert.ok(result.status >= 200 && result.status < 400, `${path} expected 2xx/3xx, got ${result.status}`);
  return result;
}

export function assertContains(haystack: string, needles: string[], label: string) {
  for (const needle of needles) {
    assert.ok(haystack.includes(needle), `${label}: missing expected text ${JSON.stringify(needle)}`);
  }
}

export function assertNotContains(haystack: string, needles: string[], label: string) {
  for (const needle of needles) {
    assert.ok(!haystack.includes(needle), `${label}: unexpected text ${JSON.stringify(needle)}`);
  }
}

/** Extract href="/..." and href='/...' from HTML (internal paths only). */
export function extractInternalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  const re = /href=["'](\/[^"'#?]*(?:\?[^"']*)?(?:#[^"']*)?)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].split("#")[0] || m[1];
    if (href.startsWith("/") && !href.startsWith("//")) hrefs.add(href);
  }
  return [...hrefs];
}

export function extractExternalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  const re = /href=["'](https?:\/\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) hrefs.add(m[1]);
  return [...hrefs];
}

export function extractButtons(html: string): string[] {
  const labels: string[] = [];
  const re = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    labels.push(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }
  return labels;
}

export function walkSourceFiles(dir: string, exts = [".tsx", ".ts"]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "data" || name === "test") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkSourceFiles(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

export function readSource(relPath: string) {
  return readFileSync(join(ROOT, relPath), "utf8");
}

export function sourceHrefInventory(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const files = [
    ...walkSourceFiles(join(ROOT, "app")),
    ...walkSourceFiles(join(ROOT, "components")),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const hrefs: string[] = [];
    const patterns = [
      new RegExp(String.raw`href=\{?["'\x60](\/[^"'\x60}]*)["'\x60]?`, "g"),
      new RegExp(String.raw`href:\s*["'\x60](\/[^"'\x60]*)["'\x60]`, "g"),
      new RegExp(String.raw`action=["'\x60](\/[^"'\x60]*)["'\x60]`, "g"),
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) hrefs.push(m[1].split("${")[0]);
    }
    if (hrefs.length) map.set(relative(ROOT, file), hrefs);
  }
  return map;
}

export function serverAvailable(): Promise<boolean> {
  return fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok || r.status === 503)
    .catch(() => false);
}

export function skipIfNoServer(t: { skip: (msg?: string) => void }) {
  return serverAvailable().then((ok) => {
    if (!ok) t.skip(`Server not reachable at ${BASE_URL}`);
  });
}

export const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/checkout",
  "/checkout?type=preflight",
  "/checkout?type=complete",
  "/checkout/success",
  "/contact",
  "/login",
  "/alerts",
  "/security",
  "/sample-report",
  "/cleaning-tenders",
  "/cleaning-tenders/jobs",
  "/legal",
  "/legal/privacy",
  "/legal/data",
  "/legal/terms",
  "/legal/refund",
  "/legal/acceptable-use",
  "/admin/locked",
] as const;

export const HEADER_NAV = [
  ["How it works", "/#how-it-works"],
  ["What you get", "/#deliverables"],
  ["For cleaning", "/cleaning-tenders"],
  ["Live tenders", "/cleaning-tenders/jobs"],
  ["Security", "/security"],
  ["Pricing", "/pricing"],
] as const;
