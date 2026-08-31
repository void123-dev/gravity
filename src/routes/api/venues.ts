import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/venues")({
  server: {
    handlers: {
      GET: async () => {
        const { listVenuePlugins } = await import("@/lib/venues");
        return Response.json({
          pits: listVenuePlugins(),
          consensus: "all",
          note: "Add a pit with registerVenue({ id, fetch }) then GET /api/gravity?venue=<id>. venue=all is median G of listed pits, not blended candles.",
        });
      },
    },
  },
});
