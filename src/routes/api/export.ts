import { createFileRoute } from "@tanstack/react-router";
import { parseGravityQuery } from "@/lib/api-query";
import { corsHeaders, optionsOk } from "@/lib/cors";
import { EXPORT_SCHEMA, exportFilename, packExport, snapshotToCsv } from "@/lib/export-gdi";

function formatOf(url: URL): "json" | "csv" | "schema" {
  const raw = (url.searchParams.get("format") ?? "json").toLowerCase();
  if (raw === "csv") return "csv";
  if (raw === "schema") return "schema";
  return "json";
}

export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const format = formatOf(url);
        if (format === "schema") {
          return Response.json(EXPORT_SCHEMA, { headers: corsHeaders() });
        }
        const { loadGravity } = await import("@/lib/venues");
        const data = await loadGravity(parseGravityQuery(url));
        if (format === "csv") {
          const body = snapshotToCsv(data);
          const headers = corsHeaders({
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${exportFilename(data, "csv")}"`,
            "Cache-Control": "public, max-age=10",
          });
          return new Response(body, { headers });
        }
        const download = url.searchParams.get("download") === "1";
        const headers = corsHeaders({
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=10",
        });
        if (download) {
          headers.set("Content-Disposition", `attachment; filename="${exportFilename(data, "json")}"`);
        }
        return Response.json(packExport(data), { headers });
      },
    },
  },
});
