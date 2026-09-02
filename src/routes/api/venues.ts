import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, optionsOk } from "@/lib/cors";

export const Route = createFileRoute("/api/venues")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async () => {
        const { listVenuePlugins } = await import("@/lib/venues");
        return Response.json(
          {
            pits: listVenuePlugins(),
            consensus: "all",
            note: "Add a pit with registerVenue({ id, fetch }) then GET /api/gravity?venue=<id>. venue=all is median G of listed pits, not blended candles.",
            export: {
              json: "/api/export?format=json",
              csv: "/api/export?format=csv",
              schema: "/api/export?format=schema",
            },
          },
          { headers: corsHeaders() },
        );
      },
    },
  },
});
