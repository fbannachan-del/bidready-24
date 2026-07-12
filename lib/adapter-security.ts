export async function postToConfiguredAdapter(params: {
  endpoint: string;
  secret?: string;
  body: unknown;
}) {
  let url: URL;
  try { url = new URL(params.endpoint); } catch { throw new Error("adapter_configuration_invalid"); }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("adapter_https_required");
  if (process.env.NODE_ENV === "production" && !params.secret) throw new Error("adapter_auth_required");

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(params.secret ? { authorization: `Bearer ${params.secret}` } : {}) },
    body: JSON.stringify(params.body),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`adapter_http_${response.status}`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 64_000) throw new Error("adapter_response_too_large");
  const raw = await response.text();
  if (raw.length > 64_000) throw new Error("adapter_response_too_large");
  try { return JSON.parse(raw) as unknown; } catch { throw new Error("adapter_response_invalid"); }
}
