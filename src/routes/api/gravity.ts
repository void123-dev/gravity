import { createFileRoute } from "@tanstack/react-router";
import { handleGdiRead } from "@/lib/export-http";
import { optionsOk } from "@/lib/cors";

export const Route = createFileRoute("/api/gravity")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ request }) => handleGdiRead(request, "raw"),
    },
  },
});
