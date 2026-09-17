import { createFileRoute } from "@tanstack/react-router";
import { handleGdiRead } from "@/lib/export-http";
import { optionsOk } from "@/lib/cors";

/** Alias for /api/export — grok.me may intercept the word "export". */
export const Route = createFileRoute("/api/gdi")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ request }) => handleGdiRead(request, "json"),
    },
  },
});
