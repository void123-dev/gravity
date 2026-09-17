import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, optionsOk } from "@/lib/cors";

export const Route = createFileRoute("/api/venues")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async () => {
        const { loadVenueCatalog } = await import("@/lib/venues");
        const catalog = await loadVenueCatalog();
        return Response.json(
          {
            ...catalog,
            export: {
              json: "/api/gdi?format=json",
              csv: "/api/gdi?format=csv",
              schema: "/api/gdi?format=schema",
              alias: "/api/export",
              gravity: "/api/gravity",
            },
          },
          { headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }) },
        );
      },
    },
  },
});
