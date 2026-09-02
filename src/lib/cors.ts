/** Public GDI read API. No keys, no cookies. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  for (const [k, v] of Object.entries(CORS_HEADERS)) h.set(k, v);
  return h;
}

export function optionsOk(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
