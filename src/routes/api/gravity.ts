import { createFileRoute } from "@tanstack/react-router";
import { parseGravityQuery } from "@/lib/api-query";
import { corsHeaders, optionsOk } from "@/lib/cors";

export const Route = createFileRoute("/api/gravity")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ request }) => {
        const { loadGravity } = await import("@/lib/venues");
        const data = await loadGravity(parseGravityQuery(new URL(request.url)));
        return Response.json(data, {
          headers: corsHeaders({ "Cache-Control": "public, max-age=10" }),
        });
      },
    },
  },
});
